// Step 2/3 — 채용공고 입력 페이지 (URL·이미지·검색 탭, cheerio+Claude 파싱)
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import StepIndicator from "@/components/StepIndicator";
import LottieAnimation from "@/components/LottieAnimation";
import BottomSheet from "@/components/BottomSheet";
import Toast from "@/components/Toast";
import { useInterview, type JobPostingStructured } from "@/contexts/InterviewContext";
import { usePostHog } from "posthog-js/react";
import { useUser } from "@clerk/nextjs";

const TABS = [
  { key: "url" as const, label: "URL 입력" },
  { key: "image" as const, label: "이미지" },
  { key: "search" as const, label: "채용공고 검색" },
];

const LOADING_TEXTS = [
  "회사 정보를 가져오는 중...",
  "공고 내용 분석 중...",
  "핵심 직무 역량 추출 중...",
  "예상 면접 질문 생성 중...",
];

type Status = "idle" | "loading" | "success" | "fallback" | "error";

interface ParseResponse {
  success: boolean;
  data?: JobPostingStructured;
  raw?: string;
  fallbackRequired?: boolean;
  error?: string;
}

export default function JobPostingPage() {
  const router = useRouter();
  const { resume, setJobPosting, jobPosting } = useInterview();

  // Warm next-route chunk while user pastes URL / waits for parse.
  useEffect(() => {
    router.prefetch("/interview-prep");
  }, [router]);

  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [parsed, setParsed] = useState<JobPostingStructured | null>(jobPosting);
  const [fallbackText, setFallbackText] = useState("");
  const [showDirectInput, setShowDirectInput] = useState(false);
  const [loadingTextIndex, setLoadingTextIndex] = useState(0);
  const ph = usePostHog();
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState<"url" | "image" | "search">("url");
  const [notifyRequested, setNotifyRequested] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    setNotifyRequested(!!localStorage.getItem(`job_search_notify_${user.id}`));
  }, [user?.id]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (status !== "loading") return;
    const interval = setInterval(() => {
      setLoadingTextIndex((i) => (i + 1) % LOADING_TEXTS.length);
    }, 800);
    return () => clearInterval(interval);
  }, [status]);

  // Context hydrates from localStorage asynchronously (after mount), so
  // `useState(jobPosting)` initializes to null on a refresh. Pick up the
  // restored value once it arrives so the success block renders.
  useEffect(() => {
    if (jobPosting && !parsed) {
      setParsed(jobPosting);
      setStatus("success");
    }
  }, [jobPosting, parsed]);

  const hasInput =
    (status === "success" && parsed !== null) ||
    (showDirectInput && fallbackText.trim().length > 0) ||
    (status === "fallback" && fallbackText.trim().length > 0);

  const handleAnalyze = async () => {
    if (!url.trim()) return;
    setStatus("loading");
    setErrorMsg(null);
    setLoadingTextIndex(0);

    try {
      const res = await fetch("/api/parse-job-posting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data: ParseResponse = await res.json();

      if (data.success && data.data) {
        setParsed(data.data);
        setJobPosting(data.data, data.raw ?? "");
        setStatus("success");
        return;
      }

      // fallback path
      setStatus("fallback");
      setErrorMsg(data.error ?? "공고 분석에 실패했어요. 본문을 직접 입력해 주세요.");
      setShowDirectInput(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "네트워크 오류";
      setStatus("error");
      setErrorMsg(`${msg}. 본문을 직접 입력해 주세요.`);
      setShowDirectInput(true);
    }
  };

  const acceptFallbackText = () => {
    const trimmed = fallbackText.trim();
    if (!trimmed) return;
    const stub: JobPostingStructured = {
      company: "직접 입력 공고",
      position: "직접 입력 포지션",
      requirements: trimmed.slice(0, 800),
      preferredQualifications: "",
      description: trimmed.slice(0, 400),
    };
    setParsed(stub);
    setJobPosting(stub, trimmed);
    setShowDirectInput(false);
    setStatus("success");
  };

  const handleNotifyRequest = () => {
    if (!user?.id) {
      router.push("/sign-in");
      return;
    }
    if (notifyRequested) return;
    localStorage.setItem(`job_search_notify_${user.id}`, "1");
    setNotifyRequested(true);
    ph?.capture("job_search_notify_requested", { userId: user.id });
  };

  const handleTabChange = (tab: "url" | "image" | "search") => {
    setActiveTab(tab);
    if (tab === "search") ph?.capture("job_search_interest_clicked");
    if (status !== "success") {
      setStatus("idle");
      setErrorMsg(null);
    }
  };

  const handleImageAnalyze = async () => {
    if (!imageFile) return;
    setStatus("loading");
    setErrorMsg(null);
    setLoadingTextIndex(0);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(imageFile);
      });
      const res = await fetch("/api/parse-job-posting-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: dataUrl.split(",")[1], mimeType: imageFile.type }),
      });
      const data: ParseResponse = await res.json();
      if (data.success && data.data) {
        setParsed(data.data);
        setJobPosting(data.data, data.raw ?? "");
        setStatus("success");
        return;
      }
      setStatus("error");
      setErrorMsg(data.error ?? "이미지 분석에 실패했어요.");
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "네트워크 오류");
    }
  };

  const handleNext = () => {
    if (!resume.trim()) {
      setErrorMsg("자기소개서가 없어요. 이전 단계에서 작성해 주세요.");
      return;
    }
    if (!parsed) {
      setErrorMsg("채용공고 정보가 없어요.");
      return;
    }
    router.push("/interview-prep");
  };

  return (
    <motion.div
      className="flex min-h-dvh flex-col bg-white"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Top */}
      <div className="bg-white">
        <StepIndicator currentStep={2} totalSteps={3} />
        <div className="flex items-center px-5 pt-3 pb-1">
          <button onClick={() => router.back()} className="mr-3 p-1">
            <svg className="h-5 w-5 text-[var(--gray-900)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </div>
        <div className="px-5 pt-2 pb-6">
          <h1 className="text-[22px] font-bold text-[var(--gray-900)] leading-tight">
            채용공고를 알려 주세요
          </h1>
          <p className="mt-1.5 text-[14px] text-[var(--gray-500)]">
            맞춤형 면접 질문을 만들어 드려요
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-5 pt-5 pb-28 space-y-4">
        {/* Tabs */}
        <div className="flex rounded-xl bg-[var(--gray-100)] p-1 gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              disabled={status === "loading"}
              className={`flex-1 rounded-lg py-2 text-[12px] font-semibold transition-all ${
                activeTab === tab.key
                  ? "bg-white text-[var(--blue-primary)] shadow-sm"
                  : "text-[var(--gray-500)]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* URL Tab */}
        {activeTab === "url" && (
          <div className="rounded-2xl border border-[var(--gray-200)] shadow-sm bg-white p-5">
            <label className="text-[13px] font-semibold text-[var(--gray-700)] mb-2 block">
              채용공고 URL
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="wanted.co.kr/wd/..."
              className="w-full rounded-xl bg-[var(--gray-100)] px-4 py-3 text-[14px] text-[var(--gray-900)] placeholder:text-[var(--gray-400)] focus:outline-none focus:ring-2 focus:ring-[var(--blue-primary)]/20 transition-all"
              disabled={status === "loading"}
            />
            <button
              onClick={handleAnalyze}
              disabled={!url.trim() || status === "loading"}
              className={`mt-3 w-full rounded-xl py-3 text-[14px] font-semibold transition-all ${
                url.trim() && status !== "loading"
                  ? "bg-[var(--blue-primary)] text-white active:scale-[0.98]"
                  : "bg-[var(--gray-200)] text-[var(--gray-400)] cursor-not-allowed"
              }`}
            >
              {status === "loading" ? "분석 중..." : "분석하기"}
            </button>
          </div>
        )}

        {/* Image Tab */}
        {activeTab === "image" && (
          <div className="rounded-2xl border border-[var(--gray-200)] shadow-sm bg-white p-5">
            <label className="text-[13px] font-semibold text-[var(--gray-700)] mb-2 block">
              채용공고 이미지
            </label>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setImageFile(file);
                const reader = new FileReader();
                reader.onload = (ev) => setImagePreview(ev.target?.result as string);
                reader.readAsDataURL(file);
              }}
            />
            {imagePreview ? (
              <div className="relative mb-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imagePreview} alt="미리보기" className="w-full rounded-xl object-contain max-h-48" />
                <button
                  onClick={() => { setImageFile(null); setImagePreview(null); }}
                  className="absolute top-2 right-2 bg-black/50 text-white rounded-full w-6 h-6 text-[11px] flex items-center justify-center"
                >
                  ✕
                </button>
              </div>
            ) : (
              <button
                onClick={() => imageInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files?.[0];
                  if (!file || !file.type.startsWith("image/")) return;
                  setImageFile(file);
                  const reader = new FileReader();
                  reader.onload = (ev) => setImagePreview(ev.target?.result as string);
                  reader.readAsDataURL(file);
                }}
                className="w-full rounded-xl border-2 border-dashed border-[var(--gray-200)] pt-0 pb-3 flex flex-col items-center gap-1 hover:border-[var(--blue-primary)]/40 transition-colors"
              >
                <LottieAnimation src="/lottie/Search a file.json" className="w-44 h-44 -my-6" />
                <span className="text-[13px] text-[var(--gray-700)]">이미지를 끌어다 놓거나 클릭해서 업로드</span>
                <span className="text-[11px] text-[var(--gray-500)]">PNG · JPG · WEBP · 최대 5MB</span>
              </button>
            )}
            <button
              onClick={handleImageAnalyze}
              disabled={!imageFile || status === "loading"}
              className={`mt-3 w-full rounded-xl py-3 text-[14px] font-semibold transition-all ${
                imageFile && status !== "loading"
                  ? "bg-[var(--blue-primary)] text-white active:scale-[0.98]"
                  : "bg-[var(--gray-200)] text-[var(--gray-400)] cursor-not-allowed"
              }`}
            >
              {status === "loading" ? "분석 중..." : "분석하기"}
            </button>
          </div>
        )}

        {/* Search Tab (fake door) */}
        {activeTab === "search" && (
          <div className="rounded-2xl border border-[var(--gray-200)] shadow-sm bg-white p-5 flex flex-col items-center gap-3 py-10">
            <LottieAnimation src="/lottie/Loading 51 _ Monoplane.json" className="w-16 h-16" />
            <p className="text-[15px] font-bold text-[var(--gray-900)]">채용공고 검색</p>
            <p className="text-[13px] text-[var(--gray-500)] text-center leading-[20px]">
              곧 출시 예정이에요.<br />알림 신청하시면 오픈 후 이메일 알림을 드릴게요.
            </p>
            <button
              onClick={handleNotifyRequest}
              disabled={notifyRequested}
              className={`mt-1 px-5 py-2.5 rounded-xl text-[13px] font-semibold transition-all ${
                notifyRequested
                  ? "bg-[var(--gray-100)] text-[var(--gray-400)] cursor-default"
                  : "bg-[var(--blue-primary)] text-white active:scale-[0.98]"
              }`}
            >
              {notifyRequested ? "알림 신청 완료 ✓" : "오픈 알림받기"}
            </button>
          </div>
        )}

        {/* Direct input link — URL tab only */}
        {activeTab === "url" && !showDirectInput && status !== "success" && status !== "loading" && (
          <button
            onClick={() => setShowDirectInput(true)}
            className="w-full text-center text-[13px] text-[var(--gray-500)]"
          >
            URL 없이 <span className="text-[var(--blue-primary)] font-medium underline underline-offset-2">직접 입력</span>하기
          </button>
        )}

        <AnimatePresence mode="wait">
          {status === "loading" && (
            <motion.div
              key="loading"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="flex flex-col items-center gap-2 py-4"
            >
              <LottieAnimation
                src={loadingTextIndex === LOADING_TEXTS.length - 1 ? "/lottie/Sparkles Loop Loader ai.json" : "/lottie/Document OCR Scan.json"}
                className={loadingTextIndex === LOADING_TEXTS.length - 1 ? "w-16 h-16 mb-2" : "w-24 h-24 mb-2"}
              />
              <motion.p
                key={loadingTextIndex}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="text-[13px] font-medium text-[var(--blue-primary)]"
              >
                {LOADING_TEXTS[loadingTextIndex]}
              </motion.p>
            </motion.div>
          )}

          {status === "success" && parsed && (
            <motion.div
              key="success"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-[var(--gray-200)] shadow-sm bg-white p-5"
            >
              <div className="flex items-center gap-2 mb-4">
                <LottieAnimation
                  src="/lottie/login success.json"
                  className="w-8 h-8"
                  loop={false}
                />
                <span className="text-[13px] font-semibold text-[#00875A]">분석 완료</span>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-[12px] text-[var(--gray-400)] mb-0.5">회사</p>
                  <p className="text-[15px] font-bold text-[var(--gray-900)]">{parsed.company}</p>
                </div>
                <div>
                  <p className="text-[12px] text-[var(--gray-400)] mb-0.5">포지션</p>
                  <p className="text-[15px] font-bold text-[var(--gray-900)]">{parsed.position}</p>
                </div>
                {parsed.requirements && (
                  <div>
                    <p className="text-[12px] text-[var(--gray-400)] mb-0.5">자격 요건</p>
                    <p className="text-[13px] leading-[20px] text-[var(--gray-700)] whitespace-pre-line">
                      {parsed.requirements}
                    </p>
                  </div>
                )}
                {parsed.preferredQualifications && (
                  <div>
                    <p className="text-[12px] text-[var(--gray-400)] mb-0.5">우대사항</p>
                    <p className="text-[13px] leading-[20px] text-[var(--gray-700)] whitespace-pre-line">
                      {parsed.preferredQualifications}
                    </p>
                  </div>
                )}
                {parsed.description && (
                  <div>
                    <p className="text-[12px] text-[var(--gray-400)] mb-0.5">직무 설명</p>
                    <p className="text-[13px] leading-[20px] text-[var(--gray-700)] whitespace-pre-line">
                      {parsed.description}
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      <BottomSheet
        isOpen={showDirectInput}
        onClose={() => setShowDirectInput(false)}
        title="채용공고 직접 입력"
      >
        <div className="pb-8 pt-2">
          <textarea
            value={fallbackText}
            onChange={(e) => setFallbackText(e.target.value)}
            placeholder="채용공고 본문을 여기에 붙여넣으세요"
            className="h-48 w-full resize-none rounded-xl bg-[var(--gray-100)] px-4 py-3 text-[14px] leading-[22px] text-[var(--gray-900)] placeholder:text-[var(--gray-400)] focus:outline-none focus:ring-2 focus:ring-[var(--blue-primary)]/20 transition-all"
          />
          <div className="mt-2 flex items-center justify-between">
            <span className="text-[12px] text-[var(--gray-400)]">
              {fallbackText.length}자
            </span>
          </div>
          <button
            onClick={acceptFallbackText}
            disabled={!fallbackText.trim()}
            className={`mt-4 w-full rounded-xl py-3 text-[14px] font-semibold transition-all ${
              fallbackText.trim()
                ? "bg-[var(--blue-primary)] text-white active:scale-[0.98]"
                : "bg-[var(--gray-200)] text-[var(--gray-400)] cursor-not-allowed"
            }`}
          >
            입력 완료
          </button>
        </div>
      </BottomSheet>

      <Toast
        message={errorMsg}
        onClose={() => setErrorMsg(null)}
        onRetry={
          status === "fallback" || status === "error"
            ? () => {
                setErrorMsg(null);
                handleAnalyze();
              }
            : undefined
        }
      />

      {/* Floating fade gradient */}
      <div className="pointer-events-none fixed bottom-[88px] left-1/2 w-full max-w-[640px] h-16 -translate-x-1/2 bg-gradient-to-t from-white to-transparent z-40" />

      {/* Bottom CTA */}
      <div className="fixed bottom-0 left-1/2 w-full max-w-[640px] -translate-x-1/2 bg-white px-5 pb-8 pt-3 border-t border-[var(--gray-200)] z-50">
        <button
          disabled={!hasInput}
          onClick={handleNext}
          className={`w-full rounded-2xl py-[16px] text-[16px] font-bold transition-all ${
            hasInput
              ? "bg-[var(--blue-primary)] text-white active:scale-[0.98]"
              : "bg-[var(--gray-200)] text-[var(--gray-400)] cursor-not-allowed"
          }`}
        >
          다음
        </button>
      </div>
    </motion.div>
  );
}

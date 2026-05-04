"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import StepIndicator from "@/components/StepIndicator";
import LottieAnimation from "@/components/LottieAnimation";
import BottomSheet from "@/components/BottomSheet";
import { useInterview, type JobPostingStructured } from "@/contexts/InterviewContext";

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
  const { resume, setJobPosting, setQuestions, jobPosting } = useInterview();

  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [parsed, setParsed] = useState<JobPostingStructured | null>(jobPosting);
  const [fallbackText, setFallbackText] = useState("");
  const [showDirectInput, setShowDirectInput] = useState(false);
  const [loadingTextIndex, setLoadingTextIndex] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (status !== "loading") return;
    const interval = setInterval(() => {
      setLoadingTextIndex((i) => (i + 1) % LOADING_TEXTS.length);
    }, 800);
    return () => clearInterval(interval);
  }, [status]);

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

  const handleStartInterview = async () => {
    if (!resume.trim()) {
      setErrorMsg("자기소개서가 없어요. 이전 단계에서 작성해 주세요.");
      return;
    }
    if (!parsed) {
      setErrorMsg("채용공고 정보가 없어요.");
      return;
    }

    const jobPostingText = [
      `회사: ${parsed.company}`,
      `포지션: ${parsed.position}`,
      `자격 요건: ${parsed.requirements}`,
      parsed.preferredQualifications ? `우대사항: ${parsed.preferredQualifications}` : "",
      `설명: ${parsed.description}`,
    ]
      .filter(Boolean)
      .join("\n");

    setIsGenerating(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/generate-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume, jobPosting: jobPostingText }),
      });
      const data = await res.json();
      if (!res.ok || !Array.isArray(data.questions)) {
        throw new Error(data.error ?? "질문 생성 실패");
      }
      setQuestions(data.questions);
      router.push("/interview");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "질문 생성 실패";
      setErrorMsg(msg);
      setIsGenerating(false);
    }
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
        {/* URL */}
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

        {/* Direct input link */}
        {!showDirectInput && status !== "success" && status !== "loading" && (
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

          {errorMsg && status !== "loading" && (
            <motion.p
              key="err"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-[12px] text-[var(--danger)] text-center"
            >
              {errorMsg}
            </motion.p>
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

      {/* Generating overlay */}
      <AnimatePresence>
        {isGenerating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-y-0 left-1/2 -translate-x-1/2 w-full max-w-[640px] z-[100] bg-white flex flex-col items-center justify-center px-6"
          >
            <div className="w-44 h-44 flex items-center justify-center">
              <LottieAnimation
                src="/lottie/Sparkles Loop Loader ai.json"
                className="w-full h-full object-contain"
              />
            </div>
            <h2 className="mt-1 text-[20px] font-extrabold text-[var(--gray-900)] tracking-tight text-center">
              맞춤 질문을 생성하고 있어요
            </h2>
            <p className="mt-3 text-[14px] text-[var(--gray-500)] font-medium">
              잠시만 기다려 주세요
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating fade gradient */}
      <div className="pointer-events-none fixed bottom-[88px] left-1/2 w-full max-w-[640px] h-16 -translate-x-1/2 bg-gradient-to-t from-white to-transparent z-40" />

      {/* Bottom CTA */}
      <div className="fixed bottom-0 left-1/2 w-full max-w-[640px] -translate-x-1/2 bg-white px-5 pb-8 pt-3 border-t border-[var(--gray-200)] z-50">
        <button
          disabled={!hasInput || isGenerating}
          onClick={handleStartInterview}
          className={`w-full rounded-2xl py-[16px] text-[16px] font-bold transition-all ${
            hasInput && !isGenerating
              ? "bg-[var(--blue-primary)] text-white active:scale-[0.98]"
              : "bg-[var(--gray-200)] text-[var(--gray-400)] cursor-not-allowed"
          }`}
        >
          {isGenerating ? "질문 생성 중..." : "면접 시작하기"}
        </button>
      </div>
    </motion.div>
  );
}

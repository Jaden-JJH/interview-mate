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

const RECENT_JOBS = [
  { company: "삼성전자", position: "서비스 기획", exp: "4년차" },
  { company: "삼성전자", position: "콘텐츠 마케터", exp: "3년차" },
  { company: "삼성SDS", position: "프론트엔드 개발자", exp: "5년차" },
  { company: "삼성증권", position: "UX 디자이너", exp: "3년차" },
  { company: "LG전자", position: "데이터 분석가", exp: "4년차" },
  { company: "LG에너지솔루션", position: "경영 기획", exp: "5년차" },
  { company: "LG CNS", position: "프로덕트 매니저", exp: "4년차" },
  { company: "SK하이닉스", position: "구매 관리", exp: "3년차" },
  { company: "SK텔레콤", position: "백엔드 개발자", exp: "5년차" },
  { company: "SK C&C", position: "UI 디자이너", exp: "3년차" },
  { company: "현대자동차", position: "콘텐츠 기획", exp: "4년차" },
  { company: "현대자동차", position: "프론트엔드 개발자", exp: "3년차" },
  { company: "현대모비스", position: "해외 영업", exp: "5년차" },
  { company: "현대로템", position: "인사 담당", exp: "3년차" },
  { company: "HD현대", position: "재무 회계", exp: "4년차" },
  { company: "기아", position: "BX 디자이너", exp: "4년차" },
  { company: "롯데그룹", position: "데이터 엔지니어", exp: "3년차" },
  { company: "롯데이커머스", position: "백엔드 개발자", exp: "4년차" },
  { company: "CJ제일제당", position: "SCM 기획", exp: "5년차" },
  { company: "CJ올리브네트웍스", position: "프론트엔드 개발자", exp: "3년차" },
  { company: "CJ ENM", position: "프로덕트 매니저", exp: "4년차" },
  { company: "포스코홀딩스", position: "데이터 분석가", exp: "3년차" },
  { company: "한화솔루션", position: "마케팅 기획", exp: "4년차" },
  { company: "한화에어로스페이스", position: "백엔드 개발자", exp: "5년차" },
  { company: "GS리테일", position: "서비스 기획", exp: "3년차" },
  { company: "신세계", position: "데이터 엔지니어", exp: "4년차" },
  { company: "아모레퍼시픽", position: "UX 리서처", exp: "3년차" },
  { company: "대우건설", position: "경영 지원", exp: "4년차" },
  { company: "유한양행", position: "퍼포먼스 마케터", exp: "3년차" },
  { company: "에스원", position: "서비스 기획", exp: "4년차" },
  { company: "한온시스템", position: "프로덕트 매니저", exp: "5년차" },
  { company: "한섬", position: "프론트엔드 개발자", exp: "3년차" },
  { company: "NHN", position: "콘텐츠 마케터", exp: "4년차" },
  { company: "KB국민은행", position: "백엔드 개발자", exp: "4년차" },
  { company: "신한은행", position: "서비스 기획", exp: "5년차" },
  { company: "하나은행", position: "UX 디자이너", exp: "3년차" },
  { company: "IBK기업은행", position: "데이터 분석가", exp: "4년차" },
  { company: "현대차증권", position: "프론트엔드 개발자", exp: "3년차" },
  { company: "KB캐피탈", position: "마케팅 기획", exp: "4년차" },
  { company: "미래에셋증권", position: "백엔드 개발자", exp: "5년차" },
  { company: "네이버", position: "브랜드 마케터", exp: "4년차" },
  { company: "네이버", position: "QA 엔지니어", exp: "3년차" },
  { company: "네이버웹툰", position: "프론트엔드 개발자", exp: "4년차" },
  { company: "네이버파이낸셜", position: "프로덕트 디자이너", exp: "3년차" },
  { company: "카카오", position: "데이터 엔지니어", exp: "4년차" },
  { company: "카카오", position: "인사 기획", exp: "5년차" },
  { company: "카카오페이", position: "서비스 기획", exp: "4년차" },
  { company: "카카오모빌리티", position: "백엔드 개발자", exp: "3년차" },
  { company: "쿠팡", position: "프로덕트 매니저", exp: "5년차" },
  { company: "쿠팡", position: "UX 디자이너", exp: "4년차" },
  { company: "배달의민족", position: "콘텐츠 마케터", exp: "3년차" },
  { company: "배달의민족", position: "서버 개발자", exp: "5년차" },
  { company: "토스", position: "백엔드 개발자", exp: "4년차" },
  { company: "토스뱅크", position: "서비스 기획", exp: "3년차" },
  { company: "당근", position: "프로덕트 디자이너", exp: "4년차" },
  { company: "당근", position: "데이터 분석가", exp: "3년차" },
  { company: "라인플러스", position: "마케팅 기획", exp: "4년차" },
  { company: "크래프톤", position: "프론트엔드 개발자", exp: "5년차" },
  { company: "하이브", position: "데이터 엔지니어", exp: "4년차" },
  { company: "스노우", position: "프로덕트 매니저", exp: "3년차" },
  { company: "무신사", position: "백엔드 개발자", exp: "4년차" },
  { company: "무신사", position: "서비스 기획", exp: "3년차" },
  { company: "29CM", position: "UX 디자이너", exp: "4년차" },
  { company: "지그재그", position: "그로스 마케터", exp: "3년차" },
  { company: "에이블리", position: "iOS 개발자", exp: "4년차" },
  { company: "오늘의집", position: "프로덕트 매니저", exp: "5년차" },
  { company: "뉴발란스코리아", position: "데이터 분석가", exp: "3년차" },
  { company: "번개장터", position: "백엔드 개발자", exp: "4년차" },
  { company: "마켓컬리", position: "UX 디자이너", exp: "3년차" },
  { company: "브랜디", position: "안드로이드 개발자", exp: "3년차" },
  { company: "야놀자", position: "프로덕트 디자이너", exp: "4년차" },
  { company: "여기어때", position: "프론트엔드 개발자", exp: "3년차" },
  { company: "마이리얼트립", position: "백엔드 개발자", exp: "4년차" },
  { company: "쏘카", position: "데이터 분석가", exp: "3년차" },
  { company: "뤼튼", position: "프로덕트 매니저", exp: "4년차" },
  { company: "업스테이지", position: "프론트엔드 개발자", exp: "3년차" },
  { company: "루닛", position: "서비스 기획", exp: "4년차" },
  { company: "뷰노", position: "백엔드 개발자", exp: "3년차" },
  { company: "채널톡", position: "프로덕트 디자이너", exp: "4년차" },
  { company: "센드버드", position: "콘텐츠 마케터", exp: "3년차" },
  { company: "아시아나IDT", position: "경영 기획", exp: "4년차" },
  { company: "플렉스", position: "프론트엔드 개발자", exp: "3년차" },
  { company: "레몬베이스", position: "프로덕트 매니저", exp: "4년차" },
  { company: "핀다", position: "UX 디자이너", exp: "3년차" },
  { company: "뱅크샐러드", position: "콘텐츠 기획", exp: "4년차" },
  { company: "두나무", position: "서비스 기획", exp: "5년차" },
  { company: "페이히어", position: "프로덕트 디자이너", exp: "3년차" },
  { company: "인프런", position: "백엔드 개발자", exp: "3년차" },
  { company: "팀스파르타", position: "그로스 마케터", exp: "4년차" },
  { company: "코드잇", position: "프론트엔드 개발자", exp: "3년차" },
  { company: "클래스101", position: "서비스 기획", exp: "4년차" },
  { company: "리디", position: "데이터 엔지니어", exp: "3년차" },
  { company: "왓챠", position: "백엔드 개발자", exp: "4년차" },
  { company: "대학내일", position: "프로덕트 디자이너", exp: "3년차" },
  { company: "닥터나우", position: "프론트엔드 개발자", exp: "4년차" },
  { company: "휴온스메디텍", position: "마케팅 기획", exp: "3년차" },
  { company: "강남언니", position: "백엔드 개발자", exp: "4년차" },
  { company: "직방", position: "데이터 분석가", exp: "3년차" },
  { company: "다방", position: "서비스 기획", exp: "4년차" },
  { company: "데브시스터즈", position: "프로덕트 매니저", exp: "3년차" },
  { company: "펄어비스", position: "UX 디자이너", exp: "4년차" },
  { company: "토스랩", position: "콘텐츠 마케터", exp: "3년차" },
  { company: "다우기술", position: "프론트엔드 개발자", exp: "4년차" },
  { company: "한글과컴퓨터", position: "서비스 기획", exp: "3년차" },
  { company: "안랩", position: "프로덕트 매니저", exp: "4년차" },
  { company: "오픈서베이", position: "백엔드 개발자", exp: "3년차" },
  { company: "원티드랩", position: "UX 디자이너", exp: "4년차" },
  { company: "리멤버", position: "그로스 마케터", exp: "3년차" },
  { company: "트레바리", position: "프론트엔드 개발자", exp: "4년차" },
  { company: "버킷플레이스", position: "데이터 엔지니어", exp: "3년차" },
  { company: "스포카", position: "서비스 기획", exp: "4년차" },
  { company: "교촌에프앤비", position: "마케팅 기획", exp: "3년차" },
  { company: "비바리퍼블리카", position: "프로덕트 디자이너", exp: "4년차" },
  { company: "NHN애드", position: "데이터 분석가", exp: "3년차" },
  { company: "삼성전자", position: "백엔드 개발자", exp: "신입" },
  { company: "LG전자", position: "마케팅 기획", exp: "신입" },
  { company: "현대자동차", position: "경영 지원", exp: "신입" },
  { company: "IBK기업은행", position: "서비스 기획", exp: "신입" },
  { company: "롯데그룹", position: "UX 디자이너", exp: "신입" },
  { company: "한화솔루션", position: "데이터 분석가", exp: "신입" },
  { company: "쿠팡", position: "콘텐츠 마케터", exp: "신입" },
  { company: "CJ ENM", position: "프론트엔드 개발자", exp: "신입" },
];

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function useRollingSeeds() {
  const [index, setIndex] = useState(0);
  const [seeds] = useState(() =>
    shuffleArray(RECENT_JOBS).map((j) => ({
      ...j,
      minutesAgo: Math.random() < 0.6
        ? 1 + Math.floor(Math.random() * 30)
        : Math.random() < 0.7
          ? 30 + Math.floor(Math.random() * 90)
          : 120 + Math.floor(Math.random() * 240),
    }))
  );
  useEffect(() => {
    const t = setInterval(() => setIndex((i) => (i + 1) % seeds.length), 3000);
    return () => clearInterval(t);
  }, [seeds.length]);
  const item = seeds[index];
  const timeLabel = item.minutesAgo >= 60
    ? `${Math.floor(item.minutesAgo / 60)}시간 전`
    : `${item.minutesAgo}분 전`;
  return { index, item, timeLabel };
}

function StyleA() {
  const { index, item, timeLabel } = useRollingSeeds();
  return (
    <div>
      <div className="h-[20px] overflow-hidden relative">
        <AnimatePresence mode="popLayout">
          <motion.p
            key={index}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="absolute inset-x-0 text-center text-[13px] text-[var(--gray-500)] whitespace-nowrap"
          >
            <span className="font-semibold text-[var(--gray-700)]">{item.company}</span>
            <span className="mx-3 text-[var(--gray-300)]">&middot;</span>
            {item.position}
            <span className="mx-3 text-[var(--gray-300)]">&middot;</span>
            <span className="text-[var(--gray-400)]">{timeLabel}</span>
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}

function _StyleC() {
  const { index, item, timeLabel } = useRollingSeeds();
  const [todayCount] = useState(() => 80 + Math.floor(Math.random() * 120));
  return (
    <div className="rounded-xl bg-[var(--gray-100)] px-4 py-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
        </span>
        <p className="text-[13px] text-[var(--gray-600)]">
          오늘 <span className="font-bold text-[var(--gray-900)]">{todayCount}명</span>이 면접 연습했어요
        </p>
      </div>
      <div className="h-[18px] overflow-hidden relative ml-4">
        <AnimatePresence mode="popLayout">
          <motion.p
            key={index}
            initial={{ y: 18, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -18, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="absolute text-[12px] text-[var(--gray-400)]"
          >
            {item.company} &middot; {item.position} &middot; {timeLabel}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}

function RecentJobsRolling() {
  return <StyleA />;
}

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
            <div className="flex items-center justify-between mb-2">
              <label className="text-[13px] font-semibold text-[var(--gray-700)]">
                채용공고 URL
              </label>
              {!showDirectInput && status !== "success" && status !== "loading" && (
                <button
                  onClick={() => setShowDirectInput(true)}
                  className="flex items-center gap-1 text-[12px] text-[var(--blue-primary)] font-medium underline underline-offset-2 decoration-[var(--blue-primary)]/40"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  직접 입력
                </button>
              )}
            </div>
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

        {/* 소셜 프루프 — URL 입력 카드 아래, idle 상태에서만 */}
        {activeTab === "url" && !showDirectInput && status !== "success" && status !== "loading" && (
          <RecentJobsRolling />
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

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import StepIndicator from "@/components/StepIndicator";

type Status = "idle" | "loading" | "success" | "fallback";

const DUMMY_RESULT = {
  company: "네이버",
  position: "프론트엔드 개발자",
  requirements: ["React", "TypeScript", "Next.js", "상태 관리", "CI/CD"],
};

export default function JobPostingPage() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [fallbackText, setFallbackText] = useState("");
  const [showDirectInput, setShowDirectInput] = useState(false);

  const hasInput =
    status === "success" ||
    (showDirectInput && fallbackText.trim().length > 0) ||
    (status === "fallback" && fallbackText.trim().length > 0);

  const handleAnalyze = () => {
    if (!url.trim()) return;
    setStatus("loading");
    setTimeout(() => setStatus("success"), 1500);
  };

  return (
    <motion.div
      className="flex min-h-dvh flex-col bg-[var(--gray-bg)]"
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
        <div className="rounded-2xl bg-white p-5">
          <label className="text-[13px] font-semibold text-[var(--gray-700)] mb-2 block">
            채용공고 URL
          </label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="wanted.co.kr/wd/..."
            className="w-full rounded-xl bg-[var(--gray-100)] px-4 py-3 text-[14px] text-[var(--gray-900)] placeholder:text-[var(--gray-400)] focus:outline-none focus:ring-2 focus:ring-[var(--blue-primary)]/20 transition-all"
            disabled={status === "loading" || status === "success"}
          />
          <button
            onClick={handleAnalyze}
            disabled={!url.trim() || status === "loading" || status === "success"}
            className={`mt-3 w-full rounded-xl py-3 text-[14px] font-semibold transition-all ${
              url.trim() && status !== "loading" && status !== "success"
                ? "bg-[var(--blue-primary)] text-white active:scale-[0.98]"
                : "bg-[var(--gray-200)] text-[var(--gray-400)] cursor-not-allowed"
            }`}
          >
            {status === "loading" ? "분석 중..." : "분석하기"}
          </button>
        </div>

        {/* Direct input link */}
        {!showDirectInput && status === "idle" && (
          <button
            onClick={() => setShowDirectInput(true)}
            className="w-full text-center text-[13px] text-[var(--gray-500)]"
          >
            URL 없이 <span className="text-[var(--blue-primary)] font-medium underline underline-offset-2">직접 입력</span>하기
          </button>
        )}

        <AnimatePresence mode="wait">
          {/* Loading */}
          {status === "loading" && (
            <motion.div
              key="loading"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="flex flex-col items-center gap-3 py-8"
            >
              <div className="h-7 w-7 animate-spin rounded-full border-[2.5px] border-[var(--gray-200)] border-t-[var(--blue-primary)]" />
              <p className="text-[13px] text-[var(--gray-500)]">채용공고를 분석하고 있어요</p>
            </motion.div>
          )}

          {/* Success */}
          {status === "success" && (
            <motion.div
              key="success"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl bg-white p-5"
            >
              <div className="flex items-center gap-2 mb-4">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#00B167]">
                  <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-[13px] font-semibold text-[#00875A]">분석 완료</span>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-[12px] text-[var(--gray-400)] mb-0.5">회사</p>
                  <p className="text-[15px] font-bold text-[var(--gray-900)]">{DUMMY_RESULT.company}</p>
                </div>
                <div>
                  <p className="text-[12px] text-[var(--gray-400)] mb-0.5">포지션</p>
                  <p className="text-[15px] font-bold text-[var(--gray-900)]">{DUMMY_RESULT.position}</p>
                </div>
                <div>
                  <p className="text-[12px] text-[var(--gray-400)] mb-2">주요 요건</p>
                  <div className="flex flex-wrap gap-2">
                    {DUMMY_RESULT.requirements.map((req) => (
                      <span
                        key={req}
                        className="rounded-lg bg-[var(--gray-100)] px-3 py-1.5 text-[12px] font-medium text-[var(--gray-700)]"
                      >
                        {req}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Fallback textarea */}
          {(showDirectInput || status === "fallback") && status !== "success" && status !== "loading" && (
            <motion.div
              key="fallback"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl bg-white p-5"
            >
              <label className="text-[13px] font-semibold text-[var(--gray-700)] mb-2 block">
                채용공고 내용
              </label>
              <textarea
                value={fallbackText}
                onChange={(e) => setFallbackText(e.target.value)}
                placeholder="채용공고 내용을 붙여넣으세요"
                className="h-40 w-full resize-none rounded-xl bg-[var(--gray-100)] px-4 py-3 text-[14px] leading-[22px] text-[var(--gray-900)] placeholder:text-[var(--gray-400)] focus:outline-none focus:ring-2 focus:ring-[var(--blue-primary)]/20 transition-all"
              />
              <span className="mt-1 block text-[12px] text-[var(--gray-400)]">
                {fallbackText.length}자
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom CTA */}
      <div className="fixed bottom-0 left-1/2 w-full max-w-[640px] -translate-x-1/2 bg-white px-5 pb-8 pt-3 border-t border-[var(--gray-200)]">
        <button
          disabled={!hasInput}
          onClick={() => router.push("/interview")}
          className={`w-full rounded-2xl py-[16px] text-[16px] font-bold transition-all ${
            hasInput
              ? "bg-[var(--blue-primary)] text-white active:scale-[0.98]"
              : "bg-[var(--gray-200)] text-[var(--gray-400)] cursor-not-allowed"
          }`}
        >
          면접 시작하기
        </button>
      </div>
    </motion.div>
  );
}

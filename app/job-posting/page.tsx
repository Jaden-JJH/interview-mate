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
    setTimeout(() => {
      setStatus("success");
    }, 1500);
  };

  const handleDirectInput = () => {
    setShowDirectInput(true);
    setStatus("idle");
  };

  return (
    <motion.div
      className="flex min-h-dvh flex-col"
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.35, ease: "easeInOut" }}
    >
      <StepIndicator currentStep={2} totalSteps={3} label="채용공고 입력" />

      <div className="flex-1 overflow-y-auto px-5 pb-28">
        {/* URL Input */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-gray-700">
            채용공고 URL
          </label>
          <div className="flex gap-2">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="채용공고 URL을 붙여넣으세요 (예: wanted.co.kr/...)"
              className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 placeholder:text-gray-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all"
              disabled={status === "loading" || status === "success"}
            />
            <button
              onClick={handleAnalyze}
              disabled={
                !url.trim() || status === "loading" || status === "success"
              }
              className={`flex-shrink-0 rounded-xl px-5 py-3 text-sm font-semibold transition-all ${
                url.trim() && status !== "loading" && status !== "success"
                  ? "bg-indigo-600 text-white hover:bg-indigo-500 active:scale-95"
                  : "cursor-not-allowed bg-gray-200 text-gray-400"
              }`}
            >
              분석하기
            </button>
          </div>

          {/* Direct-input link */}
          {!showDirectInput && status !== "success" && (
            <button
              onClick={handleDirectInput}
              className="text-xs text-indigo-500 underline underline-offset-2 hover:text-indigo-700"
            >
              URL 없이 직접 입력하기
            </button>
          )}
        </div>

        {/* Status states */}
        <div className="mt-6">
          <AnimatePresence mode="wait">
            {/* Loading */}
            {status === "loading" && (
              <motion.div
                key="loading"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex flex-col items-center gap-3 py-12"
              >
                <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-gray-200 border-t-indigo-600" />
                <p className="text-sm text-gray-500">
                  채용공고를 분석하고 있습니다...
                </p>
              </motion.div>
            )}

            {/* Success */}
            {status === "success" && (
              <motion.div
                key="success"
                initial={{ opacity: 0, y: 12, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.35 }}
                className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
              >
                <div className="mb-4 flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100">
                    <svg
                      className="h-3.5 w-3.5 text-emerald-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-emerald-700">
                    분석 완료
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start gap-2.5">
                    <span className="text-base">🏢</span>
                    <div>
                      <p className="text-xs text-gray-400">회사</p>
                      <p className="text-sm font-semibold text-gray-800">
                        {DUMMY_RESULT.company}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="text-base">📋</span>
                    <div>
                      <p className="text-xs text-gray-400">포지션</p>
                      <p className="text-sm font-semibold text-gray-800">
                        {DUMMY_RESULT.position}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="text-base">⚙️</span>
                    <div>
                      <p className="text-xs text-gray-400 mb-1.5">주요 요건</p>
                      <div className="flex flex-wrap gap-2">
                        {DUMMY_RESULT.requirements.map((req) => (
                          <span
                            key={req}
                            className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 ring-1 ring-indigo-100"
                          >
                            {req}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Fallback / Direct input */}
            {(status === "fallback" || showDirectInput) &&
              status !== "success" &&
              status !== "loading" && (
                <motion.div
                  key="fallback"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-3"
                >
                  {status === "fallback" && (
                    <div className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2.5 text-sm text-amber-800 ring-1 ring-amber-100">
                      <span>⚠️</span>
                      <p>
                        채용공고를 자동으로 읽지 못했습니다. 아래에 직접
                        붙여넣어 주세요.
                      </p>
                    </div>
                  )}
                  <textarea
                    value={fallbackText}
                    onChange={(e) => setFallbackText(e.target.value)}
                    placeholder="채용공고 내용을 여기에 붙여넣으세요 (회사명, 포지션, 자격요건 등)"
                    className="h-48 w-full resize-none rounded-2xl border border-gray-200 bg-white px-4 py-4 text-sm leading-relaxed text-gray-800 placeholder:text-gray-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all"
                  />
                  <span className="text-xs text-gray-400">
                    {fallbackText.length}자 입력됨
                  </span>
                </motion.div>
              )}
          </AnimatePresence>
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="fixed bottom-0 left-1/2 w-full max-w-[640px] -translate-x-1/2 bg-gradient-to-t from-gray-50 via-gray-50/95 to-gray-50/0 px-5 pb-6 pt-4">
        <button
          disabled={!hasInput}
          onClick={() => router.push("/interview")}
          className={`w-full rounded-xl py-4 text-base font-semibold transition-all ${
            hasInput
              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200 hover:bg-indigo-500 active:scale-[0.98]"
              : "cursor-not-allowed bg-indigo-600/50 text-white/70"
          }`}
        >
          면접 시작하기 →
        </button>
      </div>
    </motion.div>
  );
}

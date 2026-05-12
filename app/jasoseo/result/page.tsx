// 자소서 분석 결과 페이지 — 종합 점수·5축 바차트·문항별 피드백·유료 unlock 페이월 + Toast·로딩 오버레이
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import posthog from "posthog-js";
import {
  useJasoseo,
  type AnalysisAxes,
  type UnlockedSection,
} from "@/contexts/JasoseoContext";
import { useInterview } from "@/contexts/InterviewContext";
import Toast from "@/components/Toast";
import LottieAnimation from "@/components/LottieAnimation";

const AXIS_LABELS: Record<keyof AnalysisAxes, string> = {
  logic: "논리성",
  specificity: "구체성",
  relevance: "직무연관성",
  uniqueness: "차별성",
  interviewDefense: "면접방어력",
};

const AXIS_KEYS: (keyof AnalysisAxes)[] = [
  "logic",
  "specificity",
  "relevance",
  "uniqueness",
  "interviewDefense",
];

function scoreColor(score: number): string {
  if (score >= 80) return "var(--blue-primary)";
  if (score >= 60) return "#F59E0B";
  return "var(--danger)";
}

function ScoreRing({ score }: { score: number }) {
  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="128" height="128" className="-rotate-90">
        <circle
          cx="64"
          cy="64"
          r="54"
          fill="none"
          stroke="var(--gray-100)"
          strokeWidth="8"
        />
        <motion.circle
          cx="64"
          cy="64"
          r="54"
          fill="none"
          stroke={scoreColor(score)}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute text-center">
        <p className="text-[32px] font-extrabold text-[var(--gray-900)]">
          {score}
        </p>
        <p className="text-[11px] text-[var(--gray-500)]">/ 100</p>
      </div>
    </div>
  );
}

function AxisBar({
  label,
  value,
  delay,
}: {
  label: string;
  value: number;
  delay: number;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-[72px] shrink-0 text-[12px] font-semibold text-[var(--gray-700)]">
        {label}
      </span>
      <div className="flex-1 h-[10px] rounded-full bg-[var(--gray-100)] overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: scoreColor(value) }}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.8, delay, ease: "easeOut" }}
        />
      </div>
      <span className="w-8 text-right text-[12px] font-bold text-[var(--gray-900)]">
        {value}
      </span>
    </div>
  );
}

export default function JasoseoResultPage() {
  const router = useRouter();
  const { analysisResult, resumeText, unlockedSections, setUnlockedSections } =
    useJasoseo();
  const interview = useInterview();
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<number>(0);
  const [freeUnlockAvailable, setFreeUnlockAvailable] = useState<boolean | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const unlockInFlight = useRef(false);

  useEffect(() => {
    if (!analysisResult) {
      router.replace("/jasoseo/analyze");
    }
  }, [analysisResult, router]);

  useEffect(() => {
    fetch("/api/me/credits", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setFreeUnlockAvailable(!data.jasoseoFreeUnlockUsed);
        }
      })
      .catch(() => {});
  }, []);

  if (!analysisResult) return null;

  const { overallScore, overallComment, axes, sections, analysisId } =
    analysisResult;

  const handleUnlock = async () => {
    if (unlockInFlight.current) return;
    if (analysisId === "guest") {
      setUnlockError("로그인 후 이용할 수 있어요.");
      return;
    }
    unlockInFlight.current = true;
    setIsUnlocking(true);
    setUnlockError(null);
    posthog.capture("jasoseo_unlock_clicked");
    try {
      const res = await fetch("/api/analyze-resume/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysisId }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "insufficient_credits") {
          setUnlockError("크레딧이 부족해요. 충전 후 다시 시도해 주세요.");
        } else {
          throw new Error(data.error ?? "unlock 실패");
        }
        return;
      }
      posthog.capture("jasoseo_unlock_completed");
      setUnlockedSections(data.sections as UnlockedSection[]);
      if (data.balance !== undefined) {
        const { free, paid } = data.balance;
        setToastMsg(`잠금 해제 완료! 남은 크레딧: ${free + paid}개`);
      }
    } catch (err) {
      setUnlockError(
        err instanceof Error ? err.message : "잠금 해제에 실패했어요."
      );
    } finally {
      setIsUnlocking(false);
      unlockInFlight.current = false;
    }
  };

  const findUnlocked = (questionTitle: string) =>
    unlockedSections?.find((u) => u.questionTitle === questionTitle);

  return (
    <div className="flex flex-1 flex-col px-5 pt-6 pb-32">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-[22px] font-extrabold text-[var(--gray-900)]">
          분석 결과
        </h1>
        <p className="mt-1 text-[14px] text-[var(--gray-500)]">
          면접관 관점에서 본 당신의 자기소개서
        </p>
      </div>

      {/* Overall score */}
      <div className="flex flex-col items-center mb-6">
        <ScoreRing score={overallScore} />
        <p className="mt-4 text-center text-[14px] leading-[22px] text-[var(--gray-700)] px-4">
          {overallComment}
        </p>
      </div>

      {/* 5-axis chart */}
      <div className="rounded-2xl bg-[var(--gray-50)] p-4 space-y-3 mb-6">
        <h2 className="text-[14px] font-bold text-[var(--gray-900)] mb-2">
          5축 평가
        </h2>
        {AXIS_KEYS.map((key, i) => (
          <AxisBar
            key={key}
            label={AXIS_LABELS[key]}
            value={(axes as AnalysisAxes)[key]}
            delay={0.1 + i * 0.1}
          />
        ))}
      </div>

      {/* Sections */}
      <div className="space-y-3 mb-6">
        <h2 className="text-[14px] font-bold text-[var(--gray-900)]">
          문항별 분석
        </h2>
        {sections.map((section, idx) => {
          const unlocked = findUnlocked(section.questionTitle);
          const isExpanded = expandedSection === idx;

          return (
            <div
              key={idx}
              className="rounded-2xl border border-[var(--gray-200)] overflow-hidden"
            >
              <button
                onClick={() =>
                  setExpandedSection(isExpanded ? -1 : idx)
                }
                className="w-full flex items-center justify-between px-4 py-3 text-left"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold text-[var(--gray-900)] truncate">
                    {section.questionTitle}
                  </p>
                  <p className="text-[12px] text-[var(--gray-500)] mt-0.5">
                    {section.strength}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  <span
                    className="text-[14px] font-extrabold"
                    style={{ color: scoreColor(section.score) }}
                  >
                    {section.score}
                  </span>
                  <svg
                    className={`h-4 w-4 text-[var(--gray-400)] transition-transform ${
                      isExpanded ? "rotate-180" : ""
                    }`}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 border-t border-[var(--gray-100)]">
                  <div className="mt-3 space-y-2">
                    {section.weaknesses.map((w, wi) => {
                      const unlockedW = unlocked?.weaknesses.find(
                        (uw) => uw.title === w.title
                      );
                      const hasFreeSample = w.detail && w.interviewQuestion;

                      return (
                        <div
                          key={wi}
                          className="rounded-xl bg-red-50/50 px-3 py-2.5"
                        >
                          <p className="text-[13px] font-semibold text-[var(--gray-900)]">
                            {w.title}
                          </p>
                          {unlockedW ? (
                            <div className="mt-2 space-y-2">
                              <p className="text-[12px] leading-[18px] text-[var(--gray-700)]">
                                {unlockedW.detail}
                              </p>
                              <div className="rounded-lg bg-[var(--blue-light)] px-3 py-2">
                                <p className="text-[11px] font-semibold text-[var(--blue-primary)] mb-0.5">
                                  예상 꼬리질문
                                </p>
                                <p className="text-[12px] text-[var(--gray-900)]">
                                  &ldquo;{unlockedW.interviewQuestion}&rdquo;
                                </p>
                              </div>
                            </div>
                          ) : hasFreeSample ? (
                            <div className="mt-2 space-y-2">
                              <p className="text-[12px] leading-[18px] text-[var(--gray-700)]">
                                {w.detail}
                              </p>
                              <div className="rounded-lg bg-[var(--blue-light)] px-3 py-2">
                                <p className="text-[11px] font-semibold text-[var(--blue-primary)] mb-0.5">
                                  예상 꼬리질문
                                </p>
                                <p className="text-[12px] text-[var(--gray-900)]">
                                  &ldquo;{w.interviewQuestion}&rdquo;
                                </p>
                              </div>
                              {!unlockedSections && (
                                <p className="text-[11px] text-[var(--gray-400)] italic">
                                  나머지 약점 상세·꼬리질문·수정본은 잠금 해제 후 확인
                                </p>
                              )}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>

                  {/* Revised text (unlocked only) */}
                  {unlocked?.revisedText && (
                    <div className="mt-3 rounded-xl bg-green-50 px-3 py-3">
                      <p className="text-[11px] font-semibold text-green-700 mb-1">
                        AI 수정본
                      </p>
                      <p className="text-[12px] leading-[18px] text-[var(--gray-700)] whitespace-pre-line">
                        {unlocked.revisedText}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Unlock paywall */}
      {!unlockedSections && (
        <div className="rounded-2xl bg-gradient-to-br from-[#1B64DA]/5 to-[#7C5CFF]/5 border border-[var(--blue-primary)]/20 p-5 mb-6">
          <div className="text-center mb-4">
            <p className="text-[15px] font-bold text-[var(--gray-900)]">
              전체 상세 분석 잠금 해제
            </p>
            <p className="mt-1 text-[13px] text-[var(--gray-500)]">
              약점 상세 분석 · 예상 꼬리질문 · AI 수정본
            </p>
          </div>
          <button
            onClick={handleUnlock}
            disabled={isUnlocking}
            className="w-full rounded-2xl bg-[var(--blue-primary)] py-3.5 text-[15px] font-bold text-white disabled:opacity-50 active:scale-[0.99] transition-transform"
          >
            {isUnlocking
              ? "분석 생성 중..."
              : freeUnlockAvailable
                ? "무료로 잠금 해제"
                : "잠금 해제 (1크레딧)"}
          </button>
        </div>
      )}

      {/* Bottom CTA */}
      <div className="pointer-events-none fixed bottom-[88px] left-1/2 w-full max-w-[640px] h-16 -translate-x-1/2 bg-gradient-to-t from-white to-transparent z-40" />
      <div className="fixed bottom-0 left-1/2 w-full max-w-[640px] -translate-x-1/2 bg-white px-5 pb-8 pt-3 border-t border-[var(--gray-200)] z-50">
        <div className="flex gap-2">
          <button
            onClick={() => router.push("/jasoseo/analyze")}
            className="flex-1 rounded-2xl border border-[var(--gray-200)] py-3.5 text-[14px] font-semibold text-[var(--gray-700)]"
          >
            다시 분석
          </button>
          <button
            id="jasoseo-interview-cta"
            onClick={() => {
              interview.setResume(resumeText, "자소서메이트 분석본");
              router.push("/job-posting");
            }}
            className="flex-1 rounded-2xl bg-[var(--blue-primary)] py-3.5 text-[14px] font-bold text-white active:scale-[0.99] transition-transform"
          >
            면접 연습하기
          </button>
        </div>
      </div>

      {/* Unlock loading overlay */}
      <AnimatePresence>
        {isUnlocking && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex justify-center"
          >
            <div className="w-full max-w-[640px] bg-white flex flex-col items-center justify-center px-6">
              <div className="w-44 h-44 flex items-center justify-center">
                <LottieAnimation
                  src="/lottie/Sparkles Loop Loader ai.json"
                  className="w-full h-full object-contain"
                />
              </div>
              <h2 className="mt-1 text-[20px] font-extrabold text-[var(--gray-900)] tracking-tight text-center">
                상세 분석을 생성하고 있어요
              </h2>
              <p className="mt-3 text-[14px] text-[var(--gray-500)] font-medium">
                보통 15~30초 정도 걸려요
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast for errors and balance notifications */}
      <Toast
        message={unlockError || toastMsg}
        onClose={() => {
          setUnlockError(null);
          setToastMsg(null);
        }}
      />
    </div>
  );
}

// 면접 결과 페이지 — 종합 점수, 레이더 차트, 질문별 아코디언 피드백, 컨페티 연출
"use client";

import { useMemo, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import ScoreGauge from "@/components/ScoreGauge";
import AccordionItem from "@/components/AccordionItem";
import LottieAnimation from "@/components/LottieAnimation";
import RadarChart from "@/components/RadarChart";
import { useInterview } from "@/contexts/InterviewContext";
import { clearAll } from "@/lib/interviewStorage";
import { resolvePersona } from "@/lib/personas";

function safeAvg(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

export default function ResultPage() {
  const router = useRouter();
  const {
    qaResults,
    overallScore,
    overallComment,
    durationMinutes,
    resolvedPersonaId,
    personaId,
    reset,
  } = useInterview();
  const savedRef = useRef(false);

  // Guard: if no results, route back home.
  useEffect(() => {
    if (qaResults.length === 0) {
      router.replace("/");
    }
  }, [qaResults.length, router]);

  // Defense-in-depth: finishInterview already clears, but if the user lands
  // on /result via direct navigation we make absolutely sure no stale
  // progress prompts them to "이어서" a finished interview.
  useEffect(() => {
    clearAll();
  }, []);

  // Persist this completed interview once. Guard with a ref so React's
  // double-invoke (StrictMode dev) and confetti re-renders can't double-save.
  useEffect(() => {
    if (qaResults.length === 0 || savedRef.current) return;
    savedRef.current = true;
    fetch("/api/interview-history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        personaId: resolvedPersonaId || personaId,
        durationMinutes,
        overallScore,
        overallComment,
        qaResults,
        endedAt: new Date().toISOString(),
      }),
    }).catch(() => {
      // Best-effort: a save failure shouldn't break the result page.
      savedRef.current = false;
    });
  }, [
    qaResults,
    overallScore,
    overallComment,
    durationMinutes,
    resolvedPersonaId,
    personaId,
  ]);

  // Confetti celebration when a result is shown and the score is decent.
  useEffect(() => {
    if (qaResults.length === 0 || overallScore < 60) return;
    const timer = setTimeout(() => {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#4F46E5", "#818CF8", "#10B981", "#F59E0B"],
      });
    }, 500);
    return () => clearTimeout(timer);
  }, [qaResults.length, overallScore]);

  const radarData = useMemo(() => {
    if (qaResults.length === 0) return [];
    const s = qaResults.map((q) => q.score);
    // Question order from generate-questions: tech(2), project(2), soft(1), motivation(1), career(1)
    const tech = s.slice(0, 2);
    const proj = s.slice(2, 4);
    const soft = s.slice(4, 5);
    const motiv = s.slice(5, 6);
    const career = s.slice(6, 7);
    return [
      { label: "직무 이해도", value: safeAvg(tech) || overallScore },
      { label: "문제 해결력", value: safeAvg(proj) || overallScore },
      { label: "커뮤니케이션", value: safeAvg(soft) || overallScore },
      { label: "논리성", value: overallScore },
      { label: "인성/태도", value: safeAvg([...motiv, ...career]) || overallScore },
    ];
  }, [qaResults, overallScore]);

  const stats = useMemo(() => {
    const scores = qaResults.map((q) => q.score);
    return {
      total: qaResults.length,
      avg: safeAvg(scores),
      max: scores.length ? Math.max(...scores) : 0,
    };
  }, [qaResults]);

  const persona = resolvePersona(resolvedPersonaId || personaId || "alex");

  const handleRestart = () => {
    reset();
    router.push("/");
  };

  if (qaResults.length === 0) return null;

  return (
    <motion.div
      className="flex min-h-dvh flex-col bg-white"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {overallScore >= 70 && (
        <div className="fixed inset-0 z-50 pointer-events-none flex items-start justify-center pt-6">
          <LottieAnimation src="/lottie/congratulation.json" loop={false} className="w-[360px] h-[360px]" />
        </div>
      )}

      {/* Top bar */}
      <div className="flex items-center bg-white px-5 py-3 border-b border-[var(--gray-200)]">
        <button onClick={() => router.push("/")} className="p-1 mr-3">
          <svg className="h-5 w-5 text-[var(--gray-900)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="text-[15px] font-bold text-[var(--gray-900)]">면접 결과</span>
      </div>

      {/* Scrollable */}
      <div className="flex-1 overflow-y-auto pb-28">
        {/* Score section */}
        <div className="bg-white px-5 pt-8 pb-6 relative overflow-hidden">
          <motion.div
            className="flex flex-col items-center relative z-10"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.4, ease: "easeOut" }}
          >
            {overallScore >= 90 && (
              <div className="absolute -top-14 w-28 h-28 z-20 pointer-events-none">
                <LottieAnimation src="/lottie/Trophy.json" />
              </div>
            )}
            <ScoreGauge score={overallScore} />
            {overallComment && (
              <p className="mt-5 text-[14px] leading-[22px] text-center text-[var(--gray-700)] px-4">
                {overallComment}
              </p>
            )}
            {radarData.length > 0 && (
              <div className="mt-8 mb-2 w-full flex justify-center">
                <RadarChart data={radarData} size={260} />
              </div>
            )}
          </motion.div>
        </div>

        {/* Stats row */}
        <div className="px-5 py-4">
          <div className="flex gap-3">
            {[
              { label: "총 질문", value: `${stats.total}개` },
              { label: "평균 점수", value: `${stats.avg}점` },
              { label: "최고 점수", value: `${stats.max}점` },
            ].map((stat) => (
              <motion.div
                key={stat.label}
                className="flex-1 rounded-2xl border border-[var(--gray-200)] shadow-sm bg-white px-4 py-4 text-center"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.3 }}
              >
                <p className="text-[11px] text-[var(--gray-400)]">{stat.label}</p>
                <p className="mt-1 text-[18px] font-bold text-[var(--gray-900)]">{stat.value}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Persona badge */}
        <div className="px-5 pb-2">
          <div className="flex items-center gap-3 rounded-2xl border border-[var(--gray-200)] bg-white px-4 py-3">
            <div className="w-10 h-10 overflow-hidden flex-shrink-0 flex items-center justify-center">
              <div style={{ transform: `scale(${persona.cardScale})`, transformOrigin: "center" }}>
                <LottieAnimation src={persona.characterLottie} className="w-10 h-10" />
              </div>
            </div>
            <div>
              <p className="text-[11px] text-[var(--gray-400)]">이번 면접관</p>
              <p className="text-[14px] font-bold" style={{ color: persona.accentColor }}>{persona.name}</p>
            </div>
          </div>
        </div>

        {/* Questions */}
        <div className="px-5 space-y-3">
          <p className="text-[14px] font-bold text-[var(--gray-900)] mb-1">질문별 피드백</p>
          {qaResults.map((q, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + i * 0.06, duration: 0.3 }}
            >
              <AccordionItem
                questionNumber={i + 1}
                question={q.question}
                score={q.score}
                myAnswer={q.answer}
                modelAnswer={q.bestAnswer}
                keywords={q.keywords}
                feedback={q.feedback}
              />
            </motion.div>
          ))}
        </div>
      </div>

      <div className="pointer-events-none fixed bottom-[88px] left-1/2 w-full max-w-[640px] h-16 -translate-x-1/2 bg-gradient-to-t from-white to-transparent z-40" />

      {/* Bottom buttons */}
      <div className="fixed bottom-0 left-1/2 w-full max-w-[640px] -translate-x-1/2 bg-white px-5 pb-8 pt-3 border-t border-[var(--gray-200)] z-50">
        <div className="flex gap-3">
          <button
            onClick={handleRestart}
            className="flex-1 rounded-2xl border border-[var(--gray-200)] bg-white py-[16px] text-[15px] font-bold text-[var(--gray-700)] active:scale-[0.98] transition-all"
          >
            다시 연습하기
          </button>
          <button
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: "인터뷰메이트 면접 결과",
                  text: `면접 연습 결과: ${overallScore}점`,
                });
              }
            }}
            className="flex-1 rounded-2xl bg-[var(--blue-primary)] py-[16px] text-[15px] font-bold text-white active:scale-[0.98] transition-all"
          >
            결과 공유하기
          </button>
        </div>
      </div>
    </motion.div>
  );
}

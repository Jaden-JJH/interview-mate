// 마법약 확률 추론 게임 — 패턴인식력 측정, 모바일 퍼스트
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import posthog from "posthog-js";
import LottieAnimation from "@/components/LottieAnimation";

const HERBS = ["🌿", "🍀", "🌾", "🌱"];

const COMBOS = [
  { id: 1, grid: [0, 1, 0, 0], redProb: 0.7 },
  { id: 2, grid: [0, 0, 1, 0], redProb: 0.3 },
  { id: 3, grid: [0, 0, 0, 1], redProb: 0.6 },
  { id: 4, grid: [1, 0, 0, 0], redProb: 0.4 },
  { id: 5, grid: [1, 1, 0, 0], redProb: 0.8 },
  { id: 6, grid: [0, 0, 1, 1], redProb: 0.5 },
  { id: 7, grid: [1, 0, 1, 0], redProb: 0.65 },
  { id: 8, grid: [0, 1, 0, 1], redProb: 0.35 },
  { id: 9, grid: [1, 1, 1, 0], redProb: 0.75 },
  { id: 10, grid: [1, 1, 0, 1], redProb: 0.55 },
  { id: 11, grid: [1, 0, 1, 1], redProb: 0.45 },
  { id: 12, grid: [0, 1, 1, 1], redProb: 0.4 },
  { id: 13, grid: [1, 0, 0, 1], redProb: 0.6 },
  { id: 14, grid: [0, 1, 1, 0], redProb: 0.7 },
];

type Combo = (typeof COMBOS)[number];
type HistoryEntry = {
  combo: Combo;
  prediction: "red" | "blue" | null;
  result: "red" | "blue";
  correct: boolean;
  timeout: boolean;
  round: number;
};
type GameState = "setup" | "playing" | "result";

const ROUND_OPTIONS = [20, 30, 40, 50];

export default function PotionGame() {
  const router = useRouter();

  const [gameState, setGameState] = useState<GameState>("setup");
  const [maxRounds, setMaxRounds] = useState(20);
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [currentCombo, setCurrentCombo] = useState<Combo | null>(null);
  const [actualResult, setActualResult] = useState<"red" | "blue" | null>(null);
  const [, setUserPrediction] = useState<"red" | "blue" | null>(null);
  const [feedback, setFeedback] = useState("");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [timeLeft, setTimeLeft] = useState(3);

  useEffect(() => {
    if (gameState === "playing" && !showResult && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (gameState === "playing" && !showResult && timeLeft === 0) {
      handleTimeout();
    }
  }, [timeLeft, gameState, showResult]);

  const generateNextRound = () => {
    const combo = COMBOS[Math.floor(Math.random() * COMBOS.length)];
    setCurrentCombo(combo);
    setUserPrediction(null);
    setShowResult(false);
    setActualResult(null);
    setFeedback("");
    setTimeLeft(3);
  };

  const startGame = () => {
    setGameState("playing");
    setRound(0);
    setScore(0);
    setHistory([]);
    setFeedback("");
    posthog.capture("aitest_potion_start", { rounds: maxRounds });
    generateNextRound();
  };

  const generateResult = (combo: Combo): "red" | "blue" =>
    Math.random() < combo.redProb ? "red" : "blue";

  const handleTimeout = () => {
    if (!currentCombo) return;
    const result = generateResult(currentCombo);
    setActualResult(result);
    setShowResult(true);
    setFeedback("시간 초과");

    const entry: HistoryEntry = {
      combo: currentCombo,
      prediction: null,
      result,
      correct: false,
      timeout: true,
      round: round + 1,
    };
    const newHistory = [...history, entry];
    setHistory(newHistory);

    setTimeout(() => {
      if (round + 1 >= maxRounds) {
        setGameState("result");
      } else {
        setRound(round + 1);
        generateNextRound();
      }
    }, 1500);
  };

  const submitPrediction = (prediction: "red" | "blue") => {
    if (!currentCombo) return;
    setUserPrediction(prediction);
    const result = generateResult(currentCombo);
    setActualResult(result);
    setShowResult(true);

    const isCorrect = prediction === result;
    if (isCorrect) {
      setScore((s) => s + 1);
      setFeedback("정답!");
    } else {
      setFeedback("오답");
    }

    const entry: HistoryEntry = {
      combo: currentCombo,
      prediction,
      result,
      correct: isCorrect,
      timeout: false,
      round: round + 1,
    };
    const newHistory = [...history, entry];
    setHistory(newHistory);

    setTimeout(() => {
      if (round + 1 >= maxRounds) {
        setGameState("result");
      } else {
        setRound(round + 1);
        generateNextRound();
      }
    }, 1500);
  };

  const resetGame = () => {
    setGameState("setup");
    setRound(0);
    setScore(0);
    setHistory([]);
    setCurrentCombo(null);
    setActualResult(null);
    setUserPrediction(null);
    setFeedback("");
    setShowResult(false);
  };

  const accuracy = maxRounds > 0 ? Math.round((score / maxRounds) * 100) : 0;
  const passScore = Math.ceil(maxRounds * 0.65);

  // ─── SETUP ─────────────────────────────
  if (gameState === "setup") {
    return (
      <motion.div
        className="flex flex-col bg-white min-h-dvh"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.35 }}
      >
        <div className="px-6 pt-6 pb-[120px]">
          <button
            onClick={() => router.push("/aitest")}
            className="mb-4 flex items-center gap-1 text-[13px] text-[var(--gray-500)] font-medium"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 12l-4-4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            전체 검사
          </button>

          <h1 className="text-[24px] font-extrabold text-[var(--gray-900)] tracking-tight">
            마법약 확률 추론
          </h1>
          <p className="mt-1 text-[14px] text-[var(--gray-500)] font-medium">
            재료 조합의 확률 패턴을 파악하세요
          </p>

          {/* TUTORIAL */}
          <div className="mt-5 rounded-2xl bg-[var(--gray-100)] p-5">
            <h3 className="text-[14px] font-bold text-[var(--gray-900)] mb-3">
              게임 규칙
            </h3>
            <ul className="space-y-2 text-[13px] text-[var(--gray-700)] leading-[20px]">
              <li className="flex items-start gap-2">
                <span className="text-[var(--blue-primary)] mt-0.5 shrink-0">1.</span>
                4분면 재료 조합이 주어지면 빨간약/파란약을 예측
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[var(--blue-primary)] mt-0.5 shrink-0">2.</span>
                각 조합마다 확률이 다르므로 통계를 파악하세요
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[var(--blue-primary)] mt-0.5 shrink-0">3.</span>
                <span>
                  라운드당 <strong className="text-[var(--danger)]">3초</strong> 이내 선택 (초과 시 오답)
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[var(--blue-primary)] mt-0.5 shrink-0">4.</span>
                합격 기준: 65% 이상
              </li>
            </ul>

            <div className="mt-4 flex items-center justify-center gap-3 py-3 bg-white rounded-xl">
              <div className="grid grid-cols-2 gap-1 w-16 h-16">
                {[1, 0, 0, 1].map((has, i) => (
                  <div
                    key={i}
                    className={`rounded flex items-center justify-center text-[16px] ${
                      has ? "bg-green-100" : "bg-gray-200"
                    }`}
                  >
                    {has ? HERBS[i] : ""}
                  </div>
                ))}
              </div>
              <span className="text-[13px] text-[var(--gray-500)]">→</span>
              <span className="text-[24px]">🧪</span>
              <span className="text-[13px] text-[var(--gray-500)]">→</span>
              <span className="text-[13px] font-bold text-[var(--gray-700)]">
                🔴 or 🔵 ?
              </span>
            </div>
          </div>

          {/* ROUND COUNT */}
          <div className="mt-5">
            <h3 className="text-[14px] font-bold text-[var(--gray-800)] mb-3">
              라운드 수
            </h3>
            <div className="grid grid-cols-4 gap-2">
              {ROUND_OPTIONS.map((n) => (
                <button
                  key={n}
                  onClick={() => setMaxRounds(n)}
                  className={`py-3 rounded-xl text-[15px] font-bold transition-all ${
                    maxRounds === n
                      ? "bg-[var(--blue-primary)] text-white shadow-lg"
                      : "bg-[var(--gray-100)] text-[var(--gray-700)]"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-[var(--gray-400)]">
              라운드가 많을수록 패턴 파악에 유리합니다
            </p>
          </div>

        </div>

        <div className="pointer-events-none fixed bottom-[88px] left-1/2 w-full max-w-[640px] h-12 -translate-x-1/2 bg-gradient-to-t from-white to-transparent z-40" />
        <div className="fixed bottom-0 left-1/2 w-full max-w-[640px] -translate-x-1/2 bg-white px-5 pb-8 pt-3 border-t border-[var(--gray-200)] z-50">
          <button
            onClick={startGame}
            className="w-full rounded-2xl bg-[var(--blue-primary)] py-[16px] text-[16px] font-bold text-white shadow-[0_8px_24px_-8px_rgba(27,100,218,0.5)] transition-transform active:scale-[0.98]"
          >
            게임 시작
          </button>
        </div>
      </motion.div>
    );
  }

  // ─── PLAYING ───────────────────────────
  if (gameState === "playing" && currentCombo) {
    return (
      <motion.div
        className="flex flex-col bg-white min-h-dvh"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.25 }}
      >
        <div className="px-6 pt-4 pb-[180px] flex flex-col flex-1">
          {/* TOP BAR */}
          <div className="flex items-center justify-between mb-3">
            <div className="text-[14px] font-bold text-[var(--gray-900)]">
              {round + 1} / {maxRounds}
            </div>
            <div className="text-[14px] font-bold text-[var(--blue-primary)]">
              점수: {score}
            </div>
          </div>

          {/* TIMER — always occupies space */}
          <div className="mb-3 h-[56px]">
            {!showResult ? (
              <>
                <div className="flex items-center justify-center mb-1.5">
                  <span
                    className={`text-[32px] font-extrabold leading-none ${
                      timeLeft <= 1
                        ? "text-[var(--danger)] animate-pulse"
                        : timeLeft === 2
                          ? "text-[var(--warning)]"
                          : "text-[var(--success)]"
                    }`}
                  >
                    {timeLeft}
                  </span>
                </div>
                <div className="w-full bg-[var(--gray-100)] rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-2 rounded-full transition-all duration-1000 ${
                      timeLeft <= 1
                        ? "bg-[var(--danger)]"
                        : timeLeft === 2
                          ? "bg-[var(--warning)]"
                          : "bg-[var(--success)]"
                    }`}
                    style={{ width: `${(timeLeft / 3) * 100}%` }}
                  />
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full gap-3">
                <div
                  className={`px-5 py-1.5 rounded-xl text-white text-[16px] font-bold ${
                    actualResult === "red" ? "bg-red-500" : "bg-blue-500"
                  }`}
                >
                  {actualResult === "red" ? "빨간약" : "파란약"}
                </div>
                <span
                  className={`text-[15px] font-bold ${
                    feedback === "정답!"
                      ? "text-[var(--success)]"
                      : feedback === "시간 초과"
                        ? "text-[var(--warning)]"
                        : "text-[var(--danger)]"
                  }`}
                >
                  {feedback}
                </span>
              </div>
            )}
          </div>

          {/* COMBO GRID — centered in remaining space */}
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="grid grid-cols-2 gap-3 w-full max-w-[280px]">
              {currentCombo.grid.map((hasHerb, idx) => (
                <div
                  key={idx}
                  className={`aspect-square rounded-2xl flex items-center justify-center text-[44px] ${
                    hasHerb ? "bg-green-50 border-2 border-green-200" : "bg-[var(--gray-100)] border-2 border-[var(--gray-200)]"
                  }`}
                >
                  {hasHerb ? HERBS[idx] : ""}
                </div>
              ))}
            </div>
          </div>

          {/* COMPACT HISTORY */}
          {history.length > 0 && (
            <div className="mt-3 pt-3 border-t border-[var(--gray-200)]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[12px] font-semibold text-[var(--gray-500)]">
                  최근 기록
                </span>
                <span className="text-[11px] text-[var(--gray-400)]">
                  정답 {score}/{history.length}
                </span>
              </div>
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {history
                  .slice(-10)
                  .reverse()
                  .map((h, idx) => (
                    <div
                      key={idx}
                      className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-[14px] ${
                        h.timeout
                          ? "bg-orange-100"
                          : h.correct
                            ? "bg-green-100"
                            : "bg-red-100"
                      }`}
                    >
                      {h.timeout ? "⏱" : h.correct ? "✓" : "✗"}
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* FIXED BOTTOM BUTTONS */}
        <div className="pointer-events-none fixed bottom-[88px] left-1/2 w-full max-w-[640px] h-12 -translate-x-1/2 bg-gradient-to-t from-white to-transparent z-40" />
        <div className="fixed bottom-0 left-1/2 w-full max-w-[640px] -translate-x-1/2 bg-white px-5 pb-8 pt-3 border-t border-[var(--gray-200)] z-50">
          {!showResult ? (
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => submitPrediction("blue")}
                className="py-4 rounded-2xl bg-blue-500 text-white text-[16px] font-bold transition-transform active:scale-[0.97]"
              >
                파란약
              </button>
              <button
                onClick={() => submitPrediction("red")}
                className="py-4 rounded-2xl bg-red-500 text-white text-[16px] font-bold transition-transform active:scale-[0.97]"
              >
                빨간약
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div className="py-4 rounded-2xl bg-blue-200 text-blue-400 text-[16px] font-bold text-center">
                파란약
              </div>
              <div className="py-4 rounded-2xl bg-red-200 text-red-400 text-[16px] font-bold text-center">
                빨간약
              </div>
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  // ─── RESULT ────────────────────────────
  const passed = score >= passScore;
  const grade =
    accuracy >= 85 ? "탁월" : accuracy >= 75 ? "우수" : accuracy >= 65 ? "합격" : "불합격";

  return (
    <motion.div
      className="flex flex-col bg-white min-h-dvh"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
    >
      <div className="px-6 pt-8 pb-[180px]">
        <div className="text-center">
          <div className="w-24 h-24 mx-auto mb-4">
            <LottieAnimation
              src="/lottie/Trophy.json"
              className="w-full h-full"
            />
          </div>

          <h2 className="text-[24px] font-extrabold text-[var(--gray-900)]">
            게임 완료!
          </h2>

          <div className="mt-4">
            <div className="text-[48px] font-extrabold text-[var(--blue-primary)]">
              {score} / {maxRounds}
            </div>
            <div className="text-[16px] text-[var(--gray-500)]">
              정확도 {accuracy}%
            </div>
          </div>

          <div
            className={`mt-4 inline-block px-6 py-2.5 rounded-xl text-[18px] font-bold text-white ${
              passed ? "bg-[var(--success)]" : "bg-[var(--danger)]"
            }`}
          >
            {passed ? "✓ " : "✗ "}
            {grade}
          </div>

          <p className="mt-3 text-[12px] text-[var(--gray-400)]">
            합격 기준: {passScore}점({65}%) 이상 · 랜덤 기대값: {Math.round(maxRounds * 0.5)}점
          </p>
        </div>

        {/* HISTORY */}
        <div className="mt-6 rounded-2xl bg-[var(--gray-100)] p-4">
          <h3 className="text-[13px] font-bold text-[var(--gray-800)] mb-3">
            전체 결과
          </h3>
          <div className="max-h-[240px] overflow-y-auto space-y-1.5">
            {history.map((h, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between py-2 px-3 bg-white rounded-lg"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[12px] font-bold text-[var(--gray-400)] w-6">
                    #{idx + 1}
                  </span>
                  <div className="flex gap-0.5">
                    {h.combo.grid.map((has, i) => (
                      <div
                        key={i}
                        className={`w-5 h-5 rounded text-[10px] flex items-center justify-center ${
                          has ? "bg-green-100" : "bg-gray-200"
                        }`}
                      >
                        {has ? HERBS[i] : ""}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                      h.result === "red"
                        ? "bg-red-100 text-red-700"
                        : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {h.result === "red" ? "빨강" : "파랑"}
                  </span>
                  <span
                    className={`text-[14px] font-bold ${
                      h.timeout
                        ? "text-[var(--warning)]"
                        : h.correct
                          ? "text-[var(--success)]"
                          : "text-[var(--danger)]"
                    }`}
                  >
                    {h.timeout ? "⏱" : h.correct ? "✓" : "✗"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* FUNNEL CTA */}
        <div className="mt-6 rounded-3xl bg-[var(--gray-900)] px-6 py-7 text-center">
          <h3 className="text-[18px] font-extrabold text-white leading-[1.3] tracking-tight">
            추론력은<br />면접 상황판단의 핵심이에요
          </h3>
          <p className="mt-2 text-[13px] text-[var(--gray-400)] font-medium">
            AI 모의 면접으로 실전 감각도 키워보세요
          </p>
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => {
                posthog.capture("aitest_potion_funnel_interview");
                router.push("/resume");
              }}
              className="flex-1 rounded-2xl bg-white py-[14px] text-[15px] font-bold text-[var(--gray-900)] transition-transform active:scale-[0.98]"
            >
              면접관 4명과 면접
            </button>
            <button
              onClick={() => {
                posthog.capture("aitest_potion_funnel_jasoseo");
                router.push("/jasoseo");
              }}
              className="flex-1 rounded-2xl bg-white/20 py-[14px] text-[15px] font-bold text-white border border-white/30 transition-transform active:scale-[0.98]"
            >
              5가지 서류 준비
            </button>
          </div>
        </div>
      </div>

      {/* FIXED BOTTOM */}
      <div className="pointer-events-none fixed bottom-[88px] left-1/2 w-full max-w-[640px] h-12 -translate-x-1/2 bg-gradient-to-t from-white to-transparent z-40" />
      <div className="fixed bottom-0 left-1/2 w-full max-w-[640px] -translate-x-1/2 bg-white px-5 pb-8 pt-3 border-t border-[var(--gray-200)] z-50">
        <div className="flex gap-2">
          <button
            onClick={resetGame}
            className="flex-1 rounded-2xl bg-[var(--blue-primary)] py-[14px] text-[16px] font-bold text-white transition-transform active:scale-[0.98]"
          >
            다시 하기
          </button>
          <button
            onClick={() => router.push("/aitest")}
            className="flex-1 rounded-2xl bg-[var(--gray-100)] py-[14px] text-[16px] font-bold text-[var(--gray-700)] transition-transform active:scale-[0.98]"
          >
            다른 검사 보기
          </button>
        </div>
      </div>
    </motion.div>
  );
}

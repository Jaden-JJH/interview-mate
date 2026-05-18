// N-Back 도형 기억력 게임 — 작업기억 훈련, 모바일 퍼스트, 터치 조작
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import posthog from "posthog-js";
import LottieAnimation from "@/components/LottieAnimation";

const SHAPE_GROUPS = [
  [
    { id: "triangle", name: "삼각형", symbol: "▲" },
    { id: "circle", name: "원", symbol: "●" },
    { id: "square", name: "사각형", symbol: "■" },
  ],
  [
    { id: "trapezoid", name: "사다리꼴", symbol: "▼" },
    { id: "hourglass", name: "모래시계", symbol: "⧗" },
    { id: "diamond", name: "다이아몬드", symbol: "♦" },
  ],
  [
    { id: "rotated-diamond", name: "회전 다이아몬드", symbol: "◆" },
    { id: "butterfly", name: "나비", symbol: "⌘" },
    { id: "star", name: "별", symbol: "★" },
  ],
  [
    { id: "checkerboard", name: "체크보드", symbol: "▣" },
    { id: "double-down-triangle", name: "이중 역삼각형", symbol: "▽" },
    { id: "pyramid", name: "피라미드", symbol: "△" },
  ],
  [
    { id: "arrow-double", name: "이중 화살표", symbol: "⇈" },
    { id: "x-shape", name: "X 모양", symbol: "✕" },
    { id: "crown", name: "왕관", symbol: "♔" },
  ],
];

const ALL_SHAPES = SHAPE_GROUPS.flat();

type Shape = { id: string; name: string; symbol: string };
type GameState = "setup" | "playing" | "finished";

export default function NBackGame() {
  const router = useRouter();

  const [gameState, setGameState] = useState<GameState>("setup");
  const [nBackLevel, setNBackLevel] = useState(2);
  const [selectedGroupIndex, setSelectedGroupIndex] = useState(0);
  const [useAllShapes, setUseAllShapes] = useState(false);
  const [useRandomGroup, setUseRandomGroup] = useState(false);
  const [totalQuestions, setTotalQuestions] = useState(20);
  const [displayTime, setDisplayTime] = useState(3000);
  const [intervalTime, setIntervalTime] = useState(500);
  const [showHistory, setShowHistory] = useState(true);
  const [showHints, setShowHints] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [actualShapes, setActualShapes] = useState<Shape[]>(SHAPE_GROUPS[0]);
  const [currentTrial, setCurrentTrial] = useState(0);
  const [shapeHistory, setShapeHistory] = useState<Shape[]>([]);
  const [currentShape, setCurrentShape] = useState<Shape | null>(null);
  const [score, setScore] = useState(0);
  const [totalTrials, setTotalTrials] = useState(0);
  const [streak, setStreak] = useState(0);
  const [isShowingShape, setIsShowingShape] = useState(false);
  const [userAnswer, setUserAnswer] = useState<string | null>(null);
  const [timerProgress, setTimerProgress] = useState(0);
  const [isInInterval, setIsInInterval] = useState(false);

  const gameTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const userAnswerRef = useRef<string | null>(null);
  const trialRef = useRef(0);
  const historyRef = useRef<Shape[]>([]);
  const totalQuestionsRef = useRef(totalQuestions);

  useEffect(() => {
    totalQuestionsRef.current = totalQuestions;
  }, [totalQuestions]);

  const getNextShape = useCallback(
    (history: Shape[], shapes: Shape[]) => {
      const last = history[history.length - 1];
      const secondLast = history[history.length - 2];
      if (last && secondLast && last.id === secondLast.id) {
        const diff = shapes.filter((s) => s.id !== last.id);
        return diff[Math.floor(Math.random() * diff.length)];
      }
      return shapes[Math.floor(Math.random() * shapes.length)];
    },
    []
  );

  const showNextTrial = useCallback(() => {
    const newTrial = trialRef.current + 1;
    trialRef.current = newTrial;
    setCurrentTrial(newTrial);

    const nextShape = getNextShape(historyRef.current, actualShapes);
    const newHistory = [...historyRef.current, nextShape];
    historyRef.current = newHistory;
    setShapeHistory(newHistory);
    setCurrentShape(nextShape);
    setUserAnswer(null);
    userAnswerRef.current = null;
    setIsShowingShape(true);
    setIsInInterval(false);
    setTimerProgress(0);

    const startTime = Date.now();
    progressTimer.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min((elapsed / displayTime) * 100, 100);
      setTimerProgress(progress);
      if (progress >= 100 && progressTimer.current) {
        clearInterval(progressTimer.current);
      }
    }, 16);

    gameTimer.current = setTimeout(() => {
      setIsShowingShape(false);
      setTimerProgress(100);
      if (progressTimer.current) clearInterval(progressTimer.current);

      const userResponse = userAnswerRef.current || "timeout";
      let expectedResponse = "none";
      const hist = historyRef.current;
      const trial = trialRef.current;

      if (nBackLevel === 2) {
        if (trial >= 3) {
          const curr = hist[trial - 1];
          const twoBack = hist[trial - 3];
          expectedResponse = curr?.id === twoBack?.id ? "2back" : "none";
        }
      } else {
        if (trial >= 3) {
          const curr = hist[trial - 1];
          const twoBack = hist[trial - 3];
          const threeBack = trial >= 4 ? hist[trial - 4] : null;
          if (threeBack && curr?.id === threeBack.id) {
            expectedResponse = "3back";
          } else if (curr?.id === twoBack?.id) {
            expectedResponse = "2back";
          } else {
            expectedResponse = "none";
          }
        }
      }

      if (trial >= 3) {
        const isCorrect =
          userResponse !== "timeout" && userResponse === expectedResponse;
        setTotalTrials((p) => p + 1);
        if (isCorrect) {
          setScore((p) => p + 1);
          setStreak((p) => p + 1);
        } else {
          setStreak(0);
        }
      }

      if (trial < totalQuestionsRef.current) {
        setIsInInterval(true);
        setTimeout(() => showNextTrial(), intervalTime);
      } else {
        setGameState("finished");
      }
    }, displayTime);
  }, [displayTime, intervalTime, nBackLevel, actualShapes, getNextShape]);

  const handleAnswer = useCallback(
    (answer: string) => {
      if (!isShowingShape || gameState !== "playing" || userAnswer !== null)
        return;
      setUserAnswer(answer);
      userAnswerRef.current = answer;
    },
    [isShowingShape, gameState, userAnswer]
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (gameState !== "playing" || !isShowingShape || userAnswer !== null)
        return;
      if (e.code === "Space") {
        e.preventDefault();
        handleAnswer("none");
      } else if (e.code === "ArrowLeft") {
        handleAnswer("2back");
      } else if (e.code === "ArrowRight" && nBackLevel === 3) {
        handleAnswer("3back");
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [handleAnswer, gameState, isShowingShape, userAnswer, nBackLevel]);

  const startGame = () => {
    let shapes: Shape[];
    if (useAllShapes) {
      shapes = ALL_SHAPES;
    } else if (useRandomGroup) {
      const idx = Math.floor(Math.random() * SHAPE_GROUPS.length);
      shapes = SHAPE_GROUPS[idx];
    } else {
      shapes = SHAPE_GROUPS[selectedGroupIndex];
    }
    setActualShapes(shapes);

    trialRef.current = 0;
    historyRef.current = [];
    setGameState("playing");
    setCurrentTrial(0);
    setShapeHistory([]);
    setScore(0);
    setTotalTrials(0);
    setStreak(0);
    setUserAnswer(null);
    userAnswerRef.current = null;
    setIsShowingShape(false);
    setIsInInterval(false);
    setTimerProgress(0);

    if (gameTimer.current) clearTimeout(gameTimer.current);
    if (progressTimer.current) clearInterval(progressTimer.current);

    posthog.capture("aitest_nback_start", {
      level: nBackLevel,
      questions: totalQuestions,
      allShapes: useAllShapes,
    });

    setTimeout(() => showNextTrial(), 500);
  };

  const resetGame = () => {
    setGameState("setup");
    userAnswerRef.current = null;
    trialRef.current = 0;
    historyRef.current = [];
    setTimerProgress(0);
    setIsInInterval(false);
    if (gameTimer.current) clearTimeout(gameTimer.current);
    if (progressTimer.current) clearInterval(progressTimer.current);
  };

  useEffect(() => {
    return () => {
      if (gameTimer.current) clearTimeout(gameTimer.current);
      if (progressTimer.current) clearInterval(progressTimer.current);
    };
  }, []);

  const accuracy = totalTrials > 0 ? Math.round((score / totalTrials) * 100) : 0;

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
            N-Back 도형 기억력
          </h1>
          <p className="mt-1 text-[14px] text-[var(--gray-500)] font-medium">
            현재 도형이 N번째 전과 같은지 판단하세요
          </p>

          {/* BASIC: N-Back Level */}
          <div className="mt-6">
            <h3 className="text-[14px] font-bold text-[var(--gray-800)] mb-3">
              난이도
            </h3>
            <div className="flex gap-2">
              {[2, 3].map((level) => (
                <button
                  key={level}
                  onClick={() => setNBackLevel(level)}
                  className={`flex-1 py-3 rounded-xl text-[15px] font-bold transition-all ${
                    nBackLevel === level
                      ? "bg-[var(--blue-primary)] text-white shadow-lg"
                      : "bg-[var(--gray-100)] text-[var(--gray-700)]"
                  }`}
                >
                  {level}-Back
                </button>
              ))}
            </div>
          </div>

          {/* BASIC: Shape mode */}
          <div className="mt-5">
            <h3 className="text-[14px] font-bold text-[var(--gray-800)] mb-3">
              도형 설정
            </h3>
            <div className="flex flex-col gap-2">
              {[
                { key: "group", label: "그룹 선택 (3개)", desc: "5개 그룹 중 1개 선택" },
                { key: "all", label: "전체 도형 (15개)", desc: "모든 도형을 한번에 사용" },
                { key: "random", label: "랜덤 그룹", desc: "무작위 그룹 (모름)" },
              ].map((opt) => {
                const isSelected =
                  opt.key === "all"
                    ? useAllShapes
                    : opt.key === "random"
                      ? useRandomGroup && !useAllShapes
                      : !useAllShapes && !useRandomGroup;
                return (
                  <button
                    key={opt.key}
                    onClick={() => {
                      if (opt.key === "all") {
                        setUseAllShapes(true);
                        setUseRandomGroup(false);
                      } else if (opt.key === "random") {
                        setUseAllShapes(false);
                        setUseRandomGroup(true);
                      } else {
                        setUseAllShapes(false);
                        setUseRandomGroup(false);
                      }
                    }}
                    className={`flex items-center gap-3 rounded-xl border-2 p-3.5 text-left transition-all ${
                      isSelected
                        ? "border-[var(--blue-primary)] bg-[var(--blue-bg)]"
                        : "border-[var(--gray-200)] bg-white"
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        isSelected
                          ? "border-[var(--blue-primary)] bg-[var(--blue-primary)]"
                          : "border-[var(--gray-300)]"
                      }`}
                    >
                      {isSelected && (
                        <div className="w-2 h-2 rounded-full bg-white" />
                      )}
                    </div>
                    <div>
                      <div className="text-[14px] font-semibold text-[var(--gray-900)]">
                        {opt.label}
                      </div>
                      <div className="text-[12px] text-[var(--gray-500)]">
                        {opt.desc}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {!useAllShapes && !useRandomGroup && (
              <div className="mt-3 grid grid-cols-5 gap-1.5">
                {SHAPE_GROUPS.map((group, gi) => (
                  <button
                    key={gi}
                    onClick={() => setSelectedGroupIndex(gi)}
                    className={`rounded-lg border-2 p-2 text-center transition-all ${
                      selectedGroupIndex === gi
                        ? "border-[var(--blue-primary)] bg-[var(--blue-bg)]"
                        : "border-[var(--gray-200)]"
                    }`}
                  >
                    <div className="text-[10px] text-[var(--gray-500)] mb-1">
                      G{gi + 1}
                    </div>
                    <div className="flex justify-center gap-0.5 text-[14px] text-[var(--gray-700)]">
                      {group.map((s) => (
                        <span key={s.id}>{s.symbol}</span>
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ADVANCED TOGGLE */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="mt-5 flex items-center gap-2 text-[13px] font-semibold text-[var(--gray-500)]"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              className={`transition-transform ${showAdvanced ? "rotate-90" : ""}`}
            >
              <path
                d="M5 3l4 4-4 4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            고급 설정
          </button>

          <AnimatePresence>
            {showAdvanced && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <div className="pt-3 space-y-4">
                  <SliderSetting
                    label="문제 수"
                    value={totalQuestions}
                    onChange={setTotalQuestions}
                    min={10}
                    max={100}
                    step={5}
                    format={(v) => `${v}문제`}
                  />
                  <SliderSetting
                    label="도형 표시 시간"
                    value={displayTime}
                    onChange={setDisplayTime}
                    min={500}
                    max={5000}
                    step={100}
                    format={(v) => `${(v / 1000).toFixed(1)}초`}
                  />
                  <SliderSetting
                    label="도형 사이 간격"
                    value={intervalTime}
                    onChange={setIntervalTime}
                    min={0}
                    max={2000}
                    step={100}
                    format={(v) => `${(v / 1000).toFixed(1)}초`}
                  />
                  <div className="flex flex-col gap-2">
                    <ToggleSetting
                      label="이전 도형 기록 표시"
                      checked={showHistory}
                      onChange={setShowHistory}
                    />
                    <ToggleSetting
                      label="비교 대상 강조"
                      checked={showHints}
                      onChange={setShowHints}
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* CONTROLS INFO */}
          <div className="mt-6 rounded-xl bg-[var(--blue-bg)] p-4">
            <h4 className="text-[13px] font-bold text-[var(--blue-primary)] mb-2">
              조작법
            </h4>
            <div className="space-y-1.5 text-[12px] text-[var(--gray-700)]">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-16 h-7 rounded-lg bg-white text-[11px] font-bold text-[var(--gray-500)] border border-[var(--gray-200)]">
                  다름
                </span>
                <span>이전과 다른 도형</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-16 h-7 rounded-lg bg-[var(--blue-primary)] text-[11px] font-bold text-white">
                  2번째 전
                </span>
                <span>2번째 전 도형과 동일</span>
              </div>
              {nBackLevel === 3 && (
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-16 h-7 rounded-lg bg-[#7C5CFF] text-[11px] font-bold text-white">
                    3번째 전
                  </span>
                  <span>3번째 전 도형과 동일</span>
                </div>
              )}
              <p className="text-[11px] text-[var(--gray-400)] pt-1">
                PC: Space(다름) / ←(2번째 전)
                {nBackLevel === 3 ? " / →(3번째 전)" : ""}
              </p>
            </div>
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
  if (gameState === "playing") {
    const historySlice = showHistory
      ? shapeHistory.slice(0, -1).reverse().slice(0, 3)
      : [];

    return (
      <motion.div
        className="flex flex-col bg-white min-h-dvh"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.25 }}
      >
        <div className="px-6 pt-4 pb-[160px] flex flex-col flex-1">
          {/* TOP BAR */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-4">
              <div>
                <div className="text-[10px] text-[var(--gray-400)] font-medium">
                  문항
                </div>
                <div className="text-[16px] font-bold text-[var(--gray-900)]">
                  {currentTrial}/{totalQuestions}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-[var(--gray-400)] font-medium">
                  정답률
                </div>
                <div className="text-[16px] font-bold text-[var(--blue-primary)]">
                  {accuracy}%
                </div>
              </div>
              <div>
                <div className="text-[10px] text-[var(--gray-400)] font-medium">
                  연속
                </div>
                <div className="text-[16px] font-bold text-[var(--success)]">
                  {streak}
                </div>
              </div>
            </div>
            <button
              onClick={resetGame}
              className="text-[13px] text-[var(--gray-500)] font-medium px-3 py-1.5 rounded-lg bg-[var(--gray-100)]"
            >
              나가기
            </button>
          </div>

          {/* TIMER BAR */}
          <div className="w-full bg-[var(--gray-100)] rounded-full h-2 mb-4 overflow-hidden">
            <div
              className="h-2 rounded-full transition-all duration-75 ease-linear bg-gradient-to-r from-[var(--blue-primary)] to-[#5B8DEF]"
              style={{
                width: `${isShowingShape ? timerProgress : 0}%`,
                opacity: isShowingShape ? 1 : 0,
              }}
            />
          </div>

          {/* HISTORY — 3-column grid */}
          {showHistory && (
            <div className="grid grid-cols-3 gap-2 mb-3">
              {[3, 2, 1].map((pos) => {
                const shape = pos <= historySlice.length ? historySlice[pos - 1] : null;
                if (pos > nBackLevel + 1) return null;
                const highlighted =
                  showHints &&
                  ((nBackLevel >= 2 && pos === 2) ||
                    (nBackLevel === 3 && pos === 3));
                const isBlue = highlighted && pos === 2;
                const isPurple = highlighted && pos === 3;
                return (
                  <div
                    key={pos}
                    className={`flex flex-col items-center justify-center rounded-2xl py-3 border-2 ${
                      !shape
                        ? "border-dashed border-[var(--gray-200)] bg-[var(--gray-50)]"
                        : isBlue
                          ? "border-[var(--blue-primary)] bg-[var(--blue-bg)]"
                          : isPurple
                            ? "border-[#7C5CFF] bg-purple-50"
                            : "border-[var(--gray-200)] bg-[var(--gray-100)]"
                    }`}
                  >
                    <span className={`text-[13px] font-bold ${
                      isBlue ? "text-[var(--blue-primary)]" : isPurple ? "text-[#7C5CFF]" : "text-[var(--gray-400)]"
                    }`}>
                      {pos}번째 전
                    </span>
                    <span className="text-[36px] leading-none mt-1">
                      {shape ? shape.symbol : "·"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* CURRENT SHAPE */}
          <div className="flex-1 flex items-center justify-center py-4">
            <div className="w-[260px] h-[260px] rounded-3xl bg-gradient-to-br from-[var(--gray-100)] to-[var(--gray-200)]/50 flex items-center justify-center relative shadow-inner">
              {isShowingShape && currentShape && (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-[96px] leading-none"
                >
                  {currentShape.symbol}
                </motion.div>
              )}
              {isInInterval && (
                <div className="text-[var(--gray-400)] text-[13px] font-medium">
                  준비 중...
                </div>
              )}
              {currentTrial <= 2 && isShowingShape && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-[var(--warning)]/15 text-[var(--warning)] px-4 py-1.5 rounded-full text-[14px] font-bold">
                  연습 문제
                </div>
              )}
              {userAnswer && isShowingShape && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-[var(--success)] text-white px-4 py-1.5 rounded-full text-[12px] font-semibold shadow-lg">
                  응답 완료
                </div>
              )}
            </div>
          </div>

        </div>

        {/* FIXED BOTTOM BUTTONS */}
        <div className="pointer-events-none fixed bottom-[88px] left-1/2 w-full max-w-[640px] h-12 -translate-x-1/2 bg-gradient-to-t from-white to-transparent z-40" />
        <div className="fixed bottom-0 left-1/2 w-full max-w-[640px] -translate-x-1/2 bg-white px-5 pb-8 pt-3 border-t border-[var(--gray-200)] z-50">
          <div className={`grid gap-3 ${nBackLevel === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
            <button
              onClick={() => handleAnswer("2back")}
              disabled={!isShowingShape || userAnswer !== null}
              className="py-4 rounded-2xl bg-[var(--blue-primary)] text-white text-[16px] font-bold transition-all active:scale-[0.97] disabled:opacity-40"
            >
              2번째 전
            </button>
            {nBackLevel === 3 && (
              <button
                onClick={() => handleAnswer("3back")}
                disabled={!isShowingShape || userAnswer !== null}
                className="py-4 rounded-2xl bg-[#7C5CFF] text-white text-[16px] font-bold transition-all active:scale-[0.97] disabled:opacity-40"
              >
                3번째 전
              </button>
            )}
            <button
              onClick={() => handleAnswer("none")}
              disabled={!isShowingShape || userAnswer !== null}
              className="py-4 rounded-2xl bg-[var(--gray-900)] text-white text-[16px] font-bold transition-all active:scale-[0.97] disabled:opacity-40"
            >
              다름
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  // ─── FINISHED ──────────────────────────
  return (
    <motion.div
      className="flex flex-col bg-white min-h-dvh"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
    >
      <div className="px-6 pt-8 pb-[180px] flex flex-col items-center">
        <div className="w-24 h-24 mb-4">
          <LottieAnimation
            src="/lottie/Trophy.json"
            className="w-full h-full"
          />
        </div>

        <h2 className="text-[24px] font-extrabold text-[var(--gray-900)]">
          게임 완료!
        </h2>

        <div className="mt-6 w-full grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-[var(--blue-bg)] p-5 text-center">
            <div className="text-[12px] text-[var(--blue-primary)] font-semibold">
              최종 점수
            </div>
            <div className="mt-1 text-[28px] font-extrabold text-[var(--blue-primary)]">
              {score}/{totalTrials}
            </div>
          </div>
          <div className="rounded-2xl bg-emerald-50 p-5 text-center">
            <div className="text-[12px] text-[var(--success)] font-semibold">
              정답률
            </div>
            <div className="mt-1 text-[28px] font-extrabold text-[var(--success)]">
              {accuracy}%
            </div>
          </div>
        </div>

        <div className="mt-4 w-full rounded-2xl bg-[var(--gray-100)] p-4 text-center">
          <div className="text-[13px] text-[var(--gray-500)]">
            {accuracy >= 80
              ? "우수한 작업기억력입니다!"
              : accuracy >= 60
                ? "양호한 수준이에요. 반복 훈련으로 더 향상할 수 있어요."
                : "꾸준히 연습하면 빠르게 향상됩니다!"}
          </div>
        </div>

        {/* FUNNEL CTA */}
        <div className="mt-6 w-full rounded-3xl bg-[var(--gray-900)] px-6 py-7 text-center">
          <h3 className="text-[18px] font-extrabold text-white leading-[1.3] tracking-tight">
            작업기억력은<br />면접 답변 구성의 핵심이에요
          </h3>
          <p className="mt-2 text-[13px] text-[var(--gray-400)] font-medium">
            AI 모의 면접으로 실전 감각도 키워보세요
          </p>
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => {
                posthog.capture("aitest_nback_funnel_interview");
                router.push("/resume");
              }}
              className="flex-1 rounded-2xl bg-white py-[14px] text-[15px] font-bold text-[var(--gray-900)] transition-transform active:scale-[0.98]"
            >
              면접관 4명과 면접
            </button>
            <button
              onClick={() => {
                posthog.capture("aitest_nback_funnel_jasoseo");
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

function SliderSetting({
  label,
  value,
  onChange,
  min,
  max,
  step,
  format,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
}) {
  return (
    <div>
      <div className="flex justify-between mb-1.5">
        <span className="text-[13px] text-[var(--gray-700)]">{label}</span>
        <span className="text-[13px] font-semibold text-[var(--gray-900)]">
          {format(value)}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-full h-1.5 bg-[var(--gray-200)] rounded-lg appearance-none cursor-pointer accent-[var(--blue-primary)]"
      />
    </div>
  );
}

function ToggleSetting({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between cursor-pointer py-1">
      <span className="text-[13px] text-[var(--gray-700)]">{label}</span>
      <div
        className={`relative w-10 h-5.5 rounded-full transition-colors ${
          checked ? "bg-[var(--blue-primary)]" : "bg-[var(--gray-300)]"
        }`}
        onClick={() => onChange(!checked)}
      >
        <div
          className={`absolute top-0.5 w-4.5 h-4.5 rounded-full bg-white shadow transition-all ${
            checked ? "left-[22px]" : "left-0.5"
          }`}
        />
      </div>
    </label>
  );
}

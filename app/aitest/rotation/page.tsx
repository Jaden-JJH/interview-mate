// 도형 회전 공간지각 게임 — Canvas 기반 행렬 변환, 모바일 퍼스트 세로 레이아웃
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import posthog from "posthog-js";
import LottieAnimation from "@/components/LottieAnimation";

type Mat = [number, number, number, number];
type Op = "rotate-left" | "rotate-right" | "flip-h" | "flip-v";

const mul = (A: Mat, B: Mat): Mat => [
  A[0] * B[0] + A[2] * B[1],
  A[1] * B[0] + A[3] * B[1],
  A[0] * B[2] + A[2] * B[3],
  A[1] * B[2] + A[3] * B[3],
];
const Rdeg = (k: number): Mat => {
  const rad = (k * 45 * Math.PI) / 180;
  return [Math.cos(rad), -Math.sin(rad), Math.sin(rad), Math.cos(rad)];
};
const FH = (): Mat => [-1, 0, 0, 1];
const FV = (): Mat => [1, 0, 0, -1];

function applyOp(M: Mat, op: Op): Mat {
  switch (op) {
    case "rotate-right":
      return mul(M, Rdeg(1));
    case "rotate-left":
      return mul(M, Rdeg(-1));
    case "flip-h":
      return mul(M, FH());
    case "flip-v":
      return mul(M, FV());
  }
}

const ALPHABETS = ["R", "P", "Q", "F"];
const GRID_LINE_WIDTH = 1.5;

type Pattern = number[][];

function drawPattern(
  ctx: CanvasRenderingContext2D,
  pattern: Pattern,
  size: number
) {
  const cell = size / 4;
  ctx.fillStyle = "#888";
  for (let i = 0; i < 4; i++)
    for (let j = 0; j < 4; j++)
      if (pattern[i][j])
        ctx.fillRect(j * cell - size / 2, i * cell - size / 2, cell, cell);
  ctx.strokeStyle = "#333";
  ctx.lineWidth = GRID_LINE_WIDTH;
  for (let i = 0; i <= 4; i++) {
    ctx.beginPath();
    ctx.moveTo(-size / 2, i * cell - size / 2);
    ctx.lineTo(size / 2, i * cell - size / 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(i * cell - size / 2, -size / 2);
    ctx.lineTo(i * cell - size / 2, size / 2);
    ctx.stroke();
  }
}

function drawAlphabet(ctx: CanvasRenderingContext2D, ch: string) {
  ctx.fillStyle = "#333";
  ctx.font = "bold 100px Pretendard Variable, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(ch, 0, 8);
}

function renderTo(
  canvas: HTMLCanvasElement,
  symbol: string | Pattern,
  M: Mat,
  isPattern: boolean,
  canvasSize: number,
  scale: number
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  canvas.width = canvas.height = canvasSize;
  ctx.clearRect(0, 0, canvasSize, canvasSize);
  ctx.save();
  ctx.translate(canvasSize / 2, canvasSize / 2);
  ctx.scale(scale, scale);
  ctx.transform(M[0], M[2], M[1], M[3], 0, 0);
  if (isPattern) drawPattern(ctx, symbol as Pattern, 160);
  else drawAlphabet(ctx, symbol as string);
  ctx.restore();
}

function equalByPixels(
  symbol: string | Pattern,
  isPattern: boolean,
  M1: Mat,
  M2: Mat
): boolean {
  const s = 200;
  const c1 = document.createElement("canvas");
  const c2 = document.createElement("canvas");
  c1.width = c1.height = c2.width = c2.height = s;
  const ctx1 = c1.getContext("2d")!;
  const ctx2 = c2.getContext("2d")!;
  for (const c of [ctx1, ctx2]) {
    c.fillStyle = "#fff";
    c.fillRect(0, 0, s, s);
  }
  for (const [ctx, M] of [
    [ctx1, M1],
    [ctx2, M2],
  ] as [CanvasRenderingContext2D, Mat][]) {
    ctx.save();
    ctx.translate(s / 2, s / 2);
    ctx.transform(M[0], M[2], M[1], M[3], 0, 0);
    if (isPattern) drawPattern(ctx, symbol as Pattern, 160);
    else drawAlphabet(ctx, symbol as string);
    ctx.restore();
  }
  const d1 = ctx1.getImageData(0, 0, s, s).data;
  const d2 = ctx2.getImageData(0, 0, s, s).data;
  let diff = 0;
  for (let i = 0; i < d1.length; i += 4)
    diff +=
      Math.abs(d1[i] - d2[i]) +
      Math.abs(d1[i + 1] - d2[i + 1]) +
      Math.abs(d1[i + 2] - d2[i + 2]);
  return diff / (s * s * 3 * 255) < 0.01;
}

function generateHardPattern(): Pattern {
  function nbs(r: number, c: number) {
    return (
      [
        [r - 1, c],
        [r + 1, c],
        [r, c - 1],
        [r, c + 1],
      ] as [number, number][]
    ).filter(([x, y]) => x >= 0 && x < 4 && y >= 0 && y < 4);
  }
  function isConn(g: Pattern) {
    const ones: [number, number][] = [];
    for (let i = 0; i < 4; i++)
      for (let j = 0; j < 4; j++) if (g[i][j]) ones.push([i, j]);
    if (!ones.length) return false;
    const seen = new Set([ones[0].join(",")]);
    const q = [ones[0]];
    while (q.length) {
      const [r, c] = q.shift()!;
      for (const [nr, nc] of nbs(r, c)) {
        const k = [nr, nc].join(",");
        if (g[nr][nc] && !seen.has(k)) {
          seen.add(k);
          q.push([nr, nc]);
        }
      }
    }
    return seen.size === ones.length;
  }
  for (let t = 0; t < 500; t++) {
    const target = 8 + Math.floor(Math.random() * 5);
    const g = Array.from({ length: 4 }, () => Array(4).fill(0));
    let r = Math.floor(Math.random() * 4);
    let c = Math.floor(Math.random() * 4);
    g[r][c] = 1;
    let cnt = 1;
    while (cnt < target) {
      const nb = nbs(r, c);
      [r, c] = nb[Math.floor(Math.random() * nb.length)];
      if (!g[r][c]) {
        g[r][c] = 1;
        cnt++;
      }
    }
    if (!isConn(g)) continue;
    return g;
  }
  return [
    [1, 0, 1, 0],
    [0, 1, 0, 1],
    [1, 0, 1, 0],
    [0, 1, 0, 1],
  ];
}

function generateProblem(round: number) {
  const isPattern = round === 2;
  const symbol: string | Pattern = isPattern
    ? generateHardPattern()
    : ALPHABETS[Math.floor(Math.random() * ALPHABETS.length)];
  const beforeMat = Rdeg(Math.floor(Math.random() * 8));

  let M = beforeMat;
  const steps = 5 + Math.floor(Math.random() * 4);
  let usedRot = 0;
  let usedFlip = 0;
  let prevOp: Op | null = null;
  const bag: Op[] = [
    "rotate-left",
    "rotate-right",
    "flip-h",
    "flip-v",
    "rotate-left",
    "rotate-right",
  ];

  for (let i = 0; i < steps; i++) {
    let op = bag[Math.floor(Math.random() * bag.length)];
    if (
      (prevOp === "rotate-left" && op === "rotate-right") ||
      (prevOp === "rotate-right" && op === "rotate-left")
    )
      op = Math.random() < 0.5 ? "flip-h" : "flip-v";
    M = applyOp(M, op);
    if (op.startsWith("rotate")) usedRot++;
    else usedFlip++;
    prevOp = op;
  }
  if (usedRot < 2) M = mul(M, Rdeg(Math.random() < 0.5 ? 2 : -2));
  if (usedFlip < 1) M = mul(M, Math.random() < 0.5 ? FH() : FV());

  if (equalByPixels(symbol, isPattern, beforeMat, M)) {
    return generateProblem(round);
  }

  return { symbol, isPattern, beforeMat, afterMat: M };
}

const OP_ICONS: Record<Op, string> = {
  "rotate-left": "↶",
  "rotate-right": "↷",
  "flip-h": "↔",
  "flip-v": "↕",
};
const OP_LABELS: Record<Op, string> = {
  "rotate-left": "왼쪽 45°",
  "rotate-right": "오른쪽 45°",
  "flip-h": "좌우반전",
  "flip-v": "상하반전",
};

const STEP_CANVAS_SIZE = 44;
const STEP_PREVIEW_SCALE = 0.52;

type GameState = "setup" | "playing" | "finished";

export default function RotationGame() {
  const router = useRouter();

  const [gameState, setGameState] = useState<GameState>("setup");
  const [currentRound, setCurrentRound] = useState(1);
  const [currentProblem, setCurrentProblem] = useState(1);
  const [r1Correct, setR1Correct] = useState(0);
  const [r2Correct, setR2Correct] = useState(0);
  const [r1Total, setR1Total] = useState(0);
  const [r2Total, setR2Total] = useState(0);
  const [clickCount, setClickCount] = useState(0);
  const [userSteps, setUserSteps] = useState<Op[]>([]);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [message, setMessage] = useState<{
    text: string;
    type: "success" | "error" | "info";
  } | null>(null);
  const [remainingTime, setRemainingTime] = useState(60);
  const [problem, setProblem] = useState<ReturnType<typeof generateProblem> | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const beforeRef = useRef<HTMLCanvasElement>(null);
  const afterRef = useRef<HTMLCanvasElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stepCanvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);
  const maxClicks = 20;

  const canvasSize = typeof window !== "undefined"
    ? window.innerWidth <= 640
      ? Math.min(Math.floor(window.innerWidth * 0.42), 170)
      : Math.min(window.innerWidth - 48, 280)
    : 160;

  const renderCanvases = useCallback(() => {
    if (!problem || !beforeRef.current || !afterRef.current) return;
    const scale = 0.7;
    renderTo(
      beforeRef.current,
      problem.symbol,
      problem.beforeMat,
      problem.isPattern,
      canvasSize,
      scale
    );
    renderTo(
      afterRef.current,
      problem.symbol,
      problem.afterMat,
      problem.isPattern,
      canvasSize,
      scale
    );
  }, [problem, canvasSize]);

  useEffect(() => {
    renderCanvases();
  }, [renderCanvases]);

  useEffect(() => {
    if (!showPreview || !problem) return;
    for (let i = 0; i < userSteps.length; i++) {
      const canvas = stepCanvasRefs.current[i];
      if (!canvas) continue;
      let M = problem.beforeMat;
      for (let j = 0; j <= i; j++) M = applyOp(M, userSteps[j]);
      const ctx = canvas.getContext("2d");
      if (!ctx) continue;
      canvas.width = canvas.height = STEP_CANVAS_SIZE;
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, STEP_CANVAS_SIZE, STEP_CANVAS_SIZE);
      ctx.save();
      ctx.translate(STEP_CANVAS_SIZE / 2, STEP_CANVAS_SIZE / 2);
      ctx.scale(STEP_PREVIEW_SCALE, STEP_PREVIEW_SCALE);
      ctx.transform(M[0], M[2], M[1], M[3], 0, 0);
      if (problem.isPattern) drawPattern(ctx, problem.symbol as Pattern, 160);
      else drawAlphabet(ctx, problem.symbol as string);
      ctx.restore();
    }
  }, [showPreview, userSteps, problem]);

  const startTimer = useCallback(() => {
    setRemainingTime(60);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setRemainingTime((prev) => {
        if (prev <= 1) {
          endRound();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const endRound = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (currentRound === 1) {
      setR1Total(currentProblem);
      setCurrentRound(2);
      setCurrentProblem(1);
      setClickCount(0);
      setUserSteps([]);
      setHasSubmitted(false);
      setMessage({
        text: `라운드 1 완료! 라운드 2 시작`,
        type: "info",
      });
      setTimeout(() => {
        setMessage(null);
        const p = generateProblem(2);
        setProblem(p);
        startTimer();
      }, 1200);
    } else {
      setR2Total(currentProblem);
      setGameState("finished");
    }
  }, [currentRound, currentProblem, startTimer]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startGame = () => {
    posthog.capture("aitest_rotation_start");
    setGameState("playing");
    setCurrentRound(1);
    setCurrentProblem(1);
    setR1Correct(0);
    setR2Correct(0);
    setR1Total(0);
    setR2Total(0);
    setClickCount(0);
    setUserSteps([]);
    setHasSubmitted(false);
    setMessage(null);
    const p = generateProblem(1);
    setProblem(p);
    setTimeout(() => startTimer(), 100);
  };

  const addOperation = (op: Op) => {
    if (hasSubmitted) {
      setMessage({ text: "이미 제출했습니다", type: "error" });
      return;
    }
    if (clickCount >= maxClicks) {
      setMessage({ text: "클릭 횟수 초과", type: "error" });
      return;
    }
    if (userSteps.length >= 8) {
      setMessage({ text: "최대 8단계", type: "error" });
      return;
    }
    setUserSteps([...userSteps, op]);
    setClickCount((c) => c + 1);
    setMessage(null);
  };

  const deleteLastStep = () => {
    if (hasSubmitted || userSteps.length === 0) return;
    setUserSteps(userSteps.slice(0, -1));
    setClickCount((c) => c + 1);
  };

  const resetSteps = () => {
    if (hasSubmitted) return;
    setUserSteps([]);
    setClickCount((c) => c + 1);
  };

  const submitAnswer = () => {
    if (hasSubmitted || !problem) return;
    setHasSubmitted(true);

    let M = problem.beforeMat;
    for (const op of userSteps) M = applyOp(M, op);

    const ok = equalByPixels(problem.symbol, problem.isPattern, M, problem.afterMat);

    if (ok) {
      if (currentRound === 1) setR1Correct((c) => c + 1);
      else setR2Correct((c) => c + 1);
      setMessage({ text: "정답!", type: "success" });
    } else {
      setMessage({ text: "오답입니다", type: "error" });
    }

    setTimeout(() => {
      setMessage(null);
      setCurrentProblem((p) => p + 1);
      setClickCount(0);
      setUserSteps([]);
      setHasSubmitted(false);
      const p = generateProblem(currentRound);
      setProblem(p);
    }, ok ? 800 : 1500);
  };

  // ─── SETUP ─────────────────────────────
  if (gameState === "setup") {
    return (
      <motion.div
        className="flex min-h-dvh flex-col bg-white"
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
            도형 회전 공간지각
          </h1>
          <p className="mt-1 text-[14px] text-[var(--gray-500)] font-medium">
            회전·반전 변환을 추론하세요
          </p>

          <div className="mt-5 rounded-2xl bg-[var(--gray-100)] p-5">
            <h3 className="text-[14px] font-bold text-[var(--gray-900)] mb-3">
              게임 규칙
            </h3>
            <ul className="space-y-2 text-[13px] text-[var(--gray-700)] leading-[20px]">
              <li className="flex items-start gap-2">
                <span className="text-[var(--blue-primary)] mt-0.5 shrink-0">1.</span>
                &lsquo;전&rsquo; 도형을 변환하여 &lsquo;후&rsquo; 도형과 동일하게 만드세요
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[var(--blue-primary)] mt-0.5 shrink-0">2.</span>
                왼쪽/오른쪽 45° 회전, 좌우/상하 반전 4가지 조작
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[var(--blue-primary)] mt-0.5 shrink-0">3.</span>
                <span>
                  최대 <strong>8단계</strong>, 클릭 <strong>20회</strong> 제한
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[var(--blue-primary)] mt-0.5 shrink-0">4.</span>
                라운드 1: 알파벳 (60초) → 라운드 2: 패턴 (60초)
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[var(--blue-primary)] mt-0.5 shrink-0">5.</span>
                합격: 전체 60% + 각 라운드 50% 이상
              </li>
            </ul>
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
  if (gameState === "playing" && problem) {
    const correct = currentRound === 1 ? r1Correct : r2Correct;

    return (
      <motion.div
        className="flex min-h-dvh flex-col bg-white"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.25 }}
      >
        <div className="px-6 pt-3 pb-[140px] flex flex-col">
          {/* TOP BAR */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3 text-[12px]">
              <span className="font-bold text-[var(--gray-900)]">
                R{currentRound}/2
              </span>
              <span className="text-[var(--gray-500)]">
                문제 {currentProblem}
              </span>
              <span className="text-[var(--success)] font-semibold">
                정답 {correct}
              </span>
            </div>
            <div
              className={`text-[14px] font-bold ${
                remainingTime <= 10 ? "text-[var(--danger)]" : "text-[var(--gray-900)]"
              }`}
            >
              {Math.floor(remainingTime / 60)}:
              {(remainingTime % 60).toString().padStart(2, "0")}
            </div>
          </div>

          {/* TIMER BAR */}
          <div className="w-full bg-[var(--gray-100)] rounded-full h-1.5 mb-3 overflow-hidden">
            <div
              className={`h-1.5 rounded-full transition-all duration-1000 ${
                remainingTime <= 10 ? "bg-[var(--danger)]" : "bg-[var(--blue-primary)]"
              }`}
              style={{ width: `${(remainingTime / 60) * 100}%` }}
            />
          </div>

          {/* CANVASES */}
          <div className="flex flex-col items-center gap-1">
            <div className="text-[14px] font-bold text-[var(--gray-500)]">
              전
            </div>
            <div className="rounded-xl border-2 border-[var(--gray-200)] bg-white p-2">
              <canvas
                ref={beforeRef}
                width={canvasSize}
                height={canvasSize}
                style={{ width: canvasSize, height: canvasSize }}
              />
            </div>

            <div className="text-[20px] text-[var(--success)]">↓</div>

            <div className="text-[14px] font-bold text-[var(--success)]">
              후
            </div>
            <div className="rounded-xl border-2 border-green-200 bg-green-50/50 p-2">
              <canvas
                ref={afterRef}
                width={canvasSize}
                height={canvasSize}
                style={{ width: canvasSize, height: canvasSize }}
              />
            </div>
          </div>

          {/* MESSAGE */}
          {message && (
            <div
              className={`mt-2 text-center py-2 rounded-xl text-[14px] font-bold ${
                message.type === "success"
                  ? "bg-green-50 text-[var(--success)]"
                  : message.type === "info"
                    ? "bg-blue-50 text-[var(--blue-primary)]"
                    : "bg-red-50 text-[var(--danger)]"
              }`}
            >
              {message.text}
            </div>
          )}
        </div>

        {/* FIXED BOTTOM CONTROLS */}
        <div className="pointer-events-none fixed bottom-[88px] left-1/2 w-full max-w-[640px] h-12 -translate-x-1/2 bg-gradient-to-t from-white to-transparent z-40" />
        <div className="fixed bottom-0 left-1/2 w-full max-w-[640px] -translate-x-1/2 bg-white px-5 pb-8 pt-3 border-t border-[var(--gray-200)] z-50">
          {/* OPERATION BUTTONS */}
          <div className="grid grid-cols-4 gap-2">
            {(
              ["rotate-left", "rotate-right", "flip-h", "flip-v"] as Op[]
            ).map((op) => (
              <button
                key={op}
                onClick={() => addOperation(op)}
                className="flex flex-col items-center gap-0.5 py-2 rounded-xl border-2 border-[var(--gray-200)] bg-white active:bg-[var(--gray-100)] transition-colors"
              >
                <span className="text-[18px]">{OP_ICONS[op]}</span>
                <span className="text-[10px] text-[var(--gray-600)] font-medium">
                  {OP_LABELS[op]}
                </span>
              </button>
            ))}
          </div>

          {/* EASY MODE TOGGLE + CLICK COUNT */}
          <div className="mt-2 flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <span className="text-[11px] text-[var(--gray-500)]">과정 미리보기</span>
              <input
                type="checkbox"
                className="sr-only"
                checked={showPreview}
                onChange={(e) => setShowPreview(e.target.checked)}
              />
              <div className={`relative w-8 h-[18px] rounded-full transition-colors duration-200 ${showPreview ? "bg-[var(--blue-primary)]" : "bg-[var(--gray-300)]"}`}>
                <div className={`absolute top-0.5 w-[14px] h-[14px] rounded-full bg-white shadow transition-all duration-200 ${showPreview ? "left-[18px]" : "left-0.5"}`} />
              </div>
              <span className="text-[11px] text-[var(--gray-500)]">쉬움 모드</span>
            </label>
            <div className="text-right shrink-0">
              <div className="text-[10px] text-[var(--gray-400)]">남은 클릭</div>
              <div className="text-[14px] font-bold text-[var(--gray-900)]">
                {maxClicks - clickCount}
              </div>
            </div>
          </div>

          {/* STEPS */}
          {showPreview ? (
            <div className="mt-1.5 grid grid-cols-4 gap-1.5">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className={`relative aspect-square rounded-lg flex items-center justify-center border overflow-hidden ${
                    i < userSteps.length
                      ? "border-[var(--blue-primary)] bg-[var(--blue-bg)]"
                      : "border-[var(--gray-200)] bg-[var(--gray-100)]"
                  }`}
                >
                  <span className="absolute top-0.5 left-1 text-[9px] text-[var(--gray-400)] z-10">{i + 1}</span>
                  {i < userSteps.length ? (
                    <>
                      <canvas
                        ref={(el) => { stepCanvasRefs.current[i] = el; }}
                        width={STEP_CANVAS_SIZE}
                        height={STEP_CANVAS_SIZE}
                        style={{ width: STEP_CANVAS_SIZE, height: STEP_CANVAS_SIZE }}
                      />
                      <span className="absolute bottom-0.5 right-1 text-[11px] font-bold text-[var(--blue-primary)] z-10">
                        {OP_ICONS[userSteps[i]]}
                      </span>
                    </>
                  ) : (
                    <span className="text-[13px] text-[var(--gray-300)]">{i + 1}</span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-1.5 flex gap-1">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className={`w-7 h-7 rounded-md flex items-center justify-center text-[13px] border ${
                    i < userSteps.length
                      ? "border-[var(--blue-primary)] bg-[var(--blue-bg)] font-bold"
                      : "border-[var(--gray-200)] bg-[var(--gray-100)] text-[var(--gray-300)]"
                  }`}
                >
                  {i < userSteps.length ? OP_ICONS[userSteps[i]] : i + 1}
                </div>
              ))}
            </div>
          )}

          {/* UNDO / RESET + SUBMIT */}
          <div className="mt-2 flex gap-2">
            <button
              onClick={deleteLastStep}
              className="py-2.5 px-4 rounded-xl border-2 border-[var(--gray-200)] bg-white text-[13px] font-medium text-[var(--gray-700)] active:bg-[var(--gray-100)]"
            >
              되돌리기
            </button>
            <button
              onClick={resetSteps}
              className="py-2.5 px-4 rounded-xl border-2 border-[var(--gray-200)] bg-white text-[13px] font-medium text-[var(--gray-700)] active:bg-[var(--gray-100)]"
            >
              초기화
            </button>
            <button
              onClick={submitAnswer}
              disabled={hasSubmitted}
              className="flex-1 rounded-2xl bg-[var(--blue-primary)] py-2.5 text-[15px] font-bold text-white transition-transform active:scale-[0.98] disabled:opacity-40"
            >
              제출
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  // ─── FINISHED ──────────────────────────
  const total = r1Correct + r2Correct;
  const probs = r1Total + r2Total;
  const totalPct = probs ? Math.round((total / probs) * 100) : 0;
  const r1Pct = r1Total ? Math.round((r1Correct / r1Total) * 100) : 0;
  const r2Pct = r2Total ? Math.round((r2Correct / r2Total) * 100) : 0;
  const passed = totalPct >= 60 && r1Pct >= 50 && r2Pct >= 50;
  const grade =
    totalPct >= 80 ? "우수" : totalPct >= 70 ? "적정" : totalPct >= 60 ? "보통" : "노력 필요";

  return (
    <motion.div
      className="flex min-h-dvh flex-col bg-white"
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

          <div
            className={`text-[28px] font-extrabold ${
              passed ? "text-[var(--success)]" : "text-[var(--danger)]"
            }`}
          >
            {passed ? "합격" : "불합격"}
          </div>
          <div className="mt-1 text-[18px] font-bold text-[var(--gray-700)]">
            {grade}
          </div>
        </div>

        <div className="mt-6 space-y-2">
          <ResultRow
            label="전체"
            correct={total}
            total={probs}
            pct={totalPct}
          />
          <ResultRow
            label="라운드 1 (알파벳)"
            correct={r1Correct}
            total={r1Total}
            pct={r1Pct}
          />
          <ResultRow
            label="라운드 2 (패턴)"
            correct={r2Correct}
            total={r2Total}
            pct={r2Pct}
          />
        </div>

        <p className="mt-3 text-[11px] text-[var(--gray-400)] text-center">
          합격: 전체 60% + 각 라운드 50% 이상
        </p>

        {/* FUNNEL CTA */}
        <div className="mt-6 rounded-3xl bg-[var(--gray-900)] px-6 py-7 text-center">
          <h3 className="text-[18px] font-extrabold text-white leading-[1.3] tracking-tight">
            공간지각력은<br />문제해결 능력의 기초예요
          </h3>
          <p className="mt-2 text-[13px] text-[var(--gray-400)] font-medium">
            AI 모의 면접으로 실전 감각도 키워보세요
          </p>
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => {
                posthog.capture("aitest_rotation_funnel_interview");
                router.push("/resume");
              }}
              className="flex-1 rounded-2xl bg-white py-[14px] text-[15px] font-bold text-[var(--gray-900)] transition-transform active:scale-[0.98]"
            >
              면접관 4명과 면접
            </button>
            <button
              onClick={() => {
                posthog.capture("aitest_rotation_funnel_jasoseo");
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
            onClick={() => {
              setGameState("setup");
              setR1Correct(0);
              setR2Correct(0);
              setR1Total(0);
              setR2Total(0);
            }}
            className="flex-1 rounded-2xl bg-[var(--blue-primary)] py-[14px] text-[16px] font-bold text-white transition-transform active:scale-[0.98]"
          >
            다시 하기
          </button>
          <button
            onClick={() => router.push("/aitest")}
            className="flex-1 rounded-2xl bg-[var(--gray-900)] py-[14px] text-[16px] font-bold text-white transition-transform active:scale-[0.98]"
          >
            다른 검사 보기
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function ResultRow({
  label,
  correct,
  total,
  pct,
}: {
  label: string;
  correct: number;
  total: number;
  pct: number;
}) {
  return (
    <div className="flex items-center justify-between py-3 px-4 rounded-xl bg-[var(--gray-100)]">
      <span className="text-[13px] text-[var(--gray-700)]">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-[13px] font-bold text-[var(--gray-900)]">
          {correct}/{total}
        </span>
        <span
          className={`text-[12px] font-semibold px-2 py-0.5 rounded-full ${
            pct >= 60
              ? "bg-green-100 text-[var(--success)]"
              : "bg-red-100 text-[var(--danger)]"
          }`}
        >
          {pct}%
        </span>
      </div>
    </div>
  );
}

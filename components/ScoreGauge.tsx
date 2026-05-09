// 면접 점수를 반원형 게이지로 애니메이션 표시하는 SVG 컴포넌트
"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useTransform, animate, useInView } from "framer-motion";

interface ScoreGaugeProps {
  score: number;
  size?: number;
}

const COLOR_DANGER = "#F04452";
const COLOR_AMBER = "#FF8A00";
const COLOR_SUCCESS = "#00B167";

export default function ScoreGauge({ score, size = 180 }: ScoreGaugeProps) {
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const containerRef = useRef<HTMLDivElement>(null);
  const inView = useInView(containerRef, { once: true, margin: "-40px" });
  const hasAnimatedRef = useRef(false);

  const motionScore = useMotionValue(0);
  const dashOffset = useTransform(
    motionScore,
    (v: number) => circumference - (v / 100) * circumference
  );
  const strokeColor = useTransform(
    motionScore,
    [0, 49, 50, 79, 80, 100],
    [COLOR_DANGER, COLOR_DANGER, COLOR_AMBER, COLOR_AMBER, COLOR_SUCCESS, COLOR_SUCCESS]
  );
  const textColor = useTransform(
    motionScore,
    [0, 49, 50, 79, 80, 100],
    [COLOR_DANGER, COLOR_DANGER, COLOR_AMBER, COLOR_AMBER, COLOR_SUCCESS, COLOR_SUCCESS]
  );

  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    if (!inView || hasAnimatedRef.current) return;
    hasAnimatedRef.current = true;
    const controls = animate(motionScore, score, {
      duration: 1.5,
      ease: "easeOut",
      onUpdate: (v) => setDisplayScore(Math.round(v)),
    });
    return controls.stop;
  }, [inView, score, motionScore]);

  return (
    <div
      ref={containerRef}
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--gray-200)"
          strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          style={{ strokeDashoffset: dashOffset }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <motion.span
          className="text-[40px] font-bold leading-none"
          style={{ color: textColor }}
        >
          {displayScore}
        </motion.span>
        <span className="mt-1 text-[13px] text-[var(--gray-400)]">/ 100점</span>
      </div>
    </div>
  );
}

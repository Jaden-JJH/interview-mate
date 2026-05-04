"use client";

import { useEffect, useState } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";

interface ScoreGaugeProps {
  score: number;
  size?: number;
}

function getScoreColor(score: number) {
  if (score >= 80) return "#00B167";
  if (score >= 50) return "#1B64DA";
  return "#F04452";
}

export default function ScoreGauge({ score, size = 180 }: ScoreGaugeProps) {
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const motionScore = useMotionValue(0);
  const dashOffset = useTransform(
    motionScore,
    (v: number) => circumference - (v / 100) * circumference
  );

  const [displayScore, setDisplayScore] = useState(0);
  const color = getScoreColor(score);

  useEffect(() => {
    const controls = animate(motionScore, score, {
      duration: 1.5,
      ease: "easeOut",
      onUpdate: (v) => setDisplayScore(Math.round(v)),
    });
    return controls.stop;
  }, [score, motionScore]);

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
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
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          style={{ strokeDashoffset: dashOffset }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-[40px] font-bold leading-none" style={{ color }}>{displayScore}</span>
        <span className="mt-1 text-[13px] text-[var(--gray-400)]">/ 100점</span>
      </div>
    </div>
  );
}

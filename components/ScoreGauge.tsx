"use client";

import { useEffect, useState } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";

interface ScoreGaugeProps {
  score: number;
  size?: number;
}

function getScoreColor(score: number) {
  if (score >= 80) return { stroke: "#10B981", text: "text-emerald-500" }; // emerald
  if (score >= 50) return { stroke: "#F59E0B", text: "text-amber-500" }; // amber
  return { stroke: "#EF4444", text: "text-red-500" }; // red
}

export default function ScoreGauge({ score, size = 200 }: ScoreGaugeProps) {
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const motionScore = useMotionValue(0);
  const dashOffset = useTransform(
    motionScore,
    (v: number) => circumference - (v / 100) * circumference
  );

  const [displayScore, setDisplayScore] = useState(0);
  const { stroke, text } = getScoreColor(score);

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
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#E5E7EB"
          strokeWidth={strokeWidth}
        />
        {/* Animated progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          style={{ strokeDashoffset: dashOffset }}
        />
      </svg>
      {/* Center text */}
      <div className="absolute flex flex-col items-center">
        <span className={`text-4xl font-bold ${text}`}>{displayScore}점</span>
        <span className="mt-1 text-sm text-gray-400">/ 100</span>
      </div>
    </div>
  );
}

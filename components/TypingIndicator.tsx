// AI 면접관이 답변을 생성 중임을 나타내는 점 깜빡임 타이핑 인디케이터 컴포넌트
"use client";

import LottieAnimation from "@/components/LottieAnimation";
import { motion } from "framer-motion";

interface TypingIndicatorProps {
  aiName?: string;
  aiInitial?: string;
  aiAccentColor?: string;
}

export default function TypingIndicator({
  aiName = "Alex",
  aiInitial,
  aiAccentColor = "var(--blue-primary)",
}: TypingIndicatorProps) {
  const initial = (aiInitial ?? aiName.trim().charAt(0) ?? "A").toUpperCase();

  return (
    <motion.div
      className="mt-3 mb-1 flex justify-start items-end"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div
        className="w-8 h-8 mr-2 shrink-0 rounded-full text-white text-[12px] font-bold flex items-center justify-center shadow-[0_2px_6px_-2px_rgba(0,0,0,0.25)]"
        style={{ backgroundColor: aiAccentColor }}
      >
        {initial}
      </div>
      <div className="flex items-center rounded-[4px_18px_18px_18px] bg-[var(--gray-100)] px-3 py-1">
        <LottieAnimation
          src="/lottie/Loading Dots Blue.json"
          className="w-12 h-8"
        />
      </div>
    </motion.div>
  );
}

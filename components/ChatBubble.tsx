"use client";

import { motion } from "framer-motion";

interface ChatBubbleProps {
  role: "ai" | "user";
  content: string;
  showAvatar?: boolean;
  questionNumber?: number;
  aiName?: string;
  aiInitial?: string;
  aiAccentColor?: string;
}

export default function ChatBubble({
  role,
  content,
  showAvatar = false,
  questionNumber,
  aiName = "Alex",
  aiInitial,
  aiAccentColor = "var(--blue-primary)",
}: ChatBubbleProps) {
  const isAI = role === "ai";
  const initial = (aiInitial ?? aiName.trim().charAt(0) ?? "A").toUpperCase();

  if (!isAI) {
    return (
      <motion.div
        className="flex justify-end mt-3 mb-1"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
      >
        <div className="max-w-[80%] px-4 py-3 text-[14px] leading-[22px] rounded-[18px_4px_18px_18px] bg-[var(--blue-primary)] text-white">
          {content}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className={`flex justify-start ${showAvatar ? "mt-3" : "mt-0"} mb-1`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      <div className="w-8 mr-2 shrink-0 flex justify-start">
        {showAvatar && (
          <div
            className="w-8 h-8 rounded-full text-white text-[12px] font-bold flex items-center justify-center shadow-[0_2px_6px_-2px_rgba(0,0,0,0.25)]"
            style={{ backgroundColor: aiAccentColor }}
          >
            {initial}
          </div>
        )}
      </div>
      <div className="flex flex-col items-start max-w-[78%]">
        {showAvatar && (
          <div className="flex items-baseline gap-1.5 mb-1 px-1">
            <span className="text-[12px] font-bold text-[var(--gray-800)]">
              {aiName}
            </span>
            {questionNumber !== undefined && (
              <span
                className="text-[11px] font-medium"
                style={{ color: aiAccentColor }}
              >
                · 질문 {questionNumber}
              </span>
            )}
          </div>
        )}
        <div
          className={`px-4 py-3 text-[14px] leading-[22px] bg-[var(--gray-100)] text-[var(--gray-900)] ${
            showAvatar ? "rounded-[4px_18px_18px_18px]" : "rounded-[18px]"
          }`}
        >
          {content}
        </div>
      </div>
    </motion.div>
  );
}

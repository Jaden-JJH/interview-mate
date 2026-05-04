"use client";

import { motion } from "framer-motion";

interface ChatBubbleProps {
  role: "ai" | "user";
  content: string;
  showAvatar?: boolean;
  questionNumber?: number;
}

export default function ChatBubble({
  role,
  content,
  showAvatar = false,
  questionNumber,
}: ChatBubbleProps) {
  const isAI = role === "ai";

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
          <div className="w-8 h-8 rounded-full bg-[var(--blue-primary)] text-white text-[12px] font-bold flex items-center justify-center shadow-[0_2px_6px_-2px_rgba(27,100,218,0.45)]">
            A
          </div>
        )}
      </div>
      <div className="flex flex-col items-start max-w-[78%]">
        {showAvatar && (
          <div className="flex items-baseline gap-1.5 mb-1 px-1">
            <span className="text-[12px] font-bold text-[var(--gray-800)]">Alex</span>
            {questionNumber !== undefined && (
              <span className="text-[11px] font-medium text-[var(--blue-primary)]">
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

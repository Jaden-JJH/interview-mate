"use client";

import { motion } from "framer-motion";

interface ChatBubbleProps {
  role: "ai" | "user";
  content: string;
}

export default function ChatBubble({ role, content }: ChatBubbleProps) {
  const isAI = role === "ai";

  return (
    <motion.div
      className={`flex ${isAI ? "justify-start" : "justify-end"} mb-3`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      <div
        className={`max-w-[80%] px-4 py-3 text-[14px] leading-[22px] ${
          isAI
            ? "rounded-[4px_18px_18px_18px] bg-white text-[var(--gray-900)]"
            : "rounded-[18px_4px_18px_18px] bg-[var(--blue-primary)] text-white"
        }`}
      >
        {content}
      </div>
    </motion.div>
  );
}

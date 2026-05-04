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
      className={`flex ${isAI ? "justify-start" : "justify-end"} mb-4`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      {isAI && (
        <div className="mr-2 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm">
          🤖
        </div>
      )}
      <div
        className={`max-w-[80%] px-4 py-3 text-[15px] leading-relaxed ${
          isAI
            ? "rounded-2xl rounded-tl-md bg-gray-100 text-gray-900"
            : "rounded-2xl rounded-tr-md bg-indigo-600 text-white"
        }`}
      >
        {content}
      </div>
    </motion.div>
  );
}

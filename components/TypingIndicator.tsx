"use client";

import { motion } from "framer-motion";

export default function TypingIndicator() {
  return (
    <motion.div
      className="mb-3 flex justify-start"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex items-center gap-1.5 rounded-[4px_18px_18px_18px] bg-white px-5 py-3">
        <span className="typing-dot inline-block h-[6px] w-[6px] rounded-full bg-[var(--gray-300)]" />
        <span className="typing-dot inline-block h-[6px] w-[6px] rounded-full bg-[var(--gray-300)]" />
        <span className="typing-dot inline-block h-[6px] w-[6px] rounded-full bg-[var(--gray-300)]" />
      </div>
    </motion.div>
  );
}

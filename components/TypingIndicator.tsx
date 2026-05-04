"use client";

import { motion } from "framer-motion";

export default function TypingIndicator() {
  return (
    <motion.div
      className="mb-4 flex justify-start"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <div className="mr-2 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm">
        🤖
      </div>
      <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-md bg-gray-100 px-5 py-3">
        <span className="typing-dot inline-block h-2 w-2 rounded-full bg-gray-400" />
        <span className="typing-dot inline-block h-2 w-2 rounded-full bg-gray-400" />
        <span className="typing-dot inline-block h-2 w-2 rounded-full bg-gray-400" />
      </div>
    </motion.div>
  );
}

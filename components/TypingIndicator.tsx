"use client";

import LottieAnimation from "@/components/LottieAnimation";
import { motion } from "framer-motion";

export default function TypingIndicator() {
  return (
    <motion.div
      className="mt-3 mb-1 flex justify-start items-end"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="w-8 h-8 mr-2 shrink-0 rounded-full bg-[var(--blue-primary)] text-white text-[12px] font-bold flex items-center justify-center shadow-[0_2px_6px_-2px_rgba(27,100,218,0.45)]">
        A
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

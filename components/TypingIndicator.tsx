"use client";

import LottieAnimation from "@/components/LottieAnimation";
import { motion } from "framer-motion";

export default function TypingIndicator() {
  return (
    <motion.div
      className="mb-3 flex justify-start"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex items-center rounded-[4px_18px_18px_18px] bg-white px-4 py-1">
        <LottieAnimation
          src="/lottie/Loading Dots Blue.json"
          className="w-12 h-8"
        />
      </div>
    </motion.div>
  );
}

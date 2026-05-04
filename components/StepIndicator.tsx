"use client";

import { motion } from "framer-motion";

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
  label: string;
}

export default function StepIndicator({
  currentStep,
  totalSteps,
  label,
}: StepIndicatorProps) {
  return (
    <div className="flex flex-col items-center gap-3 pt-8 pb-6">
      {/* Dots */}
      <div className="flex items-center gap-2.5">
        {Array.from({ length: totalSteps }, (_, i) => {
          const stepNum = i + 1;
          const isActive = stepNum === currentStep;
          const isCompleted = stepNum < currentStep;

          return (
            <motion.div
              key={i}
              className={`rounded-full transition-colors duration-300 ${
                isActive
                  ? "h-3 w-3 bg-indigo-600"
                  : isCompleted
                  ? "h-3 w-3 bg-indigo-400"
                  : "h-2.5 w-2.5 bg-gray-300"
              }`}
              initial={{ scale: 0.8 }}
              animate={{ scale: isActive ? 1.15 : 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            />
          );
        })}
      </div>
      {/* Label */}
      <span className="text-sm font-medium text-gray-500">
        {currentStep}/{totalSteps} · {label}
      </span>
    </div>
  );
}

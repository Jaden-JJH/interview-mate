"use client";

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
}

export default function StepIndicator({
  currentStep,
  totalSteps,
}: StepIndicatorProps) {
  return (
    <div className="flex gap-1.5 w-full px-5 pt-3 pb-1">
      {Array.from({ length: totalSteps }, (_, i) => {
        const stepNum = i + 1;
        const isActive = stepNum <= currentStep;

        return (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors duration-500 ${
              isActive ? "bg-[var(--blue-primary)]" : "bg-[var(--gray-200)]"
            }`}
          />
        );
      })}
    </div>
  );
}

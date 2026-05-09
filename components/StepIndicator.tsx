// 3단계 플로우의 현재 단계를 시각적 점 막대로 표시하는 진행 표시자 컴포넌트
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

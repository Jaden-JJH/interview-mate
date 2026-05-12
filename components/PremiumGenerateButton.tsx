// 자소서메이트(/jasoseo)로 진입하는 프리미엄 글로우 버튼 컴포넌트
"use client";

import { useRouter } from "next/navigation";

interface PremiumGenerateButtonProps {
  variant?: "card" | "compact";
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
  disabledReason?: string;
}

export default function PremiumGenerateButton({
  variant = "card",
  onClick,
  className = "",
  disabled = false,
  disabledReason,
}: PremiumGenerateButtonProps) {
  const router = useRouter();

  const handleClick = () => {
    if (disabled) return;
    if (onClick) {
      onClick();
      return;
    }
    router.push("/jasoseo");
  };

  const isCompact = variant === "compact";

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        title={disabled ? disabledReason : undefined}
        aria-disabled={disabled}
        className={`group relative inline-flex w-full overflow-hidden rounded-2xl p-[1.5px] focus:outline-none focus:ring-2 focus:ring-[var(--blue-primary)]/30 focus:ring-offset-2 transition-transform ${
          disabled ? "opacity-50 cursor-not-allowed" : "active:scale-[0.99]"
        } ${className}`}
      >
        {/* Animated conic gradient border */}
        <span
          aria-hidden
          className="absolute inset-[-1000%] animate-[premiumSpin_3s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#1B64DA_0%,#7C5CFF_25%,#E2CBFF_50%,#7C5CFF_75%,#1B64DA_100%)]"
        />

        {/* Inner content */}
        <span
          className={`relative inline-flex w-full items-center gap-3 rounded-[14px] bg-[var(--gray-900)] text-left ${
            isCompact ? "px-4 py-3" : "px-5 py-4"
          }`}
        >
          {/* Sparkle icon */}
          <span
            className={`flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#7C5CFF] to-[#1B64DA] ${
              isCompact ? "h-8 w-8" : "h-10 w-10"
            }`}
          >
            <svg
              className={isCompact ? "h-4 w-4" : "h-5 w-5"}
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 3l1.9 4.6L19 9.5l-4 3.9.9 5.6L12 16.4 8.1 19l.9-5.6-4-3.9 5.1-1.9z" />
            </svg>
          </span>

          {/* Text block */}
          <span className="flex flex-1 flex-col">
            <span
              className={`font-bold text-white ${
                isCompact ? "text-[13px]" : "text-[14px]"
              }`}
            >
              면접관이 합격시키는 이력서
            </span>
          </span>

          {/* PREMIUM badge */}
          <span className="shrink-0 rounded-full bg-gradient-to-r from-[#FFD66E] to-[#FF8A00] px-2 py-[3px] text-[9px] font-extrabold tracking-wider text-[var(--gray-900)]">
            PREMIUM
          </span>

          {/* Chevron */}
          <svg
            className="h-4 w-4 shrink-0 text-white/50 transition-transform group-hover:translate-x-0.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 6l6 6-6 6" />
          </svg>
        </span>
      </button>

    </>
  );
}

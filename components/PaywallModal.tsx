// 크레딧 부족 시 Paddle 결제를 유도하는 페이월 모달 컴포넌트
"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useUser } from "@clerk/nextjs";
import { openCheckout } from "@/lib/billing/checkout";

type PaywallReason = "credit" | "ai-assist";

interface PaywallModalProps {
  open: boolean;
  onClose: () => void;
  freeRemaining?: number;
  paidRemaining?: number;
  // What triggered the paywall — drives the headline + first paragraph.
  // Both reasons sell the same 9,900원 / 8회 패키지.
  reason?: PaywallReason;
}

const COPY: Record<PaywallReason, { title: string; body: (free?: number, paid?: number) => string }> = {
  credit: {
    title: "크레딧이 부족해요",
    body: (free, paid) =>
      `크레딧이 부족합니다${
        typeof free === "number" ? ` (남은 무료 ${free}회, 결제 ${paid ?? 0}회)` : ""
      }. 패키지를 구매하면 면접·자소서·경력기술서 등 모든 유료 기능을 이용할 수 있어요.`,
  },
  "ai-assist": {
    title: "AI 도움받기는 무료 1회까지예요",
    body: () =>
      "패키지 구매하면 AI 도움받기를 무제한 사용할 수 있어요.",
  },
};

export default function PaywallModal({
  open,
  onClose,
  freeRemaining,
  paidRemaining,
  reason = "credit",
}: PaywallModalProps) {
  const [mounted, setMounted] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const { user } = useUser();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handlePurchase = async () => {
    if (!user || purchasing) return;
    setPurchasing(true);
    try {
      await openCheckout({
        clerkUserId: user.id,
        email: user.primaryEmailAddress?.emailAddress,
      });
    } finally {
      // overlay가 떠있는 동안에도 버튼은 다시 누를 수 있어야 하므로 즉시 해제
      setPurchasing(false);
    }
  };

  // Rendered via portal to document.body so the backdrop and sheet
  // are anchored to the viewport — framer-motion parents apply
  // `transform`, which would otherwise re-anchor fixed children.
  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop — full viewport so the dim covers everything,
              including space outside the 640px app container. */}
          <motion.div
            className="fixed inset-0 z-50 bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          {/* Sheet wrapper — uses inset-x-0 + flex justify-center instead of
              `left-1/2 -translate-x-1/2`, because framer-motion writes its
              own `transform` on motion.div and overrides Tailwind's translate. */}
          <div className="pointer-events-none fixed inset-0 z-[51] flex items-center justify-center px-4">
            <motion.div
              className="pointer-events-auto w-full max-w-[360px] rounded-2xl bg-white px-5 pt-5 pb-5"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: "spring", damping: 26, stiffness: 320 }}
              onClick={(e) => e.stopPropagation()}
            >
            <h2 className="text-[16px] font-bold text-[var(--gray-900)]">
              {COPY[reason].title}
            </h2>
            <p className="mt-1.5 text-[12px] leading-[18px] text-[var(--gray-600)]">
              {COPY[reason].body(freeRemaining, paidRemaining)}
            </p>

            <div className="mt-4 rounded-xl border border-[var(--gray-200)] px-3.5 py-3">
              <div className="flex items-baseline justify-between">
                <span className="text-[13px] font-semibold text-[var(--gray-900)]">
                  8회 패키지
                </span>
                <span className="text-[16px] font-extrabold text-[var(--blue-primary)]">
                  9,900원
                </span>
              </div>
              <p className="mt-0.5 text-[11px] text-[var(--gray-500)]">
                면접 8회 · AI 도움받기 무제한
              </p>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                onClick={onClose}
                className="flex-1 rounded-xl border border-[var(--gray-200)] bg-white py-2.5 text-[13px] font-semibold text-[var(--gray-700)]"
              >
                닫기
              </button>
              <button
                onClick={handlePurchase}
                disabled={!user || purchasing}
                className="flex-1 rounded-xl bg-[var(--blue-primary)] py-2.5 text-[13px] font-bold text-white transition hover:brightness-110 active:scale-[0.98] disabled:opacity-60"
              >
                {purchasing ? "결제창 여는 중…" : "구매하기"}
              </button>
            </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}

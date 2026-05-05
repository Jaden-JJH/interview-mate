"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";

interface PaywallModalProps {
  open: boolean;
  onClose: () => void;
  freeRemaining?: number;
  paidRemaining?: number;
}

export default function PaywallModal({
  open,
  onClose,
  freeRemaining,
  paidRemaining,
}: PaywallModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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
          <div className="pointer-events-none fixed inset-0 z-[51] flex items-end justify-center sm:items-center">
            <motion.div
              className="pointer-events-auto w-full max-w-[640px] rounded-t-3xl bg-white px-6 pt-7 pb-9 sm:m-4 sm:rounded-3xl"
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              onClick={(e) => e.stopPropagation()}
            >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-gray-200 sm:hidden" />
            <h2 className="text-[18px] font-bold text-[var(--gray-900)]">
              크레딧이 부족해요
            </h2>
            <p className="mt-2 text-[13px] leading-[20px] text-[var(--gray-600)]">
              면접 1회당 1 크레딧이 사용됩니다. 무료 크레딧
              {typeof freeRemaining === "number"
                ? ` (남은 무료 ${freeRemaining}회, 결제 ${paidRemaining ?? 0}회)`
                : ""}
              를 모두 사용하면 패키지를 구매해 이어 사용할 수 있어요.
            </p>

            <div className="mt-5 rounded-2xl border border-[var(--gray-200)] p-4">
              <div className="flex items-baseline justify-between">
                <span className="text-[14px] font-semibold text-[var(--gray-900)]">
                  10회 패키지
                </span>
                <span className="text-[18px] font-extrabold text-[var(--blue-primary)]">
                  9,900원
                </span>
              </div>
              <p className="mt-1 text-[12px] text-[var(--gray-500)]">
                면접 10회 · 사용 전 7일 내 환불 가능
              </p>
            </div>

            <div className="mt-5 flex gap-2">
              <button
                onClick={onClose}
                className="flex-1 rounded-2xl border border-[var(--gray-200)] bg-white py-3 text-[14px] font-semibold text-[var(--gray-700)]"
              >
                닫기
              </button>
              <button
                disabled
                className="flex-1 rounded-2xl bg-[var(--blue-primary)] py-3 text-[14px] font-bold text-white opacity-60"
                title="결제는 곧 출시됩니다"
              >
                구매하기 (준비중)
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

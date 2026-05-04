"use client";

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
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="w-full max-w-[640px] rounded-t-3xl bg-white px-6 pt-7 pb-9 sm:rounded-3xl sm:m-4"
            initial={{ y: 60 }}
            animate={{ y: 0 }}
            exit={{ y: 60 }}
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
        </motion.div>
      )}
    </AnimatePresence>
  );
}

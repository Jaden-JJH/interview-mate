// 오류·알림 메시지를 화면 상단에 잠깐 표시하는 토스트 컴포넌트
"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";

interface ToastProps {
  message: string | null;
  onClose?: () => void;
  onRetry?: () => void;
}

export default function Toast({ message, onClose, onRetry }: ToastProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Rendered via portal to document.body so `position: fixed` is
  // anchored to the viewport — framer-motion parents apply `transform`,
  // which would otherwise re-anchor fixed children to the parent.
  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {message && (
        <div
          className="pointer-events-none fixed inset-x-0 bottom-[110px] z-[200] flex justify-center px-4"
          role="status"
          aria-live="polite"
        >
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.2 }}
            className="pointer-events-auto flex w-full max-w-[480px] items-start gap-3 rounded-2xl bg-[var(--gray-900)] text-white px-4 py-3 shadow-lg"
          >
            <svg
              className="h-5 w-5 flex-shrink-0 text-[var(--danger)] mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v2m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4a2 2 0 00-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z"
              />
            </svg>
            <p className="flex-1 text-[13px] leading-[20px] font-medium">{message}</p>
            <div className="flex items-center gap-2">
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="text-[12px] font-bold text-[var(--blue-light)] hover:opacity-80"
                >
                  재시도
                </button>
              )}
              {onClose && (
                <button
                  onClick={onClose}
                  className="text-[var(--gray-400)] hover:text-white"
                  aria-label="닫기"
                >
                  ✕
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}

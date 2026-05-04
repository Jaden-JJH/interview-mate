"use client";

import { AnimatePresence, motion } from "framer-motion";

interface ToastProps {
  message: string | null;
  onClose?: () => void;
  onRetry?: () => void;
}

export default function Toast({ message, onClose, onRetry }: ToastProps) {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.2 }}
          className="fixed bottom-[110px] left-1/2 -translate-x-1/2 z-[200] w-[calc(100%-32px)] max-w-[480px]"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-start gap-3 rounded-2xl bg-[var(--gray-900)] text-white px-4 py-3 shadow-lg">
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
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

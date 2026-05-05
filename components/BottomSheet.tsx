"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export default function BottomSheet({ isOpen, onClose, title, children }: BottomSheetProps) {
  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black z-[100]"
          />
          {/* Sheet wrapper — uses inset-x-0 + flex justify-center instead of
              `left-1/2 -translate-x-1/2`, because framer-motion writes its
              own `transform` on motion.div and overrides Tailwind's translate. */}
          <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[101] flex justify-center">
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="pointer-events-auto w-full max-w-[640px] bg-white rounded-t-[24px] flex flex-col max-h-[90vh]"
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-12 h-1.5 bg-[var(--gray-200)] rounded-full" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-5 pb-3">
                <h2 className="text-[18px] font-bold text-[var(--gray-900)]">{title}</h2>
                <button onClick={onClose} className="p-2 text-[var(--gray-400)] hover:text-[var(--gray-700)] transition-colors">
                  ✕
                </button>
              </div>

              {/* Content */}
              <div className="px-5 pb-safe overflow-y-auto w-full">
                {children}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

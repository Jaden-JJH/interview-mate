"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface AccordionItemProps {
  questionNumber: number;
  question: string;
  score: number;
  myAnswer: string;
  modelAnswer: string;
  keywords: string[];
  feedback: string;
}

function getScoreStyle(score: number) {
  if (score >= 80) return { bg: "bg-[#E6F7EF]", text: "text-[#00875A]" };
  if (score >= 60) return { bg: "bg-[#E8F0FE]", text: "text-[#1B64DA]" };
  return { bg: "bg-[#FFEAED]", text: "text-[#D6293E]" };
}

export default function AccordionItem({
  questionNumber,
  question,
  score,
  myAnswer,
  modelAnswer,
  keywords,
  feedback,
}: AccordionItemProps) {
  const [isOpen, setIsOpen] = useState(false);
  const badge = getScoreStyle(score);

  return (
    <div className="overflow-hidden rounded-2xl bg-white">
      {/* Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between px-5 py-4 text-left"
      >
        <div className="mr-3 flex-1 min-w-0">
          <p className="text-[14px] font-medium text-[var(--gray-900)] line-clamp-1">
            <span className="text-[var(--gray-400)] mr-1.5">Q{questionNumber}.</span>
            {question}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span
            className={`rounded-lg px-2.5 py-1 text-[13px] font-bold ${badge.bg} ${badge.text}`}
          >
            {score}점
          </span>
          <motion.svg
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="h-4 w-4 text-[var(--gray-400)]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </motion.svg>
        </div>
      </button>

      {/* Expandable */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="space-y-4 border-t border-[var(--gray-200)] px-5 py-4">
              {/* My answer */}
              <div>
                <p className="mb-2 text-[12px] font-semibold text-[var(--gray-400)]">
                  내 답변
                </p>
                <p className="rounded-xl bg-[var(--gray-100)] px-4 py-3 text-[13px] leading-[20px] text-[var(--gray-700)]">
                  {myAnswer}
                </p>
              </div>
              {/* Model answer */}
              <div>
                <p className="mb-2 text-[12px] font-semibold text-[var(--blue-primary)]">
                  모범 답변
                </p>
                <p className="rounded-xl bg-[var(--blue-light)] px-4 py-3 text-[13px] leading-[20px] text-[var(--gray-900)]">
                  {modelAnswer}
                </p>
              </div>
              {/* Keywords */}
              <div>
                <p className="mb-2 text-[12px] font-semibold text-[var(--gray-400)]">
                  핵심 키워드
                </p>
                <div className="flex flex-wrap gap-2">
                  {keywords.map((kw) => (
                    <span
                      key={kw}
                      className="rounded-lg bg-[var(--gray-100)] px-3 py-1.5 text-[12px] font-medium text-[var(--gray-700)]"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
              {/* Feedback */}
              <div>
                <p className="mb-2 text-[12px] font-semibold text-[var(--gray-400)]">
                  피드백
                </p>
                <p className="text-[13px] leading-[20px] text-[var(--gray-700)]">{feedback}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

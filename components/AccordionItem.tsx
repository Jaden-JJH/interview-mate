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

function getScoreBadge(score: number) {
  if (score >= 80)
    return { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" };
  if (score >= 60)
    return { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" };
  return { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" };
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
  const badge = getScoreBadge(score);

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      {/* Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between px-4 py-4 text-left transition-colors hover:bg-gray-50"
      >
        <div className="mr-3 flex-1">
          <span className="text-xs font-semibold text-indigo-500">Q{questionNumber}</span>
          <p className="mt-0.5 text-sm font-medium text-gray-800 line-clamp-1">{question}</p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${badge.bg} ${badge.text} ${badge.border}`}
          >
            {score}점
          </span>
          <motion.svg
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.25 }}
            className="h-4 w-4 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </motion.svg>
        </div>
      </button>

      {/* Expandable content */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="space-y-4 border-t border-gray-100 px-4 py-4">
              {/* My answer */}
              <div>
                <h4 className="mb-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  💬 내 답변
                </h4>
                <p className="rounded-lg bg-gray-50 px-3 py-2.5 text-sm leading-relaxed text-gray-700">
                  {myAnswer}
                </p>
              </div>
              {/* Model answer */}
              <div>
                <h4 className="mb-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  ✅ 모범 답변
                </h4>
                <p className="rounded-lg bg-indigo-50 px-3 py-2.5 text-sm leading-relaxed text-indigo-900">
                  {modelAnswer}
                </p>
              </div>
              {/* Keywords */}
              <div>
                <h4 className="mb-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  🏷 핵심 키워드
                </h4>
                <div className="flex flex-wrap gap-2">
                  {keywords.map((kw) => (
                    <span
                      key={kw}
                      className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-medium text-indigo-700"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
              {/* Detailed feedback */}
              <div>
                <h4 className="mb-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  📝 상세 피드백
                </h4>
                <p className="text-sm leading-relaxed text-gray-700">{feedback}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

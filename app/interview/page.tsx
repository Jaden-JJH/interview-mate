"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import ChatBubble from "@/components/ChatBubble";
import TypingIndicator from "@/components/TypingIndicator";

const DUMMY_QUESTIONS = [
  "자기소개서에 작성하신 프로젝트 경험에 대해 자세히 설명해 주세요.",
  "해당 프로젝트에서 가장 어려웠던 기술적 도전은 무엇이었나요?",
  "팀 내 의견 충돌이 있었을 때 어떻게 해결하셨나요?",
  "이 포지션에 지원하신 이유가 무엇인가요?",
  "5년 후 커리어 목표를 말씀해 주세요.",
];

const PRE_POPULATED: { role: "ai" | "user"; content: string }[] = [
  { role: "ai", content: DUMMY_QUESTIONS[0] },
  {
    role: "user",
    content:
      "B2B SaaS 제품에서 실시간 대시보드 시스템을 구축한 경험이 있습니다. WebSocket과 React Query를 활용해 데이터 갱신 주기를 60% 단축했고, 디자인 시스템을 주도적으로 구축해 컴포넌트 재사용률을 40% 향상시켰습니다.",
  },
  { role: "ai", content: DUMMY_QUESTIONS[1] },
  {
    role: "user",
    content:
      "실시간 데이터 동기화에서 네트워크 지연과 상태 불일치 문제가 가장 어려웠습니다. Optimistic Update 패턴과 에러 바운더리를 도입해 사용자 경험을 크게 개선할 수 있었습니다.",
  },
];

export default function InterviewPage() {
  const router = useRouter();
  const [messages, setMessages] =
    useState<{ role: "ai" | "user"; content: string }[]>(PRE_POPULATED);
  const [typing, setTyping] = useState(true);
  const [input, setInput] = useState("");
  const [questionIndex, setQuestionIndex] = useState(2); // next question to show
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const totalQuestions = DUMMY_QUESTIONS.length;
  const answeredCount = messages.filter((m) => m.role === "user").length;

  // Scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  // Show typing indicator for 3rd question on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { role: "ai", content: DUMMY_QUESTIONS[2] },
      ]);
      setTyping(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text || typing) return;

    // Add user message
    const newMessages = [...messages, { role: "user" as const, content: text }];
    setMessages(newMessages);
    setInput("");
    setTyping(true);

    const nextIdx = questionIndex + 1;

    // Check if we're done
    if (nextIdx >= totalQuestions) {
      // Show typing then navigate
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            role: "ai",
            content:
              "면접이 모두 끝났습니다. 잠시만 기다려 주시면 결과를 분석하겠습니다. 수고하셨습니다! 🎉",
          },
        ]);
        setTyping(false);
        setTimeout(() => {
          router.push("/result");
        }, 1500);
      }, 1000);
    } else {
      // Show next question
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          { role: "ai", content: DUMMY_QUESTIONS[nextIdx] },
        ]);
        setTyping(false);
        setQuestionIndex(nextIdx);
        inputRef.current?.focus();
      }, 1000);
    }
  }, [input, messages, questionIndex, totalQuestions, typing, router]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <motion.div
      className="flex min-h-dvh flex-col"
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.35, ease: "easeInOut" }}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-gray-100 bg-white/80 px-5 py-3 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-gray-800">
            질문{" "}
            <span className="text-indigo-600">
              {Math.min(answeredCount + 1, totalQuestions)}
            </span>
            /{totalQuestions}
          </span>
          {/* Progress bar */}
          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-gray-200">
            <motion.div
              className="h-full rounded-full bg-indigo-600"
              initial={{ width: 0 }}
              animate={{
                width: `${(answeredCount / totalQuestions) * 100}%`,
              }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />
          </div>
        </div>
        <button
          onClick={() => router.push("/result")}
          className="text-sm font-medium text-red-500 hover:text-red-600 transition-colors"
        >
          종료
        </button>
      </div>

      {/* Chat area */}
      <div className="chat-scroll flex-1 overflow-y-auto px-5 py-4">
        {/* Welcome bubble */}
        <div className="mb-6 rounded-2xl bg-indigo-50 px-4 py-3 text-center text-sm text-indigo-700 ring-1 ring-indigo-100">
          면접을 시작합니다. 편하게 답변해 주세요 😊
        </div>

        {messages.map((msg, i) => (
          <ChatBubble key={i} role={msg.role} content={msg.content} />
        ))}
        {typing && <TypingIndicator />}
        <div ref={chatEndRef} />
      </div>

      {/* Bottom input */}
      <div className="border-t border-gray-100 bg-white px-4 py-3">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="답변을 입력하세요..."
            disabled={typing}
            className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-800 placeholder:text-gray-400 focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || typing}
            className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl transition-all ${
              input.trim() && !typing
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-200 hover:bg-indigo-500 active:scale-95"
                : "bg-gray-200 text-gray-400"
            }`}
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
              />
            </svg>
          </button>
        </div>
      </div>
    </motion.div>
  );
}

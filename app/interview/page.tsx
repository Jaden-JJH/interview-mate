"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import ChatBubble from "@/components/ChatBubble";
import TypingIndicator from "@/components/TypingIndicator";
import LottieAnimation from "@/components/LottieAnimation";

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
  const [isRecording, setIsRecording] = useState(false);
  const [questionIndex, setQuestionIndex] = useState(2);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const totalQuestions = DUMMY_QUESTIONS.length;
  const answeredCount = messages.filter((m) => m.role === "user").length;

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

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

    const newMessages = [...messages, { role: "user" as const, content: text }];
    setMessages(newMessages);
    setInput("");
    setTyping(true);

    const nextIdx = questionIndex + 1;

    if (nextIdx >= totalQuestions) {
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          { role: "ai", content: "면접이 모두 끝났습니다. 결과를 분석하고 있어요." },
        ]);
        setTyping(false);
        setTimeout(() => router.push("/result"), 1500);
      }, 1000);
    } else {
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

  const toggleRecording = () => {
    if (isRecording) {
      setIsRecording(false);
    } else {
      setIsRecording(true);
      // Dummy auto-fill after recording simulating STT
      setTimeout(() => {
        setInput("네, 저는 해당 프로젝트에서...");
        setIsRecording(false);
      }, 3000);
    }
  };

  return (
    <motion.div
      className="flex min-h-dvh flex-col bg-[var(--gray-bg)]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between bg-white px-5 py-3 border-b border-[var(--gray-200)]">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-1">
            <svg className="h-5 w-5 text-[var(--gray-900)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="text-[15px] font-bold text-[var(--gray-900)]">면접 진행</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[13px] font-medium text-[var(--gray-500)]">
            {Math.min(answeredCount + 1, totalQuestions)}/{totalQuestions}
          </span>
          <button
            onClick={() => router.push("/result")}
            className="text-[13px] font-medium text-[var(--danger)]"
          >
            종료
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-[var(--gray-200)] shrink-0">
        <motion.div
          className="h-full bg-[var(--blue-primary)]"
          initial={{ width: 0 }}
          animate={{ width: `${(answeredCount / totalQuestions) * 100}%` }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        />
      </div>

      {/* AI Interviewer Avatar Section */}
      <div className="bg-[#1a2b4c] text-white flex flex-col items-center justify-center py-8 shrink-0 relative overflow-hidden shadow-md z-10 min-h-[300px]">
        
        {/* Animated Background Blob */}
        <div className="absolute inset-0 z-0 opacity-80 flex items-center justify-center mix-blend-screen pointer-events-none">
          <LottieAnimation 
            src="/lottie/Fixed Blur.json" 
            className="w-[200%] h-[200%] max-w-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" 
            playing={typing} 
          />
        </div>
        
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#1a2b4c]/90 z-10 pointer-events-none" />

        <div className="relative z-20 flex flex-col items-center justify-center">
          {/* Unbound Large Avatar */}
          <div className="w-48 h-48 flex items-center justify-center pointer-events-none mb-3">
            <LottieAnimation 
              src="/lottie/Talking Character.json" 
              className="w-full h-full scale-[1.3] origin-center" 
              playing={typing}
            />
          </div>
          
          <h2 className="text-[18px] font-bold z-20 drop-shadow-md">수석 채용담당자 Alex</h2>
          <p className="text-[13px] text-white/80 mt-2 z-20 font-medium bg-black/40 px-4 py-1.5 rounded-full backdrop-blur-md">
            {typing ? "질문을 말씀하고 있습니다..." : "당신의 답변을 경청 중입니다"}
          </p>
        </div>
      </div>

      {/* Chat Area (Relative for overlay) */}
      <div className="flex-1 relative flex flex-col min-h-0 bg-white">
        <div className="scroll-area flex-1 overflow-y-auto px-5 pt-4 pb-20">
          {messages.map((msg, i) => (
            <ChatBubble key={i} role={msg.role} content={msg.content} />
          ))}
          {typing && <TypingIndicator />}
          <div ref={chatEndRef} />
        </div>

        {/* Voice Input Overlay */}
        <AnimatePresence>
          {isRecording && (
            <motion.div
              initial={{ opacity: 0, y: "100%" }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="absolute inset-0 z-40 bg-[var(--gray-900)] flex flex-col items-center justify-center pb-10"
            >
              <LottieAnimation src="/lottie/Audio&Voice-A-002.json" className="w-64 h-64" />
              <p className="text-white text-[16px] font-bold mt-2 animate-pulse">
                답변을 편하게 말씀해 주세요...
              </p>
              <p className="text-[var(--gray-400)] text-[13px] mt-2">
                완료되면 하단의 마이크를 다시 눌러주세요
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Floating fade gradient */}
      <div className="pointer-events-none fixed bottom-[68px] left-1/2 w-full max-w-[640px] h-12 -translate-x-1/2 bg-gradient-to-t from-white to-transparent z-40" />

      {/* Input */}
      <div className="bg-white px-4 py-3 border-t border-[var(--gray-200)] relative z-50">
        <div className="flex items-center gap-2">
          {/* Mic Button */}
          <button
            onClick={toggleRecording}
            className={`flex h-[44px] w-[44px] flex-shrink-0 items-center justify-center rounded-full transition-all relative ${
              isRecording 
                ? "bg-red-50 text-red-500" 
                : "bg-[var(--gray-100)] text-[var(--gray-500)] hover:bg-[var(--gray-200)]"
            }`}
          >
            {isRecording && (
              <span className="absolute inset-0 rounded-full animate-ping bg-red-400 opacity-30" />
            )}
            <svg className="h-5 w-5 relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </button>
          
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="답변을 입력하세요"
            disabled={typing}
            className="flex-1 rounded-xl bg-[var(--gray-100)] px-4 py-3 text-[14px] text-[var(--gray-900)] placeholder:text-[var(--gray-400)] focus:outline-none transition-all disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || typing}
            className={`flex h-[44px] w-[44px] flex-shrink-0 items-center justify-center rounded-xl transition-all ${
              input.trim() && !typing
                ? "bg-[var(--blue-primary)] text-white active:scale-95"
                : "bg-[var(--gray-200)] text-[var(--gray-400)]"
            }`}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </motion.div>
  );
}

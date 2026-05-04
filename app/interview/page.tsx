"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import ChatBubble from "@/components/ChatBubble";
import TypingIndicator from "@/components/TypingIndicator";
import LottieAnimation from "@/components/LottieAnimation";
import Toast from "@/components/Toast";
import { useInterview, type QAResult } from "@/contexts/InterviewContext";

const ANALYZING_STEPS = [
  "답변을 수집하고 있어요",
  "키워드와 표현을 살펴보고 있어요",
  "점수를 산출하고 있어요",
];

const TYPING_INTERVAL_MS = 28; // per-char delay for streaming effect

interface ChatMessage {
  role: "ai" | "user";
  content: string;
  questionIndex?: number;
  isStreaming?: boolean;
}

export default function InterviewPage() {
  const router = useRouter();
  const {
    questions,
    resume,
    jobPosting,
    qaResults,
    appendQAResult,
    setOverall,
  } = useInterview();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streamingText, setStreamingText] = useState<string | null>(null);
  const [streamingIndex, setStreamingIndex] = useState<number>(-1);
  const [input, setInput] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzingStep, setAnalyzingStep] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const guardRef = useRef(false);

  const totalQuestions = questions.length;

  // Guard: if no questions, redirect back
  useEffect(() => {
    if (totalQuestions === 0) {
      router.replace("/job-posting");
    }
  }, [totalQuestions, router]);

  // Stream the question at `questionIndex` character-by-character.
  useEffect(() => {
    if (totalQuestions === 0) return;
    if (questionIndex >= totalQuestions) return;
    if (guardRef.current) return;
    guardRef.current = true;

    const text = questions[questionIndex];
    let i = 0;
    setStreamingIndex(questionIndex);
    setStreamingText("");

    const id = setInterval(() => {
      i++;
      setStreamingText(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(id);
        // commit to messages
        setMessages((prev) => [
          ...prev,
          { role: "ai", content: text, questionIndex },
        ]);
        setStreamingText(null);
        setStreamingIndex(-1);
        guardRef.current = false;
        inputRef.current?.focus();
      }
    }, TYPING_INTERVAL_MS);

    return () => {
      clearInterval(id);
      guardRef.current = false;
    };
  }, [questionIndex, questions, totalQuestions]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText, isEvaluating]);

  useEffect(() => {
    if (!isAnalyzing) return;
    const id = setInterval(
      () => setAnalyzingStep((s) => Math.min(s + 1, ANALYZING_STEPS.length - 1)),
      1100
    );
    return () => clearInterval(id);
  }, [isAnalyzing]);

  const finishInterview = useCallback(
    async (results: QAResult[]) => {
      setIsAnalyzing(true);
      setAnalyzingStep(0);
      try {
        const res = await fetch("/api/generate-feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ qaResults: results }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "피드백 생성 실패");
        setOverall(
          Number(data.overallScore) || 0,
          String(data.overallComment ?? "")
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : "피드백 생성 실패";
        const fallbackScore = Math.round(
          results.reduce((sum, r) => sum + r.score, 0) / results.length
        );
        setOverall(
          fallbackScore,
          `종합 코멘트를 생성하지 못했어요(${msg}). 평균 점수는 ${fallbackScore}점입니다.`
        );
      }
      router.push("/result");
    },
    [router, setOverall]
  );

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isEvaluating || streamingText !== null) return;

    const currentQ = questions[questionIndex];
    if (!currentQ) return;

    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setInput("");
    setIsEvaluating(true);
    setErrorMsg(null);

    const jobPostingText = jobPosting
      ? [
          `회사: ${jobPosting.company}`,
          `포지션: ${jobPosting.position}`,
          `자격 요건: ${jobPosting.requirements}`,
          jobPosting.preferredQualifications
            ? `우대사항: ${jobPosting.preferredQualifications}`
            : "",
          `설명: ${jobPosting.description}`,
        ]
          .filter(Boolean)
          .join("\n")
      : "";

    let qa: QAResult;
    try {
      const res = await fetch("/api/evaluate-answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: currentQ,
          answer: text,
          resume,
          jobPosting: jobPostingText,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "평가 실패");
      qa = {
        question: currentQ,
        answer: text,
        score: Number(data.score) || 0,
        feedback: String(data.feedback ?? ""),
        bestAnswer: String(data.bestAnswer ?? ""),
        keywords: Array.isArray(data.keywords) ? data.keywords : [],
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "평가 실패";
      setErrorMsg(msg);
      // Save with score 0 so the flow continues; user-facing message shows the error.
      qa = {
        question: currentQ,
        answer: text,
        score: 0,
        feedback: `자동 평가에 실패했어요 (${msg}).`,
        bestAnswer: "",
        keywords: [],
      };
    }
    appendQAResult(qa);
    const allResults = [...qaResults, qa];
    setIsEvaluating(false);

    const nextIdx = questionIndex + 1;
    if (nextIdx >= totalQuestions) {
      await finishInterview(allResults);
    } else {
      setQuestionIndex(nextIdx);
    }
  }, [
    input,
    isEvaluating,
    streamingText,
    questions,
    questionIndex,
    jobPosting,
    resume,
    appendQAResult,
    qaResults,
    totalQuestions,
    finishInterview,
  ]);

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
      // Browser STT not wired — fallback simulation only.
      setTimeout(() => setIsRecording(false), 3000);
    }
  };

  const answeredCount = qaResults.length;
  const currentDisplayNum = Math.min(answeredCount + 1, totalQuestions);

  return (
    <motion.div
      className="flex min-h-dvh flex-col bg-white"
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
            질문 {currentDisplayNum}/{totalQuestions}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-[var(--gray-200)] shrink-0">
        <motion.div
          className="h-full bg-[var(--blue-primary)]"
          initial={{ width: 0 }}
          animate={{
            width: totalQuestions
              ? `${(answeredCount / totalQuestions) * 100}%`
              : "0%",
          }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        />
      </div>

      {/* AI Interviewer Avatar Section */}
      <div className="bg-[#1a2b4c] text-white flex flex-col items-center justify-center py-8 shrink-0 relative overflow-hidden shadow-md z-10 min-h-[300px]">
        <div className="absolute inset-0 z-0 opacity-80 flex items-center justify-center mix-blend-screen pointer-events-none">
          <LottieAnimation
            src="/lottie/Fixed Blur.json"
            className="w-[200%] h-[200%] max-w-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          />
        </div>

        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#1a2b4c]/40 z-10 pointer-events-none" />

        <div className="relative z-20 flex flex-col items-center justify-center">
          <div className="w-48 h-48 flex items-center justify-center pointer-events-none mb-3">
            <LottieAnimation
              src="/lottie/Talking Character.json"
              className="w-full h-full scale-[1.3] origin-center"
              playing={streamingText !== null}
            />
          </div>

          <h2 className="text-[18px] font-bold z-20 drop-shadow-md">수석 채용담당자 Alex</h2>
          <p className="text-[13px] text-white/80 mt-2 z-20 font-medium bg-black/40 px-4 py-1.5 rounded-full backdrop-blur-md">
            {streamingText !== null
              ? "질문을 말씀하고 있습니다..."
              : isEvaluating
              ? "답변을 평가하고 있어요..."
              : "당신의 답변을 경청 중입니다"}
          </p>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 relative flex flex-col min-h-0 bg-white">
        <div className="scroll-area flex-1 overflow-y-auto px-5 pt-4 pb-20">
          {messages.map((msg, i) => {
            const isAI = msg.role === "ai";
            const showAvatar =
              isAI && (i === 0 || messages[i - 1].role !== "ai");
            return (
              <ChatBubble
                key={i}
                role={msg.role}
                content={msg.content}
                showAvatar={showAvatar}
                questionNumber={
                  isAI && msg.questionIndex !== undefined
                    ? msg.questionIndex + 1
                    : undefined
                }
              />
            );
          })}
          {streamingText !== null && (
            <ChatBubble
              role="ai"
              content={streamingText + "▍"}
              showAvatar={
                messages.length === 0 ||
                messages[messages.length - 1].role !== "ai"
              }
              questionNumber={streamingIndex + 1}
            />
          )}
          {isEvaluating && <TypingIndicator />}
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

      {/* Analyzing overlay */}
      <AnimatePresence>
        {isAnalyzing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="fixed inset-y-0 left-1/2 -translate-x-1/2 w-full max-w-[640px] z-[100] bg-white flex flex-col items-center justify-center px-6"
          >
            <div className="w-44 h-44 flex items-center justify-center">
              <LottieAnimation
                src="/lottie/Sparkles Loop Loader ai.json"
                className="w-full h-full object-contain"
              />
            </div>
            <h2 className="mt-1 text-[20px] font-extrabold text-[var(--gray-900)] tracking-tight text-center">
              AI가 답변을 분석하고 있어요
            </h2>
            <div className="mt-3 h-6 relative w-full max-w-[280px] flex items-center justify-center">
              <AnimatePresence mode="wait">
                <motion.p
                  key={analyzingStep}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.3 }}
                  className="absolute text-[14px] text-[var(--gray-500)] text-center font-medium"
                >
                  {ANALYZING_STEPS[analyzingStep]}
                </motion.p>
              </AnimatePresence>
            </div>
            <div className="mt-6 flex items-center gap-1.5">
              {ANALYZING_STEPS.map((_, i) => (
                <span
                  key={i}
                  className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${
                    i <= analyzingStep
                      ? "bg-[var(--blue-primary)]"
                      : "bg-[var(--gray-200)]"
                  }`}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Toast message={errorMsg} onClose={() => setErrorMsg(null)} />

      {/* Floating fade gradient */}
      <div className="pointer-events-none fixed bottom-[68px] left-1/2 w-full max-w-[640px] h-12 -translate-x-1/2 bg-gradient-to-t from-white to-transparent z-40" />

      {/* Input */}
      <div className="bg-white px-4 py-3 border-t border-[var(--gray-200)] relative z-50">
        <div className="flex items-center gap-2">
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
            placeholder={
              streamingText !== null ? "질문 표시 중..." : "답변을 입력하세요"
            }
            disabled={streamingText !== null || isEvaluating}
            className="flex-1 rounded-xl bg-[var(--gray-100)] px-4 py-3 text-[14px] text-[var(--gray-900)] placeholder:text-[var(--gray-400)] focus:outline-none transition-all disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || streamingText !== null || isEvaluating}
            className={`flex h-[44px] w-[44px] flex-shrink-0 items-center justify-center rounded-xl transition-all ${
              input.trim() && streamingText === null && !isEvaluating
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

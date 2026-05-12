// 면접 진행 페이지 — 카운트다운, 질문·답변 흐름, 꼬리질문, 클로징 질문 처리
"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import posthog from "posthog-js";
import ChatBubble from "@/components/ChatBubble";
import TypingIndicator from "@/components/TypingIndicator";
import LottieAnimation from "@/components/LottieAnimation";
import Toast from "@/components/Toast";
import PaywallModal from "@/components/PaywallModal";
import { useInterview, type QAResult } from "@/contexts/InterviewContext";
import {
  clearProgress,
  loadProgress,
  saveProgress,
} from "@/lib/interviewStorage";
import {
  CLOSING_QUESTION,
  DEFAULT_CHARACTER_LOTTIE,
  resolvePersona,
} from "@/lib/personas";

const ANALYZING_STEPS = [
  "답변을 수집하고 있어요",
  "키워드와 표현을 살펴보고 있어요",
  "점수를 산출하고 있어요",
];

const TYPING_INTERVAL_MS = 28;
const FOLLOW_UP_TIME_THRESHOLD_SEC = 60;

interface QItem {
  text: string;
  isFollowUp: boolean;
  isClosing: boolean;
}

interface ChatMessage {
  role: "ai" | "user";
  content: string;
  questionNumber?: number;
  isFollowUp?: boolean;
  isClosing?: boolean;
}

interface ProgressSnapshot {
  items: QItem[];
  questionIndex: number;
  messages: ChatMessage[];
  secondsLeft: number;
  hasJumpedToClosing: boolean;
}

function formatTime(sec: number): string {
  const safe = Math.max(0, sec);
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function InterviewPage() {
  const router = useRouter();
  const {
    hydrated,
    questions,
    resume,
    jobPosting,
    qaResults,
    appendQAResult,
    setOverall,
    durationMinutes,
    resolvedPersonaId,
  } = useInterview();

  const persona = useMemo(
    () => resolvePersona(resolvedPersonaId),
    [resolvedPersonaId]
  );

  const [items, setItems] = useState<QItem[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streamingText, setStreamingText] = useState<string | null>(null);
  const [streamingIndex, setStreamingIndex] = useState<number>(-1);
  const [input, setInput] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [sttSupported, setSttSupported] = useState(true);
  const [sttUnsupportedMsg, setSttUnsupportedMsg] = useState<string | null>(null);
  const recognitionRef = useRef<unknown>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzingStep, setAnalyzingStep] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(durationMinutes * 60);
  const [hasJumpedToClosing, setHasJumpedToClosing] = useState(false);
  // AI 도움받기 — 모범답안 모드. API 호출 중엔 카운트다운 일시정지,
  // 응답 받으면 비차단 카드로 답변 노출. 카드의 [답변에 옮기기] 버튼을
  // 눌러야 textarea에 채워짐 — 베끼기에 미세한 friction을 주고 답변
  // 주체성을 사용자에게 둔다. 두 번째 호출(무료 1회 소진)은 paywall —
  // 단, 서버가 unlimited=true를 돌려준 유료 사용자는 localStorage
  // 마킹을 건너뛴다.
  const [isAiAssisting, setIsAiAssisting] = useState(false);
  const [showAiAssistPaywall, setShowAiAssistPaywall] = useState(false);
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const aiPauseAtRef = useRef<number | null>(null);
  // Early-finish — lets the user end the interview mid-flow and see
  // results based on whatever QAs have been recorded so far.
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);
  const [portalMounted, setPortalMounted] = useState(false);
  useEffect(() => {
    setPortalMounted(true);
  }, []);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const guardRef = useRef(false);
  const totalSecondsRef = useRef(durationMinutes * 60);
  const startTimeRef = useRef<number | null>(null);
  // Restore flow — when the user lands with a saved in-flight interview,
  // we hold initialization until they pick "이어서" vs "처음부터".
  const [pendingRestore, setPendingRestore] = useState<ProgressSnapshot | null>(
    null
  );
  const [restoreChecked, setRestoreChecked] = useState(false);
  // Skips the next character-by-character stream when we hydrate a question
  // that was already shown before the refresh.
  const skipNextStreamRef = useRef(false);

  const totalQuestions = questions.length;
  const currentItem = items[questionIndex];

  // One-shot restore detection on mount.
  useEffect(() => {
    const saved = loadProgress<ProgressSnapshot>();
    if (
      saved &&
      Array.isArray(saved.items) &&
      saved.items.length > 0 &&
      saved.questionIndex < saved.items.length
    ) {
      setPendingRestore(saved);
    }
    setRestoreChecked(true);
  }, []);

  const applyRestore = useCallback((snap: ProgressSnapshot) => {
    setItems(snap.items);
    setQuestionIndex(snap.questionIndex);
    setMessages(snap.messages);
    setHasJumpedToClosing(snap.hasJumpedToClosing);
    totalSecondsRef.current = Math.max(1, snap.secondsLeft);
    setSecondsLeft(snap.secondsLeft);
    startTimeRef.current = Date.now();
    // If the AI message for the current question is already in messages
    // (typical case — refresh happened mid-answer), don't re-stream it.
    const alreadyShown = snap.messages.some(
      (m) => m.role === "ai" && m.questionNumber === snap.questionIndex + 1
    );
    if (alreadyShown) skipNextStreamRef.current = true;
    setPendingRestore(null);
  }, []);

  const discardRestore = useCallback(() => {
    clearProgress();
    setPendingRestore(null);
  }, []);

  // Guard: redirect if no questions. Wait for context hydration first —
  // on a refresh the questions array is restored asynchronously, and
  // bouncing before that defeats the whole resume-in-flight flow.
  useEffect(() => {
    if (!hydrated) return;
    if (totalQuestions === 0) {
      router.replace("/job-posting");
    }
  }, [hydrated, totalQuestions, router]);

  // Initialize items list with closing appended. Held until the restore
  // check has run (and any pending modal is dismissed) so we don't stomp
  // on a freshly-restored items array.
  useEffect(() => {
    if (!restoreChecked) return;
    if (pendingRestore) return;
    if (totalQuestions === 0) return;
    if (items.length > 0) return;
    const list: QItem[] = questions.map((q) => ({
      text: q,
      isFollowUp: false,
      isClosing: false,
    }));
    list.push({ text: CLOSING_QUESTION, isFollowUp: false, isClosing: true });
    setItems(list);
    totalSecondsRef.current = durationMinutes * 60;
    setSecondsLeft(totalSecondsRef.current);
    startTimeRef.current = Date.now();
  }, [
    questions,
    totalQuestions,
    items.length,
    durationMinutes,
    restoreChecked,
    pendingRestore,
  ]);

  // Countdown timer
  useEffect(() => {
    if (items.length === 0) return;
    if (startTimeRef.current === null) return;
    if (isAnalyzing) return;
    // Pause while AI 도움받기 is generating — startTimeRef is shifted
    // forward on resume so elapsed time picks up where it was.
    if (isAiAssisting) return;
    const id = setInterval(() => {
      const elapsed = Math.floor(
        (Date.now() - (startTimeRef.current ?? Date.now())) / 1000
      );
      setSecondsLeft(Math.max(0, totalSecondsRef.current - elapsed));
    }, 1000);
    return () => clearInterval(id);
  }, [items.length, isAnalyzing, isAiAssisting]);

  // Stream the current question character-by-character
  useEffect(() => {
    if (items.length === 0) return;
    if (questionIndex >= items.length) return;
    if (skipNextStreamRef.current) {
      // Hydrated mid-question — message is already in `messages`, just
      // settle the cursor and let the user keep typing.
      skipNextStreamRef.current = false;
      inputRef.current?.focus();
      return;
    }
    if (guardRef.current) return;
    guardRef.current = true;

    const item = items[questionIndex];
    const text = item.text;
    let i = 0;
    setStreamingIndex(questionIndex);
    setStreamingText("");

    const id = setInterval(() => {
      i++;
      setStreamingText(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(id);
        setMessages((prev) => [
          ...prev,
          {
            role: "ai",
            content: text,
            questionNumber: questionIndex + 1,
            isFollowUp: item.isFollowUp,
            isClosing: item.isClosing,
          },
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
  }, [questionIndex, items]);

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

  // Persist progress on meaningful state changes. We deliberately don't
  // depend on `secondsLeft` (1Hz tick would write every second) — instead
  // a beforeunload handler below grabs the latest tick on tab close. The
  // tradeoff: an idle user who refreshes mid-question keeps the time they
  // had as of the last event (lean user-friendly).
  useEffect(() => {
    if (!restoreChecked || pendingRestore) return;
    if (items.length === 0) return;
    if (isAnalyzing) return;
    saveProgress<ProgressSnapshot>({
      items,
      questionIndex,
      messages,
      secondsLeft,
      hasJumpedToClosing,
    });
    // secondsLeft intentionally read fresh inside, not in deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    items,
    questionIndex,
    messages,
    hasJumpedToClosing,
    restoreChecked,
    pendingRestore,
    isAnalyzing,
  ]);

  // Snapshot the latest secondsLeft on tab close / refresh so the user
  // doesn't get back a stale timer value from the last message event.
  useEffect(() => {
    const handler = () => {
      if (items.length === 0) return;
      saveProgress<ProgressSnapshot>({
        items,
        questionIndex,
        messages,
        secondsLeft,
        hasJumpedToClosing,
      });
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [items, questionIndex, messages, secondsLeft, hasJumpedToClosing]);

  const finishInterview = useCallback(
    async (results: QAResult[]) => {
      // Interview is wrapping up — clear the in-flight snapshot so a
      // refresh on /result doesn't offer to "이어서" a finished session.
      clearProgress();
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
        const fallbackScore =
          results.length > 0
            ? Math.round(
                results.reduce((sum, r) => sum + r.score, 0) / results.length
              )
            : 0;
        setOverall(
          fallbackScore,
          `종합 코멘트를 생성하지 못했어요(${msg}). 평균 점수는 ${fallbackScore}점입니다.`
        );
      }
      posthog.capture("funnel_interview_completed", {
        questionCount: results.length,
        avgScore: results.length > 0
          ? Math.round(results.reduce((s, r) => s + r.score, 0) / results.length)
          : 0,
      });
      router.push("/result");
    },
    [router, setOverall]
  );

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isEvaluating || streamingText !== null) return;

    const currentItem = items[questionIndex];
    if (!currentItem) return;

    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setInput("");
    if (inputRef.current) inputRef.current.style.height = "auto";
    // 다음 질문이 들어오기 전에 모범답안 카드를 자동으로 닫는다 —
    // 이전 질문의 답안이 새 질문 위에 남아 혼동되는 걸 방지.
    setAiAnswer(null);
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

    const timeRunningOut = secondsLeft <= FOLLOW_UP_TIME_THRESHOLD_SEC;
    const allowFollowUp =
      !currentItem.isClosing &&
      !currentItem.isFollowUp &&
      !timeRunningOut;

    let qa: QAResult;
    let followUpQuestion: string | null = null;
    try {
      const res = await fetch("/api/evaluate-answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: currentItem.text,
          answer: text,
          resume,
          jobPosting: jobPostingText,
          personaId: persona.id,
          allowFollowUp,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "평가 실패");
      qa = {
        question: currentItem.text,
        answer: text,
        score: Number(data.score) || 0,
        feedback: String(data.feedback ?? ""),
        bestAnswer: String(data.bestAnswer ?? ""),
        keywords: Array.isArray(data.keywords) ? data.keywords : [],
      };
      if (
        typeof data.followUpQuestion === "string" &&
        data.followUpQuestion.trim().length > 0
      ) {
        followUpQuestion = data.followUpQuestion.trim();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "평가 실패";
      setErrorMsg(msg);
      qa = {
        question: currentItem.text,
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

    if (currentItem.isClosing) {
      await finishInterview(allResults);
      return;
    }

    if (secondsLeft <= 0 && !hasJumpedToClosing) {
      setHasJumpedToClosing(true);
      const closingIdx = items.findIndex((it) => it.isClosing);
      if (closingIdx >= 0 && closingIdx !== questionIndex) {
        setQuestionIndex(closingIdx);
      } else {
        await finishInterview(allResults);
      }
      return;
    }

    if (followUpQuestion && allowFollowUp) {
      const fq = followUpQuestion;
      setItems((prev) => {
        const copy = [...prev];
        copy.splice(questionIndex + 1, 0, {
          text: fq,
          isFollowUp: true,
          isClosing: false,
        });
        return copy;
      });
    }

    setQuestionIndex(questionIndex + 1);
  }, [
    input,
    isEvaluating,
    streamingText,
    items,
    questionIndex,
    jobPosting,
    resume,
    appendQAResult,
    qaResults,
    finishInterview,
    persona.id,
    secondsLeft,
    hasJumpedToClosing,
  ]);

  // Time-up forced jump (when not actively answering)
  useEffect(() => {
    if (secondsLeft > 0) return;
    if (hasJumpedToClosing) return;
    if (isEvaluating || streamingText !== null) return;
    if (items.length === 0) return;
    const current = items[questionIndex];
    if (!current || current.isClosing) return;
    const closingIdx = items.findIndex((it) => it.isClosing);
    if (closingIdx >= 0 && closingIdx !== questionIndex) {
      setHasJumpedToClosing(true);
      setQuestionIndex(closingIdx);
    }
  }, [
    secondsLeft,
    hasJumpedToClosing,
    isEvaluating,
    streamingText,
    items,
    questionIndex,
  ]);

  const handleAiAssist = useCallback(async () => {
    if (isAiAssisting) return;
    if (streamingText !== null || isEvaluating) return;
    if (!currentItem) return;
    aiPauseAtRef.current = Date.now();
    setIsAiAssisting(true);

    const jobPostingText = jobPosting
      ? [
          `회사: ${jobPosting.company}`,
          `포지션: ${jobPosting.position}`,
          jobPosting.requirements ? `자격 요건: ${jobPosting.requirements}` : "",
          jobPosting.description ? `설명: ${jobPosting.description}` : "",
        ]
          .filter(Boolean)
          .join("\n")
      : "";

    try {
      const res = await fetch("/api/ai-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: currentItem.text,
          resume: resume || undefined,
          jobPosting: jobPostingText || undefined,
          personaId: persona.id,
        }),
      });
      // 서버를 단일 진실 원천으로 — 402(ai_assist_exhausted)면 페이월,
      // 200이면 카드 표시. 클라 캐시(localStorage)는 결제 상태를 못
      // 따라가서 제거함.
      if (res.status === 402) {
        setShowAiAssistPaywall(true);
      } else {
        const data = await res.json();
        const answer =
          res.ok && typeof data.answer === "string" && data.answer.trim().length > 0
            ? data.answer.trim()
            : null;
        if (answer) setAiAnswer(answer);
      }
    } catch {
      // Silently ignore — user can just type manually
    }

    // Resume countdown by shifting the start anchor forward by the pause duration
    if (startTimeRef.current !== null && aiPauseAtRef.current !== null) {
      startTimeRef.current += Date.now() - aiPauseAtRef.current;
    }
    aiPauseAtRef.current = null;
    setIsAiAssisting(false);
  }, [isAiAssisting, streamingText, isEvaluating, currentItem, jobPosting, resume, persona.id]);

  // 모범답안 카드 [답변에 옮기기] — textarea로 답안 텍스트 이동 후 카드 닫기.
  // 사용자는 옮긴 뒤 직접 편집해서 제출. 기존 textarea 내용은 덮어쓴다.
  const handleApplyAiAnswer = useCallback(() => {
    if (!aiAnswer) return;
    setInput(aiAnswer);
    const ta = inputRef.current;
    if (ta) {
      ta.style.height = "auto";
      ta.style.height = `${Math.min(ta.scrollHeight, 144)}px`;
      ta.focus();
      ta.setSelectionRange(aiAnswer.length, aiAnswer.length);
    }
    setAiAnswer(null);
  }, [aiAnswer]);

  // Early finish is allowed only when the user has at least one answered
  // question (otherwise the result page has nothing to grade) and we're
  // not in the middle of streaming/evaluating/AI-assisting.
  const canFinishEarly =
    qaResults.length > 0 &&
    !isEvaluating &&
    !isAnalyzing &&
    streamingText === null &&
    !isAiAssisting;

  const confirmFinishEarly = useCallback(() => {
    setShowFinishConfirm(false);
    finishInterview(qaResults);
  }, [finishInterview, qaResults]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter sends; Shift+Enter inserts a newline.
    // Guard against IME composition (Korean) so the Enter that confirms
    // a composing character doesn't accidentally submit.
    const isComposing =
      (e.nativeEvent as KeyboardEvent).isComposing || e.keyCode === 229;
    if (e.key === "Enter" && !e.shiftKey && !isComposing) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleRecording = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognition = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSttSupported(false);
      setSttUnsupportedMsg("이 브라우저는 음성 입력을 지원하지 않아요. Chrome을 사용해 주세요.");
      setTimeout(() => setSttUnsupportedMsg(null), 3000);
      return;
    }

    if (isRecording) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (recognitionRef.current as any)?.stop();
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recognition = new SpeechRecognition() as any;
    recognition.lang = "ko-KR";
    recognition.continuous = true;   // 명시적으로 stop() 호출 전까지 유지
    recognition.interimResults = true;

    recognitionRef.current = recognition;
    setIsRecording(true);

    const baseText = inputRef.current?.value ?? "";
    // continuous=true 환경에서는 onresult가 여러 번 호출되므로
    // finalTranscript를 클로저로 누적
    let finalTranscript = "";

    recognition.onresult = (e: { results: { isFinal: boolean; [i: number]: { transcript: string } }[]; resultIndex: number }) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalTranscript += t;
        else interim += t;
      }
      const combined = finalTranscript + interim;
      const sep = baseText && combined ? " " : "";
      const next = (baseText + sep + combined).trimStart();
      setInput(next);
      const ta = inputRef.current;
      if (ta) {
        ta.style.height = "auto";
        ta.style.height = `${Math.min(ta.scrollHeight, 144)}px`;
      }
    };

    recognition.onend = () => {
      setIsRecording(false);
      recognitionRef.current = null;
      inputRef.current?.focus();
    };

    recognition.onerror = (e: { error: string }) => {
      // 'aborted'는 stop() 직후 정상 발생 — 무시
      if (e.error !== "aborted") {
        setIsRecording(false);
        recognitionRef.current = null;
      }
    };

    recognition.start();
  };

  const totalSeconds = totalSecondsRef.current || durationMinutes * 60;
  const elapsedRatio = 1 - secondsLeft / totalSeconds;
  const isTimeWarning = secondsLeft > 0 && secondsLeft <= 60;
  const isTimeUp = secondsLeft <= 0;

  return (
    <motion.div
      // Bounded height (viewport - AuthHeader) so the inner chat area is
      // the only thing that scrolls — top bar, persona, gradient and the
      // input row stay pinned in place even when QA history grows long.
      className="flex h-[calc(100dvh-56px)] flex-col bg-white"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between bg-white px-5 py-3 border-b border-[var(--gray-200)]">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-1">
            <svg
              className="h-5 w-5 text-[var(--gray-900)]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <span className="text-[15px] font-bold text-[var(--gray-900)]">
            면접 진행
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (canFinishEarly) {
                setShowFinishConfirm(true);
              } else {
                setErrorMsg("질문 1개 이상 답변하면 중간 종료할 수 있어요.");
              }
            }}
            className="rounded-full border border-[var(--gray-200)] px-3 py-1 text-[12px] font-medium text-[var(--gray-600)] transition-colors hover:bg-[var(--gray-100)]"
          >
            끝내기
          </button>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-bold tabular-nums transition-colors ${
              isTimeUp
                ? "bg-red-50 text-[var(--danger)]"
                : isTimeWarning
                ? "bg-orange-50 text-[var(--warning)]"
                : "bg-[var(--blue-light)] text-[var(--blue-primary)]"
            }`}
          >
            {isAiAssisting ? (
              // Pause indicator while AI 도움받기 is generating —
              // signals to the user that the timer is genuinely held,
              // not just lagging.
              <svg
                className="h-3 w-3"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-label="일시정지"
              >
                <rect x="6" y="5" width="4" height="14" rx="1" />
                <rect x="14" y="5" width="4" height="14" rx="1" />
              </svg>
            ) : (
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
            )}
            {formatTime(secondsLeft)}
          </span>
        </div>
      </div>

      {/* Progress bar (time-based) */}
      <div className="h-1 bg-[var(--gray-200)] shrink-0">
        <motion.div
          className={`h-full ${
            isTimeUp
              ? "bg-[var(--danger)]"
              : isTimeWarning
              ? "bg-[var(--warning)]"
              : "bg-[var(--blue-primary)]"
          }`}
          animate={{
            width: `${Math.min(100, Math.max(0, elapsedRatio * 100))}%`,
          }}
          transition={{ duration: 0.6, ease: "linear" }}
        />
      </div>

      {/* AI Interviewer Avatar */}
      <div
        className="text-white flex flex-col items-center justify-center py-8 shrink-0 relative overflow-hidden shadow-md z-10 min-h-[300px]"
        style={{ backgroundColor: persona.accentColor }}
      >
        <div className="absolute inset-0 z-0 opacity-80 flex items-center justify-center mix-blend-screen pointer-events-none">
          <LottieAnimation
            src="/lottie/Fixed Blur.json"
            className="w-[200%] h-[200%] max-w-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          />
        </div>

        <div
          className="absolute inset-0 z-10 pointer-events-none"
          style={{
            background: `linear-gradient(to bottom, transparent, ${persona.accentColor}66)`,
          }}
        />

        <div className="relative z-20 flex flex-col items-center justify-center">
          <div className="w-48 h-48 flex items-center justify-center pointer-events-none mb-3">
            <div
              className="w-full h-full origin-center"
              style={{ transform: `scale(${persona.heroScale})` }}
            >
              <LottieAnimation
                src={persona.characterLottie}
                fallbackSrc={DEFAULT_CHARACTER_LOTTIE}
                className="w-full h-full"
                playing={streamingText !== null}
              />
            </div>
          </div>

          <h2 className="text-[18px] font-bold z-20 drop-shadow-md">
            {persona.name}
          </h2>
          <p className="text-[13px] text-white/80 mt-2 z-20 font-medium bg-black/40 px-4 py-1.5 rounded-full backdrop-blur-md">
            {streamingText !== null
              ? "질문을 말씀하고 있습니다..."
              : isEvaluating
              ? "답변을 평가하고 있어요..."
              : currentItem?.isFollowUp
              ? "꼬리질문을 던졌습니다"
              : currentItem?.isClosing
              ? "마지막 질문입니다"
              : persona.speakingLine || "당신의 답변을 경청 중입니다"}
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
              <div key={i}>
                {isAI && (msg.isFollowUp || msg.isClosing) && (
                  <div className="flex items-center gap-1.5 px-1 mb-1.5 mt-3">
                    {msg.isFollowUp && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[var(--blue-light)] px-2 py-0.5 text-[11px] font-semibold text-[var(--blue-primary)]">
                        ↳ 꼬리질문
                      </span>
                    )}
                    {msg.isClosing && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[var(--gray-900)] px-2 py-0.5 text-[11px] font-semibold text-white">
                        ✦ 마지막 질문
                      </span>
                    )}
                  </div>
                )}
                <ChatBubble
                  role={msg.role}
                  content={msg.content}
                  showAvatar={showAvatar}
                  questionNumber={isAI ? msg.questionNumber : undefined}
                  aiName={persona.shortName}
                  aiAccentColor={persona.accentColor}
                />
              </div>
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
              aiName={persona.shortName}
              aiAccentColor={persona.accentColor}
            />
          )}
          {isEvaluating && (
            <TypingIndicator
              aiName={persona.shortName}
              aiAccentColor={persona.accentColor}
            />
          )}
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
              <LottieAnimation
                src="/lottie/Audio&Voice-A-002.json"
                className="w-64 h-64"
              />
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

      {/* Time-up banner */}
      <AnimatePresence>
        {isTimeUp &&
          !hasJumpedToClosing &&
          currentItem &&
          !currentItem.isClosing && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="fixed top-[58px] left-1/2 -translate-x-1/2 w-[calc(100%-32px)] max-w-[608px] z-[60] rounded-xl bg-[var(--gray-900)] text-white px-4 py-2.5 shadow-lg flex items-center gap-2"
            >
              <span className="text-[12px] font-medium">
                ⏱ 시간이 종료되어 마지막 질문으로 넘어갈게요
              </span>
            </motion.div>
          )}
      </AnimatePresence>

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
      <Toast message={sttUnsupportedMsg} onClose={() => setSttUnsupportedMsg(null)} />

      {/* Floating fade gradient */}
      <div className="pointer-events-none fixed bottom-[68px] left-1/2 w-full max-w-[640px] h-12 -translate-x-1/2 bg-gradient-to-t from-white to-transparent z-40" />

      {/* 모범답안 카드 — 비차단. 호출 중엔 pulse 스켈레톤, 응답 받으면
          답변 텍스트 + [답변에 옮기기] 버튼. 옮기기 누르면 textarea로
          채워지고 카드는 닫힘. 사용자가 X로 직접 닫을 수도 있음. send
          시 handleSend가 자동으로 닫는다.
          애니메이션 + animate-pulse는 iOS/안드로이드 웹 모두에서 동일하게
          렌더링 — 별도 플랫폼 분기 불필요. */}
      <AnimatePresence>
        {(isAiAssisting || aiAnswer) && (
          <motion.div
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 12, opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className="bg-white border-t border-[var(--gray-200)] px-4 pt-3 pb-1 relative z-40"
          >
            <motion.div
              className="rounded-xl bg-white px-3.5 py-3"
              style={{  }}
              // 일정한 패턴 글로우 펄스 — 2.4초 주기로 약/강 사이를 ease-in-out
              // 왕복. 색은 페르소나 accentColor + 알파 8자리 hex로 강도 조절.
              animate={{
                boxShadow: [
                  `0 0 6px ${persona.accentColor}33`,
                  `0 0 18px ${persona.accentColor}99`,
                  `0 0 6px ${persona.accentColor}33`,
                ],
              }}
              transition={{
                duration: 2.4,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <svg
                    className="h-4 w-4"
                    style={{ color: persona.accentColor }}
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M12 2l1.9 4.6L18.5 8.5l-4.6 1.9L12 15l-1.9-4.6L5.5 8.5l4.6-1.9z" />
                  </svg>
                  <span className="text-[12px] font-bold text-[var(--gray-900)]">
                    {isAiAssisting && !aiAnswer ? "모범답안 작성 중" : "모범답안"}
                  </span>
                </div>
                {aiAnswer && (
                  <button
                    onClick={() => setAiAnswer(null)}
                    aria-label="모범답안 닫기"
                    className="text-[var(--gray-400)] hover:text-[var(--gray-700)] p-0.5"
                  >
                    <svg
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                )}
              </div>

              {isAiAssisting && !aiAnswer ? (
                // Pulse skeleton — 4줄, 마지막은 짧게 줄여 자연스러운 단락 모방
                <div className="space-y-1.5 mb-3" aria-busy="true">
                  <div className="h-3 rounded bg-[var(--gray-200)] animate-pulse w-full" />
                  <div className="h-3 rounded bg-[var(--gray-200)] animate-pulse w-[95%]" />
                  <div className="h-3 rounded bg-[var(--gray-200)] animate-pulse w-[90%]" />
                  <div className="h-3 rounded bg-[var(--gray-200)] animate-pulse w-[60%]" />
                </div>
              ) : aiAnswer ? (
                <>
                  <p className="text-[13px] leading-[20px] text-[var(--gray-800)] whitespace-pre-wrap mb-3">
                    {aiAnswer}
                  </p>
                  <button
                    onClick={handleApplyAiAnswer}
                    className="w-full rounded-lg py-2 text-[13px] font-bold text-white transition active:scale-[0.98]"
                    style={{ backgroundColor: persona.accentColor }}
                  >
                    답변에 옮기기
                  </button>
                </>
              ) : null}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input */}
      <div className="bg-white px-4 py-3 border-t border-[var(--gray-200)] relative z-50">
        <div className="flex items-end gap-2">
          {/* AI 도움받기 — pauses the countdown, simulates a response, then
              fills the textarea. Lifetime-free 1회 metered via localStorage
              for now; second click opens the paywall. */}
          <button
            onClick={handleAiAssist}
            disabled={
              isAiAssisting || streamingText !== null || isEvaluating
            }
            aria-label="AI 도움받기"
            className={`flex h-[44px] w-[44px] flex-shrink-0 items-center justify-center rounded-full transition-all relative disabled:opacity-50 ${
              isAiAssisting
                ? "bg-[var(--blue-light)] text-[var(--blue-primary)]"
                : "bg-[var(--gray-100)] text-[var(--gray-700)] hover:bg-[var(--gray-200)]"
            }`}
          >
            {isAiAssisting ? (
              <svg
                className="h-5 w-5 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path d="M12 2v4" strokeLinecap="round" />
                <path d="M12 18v4" strokeLinecap="round" opacity="0.6" />
                <path d="M4.93 4.93l2.83 2.83" strokeLinecap="round" opacity="0.4" />
                <path d="M16.24 16.24l2.83 2.83" strokeLinecap="round" opacity="0.7" />
                <path d="M2 12h4" strokeLinecap="round" opacity="0.5" />
                <path d="M18 12h4" strokeLinecap="round" opacity="0.8" />
                <path d="M4.93 19.07l2.83-2.83" strokeLinecap="round" opacity="0.3" />
                <path d="M16.24 7.76l2.83-2.83" strokeLinecap="round" opacity="0.9" />
              </svg>
            ) : (
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 2l1.9 4.6L18.5 8.5l-4.6 1.9L12 15l-1.9-4.6L5.5 8.5l4.6-1.9z" />
                <path d="M19 14l.95 2.3L22.25 17.25l-2.3.95L19 20.5l-.95-2.3L15.75 17.25l2.3-.95z" opacity="0.7" />
              </svg>
            )}
          </button>

          <button
            onClick={toggleRecording}
            disabled={isAiAssisting}
            title={sttSupported ? (isRecording ? "녹음 중지" : "음성 입력") : "이 브라우저는 음성 입력을 지원하지 않아요 (Chrome 권장)"}
            className={`flex h-[44px] w-[44px] flex-shrink-0 items-center justify-center rounded-full transition-all relative disabled:opacity-50 ${
              isRecording
                ? "bg-red-50 text-red-500"
                : sttSupported
                ? "bg-[var(--gray-100)] text-[var(--gray-500)] hover:bg-[var(--gray-200)]"
                : "bg-[var(--gray-100)] text-[var(--gray-300)] cursor-not-allowed"
            }`}
          >
            {isRecording && (
              <span className="absolute inset-0 rounded-full animate-ping bg-red-400 opacity-30" />
            )}
            <svg
              className="h-5 w-5 relative z-10"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
              />
            </svg>
          </button>

          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              // Auto-grow up to ~6 lines, then scroll inside the textarea.
              const ta = e.target;
              ta.style.height = "auto";
              ta.style.height = `${Math.min(ta.scrollHeight, 144)}px`;
            }}
            onKeyDown={handleKeyDown}
            placeholder={
              isAiAssisting
                ? "AI가 모범답안을 작성하고 있어요..."
                : streamingText !== null
                ? "질문 표시 중..."
                : "답변을 입력하세요"
            }
            disabled={streamingText !== null || isEvaluating || isAiAssisting}
            className="flex-1 resize-none rounded-xl bg-[var(--gray-100)] px-4 py-3 text-[14px] leading-[20px] text-[var(--gray-900)] placeholder:text-[var(--gray-400)] focus:outline-none transition-all disabled:opacity-50 max-h-[144px]"
          />
          <button
            onClick={handleSend}
            disabled={
              !input.trim() ||
              streamingText !== null ||
              isEvaluating ||
              isAiAssisting
            }
            className={`flex h-[44px] w-[44px] flex-shrink-0 items-center justify-center rounded-xl transition-all ${
              input.trim() &&
              streamingText === null &&
              !isEvaluating &&
              !isAiAssisting
                ? "bg-[var(--blue-primary)] text-white active:scale-95"
                : "bg-[var(--gray-200)] text-[var(--gray-400)]"
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
                d="M5 12h14M12 5l7 7-7 7"
              />
            </svg>
          </button>
        </div>
      </div>

      <PaywallModal
        open={showAiAssistPaywall}
        onClose={() => setShowAiAssistPaywall(false)}
        reason="ai-assist"
      />

      {/* Resume-in-flight modal — surfaces when the user lands on /interview
          and a non-stale snapshot exists. Held above the rest of the UI
          (which is gated by `pendingRestore` so it doesn't initialize). */}
      {portalMounted &&
        createPortal(
          <AnimatePresence>
            {pendingRestore && (
              <>
                <motion.div
                  className="fixed inset-0 z-50 bg-black/40"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                />
                <div className="pointer-events-none fixed inset-0 z-[51] flex items-end justify-center px-4 pb-4 sm:items-center sm:pb-0">
                  <motion.div
                    className="pointer-events-auto w-full max-w-[360px] rounded-2xl bg-white px-5 pt-5 pb-5"
                    initial={{ y: 40, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 40, opacity: 0 }}
                    transition={{ type: "spring", damping: 28, stiffness: 280 }}
                  >
                    <h2 className="text-[16px] font-bold text-[var(--gray-900)]">
                      진행 중이던 면접을 이어서 볼까요?
                    </h2>
                    <p className="mt-1.5 text-[13px] leading-[19px] text-[var(--gray-600)]">
                      마지막 진행 시점부터 다시 시작할 수 있어요.
                      {`(${pendingRestore.questionIndex + 1}/${pendingRestore.items.length} · 남은 시간 ${formatTime(pendingRestore.secondsLeft)})`}
                    </p>
                    <div className="mt-4 flex gap-2">
                      <button
                        onClick={discardRestore}
                        className="flex-1 rounded-xl border border-[var(--gray-200)] bg-white py-2.5 text-[13px] font-semibold text-[var(--gray-700)]"
                      >
                        처음부터
                      </button>
                      <button
                        onClick={() => applyRestore(pendingRestore)}
                        className="flex-1 rounded-xl bg-[var(--blue-primary)] py-2.5 text-[13px] font-bold text-white active:scale-95"
                      >
                        이어서 진행
                      </button>
                    </div>
                  </motion.div>
                </div>
              </>
            )}
          </AnimatePresence>,
          document.body
        )}

      {/* Early-finish confirm sheet — portaled to body so framer-motion
          ancestors don't capture the fixed positioning. Same visual
          pattern as PaywallModal. */}
      {portalMounted &&
        createPortal(
          <AnimatePresence>
            {showFinishConfirm && (
              <>
                <motion.div
                  className="fixed inset-0 z-50 bg-black/40"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setShowFinishConfirm(false)}
                />
                <div className="pointer-events-none fixed inset-0 z-[51] flex items-end justify-center px-4 pb-4 sm:items-center sm:pb-0">
                  <motion.div
                    className="pointer-events-auto w-full max-w-[360px] rounded-2xl bg-white px-5 pt-5 pb-5"
                    initial={{ y: 40, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 40, opacity: 0 }}
                    transition={{ type: "spring", damping: 28, stiffness: 280 }}
                  >
                    <h2 className="text-[16px] font-bold text-[var(--gray-900)]">
                      면접을 지금 끝낼까요?
                    </h2>
                    <p className="mt-1.5 text-[13px] leading-[19px] text-[var(--gray-600)]">
                      지금까지 답변하신 {qaResults.length}개 질문을 기준으로
                      결과가 생성됩니다.
                    </p>
                    <div className="mt-4 flex gap-2">
                      <button
                        onClick={() => setShowFinishConfirm(false)}
                        className="flex-1 rounded-xl border border-[var(--gray-200)] bg-white py-2.5 text-[13px] font-semibold text-[var(--gray-700)]"
                      >
                        계속 진행
                      </button>
                      <button
                        onClick={confirmFinishEarly}
                        className="flex-1 rounded-xl bg-[var(--blue-primary)] py-2.5 text-[13px] font-bold text-white active:scale-95"
                      >
                        결과 보기
                      </button>
                    </div>
                  </motion.div>
                </div>
              </>
            )}
          </AnimatePresence>,
          document.body
        )}
    </motion.div>
  );
}

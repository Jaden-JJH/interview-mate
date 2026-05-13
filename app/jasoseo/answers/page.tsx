// 서류전형 답변 생성 페이지 — 이력 + 질문 N개 입력 → 맞춤 답변 (2크레딧)
"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import LottieAnimation from "@/components/LottieAnimation";
import PaywallModal from "@/components/PaywallModal";
import { extractPdfText } from "@/lib/pdf";
import { exportAsWord, exportAsPDF } from "@/lib/export-document";

type Step = "form" | "loading" | "result";
type InputTab = "pdf" | "text";

interface QuestionItem {
  id: number;
  text: string;
  maxLength: number | null;
}

interface AnswerItem {
  questionIndex: number;
  questionText: string;
  answer: string;
  charCount: number;
}

const PARSING_TEXTS = [
  "PDF를 읽고 있어요...",
  "텍스트를 추출하는 중...",
  "한국어 인식 중...",
  "거의 다 됐어요...",
];

function ParsingStatusText() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      setI((v) => (v + 1) % PARSING_TEXTS.length);
    }, 900);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="h-5 relative w-full flex items-center justify-center overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.p
          key={i}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.25 }}
          className="absolute text-[12px] text-[var(--blue-primary)] font-medium"
        >
          {PARSING_TEXTS[i]}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}

let nextQuestionId = 1;

export default function AnswersPage() {
  const router = useRouter();

  const [step, setStep] = useState<Step>("form");

  // Background / resume input
  const [tab, setTab] = useState<InputTab>("pdf");
  const [directText, setDirectText] = useState("");
  const [pdfText, setPdfText] = useState("");
  const [pdfName, setPdfName] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Questions
  const [questions, setQuestions] = useState<QuestionItem[]>([
    { id: nextQuestionId++, text: "", maxLength: null },
  ]);

  // Optional info
  const [showOptional, setShowOptional] = useState(false);
  const [targetCompany, setTargetCompany] = useState("");
  const [targetPosition, setTargetPosition] = useState("");

  // Result
  const [answers, setAnswers] = useState<AnswerItem[]>([]);
  const [openAccordion, setOpenAccordion] = useState<number>(0);
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Error / Paywall
  const [error, setError] = useState<string | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);

  const backgroundText = tab === "pdf" ? pdfText : directText;
  const validQuestions = questions.filter((q) => q.text.trim().length > 0);
  const canSubmit = backgroundText.trim().length >= 50 && validQuestions.length > 0;

  // PDF upload handler
  const handlePdfUpload = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setError("PDF 파일만 업로드할 수 있어요.");
      return;
    }
    setIsParsing(true);
    setError(null);
    try {
      let extracted = await extractPdfText(file);
      if (!extracted || extracted.trim().length < 30) {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/parse-pdf", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "PDF 파싱 실패");
        extracted = data.text;
      }
      setPdfText(extracted);
      setPdfName(file.name);
      setTab("pdf");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "PDF 파싱에 실패했어요."
      );
    } finally {
      setIsParsing(false);
    }
  }, []);

  // Question management
  function addQuestion() {
    if (questions.length >= 10) return;
    setQuestions((prev) => [
      ...prev,
      { id: nextQuestionId++, text: "", maxLength: null },
    ]);
  }

  function removeQuestion(id: number) {
    if (questions.length <= 1) return;
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  }

  function updateQuestion(id: number, field: "text" | "maxLength", value: string | number | null) {
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, [field]: value } : q))
    );
  }

  // Generate
  async function handleGenerate() {
    if (!canSubmit) return;
    setError(null);
    setStep("loading");
    try {
      const res = await fetch("/api/generate-answers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          backgroundText: backgroundText.trim(),
          questions: validQuestions.map((q) => ({
            text: q.text.trim(),
            maxLength: q.maxLength || undefined,
          })),
          targetCompany: targetCompany.trim() || undefined,
          targetPosition: targetPosition.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "insufficient_credits") {
          setStep("form");
          setShowPaywall(true);
          return;
        }
        throw new Error(data.error ?? "생성 실패");
      }
      setAnswers(data.answers);
      setOpenAccordion(0);
      setStep("result");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "생성에 실패했어요";
      setError(msg);
      setStep("form");
    }
  }

  // Copy helpers
  function buildFullText() {
    return answers
      .map(
        (a, i) =>
          `## 질문 ${i + 1}\n${a.questionText}\n\n${a.answer}\n`
      )
      .join("\n");
  }

  async function handleCopyAll() {
    try {
      await navigator.clipboard.writeText(buildFullText());
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2000);
    } catch {}
  }

  async function handleCopySingle(index: number) {
    const a = answers[index];
    if (!a) return;
    try {
      await navigator.clipboard.writeText(`${a.questionText}\n\n${a.answer}`);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch {}
  }

  return (
    <div className="flex flex-1 flex-col px-5 pt-6 pb-32">
      {/* Back + Header */}
      <button
        onClick={() => router.push("/jasoseo")}
        className="mb-3 flex items-center gap-1 text-[13px] font-semibold text-[var(--gray-500)]"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
        자소서메이트
      </button>
      <div className="mb-6">
        <h1 className="text-[22px] font-extrabold text-[var(--gray-900)]">
          서류전형 답변 생성
        </h1>
        <p className="mt-1 text-[14px] text-[var(--gray-500)]">
          기업 질문에 맞춘 맞춤형 답변을 만들어 드려요
        </p>
      </div>

      {/* ── FORM STEP ── */}
      {step === "form" && (
        <div className="flex flex-col gap-6">
          {error && (
            <div className="rounded-xl bg-red-50 px-4 py-3 text-[13px] text-red-600 font-medium">
              {error}
            </div>
          )}

          {/* Background / Resume Input */}
          <div>
            <label className="text-[13px] font-semibold text-[var(--gray-900)] mb-2 block">
              이력/경력 <span className="text-[var(--blue-primary)]">*</span>
            </label>

            {/* Tab */}
            <div className="mb-3 flex rounded-xl bg-[var(--gray-100)] p-1">
              {(["pdf", "text"] as InputTab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`flex-1 rounded-lg py-2 text-[13px] font-semibold transition-colors ${
                    tab === t
                      ? "bg-white text-[var(--gray-900)] shadow-sm"
                      : "text-[var(--gray-500)]"
                  }`}
                >
                  {t === "text" ? "직접 입력" : "PDF 업로드"}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <AnimatePresence mode="wait">
              {tab === "text" ? (
                <motion.div
                  key="text"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.15 }}
                >
                  <textarea
                    value={directText}
                    onChange={(e) => setDirectText(e.target.value)}
                    placeholder={"이력, 경력, 주요 성과를 자유롭게 적어주세요.\n\n면접에서 어필하고 싶은 경험을 상세하게 적을수록 좋은 답변이 나와요."}
                    rows={6}
                    className="w-full resize-none rounded-2xl bg-[var(--gray-100)] px-4 py-3 text-[14px] leading-[22px] text-[var(--gray-900)] placeholder:text-[var(--gray-400)] focus:outline-none focus:ring-2 focus:ring-[var(--blue-primary)]/20"
                  />
                  <p className="mt-1.5 text-right text-[11px] text-[var(--gray-400)]">
                    {directText.length.toLocaleString()}자
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="pdf"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.15 }}
                >
                  {pdfText ? (
                    <motion.div
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-[var(--gray-200)] py-8"
                    >
                      <LottieAnimation
                        src="/lottie/success confetti.json"
                        className="w-40 h-40 -my-6"
                        loop={false}
                      />
                      <div className="rounded-lg bg-white px-5 py-2.5 text-[14px] font-medium text-[var(--gray-700)] shadow-sm">
                        {pdfName}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setPdfText("");
                          setPdfName("");
                        }}
                        className="text-[12px] font-medium text-[var(--gray-500)] underline underline-offset-2 hover:text-[var(--gray-900)]"
                      >
                        다른 파일 선택
                      </button>
                      <p className="text-[13px] font-medium text-[var(--gray-500)]">
                        {pdfText.length.toLocaleString()}자 추출 완료
                      </p>
                    </motion.div>
                  ) : (
                    <button
                      onClick={() => fileRef.current?.click()}
                      disabled={isParsing}
                      className="w-full rounded-2xl border-2 border-dashed border-[var(--gray-200)] py-12 text-center transition-colors hover:border-[var(--blue-primary)]/40"
                    >
                      {isParsing ? (
                        <div className="flex flex-col items-center gap-2">
                          <LottieAnimation
                            src="/lottie/Document OCR Scan.json"
                            className="h-12 w-12"
                          />
                          <ParsingStatusText />
                        </div>
                      ) : (
                        <>
                          <LottieAnimation
                            src="/lottie/File Search.json"
                            className="mx-auto mb-2 h-12 w-12"
                          />
                          <p className="text-[14px] font-semibold text-[var(--gray-700)]">
                            PDF 파일을 업로드하세요
                          </p>
                          <p className="mt-0.5 text-[12px] text-[var(--gray-400)]">
                            이력서 또는 자기소개서가 담긴 PDF 파일
                          </p>
                        </>
                      )}
                    </button>
                  )}
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handlePdfUpload(f);
                      e.target.value = "";
                    }}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Questions Section */}
          <div>
            <label className="text-[13px] font-semibold text-[var(--gray-900)] mb-2 block">
              서류전형 질문 <span className="text-[var(--blue-primary)]">*</span>
            </label>

            <div className="flex flex-col gap-3">
              {questions.map((q, idx) => (
                <div
                  key={q.id}
                  className="rounded-xl bg-[var(--gray-100)] p-4"
                >
                  {/* Question header */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[12px] font-semibold text-[var(--gray-600)]">
                      질문 {idx + 1}
                    </span>
                    {questions.length > 1 && (
                      <button
                        onClick={() => removeQuestion(q.id)}
                        className="flex items-center justify-center h-6 w-6 rounded-full text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                      >
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    )}
                  </div>

                  {/* Question textarea */}
                  <textarea
                    rows={3}
                    value={q.text}
                    onChange={(e) => updateQuestion(q.id, "text", e.target.value)}
                    placeholder={"서류전형 질문을 입력하세요\n예: 인생에서 경험한 가장 큰 실패와 극복한 경험을 말씀해주세요."}
                    className="w-full resize-none rounded-xl bg-white px-4 py-3 text-[14px] leading-[22px] text-[var(--gray-900)] placeholder:text-[var(--gray-400)] focus:outline-none focus:ring-2 focus:ring-[var(--blue-primary)]/20"
                  />

                  {/* Max length chips */}
                  <div className="mt-2">
                    <span className="text-[12px] text-[var(--gray-500)] mb-1.5 block">글자수 제한</span>
                    <div className="flex flex-wrap gap-1.5">
                      {[null, 200, 300, 500, 800, 1000].map((opt) => {
                        const isActive = q.maxLength === opt;
                        return (
                          <button key={String(opt)} type="button"
                            onClick={() => updateQuestion(q.id, "maxLength", opt)}
                            className={`rounded-full px-3 py-1.5 text-[12px] font-semibold transition-all ${
                              isActive
                                ? "bg-[var(--blue-primary)] text-white"
                                : "bg-white text-[var(--gray-600)] hover:bg-[var(--gray-200)]"
                            }`}>
                            {opt === null ? "제한 없음" : `${opt}자`}
                          </button>
                        );
                      })}
                      {q.maxLength !== null && ![200, 300, 500, 800, 1000].includes(q.maxLength) && (
                        <span className="rounded-full px-3 py-1.5 text-[12px] font-semibold bg-[var(--blue-primary)] text-white">
                          {q.maxLength}자
                        </span>
                      )}
                      <button type="button"
                        onClick={() => {
                          const val = prompt("글자수를 직접 입력하세요 (숫자만)");
                          if (val && /^\d+$/.test(val.trim())) {
                            updateQuestion(q.id, "maxLength", parseInt(val.trim(), 10));
                          }
                        }}
                        className="rounded-full px-3 py-1.5 text-[12px] font-semibold border border-dashed border-[var(--gray-300)] text-[var(--gray-500)] hover:border-[var(--blue-primary)] hover:text-[var(--blue-primary)] transition-colors">
                        직접 입력
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Add question button */}
            <button
              onClick={addQuestion}
              disabled={questions.length >= 10}
              className="mt-3 flex items-center gap-1.5 text-[13px] font-semibold text-[var(--blue-primary)] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              질문 추가 {questions.length >= 10 && "(최대 10개)"}
            </button>
          </div>

          {/* Optional info toggle */}
          <div>
            <button
              onClick={() => setShowOptional(!showOptional)}
              className="flex items-center gap-1.5 text-[13px] font-semibold text-[var(--blue-primary)]"
            >
              <svg
                className={`h-4 w-4 transition-transform ${
                  showOptional ? "rotate-90" : ""
                }`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 5l7 7-7 7"
                />
              </svg>
              지원 정보 추가 (선택)
            </button>

            <AnimatePresence>
              {showOptional && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1.5 block text-[12px] font-semibold text-[var(--gray-700)]">
                        지원 회사
                      </label>
                      <input
                        type="text"
                        value={targetCompany}
                        onChange={(e) => setTargetCompany(e.target.value)}
                        placeholder="예: 카카오"
                        className="w-full rounded-xl bg-[var(--gray-100)] px-4 py-3 text-[14px] text-[var(--gray-900)] placeholder:text-[var(--gray-400)] focus:outline-none focus:ring-2 focus:ring-[var(--blue-primary)]/20"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-[12px] font-semibold text-[var(--gray-700)]">
                        지원 직무
                      </label>
                      <input
                        type="text"
                        value={targetPosition}
                        onChange={(e) => setTargetPosition(e.target.value)}
                        placeholder="예: 백엔드"
                        className="w-full rounded-xl bg-[var(--gray-100)] px-4 py-3 text-[14px] text-[var(--gray-900)] placeholder:text-[var(--gray-400)] focus:outline-none focus:ring-2 focus:ring-[var(--blue-primary)]/20"
                      />
                    </div>
                  </div>
                  <p className="mt-2 text-[11px] text-[var(--gray-400)]">
                    지원 정보를 추가하면 기업에 맞춤화된 답변을 받을 수 있어요
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* ── LOADING STEP ── */}
      {step === "loading" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-y-0 left-1/2 -translate-x-1/2 w-full max-w-[640px] z-[100] bg-white flex flex-col items-center justify-center px-6"
        >
          <div className="w-44 h-44 flex items-center justify-center">
            <LottieAnimation
              src="/lottie/Sparkles Loop Loader ai.json"
              className="w-full h-full object-contain"
            />
          </div>
          <h2 className="mt-1 text-[20px] font-extrabold text-[var(--gray-900)] tracking-tight text-center">
            서류 답변을 작성하고 있어요
          </h2>
          <p className="mt-3 text-[14px] text-[var(--gray-500)] font-medium text-center">
            질문이 여러 개라 조금 더 걸릴 수 있어요
          </p>
        </motion.div>
      )}

      {/* ── RESULT STEP ── */}
      {step === "result" && (
        <div className="flex flex-col gap-3">
          {/* Header row */}
          <div className="flex items-center justify-between">
            <p className="text-[14px] font-bold text-[var(--gray-900)]">
              생성된 답변
            </p>
            <button
              onClick={handleCopyAll}
              className="flex items-center gap-1.5 rounded-full bg-[var(--blue-light)] px-3 py-1.5 text-[12px] font-semibold text-[var(--blue-primary)] transition-colors hover:bg-[var(--blue-primary)] hover:text-white"
            >
              {copiedAll ? (
                <>
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  복사됨
                </>
              ) : (
                <>
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                  </svg>
                  전체 복사
                </>
              )}
            </button>
          </div>

          {/* Accordion list */}
          <div className="flex flex-col gap-2">
            {answers.map((a, idx) => {
              const isOpen = openAccordion === idx;
              const preview =
                a.questionText.length > 30
                  ? a.questionText.slice(0, 30) + "..."
                  : a.questionText;
              const maxLen = validQuestions[idx]?.maxLength;

              return (
                <div
                  key={idx}
                  className="rounded-xl border border-[var(--gray-200)] overflow-hidden"
                >
                  {/* Accordion header */}
                  <button
                    onClick={() => setOpenAccordion(isOpen ? -1 : idx)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left"
                  >
                    <span className="shrink-0 flex items-center justify-center h-6 w-6 rounded-full bg-[var(--blue-primary)] text-[11px] font-bold text-white">
                      {idx + 1}
                    </span>
                    <span className="flex-1 text-[13px] font-medium text-[var(--gray-700)] truncate">
                      {preview}
                    </span>
                    <svg
                      className={`h-4 w-4 shrink-0 text-[var(--gray-400)] transition-transform ${
                        isOpen ? "rotate-180" : ""
                      }`}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>

                  {/* Accordion body */}
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 border-t border-[var(--gray-100)]">
                          {/* Full question */}
                          <p className="mt-3 text-[13px] font-semibold text-[var(--gray-900)] mb-2">
                            {a.questionText}
                          </p>

                          {/* Answer */}
                          <div className="rounded-xl bg-[var(--gray-100)] px-4 py-3 text-[13px] leading-[21px] text-[var(--gray-700)] whitespace-pre-wrap">
                            {a.answer}
                          </div>

                          {/* Char count + copy */}
                          <div className="mt-2 flex items-center justify-between">
                            <span className="text-[11px] text-[var(--gray-400)]">
                              {a.charCount}자{maxLen ? ` / ${maxLen}자` : ""}
                            </span>
                            <button
                              onClick={() => handleCopySingle(idx)}
                              className="flex items-center gap-1 text-[11px] font-medium text-[var(--blue-primary)]"
                            >
                              {copiedIndex === idx ? (
                                <>
                                  <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                  </svg>
                                  복사됨
                                </>
                              ) : (
                                <>
                                  <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                                  </svg>
                                  복사
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>

          {/* Export buttons */}
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              onClick={() => exportAsPDF(buildFullText(), "서류전형 답변")}
              className="flex items-center justify-center gap-1.5 rounded-2xl bg-[var(--gray-900)] py-3 text-[14px] font-semibold text-white active:scale-[0.99] transition-transform"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="12" y1="18" x2="12" y2="12" />
                <polyline points="9 15 12 18 15 15" />
              </svg>
              PDF 저장
            </button>
            <button
              onClick={() => exportAsWord(buildFullText(), "서류전형 답변")}
              className="flex items-center justify-center gap-1.5 rounded-2xl bg-[var(--blue-primary)] py-3 text-[14px] font-semibold text-white active:scale-[0.99] transition-transform"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="12" y1="18" x2="12" y2="12" />
                <polyline points="9 15 12 18 15 15" />
              </svg>
              Word 저장
            </button>
          </div>

          {/* Retry button */}
          <button
            onClick={() => {
              setStep("form");
              setAnswers([]);
            }}
            className="w-full rounded-2xl border border-[var(--gray-200)] py-3 text-[14px] font-semibold text-[var(--gray-700)]"
          >
            다시 생성하기
          </button>
        </div>
      )}

      {/* ── Bottom CTA for form step ── */}
      {step === "form" && (
        <>
          <div className="pointer-events-none fixed bottom-[88px] left-1/2 w-full max-w-[640px] h-16 -translate-x-1/2 bg-gradient-to-t from-white to-transparent z-40" />
          <div className="fixed bottom-0 left-1/2 w-full max-w-[640px] -translate-x-1/2 bg-white px-5 pb-8 pt-3 border-t border-[var(--gray-200)] z-50">
            <button
              onClick={handleGenerate}
              disabled={!canSubmit}
              className="group relative w-full overflow-hidden rounded-2xl p-[1.5px] disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.99] transition-transform"
            >
              <span
                aria-hidden
                className="absolute inset-[-1000%] animate-[premiumSpin_3s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#1B64DA_0%,#7C5CFF_25%,#E2CBFF_50%,#7C5CFF_75%,#1B64DA_100%)]"
              />
              <span className="relative flex w-full items-center justify-center gap-2 rounded-[14px] bg-[var(--gray-900)] py-4 text-[15px] font-bold text-white">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3l1.9 4.6L19 9.5l-4 3.9.9 5.6L12 16.4 8.1 19l.9-5.6-4-3.9 5.1-1.9z" />
                </svg>
                답변 생성하기
                <span className="inline-flex items-center rounded-full bg-white/15 pl-0.5 pr-1.5 py-[1px]">
                  <LottieAnimation src="/lottie/Coin.json" loop={false} autoplay={false} className="h-4 w-4" />
                  <span className="text-[11px] font-semibold text-white/90">2</span>
                </span>
              </span>
            </button>
            {backgroundText.length > 0 && backgroundText.length < 50 && (
              <p className="mt-2 text-center text-[11px] text-[var(--gray-400)]">
                이력/경력을 50자 이상 입력해 주세요 ({backgroundText.length}/50)
              </p>
            )}
          </div>
        </>
      )}

      <PaywallModal open={showPaywall} onClose={() => setShowPaywall(false)} />
    </div>
  );
}

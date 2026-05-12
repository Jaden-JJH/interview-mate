// 자소서메이트 입력 페이지 — 자기소개서 텍스트 입력(붙여넣기/PDF) + 선택적 채용공고
"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import posthog from "posthog-js";
import { useJasoseo } from "@/contexts/JasoseoContext";
import { extractPdfText } from "@/lib/pdf";

type InputTab = "text" | "pdf";

export default function JasoseoPage() {
  const router = useRouter();
  const {
    resumeText,
    setResumeText,
    setJobPostingText,
    setAnalysisResult,
  } = useJasoseo();

  const [tab, setTab] = useState<InputTab>("text");
  const [text, setText] = useState(resumeText);
  const [pdfText, setPdfText] = useState("");
  const [pdfName, setPdfName] = useState("");
  const [jobUrl, setJobUrl] = useState("");
  const [jobText, setJobText] = useState("");
  const [showJobInput, setShowJobInput] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    posthog.capture("jasoseo_input_started");
  }, []);

  const activeText = tab === "pdf" ? pdfText : text;
  const canSubmit = activeText.trim().length >= 50 && !isAnalyzing;

  const handlePdfUpload = useCallback(
    async (file: File) => {
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
    },
    []
  );

  const handleAnalyze = async () => {
    if (!canSubmit) return;
    setIsAnalyzing(true);
    setError(null);
    posthog.capture("jasoseo_analysis_requested", { hasJobPosting: !!(jobUrl.trim() || jobText.trim()), inputMethod: tab });

    let resolvedJobText = jobText.trim();
    if (jobUrl.trim() && !resolvedJobText) {
      try {
        const res = await fetch("/api/parse-job-posting", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: jobUrl.trim() }),
        });
        const data = await res.json();
        if (data.success && data.raw) {
          resolvedJobText = data.raw;
        }
      } catch {
        // 채용공고 파싱 실패는 무시 — 범용 분석으로 fallback
      }
    }

    try {
      const res = await fetch("/api/analyze-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeText: activeText.trim(),
          jobPostingText: resolvedJobText || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "insufficient_credits") {
          setError("크레딧이 부족해요. 충전 후 다시 시도해 주세요.");
        } else {
          throw new Error(data.error ?? "분석 실패");
        }
        return;
      }

      posthog.capture("jasoseo_analysis_completed", { overallScore: data.overallScore });
      setResumeText(activeText.trim());
      setJobPostingText(resolvedJobText);
      setAnalysisResult(data);
      router.push("/jasoseo/result");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "분석에 실패했어요."
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col px-5 pt-6 pb-32">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-[22px] font-extrabold text-[var(--gray-900)]">
          자소서 분석
        </h1>
        <p className="mt-1 text-[14px] text-[var(--gray-500)]">
          면접관 관점에서 자기소개서를 분석해 드려요
        </p>
      </div>

      {/* Tab */}
      <div className="mb-4 flex rounded-xl bg-[var(--gray-100)] p-1">
        {(["text", "pdf"] as InputTab[]).map((t) => (
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

      {/* Input area */}
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
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="자기소개서 전체를 붙여넣어 주세요.&#10;&#10;문항 구분이 있으면 AI가 자동으로 파싱합니다."
              rows={10}
              className="w-full resize-none rounded-2xl bg-[var(--gray-100)] px-4 py-3 text-[14px] leading-[22px] text-[var(--gray-900)] placeholder:text-[var(--gray-400)] focus:outline-none focus:ring-2 focus:ring-[var(--blue-primary)]/20"
            />
            <p className="mt-1.5 text-right text-[11px] text-[var(--gray-400)]">
              {text.length.toLocaleString()}자
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
              <div className="rounded-2xl bg-[var(--gray-100)] p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[13px] font-semibold text-[var(--gray-900)]">
                    {pdfName}
                  </p>
                  <button
                    onClick={() => {
                      setPdfText("");
                      setPdfName("");
                    }}
                    className="text-[12px] text-[var(--danger)] font-semibold"
                  >
                    삭제
                  </button>
                </div>
                <p className="text-[13px] leading-[20px] text-[var(--gray-700)] whitespace-pre-line line-clamp-6">
                  {pdfText.slice(0, 400)}
                  {pdfText.length > 400 && "…"}
                </p>
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                disabled={isParsing}
                className="w-full rounded-2xl border-2 border-dashed border-[var(--gray-200)] py-12 text-center transition-colors hover:border-[var(--blue-primary)]/40"
              >
                {isParsing ? (
                  <p className="text-[14px] text-[var(--gray-500)]">
                    PDF를 읽고 있어요...
                  </p>
                ) : (
                  <>
                    <svg
                      className="mx-auto mb-2 h-8 w-8 text-[var(--gray-400)]"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 16V4m0 0l-4 4m4-4l4 4M4 14v4a2 2 0 002 2h12a2 2 0 002-2v-4"
                      />
                    </svg>
                    <p className="text-[14px] font-semibold text-[var(--gray-700)]">
                      PDF 파일을 업로드하세요
                    </p>
                    <p className="mt-0.5 text-[12px] text-[var(--gray-400)]">
                      자기소개서가 담긴 PDF 파일
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

      {/* Optional job posting */}
      <div className="mt-6">
        <button
          onClick={() => setShowJobInput(!showJobInput)}
          className="flex items-center gap-1.5 text-[13px] font-semibold text-[var(--blue-primary)]"
        >
          <svg
            className={`h-4 w-4 transition-transform ${
              showJobInput ? "rotate-90" : ""
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
          채용공고 추가 (선택)
        </button>

        <AnimatePresence>
          {showJobInput && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="mt-3 space-y-3">
                <div>
                  <label className="mb-1.5 block text-[12px] font-semibold text-[var(--gray-700)]">
                    채용공고 URL
                  </label>
                  <input
                    type="url"
                    value={jobUrl}
                    onChange={(e) => setJobUrl(e.target.value)}
                    placeholder="https://www.wanted.co.kr/wd/..."
                    className="w-full rounded-xl bg-[var(--gray-100)] px-4 py-3 text-[14px] text-[var(--gray-900)] placeholder:text-[var(--gray-400)] focus:outline-none focus:ring-2 focus:ring-[var(--blue-primary)]/20"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[12px] font-semibold text-[var(--gray-700)]">
                    또는 공고 본문 붙여넣기
                  </label>
                  <textarea
                    rows={4}
                    value={jobText}
                    onChange={(e) => setJobText(e.target.value)}
                    placeholder="채용공고 내용을 붙여넣어 주세요"
                    className="w-full resize-none rounded-xl bg-[var(--gray-100)] px-4 py-3 text-[14px] leading-[22px] text-[var(--gray-900)] placeholder:text-[var(--gray-400)] focus:outline-none"
                  />
                </div>
                <p className="text-[11px] text-[var(--gray-400)]">
                  채용공고를 추가하면 직무에 맞춤화된 분석을 받을 수 있어요
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Error */}
      {error && (
        <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-[13px] text-red-600 font-medium">
          {error}
        </div>
      )}

      {/* Navigation */}
      <div className="mt-4 flex gap-2">
        <button
          onClick={() => router.push("/jasoseo/generate")}
          className="rounded-2xl border border-[var(--gray-200)] px-4 py-3 text-[13px] font-semibold text-[var(--gray-700)] transition-colors hover:bg-[var(--gray-50)]"
        >
          자소서 생성
        </button>
      </div>

      {/* Bottom CTA */}
      <div className="pointer-events-none fixed bottom-[88px] left-1/2 w-full max-w-[640px] h-16 -translate-x-1/2 bg-gradient-to-t from-white to-transparent z-40" />
      <div className="fixed bottom-0 left-1/2 w-full max-w-[640px] -translate-x-1/2 bg-white px-5 pb-8 pt-3 border-t border-[var(--gray-200)] z-50">
        <button
          onClick={handleAnalyze}
          disabled={!canSubmit}
          className="w-full rounded-2xl bg-[var(--blue-primary)] py-4 text-[15px] font-bold text-white disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.99] transition-transform"
        >
          {isAnalyzing ? (
            <span className="flex items-center justify-center gap-2">
              <motion.span
                className="inline-block h-4 w-4 rounded-full border-2 border-white/30 border-t-white"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              />
              분석 중...
            </span>
          ) : (
            "자소서 분석하기"
          )}
        </button>
        {activeText.length > 0 && activeText.length < 50 && (
          <p className="mt-2 text-center text-[11px] text-[var(--gray-400)]">
            50자 이상 입력해 주세요 ({activeText.length}/50)
          </p>
        )}
      </div>
    </div>
  );
}

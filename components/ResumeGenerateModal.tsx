// AI 자기소개서 생성 폼과 결과를 보여주는 모달 컴포넌트
"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";

const STORAGE_KEY = "resumeGenerateUsed";

function markUsed(): void {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(STORAGE_KEY, "true"); } catch {}
}

interface Props {
  open: boolean;
  onClose: () => void;
  existingResume?: string;
}

type Step = "form" | "loading" | "result";

export default function ResumeGenerateModal({ open, onClose, existingResume }: Props) {
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState<Step>("form");
  const [position, setPosition] = useState("");
  const [yearsOfExperience, setYearsOfExperience] = useState("");
  const [targetCompany, setTargetCompany] = useState("");
  const [keyExperience, setKeyExperience] = useState("");
  const [result, setResult] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const resultRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!open) {
      // Reset on close (after animation)
      const t = window.setTimeout(() => {
        setStep("form");
        setError(null);
        setResult("");
        setCopied(false);
      }, 300);
      return () => clearTimeout(t);
    }
  }, [open]);

  async function handleGenerate() {
    if (!position.trim()) return;
    setError(null);
    setStep("loading");
    try {
      const res = await fetch("/api/generate-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          position: position.trim(),
          yearsOfExperience: yearsOfExperience.trim() || undefined,
          targetCompany: targetCompany.trim() || undefined,
          keyExperience: keyExperience.trim() || undefined,
          existingResume: existingResume || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "생성 실패");
      markUsed();
      setResult(data.content);
      setStep("result");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "생성에 실패했어요";
      setError(msg);
      setStep("form");
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(result);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-[80] bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Sheet */}
          <div className="pointer-events-none fixed inset-0 z-[81] flex items-end justify-center px-4 pb-4 sm:items-center sm:pb-0">
            <motion.div
              className="pointer-events-auto w-full max-w-[560px] rounded-2xl bg-white flex flex-col max-h-[90dvh]"
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[var(--gray-100)] shrink-0">
                <div>
                  <h2 className="text-[17px] font-extrabold text-[var(--gray-900)]">
                    면접관이 합격시키는 이력서
                  </h2>
                  <p className="text-[12px] text-[var(--gray-500)] mt-0.5">
                    AI 면접관이 직접 코칭한 합격형 자기소개서
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-full hover:bg-[var(--gray-100)] transition-colors"
                >
                  <svg className="h-5 w-5 text-[var(--gray-500)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto px-5 py-4">
                {step === "form" && (
                  <div className="flex flex-col gap-4">
                    {error && (
                      <div className="rounded-xl bg-red-50 px-4 py-3 text-[13px] text-red-600 font-medium">
                        {error}
                      </div>
                    )}

                    <div>
                      <label className="text-[13px] font-semibold text-[var(--gray-900)] mb-1.5 block">
                        지원 직무 <span className="text-[var(--blue-primary)]">*</span>
                      </label>
                      <input
                        type="text"
                        value={position}
                        onChange={(e) => setPosition(e.target.value)}
                        placeholder="예: 프론트엔드 개발자, 마케터, 기획자"
                        className="w-full rounded-xl bg-[var(--gray-100)] px-4 py-3 text-[14px] text-[var(--gray-900)] placeholder:text-[var(--gray-400)] focus:outline-none focus:ring-2 focus:ring-[var(--blue-primary)]/20"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[13px] font-semibold text-[var(--gray-900)] mb-1.5 block">
                          총 경력
                        </label>
                        <input
                          type="text"
                          value={yearsOfExperience}
                          onChange={(e) => setYearsOfExperience(e.target.value)}
                          placeholder="예: 3년, 신입"
                          className="w-full rounded-xl bg-[var(--gray-100)] px-4 py-3 text-[14px] text-[var(--gray-900)] placeholder:text-[var(--gray-400)] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[13px] font-semibold text-[var(--gray-900)] mb-1.5 block">
                          지원 회사
                        </label>
                        <input
                          type="text"
                          value={targetCompany}
                          onChange={(e) => setTargetCompany(e.target.value)}
                          placeholder="예: 카카오, 토스"
                          className="w-full rounded-xl bg-[var(--gray-100)] px-4 py-3 text-[14px] text-[var(--gray-900)] placeholder:text-[var(--gray-400)] focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[13px] font-semibold text-[var(--gray-900)] mb-1.5 block">
                        핵심 경험 및 강점
                      </label>
                      <textarea
                        rows={4}
                        value={keyExperience}
                        onChange={(e) => setKeyExperience(e.target.value)}
                        placeholder="어필하고 싶은 프로젝트, 성과, 역량을 자유롭게 적어주세요.&#10;예: React로 사내 대시보드 개발, MAU 2만 → 8만 성장, 팀 리딩 경험 2년"
                        className="w-full resize-none rounded-xl bg-[var(--gray-100)] px-4 py-3 text-[14px] leading-[21px] text-[var(--gray-900)] placeholder:text-[var(--gray-400)] focus:outline-none focus:ring-2 focus:ring-[var(--blue-primary)]/20"
                      />
                    </div>

                    {existingResume && (
                      <p className="text-[12px] text-[var(--gray-400)] flex items-center gap-1">
                        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        등록된 이력서를 참고해 작성합니다
                      </p>
                    )}
                  </div>
                )}

                {step === "loading" && (
                  <div className="flex flex-col items-center justify-center py-12 gap-4">
                    <div className="relative h-16 w-16">
                      <motion.div
                        className="absolute inset-0 rounded-full border-4 border-[var(--blue-primary)]/20 border-t-[var(--blue-primary)]"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      />
                    </div>
                    <div className="text-center">
                      <p className="text-[15px] font-bold text-[var(--gray-900)]">AI가 자기소개서를 작성하고 있어요</p>
                      <p className="text-[13px] text-[var(--gray-500)] mt-1">보통 10~20초 정도 걸려요</p>
                    </div>
                  </div>
                )}

                {step === "result" && (
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <p className="text-[13px] font-semibold text-[var(--gray-700)]">생성된 자기소개서</p>
                      <button
                        onClick={handleCopy}
                        className="flex items-center gap-1.5 rounded-full bg-[var(--blue-light)] px-3 py-1.5 text-[12px] font-semibold text-[var(--blue-primary)] transition-colors hover:bg-[var(--blue-primary)] hover:text-white"
                      >
                        {copied ? (
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
                    <textarea
                      ref={resultRef}
                      readOnly
                      value={result}
                      rows={14}
                      className="w-full resize-none rounded-xl bg-[var(--gray-100)] px-4 py-3 text-[13px] leading-[21px] text-[var(--gray-700)] focus:outline-none"
                    />
                    <p className="text-[11px] text-[var(--gray-400)] text-center">
                      AI가 생성한 초안입니다. 직접 수정해서 사용하세요.
                    </p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-5 pb-5 pt-3 border-t border-[var(--gray-100)] shrink-0">
                {step === "form" && (
                  <button
                    onClick={handleGenerate}
                    disabled={!position.trim()}
                    className="w-full rounded-2xl bg-[var(--blue-primary)] py-3.5 text-[15px] font-bold text-white disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.99] transition-transform"
                  >
                    자기소개서 생성하기
                  </button>
                )}
                {step === "result" && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setStep("form")}
                      className="flex-1 rounded-2xl border border-[var(--gray-200)] py-3 text-[14px] font-semibold text-[var(--gray-700)]"
                    >
                      다시 생성
                    </button>
                    <button
                      onClick={onClose}
                      className="flex-1 rounded-2xl bg-[var(--blue-primary)] py-3 text-[14px] font-bold text-white active:scale-[0.99] transition-transform"
                    >
                      완료
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}

// 자소서 생성 페이지 — 직무 정보 입력 → AI 자기소개서 생성 (1크레딧)
"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import posthog from "posthog-js";
import { useJasoseo } from "@/contexts/JasoseoContext";

type Step = "form" | "loading" | "result";

export default function JasoseoGeneratePage() {
  const router = useRouter();
  const { setResumeText } = useJasoseo();

  const [step, setStep] = useState<Step>("form");
  const [position, setPosition] = useState("");
  const [yearsOfExperience, setYearsOfExperience] = useState("");
  const [targetCompany, setTargetCompany] = useState("");
  const [keyExperience, setKeyExperience] = useState("");
  const [result, setResult] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const resultRef = useRef<HTMLTextAreaElement>(null);

  async function handleGenerate() {
    if (!position.trim()) return;
    setError(null);
    setStep("loading");
    posthog.capture("jasoseo_generate_requested", { position: position.trim() });
    try {
      const res = await fetch("/api/generate-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          position: position.trim(),
          yearsOfExperience: yearsOfExperience.trim() || undefined,
          targetCompany: targetCompany.trim() || undefined,
          keyExperience: keyExperience.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "insufficient_credits") {
          throw new Error("크레딧이 부족해요. 충전 후 다시 시도해 주세요.");
        }
        throw new Error(data.error ?? "생성 실패");
      }
      posthog.capture("jasoseo_generate_completed");
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

  function handleAnalyzeWithResult() {
    setResumeText(result);
    router.push("/jasoseo");
  }

  return (
    <div className="flex flex-1 flex-col px-5 pt-6 pb-32">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-[22px] font-extrabold text-[var(--gray-900)]">
          자소서 생성
        </h1>
        <p className="mt-1 text-[14px] text-[var(--gray-500)]">
          AI가 합격형 자기소개서를 작성해 드려요
        </p>
      </div>

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
              rows={5}
              value={keyExperience}
              onChange={(e) => setKeyExperience(e.target.value)}
              placeholder="어필하고 싶은 프로젝트, 성과, 역량을 자유롭게 적어주세요.&#10;예: React로 사내 대시보드 개발, MAU 2만 → 8만 성장"
              className="w-full resize-none rounded-xl bg-[var(--gray-100)] px-4 py-3 text-[14px] leading-[21px] text-[var(--gray-900)] placeholder:text-[var(--gray-400)] focus:outline-none focus:ring-2 focus:ring-[var(--blue-primary)]/20"
            />
          </div>
        </div>
      )}

      {step === "loading" && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="relative h-16 w-16">
            <motion.div
              className="absolute inset-0 rounded-full border-4 border-[var(--blue-primary)]/20 border-t-[var(--blue-primary)]"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
          </div>
          <div className="text-center">
            <p className="text-[15px] font-bold text-[var(--gray-900)]">
              AI가 자기소개서를 작성하고 있어요
            </p>
            <p className="text-[13px] text-[var(--gray-500)] mt-1">
              보통 10~20초 정도 걸려요
            </p>
          </div>
        </div>
      )}

      {step === "result" && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-[14px] font-bold text-[var(--gray-900)]">
              생성된 자기소개서
            </p>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 rounded-full bg-[var(--blue-light)] px-3 py-1.5 text-[12px] font-semibold text-[var(--blue-primary)] transition-colors hover:bg-[var(--blue-primary)] hover:text-white"
            >
              {copied ? (
                <>
                  <svg
                    className="h-3.5 w-3.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  복사됨
                </>
              ) : (
                <>
                  <svg
                    className="h-3.5 w-3.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
                    />
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
            rows={16}
            className="w-full resize-none rounded-xl bg-[var(--gray-100)] px-4 py-3 text-[13px] leading-[21px] text-[var(--gray-700)] focus:outline-none"
          />
          <p className="text-[11px] text-[var(--gray-400)] text-center">
            AI가 생성한 초안입니다. 직접 수정해서 사용하세요.
          </p>

          <div className="mt-2 space-y-2">
            <button
              onClick={handleAnalyzeWithResult}
              className="w-full rounded-2xl bg-[var(--blue-primary)] py-3.5 text-[14px] font-bold text-white active:scale-[0.99] transition-transform"
            >
              이 자소서 분석하기
            </button>
            <button
              onClick={() => {
                setStep("form");
                setResult("");
              }}
              className="w-full rounded-2xl border border-[var(--gray-200)] py-3 text-[14px] font-semibold text-[var(--gray-700)]"
            >
              다시 생성하기
            </button>
          </div>
        </div>
      )}

      {/* Bottom CTA for form step */}
      {step === "form" && (
        <>
          <div className="pointer-events-none fixed bottom-[88px] left-1/2 w-full max-w-[640px] h-16 -translate-x-1/2 bg-gradient-to-t from-white to-transparent z-40" />
          <div className="fixed bottom-0 left-1/2 w-full max-w-[640px] -translate-x-1/2 bg-white px-5 pb-8 pt-3 border-t border-[var(--gray-200)] z-50">
            <button
              onClick={handleGenerate}
              disabled={!position.trim()}
              className="w-full rounded-2xl bg-[var(--blue-primary)] py-4 text-[15px] font-bold text-white disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.99] transition-transform"
            >
              자기소개서 생성하기 (1크레딧)
            </button>
          </div>
        </>
      )}
    </div>
  );
}

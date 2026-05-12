// 이력서 생성 페이지 — 이력 정보 입력 → AI 이력서 생성 (1크레딧)
"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import LottieAnimation from "@/components/LottieAnimation";

type Step = "form" | "loading" | "result";

export default function ResumeGeneratePage() {
  const router = useRouter();

  const [step, setStep] = useState<Step>("form");
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [position, setPosition] = useState("");
  const [education, setEducation] = useState("");
  const [experience, setExperience] = useState("");
  const [skills, setSkills] = useState("");
  const [result, setResult] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const resultRef = useRef<HTMLTextAreaElement>(null);

  const canSubmit =
    name.trim().length > 0 &&
    position.trim().length > 0 &&
    experience.trim().length >= 30;

  async function handleGenerate() {
    if (!canSubmit) return;
    setError(null);
    setStep("loading");
    try {
      const res = await fetch("/api/generate-resume-doc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          contact: contact.trim() || undefined,
          position: position.trim(),
          education: education.trim() || undefined,
          experience: experience.trim(),
          skills: skills.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "insufficient_credits") {
          throw new Error("크레딧이 부족해요. 충전 후 다시 시도해 주세요.");
        }
        throw new Error(data.error ?? "생성 실패");
      }
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

  return (
    <div className="flex flex-1 flex-col px-5 pt-6 pb-32">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-[22px] font-extrabold text-[var(--gray-900)]">
          이력서 생성
        </h1>
        <p className="mt-1 text-[14px] text-[var(--gray-500)]">
          지금 바로 사용할 수 있는 깔끔한 이력서를 만들어 드려요
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
              이름 <span className="text-[var(--blue-primary)]">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="홍길동"
              className="w-full rounded-xl bg-[var(--gray-100)] px-4 py-3 text-[14px] text-[var(--gray-900)] placeholder:text-[var(--gray-400)] focus:outline-none focus:ring-2 focus:ring-[var(--blue-primary)]/20"
            />
          </div>

          <div>
            <label className="text-[13px] font-semibold text-[var(--gray-900)] mb-1.5 block">
              연락처
            </label>
            <input
              type="text"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="이메일 또는 전화번호"
              className="w-full rounded-xl bg-[var(--gray-100)] px-4 py-3 text-[14px] text-[var(--gray-900)] placeholder:text-[var(--gray-400)] focus:outline-none"
            />
          </div>

          <div>
            <label className="text-[13px] font-semibold text-[var(--gray-900)] mb-1.5 block">
              지원 직무 <span className="text-[var(--blue-primary)]">*</span>
            </label>
            <input
              type="text"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              placeholder="예: 백엔드 개발자"
              className="w-full rounded-xl bg-[var(--gray-100)] px-4 py-3 text-[14px] text-[var(--gray-900)] placeholder:text-[var(--gray-400)] focus:outline-none focus:ring-2 focus:ring-[var(--blue-primary)]/20"
            />
          </div>

          <div>
            <label className="text-[13px] font-semibold text-[var(--gray-900)] mb-1.5 block">
              학력
            </label>
            <input
              type="text"
              value={education}
              onChange={(e) => setEducation(e.target.value)}
              placeholder="예: 서울대학교 컴퓨터공학과 졸업"
              className="w-full rounded-xl bg-[var(--gray-100)] px-4 py-3 text-[14px] text-[var(--gray-900)] placeholder:text-[var(--gray-400)] focus:outline-none"
            />
          </div>

          <div>
            <label className="text-[13px] font-semibold text-[var(--gray-900)] mb-1.5 block">
              경력 요약 <span className="text-[var(--blue-primary)]">*</span>
            </label>
            <textarea
              rows={8}
              value={experience}
              onChange={(e) => setExperience(e.target.value)}
              placeholder={"경력을 자유롭게 적어주세요.\n\n예:\n- ABC 주식회사 프론트엔드 개발자 (2021.03~현재)\n- XYZ 스타트업 인턴 (2020.06~2020.12)"}
              className="w-full resize-none rounded-xl bg-[var(--gray-100)] px-4 py-3 text-[14px] leading-[21px] text-[var(--gray-900)] placeholder:text-[var(--gray-400)] focus:outline-none focus:ring-2 focus:ring-[var(--blue-primary)]/20"
            />
          </div>

          <div>
            <label className="text-[13px] font-semibold text-[var(--gray-900)] mb-1.5 block">
              보유 기술
            </label>
            <input
              type="text"
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
              placeholder="예: React, TypeScript, Python, AWS"
              className="w-full rounded-xl bg-[var(--gray-100)] px-4 py-3 text-[14px] text-[var(--gray-900)] placeholder:text-[var(--gray-400)] focus:outline-none"
            />
          </div>
        </div>
      )}

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
            AI가 이력서를 작성하고 있어요
          </h2>
          <p className="mt-3 text-[14px] text-[var(--gray-500)] font-medium">
            보통 15~30초 정도 걸려요
          </p>
        </motion.div>
      )}

      {step === "result" && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-[14px] font-bold text-[var(--gray-900)]">
              생성된 이력서
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
                이력서 생성하기 (1크레딧)
              </span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}

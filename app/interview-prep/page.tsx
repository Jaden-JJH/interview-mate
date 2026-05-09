// Step 3/3 — 면접 준비 페이지 (페르소나·시간 선택, 질문 생성 후 면접 진입)
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import StepIndicator from "@/components/StepIndicator";
import LottieAnimation from "@/components/LottieAnimation";
import Toast from "@/components/Toast";
import PaywallModal from "@/components/PaywallModal";
import { useInterview } from "@/contexts/InterviewContext";
import {
  PERSONAS,
  DURATIONS,
  RANDOM_PERSONA_ID,
  resolvePersona,
  DEFAULT_CHARACTER_LOTTIE,
} from "@/lib/personas";

export default function InterviewPrepPage() {
  const router = useRouter();
  const {
    hydrated,
    resume,
    jobPosting,
    setQuestions,
    setDuration,
    setPersona,
    durationMinutes,
    personaId,
  } = useInterview();

  const [selectedDuration, setSelectedDuration] = useState<number>(durationMinutes);
  const [selectedPersonaId, setSelectedPersonaId] = useState<string>(personaId);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [balance, setBalance] = useState<{
    free: number;
    paid: number;
    total: number;
  } | null>(null);

  // Warm next-route chunk while user picks duration / persona.
  useEffect(() => {
    router.prefetch("/interview");
  }, [router]);

  // After context hydrates, sync local selections to whatever the user
  // had picked previously (if anything). Default-only initialization at
  // useState time would otherwise stick on a refresh.
  useEffect(() => {
    if (!hydrated) return;
    setSelectedDuration(durationMinutes);
    setSelectedPersonaId(personaId);
    // intentionally only on hydration transition
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  // Pre-flight: load credit balance so we can short-circuit before the
  // expensive Claude call when the user is already out.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/me/credits", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((b) => {
        if (!cancelled && b) setBalance(b);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Guard: redirect if no job posting / resume. Wait for context hydration
  // — otherwise a refresh bounces to step 2 before stored state lands.
  useEffect(() => {
    if (!hydrated) return;
    if (!resume.trim() || !jobPosting) {
      router.replace("/job-posting");
    }
  }, [hydrated, resume, jobPosting, router]);

  // The "hero" persona: if random selected, show a 🎲 placeholder; else the chosen one
  const heroPersona = useMemo(() => {
    if (selectedPersonaId === RANDOM_PERSONA_ID) return null;
    return resolvePersona(selectedPersonaId);
  }, [selectedPersonaId]);

  const heroAccent = heroPersona?.accentColor ?? "#374151";

  const handleStart = async () => {
    if (!resume.trim() || !jobPosting) {
      setErrorMsg("이전 단계의 정보가 없어요.");
      return;
    }

    if (balance && balance.total < 1) {
      setPaywallOpen(true);
      return;
    }

    const finalPersona =
      selectedPersonaId === RANDOM_PERSONA_ID
        ? resolvePersona(RANDOM_PERSONA_ID)
        : resolvePersona(selectedPersonaId);

    setDuration(selectedDuration);
    setPersona(selectedPersonaId, finalPersona.id);

    const jobPostingText = [
      `회사: ${jobPosting.company}`,
      `포지션: ${jobPosting.position}`,
      `자격 요건: ${jobPosting.requirements}`,
      jobPosting.preferredQualifications
        ? `우대사항: ${jobPosting.preferredQualifications}`
        : "",
      `설명: ${jobPosting.description}`,
    ]
      .filter(Boolean)
      .join("\n");

    setIsGenerating(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/generate-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resume,
          jobPosting: jobPostingText,
          durationMinutes: selectedDuration,
          personaId: finalPersona.id,
        }),
      });
      if (res.status === 402) {
        setPaywallOpen(true);
        setIsGenerating(false);
        return;
      }
      const data = await res.json();
      if (!res.ok || !Array.isArray(data.questions)) {
        throw new Error(data.error ?? "질문 생성 실패");
      }
      setQuestions(data.questions);
      if (data.balance) setBalance(data.balance);
      if (typeof data.resolvedPersonaId === "string") {
        setPersona(selectedPersonaId, data.resolvedPersonaId);
      }
      router.push("/interview");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "질문 생성 실패";
      setErrorMsg(msg);
      setIsGenerating(false);
    }
  };

  const isRandom = selectedPersonaId === RANDOM_PERSONA_ID;

  return (
    <motion.div
      className="flex min-h-dvh flex-col bg-white"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Top */}
      <div className="bg-white">
        <StepIndicator currentStep={3} totalSteps={3} />
        <div className="flex items-center px-5 pt-3 pb-1">
          <button onClick={() => router.back()} className="mr-3 p-1">
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
        </div>
        <div className="px-5 pt-2 pb-4">
          <h1 className="text-[22px] font-bold text-[var(--gray-900)] leading-tight">
            오늘은 누구와 면접을 볼까요?
          </h1>
          <p className="mt-1.5 text-[14px] text-[var(--gray-500)]">
            면접관과 시간을 골라 주세요
          </p>
        </div>
      </div>

      {/* Hero — changes color/character per selected persona */}
      <motion.div
        key={heroPersona?.id ?? "random"}
        initial={{ opacity: 0.4 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="relative mx-5 rounded-3xl overflow-hidden shadow-md"
        style={{ backgroundColor: heroAccent }}
      >
        <div className="absolute inset-0 z-0 opacity-70 mix-blend-screen pointer-events-none">
          <LottieAnimation
            src="/lottie/Fixed Blur.json"
            className="w-[200%] h-[200%] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          />
        </div>
        <div
          className="absolute inset-0 z-10 pointer-events-none"
          style={{
            background: `linear-gradient(to bottom, transparent, ${heroAccent}88)`,
          }}
        />

        <div className="relative z-20 flex flex-col items-center justify-center text-white py-7 px-5 min-h-[260px]">
          {isRandom ? (
            <div className="flex flex-col items-center justify-center">
              <div className="w-32 h-32 flex items-center justify-center text-[80px] mb-3 select-none">
                🎲
              </div>
              <h2 className="text-[18px] font-bold drop-shadow">
                랜덤 매칭
              </h2>
              <p className="mt-1 text-[13px] text-white/80">
                시작 시 무작위로 면접관을 정해드려요
              </p>
            </div>
          ) : heroPersona ? (
            <>
              <div className="w-32 h-32 flex items-center justify-center pointer-events-none mb-2 overflow-hidden">
                <div
                  className="w-full h-full origin-center"
                  style={{ transform: `scale(${heroPersona.heroScale})` }}
                >
                  <LottieAnimation
                    src={heroPersona.characterLottie}
                    fallbackSrc={DEFAULT_CHARACTER_LOTTIE}
                    className="w-full h-full"
                    playing
                  />
                </div>
              </div>
              <h2 className="text-[18px] font-bold drop-shadow text-center">
                {heroPersona.name}
              </h2>
              <p className="mt-2 text-[12px] text-white/90 font-medium bg-black/40 px-3 py-1 rounded-full backdrop-blur-md">
                {heroPersona.speakingLine || heroPersona.tagline}
              </p>
            </>
          ) : null}
        </div>
      </motion.div>

      {/* Carousel */}
      <div className="px-5 mt-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[13px] font-semibold text-[var(--gray-700)]">
            면접관 선택
          </span>
          <button
            onClick={() => setSelectedPersonaId(RANDOM_PERSONA_ID)}
            className={`text-[12px] font-medium px-2.5 py-1 rounded-full transition-colors ${
              isRandom
                ? "bg-[var(--blue-primary)] text-white"
                : "bg-[var(--gray-100)] text-[var(--gray-500)] active:scale-[0.97]"
            }`}
          >
            🎲 랜덤 매칭
          </button>
        </div>

        <div
          className="-mx-5 px-5 flex gap-3 overflow-x-auto pb-1 snap-x snap-mandatory"
          style={{ scrollbarWidth: "none" }}
        >
          {PERSONAS.map((p) => {
            const active = selectedPersonaId === p.id;
            return (
              <button
                key={p.id}
                onClick={() => setSelectedPersonaId(p.id)}
                className={`shrink-0 snap-start w-[140px] rounded-2xl p-4 text-left transition-all border-2 ${
                  active
                    ? "border-[var(--blue-primary)] shadow-sm"
                    : "border-transparent bg-[var(--gray-100)] active:scale-[0.97]"
                }`}
                style={
                  active
                    ? {
                        background: `linear-gradient(135deg, ${p.accentColor}10, ${p.accentColor}25)`,
                      }
                    : undefined
                }
              >
                <div
                  className="flex h-16 w-16 items-center justify-center rounded-xl mb-2 overflow-hidden"
                  style={{ backgroundColor: `${p.accentColor}1A` }}
                >
                  <div
                    className="w-full h-full origin-center"
                    style={{ transform: `scale(${p.cardScale})` }}
                  >
                    <LottieAnimation
                      src={p.characterLottie}
                      fallbackSrc={DEFAULT_CHARACTER_LOTTIE}
                      className="w-full h-full"
                      playing={active}
                    />
                  </div>
                </div>
                <p className="text-[13px] font-bold text-[var(--gray-900)] leading-tight">
                  {p.shortName}
                </p>
                <p className="mt-1 text-[11px] leading-[15px] text-[var(--gray-500)]">
                  {p.tagline}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Duration */}
      <div className="px-5 mt-6 mb-28">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[13px] font-semibold text-[var(--gray-700)]">
            면접 시간
          </span>
          <span className="text-[12px] text-[var(--gray-400)]">
            카운트다운 진행
          </span>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {DURATIONS.map((d) => {
            const active = d.minutes === selectedDuration;
            return (
              <button
                key={d.minutes}
                onClick={() => setSelectedDuration(d.minutes)}
                className={`flex flex-col items-center justify-center rounded-xl py-3 transition-all ${
                  active
                    ? "bg-[var(--blue-primary)] text-white shadow-sm"
                    : "bg-[var(--gray-100)] text-[var(--gray-700)] active:scale-[0.97]"
                }`}
              >
                <span className="text-[15px] font-bold">{d.label}</span>
                <span
                  className={`text-[11px] mt-0.5 ${
                    active ? "text-white/80" : "text-[var(--gray-400)]"
                  }`}
                >
                  {d.desc}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Generating overlay */}
      <AnimatePresence>
        {isGenerating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-y-0 left-1/2 -translate-x-1/2 w-full max-w-[640px] z-[100] bg-white flex flex-col items-center justify-center px-6"
          >
            <div className="w-44 h-44 flex items-center justify-center">
              <LottieAnimation
                src="/lottie/Sparkles Loop Loader ai.json"
                className="w-full h-full object-contain"
              />
            </div>
            <h2 className="mt-1 text-[20px] font-extrabold text-[var(--gray-900)] tracking-tight text-center">
              맞춤 질문을 생성하고 있어요
            </h2>
            <p className="mt-3 text-[14px] text-[var(--gray-500)] font-medium">
              잠시만 기다려 주세요
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <Toast
        message={errorMsg && !isGenerating ? errorMsg : null}
        onClose={() => setErrorMsg(null)}
      />

      <PaywallModal
        open={paywallOpen}
        onClose={() => setPaywallOpen(false)}
        freeRemaining={balance?.free}
        paidRemaining={balance?.paid}
      />

      {/* Floating fade gradient */}
      <div className="pointer-events-none fixed bottom-[88px] left-1/2 w-full max-w-[640px] h-16 -translate-x-1/2 bg-gradient-to-t from-white to-transparent z-40" />

      {/* Bottom CTA */}
      <div className="fixed bottom-0 left-1/2 w-full max-w-[640px] -translate-x-1/2 bg-white px-5 pb-8 pt-3 border-t border-[var(--gray-200)] z-50">
        <button
          disabled={isGenerating}
          onClick={handleStart}
          className={`w-full rounded-2xl py-[16px] text-[16px] font-bold transition-all ${
            isGenerating
              ? "bg-[var(--gray-200)] text-[var(--gray-400)] cursor-not-allowed"
              : "bg-[var(--blue-primary)] text-white active:scale-[0.98]"
          }`}
        >
          {isGenerating ? "질문 생성 중..." : "면접 시작하기"}
        </button>
      </div>
    </motion.div>
  );
}

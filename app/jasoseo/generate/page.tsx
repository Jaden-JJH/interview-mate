// 자소서 생성 페이지 — 마이크로 스텝 위저드 (칩 멀티셀렉트 + 직접 입력) → 자기소개서 (1크레딧)
"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import posthog from "posthog-js";
import { useJasoseo } from "@/contexts/JasoseoContext";
import LottieAnimation from "@/components/LottieAnimation";
import PaywallModal from "@/components/PaywallModal";
import { exportAsWord, exportAsPDF } from "@/lib/export-document";

type PageStep = "form" | "loading" | "result";

const POSITION_PRESETS = [
  "프론트엔드 개발자", "백엔드 개발자", "풀스택 개발자", "iOS 개발자", "Android 개발자",
  "DevOps 엔지니어", "데이터 엔지니어", "데이터 분석가", "데이터 사이언티스트", "ML 엔지니어",
  "PM / PO", "서비스 기획자", "UX 디자이너", "UI 디자이너", "프로덕트 디자이너",
  "QA 엔지니어", "보안 엔지니어", "클라우드 엔지니어", "DBA", "임베디드 개발자",
  "게임 개발자", "블록체인 개발자", "마케팅 매니저", "콘텐츠 마케터", "그로스 해커",
  "HR 매니저", "경영기획", "영업 매니저", "CS 매니저", "재무/회계",
];

const EXPERIENCE_OPTIONS = ["신입", "1~3년", "3~5년", "5~7년", "7~10년", "10년+"];

const MOTIVATION_OPTIONS = [
  "회사 비전/미션 공감", "기술 스택 매력", "성장 가능성",
  "사업 분야 관심", "기업 문화", "글로벌 사업", "사회적 가치",
];

const STRENGTH_OPTIONS = [
  "리더십", "문제해결", "커뮤니케이션", "기술 전문성",
  "프로젝트 관리", "데이터 분석", "창의성", "팀워크", "자기주도",
];

const ASPIRATION_OPTIONS = [
  "기술 전문가로 성장", "팀 리더로 발전",
  "신사업/신규 서비스 기여", "해외 시장 진출",
];

interface MicroStep {
  id: string;
  question: string;
  cheer: string;
  required?: boolean;
  label: string;
}

const MICRO_STEPS: MicroStep[] = [
  { id: "position", question: "지원 직무를 입력해주세요", cheer: "시작이 반이에요!", required: true, label: "지원 직무" },
  { id: "experience", question: "총 경력이 어떻게 되나요?", cheer: "좋아요!", label: "총 경력" },
  { id: "company", question: "어떤 회사에 지원하나요?", cheer: "목표가 분명하네요!", label: "지원 회사" },
  { id: "motivation", question: "지원 동기의 방향을 골라주세요", cheer: "방향이 중요해요!", label: "지원 동기 방향" },
  { id: "strengths", question: "어필하고 싶은 역량을 골라주세요", cheer: "강점을 보여줘요!", label: "어필 역량" },
  { id: "keyExperience", question: "대표 경험을 간단히 적어주세요", cheer: "거의 다 왔어요!", label: "대표 경험" },
  { id: "aspiration", question: "입사 후 어떤 모습을 그리나요?", cheer: "마지막이에요!", label: "입사 후 포부" },
  { id: "review", question: "입력한 내용을 확인하세요", cheer: "완벽해요! 확인하고 생성하세요", label: "" },
];

export default function JasoseoGeneratePage() {
  const router = useRouter();
  const { setResumeText } = useJasoseo();

  const [pageStep, setPageStep] = useState<PageStep>("form");
  const [micro, setMicro] = useState(0);

  const [position, setPosition] = useState("");
  const [positionOpen, setPositionOpen] = useState(false);
  const positionRef = useRef<HTMLDivElement>(null);
  const [experience, setExperience] = useState("");
  const [company, setCompany] = useState("");
  const [motivation, setMotivation] = useState<string[]>([]);
  const [motivationCustom, setMotivationCustom] = useState("");
  const [showMotivationInput, setShowMotivationInput] = useState(false);
  const [strengths, setStrengths] = useState<string[]>([]);
  const [strengthsCustom, setStrengthsCustom] = useState("");
  const [showStrengthsInput, setShowStrengthsInput] = useState(false);
  const [keyExperience, setKeyExperience] = useState("");
  const [aspiration, setAspiration] = useState<string[]>([]);
  const [aspirationCustom, setAspirationCustom] = useState("");
  const [showAspirationInput, setShowAspirationInput] = useState(false);

  const [result, setResult] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const resultRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (positionRef.current && !positionRef.current.contains(e.target as Node)) {
        setPositionOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isReview = micro === MICRO_STEPS.length - 1;
  const currentStep = MICRO_STEPS[micro];
  const canGenerate = position.trim().length > 0;

  function getStepValue(id: string): string {
    switch (id) {
      case "position": return position;
      case "experience": return experience;
      case "company": return company;
      case "motivation": return motivation.join(", ");
      case "strengths": return strengths.join(", ");
      case "keyExperience": return keyExperience;
      case "aspiration": return aspiration.join(", ");
      default: return "";
    }
  }

  function canProceed(): boolean {
    const step = MICRO_STEPS[micro];
    if (step.required) {
      if (step.id === "position") return position.trim().length > 0;
    }
    return true;
  }

  function handleNext() {
    if (micro < MICRO_STEPS.length - 1) setMicro(micro + 1);
  }

  function handlePrev() {
    if (micro > 0) setMicro(micro - 1);
  }

  function handleSkipToReview() {
    setMicro(MICRO_STEPS.length - 1);
  }

  function toggleChip(arr: string[], setArr: (v: string[]) => void, value: string) {
    setArr(arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value]);
  }

  function addCustomChip(arr: string[], setArr: (v: string[]) => void, value: string, setCustom: (v: string) => void, setShow: (v: boolean) => void) {
    const trimmed = value.trim();
    if (trimmed && !arr.includes(trimmed)) {
      setArr([...arr, trimmed]);
    }
    setCustom("");
    setShow(false);
  }

  async function handleGenerate() {
    if (!canGenerate) return;
    setError(null);
    setPageStep("loading");
    posthog.capture("jasoseo_generate_requested", { position: position.trim() });

    const emphasisParts = [
      motivation.length > 0 ? `지원 동기 방향: ${motivation.join(", ")}` : null,
      strengths.length > 0 ? `어필 역량: ${strengths.join(", ")}` : null,
      aspiration.length > 0 ? `입사 후 포부 방향: ${aspiration.join(", ")}` : null,
    ].filter(Boolean).join("\n");

    try {
      const res = await fetch("/api/generate-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          position: position.trim(),
          yearsOfExperience: experience || undefined,
          targetCompany: company.trim() || undefined,
          keyExperience: keyExperience.trim() || undefined,
          emphasis: emphasisParts || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "insufficient_credits") { setPageStep("form"); setShowPaywall(true); return; }
        throw new Error(data.error ?? "생성 실패");
      }
      posthog.capture("jasoseo_generate_completed");
      setResult(data.content);
      setPageStep("result");
    } catch (err) {
      setError(err instanceof Error ? err.message : "생성에 실패했어요");
      setPageStep("form");
    }
  }

  async function handleCopy() {
    try { await navigator.clipboard.writeText(result); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
  }

  function handleAnalyzeWithResult() {
    setResumeText(result);
    router.push("/jasoseo/analyze");
  }

  const inputCls = "w-full rounded-xl bg-[var(--gray-100)] px-4 py-3 text-[14px] text-[var(--gray-900)] placeholder:text-[var(--gray-400)] focus:outline-none focus:ring-2 focus:ring-[var(--blue-primary)]/20";

  function renderChipSelect(options: string[], selected: string[], setSelected: (v: string[]) => void, customValue: string, setCustomValue: (v: string) => void, showInput: boolean, setShowInput: (v: boolean) => void, placeholder: string) {
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {options.map((opt) => {
            const isSelected = selected.includes(opt);
            return (
              <button key={opt} type="button" onClick={() => toggleChip(selected, setSelected, opt)}
                className={`rounded-full px-4 py-2 text-[13px] font-semibold transition-all ${
                  isSelected
                    ? "bg-[var(--blue-primary)] text-white"
                    : "bg-[var(--gray-100)] text-[var(--gray-700)] hover:bg-[var(--gray-200)]"
                }`}>
                {opt}
              </button>
            );
          })}
          {selected.filter((s) => !options.includes(s)).map((custom) => (
            <button key={custom} type="button" onClick={() => toggleChip(selected, setSelected, custom)}
              className="rounded-full px-4 py-2 text-[13px] font-semibold bg-[var(--blue-primary)] text-white flex items-center gap-1.5">
              {custom}
              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          ))}
          {!showInput ? (
            <button type="button" onClick={() => setShowInput(true)}
              className="rounded-full px-4 py-2 text-[13px] font-semibold border-2 border-dashed border-[var(--gray-300)] text-[var(--gray-500)] hover:border-[var(--blue-primary)] hover:text-[var(--blue-primary)] transition-colors">
              + 직접 입력
            </button>
          ) : (
            <div className="flex items-center gap-2 w-full mt-1">
              <input type="text" autoFocus value={customValue} onChange={(e) => setCustomValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomChip(selected, setSelected, customValue, setCustomValue, setShowInput); } }}
                placeholder={placeholder}
                className="flex-1 rounded-xl bg-[var(--gray-100)] px-4 py-2.5 text-[13px] text-[var(--gray-900)] placeholder:text-[var(--gray-400)] focus:outline-none focus:ring-2 focus:ring-[var(--blue-primary)]/20" />
              <button type="button"
                onClick={() => addCustomChip(selected, setSelected, customValue, setCustomValue, setShowInput)}
                disabled={!customValue.trim()}
                className="shrink-0 rounded-xl bg-[var(--blue-primary)] px-3 py-2.5 text-[13px] font-semibold text-white disabled:opacity-40">
                추가
              </button>
            </div>
          )}
        </div>
        <p className="text-[12px] text-[var(--gray-400)]">
          여러 개 선택할 수 있어요. 비워두고 넘어가도 괜찮아요.
        </p>
      </div>
    );
  }

  function renderInput(id: string) {
    switch (id) {
      case "position":
        return (
          <div className="relative" ref={positionRef}>
            <input type="text" value={position}
              onChange={(e) => { setPosition(e.target.value); setPositionOpen(true); }}
              onFocus={() => setPositionOpen(true)}
              placeholder="입력하거나 선택하세요" className={inputCls} autoFocus />
            {positionOpen && (() => {
              const q = position.trim().toLowerCase();
              const filtered = q ? POSITION_PRESETS.filter((p) => p.toLowerCase().includes(q)) : POSITION_PRESETS;
              const exactMatch = POSITION_PRESETS.some((p) => p.toLowerCase() === q);
              const showCustom = q.length > 0 && !exactMatch;
              if (filtered.length === 0 && !showCustom) return null;
              return (
                <div className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-[var(--gray-200)] bg-white shadow-lg">
                  {showCustom && (
                    <button type="button"
                      onClick={() => { setPositionOpen(false); }}
                      className="w-full text-left px-4 py-2.5 text-[13px] text-[var(--blue-primary)] font-semibold hover:bg-[var(--blue-light)] border-b border-[var(--gray-100)]">
                      {position.trim()} <span className="text-[var(--gray-400)] font-normal">(직접 입력)</span>
                    </button>
                  )}
                  {filtered.map((preset) => (
                    <button key={preset} type="button"
                      onClick={() => { setPosition(preset); setPositionOpen(false); }}
                      className="w-full text-left px-4 py-2.5 text-[13px] text-[var(--gray-900)] hover:bg-[var(--gray-50)]">
                      {preset}
                    </button>
                  ))}
                </div>
              );
            })()}
          </div>
        );
      case "experience":
        return (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              {EXPERIENCE_OPTIONS.map((opt) => (
                <button key={opt} type="button"
                  onClick={() => setExperience(experience === opt ? "" : opt)}
                  className={`rounded-full px-5 py-2.5 text-[13px] font-semibold transition-all ${
                    experience === opt
                      ? "bg-[var(--blue-primary)] text-white"
                      : "bg-[var(--gray-100)] text-[var(--gray-700)] hover:bg-[var(--gray-200)]"
                  }`}>
                  {opt}
                </button>
              ))}
            </div>
            <p className="text-[12px] text-[var(--gray-400)]">선택사항이에요. 비워두고 넘어가도 괜찮아요.</p>
          </div>
        );
      case "company":
        return (
          <div>
            <input type="text" value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="예: 카카오, 토스, 네이버" className={inputCls} autoFocus />
            <p className="mt-2 text-[12px] text-[var(--gray-400)]">입력하면 기업 정보를 자동 반영해요. 비워두고 넘어가도 괜찮아요.</p>
          </div>
        );
      case "motivation":
        return renderChipSelect(MOTIVATION_OPTIONS, motivation, setMotivation, motivationCustom, setMotivationCustom, showMotivationInput, setShowMotivationInput, "예: 워라밸, 복지, 연봉");
      case "strengths":
        return renderChipSelect(STRENGTH_OPTIONS, strengths, setStrengths, strengthsCustom, setStrengthsCustom, showStrengthsInput, setShowStrengthsInput, "예: 해외 경험, 특허 보유");
      case "keyExperience":
        return (
          <div>
            <textarea rows={3} value={keyExperience}
              onChange={(e) => setKeyExperience(e.target.value)}
              placeholder={"프로젝트명 + 핵심 성과 한 줄이면 충분해요.\n예: 결제 시스템 MSA 전환으로 장애율 90% 감소"}
              className="w-full resize-none rounded-xl bg-[var(--gray-100)] px-4 py-3 text-[14px] leading-[21px] text-[var(--gray-900)] placeholder:text-[var(--gray-400)] focus:outline-none focus:ring-2 focus:ring-[var(--blue-primary)]/20"
              autoFocus />
            <p className="mt-2 text-[12px] text-[var(--gray-400)]">선택사항이에요. 비워두면 직무와 경력 기반으로 자동 작성돼요.</p>
          </div>
        );
      case "aspiration":
        return renderChipSelect(ASPIRATION_OPTIONS, aspiration, setAspiration, aspirationCustom, setAspirationCustom, showAspirationInput, setShowAspirationInput, "예: CTO를 목표로, 사내 스터디 리드");
      default:
        return null;
    }
  }

  return (
    <div className="flex flex-1 flex-col px-5 pt-6 pb-32">
      {/* Back + Header */}
      <button onClick={() => router.push("/jasoseo")}
        className="mb-3 flex items-center gap-1 text-[13px] font-semibold text-[var(--gray-500)]">
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
        자소서메이트
      </button>
      <div className="mb-6">
        <h1 className="text-[22px] font-extrabold text-[var(--gray-900)]">자소서 생성</h1>
        <p className="mt-1 text-[14px] text-[var(--gray-500)]">합격형 자기소개서를 작성해 드려요</p>
      </div>

      {/* ===== FORM (micro-step wizard) ===== */}
      {pageStep === "form" && (
        <>
          {error && (
            <div className="rounded-xl bg-red-50 px-4 py-3 text-[13px] text-red-600 font-medium mb-4">{error}</div>
          )}

          {!isReview ? (
            <div className="flex-1">
              {/* Completed steps (faded) */}
              <div className="space-y-2 mb-4">
                {MICRO_STEPS.slice(0, micro).map((s) => {
                  const val = getStepValue(s.id);
                  if (!val) return null;
                  return (
                    <button key={s.id} type="button" onClick={() => setMicro(MICRO_STEPS.indexOf(s))}
                      className="flex items-center justify-between w-full text-left px-3 py-2 rounded-xl opacity-45 hover:opacity-70 transition-opacity bg-[var(--gray-50)]">
                      <span className="text-[12px] text-[var(--gray-500)] shrink-0 mr-2">{s.label}</span>
                      <span className="text-[13px] text-[var(--gray-700)] font-medium truncate">{val}</span>
                    </button>
                  );
                })}
              </div>

              {/* Current step */}
              <AnimatePresence mode="wait">
                <motion.div key={micro}
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}>
                  <p className="text-[13px] font-semibold text-[var(--blue-primary)] mb-1">{currentStep.cheer}</p>
                  <h2 className="text-[20px] font-extrabold text-[var(--gray-900)] mb-4">{currentStep.question}</h2>
                  {renderInput(currentStep.id)}
                </motion.div>
              </AnimatePresence>
            </div>
          ) : (
            /* ===== REVIEW STEP ===== */
            <div className="flex-1">
              <p className="text-[13px] font-semibold text-[var(--blue-primary)] mb-1">{currentStep.cheer}</p>
              <h2 className="text-[20px] font-extrabold text-[var(--gray-900)] mb-4">{currentStep.question}</h2>

              {/* Summary card */}
              <div className="rounded-2xl border border-[var(--gray-200)] p-4 space-y-3 mb-4">
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "직무", value: position },
                    { label: "경력", value: experience || "—" },
                    { label: "회사", value: company || "—" },
                  ].map((item) => (
                    <div key={item.label} className="text-center">
                      <p className="text-[11px] text-[var(--gray-500)]">{item.label}</p>
                      <p className="text-[13px] font-bold text-[var(--gray-900)] truncate">{item.value}</p>
                    </div>
                  ))}
                </div>

                {motivation.length > 0 && (
                  <div className="border-t border-[var(--gray-100)] pt-2">
                    <p className="text-[11px] text-[var(--gray-500)] mb-1">지원 동기 방향</p>
                    <div className="flex flex-wrap gap-1">
                      {motivation.map((m) => (
                        <span key={m} className="rounded-full bg-[var(--blue-light)] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--blue-primary)]">{m}</span>
                      ))}
                    </div>
                  </div>
                )}

                {strengths.length > 0 && (
                  <div className="border-t border-[var(--gray-100)] pt-2">
                    <p className="text-[11px] text-[var(--gray-500)] mb-1">어필 역량</p>
                    <div className="flex flex-wrap gap-1">
                      {strengths.map((s) => (
                        <span key={s} className="rounded-full bg-[var(--blue-light)] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--blue-primary)]">{s}</span>
                      ))}
                    </div>
                  </div>
                )}

                {keyExperience && (
                  <div className="border-t border-[var(--gray-100)] pt-2">
                    <p className="text-[11px] text-[var(--gray-500)] mb-1">대표 경험</p>
                    <p className="text-[12px] text-[var(--gray-700)]">{keyExperience}</p>
                  </div>
                )}

                {aspiration.length > 0 && (
                  <div className="border-t border-[var(--gray-100)] pt-2">
                    <p className="text-[11px] text-[var(--gray-500)] mb-1">입사 후 포부</p>
                    <div className="flex flex-wrap gap-1">
                      {aspiration.map((a) => (
                        <span key={a} className="rounded-full bg-[var(--blue-light)] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--blue-primary)]">{a}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* ===== LOADING ===== */}
      {pageStep === "loading" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="fixed inset-y-0 left-1/2 -translate-x-1/2 w-full max-w-[640px] z-[100] bg-white flex flex-col items-center justify-center px-6">
          <div className="w-44 h-44 flex items-center justify-center">
            <LottieAnimation src="/lottie/Sparkles Loop Loader ai.json" className="w-full h-full object-contain" />
          </div>
          <h2 className="mt-1 text-[20px] font-extrabold text-[var(--gray-900)] tracking-tight text-center">
            자기소개서를 작성하고 있어요
          </h2>
          <p className="mt-3 text-[14px] text-[var(--gray-500)] font-medium">보통 10~20초 정도 걸려요</p>
        </motion.div>
      )}

      {/* ===== RESULT ===== */}
      {pageStep === "result" && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-[14px] font-bold text-[var(--gray-900)]">생성된 자기소개서</p>
            <button onClick={handleCopy}
              className="flex items-center gap-1.5 rounded-full bg-[var(--blue-light)] px-3 py-1.5 text-[12px] font-semibold text-[var(--blue-primary)] transition-colors hover:bg-[var(--blue-primary)] hover:text-white">
              {copied ? (
                <><svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>복사됨</>
              ) : (
                <><svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>전체 복사</>
              )}
            </button>
          </div>
          <textarea ref={resultRef} readOnly value={result} rows={16}
            className="w-full resize-none rounded-xl bg-[var(--gray-100)] px-4 py-3 text-[13px] leading-[21px] text-[var(--gray-700)] focus:outline-none" />
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button onClick={() => exportAsPDF(result, "자기소개서")}
              className="flex items-center justify-center gap-1.5 rounded-2xl bg-[var(--gray-900)] py-3 text-[14px] font-semibold text-white active:scale-[0.99] transition-transform">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" />
                <line x1="12" y1="18" x2="12" y2="12" /><polyline points="9 15 12 18 15 15" />
              </svg>PDF 저장
            </button>
            <button onClick={() => exportAsWord(result, "자기소개서")}
              className="flex items-center justify-center gap-1.5 rounded-2xl bg-[var(--blue-primary)] py-3 text-[14px] font-semibold text-white active:scale-[0.99] transition-transform">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" />
                <line x1="12" y1="18" x2="12" y2="12" /><polyline points="9 15 12 18 15 15" />
              </svg>Word 저장
            </button>
          </div>
          <div className="space-y-2">
            <button onClick={handleAnalyzeWithResult}
              className="w-full rounded-2xl bg-[var(--blue-primary)] py-3.5 text-[14px] font-bold text-white active:scale-[0.99] transition-transform">
              이 자소서 분석하기
            </button>
            <button onClick={() => { setPageStep("form"); setMicro(0); setResult(""); }}
              className="w-full rounded-2xl border border-[var(--gray-200)] py-3 text-[14px] font-semibold text-[var(--gray-700)]">
              다시 생성하기
            </button>
          </div>
        </div>
      )}

      {/* ===== BOTTOM NAV ===== */}
      {pageStep === "form" && (
        <>
          <div className="pointer-events-none fixed bottom-[88px] left-1/2 w-full max-w-[640px] h-16 -translate-x-1/2 bg-gradient-to-t from-white to-transparent z-40" />
          <div className="fixed bottom-0 left-1/2 w-full max-w-[640px] -translate-x-1/2 bg-white px-5 pb-8 pt-3 border-t border-[var(--gray-200)] z-50">
            {isReview ? (
              <button onClick={handleGenerate} disabled={!canGenerate}
                className="group relative w-full overflow-hidden rounded-2xl p-[1.5px] disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.99] transition-transform">
                <span aria-hidden
                  className="absolute inset-[-1000%] animate-[premiumSpin_3s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#1B64DA_0%,#7C5CFF_25%,#E2CBFF_50%,#7C5CFF_75%,#1B64DA_100%)]" />
                <span className="relative flex w-full items-center justify-center gap-2 rounded-[14px] bg-[var(--gray-900)] py-4 text-[15px] font-bold text-white">
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 3l1.9 4.6L19 9.5l-4 3.9.9 5.6L12 16.4 8.1 19l.9-5.6-4-3.9 5.1-1.9z" />
                  </svg>
                  자소서 생성하기
                  <span className="inline-flex items-center rounded-full bg-white/15 pl-0.5 pr-1.5 py-[1px]">
                    <LottieAnimation src="/lottie/Coin.json" loop={false} autoplay={false} className="h-4 w-4" />
                    <span className="text-[11px] font-semibold text-white/90">1</span>
                  </span>
                </span>
              </button>
            ) : (
              <div className="flex gap-2">
                {micro > 0 && (
                  <button onClick={handlePrev}
                    className="rounded-2xl border border-[var(--gray-200)] px-5 py-3.5 text-[14px] font-semibold text-[var(--gray-700)]">
                    이전
                  </button>
                )}
                {micro >= 3 && (
                  <button onClick={handleSkipToReview}
                    className="rounded-2xl border border-[var(--gray-200)] px-4 py-3.5 text-[13px] font-semibold text-[var(--gray-500)]">
                    바로 생성
                  </button>
                )}
                <button onClick={handleNext} disabled={!canProceed()}
                  className="flex-1 rounded-2xl bg-[var(--blue-primary)] py-3.5 text-[14px] font-bold text-white disabled:opacity-40 active:scale-[0.99] transition-transform">
                  다음
                </button>
              </div>
            )}
          </div>
        </>
      )}

      <PaywallModal open={showPaywall} onClose={() => setShowPaywall(false)} />
    </div>
  );
}

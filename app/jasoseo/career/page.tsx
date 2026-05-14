// 경력기술서 생성 페이지 — 마이크로 스텝 위저드 (필드 1개씩) + STAR 샘플 가이드 → 3~5장 (1크레딧) + 언어 선택
"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import LottieAnimation from "@/components/LottieAnimation";
import PaywallModal from "@/components/PaywallModal";
import { exportAsWord, exportAsPDF } from "@/lib/export-document";

type PageStep = "form" | "loading" | "result";

interface Project {
  name: string;
  role: string;
  period: string;
  situation: string;
  challenge: string;
  action: string;
  result: string;
  lesson: string;
}

function emptyProject(): Project {
  return { name: "", role: "", period: "", situation: "", challenge: "", action: "", result: "", lesson: "" };
}

function projectFilled(p: Project): boolean {
  return p.name.trim().length > 0;
}

const SAMPLES = {
  situation: "레거시 결제 모듈의 장애율이 월 평균 5건 발생하며, CS 인입이 전월 대비 40% 급증한 상황이었습니다.",
  challenge: "장애율 0건 달성과 동시에 결제 전환율을 기존 3.1%에서 3.5% 이상으로 개선하는 것이 목표였습니다.",
  action: "결제 모듈을 MSA 구조로 전환하고, PG사 이중화 게이트웨이를 구축했습니다. 실시간 모니터링 대시보드를 만들어 장애 감지 시간을 5분 → 30초로 단축했습니다.",
  result: "장애율 90% 감소 (월 5건 → 0.5건), 결제 전환율 4.2% 달성, CS 인입 60% 감소",
  lesson: "대규모 트래픽 환경에서의 시스템 설계 역량을 확보했고, 장애 대응 프로세스 체계화의 중요성을 배웠습니다.",
};

const POSITION_PRESETS = [
  "프론트엔드 개발자", "백엔드 개발자", "풀스택 개발자", "iOS 개발자", "Android 개발자",
  "DevOps 엔지니어", "데이터 엔지니어", "데이터 분석가", "데이터 사이언티스트", "ML 엔지니어",
  "PM / PO", "서비스 기획자", "UX 디자이너", "UI 디자이너", "프로덕트 디자이너",
  "QA 엔지니어", "보안 엔지니어", "클라우드 엔지니어", "DBA", "임베디드 개발자",
  "게임 개발자", "블록체인 개발자", "마케팅 매니저", "콘텐츠 마케터", "그로스 해커",
  "HR 매니저", "경영기획", "영업 매니저", "CS 매니저", "재무/회계",
];

const EXPERIENCE_OPTIONS = ["신입", "1~3년", "3~5년", "5~7년", "7~10년", "10년+"];

interface MicroStepDef {
  id: string;
  question: string;
  cheer: string;
  required: boolean;
  label: string;
  sampleKey?: keyof typeof SAMPLES;
  sampleHint?: string;
}

const MICRO_STEPS: MicroStepDef[] = [
  { id: "position", question: "지원 직무를 입력해주세요", cheer: "시작이 반이에요!", required: true, label: "지원 직무" },
  { id: "experience", question: "총 경력을 선택해주세요", cheer: "좋아요!", required: false, label: "총 경력" },
  { id: "company", question: "지원하는 회사가 있나요?", cheer: "맞춤 분석이 가능해요", required: false, label: "지원 회사" },
  { id: "projectName", question: "대표 프로젝트를 알려주세요", cheer: "프로젝트 하나만이면 돼요!", required: true, label: "프로젝트" },
  { id: "role", question: "그 프로젝트에서 어떤 역할이었나요?", cheer: "잘하고 있어요!", required: false, label: "역할" },
  { id: "period", question: "프로젝트 기간은 어느 정도였나요?", cheer: "절반 왔어요!", required: false, label: "기간" },
  { id: "situation", question: "당시 어떤 상황이었나요?", cheer: "상황을 생생하게!", required: false, label: "상황/배경", sampleKey: "situation", sampleHint: "예: 레거시 결제 모듈의 장애율이 월 평균 5건 발생하며..." },
  { id: "challenge", question: "해결해야 할 과제는 무엇이었나요?", cheer: "목표가 뚜렷할수록 좋아요", required: false, label: "과제/목표", sampleKey: "challenge", sampleHint: "예: 장애율 0건 달성과 동시에 전환율을 3.5% 이상으로..." },
  { id: "action", question: "어떻게 해결했나요?", cheer: "거의 다 왔어요!", required: false, label: "행동/접근", sampleKey: "action", sampleHint: "예: MSA 구조로 전환하고, PG사 이중화 게이트웨이를..." },
  { id: "result", question: "어떤 성과를 냈나요?", cheer: "숫자가 있으면 최고!", required: false, label: "성과/결과", sampleKey: "result", sampleHint: "예: 장애율 90% 감소, 전환율 4.2% 달성, CS 60% 감소" },
  { id: "lesson", question: "이 경험에서 배운 점은요?", cheer: "마지막이에요!", required: false, label: "배운 점", sampleKey: "lesson", sampleHint: "예: 대규모 트래픽 환경에서의 시스템 설계 역량을..." },
  { id: "review", question: "입력한 내용을 확인하세요", cheer: "완벽해요! 확인하고 생성하세요", required: false, label: "" },
];

export default function CareerDescriptionPage() {
  const router = useRouter();

  const [pageStep, setPageStep] = useState<PageStep>("form");
  const [micro, setMicro] = useState(0);

  // Form data
  const [position, setPosition] = useState("");
  const [positionOpen, setPositionOpen] = useState(false);
  const [yearsOfExperience, setYearsOfExperience] = useState("");
  const [targetCompany, setTargetCompany] = useState("");
  const [projects, setProjects] = useState<Project[]>([emptyProject()]);
  const [currentProjectIdx, setCurrentProjectIdx] = useState(0);
  const [extraNotes, setExtraNotes] = useState("");

  // UI state
  const [language, setLanguage] = useState<"ko" | "en">("ko");
  const [result, setResult] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const resultRef = useRef<HTMLTextAreaElement>(null);
  const positionRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!positionOpen) return;
    function handleClick(e: MouseEvent) {
      if (positionRef.current && !positionRef.current.contains(e.target as Node)) {
        setPositionOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [positionOpen]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [micro]);

  const cp = projects[currentProjectIdx] ?? emptyProject();

  function updateCP(patch: Partial<Project>) {
    setProjects((prev) => prev.map((p, i) => (i === currentProjectIdx ? { ...p, ...patch } : p)));
  }

  function getFieldValue(id: string): string {
    switch (id) {
      case "position": return position;
      case "experience": return yearsOfExperience;
      case "company": return targetCompany;
      case "projectName": return cp.name;
      case "role": return cp.role;
      case "period": return cp.period;
      case "situation": return cp.situation;
      case "challenge": return cp.challenge;
      case "action": return cp.action;
      case "result": return cp.result;
      case "lesson": return cp.lesson;
      default: return "";
    }
  }

  function canAdvance(): boolean {
    const step = MICRO_STEPS[micro];
    if (!step.required) return true;
    return getFieldValue(step.id).trim().length > 0;
  }

  function goNext() {
    if (!canAdvance()) return;
    setPositionOpen(false);
    setMicro((s) => Math.min(s + 1, MICRO_STEPS.length - 1));
  }

  function goPrev() {
    setPositionOpen(false);
    setMicro((s) => Math.max(s - 1, 0));
  }

  function skipToReview() {
    setPositionOpen(false);
    setMicro(MICRO_STEPS.length - 1);
  }

  function addNewProject() {
    if (projects.length >= 5) return;
    const newProjects = [...projects, emptyProject()];
    setProjects(newProjects);
    setCurrentProjectIdx(newProjects.length - 1);
    setMicro(3);
  }

  const hasFilledProject = projects.some(projectFilled);
  const canGenerate = position.trim().length > 0 && (hasFilledProject || extraNotes.trim().length >= 30);
  const isReview = micro === MICRO_STEPS.length - 1;
  const currentStep = MICRO_STEPS[micro];

  async function handleGenerate() {
    if (!canGenerate) return;
    setError(null);
    setPageStep("loading");
    const filledProjects = projects.filter(projectFilled).map((p) => ({ ...p }));
    try {
      const res = await fetch("/api/generate-career", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          position: position.trim(),
          yearsOfExperience: yearsOfExperience.trim() || undefined,
          targetCompany: targetCompany.trim() || undefined,
          projects: filledProjects.length > 0 ? filledProjects : undefined,
          keyExperience: extraNotes.trim() || (filledProjects.length === 0 ? "" : undefined),
          language,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "insufficient_credits") { setPageStep("form"); setShowPaywall(true); return; }
        throw new Error(data.error ?? "생성 실패");
      }
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

  const inputCls = "w-full rounded-xl bg-[var(--gray-100)] px-4 py-3 text-[14px] text-[var(--gray-900)] placeholder:text-[var(--gray-400)] focus:outline-none focus:ring-2 focus:ring-[var(--blue-primary)]/20";
  const textareaCls = "w-full resize-none rounded-xl bg-[var(--gray-100)] px-4 py-3 text-[14px] leading-[21px] text-[var(--gray-900)] placeholder:text-[var(--gray-400)] focus:outline-none focus:ring-2 focus:ring-[var(--blue-primary)]/20";

  function renderInput(id: string) {
    switch (id) {
      case "position":
        return (
          <div className="relative" ref={positionRef}>
            <input
              type="text"
              value={position}
              onChange={(e) => { setPosition(e.target.value); setPositionOpen(true); }}
              onFocus={() => setPositionOpen(true)}
              placeholder="입력하거나 선택하세요"
              className={inputCls}
              autoFocus
            />
            {positionOpen && (() => {
              const trimmed = position.trim();
              const filtered = POSITION_PRESETS.filter((p) => !trimmed || p.includes(trimmed));
              const isExactMatch = POSITION_PRESETS.some((p) => p === trimmed);
              const showCustom = trimmed.length > 0 && !isExactMatch;
              if (!showCustom && filtered.length === 0) return null;
              return (
                <div className="absolute left-0 right-0 top-full mt-1 max-h-[200px] overflow-y-auto rounded-xl bg-white border border-[var(--gray-200)] shadow-lg z-20">
                  {showCustom && (
                    <button type="button" onClick={() => { setPosition(trimmed); setPositionOpen(false); }}
                      className="w-full text-left px-4 py-2.5 text-[13px] text-[var(--gray-900)] font-semibold hover:bg-[var(--gray-50)] transition-colors border-b border-[var(--gray-100)]">
                      {trimmed} <span className="text-[var(--gray-400)] font-normal">(직접 입력)</span>
                    </button>
                  )}
                  {filtered.map((p) => (
                    <button key={p} type="button" onClick={() => { setPosition(p); setPositionOpen(false); }}
                      className="w-full text-left px-4 py-2.5 text-[13px] text-[var(--gray-700)] hover:bg-[var(--gray-50)] transition-colors">
                      {p}
                    </button>
                  ))}
                </div>
              );
            })()}
          </div>
        );
      case "experience":
        return (
          <div className="flex flex-wrap gap-2">
            {EXPERIENCE_OPTIONS.map((opt) => (
              <button
                key={opt} type="button"
                onClick={() => { setYearsOfExperience(yearsOfExperience === opt ? "" : opt); }}
                className={`rounded-full px-4 py-2.5 text-[14px] font-medium transition-colors ${
                  yearsOfExperience === opt
                    ? "bg-[var(--blue-primary)] text-white"
                    : "bg-[var(--gray-100)] text-[var(--gray-700)] hover:bg-[var(--gray-200)]"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        );
      case "company":
        return <input type="text" value={targetCompany} onChange={(e) => setTargetCompany(e.target.value)} placeholder="예: 카카오" className={inputCls} autoFocus />;
      case "projectName":
        return <input type="text" value={cp.name} onChange={(e) => updateCP({ name: e.target.value })} placeholder="예: 결제 시스템 개편" className={inputCls} autoFocus />;
      case "role":
        return <input type="text" value={cp.role} onChange={(e) => updateCP({ role: e.target.value })} placeholder="예: 백엔드 리드" className={inputCls} autoFocus />;
      case "period":
        return <input type="text" value={cp.period} onChange={(e) => updateCP({ period: e.target.value })} placeholder="예: 2023.03 – 09" className={inputCls} autoFocus />;
      case "situation":
        return <textarea rows={3} value={cp.situation} onChange={(e) => updateCP({ situation: e.target.value })} placeholder="어떤 문제가 있었는지, 팀/조직 상황은 어떠했는지" className={textareaCls} autoFocus />;
      case "challenge":
        return <textarea rows={3} value={cp.challenge} onChange={(e) => updateCP({ challenge: e.target.value })} placeholder="무엇을 달성해야 했는지, 어떤 수치 목표가 있었는지" className={textareaCls} autoFocus />;
      case "action":
        return <textarea rows={3} value={cp.action} onChange={(e) => updateCP({ action: e.target.value })} placeholder="어떤 기술/방법론을 써서, 구체적으로 무엇을 했는지" className={textareaCls} autoFocus />;
      case "result":
        return <textarea rows={3} value={cp.result} onChange={(e) => updateCP({ result: e.target.value })} placeholder="%, 매출, 효율, DAU 등 정량 지표 중심으로" className={textareaCls} autoFocus />;
      case "lesson":
        return <textarea rows={3} value={cp.lesson} onChange={(e) => updateCP({ lesson: e.target.value })} placeholder="이 경험에서 얻은 역량이나 인사이트" className={textareaCls} autoFocus />;
      default:
        return null;
    }
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
      <div className="mb-4">
        <h1 className="text-[22px] font-extrabold text-[var(--gray-900)]">경력기술서 생성</h1>
        <p className="mt-1 text-[14px] text-[var(--gray-500)]">성과 중심의 스토리텔링 경력기술서를 만들어 드려요</p>
      </div>

      {/* ===== MICRO-STEP WIZARD ===== */}
      {pageStep === "form" && (
        <>
          {/* Progress bar */}
          <div className="mb-5">
            <div className="h-1 rounded-full bg-[var(--gray-100)] overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-[var(--blue-primary)]"
                animate={{ width: `${((micro + 1) / MICRO_STEPS.length) * 100}%` }}
                transition={{ type: "spring", damping: 20, stiffness: 200 }}
              />
            </div>
          </div>

          {error && (
            <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-[13px] text-red-600 font-medium">{error}</div>
          )}

          <div ref={scrollRef} className="flex flex-col">
            {/* Completed fields — faded summary stack */}
            {micro > 0 && !isReview && (
              <div className="space-y-1.5 mb-6">
                {MICRO_STEPS.slice(0, micro).map((step) => {
                  const val = getFieldValue(step.id);
                  if (!val) return null;
                  return (
                    <motion.button
                      key={step.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 0.45, y: 0 }}
                      onClick={() => setMicro(MICRO_STEPS.findIndex((s) => s.id === step.id))}
                      className="flex w-full items-baseline gap-3 text-left group"
                    >
                      <span className="shrink-0 text-[11px] font-medium text-[var(--gray-400)] w-[60px]">{step.label}</span>
                      <span className="text-[13px] text-[var(--gray-600)] truncate group-hover:text-[var(--blue-primary)] transition-colors">{val}</span>
                    </motion.button>
                  );
                })}
              </div>
            )}

            {/* Current step — full prominence */}
            <AnimatePresence mode="wait">
              {!isReview ? (
                <motion.div
                  key={`micro-${micro}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.25 }}
                >
                  {/* Cheer */}
                  <p className="text-[12px] font-medium text-[var(--blue-primary)] mb-2">{currentStep.cheer}</p>

                  {/* Question */}
                  <h2 className="text-[18px] font-extrabold text-[var(--gray-900)] mb-4">{currentStep.question}</h2>

                  {/* Input */}
                  {renderInput(currentStep.id)}

                  {/* Sample hint for STAR fields */}
                  {currentStep.sampleKey && (
                    <div className="mt-3">
                      <p className="text-[11px] text-[var(--gray-400)] leading-[16px] mb-1.5">{currentStep.sampleHint}</p>
                      <button
                        type="button"
                        onClick={() => updateCP({ [currentStep.sampleKey!]: SAMPLES[currentStep.sampleKey!] })}
                        className="text-[11px] font-semibold text-[var(--blue-primary)] hover:underline"
                      >
                        이 예시로 채우기
                      </button>
                    </div>
                  )}

                  {/* Optional badge */}
                  {!currentStep.required && currentStep.id !== "experience" && (
                    <p className="mt-2 text-[11px] text-[var(--gray-400)]">선택사항이에요. 비워두고 넘어가도 괜찮아요.</p>
                  )}
                </motion.div>
              ) : (
                /* Review step */
                <motion.div
                  key="review"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.25 }}
                  className="flex flex-col gap-4"
                >
                  <p className="text-[12px] font-medium text-[var(--blue-primary)] mb-1">{currentStep.cheer}</p>
                  <h2 className="text-[18px] font-extrabold text-[var(--gray-900)]">{currentStep.question}</h2>

                  {/* Summary of all entered data */}
                  <div className="rounded-xl bg-[var(--gray-50)] px-4 py-3 space-y-2">
                    {[
                      { l: "직무", v: position },
                      { l: "경력", v: yearsOfExperience },
                      { l: "회사", v: targetCompany },
                    ].filter((r) => r.v).map((r) => (
                      <div key={r.l} className="flex items-baseline gap-3">
                        <span className="shrink-0 text-[11px] font-medium text-[var(--gray-400)] w-[48px]">{r.l}</span>
                        <span className="text-[13px] font-semibold text-[var(--gray-800)]">{r.v}</span>
                      </div>
                    ))}
                  </div>

                  {/* Projects */}
                  <div className="flex flex-col gap-2">
                    {projects.filter(projectFilled).map((p, i) => (
                      <div key={i} className="flex items-center justify-between rounded-xl bg-[var(--gray-100)] px-4 py-3">
                        <div>
                          <p className="text-[13px] font-bold text-[var(--gray-900)]">{p.name}</p>
                          {(p.role || p.period) && (
                            <p className="text-[11px] text-[var(--gray-500)]">{p.role}{p.period ? ` · ${p.period}` : ""}</p>
                          )}
                        </div>
                        <button
                          onClick={() => { setCurrentProjectIdx(i); setMicro(3); }}
                          className="text-[12px] font-semibold text-[var(--blue-primary)]"
                        >
                          수정
                        </button>
                      </div>
                    ))}
                    {projects.filter(projectFilled).length === 0 && (
                      <div className="rounded-xl bg-[var(--gray-100)] px-4 py-3 text-[13px] text-[var(--gray-500)]">
                        입력된 프로젝트가 없어요
                      </div>
                    )}
                  </div>

                  {projects.length < 5 && (
                    <button
                      type="button"
                      onClick={addNewProject}
                      className="flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-[var(--gray-300)] py-3 text-[13px] font-semibold text-[var(--blue-primary)]"
                    >
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                      프로젝트 추가 ({projects.length}/5)
                    </button>
                  )}

                  <div>
                    <label className="text-[13px] font-semibold text-[var(--gray-900)] mb-1.5 block">추가 메모 (선택)</label>
                    <textarea
                      rows={3}
                      value={extraNotes}
                      onChange={(e) => setExtraNotes(e.target.value)}
                      placeholder="자격증, 수상 이력, 추가 설명 등 자유롭게"
                      className={textareaCls}
                    />
                  </div>

                  {/* Language selection */}
                  <div className="rounded-xl bg-[var(--gray-50)] px-4 py-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] font-semibold text-[var(--gray-700)]">출력 언어</span>
                      <div className="flex rounded-lg bg-[var(--gray-100)] p-0.5">
                        {(["ko", "en"] as const).map((lang) => (
                          <button key={lang} type="button" onClick={() => setLanguage(lang)}
                            className={`rounded-md px-3 py-1.5 text-[12px] font-semibold transition-colors ${
                              language === lang ? "bg-white text-[var(--gray-900)] shadow-sm" : "text-[var(--gray-500)]"
                            }`}>
                            {lang === "ko" ? "한국어" : "English"}
                          </button>
                        ))}
                      </div>
                    </div>
                    {language === "en" && (
                      <p className="mt-1.5 text-[12px] font-medium text-[var(--blue-primary)]">영문으로 생성해요!</p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </>
      )}

      {/* ===== LOADING ===== */}
      {pageStep === "loading" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-y-0 left-1/2 -translate-x-1/2 w-full max-w-[640px] z-[100] bg-white flex flex-col items-center justify-center px-6"
        >
          <div className="w-44 h-44 flex items-center justify-center">
            <LottieAnimation src="/lottie/Sparkles Loop Loader ai.json" className="w-full h-full object-contain" />
          </div>
          <h2 className="mt-1 text-[20px] font-extrabold text-[var(--gray-900)] tracking-tight text-center">경력기술서를 작성하고 있어요</h2>
          <p className="mt-3 text-[14px] text-[var(--gray-500)] font-medium">보통 20~40초 정도 걸려요</p>
        </motion.div>
      )}

      {/* ===== RESULT ===== */}
      {pageStep === "result" && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-[14px] font-bold text-[var(--gray-900)]">생성된 경력기술서</p>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 rounded-full bg-[var(--blue-light)] px-3 py-1.5 text-[12px] font-semibold text-[var(--blue-primary)] transition-colors hover:bg-[var(--blue-primary)] hover:text-white"
            >
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
            <button onClick={() => exportAsPDF(result, "경력기술서")}
              className="flex items-center justify-center gap-1.5 rounded-2xl bg-[var(--gray-900)] py-3 text-[14px] font-semibold text-white active:scale-[0.99] transition-transform">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" />
                <line x1="12" y1="18" x2="12" y2="12" /><polyline points="9 15 12 18 15 15" />
              </svg>PDF 저장
            </button>
            <button onClick={() => exportAsWord(result, "경력기술서")}
              className="flex items-center justify-center gap-1.5 rounded-2xl bg-[var(--blue-primary)] py-3 text-[14px] font-semibold text-white active:scale-[0.99] transition-transform">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" />
                <line x1="12" y1="18" x2="12" y2="12" /><polyline points="9 15 12 18 15 15" />
              </svg>Word 저장
            </button>
          </div>
          <button onClick={() => { setPageStep("form"); setMicro(0); setResult(""); }}
            className="w-full rounded-2xl border border-[var(--gray-200)] py-3 text-[14px] font-semibold text-[var(--gray-700)]">
            다시 생성하기
          </button>
        </div>
      )}

      {/* ===== BOTTOM NAV ===== */}
      {pageStep === "form" && (
        <>
          <div className="pointer-events-none fixed bottom-[88px] left-1/2 w-full max-w-[640px] h-16 -translate-x-1/2 bg-gradient-to-t from-white to-transparent z-40" />
          <div className="fixed bottom-0 left-1/2 w-full max-w-[640px] -translate-x-1/2 bg-white px-5 pb-8 pt-3 border-t border-[var(--gray-200)] z-50">
            {!isReview ? (
              <div className="flex gap-2">
                {micro > 0 && (
                  <button onClick={goPrev}
                    className="flex-shrink-0 rounded-2xl border border-[var(--gray-200)] px-5 py-3.5 text-[14px] font-semibold text-[var(--gray-700)]">
                    이전
                  </button>
                )}
                {micro >= 4 && (
                  <button onClick={skipToReview}
                    className="flex-shrink-0 rounded-2xl border border-[var(--gray-200)] px-4 py-3.5 text-[13px] font-semibold text-[var(--gray-500)]">
                    바로 생성
                  </button>
                )}
                <button
                  onClick={goNext}
                  disabled={!canAdvance()}
                  className="flex-1 rounded-2xl bg-[var(--blue-primary)] py-3.5 text-[14px] font-bold text-white disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.99] transition-transform"
                >
                  다음
                </button>
              </div>
            ) : (
              <button
                onClick={handleGenerate}
                disabled={!canGenerate}
                className="group relative w-full overflow-hidden rounded-2xl p-[1.5px] disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.99] transition-transform"
              >
                <span aria-hidden className="absolute inset-[-1000%] animate-[premiumSpin_3s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#1B64DA_0%,#7C5CFF_25%,#E2CBFF_50%,#7C5CFF_75%,#1B64DA_100%)]" />
                <span className="relative flex w-full items-center justify-center gap-2 rounded-[14px] bg-[var(--gray-900)] py-4 text-[15px] font-bold text-white">
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 3l1.9 4.6L19 9.5l-4 3.9.9 5.6L12 16.4 8.1 19l.9-5.6-4-3.9 5.1-1.9z" />
                  </svg>
                  경력기술서 생성하기
                  <span className="inline-flex items-center rounded-full bg-white/15 pl-0.5 pr-1.5 py-[1px]">
                    <LottieAnimation src="/lottie/Coin.json" loop={false} autoplay={false} className="h-4 w-4" />
                    <span className="text-[11px] font-semibold text-white/90">1</span>
                  </span>
                </span>
              </button>
            )}
          </div>
        </>
      )}

      <PaywallModal open={showPaywall} onClose={() => setShowPaywall(false)} />
    </div>
  );
}

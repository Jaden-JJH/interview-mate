// 경력기술서 생성 페이지 — 위저드 플로우로 프로젝트별 STAR 가이드 입력 → 3~5장 (1크레딧)
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
  context: {
    situation: "레거시 결제 모듈의 장애율이 월 평균 5건 발생하며, CS 인입이 전월 대비 40% 급증한 상황이었습니다.",
    challenge: "장애율 0건 달성과 동시에 결제 전환율을 기존 3.1%에서 3.5% 이상으로 개선하는 것이 목표였습니다.",
  },
  achievement: {
    action: "결제 모듈을 MSA 구조로 전환하고, PG사 이중화 게이트웨이를 구축했습니다. 실시간 모니터링 대시보드를 만들어 장애 감지 시간을 5분 → 30초로 단축했습니다.",
    result: "장애율 90% 감소 (월 5건 → 0.5건), 결제 전환율 4.2% 달성, CS 인입 60% 감소",
    lesson: "대규모 트래픽 환경에서의 시스템 설계 역량을 확보했고, 장애 대응 프로세스 체계화의 중요성을 배웠습니다.",
  },
};

const WIZARD_CHEERS = [
  "간단한 정보만 알려주세요",
  "좋아요! 프로젝트 하나만 알려주세요",
  "절반 왔어요! 배경만 간단히",
  "거의 다 됐어요! 마지막 한 걸음",
  "완벽해요! 확인하고 생성하세요",
];

const TOTAL_STEPS = 5;

const POSITION_PRESETS = [
  "프론트엔드 개발자", "백엔드 개발자", "풀스택 개발자", "iOS 개발자", "Android 개발자",
  "DevOps 엔지니어", "데이터 엔지니어", "데이터 분석가", "데이터 사이언티스트", "ML 엔지니어",
  "PM / PO", "서비스 기획자", "UX 디자이너", "UI 디자이너", "프로덕트 디자이너",
  "QA 엔지니어", "보안 엔지니어", "클라우드 엔지니어", "DBA", "임베디드 개발자",
  "게임 개발자", "블록체인 개발자", "마케팅 매니저", "콘텐츠 마케터", "그로스 해커",
  "HR 매니저", "경영기획", "영업 매니저", "CS 매니저", "재무/회계",
];

const EXPERIENCE_OPTIONS = ["신입", "1~3년", "3~5년", "5~7년", "7~10년", "10년+"];

export default function CareerDescriptionPage() {
  const router = useRouter();

  const [pageStep, setPageStep] = useState<PageStep>("form");
  const [wizardStep, setWizardStep] = useState(0);

  // Form data
  const [position, setPosition] = useState("");
  const [positionOpen, setPositionOpen] = useState(false);
  const [yearsOfExperience, setYearsOfExperience] = useState("");
  const [targetCompany, setTargetCompany] = useState("");
  const [projects, setProjects] = useState<Project[]>([emptyProject()]);
  const [currentProjectIdx, setCurrentProjectIdx] = useState(0);
  const [extraNotes, setExtraNotes] = useState("");

  // UI state
  const [result, setResult] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [showSample, setShowSample] = useState(false);
  const resultRef = useRef<HTMLTextAreaElement>(null);
  const positionRef = useRef<HTMLDivElement>(null);

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

  const currentProject = projects[currentProjectIdx] ?? emptyProject();

  function updateCurrentProject(patch: Partial<Project>) {
    setProjects((prev) =>
      prev.map((p, i) => (i === currentProjectIdx ? { ...p, ...patch } : p))
    );
  }

  function addNewProject() {
    if (projects.length >= 5) return;
    const newProjects = [...projects, emptyProject()];
    setProjects(newProjects);
    setCurrentProjectIdx(newProjects.length - 1);
    setWizardStep(1);
    setShowSample(false);
  }

  function removeCurrentProject() {
    if (projects.length <= 1) return;
    const newProjects = projects.filter((_, i) => i !== currentProjectIdx);
    setProjects(newProjects);
    setCurrentProjectIdx(Math.max(0, currentProjectIdx - 1));
  }

  function fillSampleContext() {
    updateCurrentProject(SAMPLES.context);
  }

  function fillSampleAchievement() {
    updateCurrentProject(SAMPLES.achievement);
  }

  // Wizard navigation
  function canGoNext(): boolean {
    switch (wizardStep) {
      case 0: return position.trim().length > 0;
      case 1: return currentProject.name.trim().length > 0;
      case 2: return true;
      case 3: return true;
      default: return false;
    }
  }

  function goNext() {
    if (!canGoNext()) return;
    setShowSample(false);
    setWizardStep((s) => Math.min(s + 1, 4));
  }

  function goPrev() {
    setShowSample(false);
    setWizardStep((s) => Math.max(s - 1, 0));
  }

  function skipToReview() {
    setShowSample(false);
    setWizardStep(4);
  }

  const hasFilledProject = projects.some(projectFilled);
  const canGenerate = position.trim().length > 0 && (hasFilledProject || extraNotes.trim().length >= 30);

  async function handleGenerate() {
    if (!canGenerate) return;
    setError(null);
    setPageStep("loading");

    const filledProjects = projects
      .filter(projectFilled)
      .map((p) => ({ ...p }));

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
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "insufficient_credits") {
          setPageStep("form");
          setShowPaywall(true);
          return;
        }
        throw new Error(data.error ?? "생성 실패");
      }
      setResult(data.content);
      setPageStep("result");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "생성에 실패했어요";
      setError(msg);
      setPageStep("form");
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(result);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  // Input field helpers
  const inputCls = "w-full rounded-xl bg-[var(--gray-100)] px-4 py-3 text-[14px] text-[var(--gray-900)] placeholder:text-[var(--gray-400)] focus:outline-none focus:ring-2 focus:ring-[var(--blue-primary)]/20";
  const textareaCls = "w-full resize-none rounded-xl bg-[var(--gray-100)] px-4 py-3 text-[14px] leading-[21px] text-[var(--gray-900)] placeholder:text-[var(--gray-400)] focus:outline-none focus:ring-2 focus:ring-[var(--blue-primary)]/20";
  const labelCls = "text-[13px] font-semibold text-[var(--gray-900)] mb-1.5 block";

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
        <h1 className="text-[22px] font-extrabold text-[var(--gray-900)]">
          경력기술서 생성
        </h1>
        <p className="mt-1 text-[14px] text-[var(--gray-500)]">
          성과 중심의 스토리텔링 경력기술서를 만들어 드려요
        </p>
      </div>

      {/* ===== WIZARD FORM ===== */}
      {pageStep === "form" && (
        <>
          {/* Progress bar + cheer */}
          <div className="mb-6">
            <div className="h-1 rounded-full bg-[var(--gray-100)] overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-[var(--blue-primary)]"
                animate={{ width: `${((wizardStep + 1) / TOTAL_STEPS) * 100}%` }}
                transition={{ type: "spring", damping: 20, stiffness: 200 }}
              />
            </div>
            <motion.p
              key={wizardStep}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-2 text-[12px] font-medium text-[var(--blue-primary)]"
            >
              {WIZARD_CHEERS[wizardStep]}
            </motion.p>
          </div>

          {error && (
            <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-[13px] text-red-600 font-medium">
              {error}
            </div>
          )}

          <AnimatePresence mode="wait">
            {/* Step 0: 기본 정보 */}
            {wizardStep === 0 && (
              <motion.div
                key="step0"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col gap-4"
              >
                <p className="text-[15px] font-bold text-[var(--gray-900)]">어떤 직무에 지원하시나요?</p>

                {/* 직무 자동완성 combobox */}
                <div className="relative" ref={positionRef}>
                  <label className={labelCls}>
                    직무/포지션 <span className="text-[var(--blue-primary)]">*</span>
                  </label>
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
                          <button
                            type="button"
                            onClick={() => { setPosition(trimmed); setPositionOpen(false); }}
                            className="w-full text-left px-4 py-2.5 text-[13px] text-[var(--gray-900)] font-semibold hover:bg-[var(--gray-50)] transition-colors border-b border-[var(--gray-100)]"
                          >
                            {trimmed} <span className="text-[var(--gray-400)] font-normal">(직접 입력)</span>
                          </button>
                        )}
                        {filtered.map((p) => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => { setPosition(p); setPositionOpen(false); }}
                            className="w-full text-left px-4 py-2.5 text-[13px] text-[var(--gray-700)] hover:bg-[var(--gray-50)] transition-colors"
                          >
                            {p}
                          </button>
                        ))}
                      </div>
                    );
                  })()}
                </div>

                {/* 경력 칩 선택 */}
                <div>
                  <label className={labelCls}>총 경력</label>
                  <div className="flex flex-wrap gap-2">
                    {EXPERIENCE_OPTIONS.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setYearsOfExperience(yearsOfExperience === opt ? "" : opt)}
                        className={`rounded-full px-4 py-2 text-[13px] font-medium transition-colors ${
                          yearsOfExperience === opt
                            ? "bg-[var(--blue-primary)] text-white"
                            : "bg-[var(--gray-100)] text-[var(--gray-700)] hover:bg-[var(--gray-200)]"
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 지원 회사 */}
                <div>
                  <label className={labelCls}>지원 회사</label>
                  <input
                    type="text"
                    value={targetCompany}
                    onChange={(e) => setTargetCompany(e.target.value)}
                    placeholder="예: 카카오"
                    className={inputCls}
                  />
                </div>
              </motion.div>
            )}

            {/* Step 1: 프로젝트 기본 */}
            {wizardStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col gap-4"
              >
                <div className="flex items-center justify-between">
                  <p className="text-[15px] font-bold text-[var(--gray-900)]">
                    프로젝트 {currentProjectIdx + 1}
                    {projects.length > 1 && <span className="text-[12px] font-normal text-[var(--gray-500)]"> / {projects.length}개</span>}
                  </p>
                  {projects.length > 1 && (
                    <button onClick={removeCurrentProject} className="text-[12px] text-red-400 hover:text-red-600">
                      이 프로젝트 삭제
                    </button>
                  )}
                </div>
                <div>
                  <label className={labelCls}>
                    프로젝트명 <span className="text-[var(--blue-primary)]">*</span>
                  </label>
                  <input
                    type="text"
                    value={currentProject.name}
                    onChange={(e) => updateCurrentProject({ name: e.target.value })}
                    placeholder="예: 결제 시스템 개편"
                    className={inputCls}
                    autoFocus
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>역할</label>
                    <input
                      type="text"
                      value={currentProject.role}
                      onChange={(e) => updateCurrentProject({ role: e.target.value })}
                      placeholder="예: 백엔드 리드"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>기간</label>
                    <input
                      type="text"
                      value={currentProject.period}
                      onChange={(e) => updateCurrentProject({ period: e.target.value })}
                      placeholder="예: 2023.03 – 09"
                      className={inputCls}
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 2: 배경·목표 */}
            {wizardStep === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col gap-4"
              >
                <p className="text-[15px] font-bold text-[var(--gray-900)]">
                  어떤 상황에서 무엇을 해결했나요?
                </p>
                <div>
                  <label className={labelCls}>상황/배경</label>
                  <textarea
                    rows={3}
                    value={currentProject.situation}
                    onChange={(e) => updateCurrentProject({ situation: e.target.value })}
                    placeholder="어떤 문제가 있었는지, 팀/조직 상황은 어떠했는지"
                    className={textareaCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>과제/목표</label>
                  <textarea
                    rows={3}
                    value={currentProject.challenge}
                    onChange={(e) => updateCurrentProject({ challenge: e.target.value })}
                    placeholder="무엇을 달성해야 했는지, 어떤 수치 목표가 있었는지"
                    className={textareaCls}
                  />
                </div>

                {/* 샘플 가이드 */}
                <button
                  type="button"
                  onClick={() => setShowSample(!showSample)}
                  className="flex items-center gap-1.5 text-[12px] font-semibold text-[var(--blue-primary)]"
                >
                  <svg
                    className={`h-3.5 w-3.5 transition-transform ${showSample ? "rotate-90" : ""}`}
                    viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
                  >
                    <path d="M9 6l6 6-6 6" />
                  </svg>
                  작성이 어려우신가요? 샘플 보기
                </button>
                <AnimatePresence>
                  {showSample && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="rounded-xl bg-blue-50 px-4 py-3 text-[12px] leading-[18px] text-[var(--gray-700)]">
                        <p className="font-semibold text-[var(--blue-primary)] mb-1.5">예시</p>
                        <p className="mb-1"><span className="font-semibold">상황:</span> {SAMPLES.context.situation}</p>
                        <p><span className="font-semibold">목표:</span> {SAMPLES.context.challenge}</p>
                        <button
                          onClick={fillSampleContext}
                          className="mt-2 rounded-lg bg-[var(--blue-primary)] px-3 py-1.5 text-[11px] font-bold text-white"
                        >
                          이 샘플로 채우기
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {/* Step 3: 행동·성과 */}
            {wizardStep === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col gap-4"
              >
                <p className="text-[15px] font-bold text-[var(--gray-900)]">
                  구체적으로 무엇을 했고, 어떤 성과를 냈나요?
                </p>
                <div>
                  <label className={labelCls}>행동/접근</label>
                  <textarea
                    rows={3}
                    value={currentProject.action}
                    onChange={(e) => updateCurrentProject({ action: e.target.value })}
                    placeholder="어떤 기술/방법론을 써서, 구체적으로 무엇을 했는지"
                    className={textareaCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>
                    성과/결과 <span className="text-[11px] font-normal text-[var(--gray-400)]">— 숫자가 있으면 최고!</span>
                  </label>
                  <textarea
                    rows={3}
                    value={currentProject.result}
                    onChange={(e) => updateCurrentProject({ result: e.target.value })}
                    placeholder="%, 매출, 효율, DAU 등 정량 지표 중심으로"
                    className={textareaCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>배운 점</label>
                  <textarea
                    rows={2}
                    value={currentProject.lesson}
                    onChange={(e) => updateCurrentProject({ lesson: e.target.value })}
                    placeholder="이 경험에서 얻은 역량이나 인사이트"
                    className={textareaCls}
                  />
                </div>

                {/* 샘플 가이드 */}
                <button
                  type="button"
                  onClick={() => setShowSample(!showSample)}
                  className="flex items-center gap-1.5 text-[12px] font-semibold text-[var(--blue-primary)]"
                >
                  <svg
                    className={`h-3.5 w-3.5 transition-transform ${showSample ? "rotate-90" : ""}`}
                    viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
                  >
                    <path d="M9 6l6 6-6 6" />
                  </svg>
                  작성이 어려우신가요? 샘플 보기
                </button>
                <AnimatePresence>
                  {showSample && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="rounded-xl bg-blue-50 px-4 py-3 text-[12px] leading-[18px] text-[var(--gray-700)]">
                        <p className="font-semibold text-[var(--blue-primary)] mb-1.5">예시</p>
                        <p className="mb-1"><span className="font-semibold">행동:</span> {SAMPLES.achievement.action}</p>
                        <p className="mb-1"><span className="font-semibold">성과:</span> {SAMPLES.achievement.result}</p>
                        <p><span className="font-semibold">배운 점:</span> {SAMPLES.achievement.lesson}</p>
                        <button
                          onClick={fillSampleAchievement}
                          className="mt-2 rounded-lg bg-[var(--blue-primary)] px-3 py-1.5 text-[11px] font-bold text-white"
                        >
                          이 샘플로 채우기
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {/* Step 4: 정리 */}
            {wizardStep === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col gap-4"
              >
                <p className="text-[15px] font-bold text-[var(--gray-900)]">입력한 내용을 확인하세요</p>

                {/* 입력된 프로젝트 요약 */}
                <div className="flex flex-col gap-2">
                  {projects.filter(projectFilled).map((p, i) => (
                    <div key={i} className="flex items-center justify-between rounded-xl bg-[var(--gray-100)] px-4 py-3">
                      <div>
                        <p className="text-[13px] font-bold text-[var(--gray-900)]">{p.name}</p>
                        {p.role && <p className="text-[11px] text-[var(--gray-500)]">{p.role}{p.period ? ` · ${p.period}` : ""}</p>}
                      </div>
                      <button
                        onClick={() => { setCurrentProjectIdx(i); setWizardStep(1); }}
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

                {/* 추가 메모 */}
                <div>
                  <label className={labelCls}>추가 메모 (선택)</label>
                  <textarea
                    rows={3}
                    value={extraNotes}
                    onChange={(e) => setExtraNotes(e.target.value)}
                    placeholder="자격증, 수상 이력, 추가 설명 등 자유롭게"
                    className={textareaCls}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
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
            <LottieAnimation
              src="/lottie/Sparkles Loop Loader ai.json"
              className="w-full h-full object-contain"
            />
          </div>
          <h2 className="mt-1 text-[20px] font-extrabold text-[var(--gray-900)] tracking-tight text-center">
            경력기술서를 작성하고 있어요
          </h2>
          <p className="mt-3 text-[14px] text-[var(--gray-500)] font-medium">
            보통 20~40초 정도 걸려요
          </p>
        </motion.div>
      )}

      {/* ===== RESULT ===== */}
      {pageStep === "result" && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-[14px] font-bold text-[var(--gray-900)]">
              생성된 경력기술서
            </p>
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
            rows={16}
            className="w-full resize-none rounded-xl bg-[var(--gray-100)] px-4 py-3 text-[13px] leading-[21px] text-[var(--gray-700)] focus:outline-none"
          />
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              onClick={() => exportAsPDF(result, "경력기술서")}
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
              onClick={() => exportAsWord(result, "경력기술서")}
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
          <button
            onClick={() => { setPageStep("form"); setWizardStep(0); setResult(""); }}
            className="w-full rounded-2xl border border-[var(--gray-200)] py-3 text-[14px] font-semibold text-[var(--gray-700)]"
          >
            다시 생성하기
          </button>
        </div>
      )}

      {/* ===== BOTTOM NAV (form only) ===== */}
      {pageStep === "form" && (
        <>
          <div className="pointer-events-none fixed bottom-[88px] left-1/2 w-full max-w-[640px] h-16 -translate-x-1/2 bg-gradient-to-t from-white to-transparent z-40" />
          <div className="fixed bottom-0 left-1/2 w-full max-w-[640px] -translate-x-1/2 bg-white px-5 pb-8 pt-3 border-t border-[var(--gray-200)] z-50">
            {wizardStep < 4 ? (
              <div className="flex gap-2">
                {wizardStep > 0 && (
                  <button
                    onClick={goPrev}
                    className="flex-shrink-0 rounded-2xl border border-[var(--gray-200)] px-5 py-3.5 text-[14px] font-semibold text-[var(--gray-700)]"
                  >
                    이전
                  </button>
                )}
                {wizardStep >= 2 && (
                  <button
                    onClick={skipToReview}
                    className="flex-shrink-0 rounded-2xl border border-[var(--gray-200)] px-4 py-3.5 text-[13px] font-semibold text-[var(--gray-500)]"
                  >
                    넘어가기
                  </button>
                )}
                <button
                  onClick={goNext}
                  disabled={!canGoNext()}
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
                <span
                  aria-hidden
                  className="absolute inset-[-1000%] animate-[premiumSpin_3s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#1B64DA_0%,#7C5CFF_25%,#E2CBFF_50%,#7C5CFF_75%,#1B64DA_100%)]"
                />
                <span className="relative flex w-full items-center justify-center gap-2 rounded-[14px] bg-[var(--gray-900)] py-4 text-[15px] font-bold text-white">
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 3l1.9 4.6L19 9.5l-4 3.9.9 5.6L12 16.4 8.1 19l.9-5.6-4-3.9 5.1-1.9z" />
                  </svg>
                  경력기술서 생성하기 (1크레딧)
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

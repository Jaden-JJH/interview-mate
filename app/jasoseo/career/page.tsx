// 경력기술서 생성 페이지 — 프로젝트별 가이드 입력 → 성과 중심 경력기술서 3~5장 (1크레딧)
"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import LottieAnimation from "@/components/LottieAnimation";
import PaywallModal from "@/components/PaywallModal";
import { exportAsWord, exportAsPDF } from "@/lib/export-document";

type Step = "form" | "loading" | "result";

interface Project {
  name: string;
  role: string;
  period: string;
  situation: string;
  challenge: string;
  action: string;
  result: string;
  lesson: string;
  expanded: boolean;
}

function emptyProject(): Project {
  return { name: "", role: "", period: "", situation: "", challenge: "", action: "", result: "", lesson: "", expanded: true };
}

function projectFilled(p: Project): boolean {
  return p.name.trim().length > 0 && (p.situation.trim().length > 0 || p.action.trim().length > 0 || p.result.trim().length > 0);
}

export default function CareerDescriptionPage() {
  const router = useRouter();

  const [step, setStep] = useState<Step>("form");
  const [position, setPosition] = useState("");
  const [yearsOfExperience, setYearsOfExperience] = useState("");
  const [targetCompany, setTargetCompany] = useState("");
  const [projects, setProjects] = useState<Project[]>([emptyProject()]);
  const [extraNotes, setExtraNotes] = useState("");
  const [showExtraNotes, setShowExtraNotes] = useState(false);
  const [result, setResult] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const resultRef = useRef<HTMLTextAreaElement>(null);

  const hasFilledProject = projects.some(projectFilled);
  const canSubmit = position.trim().length > 0 && (hasFilledProject || extraNotes.trim().length >= 30);

  function updateProject(index: number, patch: Partial<Project>) {
    setProjects((prev) => prev.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  }

  function removeProject(index: number) {
    setProjects((prev) => prev.filter((_, i) => i !== index));
  }

  function addProject() {
    if (projects.length >= 5) return;
    setProjects((prev) => [...prev.map((p) => ({ ...p, expanded: false })), emptyProject()]);
  }

  async function handleGenerate() {
    if (!canSubmit) return;
    setError(null);
    setStep("loading");

    const filledProjects = projects
      .filter(projectFilled)
      .map(({ expanded, ...rest }) => rest);

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
          setStep("form");
          setShowPaywall(true);
          return;
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
          경력기술서 생성
        </h1>
        <p className="mt-1 text-[14px] text-[var(--gray-500)]">
          성과 중심의 스토리텔링 경력기술서를 만들어 드려요
        </p>
      </div>

      {step === "form" && (
        <div className="flex flex-col gap-5">
          {error && (
            <div className="rounded-xl bg-red-50 px-4 py-3 text-[13px] text-red-600 font-medium">
              {error}
            </div>
          )}

          {/* 기본 정보 */}
          <div className="flex flex-col gap-3">
            <div>
              <label className="text-[13px] font-semibold text-[var(--gray-900)] mb-1.5 block">
                직무/포지션 <span className="text-[var(--blue-primary)]">*</span>
              </label>
              <input
                type="text"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                placeholder="예: 프론트엔드 개발자, 데이터 분석가"
                className="w-full rounded-xl bg-[var(--gray-100)] px-4 py-3 text-[14px] text-[var(--gray-900)] placeholder:text-[var(--gray-400)] focus:outline-none focus:ring-2 focus:ring-[var(--blue-primary)]/20"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[13px] font-semibold text-[var(--gray-900)] mb-1.5 block">총 경력</label>
                <input
                  type="text"
                  value={yearsOfExperience}
                  onChange={(e) => setYearsOfExperience(e.target.value)}
                  placeholder="예: 5년"
                  className="w-full rounded-xl bg-[var(--gray-100)] px-4 py-3 text-[14px] text-[var(--gray-900)] placeholder:text-[var(--gray-400)] focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[13px] font-semibold text-[var(--gray-900)] mb-1.5 block">지원 회사</label>
                <input
                  type="text"
                  value={targetCompany}
                  onChange={(e) => setTargetCompany(e.target.value)}
                  placeholder="예: 카카오"
                  className="w-full rounded-xl bg-[var(--gray-100)] px-4 py-3 text-[14px] text-[var(--gray-900)] placeholder:text-[var(--gray-400)] focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* 구분선 */}
          <div className="border-t border-[var(--gray-200)]" />

          {/* 프로젝트 섹션 */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-[14px] font-bold text-[var(--gray-900)]">프로젝트별 상세 입력</p>
                <p className="mt-0.5 text-[12px] text-[var(--gray-500)]">프로젝트를 추가하면 더 풍부한 경력기술서가 나와요</p>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <AnimatePresence initial={false}>
                {projects.map((project, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden rounded-xl border border-[var(--gray-200)] bg-white"
                  >
                    {/* 프로젝트 헤더 */}
                    <button
                      type="button"
                      onClick={() => updateProject(idx, { expanded: !project.expanded })}
                      className="flex w-full items-center justify-between px-4 py-3"
                    >
                      <span className="text-[13px] font-bold text-[var(--gray-900)]">
                        {project.name.trim() || `프로젝트 ${idx + 1}`}
                        {projectFilled(project) && (
                          <span className="ml-1.5 text-[11px] font-medium text-green-600">✓</span>
                        )}
                      </span>
                      <div className="flex items-center gap-2">
                        {projects.length > 1 && (
                          <span
                            role="button"
                            tabIndex={0}
                            onClick={(e) => { e.stopPropagation(); removeProject(idx); }}
                            onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); removeProject(idx); } }}
                            className="text-[12px] text-red-400 hover:text-red-600"
                          >
                            삭제
                          </span>
                        )}
                        <svg
                          className={`h-4 w-4 text-[var(--gray-400)] transition-transform ${project.expanded ? "rotate-180" : ""}`}
                          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
                        >
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </div>
                    </button>

                    {/* 프로젝트 바디 */}
                    <AnimatePresence initial={false}>
                      {project.expanded && (
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: "auto" }}
                          exit={{ height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="flex flex-col gap-3 px-4 pb-4 border-t border-[var(--gray-100)]">
                            <div className="grid grid-cols-2 gap-3 pt-3">
                              <div>
                                <label className="text-[12px] font-semibold text-[var(--gray-700)] mb-1 block">
                                  프로젝트명 <span className="text-[var(--blue-primary)]">*</span>
                                </label>
                                <input
                                  type="text"
                                  value={project.name}
                                  onChange={(e) => updateProject(idx, { name: e.target.value })}
                                  placeholder="예: 결제 시스템 개편"
                                  className="w-full rounded-lg bg-[var(--gray-100)] px-3 py-2.5 text-[13px] text-[var(--gray-900)] placeholder:text-[var(--gray-400)] focus:outline-none focus:ring-2 focus:ring-[var(--blue-primary)]/20"
                                />
                              </div>
                              <div>
                                <label className="text-[12px] font-semibold text-[var(--gray-700)] mb-1 block">역할</label>
                                <input
                                  type="text"
                                  value={project.role}
                                  onChange={(e) => updateProject(idx, { role: e.target.value })}
                                  placeholder="예: 백엔드 리드"
                                  className="w-full rounded-lg bg-[var(--gray-100)] px-3 py-2.5 text-[13px] text-[var(--gray-900)] placeholder:text-[var(--gray-400)] focus:outline-none"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="text-[12px] font-semibold text-[var(--gray-700)] mb-1 block">기간</label>
                              <input
                                type="text"
                                value={project.period}
                                onChange={(e) => updateProject(idx, { period: e.target.value })}
                                placeholder="예: 2023.03 – 2023.09 (7개월)"
                                className="w-full rounded-lg bg-[var(--gray-100)] px-3 py-2.5 text-[13px] text-[var(--gray-900)] placeholder:text-[var(--gray-400)] focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="text-[12px] font-semibold text-[var(--gray-700)] mb-1 block">
                                상황/배경 <span className="text-[11px] font-normal text-[var(--gray-400)]">— 어떤 상황이었나요?</span>
                              </label>
                              <textarea
                                rows={2}
                                value={project.situation}
                                onChange={(e) => updateProject(idx, { situation: e.target.value })}
                                placeholder="예: 레거시 결제 모듈의 장애율이 월 평균 5건, CS 인입 급증"
                                className="w-full resize-none rounded-lg bg-[var(--gray-100)] px-3 py-2.5 text-[13px] leading-[20px] text-[var(--gray-900)] placeholder:text-[var(--gray-400)] focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="text-[12px] font-semibold text-[var(--gray-700)] mb-1 block">
                                과제/목표 <span className="text-[11px] font-normal text-[var(--gray-400)]">— 무엇을 해결해야 했나요?</span>
                              </label>
                              <textarea
                                rows={2}
                                value={project.challenge}
                                onChange={(e) => updateProject(idx, { challenge: e.target.value })}
                                placeholder="예: 장애율 0건 + 결제 전환율 3% 개선 목표"
                                className="w-full resize-none rounded-lg bg-[var(--gray-100)] px-3 py-2.5 text-[13px] leading-[20px] text-[var(--gray-900)] placeholder:text-[var(--gray-400)] focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="text-[12px] font-semibold text-[var(--gray-700)] mb-1 block">
                                행동/접근 <span className="text-[11px] font-normal text-[var(--gray-400)]">— 구체적으로 뭘 했나요?</span>
                              </label>
                              <textarea
                                rows={2}
                                value={project.action}
                                onChange={(e) => updateProject(idx, { action: e.target.value })}
                                placeholder="예: MSA 전환, 결제 게이트웨이 이중화, 모니터링 대시보드 구축"
                                className="w-full resize-none rounded-lg bg-[var(--gray-100)] px-3 py-2.5 text-[13px] leading-[20px] text-[var(--gray-900)] placeholder:text-[var(--gray-400)] focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="text-[12px] font-semibold text-[var(--gray-700)] mb-1 block">
                                성과/결과 <span className="text-[11px] font-normal text-[var(--gray-400)]">— 숫자가 있으면 최고!</span>
                              </label>
                              <textarea
                                rows={2}
                                value={project.result}
                                onChange={(e) => updateProject(idx, { result: e.target.value })}
                                placeholder="예: 장애율 90% 감소, 결제 전환율 4.2% 달성, CS 인입 60% 감소"
                                className="w-full resize-none rounded-lg bg-[var(--gray-100)] px-3 py-2.5 text-[13px] leading-[20px] text-[var(--gray-900)] placeholder:text-[var(--gray-400)] focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="text-[12px] font-semibold text-[var(--gray-700)] mb-1 block">
                                배운 점 <span className="text-[11px] font-normal text-[var(--gray-400)]">— 이 경험에서 얻은 것</span>
                              </label>
                              <textarea
                                rows={2}
                                value={project.lesson}
                                onChange={(e) => updateProject(idx, { lesson: e.target.value })}
                                placeholder="예: 대규모 트래픽 환경에서의 시스템 설계 역량 확보"
                                className="w-full resize-none rounded-lg bg-[var(--gray-100)] px-3 py-2.5 text-[13px] leading-[20px] text-[var(--gray-900)] placeholder:text-[var(--gray-400)] focus:outline-none"
                              />
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {projects.length < 5 && (
              <button
                type="button"
                onClick={addProject}
                className="mt-2 flex items-center gap-1.5 text-[13px] font-semibold text-[var(--blue-primary)]"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                프로젝트 추가 (최대 5개)
              </button>
            )}
          </div>

          {/* 추가 메모 토글 */}
          <button
            type="button"
            onClick={() => setShowExtraNotes(!showExtraNotes)}
            className="flex items-center gap-1.5 text-[13px] font-semibold text-[var(--blue-primary)]"
          >
            <svg
              className={`h-4 w-4 transition-transform ${showExtraNotes ? "rotate-90" : ""}`}
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
            >
              <path d="M9 6l6 6-6 6" />
            </svg>
            추가 메모 (자유 입력)
          </button>
          <AnimatePresence>
            {showExtraNotes && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <textarea
                  rows={5}
                  value={extraNotes}
                  onChange={(e) => setExtraNotes(e.target.value)}
                  placeholder={"프로젝트 카드에 넣지 못한 추가 경력, 자격증, 수상 이력 등을 자유롭게 적어주세요."}
                  className="w-full resize-none rounded-xl bg-[var(--gray-100)] px-4 py-3 text-[14px] leading-[21px] text-[var(--gray-900)] placeholder:text-[var(--gray-400)] focus:outline-none"
                />
              </motion.div>
            )}
          </AnimatePresence>
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
            경력기술서를 작성하고 있어요
          </h2>
          <p className="mt-3 text-[14px] text-[var(--gray-500)] font-medium">
            보통 20~40초 정도 걸려요
          </p>
        </motion.div>
      )}

      {step === "result" && (
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
          <div className="space-y-2">
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
                경력기술서 생성하기 (1크레딧)
              </span>
            </button>
          </div>
        </>
      )}

      <PaywallModal open={showPaywall} onClose={() => setShowPaywall(false)} />
    </div>
  );
}

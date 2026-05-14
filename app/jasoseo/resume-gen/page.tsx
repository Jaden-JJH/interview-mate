// 이력서 생성 페이지 — 마이크로 스텝 위저드 (이름·연락처·직무·경력·학력·경력사항·자격증·기술·대외활동·추가정보 → 리뷰) → 이력서 생성 (무료)
"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import LottieAnimation from "@/components/LottieAnimation";
import { exportAsWord, exportAsPDF } from "@/lib/export-document";

type PageStep = "form" | "loading" | "result";

interface EducationEntry {
  school: string;
  major: string;
  degree: string;
  graduationYear: string;
  status: string;
}

interface CareerEntry {
  company: string;
  role: string;
  period: string;
  description: string;
}

interface CertEntry {
  name: string;
  detail: string;
}

function emptyEdu(): EducationEntry {
  return { school: "", major: "", degree: "", graduationYear: "", status: "" };
}
function emptyCareer(): CareerEntry {
  return { company: "", role: "", period: "", description: "" };
}
function emptyCert(): CertEntry {
  return { name: "", detail: "" };
}

const POSITION_PRESETS = [
  "프론트엔드 개발자", "백엔드 개발자", "풀스택 개발자", "iOS 개발자", "Android 개발자",
  "DevOps 엔지니어", "데이터 엔지니어", "데이터 분석가", "데이터 사이언티스트", "ML 엔지니어",
  "PM / PO", "서비스 기획자", "UX 디자이너", "UI 디자이너", "프로덕트 디자이너",
  "QA 엔지니어", "보안 엔지니어", "클라우드 엔지니어", "DBA", "임베디드 개발자",
  "게임 개발자", "블록체인 개발자", "마케팅 매니저", "콘텐츠 마케터", "그로스 해커",
  "HR 매니저", "경영기획", "영업 매니저", "CS 매니저", "재무/회계",
];

const EXPERIENCE_OPTIONS = ["신입", "1~3년", "3~5년", "5~7년", "7~10년", "10년+"];
const DEGREE_OPTIONS = ["학사", "석사", "박사", "전문학사", "고졸"];
const EDU_STATUS_OPTIONS = ["졸업", "재학", "수료", "중퇴", "졸업예정"];

const STEP_HINTS: Record<string, string> = {
  contact: "이메일·전화 중 하나만 입력해도 괜찮아요.",
  education: "없으면 바로 다음으로 넘어가도 괜찮아요.",
  career: "신입이면 항목 추가 없이 다음으로 넘어가세요.",
  certs: "없으면 바로 다음으로 넘어가도 괜찮아요.",
  skills: "선택사항이에요. 비워두고 넘어가도 괜찮아요.",
  activities: "없으면 비워두고 넘어가도 괜찮아요.",
  extra: "없으면 비워두고 넘어가도 괜찮아요.",
};

interface MicroStepDef {
  id: string;
  question: string;
  cheer: string;
  required: boolean;
  label: string;
}

const MICRO_STEPS: MicroStepDef[] = [
  { id: "name",       question: "이름을 알려주세요",               cheer: "시작이 반이에요!",           required: true,  label: "이름" },
  { id: "contact",    question: "연락처를 입력해주세요",            cheer: "채용 담당자가 연락할 수 있어요", required: false, label: "연락처" },
  { id: "position",   question: "지원 직무를 입력해주세요",          cheer: "맞춤 이력서를 만들어 드릴게요", required: true,  label: "지원 직무" },
  { id: "experience", question: "총 경력을 선택해주세요",            cheer: "좋아요!",                  required: false, label: "총 경력" },
  { id: "education",  question: "학력을 입력해주세요",              cheer: "대학원도 추가할 수 있어요",   required: false, label: "학력" },
  { id: "career",     question: "경력 사항을 입력해주세요",          cheer: "성과 중심으로 적으면 최고예요!", required: false, label: "경력 사항" },
  { id: "certs",      question: "자격증이나 어학 성적이 있나요?",     cheer: "선택사항이에요",             required: false, label: "자격증/어학" },
  { id: "skills",     question: "보유 기술을 알려주세요",            cheer: "핵심 기술 위주로!",           required: false, label: "기술 스택" },
  { id: "activities", question: "대외활동이나 수상 경력이 있나요?",   cheer: "거의 다 왔어요!",             required: false, label: "대외활동/수상" },
  { id: "extra",      question: "추가로 넣고 싶은 내용이 있나요?",   cheer: "마지막이에요!",               required: false, label: "추가 정보" },
  { id: "review",     question: "입력한 내용을 확인하세요",          cheer: "완벽해요! 확인하고 생성하세요", required: false, label: "" },
];

export default function ResumeGeneratePage() {
  const router = useRouter();

  const [pageStep, setPageStep] = useState<PageStep>("form");
  const [micro, setMicro] = useState(0);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [position, setPosition] = useState("");
  const [positionOpen, setPositionOpen] = useState(false);
  const [yearsOfExperience, setYearsOfExperience] = useState("");
  const [skills, setSkills] = useState("");
  const [activities, setActivities] = useState("");
  const [extraInfo, setExtraInfo] = useState("");

  const [educations, setEducations] = useState<EducationEntry[]>([]);
  const [eduBuffer, setEduBuffer] = useState<EducationEntry>(emptyEdu());
  const [careers, setCareers] = useState<CareerEntry[]>([]);
  const [careerBuffer, setCareerBuffer] = useState<CareerEntry>(emptyCareer());
  const [certs, setCerts] = useState<CertEntry[]>([]);
  const [certBuffer, setCertBuffer] = useState<CertEntry>(emptyCert());

  const [result, setResult] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const positionRef = useRef<HTMLDivElement>(null);
  const resultRef = useRef<HTMLTextAreaElement>(null);

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

  function getFieldSummary(id: string): string {
    switch (id) {
      case "name":       return name;
      case "contact":    return [email, phone].filter(Boolean).join(" · ");
      case "position":   return position;
      case "experience": return yearsOfExperience;
      case "education":
        if (educations.length === 0) return "";
        return educations.length === 1 ? educations[0].school : `${educations.length}개 입력됨`;
      case "career":
        if (careers.length === 0) return "";
        return careers.length === 1 ? careers[0].company : `${careers.length}개 입력됨`;
      case "certs":
        if (certs.length === 0) return "";
        return certs.length === 1 ? certs[0].name : `${certs.length}개 입력됨`;
      case "skills":     return skills;
      case "activities": return activities ? activities.slice(0, 40) + (activities.length > 40 ? "…" : "") : "";
      case "extra":      return extraInfo ? extraInfo.slice(0, 40) + (extraInfo.length > 40 ? "…" : "") : "";
      default:           return "";
    }
  }

  function canAdvance(): boolean {
    const step = MICRO_STEPS[micro];
    if (!step.required) return true;
    return getFieldSummary(step.id).trim().length > 0;
  }

  function commitBuffers(id: string) {
    if (id === "education" && eduBuffer.school.trim()) {
      setEducations((prev) => [...prev, { ...eduBuffer }]);
      setEduBuffer(emptyEdu());
    } else if (id === "career" && careerBuffer.company.trim()) {
      setCareers((prev) => [...prev, { ...careerBuffer }]);
      setCareerBuffer(emptyCareer());
    } else if (id === "certs" && certBuffer.name.trim()) {
      setCerts((prev) => [...prev, { ...certBuffer }]);
      setCertBuffer(emptyCert());
    }
  }

  function goNext() {
    if (!canAdvance()) return;
    commitBuffers(MICRO_STEPS[micro].id);
    setPositionOpen(false);
    setMicro((s) => Math.min(s + 1, MICRO_STEPS.length - 1));
  }

  function goPrev() {
    setPositionOpen(false);
    setMicro((s) => Math.max(s - 1, 0));
  }

  function skipToReview() {
    commitBuffers(MICRO_STEPS[micro].id);
    setPositionOpen(false);
    setMicro(MICRO_STEPS.length - 1);
  }

  const canGenerate = name.trim().length > 0 && position.trim().length > 0;
  const isReview = micro === MICRO_STEPS.length - 1;
  const currentStep = MICRO_STEPS[micro];

  async function handleGenerate() {
    if (!canGenerate) return;
    setError(null);
    setPageStep("loading");
    try {
      const res = await fetch("/api/generate-resume-doc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          contact: [email.trim(), phone.trim()].filter(Boolean).join(" / ") || undefined,
          position: position.trim(),
          yearsOfExperience: yearsOfExperience || undefined,
          educations: educations.length > 0 ? educations : undefined,
          careers: careers.length > 0 ? careers : undefined,
          certs: certs.length > 0 ? certs : undefined,
          skills: skills.trim() || undefined,
          activities: activities.trim() || undefined,
          extraInfo: extraInfo.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "생성 실패");
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
  const subInputCls = "w-full rounded-xl bg-white border border-[var(--gray-200)] px-4 py-3 text-[14px] text-[var(--gray-900)] placeholder:text-[var(--gray-400)] focus:outline-none focus:ring-2 focus:ring-[var(--blue-primary)]/20";
  const subTextareaCls = "w-full resize-none rounded-xl bg-white border border-[var(--gray-200)] px-4 py-3 text-[14px] leading-[21px] text-[var(--gray-900)] placeholder:text-[var(--gray-400)] focus:outline-none focus:ring-2 focus:ring-[var(--blue-primary)]/20";
  const chipCls = (active: boolean) => `rounded-full px-3 py-2 text-[13px] font-medium transition-colors ${active ? "bg-[var(--blue-primary)] text-white" : "bg-white border border-[var(--gray-200)] text-[var(--gray-700)] hover:bg-[var(--gray-50)]"}`;
  const addBtnCls = "w-full rounded-xl bg-[var(--blue-primary)] py-2.5 text-[13px] font-bold text-white disabled:opacity-40 disabled:cursor-not-allowed";

  function renderInput(id: string) {
    switch (id) {
      case "name":
        return <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 홍길동" className={inputCls} autoFocus />;

      case "contact":
        return (
          <div className="flex flex-col gap-3">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="이메일 (예: hong@gmail.com)" className={inputCls} autoFocus />
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
              placeholder="전화번호 (예: 010-1234-5678)" className={inputCls} />
            <div className="flex items-center gap-1.5 mt-0.5">
              <svg className="h-3.5 w-3.5 shrink-0 text-[var(--gray-400)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <p className="text-[11px] text-[var(--gray-400)]">저장되지 않아요. 이력서 생성에만 사용되며, AI에 학습되지 않아요.</p>
            </div>
          </div>
        );

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
              const isExact = POSITION_PRESETS.some((p) => p === trimmed);
              const showCustom = trimmed.length > 0 && !isExact;
              if (!showCustom && filtered.length === 0) return null;
              return (
                <div className="absolute left-0 right-0 top-full mt-1 max-h-[200px] overflow-y-auto rounded-xl bg-white border border-[var(--gray-200)] shadow-lg z-20">
                  {showCustom && (
                    <button type="button" onClick={() => { setPosition(trimmed); setPositionOpen(false); }}
                      className="w-full text-left px-4 py-2.5 text-[13px] text-[var(--gray-900)] font-semibold hover:bg-[var(--gray-50)] border-b border-[var(--gray-100)]">
                      {trimmed} <span className="text-[var(--gray-400)] font-normal">(직접 입력)</span>
                    </button>
                  )}
                  {filtered.map((p) => (
                    <button key={p} type="button" onClick={() => { setPosition(p); setPositionOpen(false); }}
                      className="w-full text-left px-4 py-2.5 text-[13px] text-[var(--gray-700)] hover:bg-[var(--gray-50)]">
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
              <button key={opt} type="button"
                onClick={() => setYearsOfExperience(yearsOfExperience === opt ? "" : opt)}
                className={`rounded-full px-4 py-2.5 text-[14px] font-medium transition-colors ${yearsOfExperience === opt ? "bg-[var(--blue-primary)] text-white" : "bg-[var(--gray-100)] text-[var(--gray-700)] hover:bg-[var(--gray-200)]"}`}>
                {opt}
              </button>
            ))}
          </div>
        );

      case "education":
        return (
          <div className="flex flex-col gap-3">
            {educations.length > 0 && (
              <div className="flex flex-col gap-2">
                {educations.map((edu, i) => (
                  <div key={i} className="flex items-center justify-between rounded-xl bg-[var(--gray-100)] px-4 py-3">
                    <div>
                      <p className="text-[13px] font-bold text-[var(--gray-900)]">{edu.school}</p>
                      <p className="text-[11px] text-[var(--gray-500)]">
                        {[edu.major, edu.degree, edu.status].filter(Boolean).join(" · ")}
                        {edu.graduationYear ? ` · ${edu.graduationYear}` : ""}
                      </p>
                    </div>
                    <button onClick={() => setEducations((prev) => prev.filter((_, idx) => idx !== i))}
                      className="text-[12px] font-semibold text-red-400">삭제</button>
                  </div>
                ))}
              </div>
            )}
            <div className="rounded-xl bg-[var(--gray-50)] border border-[var(--gray-200)] p-4 flex flex-col gap-3">
              <p className="text-[12px] font-bold text-[var(--gray-700)]">{educations.length === 0 ? "학력 입력" : "학력 추가"}</p>
              <input type="text" value={eduBuffer.school}
                onChange={(e) => setEduBuffer((prev) => ({ ...prev, school: e.target.value }))}
                placeholder="학교명 (예: 서울대학교)" className={subInputCls} />
              <input type="text" value={eduBuffer.major}
                onChange={(e) => setEduBuffer((prev) => ({ ...prev, major: e.target.value }))}
                placeholder="전공 (예: 컴퓨터공학과)" className={subInputCls} />
              <div>
                <p className="text-[11px] font-medium text-[var(--gray-500)] mb-1.5">학위</p>
                <div className="flex flex-wrap gap-2">
                  {DEGREE_OPTIONS.map((d) => (
                    <button key={d} type="button"
                      onClick={() => setEduBuffer((prev) => ({ ...prev, degree: prev.degree === d ? "" : d }))}
                      className={chipCls(eduBuffer.degree === d)}>{d}</button>
                  ))}
                </div>
              </div>
              <input type="text" value={eduBuffer.graduationYear}
                onChange={(e) => setEduBuffer((prev) => ({ ...prev, graduationYear: e.target.value }))}
                placeholder="졸업연도 (예: 2023)" className={subInputCls} />
              <div>
                <p className="text-[11px] font-medium text-[var(--gray-500)] mb-1.5">재학상태</p>
                <div className="flex flex-wrap gap-2">
                  {EDU_STATUS_OPTIONS.map((s) => (
                    <button key={s} type="button"
                      onClick={() => setEduBuffer((prev) => ({ ...prev, status: prev.status === s ? "" : s }))}
                      className={chipCls(eduBuffer.status === s)}>{s}</button>
                  ))}
                </div>
              </div>
              <button type="button" disabled={!eduBuffer.school.trim()}
                onClick={() => {
                  if (!eduBuffer.school.trim()) return;
                  setEducations((prev) => [...prev, { ...eduBuffer }]);
                  setEduBuffer(emptyEdu());
                }}
                className={addBtnCls}>이 학력 추가</button>
            </div>
          </div>
        );

      case "career":
        return (
          <div className="flex flex-col gap-3">
            {careers.length > 0 && (
              <div className="flex flex-col gap-2">
                {careers.map((c, i) => (
                  <div key={i} className="flex items-center justify-between rounded-xl bg-[var(--gray-100)] px-4 py-3">
                    <div>
                      <p className="text-[13px] font-bold text-[var(--gray-900)]">{c.company}</p>
                      <p className="text-[11px] text-[var(--gray-500)]">{[c.role, c.period].filter(Boolean).join(" · ")}</p>
                    </div>
                    <button onClick={() => setCareers((prev) => prev.filter((_, idx) => idx !== i))}
                      className="text-[12px] font-semibold text-red-400">삭제</button>
                  </div>
                ))}
              </div>
            )}
            <div className="rounded-xl bg-[var(--gray-50)] border border-[var(--gray-200)] p-4 flex flex-col gap-3">
              <p className="text-[12px] font-bold text-[var(--gray-700)]">{careers.length === 0 ? "경력 입력" : "경력 추가"}</p>
              <input type="text" value={careerBuffer.company}
                onChange={(e) => setCareerBuffer((prev) => ({ ...prev, company: e.target.value }))}
                placeholder="회사명 (예: 카카오)" className={subInputCls} />
              <input type="text" value={careerBuffer.role}
                onChange={(e) => setCareerBuffer((prev) => ({ ...prev, role: e.target.value }))}
                placeholder="직무/직책 (예: 백엔드 개발자)" className={subInputCls} />
              <input type="text" value={careerBuffer.period}
                onChange={(e) => setCareerBuffer((prev) => ({ ...prev, period: e.target.value }))}
                placeholder="기간 (예: 2021.03 ~ 현재)" className={subInputCls} />
              <textarea rows={3} value={careerBuffer.description}
                onChange={(e) => setCareerBuffer((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="주요 업무 및 성과를 간략히 적어주세요"
                className={subTextareaCls} />
              <button type="button" disabled={!careerBuffer.company.trim()}
                onClick={() => {
                  if (!careerBuffer.company.trim()) return;
                  setCareers((prev) => [...prev, { ...careerBuffer }]);
                  setCareerBuffer(emptyCareer());
                }}
                className={addBtnCls}>이 경력 추가</button>
            </div>
          </div>
        );

      case "certs":
        return (
          <div className="flex flex-col gap-3">
            {certs.length > 0 && (
              <div className="flex flex-col gap-2">
                {certs.map((c, i) => (
                  <div key={i} className="flex items-center justify-between rounded-xl bg-[var(--gray-100)] px-4 py-3">
                    <div>
                      <p className="text-[13px] font-bold text-[var(--gray-900)]">{c.name}</p>
                      {c.detail && <p className="text-[11px] text-[var(--gray-500)]">{c.detail}</p>}
                    </div>
                    <button onClick={() => setCerts((prev) => prev.filter((_, idx) => idx !== i))}
                      className="text-[12px] font-semibold text-red-400">삭제</button>
                  </div>
                ))}
              </div>
            )}
            <div className="rounded-xl bg-[var(--gray-50)] border border-[var(--gray-200)] p-4 flex flex-col gap-3">
              <p className="text-[12px] font-bold text-[var(--gray-700)]">자격증/어학 입력</p>
              <input type="text" value={certBuffer.name}
                onChange={(e) => setCertBuffer((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="예: 정보처리기사, TOEIC 950" className={subInputCls} />
              <input type="text" value={certBuffer.detail}
                onChange={(e) => setCertBuffer((prev) => ({ ...prev, detail: e.target.value }))}
                placeholder="취득일 또는 점수 (예: 2023.06)" className={subInputCls} />
              <button type="button" disabled={!certBuffer.name.trim()}
                onClick={() => {
                  if (!certBuffer.name.trim()) return;
                  setCerts((prev) => [...prev, { ...certBuffer }]);
                  setCertBuffer(emptyCert());
                }}
                className={addBtnCls}>추가</button>
            </div>
          </div>
        );

      case "skills":
        return <input type="text" value={skills} onChange={(e) => setSkills(e.target.value)}
          placeholder="예: React, TypeScript, Python, AWS" className={inputCls} autoFocus />;

      case "activities":
        return <textarea rows={4} value={activities} onChange={(e) => setActivities(e.target.value)}
          placeholder="대외활동, 수상 경력, 교육 이수 등을 자유롭게 적어주세요"
          className={textareaCls} autoFocus />;

      case "extra":
        return <textarea rows={5} value={extraInfo} onChange={(e) => setExtraInfo(e.target.value)}
          placeholder={"특허, 포트폴리오 링크, 외국어 능력, 병역, 봉사활동 등\n자유롭게 추가 입력해주세요"}
          className={textareaCls} autoFocus />;

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
        <h1 className="text-[22px] font-extrabold text-[var(--gray-900)]">이력서 생성</h1>
        <p className="mt-1 text-[14px] text-[var(--gray-500)]">지금 바로 사용할 수 있는 깔끔한 이력서를 만들어 드려요</p>
      </div>

      {/* ===== WIZARD ===== */}
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

          <div className="flex flex-col">
            {/* Completed fields faded stack */}
            {micro > 0 && !isReview && (
              <div className="space-y-1.5 mb-6">
                {MICRO_STEPS.slice(0, micro).map((step) => {
                  const val = getFieldSummary(step.id);
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

            {/* Current step */}
            <AnimatePresence mode="wait">
              {!isReview ? (
                <motion.div
                  key={`micro-${micro}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.25 }}
                >
                  <p className="text-[12px] font-medium text-[var(--blue-primary)] mb-2">{currentStep.cheer}</p>
                  <h2 className="text-[18px] font-extrabold text-[var(--gray-900)] mb-4">{currentStep.question}</h2>
                  {renderInput(currentStep.id)}
                  {STEP_HINTS[currentStep.id] && (
                    <p className="mt-2 text-[11px] text-[var(--gray-400)]">{STEP_HINTS[currentStep.id]}</p>
                  )}
                </motion.div>
              ) : (
                /* Review */
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

                  {/* 기본 정보 — 항목별 수정 버튼 */}
                  <div className="flex flex-col gap-2">
                    {[
                      { l: "이름",   v: name,                                                   id: "name" },
                      { l: "연락처", v: [email, phone].filter(Boolean).join(" · "),              id: "contact" },
                      { l: "직무",   v: position,                                               id: "position" },
                      { l: "경력",   v: yearsOfExperience,                                      id: "experience" },
                    ].filter((r) => r.v).map((r) => (
                      <div key={r.l} className="flex items-center justify-between rounded-xl bg-[var(--gray-50)] px-4 py-3">
                        <div className="flex items-baseline gap-3 flex-1 min-w-0">
                          <span className="shrink-0 text-[11px] font-medium text-[var(--gray-400)] w-[48px]">{r.l}</span>
                          <span className="text-[13px] font-semibold text-[var(--gray-800)] truncate">{r.v}</span>
                        </div>
                        <button onClick={() => setMicro(MICRO_STEPS.findIndex((s) => s.id === r.id))}
                          className="ml-3 shrink-0 text-[12px] font-semibold text-[var(--blue-primary)]">수정</button>
                      </div>
                    ))}
                  </div>

                  {/* 학력 */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[13px] font-bold text-[var(--gray-900)]">학력</p>
                      <button onClick={() => setMicro(MICRO_STEPS.findIndex((s) => s.id === "education"))}
                        className="text-[12px] font-semibold text-[var(--blue-primary)]">수정</button>
                    </div>
                    {educations.length > 0 ? (
                      <div className="flex flex-col gap-2">
                        {educations.map((edu, i) => (
                          <div key={i} className="rounded-xl bg-[var(--gray-100)] px-4 py-3">
                            <p className="text-[13px] font-bold text-[var(--gray-900)]">{edu.school}</p>
                            <p className="text-[11px] text-[var(--gray-500)]">
                              {[edu.major, edu.degree, edu.status].filter(Boolean).join(" · ")}
                              {edu.graduationYear ? ` · ${edu.graduationYear}` : ""}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[13px] text-[var(--gray-400)]">입력한 학력이 없어요</p>
                    )}
                  </div>

                  {/* 경력 */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[13px] font-bold text-[var(--gray-900)]">경력 사항</p>
                      <button onClick={() => setMicro(MICRO_STEPS.findIndex((s) => s.id === "career"))}
                        className="text-[12px] font-semibold text-[var(--blue-primary)]">수정</button>
                    </div>
                    {careers.length > 0 ? (
                      <div className="flex flex-col gap-2">
                        {careers.map((c, i) => (
                          <div key={i} className="rounded-xl bg-[var(--gray-100)] px-4 py-3">
                            <p className="text-[13px] font-bold text-[var(--gray-900)]">{c.company}</p>
                            <p className="text-[11px] text-[var(--gray-500)]">{[c.role, c.period].filter(Boolean).join(" · ")}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[13px] text-[var(--gray-400)]">입력한 경력이 없어요 (신입은 정상이에요)</p>
                    )}
                  </div>

                  {/* 자격증/어학 */}
                  {certs.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[13px] font-bold text-[var(--gray-900)]">자격증/어학</p>
                        <button onClick={() => setMicro(MICRO_STEPS.findIndex((s) => s.id === "certs"))}
                          className="text-[12px] font-semibold text-[var(--blue-primary)]">수정</button>
                      </div>
                      <div className="flex flex-col gap-2">
                        {certs.map((c, i) => (
                          <div key={i} className="rounded-xl bg-[var(--gray-100)] px-4 py-3">
                            <p className="text-[13px] font-bold text-[var(--gray-900)]">{c.name}</p>
                            {c.detail && <p className="text-[11px] text-[var(--gray-500)]">{c.detail}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 기술 스택 */}
                  {skills && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[13px] font-bold text-[var(--gray-900)]">기술 스택</p>
                        <button onClick={() => setMicro(MICRO_STEPS.findIndex((s) => s.id === "skills"))}
                          className="text-[12px] font-semibold text-[var(--blue-primary)]">수정</button>
                      </div>
                      <p className="text-[13px] text-[var(--gray-700)]">{skills}</p>
                    </div>
                  )}

                  {/* 대외활동/수상 */}
                  {activities && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[13px] font-bold text-[var(--gray-900)]">대외활동/수상</p>
                        <button onClick={() => setMicro(MICRO_STEPS.findIndex((s) => s.id === "activities"))}
                          className="text-[12px] font-semibold text-[var(--blue-primary)]">수정</button>
                      </div>
                      <p className="text-[13px] text-[var(--gray-700)] line-clamp-3">{activities}</p>
                    </div>
                  )}

                  {/* 추가 정보 */}
                  {extraInfo && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[13px] font-bold text-[var(--gray-900)]">추가 정보</p>
                        <button onClick={() => setMicro(MICRO_STEPS.findIndex((s) => s.id === "extra"))}
                          className="text-[12px] font-semibold text-[var(--blue-primary)]">수정</button>
                      </div>
                      <p className="text-[13px] text-[var(--gray-700)] line-clamp-3">{extraInfo}</p>
                    </div>
                  )}
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
          className="fixed inset-y-0 w-full max-w-[640px] z-[100] bg-white flex flex-col items-center justify-center px-6"
          style={{ left: "50%", transform: "translateX(-50%)" }}
        >
          <div className="w-44 h-44 flex items-center justify-center">
            <LottieAnimation src="/lottie/Sparkles Loop Loader ai.json" className="w-full h-full object-contain" />
          </div>
          <h2 className="mt-1 text-[20px] font-extrabold text-[var(--gray-900)] tracking-tight text-center">이력서를 작성하고 있어요</h2>
          <p className="mt-3 text-[14px] text-[var(--gray-500)] font-medium">보통 15~30초 정도 걸려요</p>
        </motion.div>
      )}

      {/* ===== RESULT ===== */}
      {pageStep === "result" && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-[14px] font-bold text-[var(--gray-900)]">생성된 이력서</p>
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
            <button onClick={() => exportAsPDF(result, "이력서")}
              className="flex items-center justify-center gap-1.5 rounded-2xl bg-[var(--gray-900)] py-3 text-[14px] font-semibold text-white active:scale-[0.99] transition-transform">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" />
                <line x1="12" y1="18" x2="12" y2="12" /><polyline points="9 15 12 18 15 15" />
              </svg>PDF 저장
            </button>
            <button onClick={() => exportAsWord(result, "이력서")}
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
                {micro >= 3 && canGenerate && (
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
                  이력서 생성하기
                </span>
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

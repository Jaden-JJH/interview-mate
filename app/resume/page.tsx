"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import StepIndicator from "@/components/StepIndicator";
import LottieAnimation from "@/components/LottieAnimation";
import PremiumGenerateButton from "@/components/PremiumGenerateButton";
import { useInterview } from "@/contexts/InterviewContext";
import { extractPdfText } from "@/lib/pdf";
import {
  addGuestResume,
  deleteGuestResume,
  isGuestMode,
  loadGuestResumes,
} from "@/lib/guest-resume-store";

const DUMMY_RESUME = `저는 3년 차 프론트엔드 개발자로, React와 TypeScript를 주력 기술 스택으로 활용하고 있습니다. 현재 재직 중인 회사에서 B2B SaaS 제품의 프론트엔드를 담당하며, 컴포넌트 설계 및 상태 관리 최적화에 기여했습니다.

대표 프로젝트로는 실시간 대시보드 시스템 구축이 있으며, WebSocket과 React Query를 활용하여 데이터 갱신 주기를 기존 대비 60% 개선한 경험이 있습니다. 또한 디자인 시스템을 주도적으로 구축하여 팀 내 UI 일관성을 높이고, 컴포넌트 재사용률을 40% 향상시켰습니다.

협업 측면에서는 백엔드 및 디자인 팀과의 원활한 커뮤니케이션을 중시하며, 코드 리뷰 문화 정착에 기여한 바 있습니다. 새로운 기술에 대한 학습 의지가 강하며, 사용자 경험을 최우선으로 고려하는 개발자가 되고자 합니다.`;

const MAX_SLOTS = 3;

interface SavedResume {
  id: string;
  content: string;
  fileName: string | null;
  updatedAt: string;
}

type TabType = "pdf" | "text";

const PARSING_TEXTS = [
  "PDF를 읽고 있어요...",
  "텍스트를 추출하는 중...",
  "한국어 인식 중...",
  "거의 다 됐어요...",
];

const PREVIEW_MAX_CHARS = 400;
const SLOT_PREVIEW_CHARS = 160;

// Isolated so that the 900ms tick doesn't re-render the parent (and the
// neighbouring lottie player) every cycle.
function ParsingStatusText() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      setI((v) => (v + 1) % PARSING_TEXTS.length);
    }, 900);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="h-5 relative w-full flex items-center justify-center overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.p
          key={i}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.25 }}
          className="absolute text-[12px] text-[var(--blue-primary)] font-medium"
        >
          {PARSING_TEXTS[i]}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}

function formatShortDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export default function ResumePage() {
  const router = useRouter();
  const { setResume } = useInterview();

  // Warm next-route chunk while user fills the form.
  useEffect(() => {
    router.prefetch("/job-posting");
  }, [router]);

  // null while loading. [] = no saved slots. otherwise list of slots (newest first).
  const [slots, setSlots] = useState<SavedResume[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  // Empty-state tabs (only used when slots.length === 0).
  const [activeTab, setActiveTab] = useState<TabType>("pdf");
  const [textContent, setTextContent] = useState("");

  // Upload buffer — shared by empty-PDF and adding flows.
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [pdfText, setPdfText] = useState("");
  const [isParsingPdf, setIsParsingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const addPanelRef = useRef<HTMLDivElement>(null);

  // Hydrate slot list.
  useEffect(() => {
    let cancelled = false;
    if (isGuestMode()) {
      const list = loadGuestResumes();
      setSlots(list);
      if (list.length > 0) setSelectedId(list[0].id);
      return;
    }
    fetch("/api/me/resume", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return;
        const list: SavedResume[] = data?.resumes ?? [];
        setSlots(list);
        if (list.length > 0) setSelectedId(list[0].id);
      })
      .catch(() => {
        if (!cancelled) setSlots([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const resetUploadBuffer = useCallback(() => {
    setUploadedFileName(null);
    setPdfText("");
    setPdfError(null);
    setIsDragOver(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const MAX_PDF_BYTES = 10 * 1024 * 1024;

  const handleFileSelect = useCallback(async (file: File) => {
    if (!(file.type === "application/pdf" || file.name.endsWith(".pdf"))) {
      setPdfError("PDF 파일만 업로드할 수 있어요.");
      return;
    }
    if (file.size === 0) {
      setPdfError("파일이 비어 있어요. 다른 PDF를 선택해 주세요.");
      return;
    }
    if (file.size > MAX_PDF_BYTES) {
      setPdfError("파일 크기가 10MB를 초과해요. 더 작은 PDF를 사용해 주세요.");
      return;
    }
    setUploadedFileName(file.name);
    setPdfError(null);
    setIsParsingPdf(true);
    try {
      const text = await extractPdfText(file);
      if (text.trim().length === 0) {
        throw new Error("PDF에서 텍스트를 추출하지 못했어요");
      }
      setPdfText(text);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "PDF 파싱 실패";
      setPdfError(`${msg}. 직접 입력 탭을 이용해 주세요.`);
      setPdfText("");
      setUploadedFileName(null);
    } finally {
      setIsParsingPdf(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFileSelect(file);
    },
    [handleFileSelect]
  );

  const handleStartAdding = () => {
    setIsAdding(true);
    setSubmitError(null);
    resetUploadBuffer();
    // Bring drop zone into view.
    setTimeout(() => {
      addPanelRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 50);
  };

  const handleCancelAdding = () => {
    setIsAdding(false);
    resetUploadBuffer();
    setSubmitError(null);
  };

  const handleAddSlot = async () => {
    if (!uploadedFileName || !pdfText.trim() || isSubmitting) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const content = pdfText.trim();
      let slot: SavedResume;
      if (isGuestMode()) {
        const result = addGuestResume(content, uploadedFileName);
        if (!result.ok) {
          setSubmitError("이력서는 3개까지 등록 가능해요.");
          return;
        }
        slot = result.resume;
      } else {
        const res = await fetch("/api/me/resume", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content, fileName: uploadedFileName }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setSubmitError(data?.message ?? "이력서 저장에 실패했어요");
          return;
        }
        const { resume } = (await res.json()) as { resume: SavedResume };
        // Local values are authoritative — server echoes, but stubs in test mode.
        slot = {
          id: resume.id,
          content,
          fileName: uploadedFileName,
          updatedAt: resume.updatedAt,
        };
      }
      setSlots((prev) => [slot, ...(prev ?? [])].slice(0, MAX_SLOTS));
      setSelectedId(slot.id);
      setIsAdding(false);
      resetUploadBuffer();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSlot = async (id: string) => {
    if (!confirm("이 이력서를 삭제할까요?")) return;
    if (isGuestMode()) {
      deleteGuestResume(id);
    } else {
      const res = await fetch(`/api/me/resume?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) return;
    }
    setSlots((prev) => {
      const next = (prev ?? []).filter((s) => s.id !== id);
      if (selectedId === id) {
        setSelectedId(next[0]?.id ?? null);
      }
      return next;
    });
  };

  const handleNext = async () => {
    if (isSubmitting) return;
    const list = slots ?? [];

    if (list.length === 0) {
      // No saved slots — first interview. Save (PDF) or use ephemeral (text).
      if (activeTab === "pdf") {
        if (!uploadedFileName || !pdfText.trim()) return;
        setIsSubmitting(true);
        setSubmitError(null);
        try {
          const content = pdfText.trim();
          if (isGuestMode()) {
            const result = addGuestResume(content, uploadedFileName);
            if (!result.ok) {
              setSubmitError("이력서는 3개까지 등록 가능해요.");
              return;
            }
          } else {
            const res = await fetch("/api/me/resume", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ content, fileName: uploadedFileName }),
            });
            if (!res.ok) {
              const data = await res.json().catch(() => ({}));
              setSubmitError(data?.message ?? "이력서 저장에 실패했어요");
              return;
            }
            await res.json().catch(() => null);
          }
          setResume(content, uploadedFileName);
          router.push("/job-posting");
        } finally {
          setIsSubmitting(false);
        }
      } else {
        // Direct-text input is ephemeral — used for this interview only.
        if (!textContent.trim()) return;
        setResume(textContent.trim());
        router.push("/job-posting");
      }
      return;
    }

    // Picking from saved list.
    const picked = list.find((s) => s.id === selectedId);
    if (!picked) return;
    setResume(picked.content, picked.fileName ?? undefined);
    router.push("/job-posting");
  };

  const slotCount = slots?.length ?? 0;
  const hasSlots = slotCount > 0;
  const isFull = slotCount >= MAX_SLOTS;

  const canSubmit =
    !isSubmitting &&
    !isParsingPdf &&
    ((slotCount === 0 &&
      ((activeTab === "pdf" &&
        !!uploadedFileName &&
        pdfText.trim().length > 0) ||
        (activeTab === "text" && textContent.trim().length > 0))) ||
      (hasSlots && !!selectedId));

  // The drop zone is rendered in two places (empty-PDF tab and adding-mode panel).
  const renderDropZone = (opts: { compact?: boolean } = {}) => (
    <>
      <div
        onDrop={uploadedFileName ? undefined : handleDrop}
        onDragOver={(e) => {
          if (uploadedFileName) return;
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onClick={() => {
          if (uploadedFileName) return;
          fileInputRef.current?.click();
        }}
        className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed bg-white px-6 text-center transition-all ${
          uploadedFileName
            ? opts.compact
              ? "pt-10 pb-6 cursor-default"
              : "pt-14 pb-10 cursor-default"
            : opts.compact
            ? "py-10 cursor-pointer"
            : "py-14 cursor-pointer"
        } ${
          isDragOver
            ? "border-[var(--blue-primary)] bg-[var(--blue-light)]"
            : uploadedFileName
            ? "border-[var(--blue-primary)] bg-[var(--blue-light)]"
            : "border-[var(--gray-300)]"
        }`}
      >
        {uploadedFileName ? (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex flex-col items-center gap-3"
          >
            <LottieAnimation
              src={
                isParsingPdf
                  ? "/lottie/Search a file.json"
                  : "/lottie/success confetti.json"
              }
              className={opts.compact ? "w-40 h-40 -my-8" : "w-56 h-56 -my-12"}
              loop={isParsingPdf}
            />
            <div className="rounded-lg bg-white px-5 py-2.5 text-[15px] font-medium text-[var(--gray-700)] shadow-sm">
              {uploadedFileName}
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                resetUploadBuffer();
              }}
              className="text-[12px] font-medium text-[var(--gray-500)] underline underline-offset-2 hover:text-[var(--gray-900)]"
            >
              다른 파일 선택
            </button>
            {isParsingPdf && <ParsingStatusText />}
            {!isParsingPdf && pdfText && (
              <p className="text-[14px] font-medium text-[var(--gray-500)]">
                {pdfText.length.toLocaleString()}자 추출 완료
              </p>
            )}
          </motion.div>
        ) : opts.compact ? (
          <>
            <svg
              className="w-12 h-12 mb-2 text-[var(--gray-400)]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.6}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <path d="M14 2v6h6" />
              <path d="M12 18v-6" />
              <path d="M9 15l3-3 3 3" />
            </svg>
            <p className="text-[13px] font-medium text-[var(--gray-700)]">
              PDF 파일을 업로드해 주세요
            </p>
            <p className="mt-1 text-[12px] text-[var(--gray-400)]">
              드래그 또는 클릭하여 파일 선택
            </p>
          </>
        ) : (
          <>
            <LottieAnimation
              src="/lottie/File Search.json"
              className="w-28 h-28 mb-1"
            />
            <p className="text-[14px] font-medium text-[var(--gray-700)]">
              PDF 파일을 업로드해 주세요
            </p>
            <p className="mt-1 text-[12px] text-[var(--gray-400)]">
              드래그 또는 클릭하여 파일 선택
            </p>
          </>
        )}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileSelect(file);
        }}
      />
      {pdfError && (
        <p className="mt-3 text-[12px] text-[var(--danger)] text-center">
          {pdfError}
        </p>
      )}
    </>
  );

  return (
    <motion.div
      className="flex min-h-dvh flex-col bg-white"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Top bar */}
      <div className="bg-white">
        <StepIndicator currentStep={1} totalSteps={3} />
        <div className="px-5 pt-6 pb-2 flex items-end justify-between relative">
          <div className="relative z-10 pb-4 pt-2">
            <h1 className="text-[22px] font-bold text-[var(--gray-900)] leading-tight">
              자기소개서를 입력해 주세요
            </h1>
            <p className="mt-1.5 text-[14px] text-[var(--gray-500)] font-medium">
              면접 질문 생성에 활용돼요
            </p>
          </div>
          <div className="w-32 h-32 shrink-0 pointer-events-none flex items-end justify-end relative right-1">
            <LottieAnimation
              src="/lottie/Young programmers working with computer.json"
              className="w-[130%] h-[130%] object-contain"
            />
          </div>
        </div>

        {/* Tabs only when there are no saved slots. */}
        {slots !== null && slotCount === 0 && (
          <div className="flex border-b border-[var(--gray-200)]">
            {(["pdf", "text"] as TabType[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 pb-3 text-[14px] transition-colors ${
                  activeTab === tab ? "tab-active" : "tab-inactive"
                }`}
              >
                {tab === "pdf" ? "PDF 업로드" : "직접 입력"}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 px-5 pt-5 pb-28">
        {/* Loading skeleton */}
        {slots === null && (
          <div className="space-y-2 animate-pulse">
            <div className="h-4 w-24 rounded bg-[var(--gray-100)] mb-3" />
            {[0, 1].map((i) => (
              <div
                key={i}
                className="h-[68px] rounded-2xl bg-[var(--gray-100)]"
              />
            ))}
            <div className="h-12 rounded-2xl border border-dashed border-[var(--gray-200)] mt-3" />
          </div>
        )}

        {/* Empty (0 slots) — same as previous default flow */}
        {slots !== null && slotCount === 0 && (
          <AnimatePresence mode="wait">
            {activeTab === "pdf" ? (
              <motion.div
                key="pdf"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2 }}
              >
                {renderDropZone()}

                {/* Extraction preview */}
                <AnimatePresence>
                  {!isParsingPdf && pdfText && uploadedFileName && (
                    <motion.div
                      key="preview"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.25 }}
                      className="mt-4 rounded-2xl border border-[var(--gray-200)] shadow-sm bg-white p-5"
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <LottieAnimation
                          src="/lottie/login success.json"
                          className="w-7 h-7"
                          loop={false}
                        />
                        <span className="text-[13px] font-semibold text-[#00875A]">
                          추출 완료
                        </span>
                        <span className="ml-auto text-[12px] text-[var(--gray-400)] font-medium">
                          {pdfText.length.toLocaleString()}자
                        </span>
                      </div>
                      <p className="text-[12px] text-[var(--gray-400)] mb-1.5">
                        추출된 텍스트 미리보기
                      </p>
                      <p className="text-[13px] leading-[20px] text-[var(--gray-700)] whitespace-pre-line break-words">
                        {pdfText.slice(0, PREVIEW_MAX_CHARS)}
                        {pdfText.length > PREVIEW_MAX_CHARS && "…"}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {!uploadedFileName && (
                  <>
                    <div className="mt-5">
                      <PremiumGenerateButton />
                    </div>
                    <button
                      onClick={() => {
                        setUploadedFileName("이력서_샘플.pdf");
                        setPdfText(DUMMY_RESUME);
                      }}
                      className="mt-4 w-full text-center text-[12px] text-[var(--gray-400)] underline underline-offset-2"
                    >
                      데모용 샘플로 테스트하기
                    </button>
                  </>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="text"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
              >
                <textarea
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  placeholder="자기소개서 내용을 붙여넣으세요"
                  className="h-56 w-full resize-none rounded-2xl bg-white px-4 py-4 text-[14px] leading-[22px] text-[var(--gray-900)] placeholder:text-[var(--gray-400)] focus:outline-none focus:ring-2 focus:ring-[var(--blue-primary)]/20 transition-all"
                />
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-[12px] text-[var(--gray-400)]">
                    {textContent.length}자
                  </span>
                  {!textContent && (
                    <button
                      onClick={() => setTextContent(DUMMY_RESUME)}
                      className="text-[12px] text-[var(--blue-primary)] font-medium"
                    >
                      샘플 채우기
                    </button>
                  )}
                </div>
                <p className="mt-2 text-[11px] text-[var(--gray-400)]">
                  직접 입력은 이번 면접에만 사용돼요. 다음에도 쓰려면 PDF로 업로드해 주세요.
                </p>
                {!textContent && (
                  <div className="mt-5">
                    <PremiumGenerateButton />
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        )}

        {/* Has saved slots — radio list */}
        {hasSlots && (
          <>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[12px] font-semibold text-[var(--gray-500)]">
                저장된 이력서
              </p>
              <p className="text-[12px] font-medium text-[var(--gray-400)]">
                {slotCount}/{MAX_SLOTS}
              </p>
            </div>

            <ul className="space-y-2">
              {slots!.map((s) => {
                const isSel = s.id === selectedId;
                return (
                  <li key={s.id}>
                    <label
                      className={`flex items-center gap-3 rounded-2xl border px-4 py-3 cursor-pointer transition-all ${
                        isSel
                          ? "border-[var(--blue-primary)] bg-[var(--blue-light)]"
                          : "border-[var(--gray-200)] bg-white"
                      }`}
                    >
                      <input
                        type="radio"
                        name="resume-slot"
                        checked={isSel}
                        onChange={() => setSelectedId(s.id)}
                        className="h-4 w-4 accent-[var(--blue-primary)]"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-[var(--gray-900)] truncate">
                          {s.fileName ?? "직접 입력"} ·{" "}
                          <span className="font-medium text-[var(--gray-500)]">
                            {formatShortDate(s.updatedAt)}
                          </span>
                        </p>
                        {isSel && (
                          <p className="mt-1 text-[12px] leading-[18px] text-[var(--gray-600)] whitespace-pre-line break-words line-clamp-3">
                            {s.content.slice(0, SLOT_PREVIEW_CHARS)}
                            {s.content.length > SLOT_PREVIEW_CHARS && "…"}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDeleteSlot(s.id);
                        }}
                        aria-label="이력서 삭제"
                        className="shrink-0 text-[12px] font-medium text-[var(--gray-400)] hover:text-[var(--danger)] px-2 py-1"
                      >
                        삭제
                      </button>
                    </label>
                  </li>
                );
              })}
            </ul>

            {/* Add CTA / slot full notice */}
            {!isFull && !isAdding && (
              <button
                type="button"
                onClick={handleStartAdding}
                className="mt-3 w-full rounded-2xl border border-dashed border-[var(--gray-300)] py-3 text-[13px] font-semibold text-[var(--gray-700)] hover:border-[var(--blue-primary)] hover:text-[var(--blue-primary)] transition-colors"
              >
                + 새 이력서 등록
              </button>
            )}
            {isFull && (
              <div className="mt-3 rounded-2xl bg-[var(--gray-100)] px-4 py-3 text-[12px] text-[var(--gray-600)] text-center leading-[18px]">
                이력서는 {MAX_SLOTS}개까지 등록 가능해요.
                <br />
                새로 등록하려면 기존 이력서를 삭제해 주세요.
              </div>
            )}

            {/* Inline-expanded add panel */}
            <AnimatePresence>
              {isAdding && (
                <motion.div
                  ref={addPanelRef}
                  key="add-panel"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25 }}
                  className="mt-3 overflow-hidden"
                >
                  <div className="rounded-2xl border border-[var(--gray-200)] bg-white p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-[13px] font-bold text-[var(--gray-900)]">
                        새 이력서 등록
                      </p>
                      <button
                        type="button"
                        onClick={handleCancelAdding}
                        className="text-[12px] font-medium text-[var(--gray-500)] hover:text-[var(--gray-900)]"
                      >
                        취소
                      </button>
                    </div>
                    {renderDropZone({ compact: true })}
                    {submitError && (
                      <p className="mt-3 text-[12px] text-[var(--danger)] text-center">
                        {submitError}
                      </p>
                    )}
                    {uploadedFileName && pdfText && !isParsingPdf && (
                      <button
                        type="button"
                        onClick={handleAddSlot}
                        disabled={isSubmitting}
                        className={`mt-3 w-full rounded-xl py-3 text-[14px] font-bold transition-colors ${
                          isSubmitting
                            ? "bg-[var(--gray-200)] text-[var(--gray-400)] cursor-not-allowed"
                            : "bg-[var(--blue-primary)] text-white"
                        }`}
                      >
                        {isSubmitting ? "저장 중..." : "이 이력서 추가"}
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Premium - compact under the list */}
            <div className="mt-5">
              <PremiumGenerateButton
                variant="compact"
                disabled={isFull}
                disabledReason="기존 이력서를 삭제해 주세요"
              />
            </div>
          </>
        )}
      </div>

      <div className="pointer-events-none fixed bottom-[88px] left-1/2 w-full max-w-[640px] h-16 -translate-x-1/2 bg-gradient-to-t from-white to-transparent z-40" />

      {/* Bottom CTA */}
      <div className="fixed bottom-0 left-1/2 w-full max-w-[640px] -translate-x-1/2 bg-white px-5 pb-8 pt-3 border-t border-[var(--gray-200)] z-50">
        {submitError && slotCount === 0 && (
          <p className="mb-2 text-[12px] text-[var(--danger)] text-center">
            {submitError}
          </p>
        )}
        <button
          disabled={!canSubmit}
          onClick={handleNext}
          className={`w-full rounded-2xl py-[16px] text-[16px] font-bold transition-all ${
            canSubmit
              ? "bg-[var(--blue-primary)] text-white active:scale-[0.98]"
              : "bg-[var(--gray-200)] text-[var(--gray-400)] cursor-not-allowed"
          }`}
        >
          {isSubmitting ? "저장 중..." : "다음"}
        </button>
      </div>
    </motion.div>
  );
}

"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import StepIndicator from "@/components/StepIndicator";

const DUMMY_RESUME = `저는 3년 차 프론트엔드 개발자로, React와 TypeScript를 주력 기술 스택으로 활용하고 있습니다. 현재 재직 중인 회사에서 B2B SaaS 제품의 프론트엔드를 담당하며, 컴포넌트 설계 및 상태 관리 최적화에 기여했습니다.

대표 프로젝트로는 실시간 대시보드 시스템 구축이 있으며, WebSocket과 React Query를 활용하여 데이터 갱신 주기를 기존 대비 60% 개선한 경험이 있습니다. 또한 디자인 시스템을 주도적으로 구축하여 팀 내 UI 일관성을 높이고, 컴포넌트 재사용률을 40% 향상시켰습니다.

협업 측면에서는 백엔드 및 디자인 팀과의 원활한 커뮤니케이션을 중시하며, 코드 리뷰 문화 정착에 기여한 바 있습니다. 새로운 기술에 대한 학습 의지가 강하며, 사용자 경험을 최우선으로 고려하는 개발자가 되고자 합니다.`;

type TabType = "pdf" | "text";

export default function ResumePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("pdf");
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [textContent, setTextContent] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasInput =
    (activeTab === "pdf" && uploadedFileName !== null) ||
    (activeTab === "text" && textContent.trim().length > 0);

  const handleFileSelect = useCallback((file: File) => {
    if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
      setUploadedFileName(file.name);
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

  return (
    <motion.div
      className="flex min-h-dvh flex-col bg-[var(--gray-bg)]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Top bar */}
      <div className="bg-white">
        <StepIndicator currentStep={1} totalSteps={3} />
        <div className="px-5 pt-6 pb-5">
          <h1 className="text-[22px] font-bold text-[var(--gray-900)] leading-tight">
            자기소개서를 입력해 주세요
          </h1>
          <p className="mt-1.5 text-[14px] text-[var(--gray-500)]">
            면접 질문 생성에 활용돼요
          </p>
        </div>

        {/* Tabs */}
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
      </div>

      {/* Content */}
      <div className="flex-1 px-5 pt-5 pb-28">
        <AnimatePresence mode="wait">
          {activeTab === "pdf" ? (
            <motion.div
              key="pdf"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
            >
              <div
                onDrop={handleDrop}
                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                onClick={() => fileInputRef.current?.click()}
                className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed bg-white px-6 py-14 text-center transition-all ${
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
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--blue-primary)]">
                      <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-[13px] font-medium text-[var(--gray-700)] shadow-sm">
                      {uploadedFileName}
                      <button
                        onClick={(e) => { e.stopPropagation(); setUploadedFileName(null); }}
                        className="text-[var(--gray-400)] hover:text-[var(--danger)]"
                      >
                        ✕
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <>
                    <svg className="mb-3 h-10 w-10 text-[var(--gray-300)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                    </svg>
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
              {!uploadedFileName && (
                <button
                  onClick={() => setUploadedFileName("이력서_홍길동_2024.pdf")}
                  className="mt-4 w-full text-center text-[12px] text-[var(--gray-400)] underline underline-offset-2"
                >
                  데모용 샘플로 테스트하기
                </button>
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
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom CTA */}
      <div className="fixed bottom-0 left-1/2 w-full max-w-[640px] -translate-x-1/2 bg-white px-5 pb-8 pt-3 border-t border-[var(--gray-200)]">
        <button
          disabled={!hasInput}
          onClick={() => router.push("/job-posting")}
          className={`w-full rounded-2xl py-[16px] text-[16px] font-bold transition-all ${
            hasInput
              ? "bg-[var(--blue-primary)] text-white active:scale-[0.98]"
              : "bg-[var(--gray-200)] text-[var(--gray-400)] cursor-not-allowed"
          }`}
        >
          다음
        </button>
      </div>
    </motion.div>
  );
}

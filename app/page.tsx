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

  const handleFileSelect = useCallback(
    (file: File) => {
      if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
        setUploadedFileName(file.name);
      }
    },
    []
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFileSelect(file);
    },
    [handleFileSelect]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => setIsDragOver(false);

  const fillDummy = () => setTextContent(DUMMY_RESUME);

  return (
    <motion.div
      className="flex min-h-dvh flex-col"
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.35, ease: "easeInOut" }}
    >
      {/* Step indicator */}
      <StepIndicator currentStep={1} totalSteps={3} label="자기소개서 입력" />

      {/* Main content */}
      <div className="flex-1 overflow-y-auto px-5 pb-28">
        {/* Tab toggle */}
        <div className="mb-5 flex rounded-xl bg-gray-100 p-1">
          {(["pdf", "text"] as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`relative flex-1 rounded-lg py-2.5 text-sm font-semibold transition-colors ${
                activeTab === tab
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab === "pdf" ? "PDF 업로드" : "직접 입력"}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {activeTab === "pdf" ? (
            <motion.div
              key="pdf"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {/* Drop zone */}
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-16 text-center transition-all ${
                  isDragOver
                    ? "border-indigo-500 bg-indigo-50"
                    : uploadedFileName
                    ? "border-indigo-300 bg-indigo-50/50"
                    : "border-gray-300 bg-indigo-50/30 hover:border-indigo-400 hover:bg-indigo-50/60"
                }`}
              >
                {uploadedFileName ? (
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="flex flex-col items-center gap-3"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100">
                      <svg
                        className="h-6 w-6 text-indigo-600"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                    <div className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-gray-200">
                      📄 {uploadedFileName}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setUploadedFileName(null);
                        }}
                        className="ml-1 text-gray-400 hover:text-red-500"
                      >
                        ✕
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <>
                    <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-100/80">
                      <svg
                        className="h-7 w-7 text-indigo-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1.5}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                        />
                      </svg>
                    </div>
                    <p className="text-sm font-medium text-gray-700">
                      PDF 파일을 드래그하거나
                      <br />
                      클릭하여 업로드하세요
                    </p>
                    <p className="mt-1 text-xs text-gray-400">
                      최대 10MB · PDF 형식만 지원
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

              {/* Quick demo shortcut */}
              {!uploadedFileName && (
                <button
                  onClick={() => setUploadedFileName("이력서_홍길동_2024.pdf")}
                  className="mt-4 w-full text-center text-xs text-indigo-500 hover:text-indigo-700 underline underline-offset-2"
                >
                  데모용 샘플 파일로 테스트하기
                </button>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="text"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <textarea
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                placeholder="자기소개서 내용을 여기에 붙여넣으세요"
                className="h-64 w-full resize-none rounded-2xl border border-gray-200 bg-white px-4 py-4 text-sm leading-relaxed text-gray-800 placeholder:text-gray-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all"
              />
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs text-gray-400">
                  {textContent.length}자 입력됨
                </span>
                {!textContent && (
                  <button
                    onClick={fillDummy}
                    className="text-xs text-indigo-500 hover:text-indigo-700 underline underline-offset-2"
                  >
                    샘플 자기소개서 채우기
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom CTA */}
      <div className="fixed bottom-0 left-1/2 w-full max-w-[640px] -translate-x-1/2 bg-gradient-to-t from-gray-50 via-gray-50/95 to-gray-50/0 px-5 pb-6 pt-4">
        <button
          disabled={!hasInput}
          onClick={() => router.push("/job-posting")}
          className={`w-full rounded-xl py-4 text-base font-semibold transition-all ${
            hasInput
              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200 hover:bg-indigo-500 active:scale-[0.98]"
              : "cursor-not-allowed bg-indigo-600/50 text-white/70"
          }`}
        >
          다음 단계로 →
        </button>
      </div>
    </motion.div>
  );
}

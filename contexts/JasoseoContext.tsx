// 자소서메이트 분석·생성 상태(원문·채용공고·분석결과·unlock 결과)를 관리하는 Context 프로바이더
"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export interface AnalysisAxes {
  logic: number;
  specificity: number;
  relevance: number;
  uniqueness: number;
  interviewDefense: number;
}

export interface AnalysisWeakness {
  title: string;
  detail?: string;
  interviewQuestion?: string;
}

export interface AnalysisSection {
  questionTitle: string;
  originalText: string;
  score: number;
  strength: string;
  weaknesses: AnalysisWeakness[];
}

export interface AnalysisResult {
  analysisId: string;
  overallScore: number;
  overallComment: string;
  axes: AnalysisAxes;
  sections: AnalysisSection[];
}

export interface UnlockedWeakness {
  title: string;
  detail: string;
  interviewQuestion: string;
}

export interface UnlockedSection {
  questionTitle: string;
  weaknesses: UnlockedWeakness[];
  revisedText: string;
}

interface JasoseoState {
  resumeText: string;
  jobPostingText: string;
  analysisResult: AnalysisResult | null;
  unlockedSections: UnlockedSection[] | null;
}

interface JasoseoContextValue extends JasoseoState {
  setResumeText: (text: string) => void;
  setJobPostingText: (text: string) => void;
  setAnalysisResult: (result: AnalysisResult) => void;
  setUnlockedSections: (sections: UnlockedSection[]) => void;
  reset: () => void;
}

const INITIAL: JasoseoState = {
  resumeText: "",
  jobPostingText: "",
  analysisResult: null,
  unlockedSections: null,
};

const JasoseoContext = createContext<JasoseoContextValue | null>(null);

export function JasoseoProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<JasoseoState>(INITIAL);

  const setResumeText = useCallback((resumeText: string) => {
    setState((s) => ({ ...s, resumeText }));
  }, []);

  const setJobPostingText = useCallback((jobPostingText: string) => {
    setState((s) => ({ ...s, jobPostingText }));
  }, []);

  const setAnalysisResult = useCallback((analysisResult: AnalysisResult) => {
    setState((s) => ({ ...s, analysisResult }));
  }, []);

  const setUnlockedSections = useCallback(
    (unlockedSections: UnlockedSection[]) => {
      setState((s) => ({ ...s, unlockedSections }));
    },
    []
  );

  const reset = useCallback(() => {
    setState(INITIAL);
  }, []);

  const value = useMemo<JasoseoContextValue>(
    () => ({
      ...state,
      setResumeText,
      setJobPostingText,
      setAnalysisResult,
      setUnlockedSections,
      reset,
    }),
    [state, setResumeText, setJobPostingText, setAnalysisResult, setUnlockedSections, reset]
  );

  return (
    <JasoseoContext.Provider value={value}>{children}</JasoseoContext.Provider>
  );
}

export function useJasoseo(): JasoseoContextValue {
  const ctx = useContext(JasoseoContext);
  if (!ctx) {
    throw new Error("useJasoseo must be used within JasoseoProvider");
  }
  return ctx;
}

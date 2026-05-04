"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export interface JobPostingStructured {
  company: string;
  position: string;
  requirements: string;
  preferredQualifications: string;
  description: string;
}

export interface QAResult {
  question: string;
  answer: string;
  score: number;
  feedback: string;
  bestAnswer: string;
  keywords: string[];
}

export interface InterviewState {
  resume: string;
  resumeFileName?: string;
  jobPosting: JobPostingStructured | null;
  jobPostingRaw: string;
  questions: string[];
  qaResults: QAResult[];
  overallScore: number;
  overallComment: string;
}

interface InterviewContextValue extends InterviewState {
  setResume: (resume: string, fileName?: string) => void;
  setJobPosting: (
    jobPosting: JobPostingStructured | null,
    raw: string
  ) => void;
  setQuestions: (questions: string[]) => void;
  appendQAResult: (result: QAResult) => void;
  setOverall: (score: number, comment: string) => void;
  reset: () => void;
}

const INITIAL: InterviewState = {
  resume: "",
  resumeFileName: undefined,
  jobPosting: null,
  jobPostingRaw: "",
  questions: [],
  qaResults: [],
  overallScore: 0,
  overallComment: "",
};

const InterviewContext = createContext<InterviewContextValue | null>(null);

export function InterviewProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<InterviewState>(INITIAL);

  const setResume = useCallback((resume: string, fileName?: string) => {
    setState((s) => ({ ...s, resume, resumeFileName: fileName }));
  }, []);

  const setJobPosting = useCallback(
    (jobPosting: JobPostingStructured | null, raw: string) => {
      setState((s) => ({ ...s, jobPosting, jobPostingRaw: raw }));
    },
    []
  );

  const setQuestions = useCallback((questions: string[]) => {
    setState((s) => ({ ...s, questions, qaResults: [] }));
  }, []);

  const appendQAResult = useCallback((result: QAResult) => {
    setState((s) => ({ ...s, qaResults: [...s.qaResults, result] }));
  }, []);

  const setOverall = useCallback((overallScore: number, overallComment: string) => {
    setState((s) => ({ ...s, overallScore, overallComment }));
  }, []);

  const reset = useCallback(() => setState(INITIAL), []);

  const value = useMemo<InterviewContextValue>(
    () => ({
      ...state,
      setResume,
      setJobPosting,
      setQuestions,
      appendQAResult,
      setOverall,
      reset,
    }),
    [state, setResume, setJobPosting, setQuestions, appendQAResult, setOverall, reset]
  );

  return (
    <InterviewContext.Provider value={value}>{children}</InterviewContext.Provider>
  );
}

export function useInterview(): InterviewContextValue {
  const ctx = useContext(InterviewContext);
  if (!ctx) {
    throw new Error("useInterview must be used within InterviewProvider");
  }
  return ctx;
}

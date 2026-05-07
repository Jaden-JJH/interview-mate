"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  clearAll as clearStoredInterview,
  loadContext as loadStoredContext,
  saveContext as saveStoredContext,
} from "@/lib/interviewStorage";

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
  durationMinutes: number;
  personaId: string;
  resolvedPersonaId: string;
}

interface InterviewContextValue extends InterviewState {
  hydrated: boolean;
  setResume: (resume: string, fileName?: string) => void;
  setJobPosting: (
    jobPosting: JobPostingStructured | null,
    raw: string
  ) => void;
  setQuestions: (questions: string[]) => void;
  appendQAResult: (result: QAResult) => void;
  setOverall: (score: number, comment: string) => void;
  setDuration: (minutes: number) => void;
  setPersona: (id: string, resolvedId: string) => void;
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
  durationMinutes: 20,
  personaId: "alex",
  resolvedPersonaId: "alex",
};

const InterviewContext = createContext<InterviewContextValue | null>(null);

export function InterviewProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<InterviewState>(INITIAL);
  // Hydration runs once on mount — until then we don't write back, otherwise
  // the empty INITIAL would clobber whatever the user had stored. We also
  // expose this as a reactive flag so pages can hold their redirect guards
  // until hydration completes (otherwise a refresh bounces to step 1).
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = loadStoredContext<InterviewState>();
    if (stored) setState({ ...INITIAL, ...stored });
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveStoredContext(state);
  }, [state, hydrated]);

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

  const setDuration = useCallback((durationMinutes: number) => {
    setState((s) => ({ ...s, durationMinutes }));
  }, []);

  const setPersona = useCallback((personaId: string, resolvedPersonaId: string) => {
    setState((s) => ({ ...s, personaId, resolvedPersonaId }));
  }, []);

  const reset = useCallback(() => {
    clearStoredInterview();
    setState(INITIAL);
  }, []);

  const value = useMemo<InterviewContextValue>(
    () => ({
      ...state,
      hydrated,
      setResume,
      setJobPosting,
      setQuestions,
      appendQAResult,
      setOverall,
      setDuration,
      setPersona,
      reset,
    }),
    [
      state,
      hydrated,
      setResume,
      setJobPosting,
      setQuestions,
      appendQAResult,
      setOverall,
      setDuration,
      setPersona,
      reset,
    ]
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

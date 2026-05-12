// 기능별 크레딧 소비량 상수 — 단일 소스로 서버·클라 모두 참조
export const CREDIT_COSTS = {
  interview: 2,
  resumeAnalysisUnlock: 1,
  resumeGenerate: 0,
  careerGenerate: 1,
  resumeDocGenerate: 0,
  answersGenerate: 2,
} as const;

export type CreditAction = keyof typeof CREDIT_COSTS;

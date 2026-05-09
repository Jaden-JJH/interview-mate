// 금지 단어 자동 검출 — 메인 계정 봇 탐지 방지용 정적 필터

const FORBIDDEN = [
  "자동화", "봇", "테스트", "시스템", "publisher",
  "에이전트", "큐", "API", "dev",
];

export type ForbiddenResult = {
  pass: boolean;
  found: string[];
};

export function checkForbiddenWords(text: string): ForbiddenResult {
  const found = FORBIDDEN.filter((w) => text.includes(w));
  return { pass: found.length === 0, found };
}

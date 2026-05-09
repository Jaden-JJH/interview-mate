// 복수 이름 폴백을 지원하는 환경변수 읽기·필수 검증 유틸리티 함수 모음
// integrations that prefix variables with the project name
// (e.g. interview_mate_DATABASE_URL).
export function readEnv(...names: string[]): string | undefined {
  for (const name of names) {
    const value = process.env[name];
    if (value) return value;
  }
  return undefined;
}

export function requireEnv(...names: string[]): string {
  const value = readEnv(...names);
  if (!value) {
    throw new Error(
      `Missing env var. Set one of: ${names.join(", ")}`
    );
  }
  return value;
}

export const DATABASE_URL_NAMES = [
  "DATABASE_URL",
  "interview_mate_DATABASE_URL",
] as const;

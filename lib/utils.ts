// Tailwind 클래스명을 조건부로 합치는 cn 유틸리티 함수
export function cn(
  ...classes: (string | number | null | false | undefined)[]
): string {
  return classes.filter(Boolean).join(" ");
}

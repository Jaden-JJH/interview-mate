/**
 * jobplanet.ts — 잡플래닛 컨텐츠 어댑터
 *
 * 잡플래닛(jobplanet.co.kr/contents)은 공식 RSS 피드를 제공하지 않는다.
 * 메인 콘텐츠 페이지(https://www.jobplanet.co.kr/contents)에 접근 시
 * HTTP 403 반환 — 인증 없이는 자동화 접근 불가.
 *
 * 상태: 미구현 (접근 차단)
 * TOS 위험도: 높음 — robots.txt 미확인, 403 차단, 로그인 필수
 * 권장 여부: 없음 (미구현)
 *
 * 향후 구현 방향:
 *   - 잡플래닛이 공식 RSS/API를 공개하면 추가
 *   - 공식 파트너십 체결 후 접근 가능
 */

import type { SourceArticle } from "./types.js";

export async function fetchArticles(): Promise<SourceArticle[]> {
  // 잡플래닛은 로그인 필수 + HTTP 403 차단으로 자동화 접근 불가.
  // 공식 RSS/API 제공 시 구현 예정.
  console.warn(
    "[jobplanet] 잡플래닛은 공식 RSS 미제공 + 접근 차단으로 미구현 상태입니다.",
  );
  return [];
}

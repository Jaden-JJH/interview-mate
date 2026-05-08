/**
 * jobkorea.ts — 잡코리아 콘텐츠LAB 어댑터
 *
 * 잡코리아 콘텐츠LAB(https://www.jobkorea.co.kr/goodjob/tip)은
 * 공식 RSS 피드를 제공하지 않는다.
 *
 * 모바일 URL에 TS_XML=2 파라미터가 존재하나 실제로는 HTML을 반환 (RSS 아님).
 * 인증 없이 페이지 접근은 가능하지만 공식 RSS 없음.
 *
 * 상태: 미구현 (공식 RSS 없음)
 * TOS 위험도: 중간 — 공개 페이지이나 robots.txt 크롤러 제한 확인 필요
 * 권장 여부: 없음 (미구현)
 *
 * 향후 구현 방향:
 *   - 잡코리아가 공식 RSS/API를 공개하면 추가
 *   - 또는 공개 HTML scraper 구현 (robots.txt 검토 후)
 */

import type { SourceArticle } from "./types.js";

export async function fetchArticles(): Promise<SourceArticle[]> {
  // 잡코리아 콘텐츠LAB은 공식 RSS 미제공으로 미구현 상태.
  console.warn(
    "[jobkorea] 잡코리아 콘텐츠LAB은 공식 RSS 미제공으로 미구현 상태입니다.",
  );
  return [];
}

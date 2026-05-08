/**
 * saramin.ts — 사람인 HR 매거진 어댑터
 *
 * 사람인(saramin.co.kr)의 HR 매거진 채용 트렌드 섹션은
 * 공식 RSS 피드를 제공하지 않는다.
 * 또한 HR 매거진 컨텐츠는 로그인 후에만 접근 가능 (인증 필요).
 *
 * 상태: 미구현 (로그인 필수)
 * TOS 위험도: 높음 — 인증 필요 콘텐츠, 공식 RSS 없음
 * 권장 여부: 없음 (미구현)
 *
 * 향후 구현 방향:
 *   - 사람인이 공개 RSS 또는 API를 제공하면 추가
 *   - 공식 파트너십 체결 후 데이터 접근 가능
 *
 * 대안:
 *   - 사람인 취업뉴스(https://www.saramin.co.kr/zf_user/help/live?listType=news)
 *     는 로그인 없이 접근 가능하나 공식 RSS 없음 — 추후 scraper 추가 검토
 */

import type { SourceArticle } from "./types.js";

export async function fetchArticles(): Promise<SourceArticle[]> {
  // 사람인 HR 매거진은 로그인 필수로 자동화 접근 불가.
  console.warn(
    "[saramin] 사람인 HR 매거진은 로그인 필수로 미구현 상태입니다.",
  );
  return [];
}

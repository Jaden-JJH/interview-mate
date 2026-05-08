/**
 * sources/index.ts — 소스 어댑터 통합 진입점
 *
 * 활성 소스:
 *   - naver-news   : 네이버 뉴스 검색 API (NAVER_CLIENT_ID/SECRET 필요)
 *   - daum-news    : 다음 뉴스 경제/사회 RSS (공개 RSS, 인증 불필요)
 *   - youtube-feed : YouTube 채널 RSS (면접왕이형, 캐치TV, 인싸담당자, EO, 신사임당)
 *   - wanted       : 원티드랩 블로그 HTML scrape (RSS 없음, 저속 폴링 권장)
 *
 * 비활성/미구현 소스:
 *   - jobplanet    : 잡플래닛 (403 차단, 공식 RSS 없음)
 *   - saramin      : 사람인 HR 매거진 (로그인 필수)
 *   - jobkorea     : 잡코리아 콘텐츠LAB (공식 RSS 없음)
 *   - blind        : 블라인드 (TOS 명시 금지 — 영구 제외)
 */

export * from "./types.js";
export { fetchArticles as fetchNaverNews } from "./naver-news.js";
export { fetchArticles as fetchDaumNews } from "./daum-news.js";
export { fetchArticles as fetchYouTube } from "./youtube-feed.js";
export { fetchArticles as fetchWanted } from "./wanted.js";

import { fetchArticles as fetchNaverNews } from "./naver-news.js";
import { fetchArticles as fetchDaumNews } from "./daum-news.js";
import { fetchArticles as fetchYouTube } from "./youtube-feed.js";
import { fetchArticles as fetchWanted } from "./wanted.js";
import type { SourceArticle } from "./types.js";

/**
 * 모든 활성 소스에서 기사를 수집하고 최신순으로 정렬하여 반환.
 * 개별 소스 오류는 무시하고 성공한 소스만 합산.
 */
export async function fetchAllArticles(): Promise<SourceArticle[]> {
  const fetchers = [
    { name: "naver-news", fn: fetchNaverNews },
    { name: "daum-news", fn: fetchDaumNews },
    { name: "youtube-feed", fn: fetchYouTube },
    { name: "wanted", fn: fetchWanted },
  ];

  const results = await Promise.allSettled(fetchers.map(({ fn }) => fn()));

  const all: SourceArticle[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    if (r.status === "rejected") {
      console.error(`[sources] ${fetchers[i].name} 오류:`, r.reason);
      continue;
    }
    for (const a of r.value) {
      if (!seen.has(a.dedup_hash)) {
        seen.add(a.dedup_hash);
        all.push(a);
      }
    }
  }

  return all.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
}

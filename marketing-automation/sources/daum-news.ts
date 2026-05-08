/**
 * daum-news.ts — 다음 뉴스 RSS 어댑터
 *
 * 다음(Daum) 뉴스는 카테고리별 RSS를 제공하나,
 * 검색어 기반 RSS는 공식 제공하지 않음.
 *
 * 확인된 RSS URL (카테고리 기반, 공개):
 *   - 경제 종합: http://media.daum.net/rss/part/primary/economic/rss2.xml
 *   - 사회 종합: http://media.daum.net/rss/part/primary/society/rss2.xml
 *
 * 위 두 카테고리에서 채용/취업 관련 기사를 키워드 필터링으로 추출.
 *
 * TOS 위험도: 낮음 — 공식 RSS 엔드포인트 사용
 * 일 한도: 명시적 한도 없음 (공개 RSS 풀링 방식)
 */

import { fetchRSS } from "./rss-fetcher.js";
import type { SourceArticle } from "./types.js";

const FEEDS: { url: string; name: string }[] = [
  {
    url: "http://media.daum.net/rss/part/primary/economic/rss2.xml",
    name: "daum-news-economic",
  },
  {
    url: "http://media.daum.net/rss/part/primary/society/rss2.xml",
    name: "daum-news-society",
  },
];

/** 채용/면접/취업 관련 키워드 필터 */
const KEYWORDS = [
  "면접",
  "채용",
  "취업",
  "구직",
  "신입",
  "경력직",
  "인사",
  "이직",
];

function isRelevant(article: SourceArticle): boolean {
  const text = (article.title + " " + article.content).toLowerCase();
  return KEYWORDS.some((kw) => text.includes(kw));
}

export async function fetchArticles(): Promise<SourceArticle[]> {
  const results = await Promise.allSettled(
    FEEDS.map(({ url, name }) => fetchRSS(url, name)),
  );

  const articles: SourceArticle[] = [];
  const seen = new Set<string>();

  for (const r of results) {
    if (r.status === "rejected") {
      console.error("[daum-news] fetch error:", r.reason);
      continue;
    }
    for (const a of r.value) {
      if (!seen.has(a.dedup_hash) && isRelevant(a)) {
        seen.add(a.dedup_hash);
        articles.push(a);
      }
    }
  }

  return articles.sort(
    (a, b) => b.publishedAt.getTime() - a.publishedAt.getTime(),
  );
}

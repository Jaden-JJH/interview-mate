/**
 * naver-news.ts — 네이버 뉴스 검색 API 어댑터
 *
 * 네이버 뉴스 RSS는 2022년 3월에 공식 종료됨.
 * 대안: 네이버 검색 Open API (https://openapi.naver.com/v1/search/news)
 *
 * 필요 환경변수 (marketing-automation/.env):
 *   NAVER_CLIENT_ID     — 네이버 개발자 센터 발급
 *   NAVER_CLIENT_SECRET — 네이버 개발자 센터 발급
 *
 * 일 호출 한도: 25,000회 (검색 API 기본 무료 할당량)
 * TOS: 네이버 개발자 센터 이용약관 — 자동화 허용 (API 방식)
 */

import { makeDedupHash, type SourceArticle } from "./types.js";

/** 수집 대상 검색어 목록 */
const QUERIES = ["면접", "채용", "취업", "신입 채용"];

const BASE_URL = "https://openapi.naver.com/v1/search/news.json";

interface NaverNewsItem {
  title: string;
  originallink: string;
  link: string;
  description: string;
  pubDate: string;
}

interface NaverNewsResponse {
  items: NaverNewsItem[];
}

/** HTML 엔티티 및 태그 제거 헬퍼 */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#\d+;/g, "")
    .trim();
}

/**
 * 단일 검색어로 뉴스 최신 기사 최대 `display`개 수집.
 * 결과는 날짜순(최신).
 */
async function fetchNaverNews(
  query: string,
  display = 10,
): Promise<SourceArticle[]> {
  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error(
      "NAVER_CLIENT_ID / NAVER_CLIENT_SECRET 환경변수가 없습니다.",
    );
  }

  const url = new URL(BASE_URL);
  url.searchParams.set("query", query);
  url.searchParams.set("display", String(display));
  url.searchParams.set("sort", "date"); // 최신순

  const res = await fetch(url.toString(), {
    headers: {
      "X-Naver-Client-Id": clientId,
      "X-Naver-Client-Secret": clientSecret,
    },
  });

  if (!res.ok) {
    throw new Error(`Naver API error: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as NaverNewsResponse;

  return data.items.map((item) => {
    const title = stripHtml(item.title);
    const link = item.originallink || item.link;
    const content = stripHtml(item.description);
    const publishedAt = new Date(item.pubDate);

    return {
      source: `naver-news-${query}`,
      url: link,
      title,
      content,
      publishedAt,
      lang: "ko" as const,
      dedup_hash: makeDedupHash(link, title),
    };
  });
}

/**
 * 모든 대상 검색어에 대해 뉴스를 수집하고 dedup 후 반환.
 */
export async function fetchArticles(): Promise<SourceArticle[]> {
  const results = await Promise.allSettled(
    QUERIES.map((q) => fetchNaverNews(q)),
  );

  const articles: SourceArticle[] = [];
  const seen = new Set<string>();

  for (const r of results) {
    if (r.status === "rejected") {
      console.error("[naver-news] fetch error:", r.reason);
      continue;
    }
    for (const a of r.value) {
      if (!seen.has(a.dedup_hash)) {
        seen.add(a.dedup_hash);
        articles.push(a);
      }
    }
  }

  return articles.sort(
    (a, b) => b.publishedAt.getTime() - a.publishedAt.getTime(),
  );
}

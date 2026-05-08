/**
 * rss-fetcher.ts — 공통 RSS fetch 헬퍼
 *
 * rss-parser 패키지를 사용하여 RSS/Atom 피드를 파싱하고
 * SourceArticle 배열로 변환한다.
 */

import Parser from "rss-parser";
import { makeDedupHash, type SourceArticle } from "./types.js";

// rss-parser는 CJS default export — ESM interop 처리
const parser = new Parser({
  customFields: {
    item: [
      ["content:encoded", "contentEncoded"],
      ["description", "description"],
    ],
  },
  // 한국어 사이트 대부분 UTF-8이지만 일부 EUC-KR 있음 — 헤더로 요청
  headers: {
    "Accept-Language": "ko-KR,ko;q=0.9",
    "User-Agent":
      "Mozilla/5.0 (compatible; InterviewMateBot/1.0; +https://interview-mate.kr)",
  },
  timeout: 10_000,
});

/**
 * RSS URL을 파싱하여 SourceArticle 배열로 반환.
 *
 * @param url    RSS 피드 URL
 * @param source 소스 식별자 (e.g. "youtube-myungjoowang")
 * @param lang   언어 ('ko' | 'en'), 기본값 'ko'
 */
export async function fetchRSS(
  url: string,
  source: string,
  lang: "ko" | "en" = "ko",
): Promise<SourceArticle[]> {
  const feed = await parser.parseURL(url);

  return feed.items.map((item) => {
    const title = item.title?.trim() ?? "(제목 없음)";
    const link = item.link ?? item.guid ?? "";
    const raw =
      (item as unknown as Record<string, unknown>)["contentEncoded"] ??
      item.content ??
      item.summary ??
      item.contentSnippet ??
      "";
    const content = typeof raw === "string" ? raw.trim() : "";
    const publishedAt = item.isoDate
      ? new Date(item.isoDate)
      : item.pubDate
        ? new Date(item.pubDate)
        : new Date();

    return {
      source,
      url: link,
      title,
      content,
      publishedAt,
      lang,
      dedup_hash: makeDedupHash(link, title),
    };
  });
}

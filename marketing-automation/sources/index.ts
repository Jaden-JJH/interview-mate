// 소스 어댑터 통합 진입점 — 활성: naver-news, youtube-feed, wanted

export * from "./types.js";
export { fetchArticles as fetchNaverNews } from "./naver-news.js";
export { fetchArticles as fetchYouTube } from "./youtube-feed.js";
export { fetchArticles as fetchWanted } from "./wanted.js";

import { fetchArticles as fetchNaverNews } from "./naver-news.js";
import { fetchArticles as fetchYouTube } from "./youtube-feed.js";
import { fetchArticles as fetchWanted } from "./wanted.js";
import type { SourceArticle } from "./types.js";

export async function fetchAllArticles(): Promise<SourceArticle[]> {
  const fetchers = [
    { name: "naver-news", fn: fetchNaverNews },
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

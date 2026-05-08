/**
 * youtube-feed.ts — YouTube 채널 RSS 어댑터
 *
 * YouTube는 YouTube Data API 없이도 채널별 공개 RSS를 제공한다:
 *   https://www.youtube.com/feeds/videos.xml?channel_id=CHANNEL_ID
 *
 * 수집 대상 채널 (면접/취업/커리어 관련 한국어 채널):
 *
 * | 채널명           | channel_id                  | 비고               |
 * |----------------|-----------------------------|--------------------|
 * | 면접왕 이형      | UCp-C7mtkuOw6q8E1Uc2NVpQ    | 면접 전문 채널       |
 * | 캐치TV           | UC5YKCgA3WR9NBQNQTs7BTsA    | 취업/이직 정보       |
 * | 인싸담당자       | UCq4lfIcWF7NAP5TcMsyRXXQ    | 인사담당자 시각      |
 * | EO (이오)        | UCQ2DWm5Md16Dc3xRwwhVE7Q    | 스타트업/창업 인터뷰  |
 * | 신사임당         | UCaJdckl6MBdDPDf75Ec_bJA    | 커리어/사이드프로젝트  |
 *
 * TOS 위험도: 없음 — YouTube 공식 공개 RSS 엔드포인트
 * 인증: 불필요 (YouTube Data API 키 불필요)
 * 한도: 없음 (공개 Atom 피드)
 * 업데이트 주기: 수십 분~수 시간 (YouTube 내부 캐시)
 */

import { fetchRSS } from "./rss-fetcher.js";
import type { SourceArticle } from "./types.js";

const YT_RSS_BASE = "https://www.youtube.com/feeds/videos.xml?channel_id=";

export const YOUTUBE_CHANNELS: { name: string; channelId: string }[] = [
  { name: "면접왕이형", channelId: "UCp-C7mtkuOw6q8E1Uc2NVpQ" },
  { name: "캐치TV", channelId: "UC5YKCgA3WR9NBQNQTs7BTsA" },
  { name: "인싸담당자", channelId: "UCq4lfIcWF7NAP5TcMsyRXXQ" },
  { name: "EO이오", channelId: "UCQ2DWm5Md16Dc3xRwwhVE7Q" },
  { name: "신사임당", channelId: "UCaJdckl6MBdDPDf75Ec_bJA" },
];

export async function fetchArticles(): Promise<SourceArticle[]> {
  const results = await Promise.allSettled(
    YOUTUBE_CHANNELS.map(({ name, channelId }) =>
      fetchRSS(`${YT_RSS_BASE}${channelId}`, `youtube-${name}`),
    ),
  );

  const articles: SourceArticle[] = [];
  const seen = new Set<string>();

  for (const r of results) {
    if (r.status === "rejected") {
      console.error("[youtube-feed] fetch error:", r.reason);
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

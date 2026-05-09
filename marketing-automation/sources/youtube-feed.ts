// YouTube Data API v3 어댑터 — playlistItems.list (1 unit/call, 5채널 = 5 unit/일)

import { env } from "../lib/env.js";
import { makeDedupHash, type SourceArticle } from "./types.js";

const API_BASE = "https://www.googleapis.com/youtube/v3/playlistItems";

export const YOUTUBE_CHANNELS: { name: string; channelId: string }[] = [
  { name: "면접왕이형", channelId: "UCp-C7mtkuOw6q8E1Uc2NVpQ" },
  { name: "캐치TV", channelId: "UC5YKCgA3WR9NBQNQTs7BTsA" },
  { name: "앤드스튜디오", channelId: "UCq4lfIcWF7NAP5TcMsyRXXQ" },
  { name: "EO이오", channelId: "UCQ2DWm5Md16Dc3xRwwhVE7Q" },
  { name: "신사임당", channelId: "UCaJdckl6MBdDPDf75Ec_bJA" },
];

function uploadsPlaylistId(channelId: string): string {
  return "UU" + channelId.slice(2);
}

type PlaylistItemSnippet = {
  title: string;
  description: string;
  publishedAt: string;
  resourceId: { videoId: string };
  channelTitle: string;
};

type PlaylistItemsResponse = {
  items?: { snippet: PlaylistItemSnippet }[];
  error?: { message: string };
};

async function fetchChannelVideos(
  name: string,
  channelId: string,
  apiKey: string,
): Promise<SourceArticle[]> {
  const playlistId = uploadsPlaylistId(channelId);
  const url = `${API_BASE}?part=snippet&playlistId=${playlistId}&maxResults=15&key=${apiKey}`;

  const res = await fetch(url);
  const data = (await res.json()) as PlaylistItemsResponse;

  if (!res.ok || data.error) {
    throw new Error(`YouTube API [${name}]: ${data.error?.message ?? res.status}`);
  }

  return (data.items ?? []).map((item) => {
    const s = item.snippet;
    const videoUrl = `https://www.youtube.com/watch?v=${s.resourceId.videoId}`;
    return {
      source: `youtube-${name}`,
      url: videoUrl,
      title: s.title,
      content: s.description.slice(0, 500),
      publishedAt: new Date(s.publishedAt),
      lang: "ko" as const,
      dedup_hash: makeDedupHash(videoUrl, s.title),
    };
  });
}

export async function fetchArticles(): Promise<SourceArticle[]> {
  const apiKey = env.youtube.apiKey;
  if (!apiKey) {
    console.warn("[youtube-feed] YOUTUBE_API_KEY 미설정 — YouTube 수집 건너뜀");
    return [];
  }

  const results = await Promise.allSettled(
    YOUTUBE_CHANNELS.map(({ name, channelId }) =>
      fetchChannelVideos(name, channelId, apiKey),
    ),
  );

  const articles: SourceArticle[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    if (r.status === "rejected") {
      console.error(`[youtube-feed] ${YOUTUBE_CHANNELS[i].name} 오류:`, r.reason);
      continue;
    }
    for (const a of r.value) {
      if (!seen.has(a.dedup_hash)) {
        seen.add(a.dedup_hash);
        articles.push(a);
      }
    }
  }

  return articles.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
}

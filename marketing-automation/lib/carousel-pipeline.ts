// W3 carousel 파이프라인 — Master + IG variant → 4장 carousel(IG/Threads 동시 큐 적재).
// 3장 카드(cover+insight×2) puppeteer 렌더 + Vercel Blob 업로드 + 사전 자산 CTA URL 부착.
// content_queue.media_url 컬럼에 JSON array(URL 4개)로 저장 → publisher가 분기 처리.

import { config } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../../.env.local") });

import { db } from "./db.js";
import { renderCardToBuffer, type CardData } from "./card-renderer.js";
import { uploadCardImage } from "./blob-uploader.js";
import { getCtaCardUrl, assertCtaCardsReady } from "./cta-cards.js";
import { checkForbiddenWords } from "../guards/forbidden-words.js";
import type { IgCard } from "../agents/transformer-ig.js";

const COUNT_IG_PUBLISHED = db.prepare<[], { cnt: number }>(`
  SELECT COUNT(*) AS cnt FROM published_log WHERE channel = 'instagram'
`);

const INSERT_QUEUE = db.prepare(`
  INSERT INTO content_queue
    (account, channel, text, media_url, format, scheduled_at)
  VALUES
    (@account, @channel, @caption, @media_url, 'cardnews-carousel', @scheduled_at)
`);

export type QueueCarouselResult = {
  igQueueId: number;
  threadsQueueId: number;
  facebookQueueId: number;
  imageUrls: string[];
  colorIndex: 0 | 1 | 2;
};

/**
 * caption + cards(3장) → carousel 4장 IG/Threads 동시 큐 적재.
 *
 * @param cards transformer-ig 출력의 cover+insight×2 (정확히 3장)
 * @param caption IG/Threads 공용 캡션
 * @param scheduledAt ISO8601, 미지정 시 즉시
 */
export async function queueCarouselPost(
  cards: IgCard[],
  caption: string,
  scheduledAt?: string,
): Promise<QueueCarouselResult> {
  if (cards.length !== 3) {
    throw new Error(`carousel-pipeline: 카드 3장 필요(cover+insight×2). 입력 ${cards.length}장`);
  }
  assertCtaCardsReady();

  // 금지어: 캡션 + 모든 카드
  const captionCheck = checkForbiddenWords(caption);
  if (!captionCheck.pass) {
    throw new Error(`[carousel-pipeline] 캡션 금지어: ${captionCheck.found.join(", ")}`);
  }
  for (const c of cards) {
    const combined = [c.title, c.body, ...c.tags].join(" ");
    const check = checkForbiddenWords(combined);
    if (!check.pass) {
      throw new Error(`[carousel-pipeline] 카드#${c.cardNumber} 금지어: ${check.found.join(", ")}`);
    }
  }

  // 색 인덱스 — 행 단위 3사이클(IG 그리드). carousel 1게시물 내 모든 카드 동일 색.
  const { cnt } = COUNT_IG_PUBLISHED.get()!;
  const colorIndex = (Math.floor(cnt / 3) % 3) as 0 | 1 | 2;

  // 3장 puppeteer 렌더 + Blob 업로드
  const timestamp = Date.now();
  const renderedUrls: string[] = [];
  for (const c of cards) {
    const data: CardData = {
      title: c.title,
      body: c.body,
      tags: c.tags,
      colorIndex,
    };
    const buf = await renderCardToBuffer(data);
    const filename = `carousel-${timestamp}-${c.cardNumber}.png`;
    const url = await uploadCardImage(buf, filename);
    renderedUrls.push(url);
  }

  // CTA 카드는 사전 자산 — colorIndex 매칭 URL 부착
  const ctaUrl = getCtaCardUrl(colorIndex);
  const imageUrls = [...renderedUrls, ctaUrl];

  // 큐 적재 — IG + Threads
  const scheduled = scheduledAt ?? new Date().toISOString();
  const mediaUrlJson = JSON.stringify(imageUrls);
  const base = { caption, media_url: mediaUrlJson, scheduled_at: scheduled };

  const igResult = INSERT_QUEUE.run({ ...base, account: "main", channel: "instagram" });
  const threadsResult = INSERT_QUEUE.run({ ...base, account: "main", channel: "threads" });
  const fbResult = INSERT_QUEUE.run({ ...base, account: "main", channel: "facebook" });

  return {
    igQueueId: igResult.lastInsertRowid as number,
    threadsQueueId: threadsResult.lastInsertRowid as number,
    facebookQueueId: fbResult.lastInsertRowid as number,
    imageUrls,
    colorIndex,
  };
}

import { config } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../../.env.local") });

import { db } from "./db.js";
import { renderCardToBuffer } from "./card-renderer.js";
import { uploadCardImage } from "./blob-uploader.js";
import type { CardData } from "./card-renderer.js";

export type { CardData };

/**
 * SNS 발행 금지 단어 목록.
 * 제목·본문·해시태그에 이 단어가 포함되면 즉시 Error.
 */
const FORBIDDEN_WORDS = [
  "자동화",
  "봇",
  "테스트",
  "시스템",
  "publisher",
  "에이전트",
  "큐",
  "API",
  "dev",
] as const;

function checkForbiddenWords(data: CardData): void {
  const combined = [data.title, data.body, ...data.tags].join(" ");
  for (const word of FORBIDDEN_WORDS) {
    // 대소문자 구분 없이 검사
    if (combined.toLowerCase().includes(word.toLowerCase())) {
      throw new Error(
        `[card-pipeline] 금지 단어 "${word}" 포함됨 — 발행 차단. 내용을 수정하세요.`,
      );
    }
  }
}

const INSERT_QUEUE = db.prepare(`
  INSERT INTO content_queue
    (account, channel, text, media_url, format, scheduled_at)
  VALUES
    (@account, @channel, @caption, @media_url, 'cardnews', @scheduled_at)
`);

/**
 * 카드뉴스 파이프라인: 렌더 → 업로드 → DB 큐 적재.
 *
 * 1. CardData 금지어 검사
 * 2. renderCardToBuffer() — puppeteer PNG 생성
 * 3. uploadCardImage() — Vercel Blob 업로드 (또는 로컬 fallback)
 * 4. content_queue INSERT (channel='instagram', format='cardnews')
 *
 * @param data - 카드 내용
 * @param caption - IG 게시 캡션 (title/body와 별도로 작성 권장)
 * @param scheduledAt - 발행 예정 시각 ISO8601. 기본값: 지금 즉시
 */
export async function queueCardPost(
  data: CardData,
  caption: string,
  scheduledAt?: string,
): Promise<{ queueId: number; imageUrl: string }> {
  // 1. 금지어 검사
  checkForbiddenWords(data);

  // caption도 금지어 검사
  const captionCheck: CardData = { title: caption, body: "", tags: [] };
  checkForbiddenWords(captionCheck);

  // 2. PNG 렌더링
  const buffer = await renderCardToBuffer(data);

  // 3. 이미지 업로드
  const timestamp = Date.now();
  const filename = `card-${timestamp}.png`;
  const imageUrl = await uploadCardImage(buffer, filename);

  // 4. DB 큐 적재 — IG + Threads 동시 (같은 이미지·캡션 클론)
  const scheduled = scheduledAt ?? new Date().toISOString();
  const base = { caption, media_url: imageUrl, scheduled_at: scheduled };

  const igResult = INSERT_QUEUE.run({ ...base, account: "main", channel: "instagram" });
  INSERT_QUEUE.run({ ...base, account: "main", channel: "threads" });

  const queueId = igResult.lastInsertRowid as number;
  return { queueId, imageUrl };
}

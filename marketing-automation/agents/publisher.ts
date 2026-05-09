import { db, type QueueRow } from "../lib/db.js";
import { publishImage, publishCarousel } from "../lib/instagram.js";
import {
  publishText,
  publishImage as publishThreadsImage,
  publishCarousel as publishThreadsCarousel,
} from "../lib/threads.js";

/** media_url이 JSON 배열이면 carousel용 URL 배열, 단일 string이면 null. */
function tryParseCarouselUrls(media_url: string | null): string[] | null {
  if (!media_url) return null;
  if (!media_url.trim().startsWith("[")) return null;
  try {
    const parsed = JSON.parse(media_url);
    if (Array.isArray(parsed) && parsed.length >= 2 && parsed.every((u) => typeof u === "string")) {
      return parsed;
    }
  } catch {
    // JSON 파싱 실패 — 단일 URL 처리
  }
  return null;
}

const PICK_DUE = db.prepare<{ now: string }, QueueRow>(`
  SELECT * FROM content_queue
  WHERE status = 'pending'
    AND scheduled_at <= @now
  ORDER BY scheduled_at ASC
  LIMIT 1
`);

const MARK_PUBLISHING = db.prepare(`
  UPDATE content_queue
  SET status = 'publishing', attempts = attempts + 1
  WHERE id = ? AND status = 'pending'
`);

const MARK_PUBLISHED = db.prepare(`
  UPDATE content_queue SET status = 'published' WHERE id = ?
`);

const MARK_FAILED = db.prepare(`
  UPDATE content_queue
  SET status = 'failed', last_error = ?
  WHERE id = ?
`);

const INSERT_LOG = db.prepare(`
  INSERT INTO published_log (queue_id, account, channel, platform_media_id, permalink)
  VALUES (?, ?, ?, ?, ?)
`);

export type PublisherResult =
  | { kind: "no-due" }
  | { kind: "published"; queueId: number; mediaId: string; permalink: string | null }
  | { kind: "failed"; queueId: number; error: string };

/**
 * 큐에서 "발행 시각이 도래한 콘텐츠 1건"을 꺼내 발행.
 * 한 번에 1건만 처리해서 cron이 자주 돌아도 부하 분산.
 */
export async function runPublisherOnce(): Promise<PublisherResult> {
  const now = new Date().toISOString();
  const row = PICK_DUE.get({ now });
  if (!row) return { kind: "no-due" };

  // 락 획득: status를 'publishing'으로 한 트랜잭션에 못박음
  const claim = MARK_PUBLISHING.run(row.id);
  if (claim.changes === 0) {
    // 다른 워커가 먼저 가져갔거나 상태가 바뀜
    return { kind: "no-due" };
  }

  try {
    let result: { mediaId: string; permalink: string | null };

    const carouselUrls = tryParseCarouselUrls(row.media_url);

    if (row.channel === "threads") {
      if (carouselUrls) {
        result = await publishThreadsCarousel(row.text, carouselUrls);
      } else if (row.media_url) {
        result = await publishThreadsImage(row.text, row.media_url);
      } else {
        result = await publishText(row.text);
      }
    } else if (row.channel === "instagram") {
      if (carouselUrls) {
        result = await publishCarousel(row.text, carouselUrls);
      } else if (row.media_url) {
        result = await publishImage(row.text, row.media_url);
      } else {
        throw new Error("instagram 채널은 media_url 필수 (텍스트 단독 발행 불가)");
      }
    } else {
      throw new Error(`미지원 채널: ${row.channel}`);
    }

    INSERT_LOG.run(row.id, row.account, row.channel, result.mediaId, result.permalink);
    MARK_PUBLISHED.run(row.id);
    return {
      kind: "published",
      queueId: row.id,
      mediaId: result.mediaId,
      permalink: result.permalink,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    MARK_FAILED.run(msg, row.id);
    return { kind: "failed", queueId: row.id, error: msg };
  }
}

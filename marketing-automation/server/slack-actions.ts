// Slack 버튼 액션 핸들러 — approve / reject / regenerate
import { db } from "../lib/db.js";
import { env } from "../lib/env.js";
import { queueCarouselPost } from "../lib/carousel-pipeline.js";
import { transformToIg } from "../agents/transformer-ig.js";
import { buildShortsVideo } from "../lib/shorts-pipeline.js";
import { uploadVideo } from "../lib/youtube-upload.js";
import { sendSlack } from "../lib/slack.js";
import type { IgCard } from "../agents/transformer-ig.js";
import type { ShortsScript } from "../agents/transformer-shorts.js";

type MasterRow = { id: number; status: string; topic_slug: string; headline: string; body: string; keywords: string | null };
type VariantRow = { id: number; text: string; media_spec: string | null; status: string };

export type ActionResult = {
  text: string;
  success: boolean;
};

async function buildAndUploadShorts(masterId: number): Promise<void> {
  const shortsVariant = db
    .prepare<[number], VariantRow>(
      `SELECT id, text, media_spec, status FROM content_variants
       WHERE master_id = ? AND channel = 'youtube-shorts'
       ORDER BY id DESC LIMIT 1`,
    )
    .get(masterId);

  if (!shortsVariant?.media_spec) {
    await sendSlack(`🎬 Shorts 건너뜀 (master_id=${masterId}): 각본 없음`);
    return;
  }

  if (!env.openai.apiKey) {
    await sendSlack(`🎬 Shorts 건너뜀 (master_id=${masterId}): OPENAI_API_KEY 미설정`);
    return;
  }

  let script: ShortsScript;
  try {
    script = JSON.parse(shortsVariant.media_spec);
  } catch {
    await sendSlack(`🎬 Shorts 실패 (master_id=${masterId}): 각본 JSON 파싱 오류`);
    return;
  }

  console.log(`[Shorts] 빌드 시작: master_id=${masterId} "${script.title}"`);
  const result = await buildShortsVideo(script, `shorts-${masterId}-${Date.now()}`);
  console.log(`[Shorts] 빌드 완료: ${Math.round(result.durationSec)}초`);

  if (!env.youtube.refreshToken) {
    await sendSlack(`🎬 Shorts 빌드 완료 (업로드 건너뜀 — YOUTUBE_REFRESH_TOKEN 미설정)\n영상: ${result.videoUrl}`);
    return;
  }

  const videoRes = await fetch(result.videoUrl);
  const videoBuf = Buffer.from(await videoRes.arrayBuffer());
  const upload = await uploadVideo(videoBuf, result.title, result.description, result.tags);

  db.prepare("UPDATE content_variants SET status = 'published' WHERE id = ?").run(shortsVariant.id);

  await sendSlack(`🎬 Shorts 발행 완료 (master_id=${masterId})\n${upload.videoUrl}`);
}

export async function handleApprove(masterId: number): Promise<ActionResult> {
  const master = db
    .prepare<[number], MasterRow>("SELECT * FROM master_contents WHERE id = ?")
    .get(masterId);
  if (!master) return { text: `master_id=${masterId} 없음`, success: false };
  if (master.status !== "approved" && master.status !== "failed") {
    return { text: `master.status='${master.status}' — 승인 불가 (approved/failed만 가능)`, success: false };
  }
  if (master.status === "failed") {
    db.prepare("UPDATE master_contents SET status = 'approved' WHERE id = ?").run(masterId);
    db.prepare(
      "UPDATE content_variants SET status = 'approved' WHERE master_id = ? AND status = 'failed'",
    ).run(masterId);
  }

  const variant = db
    .prepare<[number], VariantRow>(
      `SELECT id, text, media_spec, status FROM content_variants
       WHERE master_id = ? AND channel = 'instagram'
       ORDER BY id DESC LIMIT 1`,
    )
    .get(masterId);
  if (!variant) return { text: "instagram variant 없음", success: false };
  if (!variant.media_spec) return { text: "variant.media_spec 비어있음", success: false };

  let cards: IgCard[];
  try {
    cards = JSON.parse(variant.media_spec);
  } catch {
    return { text: "media_spec JSON 파싱 실패", success: false };
  }

  // 1. IG/Threads/FB 큐 적재 (즉시)
  const result = await queueCarouselPost(cards, variant.text);
  db.prepare("UPDATE content_variants SET status = 'queued' WHERE id = ?").run(variant.id);

  // 2. Shorts 빌드 + 업로드 (백그라운드 — 완료 시 Slack 후속 알림)
  const hasShortsVariant = db
    .prepare<[number], { cnt: number }>(
      "SELECT COUNT(*) as cnt FROM content_variants WHERE master_id = ? AND channel = 'youtube-shorts'",
    )
    .get(masterId);

  const shortsStatus = hasShortsVariant?.cnt
    ? "🎬 Shorts: 빌드 중... (완료 시 알림)"
    : "🎬 Shorts: 각본 없음 (건너뜀)";

  if (hasShortsVariant?.cnt) {
    buildAndUploadShorts(masterId).catch(async (e) => {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`[Shorts] 실패:`, e);
      await sendSlack(`🎬 Shorts 실패 (master_id=${masterId}): ${msg}`).catch(() => {});
    });
  }

  return {
    text: `✅ 승인 완료 — 5채널 발행\nIG #${result.igQueueId} | Threads #${result.threadsQueueId} | FB #${result.facebookQueueId} → 큐 적재\n${shortsStatus}\n색상: ${["BLUE", "PURPLE", "ORANGE"][result.colorIndex]}`,
    success: true,
  };
}

export async function handleReject(masterId: number): Promise<ActionResult> {
  const master = db
    .prepare<[number], MasterRow>("SELECT * FROM master_contents WHERE id = ?")
    .get(masterId);
  if (!master) return { text: `master_id=${masterId} 없음`, success: false };

  db.prepare("UPDATE master_contents SET status = 'rejected' WHERE id = ?").run(masterId);
  db.prepare(
    "UPDATE content_variants SET status = 'rejected' WHERE master_id = ? AND status IN ('draft', 'approved')",
  ).run(masterId);

  return { text: `❌ 반려됨 — master_id=${masterId} (${master.headline})`, success: true };
}

export async function handleRegenerate(masterId: number): Promise<ActionResult> {
  const master = db
    .prepare<[number], MasterRow>("SELECT * FROM master_contents WHERE id = ?")
    .get(masterId);
  if (!master) return { text: `master_id=${masterId} 없음`, success: false };

  db.prepare(
    "UPDATE content_variants SET status = 'superseded' WHERE master_id = ? AND channel = 'instagram'",
  ).run(masterId);

  db.prepare("UPDATE master_contents SET status = 'approved' WHERE id = ?").run(masterId);

  let keywords: string[] = [];
  try { keywords = master.keywords ? JSON.parse(master.keywords) : []; } catch { /* */ }

  const igVariant = await transformToIg({
    id: master.id,
    headline: master.headline,
    body: master.body,
    topicSlug: master.topic_slug,
    keywords,
  });

  if (!igVariant) {
    return { text: "🔄 재생성 실패 — transformer-ig 오류", success: false };
  }

  db.prepare(
    "UPDATE content_variants SET status = 'approved' WHERE master_id = ? AND channel = 'instagram' AND status = 'draft'",
  ).run(masterId);

  return {
    text: `🔄 재생성 완료 — 카드 ${igVariant.cards.length}장\n캡션: ${igVariant.caption.slice(0, 100)}...`,
    success: true,
  };
}

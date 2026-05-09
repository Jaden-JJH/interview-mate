// Slack 버튼 액션 핸들러 — approve / reject / regenerate
import { db } from "../lib/db.js";
import { queueCarouselPost } from "../lib/carousel-pipeline.js";
import { transformToIg } from "../agents/transformer-ig.js";
import type { IgCard } from "../agents/transformer-ig.js";

type MasterRow = { id: number; status: string; topic_slug: string; headline: string; body: string; keywords: string | null };
type VariantRow = { id: number; text: string; media_spec: string | null; status: string };

export type ActionResult = {
  text: string;
  success: boolean;
};

export async function handleApprove(masterId: number): Promise<ActionResult> {
  const master = db
    .prepare<[number], MasterRow>("SELECT * FROM master_contents WHERE id = ?")
    .get(masterId);
  if (!master) return { text: `master_id=${masterId} 없음`, success: false };
  if (master.status !== "approved") {
    return { text: `master.status='${master.status}' — approved 아님`, success: false };
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

  const result = await queueCarouselPost(cards, variant.text);
  db.prepare("UPDATE content_variants SET status = 'queued' WHERE id = ?").run(variant.id);

  return {
    text: `✅ 승인 완료 → 큐 적재\nIG queue #${result.igQueueId} | Threads queue #${result.threadsQueueId}\n색상: ${["BLUE", "PURPLE", "ORANGE"][result.colorIndex]}`,
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

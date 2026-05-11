// HITL 승인 후 master_id를 carousel 큐로 이동.
// 사용: npx tsx scripts/approve-and-queue.ts <master_id> [--at "2026-05-09T20:00:00+09:00"]
//
// 동작:
//   1. master_contents.status = 'approved' 검증
//   2. content_variants(channel='instagram', status='approved') 1건 조회 → media_spec(IgCard[]) 파싱
//   3. carousel-pipeline.queueCarouselPost() 호출 → IG(즉시)/Threads(1시간 후) 큐 적재
//   4. content_variants.status = 'queued' 업데이트

import "../lib/env.js";
import { db } from "../lib/db.js";
import { queueCarouselPost } from "../lib/carousel-pipeline.js";
import type { IgCard } from "../agents/transformer-ig.js";

type MasterRow = { id: number; status: string; topic_slug: string; headline: string };
type VariantRow = { id: number; text: string; media_spec: string | null; status: string };

function parseArgs(argv: string[]): { masterId: number; scheduledAt?: string } {
  const masterIdStr = argv[2];
  if (!masterIdStr || !/^\d+$/.test(masterIdStr)) {
    console.error("사용: npx tsx scripts/approve-and-queue.ts <master_id> [--at ISO8601]");
    process.exit(1);
  }
  const masterId = Number(masterIdStr);
  const atIdx = argv.indexOf("--at");
  const scheduledAt = atIdx >= 0 ? argv[atIdx + 1] : undefined;
  return { masterId, scheduledAt };
}

async function main() {
  const { masterId, scheduledAt } = parseArgs(process.argv);

  // 1. master 검증
  const master = db
    .prepare<[number], MasterRow>(
      `SELECT id, status, topic_slug, headline FROM master_contents WHERE id = ?`,
    )
    .get(masterId);
  if (!master) {
    console.error(`master_id=${masterId} 없음`);
    process.exit(1);
  }
  if (master.status !== "approved") {
    console.error(
      `master.status='${master.status}' — 'approved' 상태에서만 큐 적재 가능. 먼저 검토 후 status를 'approved'로 변경하세요.`,
    );
    process.exit(1);
  }

  // 2. IG variant 조회
  const variant = db
    .prepare<[number], VariantRow>(
      `SELECT id, text, media_spec, status FROM content_variants
       WHERE master_id = ? AND channel = 'instagram'
       ORDER BY id DESC LIMIT 1`,
    )
    .get(masterId);
  if (!variant) {
    console.error(`master_id=${masterId} 의 instagram variant 없음`);
    process.exit(1);
  }
  if (variant.status !== "approved") {
    console.error(
      `instagram variant.status='${variant.status}' — 'approved' 상태가 아닙니다.`,
    );
    process.exit(1);
  }
  if (!variant.media_spec) {
    console.error("variant.media_spec 비어있음 — 카드 스펙 누락");
    process.exit(1);
  }

  let cards: IgCard[];
  try {
    cards = JSON.parse(variant.media_spec);
  } catch {
    console.error("variant.media_spec JSON 파싱 실패");
    process.exit(1);
  }

  console.log(`📦 master_id=${masterId} (${master.topic_slug}) carousel 큐 적재`);
  console.log(`  카드 ${cards.length}장 + CTA = 총 ${cards.length + 1}장`);
  if (scheduledAt) console.log(`  scheduled_at: ${scheduledAt}`);

  // 3. carousel-pipeline 호출
  const result = await queueCarouselPost(cards, variant.text, scheduledAt);
  console.log(`\n✓ IG queue id: ${result.igQueueId} (즉시)`);
  console.log(`✓ Threads queue id: ${result.threadsQueueId} (1시간 후)`);
  console.log(`  colorIndex: ${result.colorIndex} (${["BLUE", "PURPLE", "ORANGE"][result.colorIndex]})`);

  // 4. variant status 업데이트
  db.prepare(`UPDATE content_variants SET status = 'queued' WHERE id = ?`).run(variant.id);

  console.log(`\n✅ 완료. 다음: cron이 자동 발행 (IG 즉시, Threads 1시간 후).`);
}

main().catch((e) => {
  console.error("approve-and-queue 오류:", e);
  process.exit(1);
});

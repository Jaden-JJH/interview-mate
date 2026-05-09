// HITL 승인된 master_id의 Shorts 각본 → TTS → 렌더 → FFmpeg → Blob 업로드
// 사용: npx tsx scripts/build-shorts.ts <master_id>

import "../lib/env.js";
import { db } from "../lib/db.js";
import { buildShortsVideo } from "../lib/shorts-pipeline.js";
import type { ShortsScript } from "../agents/transformer-shorts.js";

type VariantRow = { id: number; text: string; media_spec: string | null; status: string };

async function main() {
  const masterIdStr = process.argv[2];
  if (!masterIdStr || !/^\d+$/.test(masterIdStr)) {
    console.error("사용: npx tsx scripts/build-shorts.ts <master_id>");
    process.exit(1);
  }
  const masterId = Number(masterIdStr);

  const variant = db
    .prepare<[number], VariantRow>(
      `SELECT id, text, media_spec, status FROM content_variants
       WHERE master_id = ? AND channel = 'youtube-shorts'
       ORDER BY id DESC LIMIT 1`,
    )
    .get(masterId);

  if (!variant) {
    console.error(`master_id=${masterId}에 youtube-shorts variant 없음`);
    process.exit(1);
  }
  if (!variant.media_spec) {
    console.error("variant.media_spec 비어있음");
    process.exit(1);
  }

  let script: ShortsScript;
  try {
    script = JSON.parse(variant.media_spec);
  } catch {
    console.error("media_spec JSON 파싱 실패");
    process.exit(1);
  }

  console.log(`🎬 Shorts 빌드 시작: "${script.title}" (${script.scenes.length}씬)`);

  const result = await buildShortsVideo(script, `shorts-${masterId}-${Date.now()}`);

  console.log(`\n✅ Shorts 빌드 완료`);
  console.log(`  제목: ${result.title}`);
  console.log(`  길이: ${Math.round(result.durationSec)}초`);
  console.log(`  영상: ${result.videoUrl}`);
  console.log(`\n  YouTube 업로드는 별도 진행 (OAuth 설정 필요).`);
}

main().catch((e) => {
  console.error("build-shorts 오류:", e);
  process.exit(1);
});

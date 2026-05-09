// Shorts 빌드 + YouTube 업로드
// 사용: npx tsx scripts/build-shorts.ts <master_id> [--upload]

import "../lib/env.js";
import { db } from "../lib/db.js";
import { env } from "../lib/env.js";
import { buildShortsVideo } from "../lib/shorts-pipeline.js";
import { uploadVideo } from "../lib/youtube-upload.js";
import type { ShortsScript } from "../agents/transformer-shorts.js";

type VariantRow = { id: number; text: string; media_spec: string | null; status: string };

async function main() {
  const masterIdStr = process.argv[2];
  if (!masterIdStr || !/^\d+$/.test(masterIdStr)) {
    console.error("사용: npx tsx scripts/build-shorts.ts <master_id> [--upload]");
    process.exit(1);
  }
  const masterId = Number(masterIdStr);
  const doUpload = process.argv.includes("--upload");

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

  console.log(`🎬 Shorts 빌드: "${script.title}" (${script.scenes.length}씬)`);

  const result = await buildShortsVideo(script, `shorts-${masterId}-${Date.now()}`);

  console.log(`\n✅ 빌드 완료`);
  console.log(`  제목: ${result.title}`);
  console.log(`  길이: ${Math.round(result.durationSec)}초`);
  console.log(`  영상 URL: ${result.videoUrl}`);

  if (doUpload) {
    if (!env.youtube.refreshToken) {
      console.error("\n❌ YouTube 업로드 불가: YOUTUBE_REFRESH_TOKEN 미설정");
      console.error("  npx tsx scripts/youtube-auth.ts 로 발급하세요.");
      process.exit(1);
    }

    console.log("\n📤 YouTube 업로드 중...");
    const videoRes = await fetch(result.videoUrl);
    const videoBuf = Buffer.from(await videoRes.arrayBuffer());

    const upload = await uploadVideo(
      videoBuf,
      result.title,
      result.description,
      result.tags,
    );

    console.log(`\n✅ YouTube 업로드 완료`);
    console.log(`  Video ID: ${upload.videoId}`);
    console.log(`  URL: ${upload.videoUrl}`);
  } else {
    console.log(`\n  --upload 플래그로 YouTube 업로드 가능:`);
    console.log(`  npx tsx scripts/build-shorts.ts ${masterId} --upload`);
  }
}

main().catch((e) => {
  console.error("build-shorts 오류:", e);
  process.exit(1);
});

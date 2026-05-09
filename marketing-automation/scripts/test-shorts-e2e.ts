// Shorts E2E 테스트 — 각본 생성 → 영상 빌드 (업로드는 --upload 플래그)

import "../lib/env.js";
import { env } from "../lib/env.js";
import { db } from "../lib/db.js";
import { transformToShorts, type ShortsScript } from "../agents/transformer-shorts.js";
import { buildShortsVideo } from "../lib/shorts-pipeline.js";
import { uploadVideo } from "../lib/youtube-upload.js";

type MasterRow = { id: number; headline: string; body: string; topic_slug: string; keywords: string | null };

async function main() {
  const doUpload = process.argv.includes("--upload");
  const buildOnly = process.argv.includes("--build");

  // 1. Master content 확인
  const master = db
    .prepare<[], MasterRow>("SELECT id, headline, body, topic_slug, keywords FROM master_contents ORDER BY id DESC LIMIT 1")
    .get();
  if (!master) {
    console.error("master_contents 비어있음. npm run pipeline 먼저 실행.");
    process.exit(1);
  }
  console.log(`📋 Master [${master.id}]: ${master.headline}`);

  // 2. Shorts 각본 생성
  console.log("\n[1/3] Shorts 각본 생성 (Sonnet)...");
  let keywords: string[] = [];
  try { keywords = master.keywords ? JSON.parse(master.keywords) : []; } catch { /* */ }

  const script = await transformToShorts({
    id: master.id,
    headline: master.headline,
    body: master.body,
    topicSlug: master.topic_slug,
    keywords,
  });

  if (!script) {
    console.error("각본 생성 실패");
    process.exit(1);
  }

  console.log(`  ✓ "${script.title}" (${script.scenes.length}씬)`);
  for (const s of script.scenes) {
    console.log(`    씬${s.sceneNumber} [${s.visualCue}] ${s.headline} (${s.durationHint}초)`);
    console.log(`      "${s.narration.slice(0, 50)}..."`);
  }

  if (!buildOnly && !doUpload) {
    console.log("\n✅ 각본 생성 테스트 완료.");
    console.log("  --build: 영상 빌드까지");
    console.log("  --upload: 빌드 + YouTube 업로드까지");
    return;
  }

  // 3. 영상 빌드
  console.log("\n[2/3] 영상 빌드 (TTS + 렌더 + FFmpeg)...");
  const result = await buildShortsVideo(script, `test-shorts-${Date.now()}`);
  console.log(`  ✓ ${Math.round(result.durationSec)}초, 영상: ${result.videoUrl}`);

  if (!doUpload) {
    console.log("\n✅ 빌드 테스트 완료. --upload 로 YouTube 업로드.");
    return;
  }

  // 4. YouTube 업로드
  if (!env.youtube.refreshToken) {
    console.error("\n❌ YOUTUBE_REFRESH_TOKEN 미설정");
    process.exit(1);
  }

  console.log("\n[3/3] YouTube 업로드...");
  const videoRes = await fetch(result.videoUrl);
  const videoBuf = Buffer.from(await videoRes.arrayBuffer());
  const upload = await uploadVideo(videoBuf, result.title, result.description, result.tags);
  console.log(`  ✓ ${upload.videoUrl}`);

  console.log("\n✅ E2E 테스트 완료!");
}

main().catch((e) => {
  console.error("test-shorts-e2e 오류:", e);
  process.exit(1);
});

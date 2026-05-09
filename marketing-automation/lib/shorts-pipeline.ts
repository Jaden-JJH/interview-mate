// Shorts 파이프라인 — 각본 → TTS → 씬 렌더 → FFmpeg 합성 → Blob 업로드

import type { ShortsScript } from "../agents/transformer-shorts.js";
import { synthesize } from "./tts.js";
import { renderAllScenes, closeBrowser } from "./shorts-renderer.js";
import { composeVideo } from "./video-composer.js";
import { uploadCardImage } from "./blob-uploader.js";

export type ShortsPipelineResult = {
  videoUrl: string;
  title: string;
  description: string;
  tags: string[];
  durationSec: number;
};

export async function buildShortsVideo(
  script: ShortsScript,
  prefix: string,
): Promise<ShortsPipelineResult> {
  console.log("  [shorts] TTS 생성 중...");
  const ttsResults: { audioUrl: string; audioBuf: Buffer; durationSec: number }[] = [];

  for (const scene of script.scenes) {
    const res = await fetch(
      "https://api.openai.com/v1/audio/speech",
      /* TTS는 tts.ts의 synthesize 사용 */
    ).catch(() => null);

    // synthesize를 직접 호출하되, audioBuf도 필요하므로 직접 fetch
    const { env } = await import("./env.js");
    const apiKey = env.openai.apiKey;
    if (!apiKey) throw new Error("OPENAI_API_KEY 미설정");

    const ttsRes = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "tts-1",
        input: scene.narration,
        voice: "nova",
        response_format: "mp3",
      }),
    });
    if (!ttsRes.ok) throw new Error(`TTS 실패: ${ttsRes.status}`);

    const arrayBuf = await ttsRes.arrayBuffer();
    const audioBuf = Buffer.from(arrayBuf);
    const durationSec = Math.max(scene.durationHint, audioBuf.length / (48000 / 8));

    const audioUrl = await uploadCardImage(
      audioBuf,
      `${prefix}-scene${scene.sceneNumber}.mp3`,
      "audio/mpeg",
    );

    ttsResults.push({ audioUrl, audioBuf, durationSec });
  }
  console.log(`  [shorts] TTS ${ttsResults.length}씬 완료`);

  console.log("  [shorts] 씬 이미지 렌더 중...");
  const imageBufs = await renderAllScenes(script.scenes);
  await closeBrowser();
  console.log(`  [shorts] 이미지 ${imageBufs.length}장 완료`);

  console.log("  [shorts] FFmpeg 합성 중...");
  const sceneInputs = script.scenes.map((_, i) => ({
    imageBuf: imageBufs[i],
    audioBuf: ttsResults[i].audioBuf,
    durationSec: ttsResults[i].durationSec,
  }));

  const videoBuf = await composeVideo(sceneInputs, `${prefix}.mp4`);
  const totalDuration = ttsResults.reduce((s, r) => s + r.durationSec, 0);
  console.log(`  [shorts] 합성 완료 (${Math.round(totalDuration)}초, ${(videoBuf.length / 1024 / 1024).toFixed(1)}MB)`);

  const videoUrl = await uploadCardImage(videoBuf, `${prefix}.mp4`, "video/mp4");
  console.log(`  [shorts] 업로드 완료: ${videoUrl}`);

  const title = `${script.title} #Shorts`;
  const description = `${script.description}\n\n${script.tags.map((t) => `#${t}`).join(" ")}`;

  return { videoUrl, title, description, tags: script.tags, durationSec: totalDuration };
}

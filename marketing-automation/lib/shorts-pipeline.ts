// Shorts 파이프라인 — 각본 → TTS → 씬 렌더 → FFmpeg 합성 → Blob 업로드

import type { ShortsScript } from "../agents/transformer-shorts.js";
import { renderAllScenes, closeBrowser } from "./shorts-renderer.js";
import { composeVideo } from "./video-composer.js";
import { uploadCardImage } from "./blob-uploader.js";
import { env } from "./env.js";

export type ShortsPipelineResult = {
  videoUrl: string;
  title: string;
  description: string;
  tags: string[];
  durationSec: number;
};

async function ttsForScene(
  narration: string,
  filename: string,
): Promise<{ audioBuf: Buffer }> {
  const apiKey = env.openai.apiKey;
  if (!apiKey) throw new Error("OPENAI_API_KEY 미설정");

  const res = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "tts-1",
      input: narration,
      voice: "nova",
      response_format: "mp3",
    }),
  });
  if (!res.ok) throw new Error(`TTS 실패: ${res.status}`);

  const audioBuf = Buffer.from(await res.arrayBuffer());
  await uploadCardImage(audioBuf, filename, "audio/mpeg");
  return { audioBuf };
}

export async function buildShortsVideo(
  script: ShortsScript,
  prefix: string,
): Promise<ShortsPipelineResult> {
  console.log("  [shorts] TTS 생성 중...");
  const audioBuffers: Buffer[] = [];

  for (const scene of script.scenes) {
    const { audioBuf } = await ttsForScene(
      scene.narration,
      `${prefix}-scene${scene.sceneNumber}.mp3`,
    );
    audioBuffers.push(audioBuf);
  }
  console.log(`  [shorts] TTS ${audioBuffers.length}씬 완료`);

  console.log("  [shorts] 씬 이미지 렌더 중...");
  const imageBufs = await renderAllScenes(script.scenes);
  await closeBrowser();
  console.log(`  [shorts] 이미지 ${imageBufs.length}장 완료`);

  console.log("  [shorts] FFmpeg 합성 중...");
  const sceneInputs = script.scenes.map((scene, i) => ({
    imageBuf: imageBufs[i],
    audioBuf: audioBuffers[i],
    durationSec: scene.durationHint,
  }));

  const videoBuf = await composeVideo(sceneInputs, `${prefix}.mp4`);
  const totalDuration = script.scenes.reduce((s, sc) => s + sc.durationHint, 0);
  console.log(`  [shorts] 합성 완료 (~${totalDuration}초, ${(videoBuf.length / 1024 / 1024).toFixed(1)}MB)`);

  const videoUrl = await uploadCardImage(videoBuf, `${prefix}.mp4`, "video/mp4");
  console.log(`  [shorts] 업로드 완료: ${videoUrl}`);

  const title = `${script.title} #Shorts`;
  const description = `${script.description}\n\n${script.tags.map((t) => `#${t}`).join(" ")}`;

  return { videoUrl, title, description, tags: script.tags, durationSec: totalDuration };
}

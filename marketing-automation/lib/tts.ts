// OpenAI TTS — 씬별 mp3 생성 + Vercel Blob 업로드

import { env } from "./env.js";
import { uploadCardImage } from "./blob-uploader.js";

export type TtsResult = {
  audioUrl: string;
  durationSec: number;
};

const OPENAI_TTS_URL = "https://api.openai.com/v1/audio/speech";

async function estimateMp3Duration(buf: Buffer): Promise<number> {
  // mp3 CBR 추정: fileSize / (bitrate/8). tts-1 출력은 대략 48kbps
  // 정확하지 않지만 외부 의존성 없이 근사치 제공
  const bytesPerSec = 48000 / 8; // 48kbps
  return Math.max(1, buf.length / bytesPerSec);
}

export async function synthesize(
  text: string,
  filename: string,
  voice: "alloy" | "echo" | "fable" | "nova" | "onyx" | "shimmer" = "nova",
): Promise<TtsResult> {
  const apiKey = env.openai.apiKey;
  if (!apiKey) throw new Error("OPENAI_API_KEY 미설정");

  const res = await fetch(OPENAI_TTS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "tts-1",
      input: text,
      voice,
      response_format: "mp3",
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI TTS ${res.status}: ${err}`);
  }

  const arrayBuf = await res.arrayBuffer();
  const buf = Buffer.from(arrayBuf);

  const audioUrl = await uploadCardImage(buf, filename, "audio/mpeg");
  const durationSec = await estimateMp3Duration(buf);

  return { audioUrl, durationSec };
}

export async function synthesizeScenes(
  scenes: { sceneNumber: number; narration: string }[],
  prefix: string,
  voice?: "alloy" | "echo" | "fable" | "nova" | "onyx" | "shimmer",
): Promise<TtsResult[]> {
  const results: TtsResult[] = [];
  for (const scene of scenes) {
    const result = await synthesize(
      scene.narration,
      `${prefix}-scene${scene.sceneNumber}.mp3`,
      voice,
    );
    results.push(result);
  }
  return results;
}

// FFmpeg 영상 합성 — 씬 이미지 + TTS mp3 → mp4 (1080x1920, H.264)

import { execFile } from "node:child_process";
import { writeFileSync, mkdirSync, unlinkSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const __dirname = dirname(fileURLToPath(import.meta.url));

type SceneInput = {
  imageBuf: Buffer;
  audioBuf: Buffer;
  durationSec: number;
};

function findFfmpeg(): string {
  const candidates = ["/opt/homebrew/bin/ffmpeg", "/usr/local/bin/ffmpeg", "ffmpeg"];
  for (const c of candidates) {
    try {
      if (c === "ffmpeg" || existsSync(c)) return c;
    } catch { /* */ }
  }
  return "ffmpeg";
}

export async function composeVideo(
  scenes: SceneInput[],
  outputFilename: string,
): Promise<Buffer> {
  const tmpDir = resolve(__dirname, "../data/tmp-video");
  mkdirSync(tmpDir, { recursive: true });

  const ffmpeg = findFfmpeg();
  const concatEntries: string[] = [];
  const tmpFiles: string[] = [];

  for (let i = 0; i < scenes.length; i++) {
    const imgPath = resolve(tmpDir, `scene${i}.png`);
    const audioPath = resolve(tmpDir, `scene${i}.mp3`);
    const clipPath = resolve(tmpDir, `clip${i}.ts`);

    writeFileSync(imgPath, scenes[i].imageBuf);
    writeFileSync(audioPath, scenes[i].audioBuf);
    tmpFiles.push(imgPath, audioPath, clipPath);

    // 이미지 + 오디오 → MPEG-TS 클립 (-shortest: 오디오 끝나면 정지)
    await execFileAsync(ffmpeg, [
      "-y",
      "-loop", "1", "-i", imgPath,
      "-i", audioPath,
      "-c:v", "libx264", "-tune", "stillimage",
      "-c:a", "aac", "-b:a", "128k",
      "-pix_fmt", "yuv420p",
      "-vf", "scale=1080:1920",
      "-shortest",
      clipPath,
    ], { timeout: 60_000 });

    concatEntries.push(`file '${clipPath}'`);
  }

  // concat 파일 생성
  const concatPath = resolve(tmpDir, "concat.txt");
  writeFileSync(concatPath, concatEntries.join("\n"));
  tmpFiles.push(concatPath);

  // 클립 연결 → 1.2배속 → 최종 mp4 (Shorts 59초 하드캡)
  const rawPath = resolve(tmpDir, `${outputFilename}.raw.mp4`);
  await execFileAsync(ffmpeg, [
    "-y",
    "-f", "concat", "-safe", "0", "-i", concatPath,
    "-c:v", "libx264", "-preset", "fast",
    "-c:a", "aac",
    "-movflags", "+faststart",
    rawPath,
  ], { timeout: 120_000 });
  tmpFiles.push(rawPath);

  const outputPath = resolve(tmpDir, outputFilename);
  await execFileAsync(ffmpeg, [
    "-y", "-i", rawPath,
    "-filter:v", "setpts=PTS/1.2",
    "-filter:a", "atempo=1.2",
    "-t", "59",
    "-c:v", "libx264", "-preset", "fast",
    "-c:a", "aac",
    "-movflags", "+faststart",
    outputPath,
  ], { timeout: 120_000 });

  const { readFileSync } = await import("node:fs");
  const videoBuf = readFileSync(outputPath);
  tmpFiles.push(outputPath);

  // 임시 파일 정리
  for (const f of tmpFiles) {
    try { unlinkSync(f); } catch { /* */ }
  }

  return videoBuf;
}

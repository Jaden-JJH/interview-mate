import { createWriteStream, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * PNG Buffer를 공개 URL로 업로드.
 *
 * BLOB_READ_WRITE_TOKEN 환경변수가 있으면 Vercel Blob에 업로드하고
 * 공개 HTTPS URL을 반환.
 *
 * 토큰이 없으면 로컬 data/images/ 에 파일을 저장하고
 * file:// URL을 반환 (개발/드라이런 전용).
 *
 * TODO: 실 발행 전 BLOB_READ_WRITE_TOKEN을 Vercel 대시보드에서 발급하여
 *       .env.local에 추가할 것. (https://vercel.com/docs/storage/vercel-blob)
 */
export async function uploadCardImage(buffer: Buffer, filename: string): Promise<string> {
  const token = process.env["BLOB_READ_WRITE_TOKEN"];

  if (token) {
    // Vercel Blob 업로드
    const { put } = await import("@vercel/blob");
    const blob = await put(`card-news/${filename}`, buffer, {
      access: "public",
      token,
      contentType: "image/png",
    });
    return blob.url;
  }

  // --- fallback: 로컬 파일 저장 ---
  // TODO: BLOB_READ_WRITE_TOKEN 설정 후 이 분기는 사용되지 않음.
  //       IG publishImage()는 공개 HTTPS URL이 필요하므로 실 발행 시 Vercel Blob 필수.
  const imagesDir = resolve(__dirname, "../data/images");
  mkdirSync(imagesDir, { recursive: true });

  const outPath = resolve(imagesDir, filename);
  const readable = Readable.from(buffer);
  const writable = createWriteStream(outPath);
  await pipeline(readable, writable);

  const fileUrl = `file://${outPath}`;
  console.warn(
    `[blob-uploader] BLOB_READ_WRITE_TOKEN 없음 — 로컬 저장: ${outPath}\n` +
      `  실 발행 시 Vercel Blob 토큰 설정 필요. 현재 URL: ${fileUrl}`,
  );
  return fileUrl;
}

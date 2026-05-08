/**
 * test-card-render.ts — 카드뉴스 렌더링 드라이런
 *
 * 실제 IG 발행 없음. PNG 파일만 생성 후 경로 출력.
 *
 * 실행:
 *   npx tsx scripts/test-card-render.ts
 *
 * 결과:
 *   marketing-automation/data/test-card.png
 */

import { config } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdirSync, writeFileSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../../.env.local") });

import { renderCardToBuffer } from "../lib/card-renderer.js";
import type { CardData } from "../lib/card-renderer.js";

// 샘플 카드 데이터
const sampleCard: CardData = {
  title: "면접에서 '마지막 한마디'를 잘 써야 합격한다",
  body: "클로징 멘트는 단순한 마무리가 아닙니다. 지원 동기와 입사 의지를 한 번 더 각인시키는 마지막 기회입니다. 간결하고 진정성 있게 준비하세요.",
  tags: ["면접준비", "취업팁", "자기소개서", "인터뷰메이트"],
};

async function main() {
  console.log("카드 렌더링 시작...");
  console.log("타이틀:", sampleCard.title);
  console.log("본문:", sampleCard.body);
  console.log("태그:", sampleCard.tags.join(", "));
  console.log("");

  const buffer = await renderCardToBuffer(sampleCard);

  const dataDir = resolve(__dirname, "../data");
  mkdirSync(dataDir, { recursive: true });

  const outPath = resolve(dataDir, "test-card.png");
  writeFileSync(outPath, buffer);

  console.log("렌더링 완료!");
  console.log(`저장 경로: ${outPath}`);
  console.log(`파일 크기: ${(buffer.length / 1024).toFixed(1)} KB`);
  console.log("");
  console.log("--- DRY-RUN 완료 (실 발행 없음) ---");
  console.log("실 발행 전 확인 사항:");
  console.log("  1. data/test-card.png 이미지 품질 검수");
  console.log("  2. BLOB_READ_WRITE_TOKEN 환경변수 설정 (Vercel Blob)");
  console.log("  3. 사용자 승인 후 queueCardPost() 호출");
}

main().catch((err) => {
  console.error("렌더링 실패:", err);
  process.exit(1);
});

// CTA 카드 3색 사전 렌더링 — Alex Lottie + 슬로건 + 큰 링크. Blob 업로드 후 URL 출력.
// 한 번 실행 후 결과 URL을 .env.local에 CTA_CARD_URL_BLUE/PURPLE/ORANGE로 보관.
//
// 실행: npx tsx scripts/render-cta-cards.ts

import "../lib/env.js";
import { dirname, resolve } from "node:path";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer";
import { uploadCardImage } from "../lib/blob-uploader.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATE_PATH = resolve(__dirname, "../templates/cta-card.html");
const LOTTIE_ALEX_PATH = resolve(__dirname, "../../public/lottie/alex.json");
const lottieAlexData = JSON.parse(readFileSync(LOTTIE_ALEX_PATH, "utf8"));

// card-renderer.ts 색 팔레트와 동일 — 인덱스/이름 일치 유지
const COLORS = [
  { key: "BLUE", index: 0, bg: "#0A1530", accent: "#4F8EF7", glow: "rgba(59,130,246,0.12)" },
  { key: "PURPLE", index: 1, bg: "#1D0D2A", accent: "#D389D7", glow: "rgba(211,137,215,0.12)" },
  { key: "ORANGE", index: 2, bg: "#1C0C00", accent: "#F55E29", glow: "rgba(245,94,41,0.12)" },
] as const;

async function renderOnce(palette: (typeof COLORS)[number]): Promise<Buffer> {
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--font-render-hinting=none",
    ],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1080, height: 1350, deviceScaleFactor: 1 });

    // Lottie JSON을 페이지 로드 전에 주입 — file:// 한국어 경로 XHR 실패 방지
    await page.evaluateOnNewDocument((data) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).window.__lottieAnimData = data;
    }, lottieAlexData);

    await page.goto(`file://${TEMPLATE_PATH}`, { waitUntil: "networkidle0", timeout: 30_000 });

    // 색 변수 주입
    await page.evaluate((p) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const doc = (globalThis as any).document as { documentElement: { style: { setProperty: (k: string, v: string) => void } } };
      doc.documentElement.style.setProperty("--bg", p.bg);
      doc.documentElement.style.setProperty("--accent", p.accent);
      doc.documentElement.style.setProperty("--glow", p.glow);
    }, palette);

    // 폰트 로드 대기
    await page.evaluate(async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const doc = (globalThis as any).document as { fonts?: { ready?: Promise<unknown> } };
      if (doc.fonts?.ready) await doc.fonts.ready;
    });

    // Lottie 로드 대기 (window.__lottieReady)
    await page.waitForFunction(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      () => (globalThis as any).window?.__lottieReady === true,
      { timeout: 15_000 }
    ).catch(() => {
      console.warn(`  · Lottie 로드 타임아웃 (${palette.key}) — 진행`);
    });

    // 추가 안정 대기 (SVG 페인트)
    await new Promise((r) => setTimeout(r, 500));

    const png = await page.screenshot({
      type: "png",
      clip: { x: 0, y: 0, width: 1080, height: 1350 },
    });
    return Buffer.from(png);
  } finally {
    await browser.close();
  }
}

async function main() {
  console.log("🎨 CTA 카드 3색 사전 렌더링 시작\n");

  const results: { key: string; url: string }[] = [];

  for (const palette of COLORS) {
    console.log(`▶ ${palette.key} (#${palette.bg.slice(1)}) 렌더링…`);
    const buf = await renderOnce(palette);
    const filename = `cta-${palette.key.toLowerCase()}-v1.png`;
    const url = await uploadCardImage(buf, filename);
    console.log(`  ✓ 업로드: ${url}\n`);
    results.push({ key: palette.key, url });
  }

  console.log("───────────────────────────────────");
  console.log("✅ 완료. .env.local에 다음 줄을 추가하세요:\n");
  for (const r of results) {
    console.log(`CTA_CARD_URL_${r.key}=${r.url}`);
  }
  console.log("\n그 후: env.ts cta 섹션과 lib/cta-cards.ts에서 참조됩니다.");
}

main().catch((e) => {
  console.error("CTA 렌더링 오류:", e);
  process.exit(1);
});

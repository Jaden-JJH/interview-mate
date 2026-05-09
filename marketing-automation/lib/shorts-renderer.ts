// Shorts 씬별 이미지 렌더러 — Puppeteer 1080x1920 PNG

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer";
import type { ShortsScene } from "../agents/transformer-shorts.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATE = readFileSync(resolve(__dirname, "../templates/shorts-scene.html"), "utf-8");

function buildHtml(scene: ShortsScene, totalScenes: number): string {
  let html = TEMPLATE;

  html = html.replace("{{visualCue}}", scene.visualCue);
  html = html.replace("{{headline}}", scene.headline);

  html = html.replace("{{narrationHint}}", scene.narration);

  for (let i = 1; i <= 4; i++) {
    html = html.replace(
      `{{dot${i}}}`,
      i <= totalScenes && i === scene.sceneNumber ? "active" : "",
    );
  }

  if (scene.visualCue === "cta") {
    html = html.replace("{{#if isCta}}", "").replace("{{/if}}", "");
  } else {
    html = html.replace(/{{#if isCta}}[\s\S]*?{{\/if}}/g, "");
  }

  return html;
}

let browserInstance: Awaited<ReturnType<typeof puppeteer.launch>> | null = null;

async function getBrowser() {
  if (!browserInstance) {
    browserInstance = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
  }
  return browserInstance;
}

export async function renderSceneImage(
  scene: ShortsScene,
  totalScenes: number,
): Promise<Buffer> {
  const browser = await getBrowser();
  const page = await browser.newPage();
  await page.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 1 });

  const html = buildHtml(scene, totalScenes);
  await page.setContent(html, { waitUntil: "networkidle0" });
  const buf = await page.screenshot({ type: "png", fullPage: false }) as Buffer;
  await page.close();
  return buf;
}

export async function renderAllScenes(
  scenes: ShortsScene[],
): Promise<Buffer[]> {
  const buffers: Buffer[] = [];
  for (const scene of scenes) {
    const buf = await renderSceneImage(scene, scenes.length);
    buffers.push(buf);
  }
  return buffers;
}

export async function closeBrowser(): Promise<void> {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
  }
}

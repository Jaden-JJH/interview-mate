import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATE_PATH = resolve(__dirname, "../templates/card-news.html");

/** 카드뉴스 1장을 구성하는 데이터 */
export type CardData = {
  /** 타이틀 — 최대 40자 권장 */
  title: string;
  /** 본문 — 최대 120자(3줄) 권장 */
  body: string;
  /** 해시태그 목록 (# 포함 또는 미포함 모두 허용) */
  tags: string[];
};

/**
 * CardData를 받아 1080×1350 PNG Buffer를 반환.
 * puppeteer로 card-news.html을 헤드리스 렌더링 후 스크린샷 캡처.
 */
export async function renderCardToBuffer(data: CardData): Promise<Buffer> {
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

    // 1080×1350 뷰포트 고정 (IG 세로형 이미지)
    await page.setViewport({ width: 1080, height: 1350, deviceScaleFactor: 1 });

    await page.goto(`file://${TEMPLATE_PATH}`, { waitUntil: "networkidle0", timeout: 30_000 });

    // 구글 웹폰트 로드 대기 (networkidle0로도 놓칠 수 있어 문서 폰트 명시 대기)
    await page.evaluate(async () => {
      if (document.fonts?.ready) await document.fonts.ready;
    });

    // DOM에 데이터 주입
    await page.evaluate(
      (cardData: CardData) => {
        const titleEl = document.getElementById("title");
        const bodyEl = document.getElementById("body");
        const tagsEl = document.getElementById("tags");

        if (titleEl) titleEl.textContent = cardData.title;
        if (bodyEl) bodyEl.textContent = cardData.body;

        if (tagsEl) {
          tagsEl.innerHTML = "";
          cardData.tags.forEach((t) => {
            const span = document.createElement("span");
            span.className = "tag";
            const tag = t.trim();
            span.textContent = tag.startsWith("#") ? tag : `#${tag}`;
            tagsEl.appendChild(span);
          });
        }
      },
      data,
    );

    // 전체 페이지(카드) 스크린샷
    const screenshot = await page.screenshot({
      type: "png",
      clip: { x: 0, y: 0, width: 1080, height: 1350 },
    });

    return Buffer.from(screenshot);
  } finally {
    await browser.close();
  }
}

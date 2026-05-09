import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATE_PATH = resolve(__dirname, "../templates/card-news.html");

/** IG 그리드 색 로테이션 — 3열 주기 */
const COLOR_PALETTE = [
  { bg: "#0A1530", accent: "#4F8EF7", glow: "rgba(59,130,246,0.12)" },   // 0: 파란 계열
  { bg: "#1D0D2A", accent: "#D389D7", glow: "rgba(211,137,215,0.12)" },  // 1: 보라 (#D389D7)
  { bg: "#1C0C00", accent: "#F55E29", glow: "rgba(245,94,41,0.12)" },    // 2: 주황 (#F55E29)
] as const;

/** 카드뉴스 1장을 구성하는 데이터 */
export type CardData = {
  /** 타이틀 — 최대 40자 권장 */
  title: string;
  /** 본문 — 최대 120자(3줄) 권장 */
  body: string;
  /** 해시태그 목록 (# 포함 또는 미포함 모두 허용) */
  tags: string[];
  /** IG 그리드 색 인덱스 0|1|2. 미지정 시 0(파란 계열) */
  colorIndex?: 0 | 1 | 2;
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

    // 색 팔레트 CSS 변수 주입
    const palette = COLOR_PALETTE[data.colorIndex ?? 0];
    await page.evaluate((p) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const doc = (globalThis as any).document as { documentElement: { style: { setProperty: (k: string, v: string) => void } } };
      doc.documentElement.style.setProperty("--bg", p.bg);
      doc.documentElement.style.setProperty("--accent", p.accent);
      doc.documentElement.style.setProperty("--glow", p.glow);
    }, palette);

    // 구글 웹폰트 로드 대기 (networkidle0로도 놓칠 수 있어 문서 폰트 명시 대기)
    await page.evaluate(async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const doc = (globalThis as any).document as { fonts?: { ready?: Promise<unknown> } };
      if (doc.fonts?.ready) await doc.fonts.ready;
    });

    // DOM에 데이터 주입
    // page.evaluate 콜백은 브라우저 컨텍스트에서 실행되므로 document가 존재.
    // tsconfig lib에 dom이 없어 타입 에러가 발생하므로 any 캐스팅으로 우회.
    await page.evaluate(
      (cardData: CardData) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const doc = (globalThis as any).document as {
          getElementById: (id: string) => {
            textContent: string | null;
            innerHTML: string;
            appendChild: (el: unknown) => void;
          } | null;
          createElement: (tag: string) => {
            className: string;
            textContent: string | null;
          };
        };

        const titleEl = doc.getElementById("title");
        const bodyEl = doc.getElementById("body");
        const tagsEl = doc.getElementById("tags");

        if (titleEl) titleEl.textContent = cardData.title;
        if (bodyEl) bodyEl.textContent = cardData.body;

        if (tagsEl) {
          tagsEl.innerHTML = "";
          cardData.tags.forEach((t) => {
            const span = doc.createElement("span");
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

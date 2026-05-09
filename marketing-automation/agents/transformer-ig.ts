// W2 Instagram 변환기 — Sonnet으로 Master Content → IG 캡션 + 카드 스펙 생성 + DB 저장

import Anthropic from "@anthropic-ai/sdk";
import { env } from "../lib/env.js";
import { db } from "../lib/db.js";
import { checkForbiddenWords } from "../guards/forbidden-words.js";
import type { MasterContent } from "./master-writer.js";

const client = new Anthropic({ apiKey: env.anthropic.apiKey });

export type IgCard = {
  cardNumber: number;
  title: string;
  body: string;
  type: "cover" | "insight" | "cta";
};

export type IgVariant = {
  caption: string;
  cards: IgCard[];
};

export async function transformToIg(master: MasterContent): Promise<IgVariant | null> {
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1536,
    system: [
      {
        type: "text",
        text: `@intv_mate Instagram 카드뉴스 크리에이터입니다.
규칙: 캡션 150-200자 + 해시태그. 카드 5-7장. 각 카드 핵심 문구 30자 이내.
절대 금지 단어: 자동화, 봇, 테스트, 시스템, publisher, 에이전트, 큐, API, dev`,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      {
        role: "user",
        content: `Master Content:
주제: ${master.headline}
본문: ${master.body}
키워드: ${master.keywords.join(", ")}

IG 캡션과 카드 스펙 작성:
- caption: 첫 줄 강한 훅 + 핵심 2-3줄 + 해시태그 5-8개 (#면접준비 #취업 #커리어 등)
- cards: cover 1장 → insight 4-5장 → cta 1장

JSON으로만 응답:
{
  "caption": "...",
  "cards": [
    {"cardNumber": 1, "title": "제목 20자 이내", "body": "본문 30자 이내", "type": "cover"},
    {"cardNumber": 2, "title": "...", "body": "...", "type": "insight"},
    {"cardNumber": 7, "title": "팔로우하면 면접 꿀팁 매일!", "body": "@intv_mate", "type": "cta"}
  ]
}`,
      },
    ],
  });

  try {
    const raw = response.content[0].type === "text" ? response.content[0].text : "{}";
    const parsed = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] ?? "{}");
    const { caption, cards } = parsed;
    if (!caption || !cards) return null;

    const check = checkForbiddenWords(caption);
    db.prepare(
      `INSERT INTO content_variants (master_id, channel, variant_index, text, media_spec, has_cta, status)
       VALUES (?, 'instagram', 0, ?, ?, 1, ?)`
    ).run(master.id, caption, JSON.stringify(cards), check.pass ? "draft" : "failed");

    return { caption, cards };
  } catch (e) {
    console.error("  · transformer-ig 파싱 오류:", e);
    return null;
  }
}

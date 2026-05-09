// W2 Instagram 변환기 — Sonnet으로 Master Content → IG 캡션 + 카드 스펙 생성 + DB 저장

import Anthropic from "@anthropic-ai/sdk";
import { env } from "../lib/env.js";
import { db } from "../lib/db.js";
import { checkForbiddenWords } from "../guards/forbidden-words.js";
import type { MasterContent } from "./master-writer.js";

const client = new Anthropic({ apiKey: env.anthropic.apiKey });

// IG 카드뉴스 — card-renderer.ts(`CardData`)와 직접 호환되도록 tags 필드 포함.
export type IgCard = {
  cardNumber: number;
  title: string;
  body: string;
  tags: string[];
  type: "cover" | "insight" | "cta";
};

export type IgVariant = {
  caption: string;
  cards: IgCard[];
};

export async function transformToIg(master: MasterContent): Promise<IgVariant | null> {
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: [
      {
        type: "text",
        text: `@intv_mate Instagram 카드뉴스 크리에이터입니다.
규칙: 캡션 150-200자 + 해시태그. 카드뉴스는 carousel 4장 고정 (cover 1 + insight 2 + cta 1).
각 카드 핵심 문구 30자 이내. 절대 금지 단어: 자동화, 봇, 테스트, 시스템, publisher, 에이전트, 큐, API, dev`,
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
- cards 정확히 3장 출력 (cta 카드는 사전 자산 재사용이라 제외):
  · 1장 cover: 강한 훅·질문·반전
  · 2장 insight: 본문 핵심 인사이트 2개를 각 카드 1개씩
- 각 카드 tags: 2-3개 (# 없이 단어만)

JSON으로만 응답:
{
  "caption": "...",
  "cards": [
    {"cardNumber": 1, "title": "제목 20자 이내", "body": "본문 30자 이내", "tags": ["면접준비", "취업"], "type": "cover"},
    {"cardNumber": 2, "title": "...", "body": "...", "tags": ["...", "..."], "type": "insight"},
    {"cardNumber": 3, "title": "...", "body": "...", "tags": ["...", "..."], "type": "insight"}
  ]
}`,
      },
    ],
  });

  try {
    const raw = response.content[0].type === "text" ? response.content[0].text : "{}";
    const parsed = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] ?? "{}");
    const { caption, cards } = parsed;
    if (!caption || !cards || !Array.isArray(cards)) return null;

    // 3장(cover+insight×2)만 검증. cta 카드는 carousel-pipeline에서 사전 자산 URL로 부착.
    if (cards.length < 3) {
      console.error(`  · transformer-ig 카드 부족: ${cards.length}장 (필요 3장)`);
      return null;
    }
    const fallbackTags = master.keywords.slice(0, 3);
    const normalized: IgCard[] = (cards as Partial<IgCard>[]).slice(0, 3).map((c, i) => ({
      cardNumber: c.cardNumber ?? i + 1,
      title: c.title ?? "",
      body: c.body ?? "",
      tags: Array.isArray(c.tags) && c.tags.length > 0 ? c.tags : fallbackTags,
      type: c.type ?? (i === 0 ? "cover" : "insight"),
    }));

    const check = checkForbiddenWords(caption);
    db.prepare(
      `INSERT INTO content_variants (master_id, channel, variant_index, text, media_spec, has_cta, status)
       VALUES (?, 'instagram', 0, ?, ?, 1, ?)`
    ).run(master.id, caption, JSON.stringify(normalized), check.pass ? "draft" : "failed");

    return { caption, cards: normalized };
  } catch (e) {
    console.error("  · transformer-ig 파싱 오류:", e);
    return null;
  }
}

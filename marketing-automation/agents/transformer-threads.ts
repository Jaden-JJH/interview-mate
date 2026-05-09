// W2 Threads 변환기 — Sonnet으로 Master Content → Threads 2~3편 생성 + DB 저장

import Anthropic from "@anthropic-ai/sdk";
import { env } from "../lib/env.js";
import { db } from "../lib/db.js";
import { checkForbiddenWords } from "../guards/forbidden-words.js";
import type { MasterContent } from "./master-writer.js";

const client = new Anthropic({ apiKey: env.anthropic.apiKey });

export type ThreadsPost = {
  text: string;
  hasCta: boolean;
  variantIndex: number;
};

export async function transformToThreads(master: MasterContent): Promise<ThreadsPost[]> {
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: [
      {
        type: "text",
        text: `@intv_mate Threads 콘텐츠 크리에이터입니다.
규칙: 각 편 500자 이하. 이모지 1-3개/편. 마지막 편에만 CTA("더 알아보기 → 프로필 링크 🔗").
절대 금지 단어: 자동화, 봇, 테스트, 시스템, publisher, 에이전트, 큐, API, dev`,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      {
        role: "user",
        content: `Master Content로 Threads 포스트 2~3편 작성:

주제: ${master.headline}
본문:
${master.body}

요구사항:
- 편 1: 강한 훅 (숫자/질문/반전) + 핵심 인사이트
- 편 2: 추가 인사이트 또는 실용 팁
- 편 3 (선택): 깊이 있는 포인트가 있으면 추가
- 마지막 편에만 CTA
- 자연스러운 SNS 말투, 줄바꿈 활용

JSON으로만 응답:
{
  "posts": [
    {"text": "...", "hasCta": false},
    {"text": "...", "hasCta": true}
  ]
}`,
      },
    ],
  });

  try {
    const raw = response.content[0].type === "text" ? response.content[0].text : "{}";
    const parsed = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] ?? "{}");

    const posts: ThreadsPost[] = (parsed.posts ?? []).map(
      (p: { text: string; hasCta: boolean }, i: number) => ({
        text: p.text,
        hasCta: p.hasCta ?? false,
        variantIndex: i,
      })
    );

    for (const post of posts) {
      const check = checkForbiddenWords(post.text);
      // 500자 초과는 publisher가 reject. 사전에 'failed' 처리.
      const tooLong = post.text.length > 500;
      const status = !check.pass || tooLong ? "failed" : "draft";
      if (tooLong) {
        console.error(`  · threads 편 ${post.variantIndex} 500자 초과(${post.text.length}자) → failed`);
      }
      db.prepare(
        `INSERT INTO content_variants (master_id, channel, variant_index, text, has_cta, status)
         VALUES (?, 'threads', ?, ?, ?, ?)`
      ).run(
        master.id,
        post.variantIndex,
        post.text,
        post.hasCta ? 1 : 0,
        status
      );
    }

    return posts;
  } catch (e) {
    console.error("  · transformer-threads 파싱 오류:", e);
    return [];
  }
}

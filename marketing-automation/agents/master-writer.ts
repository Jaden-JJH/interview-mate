// W2 Master Content 생성 에이전트 — Sonnet으로 dense article 작성 후 DB 저장

import Anthropic from "@anthropic-ai/sdk";
import { env } from "../lib/env.js";
import { db } from "../lib/db.js";

const client = new Anthropic({ apiKey: env.anthropic.apiKey });

type SourceArticle = {
  id: number;
  title: string;
  content: string | null;
  source: string;
};

export type MasterContent = {
  id: number;
  topicSlug: string;
  headline: string;
  body: string;
  keywords: string[];
};

export async function writeMasterContent(
  topicSlug: string,
  topicHeadline: string,
  sourceIds: number[]
): Promise<MasterContent | null> {
  const placeholders = sourceIds.map(() => "?").join(",");
  const articles = db
    .prepare<number[], SourceArticle>(
      `SELECT id, title, content, source FROM source_articles WHERE id IN (${placeholders})`
    )
    .all(...sourceIds);

  const articlesText = articles
    .map((a) => `[소스: ${a.source}]\n제목: ${a.title}\n${(a.content ?? "").slice(0, 800)}`)
    .join("\n\n---\n\n");

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    system: [
      {
        type: "text",
        text: `인터뷰메이트(@intv_mate) 채용/면접 전문 콘텐츠 라이터입니다.
타겟 독자: 취준생·이직자 (20-35세, 한국)
톤: 친근하고 실용적. 과도한 이모지 금지. 자연스러운 한국어.
절대 금지 단어: 자동화, 봇, 테스트, 시스템, publisher, 에이전트, 큐, API, dev`,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      {
        role: "user",
        content: `주제: ${topicHeadline} (slug: ${topicSlug})

참고 기사:
${articlesText}

Master Content 작성 요구사항:
- fullBody: 800-1200자, 자연스러운 한국어
- 구조: 헤드라인 → 핵심 인사이트 3-5개 → 실용 팁 → 마무리
- 출처 직접 언급 금지 (독자적 관점으로 재작성)
- SEO·해시태그용 키워드 5-8개

JSON으로만 응답:
{
  "headline": "클릭 유도 제목 (30자 이내)",
  "keywords": ["키워드1", "키워드2"],
  "fullBody": "800-1200자 본문 전체"
}`,
      },
    ],
  });

  try {
    const raw = response.content[0].type === "text" ? response.content[0].text : "{}";
    const parsed = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] ?? "{}");
    const { headline, keywords, fullBody } = parsed;
    if (!headline || !fullBody) return null;

    // 길이 가드: 600자 미만 또는 1500자 초과는 'failed' 처리 (HITL 통과 차단)
    const len = (fullBody as string).length;
    const initialStatus = len < 600 || len > 1500 ? "failed" : "draft";
    if (initialStatus === "failed") {
      console.error(`  · master body 길이 가드 위반: ${len}자 (목표 800-1200자)`);
    }

    const result = db
      .prepare(
        `INSERT INTO master_contents (source_ids, topic_slug, headline, body, keywords, status)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(JSON.stringify(sourceIds), topicSlug, headline, fullBody, JSON.stringify(keywords ?? []), initialStatus);

    // 길이 위반 시 forensics 용으로 행은 남기되 파이프라인은 중단.
    if (initialStatus === "failed") return null;

    return {
      id: result.lastInsertRowid as number,
      topicSlug,
      headline,
      body: fullBody,
      keywords: keywords ?? [],
    };
  } catch (e) {
    console.error("  · master-writer 파싱 오류:", e);
    return null;
  }
}

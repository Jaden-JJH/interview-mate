// W2 데이터 수집 에이전트 — Haiku로 source_articles 분류·주제 선정·dedup 처리

import Anthropic from "@anthropic-ai/sdk";
import { env } from "../lib/env.js";
import { db } from "../lib/db.js";

const client = new Anthropic({ apiKey: env.anthropic.apiKey });

type SourceArticle = {
  id: number;
  source: string;
  url: string;
  title: string;
  content: string | null;
  fetched_at: string;
};

export type TopicResult = {
  slug: string;
  headline: string;
  selectedIds: number[];
  categories: string[];
};

export async function collectAndSelectTopic(): Promise<TopicResult | null> {
  const articles = db.prepare<[], SourceArticle>(`
    SELECT id, source, url, title, content, fetched_at
    FROM source_articles
    WHERE fetched_at >= datetime('now', '-24 hours')
    ORDER BY fetched_at DESC
    LIMIT 50
  `).all();

  if (articles.length === 0) {
    console.log("  · source_articles: 24h 내 기사 없음");
    return null;
  }

  const usedSlugs = db.prepare<[], { topic_slug: string }>(`
    SELECT topic_slug FROM dedup_index WHERE expires_at > datetime('now')
  `).all().map((r) => r.topic_slug);

  const articleList = articles
    .map((a, i) => `[${i}] ${a.title}\n${(a.content ?? "").slice(0, 300)}`)
    .join("\n\n");

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    system: [
      {
        type: "text",
        text: `채용/면접/커리어 콘텐츠 큐레이터입니다. 취준생·이직자에게 유용한 기사를 선별하고 오늘의 핵심 주제를 선정합니다.
이미 발행된 주제 slug(재발행 금지): ${usedSlugs.join(", ") || "없음"}`,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      {
        role: "user",
        content: `기사 목록 (인덱스: 제목\\n요약):
${articleList}

작업:
1. 채용/면접/커리어/이직/취업/이력서/기업문화/IT취업 관련 기사 선별 (관련성 8점 이상만)
2. 이미 발행된 slug와 중복되지 않는 최우선 주제 1개 선정
3. 해당 주제 관련 기사 최대 5개 선택

JSON으로만 응답:
{
  "topTopic": {
    "slug": "kebab-case-주제슬러그",
    "headline": "주제 한 줄 요약 (20자 이내, 한국어)",
    "selectedIndices": [관련 기사 인덱스 배열, 최대 5],
    "categories": ["카테고리"]
  }
}
관련 기사가 없거나 모두 중복이면 topTopic을 null로.`,
      },
    ],
  });

  try {
    const raw = response.content[0].type === "text" ? response.content[0].text : "{}";
    const parsed = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] ?? "{}");
    if (!parsed.topTopic) return null;

    const { slug, headline, selectedIndices, categories } = parsed.topTopic;
    const selectedIds: number[] = (selectedIndices as number[])
      .map((i: number) => articles[i]?.id)
      .filter((id): id is number => id != null);

    db.prepare(`
      INSERT OR REPLACE INTO dedup_index (topic_slug, expires_at)
      VALUES (?, datetime('now', '+24 hours'))
    `).run(slug);

    return { slug, headline, selectedIds, categories: categories ?? [] };
  } catch (e) {
    console.error("  · data-collector 파싱 오류:", e);
    return null;
  }
}

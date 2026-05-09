// Master Content → YouTube Shorts 30~60초 각본 (5씬 JSON)

import Anthropic from "@anthropic-ai/sdk";
import { env } from "../lib/env.js";
import { db } from "../lib/db.js";

const client = new Anthropic({ apiKey: env.anthropic.apiKey });

export type ShortsScene = {
  sceneNumber: number;
  headline: string;
  narration: string;
  visualCue: "hook" | "insight" | "tip" | "stat" | "cta";
  durationHint: number;
};

export type ShortsScript = {
  title: string;
  description: string;
  tags: string[];
  scenes: ShortsScene[];
};

type MasterInput = {
  id: number;
  headline: string;
  body: string;
  topicSlug: string;
  keywords: string[];
};

export async function transformToShorts(master: MasterInput): Promise<ShortsScript | null> {
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1500,
    system: [
      {
        type: "text",
        text: `YouTube Shorts 각본 작가입니다. 채용·면접·커리어 콘텐츠를 30~60초 세로 영상 각본으로 변환합니다.

규칙:
- 정확히 5씬. 씬1은 hook(3초 이내 강렬한 한 문장), 씬5는 CTA.
- 나레이션은 자연스러운 한국어 구어체. 총 나레이션 250~400자.
- 씬당 durationHint 합계 = 30~60초.
- tags: 한국어 해시태그 5~8개 (# 없이 텍스트만).
- title: YouTube 제목 (40자 이내, 호기심 유발). #Shorts 미포함(자동 추가).
- description: 2~3줄 설명 + "면접 연습은 interview-mate.com"
- "자동화", "봇", "테스트", "API", "시스템" 단어 절대 사용 금지.`,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      {
        role: "user",
        content: `주제: ${master.headline}
키워드: ${master.keywords.join(", ")}

본문:
${master.body}

JSON으로만 응답:
{
  "title": "YouTube 제목",
  "description": "설명",
  "tags": ["태그1", "태그2"],
  "scenes": [
    { "sceneNumber": 1, "headline": "화면 표시 텍스트(15자 이내)", "narration": "TTS 나레이션", "visualCue": "hook", "durationHint": 5 },
    ...
  ]
}`,
      },
    ],
  });

  try {
    const raw = response.content[0].type === "text" ? response.content[0].text : "{}";
    const parsed = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] ?? "{}") as ShortsScript;

    if (!parsed.scenes || parsed.scenes.length !== 5) return null;
    if (!parsed.title || !parsed.description) return null;

    const totalDuration = parsed.scenes.reduce((s, sc) => s + sc.durationHint, 0);
    if (totalDuration < 25 || totalDuration > 65) return null;

    db.prepare(
      `INSERT INTO content_variants (master_id, channel, text, media_spec, status)
       VALUES (?, 'youtube-shorts', ?, ?, 'draft')`,
    ).run(master.id, parsed.title, JSON.stringify(parsed));

    return parsed;
  } catch (e) {
    console.error("  · transformer-shorts 파싱 오류:", e);
    return null;
  }
}

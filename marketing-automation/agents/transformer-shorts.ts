// Master Content → YouTube Shorts 30~40초 각본 (4씬 JSON)

import Anthropic from "@anthropic-ai/sdk";
import { env } from "../lib/env.js";
import { db } from "../lib/db.js";
import { buildUtmUrl, buildCampaignId } from "../lib/utm.js";

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

const MAX_NARRATION_CHARS = 340;
const TARGET_NARRATION_CHARS = 230;

async function generateShortsOnce(
  master: MasterInput,
  retryHint?: { previousChars: number },
): Promise<{ parsed: ShortsScript | null; reason: string | null }> {
  const userExtra = retryHint
    ? `

⚠️ 이전 응답의 나레이션 총 글자수는 ${retryHint.previousChars}자였습니다. 절대 상한 ${MAX_NARRATION_CHARS}자를 초과하므로 거부됐습니다. 이번엔 반드시 **${TARGET_NARRATION_CHARS}자 미만**으로 더 압축해서 다시 작성하세요. 씬 갯수·구조는 유지하되 각 나레이션을 더 짧고 강하게.`
    : "";

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1500,
    system: [
      {
        type: "text",
        text: `YouTube Shorts 각본 작가입니다. 채용·면접·커리어 콘텐츠를 30~40초 세로 영상 각본으로 변환합니다.

규칙:
- 정확히 4씬. 씬1은 hook(3초), 씬4는 CTA(4초).
- 나레이션은 자연스러운 한국어 구어체.
- **총 나레이션 ${TARGET_NARRATION_CHARS - 50}~${TARGET_NARRATION_CHARS}자 (절대 상한 ${MAX_NARRATION_CHARS}자)**. 한국어 TTS는 초당 약 5.5자, ${TARGET_NARRATION_CHARS}자 ≈ 40초.
- 씬당 durationHint 합계 = **30~40초**.
- tags: 한국어 해시태그 5~8개 (# 없이 텍스트만).
- title: YouTube 제목 (40자 이내, 호기심 유발). #Shorts 미포함(자동 추가).
- description: 2~3줄 설명 + "면접 연습은 interview-mate.com"
- 절대 금지 단어: 자동화, 봇, 테스트, 시스템, publisher, 에이전트, 큐, API, dev

응답 전 자체 검증: 4개 씬 나레이션 글자수 합이 ${MAX_NARRATION_CHARS}자 이하인지 확인. 초과 시 줄여서 다시 작성.`,
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
    { "sceneNumber": 1, "headline": "화면 텍스트(15자)", "narration": "TTS 나레이션", "visualCue": "hook", "durationHint": 3 },
    { "sceneNumber": 2, "headline": "...", "narration": "...", "visualCue": "insight", "durationHint": 15 },
    { "sceneNumber": 3, "headline": "...", "narration": "...", "visualCue": "tip", "durationHint": 15 },
    { "sceneNumber": 4, "headline": "CTA", "narration": "마무리", "visualCue": "cta", "durationHint": 4 }
  ]
}${userExtra}`,
      },
    ],
  });

  const raw = response.content[0].type === "text" ? response.content[0].text : "{}";

  try {
    const parsed = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] ?? "{}") as ShortsScript;

    if (!parsed.scenes || parsed.scenes.length !== 4) {
      return { parsed: null, reason: `씬 ${parsed.scenes?.length ?? 0}개 (4개 필요)` };
    }
    if (!parsed.title || !parsed.description) {
      return { parsed: null, reason: "title 또는 description 누락" };
    }

    const totalDuration = parsed.scenes.reduce((s, sc) => s + sc.durationHint, 0);
    if (totalDuration > 50) {
      return { parsed: null, reason: `durationHint 합계 ${totalDuration}초 (50초 초과)` };
    }

    const totalChars = parsed.scenes.reduce((s, sc) => s + sc.narration.length, 0);
    if (totalChars > MAX_NARRATION_CHARS) {
      return { parsed: null, reason: `__OVER_CHARS__:${totalChars}` };
    }

    // description URL에 UTM 부착
    if (parsed.description) {
      const utmUrl = buildUtmUrl("youtube", buildCampaignId(), master.topicSlug);
      if (/interview-mate\.com/i.test(parsed.description)) {
        parsed.description = parsed.description.replace(/https?:\/\/interview-mate\.com\S*|interview-mate\.com\S*/gi, utmUrl);
      } else {
        parsed.description += `\n면접 연습은 ${utmUrl}`;
      }
    }

    return { parsed, reason: null };
  } catch (e) {
    return { parsed: null, reason: `파싱 오류: ${e instanceof Error ? e.message : String(e)}` };
  }
}

export async function transformToShorts(master: MasterInput): Promise<ShortsScript | null> {
  let result = await generateShortsOnce(master);

  // 글자수 초과 시 1회 재시도
  if (!result.parsed && result.reason?.startsWith("__OVER_CHARS__:")) {
    const previousChars = Number(result.reason.slice("__OVER_CHARS__:".length));
    console.warn(`  · Shorts 1차 글자수 ${previousChars}자 초과 — 재시도`);
    result = await generateShortsOnce(master, { previousChars });
  }

  if (!result.parsed) {
    const reason = result.reason?.startsWith("__OVER_CHARS__:")
      ? `나레이션 총 ${result.reason.slice("__OVER_CHARS__:".length)}자 (${MAX_NARRATION_CHARS}자 초과, 재시도 후에도 실패)`
      : result.reason;
    console.error(`  · Shorts 검증 실패: ${reason}`);
    return null;
  }

  db.prepare(
    `INSERT INTO content_variants (master_id, channel, text, media_spec, status)
     VALUES (?, 'youtube-shorts', ?, ?, 'draft')`,
  ).run(master.id, result.parsed.title, JSON.stringify(result.parsed));

  return result.parsed;
}

// Haiku 자연스러움 스코어 — 금지 단어 + 인간 작성 가능성 평가 (7점 이상 통과)

import Anthropic from "@anthropic-ai/sdk";
import { env } from "../lib/env.js";
import { checkForbiddenWords } from "./forbidden-words.js";

const client = new Anthropic({ apiKey: env.anthropic.apiKey });

export type QualityResult = {
  pass: boolean;
  naturalScore: number;
  hasForbiddenWords: boolean;
  forbiddenFound: string[];
  issues: string[];
};

export async function runQualityGate(text: string): Promise<QualityResult> {
  const forbidden = checkForbiddenWords(text);
  if (!forbidden.pass) {
    return {
      pass: false,
      naturalScore: 0,
      hasForbiddenWords: true,
      forbiddenFound: forbidden.found,
      issues: [`금지 단어 포함: ${forbidden.found.join(", ")}`],
    };
  }

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 256,
    system: [
      {
        type: "text",
        text: "한국어 SNS 콘텐츠 품질 검수관입니다. 텍스트가 실제 사람이 쓴 것처럼 자연스러운지 평가합니다.",
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      {
        role: "user",
        content: `자연스러움 점수 (1-10):
10: 실사람 구분 불가 / 7-9: 자연스러워 발행 가능 / 5-6: 약간 어색 / 1-4: AI 티 많음

텍스트:
${text}

JSON으로만 응답:
{"naturalScore": 숫자, "issues": ["문제점 (있으면)"]}`,
      },
    ],
  });

  try {
    const raw = response.content[0].type === "text" ? response.content[0].text : "{}";
    const parsed = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] ?? "{}");
    const naturalScore: number = parsed.naturalScore ?? 5;
    const issues: string[] = parsed.issues ?? [];
    return {
      pass: naturalScore >= 7,
      naturalScore,
      hasForbiddenWords: false,
      forbiddenFound: [],
      issues,
    };
  } catch {
    return {
      pass: false,
      naturalScore: 0,
      hasForbiddenWords: false,
      forbiddenFound: [],
      issues: ["품질 게이트 응답 파싱 실패"],
    };
  }
}

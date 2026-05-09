// 전체 면접 결과를 바탕으로 종합 피드백과 종합 점수를 생성하는 API 라우트
import { NextRequest, NextResponse } from "next/server";
import { anthropic, CLAUDE_MODEL, extractText } from "@/lib/anthropic";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { captureServerError } from "@/lib/posthog-server";

export const runtime = "nodejs";
export const maxDuration = 60;

const SYSTEM_PROMPT = `Given the interview results below, write a concise overall feedback comment in Korean (2-3 sentences). Be encouraging but honest about areas for improvement. Return only the comment as plain text, no JSON, no markdown.`;

interface QAResult {
  question: string;
  answer: string;
  score: number;
  feedback: string;
  bestAnswer: string;
  keywords: string[];
}

interface Body {
  qaResults?: QAResult[];
}

function weightedAverage(scores: number[]): number {
  if (scores.length === 0) return 0;
  const sum = scores.reduce((a, b) => a + b, 0);
  return Math.round(sum / scores.length);
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = checkRateLimit(ip, "generate-feedback", RATE_LIMITS["generate-feedback"]);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." },
      { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
    );
  }

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const results = Array.isArray(body.qaResults) ? body.qaResults : [];
  if (results.length === 0) {
    return NextResponse.json(
      { error: "qaResults is required" },
      { status: 400 }
    );
  }

  const overallScore = weightedAverage(
    results.map((r) => Math.max(0, Math.min(100, Number(r.score) || 0)))
  );

  const summary = results
    .map(
      (r, i) =>
        `Q${i + 1}: ${r.question}\n점수: ${r.score}점\n피드백: ${r.feedback}`
    )
    .join("\n\n");

  try {
    const message = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 600,
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [
        {
          role: "user",
          content: `다음은 면접 결과입니다.\n\n${summary}\n\n전체 평균: ${overallScore}점\n\n위 결과를 바탕으로 한국어 종합 피드백 코멘트를 2-3 문장으로 작성하세요.`,
        },
      ],
    });

    const overallComment =
      extractText(message).trim() || "전반적으로 잘 답변하셨어요. 꾸준한 연습으로 더 발전할 수 있습니다.";

    return NextResponse.json({ overallScore, overallComment });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[generate-feedback]", msg);
    captureServerError("generate-feedback", err, { ip });
    return NextResponse.json(
      { error: "종합 피드백 생성에 실패했습니다", detail: msg },
      { status: 500 }
    );
  }
}

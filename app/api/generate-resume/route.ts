import { NextRequest, NextResponse } from "next/server";
import { anthropic, CLAUDE_MODEL, extractText } from "@/lib/anthropic";
import { checkRateLimit } from "@/lib/rate-limit";
import { captureServerError } from "@/lib/posthog-server";

export const runtime = "nodejs";
export const maxDuration = 60;

const RESUME_LIMIT = { limit: 5, windowMs: 60 * 60 * 1000 };

const SYSTEM_PROMPT = `You are an expert Korean resume writer specializing in self-introduction letters (자기소개서) for Korean job seekers.
Given the user's career information, write a compelling 자기소개서 they can submit to Korean companies.

Structure the output with these 4 sections, each clearly labeled with the header on its own line:
1. 성장 과정 및 지원 동기 (Growth & Motivation)
2. 직무 역량 및 주요 경험 (Key Skills & Experience)
3. 성격 및 장단점 (Personality & Strengths)
4. 입사 후 포부 (Future Goals)

Guidelines:
- Each section: 150–250 Korean characters
- Natural, professional Korean — not stiff or formulaic
- Use STAR structure (상황·과제·행동·결과) for experience sections
- Be specific — avoid generic phrases like "열심히 하겠습니다"
- Address the target company/position directly where specified
- Total length: 600–900 Korean characters across all 4 sections`;

interface Body {
  position?: string;
  yearsOfExperience?: string;
  keyExperience?: string;
  targetCompany?: string;
  existingResume?: string;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = checkRateLimit(ip, "generate-resume", RESUME_LIMIT);
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

  const position = body.position?.trim();
  if (!position) {
    return NextResponse.json({ error: "지원 직무를 입력해 주세요." }, { status: 400 });
  }

  const lines = [
    `지원 직무: ${position}`,
    body.yearsOfExperience ? `경력: ${body.yearsOfExperience}` : null,
    body.targetCompany ? `지원 회사: ${body.targetCompany}` : null,
    body.keyExperience ? `핵심 경험 및 강점:\n${body.keyExperience}` : null,
    body.existingResume ? `기존 자기소개서 (참고용):\n${body.existingResume}` : null,
  ]
    .filter(Boolean)
    .join("\n\n");

  try {
    const message = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 2000,
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
          content: `다음 정보를 바탕으로 한국어 자기소개서를 작성해 주세요.\n\n${lines}`,
        },
      ],
    });

    const content = extractText(message).trim();
    if (!content) throw new Error("Empty response from model");

    return NextResponse.json({ content });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[generate-resume]", msg);
    captureServerError("generate-resume", err, { ip, position });
    return NextResponse.json(
      { error: "이력서 생성에 실패했습니다", detail: msg },
      { status: 500 }
    );
  }
}

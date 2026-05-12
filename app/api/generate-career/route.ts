// 경력기술서 생성 API — 경력 정보 → 성과 중심 스토리텔링 경력기술서
import { NextRequest, NextResponse } from "next/server";
import { anthropic, CLAUDE_MODEL, extractText } from "@/lib/anthropic";
import { getOrCreateAppUserId } from "@/lib/db/users";
import { consumeCredits } from "@/lib/db/credits";
import { isGuestMode } from "@/lib/guest";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { CREDIT_COSTS } from "@/lib/credit-costs";
import { captureServerError } from "@/lib/posthog-server";

export const runtime = "nodejs";
export const maxDuration = 120;

const SYSTEM_PROMPT = `You are an expert Korean career document writer specializing in 경력기술서 (career description documents) used for Korean job applications.

Given the user's career information, write a detailed, achievement-focused 경력기술서.

Structure each project/role using this storytelling framework:
1. 상황/배경 (Context) — What was the situation or problem?
2. 과제/목표 (Challenge) — What was the goal or what needed to be solved?
3. 행동/접근 (Action) — What specific steps did you take?
4. 성과/결과 (Result) — Quantifiable outcomes and impact
5. 배운 점 (Lessons) — Key takeaways and growth

Guidelines:
- Write in natural, professional Korean
- Organize by project or role, most recent first
- Each project section: 200–400 Korean characters
- Quantify results wherever possible (%, revenue, efficiency, etc.)
- Total output: 3–5 pages worth of content (1500–3000 Korean characters)
- Use bullet points and clear section headers for readability
- Tailor tone/emphasis to the target company if specified
- Do NOT fabricate numbers — if the user didn't provide metrics, describe impact qualitatively`;

interface Body {
  position?: string;
  yearsOfExperience?: string;
  keyExperience?: string;
  targetCompany?: string;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = checkRateLimit(ip, "generate-career", RATE_LIMITS["generate-career"]);
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
    return NextResponse.json({ error: "직무/포지션을 입력해 주세요." }, { status: 400 });
  }

  const keyExperience = body.keyExperience?.trim();
  if (!keyExperience || keyExperience.length < 30) {
    return NextResponse.json({ error: "핵심 경력 및 성과를 30자 이상 입력해 주세요." }, { status: 400 });
  }

  const guest = isGuestMode();
  if (!guest) {
    const userId = await getOrCreateAppUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const balance = await consumeCredits(userId, CREDIT_COSTS.careerGenerate);
    if (!balance) {
      return NextResponse.json(
        { error: "insufficient_credits" },
        { status: 402 }
      );
    }
  }

  const lines = [
    `직무/포지션: ${position}`,
    body.yearsOfExperience ? `총 경력: ${body.yearsOfExperience}` : null,
    body.targetCompany ? `지원 회사: ${body.targetCompany}` : null,
    `핵심 경력 및 성과:\n${keyExperience}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  try {
    const message = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 4000,
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
          content: `다음 정보를 바탕으로 성과 중심의 경력기술서를 작성해 주세요.\n\n${lines}`,
        },
      ],
    });

    const content = extractText(message).trim();
    if (!content) throw new Error("Empty response from model");

    return NextResponse.json({ content });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[generate-career]", msg);
    captureServerError("generate-career", err, { ip, position });
    return NextResponse.json(
      { error: "경력기술서 생성에 실패했습니다", detail: msg },
      { status: 500 }
    );
  }
}

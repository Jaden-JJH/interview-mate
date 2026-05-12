// 직무 정보를 입력받아 한국어 자기소개서(4개 섹션)를 AI로 생성하는 API 라우트 (1크레딧)
import { NextRequest, NextResponse } from "next/server";
import { anthropic, CLAUDE_MODEL, extractText } from "@/lib/anthropic";
import { getOrCreateAppUserId } from "@/lib/db/users";
import { consumeCredits } from "@/lib/db/credits";
import { isGuestMode } from "@/lib/guest";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { CREDIT_COSTS } from "@/lib/credit-costs";
import { captureServerError } from "@/lib/posthog-server";
import { searchCompanyInfo, formatCompanyContext } from "@/lib/search-company";

export const runtime = "nodejs";
export const maxDuration = 60;

const SYSTEM_PROMPT = `You are an expert Korean resume writer specializing in self-introduction letters (자기소개서) for Korean job seekers.
Given the user's career information, write a compelling 자기소개서 they can submit to Korean companies.

Structure the output with these 4 sections, each clearly labeled with the header on its own line:
1. 지원 동기 — 왜 이 회사, 이 직무인지 구체적으로
2. 직무 역량 및 주요 경험 — STAR 구조로 증명
3. 성격 및 강점 — 직무와 연결되는 구체적 사례
4. 입사 후 포부 — 이 회사에서 이루고 싶은 것

Guidelines:
- Each section: 300–500 Korean characters (total 1200–2000 characters, A4 약 1.5–2장 분량)
- Natural, professional Korean — not stiff or formulaic
- Use STAR structure (상황·과제·행동·결과) for experience sections
- Be specific — avoid generic phrases like "열심히 하겠습니다", "최선을 다하겠습니다"
- If company reference info is provided, actively reference the company's values, culture, tech stack, or business direction in sections 1 and 4
- If the user specifies emphasis points (강조하고 싶은 내용), prominently weave those themes into the relevant sections
- Each section must include at least one concrete example, number, or outcome — no section should be purely abstract
- Write as if the applicant is speaking in first person, with confident but humble tone`;

interface Body {
  position?: string;
  yearsOfExperience?: string;
  keyExperience?: string;
  targetCompany?: string;
  emphasis?: string;
  existingResume?: string;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = checkRateLimit(ip, "generate-resume", RATE_LIMITS["generate-resume"]);
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

  const guest = isGuestMode();
  if (!guest && CREDIT_COSTS.resumeGenerate > 0) {
    const userId = await getOrCreateAppUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const balance = await consumeCredits(userId, CREDIT_COSTS.resumeGenerate);
    if (!balance) {
      return NextResponse.json(
        { error: "insufficient_credits" },
        { status: 402 }
      );
    }
  }

  let companyContext = "";
  if (body.targetCompany?.trim()) {
    const info = await searchCompanyInfo(body.targetCompany.trim(), position);
    if (info) companyContext = formatCompanyContext(info);
  }

  const lines = [
    `지원 직무: ${position}`,
    body.yearsOfExperience ? `경력: ${body.yearsOfExperience}` : null,
    body.targetCompany ? `지원 회사: ${body.targetCompany}` : null,
    body.keyExperience ? `핵심 경험 및 강점:\n${body.keyExperience}` : null,
    body.emphasis ? `강조하고 싶은 내용:\n${body.emphasis}` : null,
    body.existingResume ? `기존 자기소개서 (참고용):\n${body.existingResume}` : null,
    companyContext ? `\n${companyContext}` : null,
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

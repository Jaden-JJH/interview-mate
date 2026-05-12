// 이력서 생성 API — 이력 정보 → 실전용 이력서 텍스트
import { NextRequest, NextResponse } from "next/server";
import { anthropic, CLAUDE_MODEL, extractText } from "@/lib/anthropic";
import { getOrCreateAppUserId } from "@/lib/db/users";
import { consumeCredits } from "@/lib/db/credits";
import { isGuestMode } from "@/lib/guest";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { CREDIT_COSTS } from "@/lib/credit-costs";
import { captureServerError } from "@/lib/posthog-server";

export const runtime = "nodejs";
export const maxDuration = 60;

const SYSTEM_PROMPT = `You are an expert Korean resume writer. Create a clean, professional 이력서 (resume/CV) in Korean that the user can immediately use for job applications.

Output format — use clear section headers and consistent formatting:

[이름]
[연락처]

■ 지원 직무
(Position the user is applying for)

■ 자기소개 (2-3 sentences)
A concise professional summary highlighting key strengths and career direction.

■ 경력 사항
For each role:
- 회사명 | 직무/직책 | 기간
  · Key achievement or responsibility (quantified where possible)
  · Key achievement or responsibility

■ 학력
- 학교명 | 전공 | 졸업년도

■ 보유 기술
Comma-separated list of relevant skills

■ 기타 (only if relevant info provided)
Certifications, awards, languages, etc.

Guidelines:
- Write in natural, professional Korean
- Keep it concise — 1-2 pages (600-1200 Korean characters)
- Quantify achievements where the user provided numbers
- Do NOT fabricate information — only use what's provided
- Prioritize recent and relevant experience
- Use consistent formatting with bullet points`;

interface Body {
  name?: string;
  contact?: string;
  position?: string;
  education?: string;
  experience?: string;
  skills?: string;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = checkRateLimit(ip, "generate-resume-doc", RATE_LIMITS["generate-resume-doc"]);
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

  const name = body.name?.trim();
  if (!name) {
    return NextResponse.json({ error: "이름을 입력해 주세요." }, { status: 400 });
  }

  const position = body.position?.trim();
  if (!position) {
    return NextResponse.json({ error: "지원 직무를 입력해 주세요." }, { status: 400 });
  }

  const experience = body.experience?.trim();
  if (!experience || experience.length < 30) {
    return NextResponse.json({ error: "경력 요약을 30자 이상 입력해 주세요." }, { status: 400 });
  }

  const guest = isGuestMode();
  if (!guest && CREDIT_COSTS.resumeDocGenerate > 0) {
    const userId = await getOrCreateAppUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const balance = await consumeCredits(userId, CREDIT_COSTS.resumeDocGenerate);
    if (!balance) {
      return NextResponse.json(
        { error: "insufficient_credits" },
        { status: 402 }
      );
    }
  }

  const lines = [
    `이름: ${name}`,
    body.contact ? `연락처: ${body.contact}` : null,
    `지원 직무: ${position}`,
    body.education ? `학력: ${body.education}` : null,
    `경력 요약:\n${experience}`,
    body.skills ? `보유 기술: ${body.skills}` : null,
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
          content: `다음 정보를 바탕으로 깔끔한 이력서를 작성해 주세요.\n\n${lines}`,
        },
      ],
    });

    const content = extractText(message).trim();
    if (!content) throw new Error("Empty response from model");

    return NextResponse.json({ content });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[generate-resume-doc]", msg);
    captureServerError("generate-resume-doc", err, { ip, position });
    return NextResponse.json(
      { error: "이력서 생성에 실패했습니다", detail: msg },
      { status: 500 }
    );
  }
}

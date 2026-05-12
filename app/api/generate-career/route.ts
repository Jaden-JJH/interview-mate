// 경력기술서 생성 API — 구조화된 프로젝트 정보 → 성과 중심 스토리텔링 경력기술서 3~5장
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
export const maxDuration = 120;

const SYSTEM_PROMPT = `You are an expert Korean career document writer specializing in 경력기술서 (career description documents) used for Korean job applications.

Given the user's career information (which may include structured per-project details), write a detailed, achievement-focused 경력기술서 of 3–5 pages.

## Output structure

For each project or role, use this storytelling framework with clear headers:

### [프로젝트명 / 역할] (기간)
1. **배경 및 상황** — 조직의 상황, 해결이 필요했던 문제
2. **과제 및 목표** — 맡은 역할과 달성 목표
3. **접근 방법** — 구체적 기술 스택, 방법론, 의사결정 과정
4. **핵심 성과** — 정량 지표 (%, 매출, 효율, DAU 등) 중심
5. **배운 점 및 역량 성장** — 이 경험이 지원 직무에 어떻게 연결되는지

## Guidelines
- Write in natural, professional Korean
- Organize by project or role, most recent first
- Each project section: 400–800 Korean characters (충분히 깊이 있게)
- Total output: 3000–5000 Korean characters (A4 3–5장 분량)
- Quantify results wherever possible — if the user didn't provide metrics, describe impact qualitatively but DO NOT fabricate numbers
- If company reference info is provided, tailor the narrative to emphasize skills and achievements relevant to that company
- End with a brief "핵심 역량 요약" section (3–5 bullet points) tying everything together
- Use markdown headers (##, ###) and bullet points for readability`;

interface Project {
  name: string;
  role?: string;
  period?: string;
  situation?: string;
  challenge?: string;
  action?: string;
  result?: string;
  lesson?: string;
}

interface Body {
  position?: string;
  yearsOfExperience?: string;
  keyExperience?: string;
  targetCompany?: string;
  projects?: Project[];
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

  let companyContext = "";
  if (body.targetCompany?.trim()) {
    const info = await searchCompanyInfo(body.targetCompany.trim(), position);
    if (info) companyContext = formatCompanyContext(info);
  }

  const projectLines = body.projects?.length
    ? body.projects
        .map((p, i) => {
          const parts = [
            `--- 프로젝트 ${i + 1}: ${p.name} ---`,
            p.role ? `역할: ${p.role}` : null,
            p.period ? `기간: ${p.period}` : null,
            p.situation ? `상황/배경: ${p.situation}` : null,
            p.challenge ? `과제/목표: ${p.challenge}` : null,
            p.action ? `행동/접근: ${p.action}` : null,
            p.result ? `성과/결과: ${p.result}` : null,
            p.lesson ? `배운 점: ${p.lesson}` : null,
          ];
          return parts.filter(Boolean).join("\n");
        })
        .join("\n\n")
    : null;

  const lines = [
    `직무/포지션: ${position}`,
    body.yearsOfExperience ? `총 경력: ${body.yearsOfExperience}` : null,
    body.targetCompany ? `지원 회사: ${body.targetCompany}` : null,
    projectLines ? `구조화된 프로젝트 정보:\n\n${projectLines}` : null,
    `핵심 경력 및 성과:\n${keyExperience}`,
    companyContext ? `\n${companyContext}` : null,
  ]
    .filter(Boolean)
    .join("\n\n");

  try {
    const message = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 8000,
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

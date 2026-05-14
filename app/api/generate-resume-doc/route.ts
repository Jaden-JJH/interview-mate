// 이력서 생성 API — 확장 이력 정보 (학력·경력·자격증 배열 포함) → 실전용 이력서 텍스트 (무료)
import { NextRequest, NextResponse } from "next/server";
import { anthropic, CLAUDE_MODEL, extractText } from "@/lib/anthropic";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
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
For each entry:
- 학교명 | 전공 | 학위 | 졸업연도 | 재학상태

■ 보유 기술
Comma-separated list of relevant skills

■ 자격증 / 어학 (only if provided)
- 자격증명 (취득일/점수)

■ 대외활동 / 수상 (only if provided)
(relevant activities and awards)

Guidelines:
- Write in natural, professional Korean
- Keep it concise — 1-2 pages (600-1200 Korean characters)
- Quantify achievements where the user provided numbers
- Do NOT fabricate information — only use what's provided
- Prioritize recent and relevant experience
- Use consistent formatting with bullet points
- Do NOT use emojis under any circumstances
- Use only headers up to ### (never ####, #####, or deeper)
- Use only basic markdown: bold (**text**), lists (- item), dividers (---)
- Avoid any markdown syntax that might not render correctly in a plain textarea`;

interface EduEntry {
  school: string;
  major?: string;
  degree?: string;
  graduationYear?: string;
  status?: string;
}

interface CarEntry {
  company: string;
  role?: string;
  period?: string;
  description?: string;
}

interface CertItem {
  name: string;
  detail?: string;
}

interface Body {
  name?: string;
  contact?: string;
  position?: string;
  yearsOfExperience?: string;
  educations?: EduEntry[];
  careers?: CarEntry[];
  certs?: CertItem[];
  skills?: string;
  activities?: string;
  extraInfo?: string;
  language?: "ko" | "en";
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

  const edus = (body.educations ?? []).filter((e) => e.school?.trim());
  const cars = (body.careers ?? []).filter((c) => c.company?.trim());
  const certItems = (body.certs ?? []).filter((c) => c.name?.trim());

  const lines = [
    `이름: ${name}`,
    body.contact ? `연락처: ${body.contact}` : null,
    `지원 직무: ${position}`,
    body.yearsOfExperience ? `총 경력: ${body.yearsOfExperience}` : null,
    edus.length > 0
      ? `학력:\n${edus.map((e) =>
          `- ${e.school}${e.major ? ` ${e.major}` : ""}${e.degree ? ` (${e.degree})` : ""}${e.graduationYear ? ` ${e.graduationYear}` : ""}${e.status ? ` ${e.status}` : ""}`
        ).join("\n")}`
      : null,
    cars.length > 0
      ? `경력 사항:\n${cars.map((c) =>
          [
            `- ${c.company}${c.role ? ` | ${c.role}` : ""}${c.period ? ` | ${c.period}` : ""}`,
            c.description ? `  ${c.description}` : null,
          ].filter(Boolean).join("\n")
        ).join("\n")}`
      : null,
    certItems.length > 0
      ? `자격증/어학:\n${certItems.map((c) => `- ${c.name}${c.detail ? ` (${c.detail})` : ""}`).join("\n")}`
      : null,
    body.skills ? `보유 기술: ${body.skills}` : null,
    body.activities ? `대외활동/수상:\n${body.activities}` : null,
    body.extraInfo ? `기타/추가 정보:\n${body.extraInfo}` : null,
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
          content: body.language === "en"
            ? `Please write a clean, professional resume entirely in English based on the following information.\n\n${lines}`
            : `다음 정보를 바탕으로 깔끔한 이력서를 작성해 주세요.\n\n${lines}`,
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

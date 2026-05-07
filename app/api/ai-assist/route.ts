import { NextRequest, NextResponse } from "next/server";
import { anthropic, CLAUDE_MODEL, extractText } from "@/lib/anthropic";
import { resolvePersona } from "@/lib/personas";
import { checkRateLimit } from "@/lib/rate-limit";
import { captureServerError } from "@/lib/posthog-server";
import { getOrCreateAppUserId } from "@/lib/db/users";
import { claimAiAssist } from "@/lib/db/credits";
import { isGuestMode } from "@/lib/guest";

export const runtime = "nodejs";
export const maxDuration = 30;

// Extend RATE_LIMITS inline for this route
const AI_ASSIST_LIMIT = { limit: 10, windowMs: 60 * 60 * 1000 };

const SYSTEM_PROMPT = `You are a Korean job interview coach helping a candidate draft a strong answer to an interview question.
Given the question, candidate's resume, and job posting context, write a structured, natural Korean answer they can edit and submit.

Guidelines:
- Use STAR structure (상황/과제/행동/결과) where appropriate
- Keep it concise: 200–350 Korean characters
- Match the interviewer persona's tone
- Use first person ("저는", "제가")
- Do NOT add headers, bullet points, or markdown — plain flowing paragraphs only
- Write as if the candidate is speaking naturally in an interview
- End with a forward-looking statement connecting to the role`;

interface Body {
  question?: string;
  resume?: string;
  jobPosting?: string;
  personaId?: string;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = checkRateLimit(ip, "ai-assist", AI_ASSIST_LIMIT);
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

  const question = body.question?.trim();
  if (!question) {
    return NextResponse.json({ error: "question is required" }, { status: 400 });
  }

  // Auth + entitlement — 검증 통과 후에 claim해 invalid body로 무료 1회를
  // 태우지 않게 한다. 게스트 모드는 generate-questions 등 다른 라우트와
  // 동일하게 우회 (테스트용 무인증 흐름 유지).
  // unlimited는 클라가 localStorage 1회 게이트를 건너뛸지 판단하는 신호.
  const guest = isGuestMode();
  let unlimited = guest;
  if (!guest) {
    const userId = await getOrCreateAppUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const claim = await claimAiAssist(userId);
    if (!claim) {
      return NextResponse.json(
        { error: "ai_assist_exhausted" },
        { status: 402 }
      );
    }
    unlimited = claim === "unlimited";
  }

  const resume = body.resume?.trim() ?? "";
  const jobPosting = body.jobPosting?.trim() ?? "";
  const persona = resolvePersona(body.personaId ?? "alex");

  const systemPrompt = `${SYSTEM_PROMPT}\n\nInterviewer persona: ${persona.name} — ${persona.systemAddendum}`;

  try {
    const message = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 600,
      system: [
        {
          type: "text",
          text: systemPrompt,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [
        {
          role: "user",
          content: [
            resume ? `[자기소개서]\n${resume}` : null,
            jobPosting ? `[채용공고]\n${jobPosting}` : null,
            `[면접 질문]\n${question}`,
            `위 맥락을 참고해 이 질문에 대한 자연스러운 한국어 면접 답변 초안을 작성해 주세요. 지원자가 직접 편집해서 제출할 예정입니다.`,
          ]
            .filter(Boolean)
            .join("\n\n"),
        },
      ],
    });

    const answer = extractText(message).trim();
    if (!answer) throw new Error("Empty response from model");

    return NextResponse.json({ answer, unlimited });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[ai-assist]", msg);
    captureServerError("ai-assist", err, { ip });
    return NextResponse.json(
      { error: "답변 초안 생성에 실패했습니다", detail: msg },
      { status: 500 }
    );
  }
}

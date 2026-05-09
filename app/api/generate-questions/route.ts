// 자기소개서·채용공고·페르소나를 기반으로 맞춤 면접 질문을 생성하는 API 라우트 (크레딧 차감)
import { NextRequest, NextResponse } from "next/server";
import { anthropic, CLAUDE_MODEL, extractText, parseJsonFromText } from "@/lib/anthropic";
import { findDuration, resolvePersona, RANDOM_PERSONA_ID } from "@/lib/personas";
import { getOrCreateAppUserId } from "@/lib/db/users";
import { consumeCredit } from "@/lib/db/credits";
import { isGuestMode } from "@/lib/guest";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { captureServerError } from "@/lib/posthog-server";

export const runtime = "nodejs";
export const maxDuration = 60;

const BASE_SYSTEM = `You are a professional Korean job interviewer. Given the candidate's resume and job posting, generate tailored interview questions in Korean. Mix technical, project, soft-skill, motivation, and career-vision angles in proportion to the count requested. Return ONLY a JSON array of strings.`;

interface Body {
  resume?: string;
  jobPosting?: string;
  durationMinutes?: number;
  personaId?: string;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = checkRateLimit(ip, "generate-questions", RATE_LIMITS["generate-questions"]);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." },
      { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
    );
  }

  // In guest mode we skip both auth and the credit charge — testers run
  // the full flow without sign-in or persistent state.
  const guest = isGuestMode();
  let userId: string | null = null;
  if (!guest) {
    userId = await getOrCreateAppUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const resume = body.resume?.trim();
  const jobPosting = body.jobPosting?.trim();
  if (!resume || !jobPosting) {
    return NextResponse.json(
      { error: "resume and jobPosting are required" },
      { status: 400 }
    );
  }

  const duration = findDuration(Number(body.durationMinutes) || 10);
  const personaId = body.personaId ?? "alex";
  const persona = resolvePersona(personaId);
  const resolvedId = personaId === RANDOM_PERSONA_ID ? persona.id : persona.id;

  // Total questions includes the fixed closing question, so generate count-1.
  const generateCount = Math.max(2, duration.questionCount - 1);

  const systemPrompt = `${BASE_SYSTEM}\n\nInterviewer persona tone: ${persona.systemAddendum}`;

  // Charge before the (expensive) Claude call so abandoned interviews still
  // pay for the question-generation cost we incurred. Atomic UPDATE handles
  // race conditions; null = out of credits. Skipped in guest mode.
  let balance: { free: number; paid: number } | null = null;
  if (!guest && userId) {
    balance = await consumeCredit(userId);
    if (!balance) {
      return NextResponse.json(
        { error: "insufficient_credits" },
        { status: 402 }
      );
    }
  } else {
    balance = { free: 999, paid: 0 };
  }

  try {
    const message = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 1500,
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
          content: `[자기소개서]\n${resume}\n\n[채용공고]\n${jobPosting}\n\n위 자기소개서와 채용공고를 바탕으로 ${generateCount}개의 면접 질문을 한국어로 생성하세요. 면접관 페르소나는 "${persona.name}" (${persona.tagline}) 입니다. 톤을 자연스럽게 반영해 주세요. 반드시 JSON 배열 형식으로만 응답하고 다른 설명은 포함하지 마세요.`,
        },
      ],
    });

    const text = extractText(message);
    const questions = parseJsonFromText<string[]>(text);

    if (!Array.isArray(questions) || questions.length === 0) {
      throw new Error("Model did not return an array of questions");
    }

    const cleaned = questions
      .filter((q): q is string => typeof q === "string" && q.trim().length > 0)
      .map((q) => q.trim())
      .slice(0, generateCount);

    if (cleaned.length < 2) {
      throw new Error(`Only ${cleaned.length} valid questions returned`);
    }

    return NextResponse.json({
      questions: cleaned,
      resolvedPersonaId: resolvedId,
      balance,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[generate-questions]", msg);
    captureServerError("generate-questions", err, { ip });
    return NextResponse.json(
      { error: "질문 생성에 실패했습니다", detail: msg },
      { status: 500 }
    );
  }
}

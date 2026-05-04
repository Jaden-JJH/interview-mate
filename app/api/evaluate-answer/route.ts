import { NextRequest, NextResponse } from "next/server";
import { anthropic, CLAUDE_MODEL, extractText, parseJsonFromText } from "@/lib/anthropic";
import { resolvePersona } from "@/lib/personas";

export const runtime = "nodejs";
export const maxDuration = 60;

const BASE_SYSTEM = `You are a Korean job interview coach. Evaluate the candidate's answer to the given interview question. Consider relevance, specificity, structure, and alignment with the job posting.

Return JSON: {
  score: 0-100,
  feedback: detailed Korean feedback (2-3 sentences),
  bestAnswer: ideal answer in Korean (3-4 sentences),
  keywords: array of 3 key terms the answer should include,
  followUpQuestion: a single Korean follow-up question OR null
}.

followUpQuestion rules:
- Return null if the answer is already strong (score >= 80) and complete.
- Return null if allowFollowUp is false.
- Otherwise, generate ONE specific, natural follow-up that probes a thin area, an unproven claim, or a missing detail. Avoid generic questions. Keep it under 50 Korean characters.`;

interface Body {
  question?: string;
  answer?: string;
  resume?: string;
  jobPosting?: string;
  personaId?: string;
  allowFollowUp?: boolean;
}

interface Evaluation {
  score: number;
  feedback: string;
  bestAnswer: string;
  keywords: string[];
  followUpQuestion: string | null;
}

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const question = body.question?.trim();
  const answer = body.answer?.trim();
  const resume = body.resume?.trim() ?? "";
  const jobPosting = body.jobPosting?.trim() ?? "";
  const allowFollowUp = body.allowFollowUp !== false;
  const persona = resolvePersona(body.personaId ?? "alex");

  if (!question || !answer) {
    return NextResponse.json(
      { error: "question and answer are required" },
      { status: 400 }
    );
  }

  const systemPrompt = `${BASE_SYSTEM}\n\nInterviewer persona tone for follow-up phrasing: ${persona.systemAddendum}`;

  try {
    const message = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 1200,
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
          content: `[자기소개서]\n${resume || "(제공되지 않음)"}\n\n[채용공고]\n${jobPosting || "(제공되지 않음)"}\n\n[면접 질문]\n${question}\n\n[지원자 답변]\n${answer}\n\nallowFollowUp = ${allowFollowUp}\n\n위 정보를 바탕으로 답변을 평가하세요. JSON 한 객체만 응답하세요.`,
        },
      ],
    });

    const text = extractText(message);
    const parsed = parseJsonFromText<Partial<Evaluation>>(text);

    const score = Math.max(0, Math.min(100, Math.round(Number(parsed.score) || 0)));
    const feedback = String(parsed.feedback ?? "").trim() || "피드백을 생성하지 못했어요.";
    const bestAnswer = String(parsed.bestAnswer ?? "").trim() || "모범 답변을 생성하지 못했어요.";
    const keywordsRaw = Array.isArray(parsed.keywords) ? parsed.keywords : [];
    const keywords = keywordsRaw
      .filter((k): k is string => typeof k === "string" && k.trim().length > 0)
      .map((k) => k.trim())
      .slice(0, 3);

    let followUpQuestion: string | null = null;
    if (allowFollowUp && typeof parsed.followUpQuestion === "string") {
      const fq = parsed.followUpQuestion.trim();
      if (fq.length > 0 && fq.toLowerCase() !== "null") {
        followUpQuestion = fq;
      }
    }

    const result: Evaluation = {
      score,
      feedback,
      bestAnswer,
      keywords,
      followUpQuestion,
    };
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[evaluate-answer]", msg);
    return NextResponse.json(
      { error: "답변 평가에 실패했습니다", detail: msg },
      { status: 500 }
    );
  }
}

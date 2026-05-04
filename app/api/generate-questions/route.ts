import { NextRequest, NextResponse } from "next/server";
import { anthropic, CLAUDE_MODEL, extractText, parseJsonFromText } from "@/lib/anthropic";

export const runtime = "nodejs";
export const maxDuration = 60;

const SYSTEM_PROMPT = `You are a professional Korean job interviewer. Given the candidate's resume and job posting, generate exactly 7 tailored interview questions in Korean. Questions should test: technical skills (2), project experience (2), soft skills (1), motivation (1), career vision (1). Return as JSON array of strings.`;

interface Body {
  resume?: string;
  jobPosting?: string;
}

export async function POST(req: NextRequest) {
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

  try {
    const message = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 1500,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `[자기소개서]\n${resume}\n\n[채용공고]\n${jobPosting}\n\n위 자기소개서와 채용공고를 바탕으로 7개의 면접 질문을 한국어로 생성하세요. 반드시 JSON 배열 형식("[", "]" 사이에 7개의 문자열)으로만 응답하세요. 다른 설명은 포함하지 마세요.`,
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
      .slice(0, 7);

    if (cleaned.length < 5) {
      throw new Error(`Only ${cleaned.length} valid questions returned`);
    }

    return NextResponse.json({ questions: cleaned });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[generate-questions]", msg);
    return NextResponse.json(
      { error: "질문 생성에 실패했습니다", detail: msg },
      { status: 500 }
    );
  }
}

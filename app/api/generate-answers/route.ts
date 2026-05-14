// 서류전형 질문별 답변 생성 API — 이력 + 채용공고(선택) + N개 질문 → 맞춤 답변 (Serper 웹서치 fallback)
import { NextRequest, NextResponse } from "next/server";
import { anthropic, CLAUDE_MODEL, extractText, parseJsonFromText } from "@/lib/anthropic";
import { getOrCreateAppUserId } from "@/lib/db/users";
import { consumeCredits } from "@/lib/db/credits";
import { isGuestMode } from "@/lib/guest";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { CREDIT_COSTS } from "@/lib/credit-costs";
import { captureServerError } from "@/lib/posthog-server";
import { searchCompanyInfo, formatCompanyContext } from "@/lib/search-company";

export const runtime = "nodejs";
export const maxDuration = 120;

const SYSTEM_PROMPT = `한국 취업 서류전형 전문 컨설턴트입니다. 지원자의 이력과 경력을 바탕으로 각 서류전형 질문에 대한 답변을 작성합니다.

규칙:
- 각 질문의 글자수 제한이 있으면 반드시 준수 (초과 금지)
- STAR 구조 활용 (상황→과제→행동→결과)
- 질문마다 가능한 다른 경험을 활용하여 중복 방지
- 자연스럽고 진정성 있는 한국어
- 구체적인 수치와 성과 포함
- 채용공고가 제공되면 자격요건·우대사항·인재상에 직접 맞추어 답변 작성
- 지원 회사/직무가 명시되면 해당 기업 문화와 직무 요구사항에 맞게 톤 조정
- 기업 참고 정보가 제공되면 기업 가치관·사업 방향에 자연스럽게 연결
- 이모지 사용 절대 금지
- 마크다운 헤더는 ###까지만 사용 (#### 이하 금지)
- 볼드(**text**), 리스트(- item) 등 기본 마크다운만 사용

응답은 반드시 아래 JSON 배열 형식으로만 출력하세요. 다른 텍스트 없이 JSON만:
[
  { "questionIndex": 0, "answer": "답변 내용...", "charCount": 487 },
  ...
]`;

interface QuestionInput {
  text: string;
  maxLength?: number;
}

interface Body {
  backgroundText: string;
  questions: QuestionInput[];
  targetCompany?: string;
  targetPosition?: string;
  jobPostingText?: string;
  language?: "ko" | "en";
}

interface AnswerItem {
  questionIndex: number;
  answer: string;
  charCount: number;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = checkRateLimit(ip, "generate-answers", RATE_LIMITS["generate-answers"]);
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

  // --- Validation ---
  const backgroundText = body.backgroundText?.trim();
  if (!backgroundText || backgroundText.length < 50) {
    return NextResponse.json(
      { error: "이력/경력 정보를 50자 이상 입력해 주세요." },
      { status: 400 }
    );
  }

  const questions: QuestionInput[] = (body.questions ?? [])
    .filter((q) => q && typeof q.text === "string" && q.text.trim().length >= 10)
    .map((q) => ({ text: q.text.trim(), maxLength: q.maxLength }));

  if (questions.length === 0) {
    return NextResponse.json(
      { error: "질문을 1개 이상 입력해 주세요. (각 10자 이상)" },
      { status: 400 }
    );
  }
  if (questions.length > 10) {
    return NextResponse.json(
      { error: "질문은 최대 10개까지 가능합니다." },
      { status: 400 }
    );
  }

  // --- Credits ---
  const guest = isGuestMode();
  if (!guest) {
    const userId = await getOrCreateAppUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const balance = await consumeCredits(userId, CREDIT_COSTS.answersGenerate);
    if (!balance) {
      return NextResponse.json(
        { error: "insufficient_credits" },
        { status: 402 }
      );
    }
  }

  // --- Web search fallback (only if no job posting but company given) ---
  let companyContext = "";
  const jobPostingText = body.jobPostingText?.trim() || "";
  if (!jobPostingText && body.targetCompany?.trim()) {
    const info = await searchCompanyInfo(body.targetCompany.trim(), body.targetPosition?.trim() || "");
    if (info) companyContext = formatCompanyContext(info);
  }

  // --- Build user message ---
  const questionLines = questions
    .map((q, i) => {
      const limit = q.maxLength ? ` (제한: ${q.maxLength}자)` : " (제한 없음)";
      return `질문 ${i + 1}: ${q.text}${limit}`;
    })
    .join("\n");

  const parts = [
    `[지원자 이력/경력]\n${backgroundText}`,
    body.targetCompany?.trim() ? `[지원 회사] ${body.targetCompany.trim()}` : null,
    body.targetPosition?.trim() ? `[지원 직무] ${body.targetPosition.trim()}` : null,
    jobPostingText ? `[채용공고 전문]\n${jobPostingText}` : null,
    companyContext ? `\n${companyContext}` : null,
    `[서류전형 질문]\n${questionLines}`,
    body.language === "en"
      ? "위 질문들에 대한 답변을 JSON 배열로 작성해 주세요. 모든 답변 내용은 영어(English)로 작성하세요. Professional business English."
      : "위 질문들에 대한 답변을 JSON 배열로 작성해 주세요.",
  ]
    .filter(Boolean)
    .join("\n\n");

  // --- Claude API call ---
  try {
    const message = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: Math.min(questions.length * 2000, 16000),
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
          content: parts,
        },
      ],
    });

    const raw = extractText(message).trim();
    if (!raw) throw new Error("Empty response from model");

    const parsed: AnswerItem[] = parseJsonFromText(raw);

    const answers = parsed.map((item) => {
      const q = questions[item.questionIndex];
      return {
        questionIndex: item.questionIndex,
        questionText: q?.text ?? "",
        answer: item.answer,
        charCount: item.charCount ?? item.answer.length,
      };
    });

    return NextResponse.json({ answers });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[generate-answers]", msg);
    captureServerError("generate-answers", err, { ip, questionCount: questions.length });
    return NextResponse.json(
      { error: "답변 생성에 실패했습니다", detail: msg },
      { status: 500 }
    );
  }
}

// 자소서를 5축 기준으로 분석하여 종합 점수·문항별 강약점을 반환하는 무료 API 라우트
import { NextRequest, NextResponse } from "next/server";
import {
  anthropic,
  CLAUDE_MODEL,
  extractText,
  parseJsonFromText,
} from "@/lib/anthropic";
import { getOrCreateAppUserId } from "@/lib/db/users";
import { isGuestMode } from "@/lib/guest";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { captureServerError } from "@/lib/posthog-server";
import { db } from "@/lib/db";
import { resumeAnalyses } from "@/lib/db/schema";

export const runtime = "nodejs";
export const maxDuration = 60;

const SYSTEM_PROMPT = `당신은 한국 대기업 면접관 10년 경력의 자기소개서 분석 전문가입니다.

주어진 자기소개서를 면접관 관점에서 분석하세요.

## 평가 기준 (5축, 각 0~100점)
1. **논리성(logic)**: 주장→근거→결론 흐름이 자연스러운가
2. **구체성(specificity)**: 수치·사례·STAR 구조로 뒷받침되는가
3. **직무연관성(relevance)**: 지원 직무/회사와 경험이 연결되는가
4. **차별성(uniqueness)**: 뻔한 표현 대신 본인만의 이야기가 있는가
5. **면접방어력(interviewDefense)**: 면접관이 파고들 빈틈이 적은가

## 분석 요구사항
1. 전체 텍스트에서 문항(질문+답변)을 자동 파싱하세요. 문항 구분이 없으면 내용 단위로 나누세요.
2. 각 문항에 대해:
   - 강점(strength): 한 줄 (30자 이내)
   - 약점(weaknesses): 각각 title (15~25자, 구체적이되 해결책 미포함)
3. **맛보기 제공**: 전체 sections 중 첫 번째 section의 첫 번째 약점에만 detail(2~3문장)과 interviewQuestion(50자 이내)을 추가로 제공하세요. 나머지 약점에는 title만.

## 응답 형식 (JSON만, 다른 텍스트 금지)
{
  "overallScore": 72,
  "overallComment": "종합 평가 2~3문장",
  "axes": {
    "logic": 75,
    "specificity": 68,
    "relevance": 80,
    "uniqueness": 60,
    "interviewDefense": 65
  },
  "sections": [
    {
      "questionTitle": "문항 제목 또는 요약 (20자 이내)",
      "originalText": "원문 발췌 (첫 50자...)",
      "score": 70,
      "strength": "강점 한 줄",
      "weaknesses": [
        { "title": "약점 title", "detail": "첫 약점만 상세 2~3문장", "interviewQuestion": "첫 약점만 꼬리질문" }
      ]
    }
  ]
}`;

interface Body {
  resumeText?: string;
  jobPostingUrl?: string;
  jobPostingText?: string;
}

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = checkRateLimit(ip, "analyze-resume", RATE_LIMITS["analyze-resume"]);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." },
      {
        status: 429,
        headers: {
          "Retry-After": String(
            Math.ceil((rl.resetAt - Date.now()) / 1000)
          ),
        },
      }
    );
  }

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

  const resumeText = body.resumeText?.trim();
  if (!resumeText || resumeText.length < 50) {
    return NextResponse.json(
      { error: "자기소개서를 50자 이상 입력해 주세요." },
      { status: 400 }
    );
  }

  const jobPostingText = body.jobPostingText?.trim() || null;

  const userMessage = jobPostingText
    ? `[자기소개서]\n${resumeText}\n\n[채용공고]\n${jobPostingText}\n\n위 자기소개서를 채용공고에 맞춰 면접관 관점에서 분석하세요.`
    : `[자기소개서]\n${resumeText}\n\n위 자기소개서를 범용 면접관 관점에서 분석하세요. 채용공고가 없으므로 직무연관성은 일반적 기준으로 평가하세요.`;

  try {
    const message = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 3000,
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: userMessage }],
    });

    const text = extractText(message);
    const result = parseJsonFromText<{
      overallScore: number;
      overallComment: string;
      axes: Record<string, number>;
      sections: Array<{
        questionTitle: string;
        originalText: string;
        score: number;
        strength: string;
        weaknesses: Array<{
          title: string;
          detail?: string;
          interviewQuestion?: string;
        }>;
      }>;
    }>(text);

    if (
      typeof result.overallScore !== "number" ||
      !result.axes ||
      !Array.isArray(result.sections)
    ) {
      throw new Error("Invalid analysis response structure");
    }

    let analysisId = "guest";
    if (!guest && userId) {
      const [row] = await db
        .insert(resumeAnalyses)
        .values({
          userId,
          resumeText,
          jobPostingText,
          jobPostingCompany: null,
          jobPostingPosition: null,
          overallScore: result.overallScore,
          overallComment: result.overallComment,
          axes: result.axes,
          sections: result.sections,
        })
        .returning({ id: resumeAnalyses.id });
      analysisId = row.id;
    }

    return NextResponse.json({
      analysisId,
      overallScore: result.overallScore,
      overallComment: result.overallComment,
      axes: result.axes,
      sections: result.sections.map((s, si) => ({
        questionTitle: s.questionTitle,
        originalText: s.originalText,
        score: s.score,
        strength: s.strength,
        weaknesses: s.weaknesses.map((w, wi) => {
          if (si === 0 && wi === 0 && w.detail) {
            return {
              title: w.title,
              detail: w.detail,
              interviewQuestion: w.interviewQuestion,
            };
          }
          return { title: w.title };
        }),
      })),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[analyze-resume]", msg);
    captureServerError("analyze-resume", err, { ip });
    return NextResponse.json(
      { error: "자기소개서 분석에 실패했습니다", detail: msg },
      { status: 500 }
    );
  }
}

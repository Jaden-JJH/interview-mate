// 유료 unlock — 약점 상세·꼬리질문·수정본을 생성하고 크레딧을 차감하는 API 라우트
import { NextRequest, NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import {
  anthropic,
  CLAUDE_MODEL,
  extractText,
  parseJsonFromText,
} from "@/lib/anthropic";
import { getOrCreateAppUserId } from "@/lib/db/users";
import { consumeCredits, getBalance } from "@/lib/db/credits";
import { db } from "@/lib/db";
import { resumeAnalyses, credits } from "@/lib/db/schema";
import { CREDIT_COSTS } from "@/lib/credit-costs";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { captureServerError } from "@/lib/posthog-server";

export const runtime = "nodejs";
export const maxDuration = 120;

const UNLOCK_SYSTEM_PROMPT = `당신은 한국 대기업 면접관 10년 경력의 자기소개서 코칭 전문가입니다.

주어진 자기소개서 분석 결과를 바탕으로 각 문항의 약점을 상세 분석하고, 면접관이 물을 꼬리질문과 수정본을 생성하세요.

## 요구사항
각 문항(section)에 대해:
1. **약점 상세(detail)**: 2~3문장. 왜 문제인지, 면접관이 어떻게 느낄지 구체적으로.
2. **꼬리질문(interviewQuestion)**: 50자 이내. 면접관이 이 약점을 파고들 때 실제로 물을 질문.
3. **수정본(revisedText)**: 원문 대비 ±20% 길이. 약점을 보완하되 지원자의 톤 유지.

## 응답 형식 (JSON만)
{
  "sections": [
    {
      "questionTitle": "문항 제목",
      "weaknesses": [
        {
          "title": "약점 title",
          "detail": "상세 설명 2~3문장",
          "interviewQuestion": "면접관 예상 질문"
        }
      ],
      "revisedText": "수정된 전체 답변 텍스트"
    }
  ]
}`;

interface Body {
  analysisId?: string;
}

export async function POST(req: NextRequest) {
  // Fix 4: rate limit 추가
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = checkRateLimit(
    ip,
    "analyze-resume-unlock",
    RATE_LIMITS["analyze-resume"]
  );
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

  const userId = await getOrCreateAppUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const analysisId = body.analysisId?.trim();
  if (!analysisId) {
    return NextResponse.json(
      { error: "analysisId is required" },
      { status: 400 }
    );
  }

  const rows = await db
    .select()
    .from(resumeAnalyses)
    .where(eq(resumeAnalyses.id, analysisId))
    .limit(1);
  if (rows.length === 0) {
    return NextResponse.json(
      { error: "분석 결과를 찾을 수 없습니다" },
      { status: 404 }
    );
  }

  const analysis = rows[0];
  if (analysis.userId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 이미 unlock된 경우 — 캐시 반환 (중복 과금 방지)
  if (analysis.unlockedAt) {
    const balance = await getBalance(userId);
    return NextResponse.json({
      sections: analysis.unlockedSections,
      balance,
    });
  }

  // Fix 1: 무료 1회를 atomic UPDATE RETURNING으로 처리하여 race condition 제거.
  // rows > 0 이면 이번 요청이 무료 플래그를 선점한 것이므로 크레딧 미차감.
  const freeClaimResult = await db.execute(sql`
    UPDATE ${credits}
    SET jasoseo_free_unlock_used = TRUE, updated_at = NOW()
    WHERE user_id = ${userId} AND jasoseo_free_unlock_used = FALSE
    RETURNING jasoseo_free_unlock_used
  `);
  const claimedFree = (freeClaimResult.rows ?? []).length > 0;

  // Fix 3: Claude 호출을 먼저 수행하고, 성공 후에만 크레딧을 차감한다.
  // Claude가 실패하면 크레딧 소실 없이 500을 반환.
  // 무료를 선점한 경우(claimedFree=true)에는 차감 자체가 불필요.

  const sections = analysis.sections as Array<{
    questionTitle: string;
    originalText: string;
    score: number;
    strength: string;
    weaknesses: Array<{ title: string }>;
  }>;

  const userMessage = `[자기소개서]\n${analysis.resumeText}\n\n[분석된 문항 목록]\n${JSON.stringify(
    sections.map((s) => ({
      questionTitle: s.questionTitle,
      weaknesses: s.weaknesses.map((w) => w.title),
    }))
  )}\n\n위 자기소개서의 각 문항별 약점에 대해 상세 분석, 꼬리질문, 수정본을 생성하세요.`;

  try {
    const message = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 4000,
      system: [
        {
          type: "text",
          text: UNLOCK_SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: userMessage }],
    });

    const text = extractText(message);
    const result = parseJsonFromText<{
      sections: Array<{
        questionTitle: string;
        weaknesses: Array<{
          title: string;
          detail: string;
          interviewQuestion: string;
        }>;
        revisedText: string;
      }>;
    }>(text);

    if (!Array.isArray(result.sections)) {
      throw new Error("Invalid unlock response structure");
    }

    // Claude 성공 — 이제 유료 사용자는 크레딧 차감
    if (!claimedFree) {
      const balance = await consumeCredits(
        userId,
        CREDIT_COSTS.resumeAnalysisUnlock
      );
      if (!balance) {
        return NextResponse.json(
          { error: "insufficient_credits" },
          { status: 402 }
        );
      }
    }

    await db
      .update(resumeAnalyses)
      .set({
        unlockedSections: result.sections,
        unlockedAt: new Date(),
      })
      .where(eq(resumeAnalyses.id, analysisId));

    const balance = await getBalance(userId);

    return NextResponse.json({
      sections: result.sections,
      balance,
    });
  } catch (err) {
    // Claude 실패 시 — 무료 플래그를 선점했다면 롤백
    if (claimedFree) {
      await db.execute(sql`
        UPDATE ${credits}
        SET jasoseo_free_unlock_used = FALSE, updated_at = NOW()
        WHERE user_id = ${userId}
      `).catch(() => {});
    }

    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[analyze-resume/unlock]", msg);
    captureServerError("analyze-resume-unlock", err, { userId, analysisId });
    return NextResponse.json(
      { error: "상세 분석 생성에 실패했습니다", detail: msg },
      { status: 500 }
    );
  }
}

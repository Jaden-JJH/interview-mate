// 현재 유저의 면접 히스토리 목록(최대 50건)을 최신순으로 조회하는 API 라우트
import { NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { interviewHistory } from "@/lib/db/schema";
import { getOrCreateAppUserId } from "@/lib/db/users";
import { isGuestMode } from "@/lib/guest";

export async function GET() {
  if (isGuestMode()) {
    return NextResponse.json({ items: [] });
  }
  const userId = await getOrCreateAppUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await db
    .select({
      id: interviewHistory.id,
      personaId: interviewHistory.personaId,
      durationMinutes: interviewHistory.durationMinutes,
      startedAt: interviewHistory.startedAt,
      endedAt: interviewHistory.endedAt,
      overallScore: interviewHistory.overallScore,
    })
    .from(interviewHistory)
    .where(eq(interviewHistory.userId, userId))
    .orderBy(desc(interviewHistory.startedAt))
    .limit(50);

  return NextResponse.json({ items: rows });
}

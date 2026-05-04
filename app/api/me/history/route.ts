import { NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { interviewHistory } from "@/lib/db/schema";
import { getOrCreateAppUserId } from "@/lib/db/users";

export async function GET() {
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

// 특정 면접 히스토리 상세 내역을 조회하는 API 라우트 (본인 소유 검증 포함)
import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { interviewHistory } from "@/lib/db/schema";
import { getOrCreateAppUserId } from "@/lib/db/users";
import { isGuestMode } from "@/lib/guest";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  if (isGuestMode()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const userId = await getOrCreateAppUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await db
    .select()
    .from(interviewHistory)
    .where(
      and(
        eq(interviewHistory.id, params.id),
        eq(interviewHistory.userId, userId)
      )
    )
    .limit(1);

  if (rows.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ item: rows[0] });
}

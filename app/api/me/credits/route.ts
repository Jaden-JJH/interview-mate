// 현재 로그인 유저의 크레딧 잔액(무료/유료) + 자소서 무료 unlock 사용 여부를 조회하는 API 라우트
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getOrCreateAppUserId } from "@/lib/db/users";
import { getBalance } from "@/lib/db/credits";
import { isGuestMode } from "@/lib/guest";
import { db } from "@/lib/db";
import { credits } from "@/lib/db/schema";

export async function GET() {
  if (isGuestMode()) {
    return NextResponse.json({
      free: 999,
      paid: 0,
      jasoseoFreeUnlockUsed: false,
    });
  }
  const userId = await getOrCreateAppUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const balance = await getBalance(userId);

  const rows = await db
    .select({ jasoseoFreeUnlockUsed: credits.jasoseoFreeUnlockUsed })
    .from(credits)
    .where(eq(credits.userId, userId))
    .limit(1);
  const jasoseoFreeUnlockUsed = rows[0]?.jasoseoFreeUnlockUsed ?? false;

  return NextResponse.json({ ...balance, jasoseoFreeUnlockUsed });
}

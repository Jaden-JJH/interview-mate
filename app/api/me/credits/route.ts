// 현재 로그인 유저의 크레딧 잔액(무료/유료)을 조회하는 API 라우트
import { NextResponse } from "next/server";
import { getOrCreateAppUserId } from "@/lib/db/users";
import { getBalance } from "@/lib/db/credits";
import { isGuestMode } from "@/lib/guest";

export async function GET() {
  if (isGuestMode()) {
    return NextResponse.json({ free: 999, paid: 0 });
  }
  const userId = await getOrCreateAppUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const balance = await getBalance(userId);
  return NextResponse.json(balance);
}

import { NextResponse } from "next/server";
import { getOrCreateAppUserId } from "@/lib/db/users";
import { getBalance } from "@/lib/db/credits";

export async function GET() {
  const userId = await getOrCreateAppUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const balance = await getBalance(userId);
  return NextResponse.json(balance);
}

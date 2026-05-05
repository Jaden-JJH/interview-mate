import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { clerkClient } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { isGuestMode } from "@/lib/guest";
import { captureServerError } from "@/lib/posthog-server";

export const runtime = "nodejs";

export async function DELETE() {
  if (isGuestMode()) {
    return NextResponse.json({ error: "Guest mode" }, { status: 403 });
  }

  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // DB 삭제 먼저 — cascade가 credits / savedResumes / interviewHistory / transactions 전부 처리
    await db.delete(users).where(eq(users.clerkUserId, clerkUserId));

    // Clerk 계정 삭제 — 세션도 함께 무효화됨
    const clerk = await clerkClient();
    await clerk.users.deleteUser(clerkUserId);

    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[delete-account]", msg);
    captureServerError("delete-account", err, { clerkUserId });
    return NextResponse.json(
      { error: "탈퇴 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

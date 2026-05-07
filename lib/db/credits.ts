import { eq, sql } from "drizzle-orm";
import { db } from "./index";
import { credits } from "./schema";

export interface CreditBalance {
  free: number;
  paid: number;
  total: number;
}

export async function getBalance(userId: string): Promise<CreditBalance> {
  const rows = await db
    .select({
      free: credits.freeRemaining,
      paid: credits.paidRemaining,
    })
    .from(credits)
    .where(eq(credits.userId, userId))
    .limit(1);
  const r = rows[0] ?? { free: 0, paid: 0 };
  return { free: r.free, paid: r.paid, total: r.free + r.paid };
}

// Atomically consumes one credit (free first, then paid). Returns the new
// balance on success or null when the user is out of credits.
//
// The single UPDATE statement is its own transaction in Postgres, and the
// WHERE clause on (free OR paid > 0) guarantees we never go negative even
// under concurrent requests — Postgres serializes row updates behind the
// row lock that UPDATE acquires.
// AI 도움받기 사용 권한 검증.
// - paidRemaining > 0  → "unlimited" (사용 기록 남기지 않음)
// - aiAssistUsed=false → "consumed"  (단일 UPDATE로 atomic 마킹)
// - 그 외             → null        (소진/거부)
//
// 무료 사용을 atomic UPDATE의 WHERE 절로 막아 두 요청이 동시에 무료 1회를
// 소비하는 경쟁 상태를 방지한다.
export async function claimAiAssist(
  userId: string
): Promise<"unlimited" | "consumed" | null> {
  const rows = await db
    .select({
      paid: credits.paidRemaining,
      used: credits.aiAssistUsed,
    })
    .from(credits)
    .where(eq(credits.userId, userId))
    .limit(1);
  if (rows.length === 0) return null;
  const { paid, used } = rows[0];
  if (paid > 0) return "unlimited";
  if (used) return null;

  const result = await db.execute(sql`
    UPDATE ${credits}
    SET ai_assist_used = TRUE, updated_at = NOW()
    WHERE user_id = ${userId} AND ai_assist_used = FALSE
    RETURNING ai_assist_used
  `);
  const updated = (result.rows ?? []).length > 0;
  return updated ? "consumed" : null;
}

export async function consumeCredit(
  userId: string
): Promise<CreditBalance | null> {
  const result = await db.execute(sql`
    UPDATE ${credits}
    SET
      free_remaining = CASE
        WHEN free_remaining > 0 THEN free_remaining - 1
        ELSE free_remaining
      END,
      paid_remaining = CASE
        WHEN free_remaining = 0 AND paid_remaining > 0 THEN paid_remaining - 1
        ELSE paid_remaining
      END,
      total_used = total_used + 1,
      updated_at = NOW()
    WHERE user_id = ${userId}
      AND (free_remaining > 0 OR paid_remaining > 0)
    RETURNING free_remaining, paid_remaining
  `);
  const rows = result.rows ?? [];
  if (rows.length === 0) return null;
  const row = rows[0] as { free_remaining: number; paid_remaining: number };
  return {
    free: row.free_remaining,
    paid: row.paid_remaining,
    total: row.free_remaining + row.paid_remaining,
  };
}


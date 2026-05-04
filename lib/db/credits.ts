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


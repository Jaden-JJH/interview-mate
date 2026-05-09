// Paddle webhook 누락으로 지급되지 않은 크레딧을 수동으로 보정하는 스크립트
/**
 * 한 유저에 대해 Paddle webhook 누락분을 수동 보정.
 *
 * - Paddle API에서 customData.clerkUserId 매칭되는 completed 트랜잭션 조회
 * - transactions 테이블에 없는 건만 INSERT
 * - 새로 INSERT된 건수 × CREDITS_PER_PACKAGE 만큼 paid_remaining 증가
 *
 * 사용: npx tsx scripts/recover-credits.ts <email>
 */
import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { Environment, Paddle } from "@paddle/paddle-node-sdk";

const CREDITS_PER_PACKAGE = 8;

async function main() {
  config({ path: ".env.local" });
  config({ path: ".env" });

  const email = process.argv[2];
  if (!email) {
    console.error("Usage: npx tsx scripts/recover-credits.ts <email>");
    process.exit(1);
  }

  const dbUrl =
    process.env.DATABASE_URL ?? process.env.interview_mate_DATABASE_URL;
  const apiKey = process.env.PADDLE_API_KEY;
  if (!dbUrl || !apiKey) {
    console.error("Missing DATABASE_URL or PADDLE_API_KEY");
    process.exit(1);
  }

  const sql = neon(dbUrl);
  const paddle = new Paddle(apiKey, { environment: Environment.production });

  const u = await sql`
    SELECT id, clerk_user_id FROM users WHERE email = ${email}
  `;
  if (u.length === 0) {
    console.error(`user not found: ${email}`);
    process.exit(1);
  }
  const userId = u[0].id as string;
  const clerkUserId = u[0].clerk_user_id as string;
  console.log(`user: ${userId} (${clerkUserId})`);

  const completed: Array<{ id: string; total: number; currency: string }> = [];
  let scanned = 0;
  for await (const txn of paddle.transactions.list()) {
    const cd = txn.customData as { clerkUserId?: string } | null;
    if (cd?.clerkUserId === clerkUserId && txn.status === "completed") {
      const total = Number.parseInt(
        String(txn.details?.totals?.total ?? "0"),
        10
      );
      const currency = String(txn.details?.totals?.currencyCode ?? "KRW");
      completed.push({ id: txn.id, total, currency });
    }
    scanned++;
    if (scanned >= 500) break;
  }
  console.log(`paddle: scanned ${scanned}, completed for user: ${completed.length}`);

  if (completed.length === 0) {
    console.log("no completed transactions to recover");
    return;
  }

  const ids = completed.map((c) => c.id);
  const existing = await sql`
    SELECT paddle_transaction_id FROM transactions
    WHERE paddle_transaction_id = ANY(${ids})
  `;
  const existingIds = new Set(
    existing.map((r) => r.paddle_transaction_id as string)
  );
  const missing = completed.filter((c) => !existingIds.has(c.id));
  console.log(`already in DB: ${existingIds.size}, missing: ${missing.length}`);

  if (missing.length === 0) {
    console.log("nothing to recover");
    return;
  }

  for (const m of missing) {
    await sql`
      INSERT INTO transactions (user_id, paddle_transaction_id, amount, currency, status)
      VALUES (${userId}, ${m.id}, ${m.total}, ${m.currency}, 'completed')
      ON CONFLICT (paddle_transaction_id) DO NOTHING
    `;
  }

  const credit = missing.length * CREDITS_PER_PACKAGE;
  await sql`
    UPDATE credits
    SET paid_remaining = paid_remaining + ${credit}, updated_at = NOW()
    WHERE user_id = ${userId}
  `;

  const after = await sql`SELECT * FROM credits WHERE user_id = ${userId}`;
  console.log(`+${credit} credits applied`);
  console.log("credits after:", after);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

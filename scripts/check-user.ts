import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";

async function main() {
  config({ path: ".env.local" });
  config({ path: ".env" });
  const url =
    process.env.DATABASE_URL ?? process.env.interview_mate_DATABASE_URL;
  if (!url) {
    console.error("Missing DATABASE_URL");
    process.exit(1);
  }
  const sql = neon(url);

  const email = process.argv[2] ?? "interviewmate2026@gmail.com";
  const u = await sql`
    SELECT id, clerk_user_id, email, created_at
    FROM users WHERE email = ${email}
  `;
  console.log("user:", u);
  if (u.length === 0) return;
  const userId = u[0].id as string;

  const c = await sql`SELECT * FROM credits WHERE user_id = ${userId}`;
  console.log("credits:", c);

  const t = await sql`
    SELECT id, paddle_transaction_id, amount, currency, status, created_at
    FROM transactions WHERE user_id = ${userId}
    ORDER BY created_at DESC
  `;
  console.log("transactions:", t);

  const w = await sql`
    SELECT * FROM processed_webhooks
    ORDER BY processed_at DESC LIMIT 20
  `;
  console.log("recent processed_webhooks:", w);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

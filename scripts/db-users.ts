// DB에 저장된 전체 유저 목록을 조회해 출력하는 스크립트
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
  const users = await sql`
    SELECT id, clerk_user_id, email, created_at
    FROM users ORDER BY created_at DESC LIMIT 5
  `;
  const credits = await sql`
    SELECT user_id, free_remaining, paid_remaining, total_used
    FROM credits ORDER BY updated_at DESC LIMIT 5
  `;
  console.log("users:", users);
  console.log("credits:", credits);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

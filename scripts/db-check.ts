// DB 연결과 테이블 존재 여부를 확인하는 헬스체크 스크립트
import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";

config({ path: ".env.local" });
config({ path: ".env" });

async function main() {
  const url =
    process.env.DATABASE_URL ?? process.env.interview_mate_DATABASE_URL;
  if (!url) {
    console.error(
      "Missing DATABASE_URL (or interview_mate_DATABASE_URL) in .env.local"
    );
    process.exit(1);
  }

  const sql = neon(url);
  const rows = await sql`SELECT 1 AS ok`;
  console.log("DB roundtrip:", rows);

  const tables = await sql`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name
  `;
  console.log(
    "Public tables:",
    tables.map((r) => r.table_name)
  );
}

main().catch((err) => {
  console.error("DB check failed:", err);
  process.exit(1);
});

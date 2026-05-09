import { db, type QueueRow } from "../lib/db.js";

const rows = db
  .prepare<[], QueueRow>(
    `SELECT * FROM content_queue ORDER BY scheduled_at DESC LIMIT 20`,
  )
  .all();

if (rows.length === 0) {
  console.log("(큐 비어있음)");
  process.exit(0);
}

const counts = db
  .prepare<[], { status: string; n: number }>(
    `SELECT status, COUNT(*) as n FROM content_queue GROUP BY status`,
  )
  .all();

console.log("상태별 합계:", counts.map((c) => `${c.status}=${c.n}`).join(", "));
console.log();
console.log("최근 20건:");

for (const r of rows) {
  const preview = r.text.replace(/\n/g, " ").slice(0, 50);
  console.log(
    `  [${r.id}] ${r.status.padEnd(10)} ${r.account.padEnd(6)} ${r.scheduled_at.slice(0, 16)} | ${preview}${r.text.length > 50 ? "…" : ""}`,
  );
  if (r.last_error) console.log(`         ⚠ ${r.last_error}`);
}

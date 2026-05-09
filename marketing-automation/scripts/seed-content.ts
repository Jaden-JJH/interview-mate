/**
 * 테스트용 시드 — 큐에 콘텐츠 1건을 1분 뒤 발행 예정으로 박아넣음.
 *
 * 실행: pnpm --dir marketing-automation seed
 *      또는 npm --prefix marketing-automation run seed
 */
import { db } from "../lib/db.js";

const oneMinuteLater = new Date(Date.now() + 60_000).toISOString();

const text = `🛠 콘텐츠 큐 시드 테스트

이 글은 자동화 큐에서 꺼내 발행한 첫 콘텐츠입니다.
publisher 에이전트가 의도대로 동작하는지 확인 중.

interview-mate.com`;

const result = db
  .prepare(
    `INSERT INTO content_queue
      (account, channel, text, topic, format, has_link, utm_campaign, scheduled_at)
     VALUES
      (?, ?, ?, ?, ?, ?, ?, ?)`,
  )
  .run(
    "main",
    "threads",
    text,
    "system-test",
    "story",
    1,
    "main_seed_test",
    oneMinuteLater,
  );

console.log(`✓ 큐에 시드 추가: id=${result.lastInsertRowid}`);
console.log(`  scheduled_at: ${oneMinuteLater}`);
console.log(`\n다음 단계:`);
console.log(`  1) 1분 대기`);
console.log(`  2) npm --prefix marketing-automation run publish`);

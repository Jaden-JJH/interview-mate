// 소스 기사 수집 스크립트 — fetchAllArticles() → source_articles DB 저장

import "../lib/env.js";
import { fetchAllArticles } from "../sources/index.js";
import { db } from "../lib/db.js";

async function main() {
  console.log("📡 소스 수집 시작:", new Date().toISOString());

  const articles = await fetchAllArticles();
  console.log(`  수집된 기사 총 ${articles.length}건`);

  const insert = db.prepare(`
    INSERT OR IGNORE INTO source_articles (source, url, title, content, dedup_hash, lang, fetched_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const insertMany = db.transaction((rows: typeof articles) => {
    let saved = 0;
    for (const a of rows) {
      const result = insert.run(
        a.source,
        a.url,
        a.title,
        a.content ?? null,
        a.dedup_hash,
        a.lang,
        a.publishedAt.toISOString()
      );
      if (result.changes > 0) saved++;
    }
    return saved;
  });

  const saved = insertMany(articles);
  console.log(`  ✓ 신규 저장: ${saved}건 (중복 제외)`);

  const total = (db.prepare("SELECT COUNT(*) as cnt FROM source_articles").get() as { cnt: number }).cnt;
  console.log(`  DB 총 source_articles: ${total}건`);
}

main().catch((e) => {
  console.error("수집 오류:", e);
  process.exit(1);
});

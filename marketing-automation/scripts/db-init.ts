import { readdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { db } from "../lib/db.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

// 1. 베이스 스키마 적용
const schemaPath = resolve(__dirname, "../db/schema.sql");
db.exec(readFileSync(schemaPath, "utf8"));

// 2. 마이그레이션 — duplicate column 등 이미 적용된 변경은 무시
const migrationsDir = resolve(__dirname, "../db/migrations");
const migrations = readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort();
for (const m of migrations) {
  const sql = readFileSync(resolve(migrationsDir, m), "utf8");
  try {
    db.exec(sql);
    console.log(`  ✓ migration: ${m}`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("duplicate column") || msg.includes("already exists")) {
      console.log(`  · migration skip (already applied): ${m}`);
    } else {
      throw e;
    }
  }
}

const tables = db
  .prepare(`SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`)
  .all() as { name: string }[];

console.log("✓ DB 초기화 완료");
console.log("  테이블:", tables.map((t) => t.name).join(", "));

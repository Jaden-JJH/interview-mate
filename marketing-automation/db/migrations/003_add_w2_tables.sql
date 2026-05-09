-- W2: master_contents / content_variants / dedup_index 테이블 추가
-- 기존 content_queue 건드리지 않음. 양립 운영 후 W8 이후 통합 예정.

CREATE TABLE IF NOT EXISTS master_contents (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  source_ids TEXT NOT NULL,                   -- JSON array of source_articles.id
  topic_slug TEXT NOT NULL,
  headline   TEXT NOT NULL,
  body       TEXT NOT NULL,                   -- 800-1200자 dense article
  keywords   TEXT,                            -- JSON array
  status     TEXT NOT NULL DEFAULT 'draft',   -- draft | approved | failed
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_master_contents_status
  ON master_contents (status, created_at DESC);

CREATE TABLE IF NOT EXISTS content_variants (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  master_id     INTEGER NOT NULL REFERENCES master_contents(id),
  channel       TEXT NOT NULL,                -- 'threads' | 'instagram' | 'blog'
  variant_index INTEGER NOT NULL DEFAULT 0,  -- Threads: 편 번호(0-based). IG: 0.
  text          TEXT NOT NULL,               -- 본문 (threads) 또는 caption (instagram)
  media_spec    TEXT,                        -- JSON (IG 카드 스펙). Threads: NULL.
  has_cta       INTEGER NOT NULL DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'draft', -- draft | approved | queued | published | failed
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_content_variants_master
  ON content_variants (master_id, channel);
CREATE INDEX IF NOT EXISTS idx_content_variants_status
  ON content_variants (status, created_at DESC);

CREATE TABLE IF NOT EXISTS dedup_index (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  topic_slug TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL               -- ISO8601, 24h 후 만료
);

CREATE INDEX IF NOT EXISTS idx_dedup_expires ON dedup_index (expires_at);

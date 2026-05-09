-- 인터뷰메이트 마케팅 자동화 — SQLite 스키마
-- 단순화 원칙: ORM 없음. raw SQL + better-sqlite3.

CREATE TABLE IF NOT EXISTS content_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account TEXT NOT NULL,                  -- 'main' | 'alex' | 'jiyun' | 'kevin'
  channel TEXT NOT NULL DEFAULT 'threads',-- 'threads' | 'instagram'
  text TEXT NOT NULL,                     -- threads=본문, instagram=caption
  media_url TEXT,                         -- IG 발행 시 필수. 공개 HTTPS URL.
  topic TEXT,                             -- 콘텐츠 주제 슬러그 (성과 분석용)
  format TEXT,                            -- 'oneliner' | 'cardnews' | 'story' | 'cta'
  has_link INTEGER NOT NULL DEFAULT 0,    -- 본문에 링크 포함 여부 (0/1)
  utm_campaign TEXT,                      -- UTM 추적용
  scheduled_at TEXT NOT NULL,             -- ISO8601, 발행 예정 시각
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'publishing' | 'published' | 'failed' | 'skipped'
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT
);

CREATE INDEX IF NOT EXISTS idx_queue_due
  ON content_queue (status, scheduled_at)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_queue_account
  ON content_queue (account, scheduled_at);

CREATE TABLE IF NOT EXISTS published_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  queue_id INTEGER NOT NULL REFERENCES content_queue(id),
  account TEXT NOT NULL,
  channel TEXT NOT NULL,
  platform_media_id TEXT NOT NULL,        -- Threads media_id
  permalink TEXT,
  published_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_published_account ON published_log (account, published_at DESC);

-- Phase 4 학습 루프용 — 발행 후 N일 시점에 성과 적재
CREATE TABLE IF NOT EXISTS content_performance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  published_id INTEGER NOT NULL REFERENCES published_log(id),
  measured_at TEXT NOT NULL,
  views INTEGER,
  likes INTEGER,
  replies INTEGER,
  reposts INTEGER,
  link_clicks INTEGER,                    -- PostHog UTM 매칭으로 보강
  signups INTEGER,                        -- UTM 캠페인별 가입 수
  UNIQUE (published_id, measured_at)
);

-- 토큰/계정 메타 (account별 토큰을 env가 아닌 DB에 두면 Phase 2 다계정 운영이 깔끔)
CREATE TABLE IF NOT EXISTS account_credentials (
  account TEXT PRIMARY KEY,               -- 'main' | 'alex' | ...
  channel TEXT NOT NULL,                  -- 'threads' | 'instagram'
  platform_user_id TEXT NOT NULL,
  access_token TEXT NOT NULL,
  token_expires_at TEXT,                  -- ISO8601, NULL이면 무기한
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

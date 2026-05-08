-- 002_add_source_articles.sql
-- W1: 한국어 소스 수집 파이프라인용 source_articles 테이블 추가
-- db-init.ts의 migration 자동 적용 루프에 의해 한 번만 실행됨.
-- CREATE TABLE IF NOT EXISTS + UNIQUE constraint로 중복 적용 안전.

CREATE TABLE IF NOT EXISTS source_articles (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  source     TEXT NOT NULL,               -- 소스 식별자 (e.g. 'naver-news-면접', 'youtube-캐치TV')
  url        TEXT NOT NULL,               -- 원문 URL
  title      TEXT NOT NULL,               -- 기사/영상 제목
  content    TEXT,                        -- 본문 요약 또는 전문 (NULL 허용)
  dedup_hash TEXT UNIQUE NOT NULL,        -- SHA-256(url+title) — 중복 수집 방지
  lang       TEXT NOT NULL DEFAULT 'ko',  -- 'ko' | 'en'
  fetched_at DATETIME NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_source_articles_hash    ON source_articles (dedup_hash);
CREATE INDEX IF NOT EXISTS idx_source_articles_fetched ON source_articles (fetched_at);
CREATE INDEX IF NOT EXISTS idx_source_articles_source  ON source_articles (source, fetched_at DESC);

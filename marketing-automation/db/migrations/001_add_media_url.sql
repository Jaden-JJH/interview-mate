-- 2026-05-09: IG 발행 지원 — content_queue에 media_url 컬럼 추가
-- 기존 SQLite는 IF NOT EXISTS 컬럼 추가 미지원이라, ALTER TABLE 실패는 sqlite_master 검사로 회피.

-- 적용 방식: scripts/db-init.ts가 schema.sql 적용 후 이 파일도 실행하도록 갱신.
-- 이미 컬럼이 있으면 ALTER TABLE이 에러 → catch해서 무시.

ALTER TABLE content_queue ADD COLUMN media_url TEXT;

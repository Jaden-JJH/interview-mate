#!/bin/bash
# launchd cron — SQLite 일일 백업 (14일 retention)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
DATA_DIR="$PROJECT_DIR/data"
BACKUP_DIR="$DATA_DIR/backups"
DB_FILE="$DATA_DIR/queue.sqlite"
LOG_DIR="$DATA_DIR/logs"

mkdir -p "$BACKUP_DIR" "$LOG_DIR"

LOG_FILE="$LOG_DIR/backup.log"
TODAY=$(date '+%Y-%m-%d')
BACKUP_FILE="$BACKUP_DIR/queue-${TODAY}.sqlite"

{
  echo "--- $(date '+%Y-%m-%d %H:%M:%S') backup start ---"

  if [ ! -f "$DB_FILE" ]; then
    echo "  ERROR: DB 파일 없음: $DB_FILE"
    exit 1
  fi

  # WAL checkpoint — 백업 전 WAL 내용을 메인 DB에 반영
  sqlite3 "$DB_FILE" "PRAGMA wal_checkpoint(TRUNCATE);" 2>/dev/null || true

  # 백업 (sqlite3 .backup 이 가장 안전)
  sqlite3 "$DB_FILE" ".backup '$BACKUP_FILE'"
  BACKUP_SIZE=$(stat -f%z "$BACKUP_FILE" 2>/dev/null || echo "?")
  echo "  ✓ 백업 완료: $BACKUP_FILE ($BACKUP_SIZE bytes)"

  # 14일 이전 백업 삭제
  DELETED=0
  for old in "$BACKUP_DIR"/queue-*.sqlite; do
    [ -f "$old" ] || continue
    FILE_DATE=$(basename "$old" | sed 's/queue-\(.*\)\.sqlite/\1/')
    if [ "$(date -j -f '%Y-%m-%d' "$FILE_DATE" '+%s' 2>/dev/null)" ] && \
       [ "$(date -j -f '%Y-%m-%d' "$FILE_DATE" '+%s')" -lt "$(date -j -v-14d '+%s')" ]; then
      rm "$old"
      DELETED=$((DELETED + 1))
    fi
  done
  echo "  ✓ 오래된 백업 삭제: ${DELETED}건"

  # 현재 백업 현황
  TOTAL=$(ls "$BACKUP_DIR"/queue-*.sqlite 2>/dev/null | wc -l | tr -d ' ')
  echo "  현재 백업 수: ${TOTAL}개"

  echo "--- $(date '+%Y-%m-%d %H:%M:%S') backup done ---"
} >> "$LOG_FILE" 2>&1

#!/bin/bash
# launchd cron — 큐에서 발행 시각 도래한 콘텐츠 전수 발행
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
LOG_DIR="$PROJECT_DIR/data/logs"
mkdir -p "$LOG_DIR"

LOG_FILE="$LOG_DIR/publisher.log"

{
  echo "--- $(date '+%Y-%m-%d %H:%M:%S') publisher start ---"
  cd "$PROJECT_DIR"
  /usr/local/bin/npx tsx scripts/run-publisher.ts --all 2>&1
  echo "--- $(date '+%Y-%m-%d %H:%M:%S') publisher done (exit=$?) ---"
} >> "$LOG_FILE" 2>&1

# 로그 100KB 초과 시 자르기
if [ -f "$LOG_FILE" ] && [ "$(stat -f%z "$LOG_FILE" 2>/dev/null || echo 0)" -gt 102400 ]; then
  tail -500 "$LOG_FILE" > "$LOG_FILE.tmp" && mv "$LOG_FILE.tmp" "$LOG_FILE"
fi

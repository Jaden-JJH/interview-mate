#!/bin/bash
# launchd cron — 매일 1회: 소스 수집 → W2 파이프라인 (주제 선정 → Master → IG 변환 → Slack HITL)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
LOG_DIR="$PROJECT_DIR/data/logs"
mkdir -p "$LOG_DIR"

LOG_FILE="$LOG_DIR/pipeline.log"

{
  echo "=== $(date '+%Y-%m-%d %H:%M:%S') daily pipeline start ==="

  cd "$PROJECT_DIR"

  echo "[1/2] collect-sources"
  /usr/local/bin/npx tsx scripts/collect-sources.ts 2>&1

  echo "[2/2] run-pipeline"
  /usr/local/bin/npx tsx scripts/run-pipeline.ts 2>&1

  echo "=== $(date '+%Y-%m-%d %H:%M:%S') daily pipeline done ==="
} >> "$LOG_FILE" 2>&1

# 로그 500KB 초과 시 자르기
if [ -f "$LOG_FILE" ] && [ "$(stat -f%z "$LOG_FILE" 2>/dev/null || echo 0)" -gt 512000 ]; then
  tail -1000 "$LOG_FILE" > "$LOG_FILE.tmp" && mv "$LOG_FILE.tmp" "$LOG_FILE"
fi

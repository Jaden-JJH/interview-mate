#!/bin/bash
# Mac Mini 자동화 인프라 일괄 세팅
# 이 스크립트를 marketing-automation/ 디렉토리에서 실행:
#   chmod +x scripts/setup-macmini.sh && ./scripts/setup-macmini.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
LAUNCH_AGENTS_DIR="$HOME/Library/LaunchAgents"

echo "╔══════════════════════════════════════════════╗"
echo "║  인터뷰메이트 Mac Mini 자동화 세팅           ║"
echo "╚══════════════════════════════════════════════╝"
echo ""
echo "프로젝트 경로: $PROJECT_DIR"
echo ""

# ─── 0. 사전 체크 ────────────────────────────────────────
echo "[0] 사전 체크..."

if [ ! -f "$PROJECT_DIR/package.json" ]; then
  echo "  ERROR: marketing-automation/package.json 없음. 올바른 디렉토리에서 실행하세요."
  exit 1
fi

if [ ! -f "$PROJECT_DIR/data/queue.sqlite" ]; then
  echo "  WARNING: data/queue.sqlite 없음. db:init 먼저 실행하세요: npm run db:init"
fi

if ! command -v sqlite3 &>/dev/null; then
  echo "  ERROR: sqlite3 명령어 없음. macOS 기본 포함이므로 이상함."
  exit 1
fi

# npx 경로 확인 (launchd는 PATH가 제한적이라 절대 경로 필요)
NPX_PATH=$(which npx 2>/dev/null || echo "")
if [ -z "$NPX_PATH" ]; then
  echo "  ERROR: npx 없음. Node.js 설치 확인."
  exit 1
fi
echo "  npx 경로: $NPX_PATH"

# node 경로도 확인
NODE_PATH=$(which node 2>/dev/null || echo "")
echo "  node 경로: $NODE_PATH"
echo "  node 버전: $(node --version 2>/dev/null || echo 'N/A')"
echo ""

# ─── 1. 스크립트 실행 권한 ──────────────────────────────
echo "[1] 스크립트 실행 권한 설정..."
chmod +x "$SCRIPT_DIR/cron-publisher.sh"
chmod +x "$SCRIPT_DIR/cron-pipeline.sh"
chmod +x "$SCRIPT_DIR/sqlite-backup.sh"
echo "  ✓ 3개 스크립트 chmod +x 완료"
echo ""

# ─── 2. 로그·백업 디렉토리 생성 ─────────────────────────
echo "[2] 디렉토리 생성..."
mkdir -p "$PROJECT_DIR/data/logs"
mkdir -p "$PROJECT_DIR/data/backups"
echo "  ✓ data/logs, data/backups 생성"
echo ""

# ─── 3. npx 경로를 스크립트에 패치 ──────────────────────
echo "[3] cron 스크립트에 npx 절대 경로 패치..."
# launchd 환경에선 /usr/local/bin이 PATH에 없을 수 있음
# 실제 npx 위치로 교체
for script in cron-publisher.sh cron-pipeline.sh; do
  sed -i '' "s|/usr/local/bin/npx|$NPX_PATH|g" "$SCRIPT_DIR/$script"
  echo "  ✓ $script → $NPX_PATH"
done
echo ""

# ─── 4. launchd plist 생성·설치 ─────────────────────────
echo "[4] launchd plist 생성..."
mkdir -p "$LAUNCH_AGENTS_DIR"

# 기존 plist 언로드 (이미 있으면)
for label in com.interviewmate.publisher com.interviewmate.pipeline com.interviewmate.sqlite-backup; do
  if launchctl list "$label" &>/dev/null; then
    echo "  기존 $label 언로드..."
    launchctl bootout "gui/$(id -u)/$label" 2>/dev/null || true
  fi
done

# Publisher — 10분마다
cat > "$LAUNCH_AGENTS_DIR/com.interviewmate.publisher.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.interviewmate.publisher</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>${PROJECT_DIR}/scripts/cron-publisher.sh</string>
  </array>
  <key>StartInterval</key>
  <integer>600</integer>
  <key>WorkingDirectory</key>
  <string>${PROJECT_DIR}</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>$(dirname "$NPX_PATH"):$(dirname "$NODE_PATH"):/usr/local/bin:/usr/bin:/bin</string>
    <key>HOME</key>
    <string>${HOME}</string>
  </dict>
  <key>StandardOutPath</key>
  <string>${PROJECT_DIR}/data/logs/publisher-launchd.log</string>
  <key>StandardErrorPath</key>
  <string>${PROJECT_DIR}/data/logs/publisher-launchd-err.log</string>
  <key>RunAtLoad</key>
  <false/>
</dict>
</plist>
PLIST
echo "  ✓ com.interviewmate.publisher.plist (10분 간격)"

# Pipeline — 매일 07:00
cat > "$LAUNCH_AGENTS_DIR/com.interviewmate.pipeline.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.interviewmate.pipeline</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>${PROJECT_DIR}/scripts/cron-pipeline.sh</string>
  </array>
  <key>StartCalendarInterval</key>
  <dict>
    <key>Hour</key>
    <integer>7</integer>
    <key>Minute</key>
    <integer>0</integer>
  </dict>
  <key>WorkingDirectory</key>
  <string>${PROJECT_DIR}</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>$(dirname "$NPX_PATH"):$(dirname "$NODE_PATH"):/usr/local/bin:/usr/bin:/bin</string>
    <key>HOME</key>
    <string>${HOME}</string>
  </dict>
  <key>StandardOutPath</key>
  <string>${PROJECT_DIR}/data/logs/pipeline-launchd.log</string>
  <key>StandardErrorPath</key>
  <string>${PROJECT_DIR}/data/logs/pipeline-launchd-err.log</string>
  <key>RunAtLoad</key>
  <false/>
</dict>
</plist>
PLIST
echo "  ✓ com.interviewmate.pipeline.plist (매일 07:00)"

# SQLite 백업 — 매일 03:00
cat > "$LAUNCH_AGENTS_DIR/com.interviewmate.sqlite-backup.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.interviewmate.sqlite-backup</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>${PROJECT_DIR}/scripts/sqlite-backup.sh</string>
  </array>
  <key>StartCalendarInterval</key>
  <dict>
    <key>Hour</key>
    <integer>3</integer>
    <key>Minute</key>
    <integer>0</integer>
  </dict>
  <key>WorkingDirectory</key>
  <string>${PROJECT_DIR}</string>
  <key>StandardOutPath</key>
  <string>${PROJECT_DIR}/data/logs/backup-launchd.log</string>
  <key>StandardErrorPath</key>
  <string>${PROJECT_DIR}/data/logs/backup-launchd-err.log</string>
  <key>RunAtLoad</key>
  <false/>
</dict>
</plist>
PLIST
echo "  ✓ com.interviewmate.sqlite-backup.plist (매일 03:00)"
echo ""

# ─── 5. launchd 로드 ────────────────────────────────────
echo "[5] launchd 에이전트 로드..."
launchctl bootstrap "gui/$(id -u)" "$LAUNCH_AGENTS_DIR/com.interviewmate.publisher.plist"
launchctl bootstrap "gui/$(id -u)" "$LAUNCH_AGENTS_DIR/com.interviewmate.pipeline.plist"
launchctl bootstrap "gui/$(id -u)" "$LAUNCH_AGENTS_DIR/com.interviewmate.sqlite-backup.plist"
echo "  ✓ 3개 에이전트 로드 완료"
echo ""

# ─── 6. Sleep 비활성화 ──────────────────────────────────
echo "[6] Sleep 비활성화 확인..."
CURRENT_SLEEP=$(pmset -g | grep '^\s*sleep' | awk '{print $2}')
if [ "$CURRENT_SLEEP" != "0" ]; then
  echo "  현재 sleep 설정: ${CURRENT_SLEEP}분"
  echo "  sleep 비활성화를 위해 sudo 필요합니다:"
  echo ""
  echo "    sudo pmset -a sleep 0 displaysleep 10 disksleep 0"
  echo ""
  echo "  (디스플레이만 10분 후 꺼지고, 시스템은 깨어 있음)"
  echo "  직접 실행해주세요."
else
  echo "  ✓ sleep 이미 비활성화됨"
fi
echo ""

# ─── 7. 상태 확인 ───────────────────────────────────────
echo "[7] 등록 상태 확인..."
echo ""
for label in com.interviewmate.publisher com.interviewmate.pipeline com.interviewmate.sqlite-backup com.interviewmate.hitl-server; do
  STATUS=$(launchctl list "$label" 2>/dev/null && echo "✓ 등록됨" || echo "✗ 미등록")
  echo "  $label: $STATUS"
done
echo ""

echo "╔══════════════════════════════════════════════╗"
echo "║  세팅 완료!                                   ║"
echo "╠══════════════════════════════════════════════╣"
echo "║                                              ║"
echo "║  Publisher:  10분마다 큐 발행                 ║"
echo "║  Pipeline:   매일 07:00 수집+파이프라인       ║"
echo "║  Backup:     매일 03:00 SQLite 백업           ║"
echo "║  HITL:       기존 launchd 유지               ║"
echo "║                                              ║"
echo "║  로그:   data/logs/*.log                     ║"
echo "║  백업:   data/backups/queue-YYYY-MM-DD.sqlite ║"
echo "║                                              ║"
echo "║  수동 테스트:                                 ║"
echo "║    bash scripts/cron-publisher.sh            ║"
echo "║    bash scripts/cron-pipeline.sh             ║"
echo "║    bash scripts/sqlite-backup.sh             ║"
echo "║                                              ║"
echo "╚══════════════════════════════════════════════╝"

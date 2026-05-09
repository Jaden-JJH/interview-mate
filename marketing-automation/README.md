# marketing-automation — 인터뷰메이트 SNS 콘텐츠 팩토리

설계도 전체: `../docs/marketing-automation-plan.md`
사고 사례 / 절대 규칙: `~/.claude/projects/.../memory/feedback_critical_sns_automation.md`

이 워크스페이스는 메인 앱(`/app`)과 **격리** 운영. 자동화 실패가 메인 서비스로 전이되지 않도록.

---

## 운영 계정 (2026-05-09)

- **@intv_mate** Threads + Instagram (현재 운영)
- ~~@interview_mate Threads~~ — 2026-05-08 영구 비활성화 (사고. 재생성 불가)
- @interview_mate Instagram — 살아있지만 미사용 (legacy)

---

## 현재 단계

✅ **B-1. 어댑터 인프라 완료**
- Threads 발행 (`lib/threads.ts` — `publishText`)
- Instagram 발행 (`lib/instagram.ts` — `publishImage`, FB Graph 경유)
- Publisher 채널 분기 (threads/instagram, IG는 media_url 필수)
- SQLite 스키마 + migrations

⬜ **B-2. 카드뉴스 자동 생성** ← 다음 작업
⬜ **B-3. 가동 인프라** (맥미니 + cron)
⬜ **B-4. 콘텐츠 생산 라인** (트렌드 + 생성기 + 오픈클로)

---

## 환경변수 (루트 `.env.local`)

```
THREADS_LONG_TOKEN, THREADS_USER_ID, THREADS_APP_ID, THREADS_APP_SECRET
META_ACCESS_TOKEN, META_APP_ID, META_APP_SECRET
INSTAGRAM_ACCOUNT_ID  ← @intv_mate IG biz id (FB Graph 경유)
```

비활성 (옵션 B 미사용):
```
# INSTAGRAM_LONG_TOKEN_LEGACY (옛 @interview_mate IG, IG-only API)
# INSTAGRAM_BUSINESS_ID_LEGACY
```

---

## 명령어

```bash
cd marketing-automation
npm run db:init        # 스키마 + 마이그레이션 적용
npx tsx scripts/ping.ts # Threads + IG 어댑터 healthcheck
npm run seed           # 큐에 시드 1건 (단, 테스트 콘텐츠 메인 계정 발행 금지)
npm run publish        # publisher 1회 실행
npm run queue:list     # 큐 상태
```

루트에서:
```bash
npx tsx scripts/test-social-tokens.ts  # 모든 토큰 healthcheck
```

---

## 디렉토리

```
marketing-automation/
├── agents/
│   └── publisher.ts          # 채널 분기 (threads/instagram)
├── lib/
│   ├── db.ts                 # better-sqlite3 인스턴스
│   ├── env.ts                # 루트 .env.local 로딩
│   ├── threads.ts            # Threads Graph API
│   └── instagram.ts          # FB Graph 경유 IG (페이지 토큰 자동 캐시)
├── db/
│   ├── schema.sql
│   └── migrations/
│       └── 001_add_media_url.sql
├── scripts/
│   ├── db-init.ts            # 스키마 + migrations 자동 적용
│   ├── ping.ts               # 어댑터 healthcheck
│   ├── seed-content.ts
│   ├── run-publisher.ts
│   └── queue-list.ts
└── data/queue.sqlite         # gitignore
```

---

## 절대 지킬 것

1. **메인 계정에 자동화/봇/테스트 단어 발행 금지** — 사고로 Threads 영구 손실 사례 있음
2. 첫 실 콘텐츠는 사용자 검토 후 발행
3. 외부 플랫폼 정책은 WebSearch로 1차 검증, 추측 금지
4. 계정당 5~8개/일 빈도. 과도 발행은 알고리즘 패널티
5. CTA 링크는 4개 중 1개. 나머지는 bio 링크 유도

---

## 토큰 만료

- Threads `THREADS_LONG_TOKEN` — 60일 (갱신 필요)
- Meta user 토큰 `META_ACCESS_TOKEN` — `expires_at=0` 사실상 무기한, 단 `data_access_expires_at` 90일 비활성 시 만료
- 페이지 토큰 — 무기한 (META user 토큰에서 자동 추출, 캐시됨)

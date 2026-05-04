# 인터뷰메이트 인수인계 문서

> 작성: 2026-05-04
> 작성자: 진현빈 (jinhyb1313@gmail.com)
> 대상: 후속 개발 담당자

---

## 0. 시작 전 5분 — 이거부터 해주세요

1. 레포 루트의 **`CLAUDE.md` 전체 읽기** — 프로젝트 구조/플로우/주의사항 정리되어 있음
2. **현재 Preview URL에서 직접 면접 한 번 진행해보기**
   - URL: <배포 후 본인이 갱신>
   - 자기소개서 → 채용공고 → 페르소나/시간 선택 → 면접 → 결과
3. 본 문서 끝까지 한 번 읽기 (10분)

---

## 1. 추가할 4가지

| 영역 | 권장 스택 | 비고 |
|---|---|---|
| GitHub + 배포 | GitHub + Vercel Git 자동 연동 | PR마다 preview URL 자동 |
| 회원 | **Clerk** (`@clerk/nextjs`) | 10K MAU 무료, Next.js 드롭인 |
| DB | **Neon Postgres + Drizzle ORM** | 무료 tier, 자동 백업 |
| 결제 | **Paddle** (기존 vendor 계정 재사용) | 신규 Product/Website 등록 필요 |

> **결정 사항**: 위 스택은 fix입니다. 다른 거 쓰고 싶으면 시작 전 PO에게 의논.

---

## 2. 비즈니스 결정 사항 (이미 확정)

| 항목 | 값 |
|---|---|
| 가격 모델 | **패키지** (구독 아님) |
| 가격 포인트 | **9,900원 / 10회 패키지** |
| 신규 가입 무료 크레딧 | **2회** |
| 크레딧 차감 규칙 | **면접 1회 완료 = 1 크레딧 차감** |
| 환불 정책 | **크레딧 사용 전 7일 내 환불 / 사용 후 환불 불가** |
| 도메인 | 본인이 별도 준비 |
| 약관/개인정보 페이지 | Paddle live 전환 직전 작성 (Phase 5 후반) |

---

## 3. 작업 순서 (Phase 0 → 6)

**한 Phase씩** 진행해주세요. 처음부터 모든 Phase 정보를 보고 동시 작업하면 회귀가 발생합니다.

### Phase 0 — 기반 (반나절)
- [ ] 새 GitHub repo 생성 + 현재 코드 push
- [ ] Vercel ↔ GitHub 연동, PR 만들면 preview URL 자동 생성 확인
- [ ] `main` 브랜치 보호 규칙 (PR 필수, CI 통과 필수)
- [ ] `.env.example` 파일 (실제 키는 절대 커밋 X)

### Phase 1 — DB 스키마 (1~2일)

- [ ] Neon Postgres 프로비저닝 (무료 tier)
- [ ] `drizzle-orm` + `drizzle-kit` 설치
- [ ] 아래 스키마 정의

```ts
// 권장 초기 스키마 (필드명/타입은 가이드, 세부 조정 가능)
users {
  id: uuid (pk)
  clerk_user_id: text (unique, not null)
  email: text (not null)
  created_at: timestamp default now()
}

credits {
  user_id: uuid (pk, fk → users.id)
  free_remaining: int (default 2)
  paid_remaining: int (default 0)
  total_used: int (default 0)
  updated_at: timestamp
}

saved_resumes {
  id: uuid (pk)
  user_id: uuid (fk)
  content: text
  file_name: text (nullable)
  updated_at: timestamp default now()
}

interview_history {
  id: uuid (pk)
  user_id: uuid (fk)
  persona_id: text
  duration_minutes: int
  started_at: timestamp
  ended_at: timestamp (nullable)
  overall_score: int (nullable)
  qa_results: jsonb  -- 전체 질문/답변/점수/피드백 통째로 저장
}

transactions {
  id: uuid (pk)
  user_id: uuid (fk)
  paddle_transaction_id: text (unique, not null)
  amount: int  -- 원 단위
  currency: text (default 'KRW')
  status: text  -- 'completed' | 'refunded' | 'failed'
  created_at: timestamp default now()
}

processed_webhooks {  -- 멱등성 보장용
  paddle_event_id: text (pk)
  processed_at: timestamp default now()
}
```

- [ ] migration 1회 실행
- [ ] 로컬에서 `SELECT 1` 성공

### Phase 2 — Auth (1~2일)

- [ ] Clerk Application 생성 (한국어 + 이메일/Google 소셜)
- [ ] `<ClerkProvider>` 래핑, `middleware.ts` 보호 라우트 설정
- [ ] **Clerk webhook → DB users 테이블 sync**
  - signup 이벤트 시 users + credits row 자동 생성 (free_remaining=2)
- [ ] 헤더에 로그인 상태/이메일 노출
- [ ] `/sign-in`, `/sign-up`, `/sign-out` 동작

**DONE 정의:**
- 신규 가입 → DB users + credits 자동 생성 확인
- 로그인/로그아웃 정상 동작
- Preview URL에서 시연 가능

### Phase 3 — 영속화 (이력서 + 면접 이력) (2일)

- [ ] resume 페이지: 저장된 이력서 자동 불러오기 + 저장 버튼
- [ ] 면접 결과 페이지에서 `interview_history`에 자동 저장
- [ ] `/me` 또는 `/history` 페이지 — 과거 면접 리스트 + 상세보기

### Phase 4 — 크레딧 시스템 (1~2일)

- [ ] `/api/generate-questions` 호출 전 **서버사이드** 크레딧 체크
  - 부족 시 `402 Payment Required` 응답
- [ ] 면접 완료 시점에 크레딧 1 차감 (DB 트랜잭션 사용 — race condition 방지)
- [ ] 프론트: 크레딧 0 시 paywall 모달 표시

### Phase 5 — Paddle 결제 (2~3일) ⚠️ 가장 위험

#### 사전 작업 (PO와 함께)
- [ ] Paddle 대시보드에서 **신규 Product 생성**: "인터뷰메이트 10회 패키지 / 9,900원"
- [ ] 신규 Website 추가: 우리 도메인
- [ ] **Sandbox 환경에서 먼저 통합** (live는 약관 작성 후 마지막에 전환)

#### 통합 작업
- [ ] 프론트: Paddle Checkout (overlay 또는 inline) 연동
- [ ] `/api/webhooks/paddle` 엔드포인트
  - **Signature 검증 필수** (Paddle 공식 라이브러리 또는 직접 구현)
  - **멱등성**: `paddle_event_id`를 `processed_webhooks` unique 테이블에 저장, 중복 이벤트 무시
  - 결제 성공 → 크레딧 +10, transactions 기록
  - 환불 이벤트 → status='refunded' 업데이트 (단, 사용 후 환불 정책 적용 — 사용한 크레딧만큼은 회수 X)

#### 테스트 시나리오 (전부 통과해야 함)
- [ ] 정상 결제 → 크레딧 +10
- [ ] 결제 실패 → 크레딧 변동 없음
- [ ] 환불 → 사용 안 한 크레딧 차감, 사용한 만큼 유지
- [ ] **같은 webhook 이벤트 중복 수신 → 한 번만 처리** (이게 가장 중요)
- [ ] 부분 결제/취소 케이스

### Phase 6 — 운영 hardening (1~2일)

- [ ] Sentry 연결 (free tier)
- [ ] API rate limit (Upstash Ratelimit 무료)
- [ ] 도메인 연결, 이메일 인증
- [ ] **약관/개인정보/환불정책 페이지 작성** (PO와 협업, 한국 개인정보보호법 + Paddle 요구사항 동시 충족)
- [ ] Paddle 도메인+Product 정식 심사 제출 → 승인 (1~3 영업일)
- [ ] Live 키로 전환

---

## 4. 협업 룰

### PR 사이즈
- **1 PR ≤ 1 Phase** (대략 500~1000줄)
- 1500줄 넘는 PR은 머지 거부합니다. Phase 단위로 쪼개주세요.

### 데일리 싱크
- 매일 **16시 텍스트로 5~10분**:
  - 어제: ~
  - 오늘: ~
  - 막힘: ~
- **24시간 이상 막히면 즉시 콜** — 혼자 끙끙대지 마세요. 페어로 같이 풉니다.

### DONE 정의
- 각 Phase 시작 전 위에 적힌 체크리스트 다시 확인
- PR 설명에 체크리스트 그대로 복붙 + 체크 + **시연 스크린샷 1장**

### CLAUDE.md 업데이트
- Phase 끝날 때마다 후임자 본인이 직접 `CLAUDE.md` 갱신
- "스택 추가됨", "마이그레이션 추가됨" 등 정보 변동을 반영

### 작업 범위
- 면접 앱 비즈니스 로직 (페르소나/카운트다운/꼬리질문/Lottie 등) **건드리지 마세요**. 본 작업 범위 외.
- 라이브러리 추가는 자유. 단 PR description에 **"왜"** 한 줄 적어주세요.
- 스택(Clerk/Neon/Drizzle/Paddle)은 fix. 변경 원하면 시작 전 의논.

---

## 5. 주요 위험 포인트

### Paddle webhook 멱등성
가장 흔한 결제 사고: 중복 webhook → 크레딧 두 배 적립. **반드시 `processed_webhooks` 테이블 사용**.

### DB 트랜잭션
크레딧 차감은 **반드시 DB 트랜잭션** 안에서:
1. 현재 크레딧 select FOR UPDATE
2. 부족하면 abort
3. 차감 + total_used += 1 update
4. interview_history insert

이렇게 안 하면 동시 요청 시 음수 크레딧 가능.

### 환경변수 관리
- 로컬: `.env.local` (gitignored)
- Vercel: 대시보드 Environment Variables
- 절대 코드에 하드코딩 X
- 새로운 키 추가 시 `.env.example`에도 반영

### Anthropic API 비용 폭주 방지
- 면접 1회당 약 $0.05~0.20 비용
- 크레딧 체크는 **반드시 서버사이드**에서 (프론트만 막으면 우회 가능)
- API 라우트마다 rate limit 권장 (특히 generate-questions, evaluate-answer)

---

## 6. 첫 주 미션 (Phase 0~1)

가장 먼저 — **DB 기반만 잡아주세요. Auth/결제는 그 다음 주.**

DONE 정의:
- [ ] GitHub 새 repo 생성, 현재 코드 push
- [ ] Vercel-GitHub 연동, PR 만들면 preview URL 뜨는 것 확인
- [ ] Neon 프로젝트 생성 (무료 tier)
- [ ] Drizzle 설치, 위 6개 테이블 정의
- [ ] migration 1회 실행, 로컬에서 SELECT 1 성공
- [ ] `.env.example` 작성

**예상 소요**: 1.5~2일

---

## 7. 예상 일정 + 비용

### 일정
- Phase 0~1: 2일
- Phase 2: 1.5일
- Phase 3: 2일
- Phase 4: 1.5일
- Phase 5: 3일
- Phase 6: 2일
- **합계: 12~16일** (1인 mid-level 기준)

### 운영비용 (월)
- Vercel: $0 (free tier 충분)
- Neon: $0 (free tier 0.5GB)
- Clerk: $0 (10K MAU까지 무료)
- Paddle: 매출의 5% + $0.50/건
- 도메인: ~$15/yr
- Anthropic API: 사용량 비례 ($20~100/월 예상)
- Sentry: $0 (5K events/월 무료)

**고정 비용 < 월 ₩5,000** 수준. 실 비용은 거의 Anthropic API + Paddle 수수료.

---

## 8. 마지막 한 가지

**막히면 빨리 알려주세요.** 24시간 이상 혼자 끙끙대는 게 가장 큰 손실입니다.
질문 환영합니다. 화이팅!

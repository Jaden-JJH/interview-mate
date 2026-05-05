# 인터뷰메이트 — 후임자 인수인계 문서

> 작성일: 2026-05-05
> 직전 작업자: 이력서 멀티슬롯 / Paywall 모달 / BottomSheet 정렬 / 게스트모드 persist 구현
> 본 문서는 **남은 작업**과 **이번 세션에서 결정된 정책**을 정리한 인수인계 문서입니다.

---

## 1. 이번 세션에서 변경된 것 (반영 완료)

### 1-1. 이력서 멀티슬롯 (자기소개서 등록 구간)

**배경**
- 기존: 계정당 1건 고정. X 버튼 눌러도 변경 불가 (로컬 state만 비우고 서버 그대로).
- 변경: 슬롯 최대 3개, 라디오 선택, 슬롯별 삭제.

**정책 (확정)**
- 0 슬롯: 기존 디폴트 UI (PDF/직접입력 탭).
- 1 슬롯: 라디오 리스트 + 자동 선택. 디폴트 정책 그대로.
- 1+ 슬롯: 최신이 자동 선택, 다른 항목은 라디오로 전환. 슬롯별 미리보기는 선택된 항목만 펼침.
- 3/3: "+ 새 이력서 등록" 버튼 hide, 안내 문구 노출 ("이력서는 3개까지 등록 가능해요. 새로 등록하려면 기존 이력서를 삭제해 주세요.").
- **직접 입력은 ephemeral** — DB 저장 안 함. 이번 면접에만 사용. PUT API에 fileName 필수화.
- **X 버튼 전면 제거.** 액션은 "삭제" 1종으로 통일 (confirm dialog 포함).
- "+ 새 이력서 등록" 클릭 → **인라인 확장** (모달 아님). 라디오 리스트 하단에 펼침. 자동 스크롤.
- 마이페이지 "수정하기" 제거 — 보기/추가/삭제만.

**프리미엄 버튼 정책 (Fake Door 측정 중)**
- 0~2 슬롯: 기존 노출 그대로.
- 3/3: visible-but-disabled + 툴팁 "기존 이력서를 삭제해 주세요". (impression은 살리고 click은 죽임)

**API 구조 변경**
| Before | After |
|---|---|
| `GET /api/me/resume` → `{ resume }` 단일 | `GET /api/me/resume` → `{ resumes: [...], max: 3 }` |
| `PUT` (싱글톤 replace) | `POST` (append, fileName 필수, 풀이면 409) |
| `DELETE` (전체 삭제) | `DELETE?id=` (단일 슬롯) |

**히스토리 ↔ 이력서 연결 — 이번 스코프에서 제외**
- `interviewHistory` 테이블에 resume 참조 없음.
- 사용자 결정: **히스토리에 사용된 이력서는 표시하지 않음.**
- 향후 필요 시 옵션: 스냅샷(content 복사) / FK / 하이브리드. 추천은 스냅샷 (이력서는 면접 시점의 자기소개라 변하면 안 됨).

### 1-2. Paywall 모달 컴팩트화
- `components/PaywallModal.tsx`
- bottom sheet → 중앙 dialog (`items-end` → `items-center`)
- 폭 `max-w-[640px]` → `max-w-[360px]`
- 카피 단축: "패키지 구매하면 AI 도움받기를 무제한 사용할 수 있어요."
- 패키지 설명에서 "사용 전 7일 내 환불 가능" 제외 → "면접 10회 · AI 도움받기 무제한"
- 모션 y-slide → scale fade

### 1-3. BottomSheet 정렬 버그 수정
- `components/BottomSheet.tsx`
- 원인: framer-motion이 motion.div에 자체 transform(y)을 써서 Tailwind의 `-translate-x-1/2`를 덮어씀 → 좌측 정렬되어 화면 밖으로 밀림.
- 해결: `inset-x-0 + flex justify-center` 래퍼로 감싸고 motion.div는 translate 제거 (PaywallModal과 동일 패턴).

### 1-4. 게스트 모드 이력서 persist
- `lib/guest-resume-store.ts` 신규.
- 다른 작업자가 추가한 게스트 모드(`NEXT_PUBLIC_GUEST_MODE=true`)는 **DB write no-op** 정책.
- 로컬 다중 페이지 persist 테스트가 막히는 부작용 → localStorage로 우회.
- `/resume`, `/mypage` 둘 다 `isGuestMode()` 체크 후 분기.
- **프로덕션(`NEXT_PUBLIC_GUEST_MODE` unset/false)에선 영향 없음.**

### 1-5. 성능 개선
- `/resume` 로딩 블록 → 스켈레톤 (3개 placeholder + 점선 박스)
- 인라인 추가 패널 idle Lottie → 정적 SVG (확장 애니메이션 + Lottie 마운트 동시 발생 버벅임 제거)
- 0 슬롯 메인 드롭존의 Lottie는 유지 (브랜드 first impression)

---

## 2. 남은 작업 (To-Do)

### 우선순위 그룹 A — 결제/AI 기능 (사용자가 명시한 것)
1. **이력서 만들기 AI 실제 연동** — 현재 PremiumGenerateButton은 Fake Door (toast만).
2. **AI 도움받기 실제 AI 연동** — 면접 중 코칭 기능.
3. **Paddle 결제 연동** — 9,900원 / 10회 패키지.
4. **약관 / 가격정책 / 개인정보처리방침 / 이용약관** — 결제 전 필수.

### 우선순위 그룹 B — 검색/SEO (사용자가 명시한 것)
5. **메타 태그** — `app/layout.tsx` 기본 metadata, 페이지별 title/description, OG image, Twitter card
6. **sitemap.xml + robots.txt** — Next.js App Router 네이티브 (`app/sitemap.ts`, `app/robots.ts`)
7. **structured data (JSON-LD)** — Service / SoftwareApplication 스키마
8. **검색엔진 등록** — Google Search Console, **Naver Search Advisor (한국 시장 필수)**, Bing Webmaster
9. **Verification 메타 태그** — 각 콘솔 발급
10. **canonical URL / hreflang** (i18n 진행 시)
11. **Core Web Vitals 점검** — Lottie 다수 사용으로 LCP 영향 가능

### 우선순위 그룹 C — 프로덕션 운영 필수 (이번 세션 추가 발견)
12. **STT 실음성 인식** — 현재 3초 자동해제 placeholder (CLAUDE.md 명시). 음성 면접 서비스의 본질.
13. **에러 모니터링/로그** — Sentry/PostHog. 프로덕션 장애 감지/추적.
14. **남용 방지** — Claude API 비용 보호. rate limit, BotID, 1 IP당 요청 제한.
15. **회원 탈퇴 + 데이터 완전 삭제** — 개인정보법 의무. #4와 묶이지만 별도 구현 필요.

### 우선순위 그룹 D — UX 빈틈 (이번 세션 추가 발견)
16. **/result에 페르소나 노출** — CLAUDE.md 명시 한계. 누구랑 면접 봤는지 결과에 안 나옴.
17. **면접 중간 끊김 복원** — 새로고침/탭 닫힘 시 답변 휘발. 자동 임시저장 필요.
18. **이력서/채용공고 입력 실패 가드** — 빈 PDF, 파싱 실패, 이상 데이터 friendly 에러.

### 우선순위 그룹 E — 그로스/측정
19. **퍼널 분석 (PostHog)** — resume → posting → prep → interview → result 드롭률.
20. **A/B 실험 인프라** — 페르소나/시간 프리셋/CTA 카피.
21. **결과 공유/OG 이미지** — 점수 카드 SNS 공유 (바이럴).

### 우선순위 그룹 F — 부가
22. **접근성(a11y)** — 키보드 nav, contrast, screen reader.
23. **국제화(i18n)** — 한국어 하드코딩 → 영어/일본어 (해외 진출 시).
24. **이메일 알림** — 결제 영수증, 패키지 만료.

---

## 3. 추천 작업 순서

> 직전 작업자 의견. 후임자가 다시 판단해도 됨.

```
[Phase 1: 운영 안전망]
  13. 에러 모니터링  ← 결제 붙이기 전에 먼저 깔아야 사고 안 남
  14. 남용 방지

[Phase 2: 결제/AI 기능 (#1~4)]
  1. 이력서 만들기 AI
  2. AI 도움받기 실제 AI
  4. 약관/정책 페이지
  3. Paddle 결제 (가장 마지막, 모든 페이지/모니터링 깔린 후)

[Phase 3: 검색 노출 (#5~11)]
  5~10. SEO 메타/sitemap/JSON-LD/검색엔진 등록
  11. Core Web Vitals

[Phase 4: 운영 필수 (#12, 15)]
  12. STT 실음성
  15. 회원 탈퇴

[Phase 5: 그로스/UX 보강]
  16~21
```

**Phase 1을 결제(#3)보다 먼저 두는 이유**: 결제 도입 시점이 가장 사고 위험 큼 (돈이 오감). 그 전에 모니터링/남용방지가 먼저 깔려야 함.

---

## 4. 알려진 정책 / 함정 (반드시 읽을 것)

### 4-1. 게스트 모드 (`NEXT_PUBLIC_GUEST_MODE=true`)
- `lib/guest.ts`: 서버 사이드에서 DB write 전부 no-op.
- `lib/guest-resume-store.ts`: 클라이언트 localStorage로 우회 (이력서만).
- **로그인 여부와 무관**, 환경변수가 키.
- 로컬에서 DB 저장 테스트하려면 환경변수 끄고 Clerk 로그인해야 함.

### 4-2. 멀티슬롯 API 호출 시 주의
- POST 응답의 `content`/`fileName`은 게스트 모드에서 빈 스텁이 올 수 있음.
- 클라이언트는 **로컬 업로드 버퍼(`pdfText`, `uploadedFileName`)를 신뢰**해야 함.
- 프로덕션에선 echo 값과 동일해 무해, 게스트 스텁도 우회됨.

### 4-3. framer-motion + Tailwind translate 충돌
- motion.div에 `-translate-x-1/2` 등 transform Tailwind 클래스를 걸면 framer-motion의 자체 transform이 덮어씀.
- 해결 패턴: 부모 wrapper에 `inset-x-0 + flex justify-center` 사용, motion.div에선 translate 제거.
- 적용 사례: `PaywallModal.tsx`, `BottomSheet.tsx`.

### 4-4. tsconfig include 범위
- `tsconfig.json`이 `**/*.ts` include + `node_modules`만 exclude.
- workspace 하위 다른 프로젝트(Electron 등)도 typecheck에 잡힘.
- 우리 코드만 보려면: `npx tsc --noEmit 2>&1 | grep -E "^(app|contexts|lib|components)/"`

### 4-5. Lottie 캐릭터 캔버스 비율
- 페르소나별로 `cardScale`/`heroScale` 두 값 다 튜닝 필요.
- `lib/personas.ts` 참조.

### 4-6. Claude 모델 ID 관리
- `lib/anthropic.ts`의 `CLAUDE_MODEL` 한 곳에서만.
- system 프롬프트 cache_control: ephemeral 적용 중.

---

## 5. 이번 세션 변경 파일 목록

```
변경:
- app/api/me/resume/route.ts   (싱글톤 → 멀티슬롯, GET/POST/DELETE)
- app/resume/page.tsx          (전면 재작성, 라디오/인라인 확장/스켈레톤)
- app/mypage/page.tsx          (이력서 관리 섹션 멀티슬롯화)
- components/PremiumGenerateButton.tsx  (disabled prop 추가)
- components/PaywallModal.tsx  (컴팩트 다이얼로그화)
- components/BottomSheet.tsx   (정렬 버그 수정)

신규:
- lib/guest-resume-store.ts    (게스트 모드 localStorage persist)
- docs/HANDOFF.md              (본 문서)
```

---

## 6. 참고 메모리

- `MEMORY.md`의 [Phase 5 Paddle references], [Mypage design reference] 항목 — 결제/마이페이지 작업 시 패턴 repo로 활용.

# 인터뷰메이트 (가칭) — AI 모의 면접 서비스

## 한 줄 요약
한국어 사용자 대상 AI 모의 면접 웹앱. 자기소개서 + 채용공고 → 맞춤 질문 생성 → 페르소나 면접관과 카운트다운 면접 → 점수/피드백.

## 스택
- **Next.js 14 App Router** (TypeScript, App Router)
- **Anthropic Claude API** (`@/lib/anthropic` — `CLAUDE_MODEL`, prompt caching, JSON parse helper)
- **Tailwind CSS** (CSS variables: `--blue-primary`, `--gray-*` 등 `app/globals.css`)
- **framer-motion** (페이지 전환, 카운트다운 progress, modal)
- **lottie-react** + 자체 `<LottieAnimation>` 래퍼 (`fallbackSrc` 지원)
- 상태 — 전역은 `contexts/InterviewContext.tsx`, 영속화 없음 (새로고침 시 초기화)

## 사용자 플로우
```
/resume          (Step 1/3) — 자기소개서 입력 (PDF 업로드 → /api/parse-pdf)
   ↓
/job-posting     (Step 2/3) — 채용공고 URL → /api/parse-job-posting (cheerio + Claude 구조화)
   ↓                          fallback: 본문 직접 붙여넣기
/interview-prep  (Step 3/3) — 페르소나 hero + 캐러셀 + 시간 칩 → /api/generate-questions
   ↓
/interview                  — 카운트다운 면접 진행, /api/evaluate-answer 매 답변마다 호출
   ↓                          시간 만료 시 closing 질문으로 강제 점프
/result                     — /api/generate-feedback 호출 후 종합 결과
```

## 핵심 도메인 모델
**페르소나** (`lib/personas.ts`)
- Alex (논리적), 지윤 (따뜻함), Kevin (실전), 박상무 (압박형) + 랜덤
- 각 페르소나 = 시스템 프롬프트 톤 + accentColor + Lottie 캐릭터 + cardScale/heroScale (Lottie 캔버스 비율 보정)
- 캐릭터 파일: `public/lottie/{alex,jiyun,kevin,park}.json` — fallback `Talking Character.json`

**시간 프리셋** (`DURATIONS`)
- 5분 워밍업 (3문제) / 10분 핵심 (5) / 20분 표준 (7, 기본) / 30분 심층 (9)
- 모든 카운트는 closing 질문 포함. 일반 질문 N-1개 생성 후 클라이언트가 closing 부착.

**Closing 질문 (고정)**
- "마지막으로 하고 싶은 말이나, 저희에게 하고 싶은 질문이 있으신가요?"
- 시간이 다 되면 강제 점프. closing 자체엔 시간 제한 없음(끝까지 답변 받음).

**꼬리질문**
- `/api/evaluate-answer`가 응답에 `followUpQuestion` 포함 (또는 null)
- 발동 조건: closing 아님 + 이미 꼬리질문 차례 아님 + 남은 시간 60초 초과 + (모델 판단) 점수 80 미만/답변 빈약
- 동적으로 `items` 배열에 다음 위치에 1개 삽입. 꼬리질문엔 또 꼬리질문 안 붙음.

## API 라우트
- `POST /api/parse-pdf` — PDF 파싱. 텍스트 PDF는 `pdf.ts` (pdfjs), 이미지/스캔/암호화 PDF는 Claude PDF 비전 fallback.
- `POST /api/parse-job-posting` — 채용공고 URL fetch + cheerio + Claude로 JSON 구조화. 사이트별 selector 매핑(잡코리아·사람인·잡플래닛·점프잇·원티드).
- `POST /api/generate-questions` — `{ resume, jobPosting, durationMinutes, personaId }` → 페르소나 톤 반영된 N-1개 질문.
- `POST /api/evaluate-answer` — `{ question, answer, resume, jobPosting, personaId, allowFollowUp }` → score / feedback / bestAnswer / keywords / followUpQuestion.
- `POST /api/generate-feedback` — 전체 QA 배열 → overallScore + overallComment.

## 컨텍스트 구조 (`InterviewContext`)
- `resume`, `resumeFileName`
- `jobPosting`, `jobPostingRaw`
- `questions: string[]`, `qaResults: QAResult[]`
- `durationMinutes`, `personaId`, `resolvedPersonaId` (랜덤이면 실제 매칭된 ID)
- `overallScore`, `overallComment`

## 알려진 한계 / 차후 작업
- **Auth 없음** — 사용자 식별/세션 관리 미구현
- **DB 없음** — 모든 상태가 메모리. 새로고침 = 초기화. 면접 이력 저장 안됨.
- **결제 없음** — 무료 체험만. 계획: Paddle 연동, 무료 크레딧 2회 후 결제 유도.
- **이력서 영속화 없음** — 매번 다시 입력
- **STT 시뮬레이션** — 마이크 버튼 클릭 시 3초 후 자동 해제. 실제 음성 인식 미연결. (의도된 placeholder)
- **/result 페이지에 페르소나 정보 미노출** — 누구랑 면접 봤는지 결과에선 보이지 않음
- **여러 면접관 동시 선택**은 의도적으로 보류 (UX 복잡도 vs 가치 판단)
- **국제화 없음** — 한국어 하드코딩

## 디자인 원칙
- 모바일 퍼스트 (`max-w-[640px]` 중앙 정렬)
- 페르소나 선택은 **브랜드 모먼트** — prep 페이지에서 hero로 크게 노출
- 카운트다운은 60초 미만 주황, 0초 빨강으로 시각 신호
- ChatBubble + TypingIndicator 모두 `aiName` / `aiAccentColor` props로 페르소나 반영

## 작업 시 주의
- `tsconfig.json`이 `**/*.ts`를 include하고 `node_modules`만 exclude. workspace 내 `projects/` 하위 다른 프로젝트(Electron 등)도 typecheck에 잡힘 — 우리 코드만 보려면 `npx tsc --noEmit 2>&1 | grep -E "^(app|contexts|lib|components)/"` 사용.
- 페르소나 캐릭터 Lottie는 캔버스 비율이 제각각. 추가/교체 시 `cardScale`/`heroScale` 두 값 다 튜닝 필요.
- `lib/anthropic.ts`의 `CLAUDE_MODEL` 한 곳에서 모델 ID 관리. system 프롬프트 cache_control: ephemeral 적용 중.

## 파일 탐색 규칙 (첫 줄 주석 컨벤션)

모든 `.ts` / `.tsx` 소스 파일 첫 줄에 `// 한국어 한 줄 설명` 주석이 있음. 파일을 전부 읽지 않고도 수정 대상을 빠르게 고를 수 있도록 도입한 컨벤션.

**탐색 방법:**
```bash
# 키워드로 후보 추리기
grep -r "^// " app/ components/ lib/ contexts/ --include="*.ts" --include="*.tsx" | grep "키워드"
# 특정 디렉터리 전체 첫 줄 일괄 확인
head -1 app/api/*/route.ts
```

**가드레일 — 반드시 지켜야 할 규칙:**
1. **주석은 힌트, 수정 근거 아님** — 본문을 직접 읽고 확인한 뒤 수정. 주석만 보고 코드를 고치지 말 것.
2. **주석 ↔ 본문 불일치 발견 시 멈출 것** — 내용이 다르면 주석이 낡은 것. 사용자에게 알리고 주석도 갱신.
3. **비슷한 설명 파일이 여럿이면 모두 열어라** — 크레딧·이력서·결제 등 기능은 여러 파일에 걸쳐 있음. 후보를 성급하게 하나로 좁히지 말 것.
4. **파일 기능 변경 시 첫 줄 주석도 갱신** — 낡은 주석은 다음 AI를 잘못 안내함.
5. **새 파일 생성 시 첫 줄 주석 필수** — 컨벤션 일관성을 유지해야 탐색이 신뢰할 수 있음.
6. **`projects/` 하위는 별도 프로젝트** — `projects/MCP Monitor/` 는 Electron 앱. 이 앱과 무관하므로 건드리지 말 것.

# WordPress 자동 발행 세팅 가이드

## 1. WordPress 사이트 생성

### 옵션 A: WordPress.com (추천 — 무료 시작, 관리 부담 없음)
1. https://wordpress.com 가입
2. 무료 플랜 선택 (*.wordpress.com 도메인)
3. 사이트 생성 완료 후 "도구 → Application Passwords" 메뉴 접근

### 옵션 B: 자체 호스팅 (SEO 최적화, 커스텀 도메인)
- 호스팅: Cloudways / Vultr / DigitalOcean (월 $5~)
- 설치: WordPress one-click install
- 필수 플러그인: Yoast SEO, WP REST API 활성화 (기본 내장)

## 2. REST API 활성화 확인

```bash
# 사이트 REST API 접근 테스트
curl https://your-site.com/wp-json/wp/v2/posts?per_page=1
```

WordPress.com은 기본 활성화. 자체 호스팅은 permalink 설정이 "기본"이면 REST API 비활성화 — "글 이름" 등으로 변경 필요.

## 3. Application Password 발급

1. WordPress 관리자 → 사용자 → 프로필
2. 하단 "Application Passwords" 섹션
3. 이름: `interview-mate-auto` 입력 → "새 Application Password 추가"
4. 생성된 비밀번호 복사 (공백 포함 그대로 사용 가능, 또는 공백 제거)

> **WordPress.com**: 설정 → 보안 → Application Passwords

## 4. 환경변수 설정

Mac Mini `.env.local`에 추가:

```env
WORDPRESS_SITE_URL=https://your-site.wordpress.com
WORDPRESS_USERNAME=your-username
WORDPRESS_APP_PASSWORD=xxxx xxxx xxxx xxxx xxxx xxxx
```

- `WORDPRESS_SITE_URL`: 사이트 루트 URL (끝에 / 없이)
- `WORDPRESS_USERNAME`: WordPress 로그인 사용자명
- `WORDPRESS_APP_PASSWORD`: 위에서 발급한 Application Password

## 5. Unsplash API 키 (선택)

블로그 본문 내 이미지 자동 삽입용.

1. https://unsplash.com/developers 가입
2. "New Application" 생성
3. Access Key 복사

```env
UNSPLASH_ACCESS_KEY=your-unsplash-access-key
```

> 무료: 50 req/hour. 일 1편 블로그이면 충분.

## 6. 동작 확인

```bash
cd ~/Documents/interview-mate/marketing-automation

# WordPress 연결 테스트
npx tsx -e "
import { pingWordPress } from './lib/wordpress.js';
pingWordPress().then(console.log).catch(console.error);
"

# 블로그 변환 테스트 (dry-run)
npx tsx scripts/run-pipeline.ts
# → [Step 3c] Blog SEO 변환 (Sonnet) 단계가 출력되면 성공
```

## 7. 파이프라인 흐름

```
매일 07:00 cron-pipeline.sh
  → 소스 수집 → Master → IG + Shorts + Blog 변환 → 품질 게이트 → Slack HITL
    
Slack 승인 버튼 클릭
  → IG/Threads/FB 큐 적재
  → Blog 큐 적재 (WordPress 설정 시)
  → Shorts 빌드+업로드

10분마다 cron-publisher.sh
  → 큐에서 pending 꺼내 발행 (IG/Threads/FB/Blog)
```

## 8. SEO 추천 설정

WordPress 사이트 기본 세팅:
- **Yoast SEO** 플러그인 설치 (자체 호스팅 시)
- **Permalink**: `/%postname%/` (글 이름)
- **카테고리**: "면접·취업" 기본 생성
- **사이트 제목**: "인터뷰메이트 블로그 | AI 면접 준비 가이드"
- **태그라인**: "취준생과 이직자를 위한 AI 면접 코칭"

## 9. 비용

| 항목 | 비용 |
|---|---|
| WordPress.com 무료 | $0 |
| WordPress.com Personal (커스텀 도메인) | $4/월 |
| 자체 호스팅 (VPS) | $5~10/월 |
| Unsplash API | 무료 (50 req/hr) |
| Claude 블로그 변환 (Sonnet) | ~$0.20/일 |

## 10. 티스토리/네이버 HITL 워크플로

공식 API 종료로 자동 발행 불가. 대안:

1. 파이프라인에서 Blog variant 생성 시 **Slack에 초안 전문 발송**
2. 사용자가 수동으로 티스토리/네이버에 복붙
3. 주 1~2회 교차 발행 (SEO 중복 방지 위해 2-3일 시차)

향후 Notion DB 연동으로 초안 관리 고도화 가능.

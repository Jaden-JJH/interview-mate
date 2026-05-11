// Threads·Meta·Instagram API 토큰 유효성을 읽기 전용으로 검증하는 스크립트
/**
 * SNS API 토큰 검증 스크립트
 *
 * 실행: npx tsx scripts/test-social-tokens.ts
 *
 * 검증 항목:
 *   1. Threads — /me 프로필 조회 + 토큰 만료일 확인
 *   2. Meta (Facebook) — /me 프로필 조회 + 연결된 페이지 목록
 *   3. Instagram — Facebook 페이지 통해 IG 비즈니스 계정 매칭 확인
 *
 * 어떤 토큰도 발행은 하지 않음. 읽기만.
 */

import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });

const c = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  dim: "\x1b[2m",
} as const;

function ok(label: string, msg: string) {
  console.log(`${c.green}✓${c.reset} ${label}: ${msg}`);
}
function fail(label: string, msg: string) {
  console.log(`${c.red}✗${c.reset} ${label}: ${msg}`);
}
function info(msg: string) {
  console.log(`${c.dim}  ${msg}${c.reset}`);
}
function header(title: string) {
  console.log(`\n${c.cyan}━━━ ${title} ━━━${c.reset}`);
}

async function gj(url: string): Promise<{ ok: boolean; data: any; status: number }> {
  const res = await fetch(url);
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data, status: res.status };
}

async function testThreads() {
  header("Threads API");

  const token = process.env.THREADS_LONG_TOKEN;
  const userId = process.env.THREADS_USER_ID;

  if (!token || !userId) {
    fail("ENV", "THREADS_LONG_TOKEN 또는 THREADS_USER_ID 비어있음");
    return false;
  }

  const profile = await gj(
    `https://graph.threads.net/v1.0/me?fields=id,username,threads_profile_picture_url,threads_biography&access_token=${token}`,
  );

  if (!profile.ok) {
    fail("프로필", `${profile.status} ${JSON.stringify(profile.data)}`);
    return false;
  }

  ok("프로필 조회", `@${profile.data.username} (id: ${profile.data.id})`);
  if (profile.data.id !== userId) {
    fail("USER_ID 불일치", `env: ${userId}, 실제: ${profile.data.id}`);
  }

  const debug = await gj(
    `https://graph.facebook.com/debug_token?input_token=${token}&access_token=${process.env.THREADS_APP_ID}|${process.env.THREADS_APP_SECRET}`,
  );

  if (debug.ok && debug.data?.data) {
    const d = debug.data.data;
    if (d.expires_at) {
      const expiry = new Date(d.expires_at * 1000);
      const days = Math.floor((expiry.getTime() - Date.now()) / 86400000);
      ok("토큰 만료일", `${expiry.toISOString().slice(0, 10)} (${days}일 남음)`);
      if (days < 7) info(`⚠ 7일 이내 만료 — 갱신 필요`);
    } else {
      info("만료일 정보 없음 (long-lived 또는 영구)");
    }
    if (d.scopes) ok("권한", d.scopes.join(", "));
  }

  return true;
}

async function testMeta() {
  header("Meta (Facebook) API");

  const token = process.env.META_ACCESS_TOKEN;
  const userId = process.env.META_ACCESS_USER_ID;

  if (!token) {
    fail("ENV", "META_ACCESS_TOKEN 비어있음");
    return false;
  }

  const me = await gj(
    `https://graph.facebook.com/v21.0/me?fields=id,name&access_token=${token}`,
  );

  if (!me.ok) {
    fail("프로필", `${me.status} ${JSON.stringify(me.data)}`);
    return false;
  }
  ok("프로필 조회", `${me.data.name} (id: ${me.data.id})`);
  if (userId && me.data.id !== userId) {
    info(`META_ACCESS_USER_ID env: ${userId}, /me 응답: ${me.data.id}`);
  }

  const debug = await gj(
    `https://graph.facebook.com/debug_token?input_token=${token}&access_token=${process.env.META_APP_ID}|${process.env.META_APP_SECRET}`,
  );
  if (debug.ok && debug.data?.data) {
    const d = debug.data.data;
    if (Array.isArray(d.scopes) && d.scopes.length > 0) {
      const required = [
        "pages_show_list",
        "pages_read_engagement",
        "instagram_basic",
        "instagram_content_publish",
      ];
      const has = (s: string) => d.scopes.includes(s);
      ok("토큰 스코프", d.scopes.join(", "));
      const missing = required.filter((s) => !has(s));
      if (missing.length > 0) {
        fail("필수 스코프 누락", missing.join(", "));
        info("→ 새 토큰 발급 시 위 스코프 모두 체크 필요");
      } else {
        ok("필수 스코프", "전부 보유");
      }
    } else {
      info("스코프 정보 없음 (debug_token 응답 비어있음)");
    }
    if (d.expires_at) {
      const days = Math.floor((d.expires_at * 1000 - Date.now()) / 86400000);
      ok("토큰 만료", `${new Date(d.expires_at * 1000).toISOString().slice(0, 10)} (${days}일 남음)`);
    }
  }

  const pages = await gj(
    `https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token,instagram_business_account{id,username}&access_token=${token}`,
  );

  if (!pages.ok) {
    fail("페이지 목록", `${pages.status} ${JSON.stringify(pages.data)}`);
    return false;
  }

  const pageList = pages.data.data || [];
  if (pageList.length === 0) {
    fail("페이지 목록", "연결된 페이스북 페이지 없음 — IG Graph API 사용 불가");
    info("페이스북 페이지 만들고 IG 비즈니스 계정과 연결 필요");
    return false;
  }

  ok("페이지 목록", `${pageList.length}개 페이지 연결됨`);
  pageList.forEach((p: any, i: number) => {
    const igMark = p.instagram_business_account ? `📷 IG 연결 (${p.instagram_business_account.id})` : "❌ IG 미연결";
    info(`${i + 1}. ${p.name} (page id: ${p.id}) — ${igMark}`);
  });

  return pageList;
}

async function testInstagramViaPage(pages: any[]) {
  header("Instagram via Facebook Page (옛 흐름 — 선택)");

  const linked = pages.find((p) => p.instagram_business_account);
  if (!linked) {
    info("페이지에 IG 연결 없음 — IG-only 흐름을 쓸 거면 무시 가능");
    return false;
  }

  const igId = linked.instagram_business_account.id;
  const pageToken = linked.access_token;
  const igProfile = await gj(
    `https://graph.facebook.com/v21.0/${igId}?fields=id,username,followers_count,media_count&access_token=${pageToken}`,
  );

  if (!igProfile.ok) {
    info(`페이지 경유 IG 조회 실패 (무시 가능): ${igProfile.status}`);
    return false;
  }
  ok("페이지 경유 IG", `@${igProfile.data.username} (followers: ${igProfile.data.followers_count}, media: ${igProfile.data.media_count})`);
  return true;
}

async function testInstagramDirect() {
  header("Instagram API with Instagram Login (주력 흐름)");

  const token = process.env.INSTAGRAM_LONG_TOKEN;
  const businessId = process.env.INSTAGRAM_BUSINESS_ID;

  if (!token) {
    fail("ENV", "INSTAGRAM_LONG_TOKEN 비어있음");
    return false;
  }

  // graph.instagram.com /me — IG-only 토큰의 표준 검증
  const me = await gj(
    `https://graph.instagram.com/v21.0/me?fields=id,username,account_type,media_count&access_token=${token}`,
  );

  if (!me.ok) {
    fail("IG /me", `${me.status} ${JSON.stringify(me.data)}`);
    return false;
  }

  ok("IG 프로필", `@${me.data.username} (id: ${me.data.id}, account_type: ${me.data.account_type}, media: ${me.data.media_count})`);

  if (businessId && me.data.id !== businessId) {
    info(`INSTAGRAM_BUSINESS_ID env: ${businessId}, /me 응답: ${me.data.id} ← env 갱신 권장`);
  }

  if (me.data.account_type !== "BUSINESS" && me.data.account_type !== "MEDIA_CREATOR") {
    fail("계정 타입", `${me.data.account_type} — 발행 불가. BUSINESS 또는 MEDIA_CREATOR 필요`);
    return false;
  }

  // 권한 확인 — IG는 debug_token이 다르게 동작. 권한 직접 조회 엔드포인트로.
  const perms = await gj(
    `https://graph.instagram.com/v21.0/me/permissions?access_token=${token}`,
  );
  if (perms.ok && Array.isArray(perms.data?.data)) {
    const granted = perms.data.data
      .filter((p: any) => p.status === "granted")
      .map((p: any) => p.permission);
    ok("부여된 권한", granted.join(", "));

    const required = ["instagram_business_basic", "instagram_business_content_publish"];
    const missing = required.filter(
      (r) =>
        !granted.includes(r) &&
        !granted.includes(r.replace("instagram_business_", "instagram_")),
    );
    if (missing.length > 0) {
      info(`권장 권한 없음 (다른 권한으로 대체될 수 있음): ${missing.join(", ")}`);
    }
  }

  return true;
}

async function main() {
  console.log(`${c.cyan}SNS API 토큰 검증 시작${c.reset}\n`);

  const threadsOk = await testThreads();
  const metaResult = await testMeta();
  const pages = Array.isArray(metaResult) ? metaResult : [];
  if (pages.length > 0) {
    await testInstagramViaPage(pages);
  }
  const igOk = await testInstagramDirect();

  console.log(`\n${c.cyan}━━━ 결과 ━━━${c.reset}`);
  if (threadsOk) ok("Threads", "발행 가능 ✓");
  else fail("Threads", "점검 필요");

  if (pages.length > 0) ok("Meta", `${pages.length}개 페이지 연결 (옵션)`);

  if (igOk) ok("Instagram (IG-only)", "발행 가능 ✓");
  else fail("Instagram (IG-only)", "토큰/권한 점검 필요");
}

main().catch((e) => {
  console.error(`\n${c.red}예외 발생${c.reset}`, e);
  process.exit(1);
});

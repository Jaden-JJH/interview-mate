// YouTube OAuth 2.0 인증 — 1회 실행으로 refresh_token 발급
// 사용: npx tsx scripts/youtube-auth.ts
// 브라우저에서 Google 로그인 → 콜백 코드 입력 → .env.local에 YOUTUBE_REFRESH_TOKEN 추가

import "../lib/env.js";
import { env } from "../lib/env.js";
import { createServer } from "node:http";

const SCOPES = [
  "https://www.googleapis.com/auth/youtube.upload",
  "https://www.googleapis.com/auth/youtube.readonly",
];

const REDIRECT_URI = "http://localhost:9876/callback";

async function main() {
  const clientId = env.youtube.clientId;
  const clientSecret = env.youtube.clientSecret;

  if (!clientId || !clientSecret) {
    console.error("YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET 필요.");
    console.error(".env.local에 추가 후 재실행하세요.");
    process.exit(1);
  }

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${clientId}` +
    `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
    `&response_type=code` +
    `&scope=${encodeURIComponent(SCOPES.join(" "))}` +
    `&access_type=offline` +
    `&prompt=consent`;

  console.log("\n🔐 YouTube OAuth 인증");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("\n아래 URL을 브라우저에서 열어주세요:\n");
  console.log(authUrl);
  console.log("\n로그인 후 자동으로 콜백을 받습니다...\n");

  const code = await waitForCallback();
  console.log(`\n✓ 인증 코드 수신: ${code.slice(0, 20)}...`);

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: REDIRECT_URI,
      grant_type: "authorization_code",
    }),
  });

  const tokenData = await tokenRes.json() as Record<string, any>;

  if (!tokenRes.ok || !tokenData.refresh_token) {
    console.error("토큰 발급 실패:", tokenData);
    if (!tokenData.refresh_token && tokenData.access_token) {
      console.error("\nrefresh_token이 없습니다. Google Console에서 앱 접근 권한을 해제 후 재시도:");
      console.error("  https://myaccount.google.com/permissions");
    }
    process.exit(1);
  }

  console.log("\n✅ 토큰 발급 성공!");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`\n.env.local에 아래 줄을 추가하세요:\n`);
  console.log(`YOUTUBE_REFRESH_TOKEN=${tokenData.refresh_token}`);
  console.log(`\n(access_token은 자동 갱신되므로 저장 불필요)`);
}

function waitForCallback(): Promise<string> {
  return new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      const url = new URL(req.url ?? "/", `http://localhost:9876`);
      if (url.pathname === "/callback") {
        const code = url.searchParams.get("code");
        if (code) {
          res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
          res.end("<h1>✅ 인증 완료! 이 탭을 닫아도 됩니다.</h1>");
          server.close();
          resolve(code);
        } else {
          const error = url.searchParams.get("error") ?? "unknown";
          res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
          res.end(`<h1>❌ 인증 실패: ${error}</h1>`);
          server.close();
          reject(new Error(`OAuth error: ${error}`));
        }
      }
    });

    server.listen(9876, () => {
      console.log("콜백 서버 대기 중 (localhost:9876)...");
    });

    setTimeout(() => {
      server.close();
      reject(new Error("인증 타임아웃 (5분)"));
    }, 5 * 60 * 1000);
  });
}

main().catch((e) => {
  console.error("youtube-auth 오류:", e);
  process.exit(1);
});

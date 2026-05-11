// Meta/IG/Threads API 상태 진단
import "../lib/env.js";
import { env } from "../lib/env.js";

async function main() {
  // 1. Meta token debug
  console.log("=== META TOKEN DEBUG ===");
  try {
    const debugRes = await fetch(
      `https://graph.facebook.com/debug_token?input_token=${env.meta.accessToken}&access_token=${env.meta.appId}|${env.meta.appSecret}`,
    );
    const debugData = await debugRes.json();
    console.log("Status:", debugRes.status);
    console.log(JSON.stringify(debugData, null, 2));
  } catch (e) {
    console.error("Meta token debug 실패:", e);
  }

  // 2. Threads /me
  console.log("\n=== THREADS ME ===");
  try {
    const res = await fetch(
      `https://graph.threads.net/v1.0/me?fields=id,username&access_token=${env.threads.longToken}`,
    );
    const data = await res.json();
    console.log("Status:", res.status);
    console.log(JSON.stringify(data, null, 2));
  } catch (e) {
    console.error("Threads 실패:", e);
  }

  // 3. IG account
  console.log("\n=== IG ACCOUNT ===");
  try {
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${env.instagram.accountId}?fields=id,username&access_token=${env.meta.accessToken}`,
    );
    const data = await res.json();
    console.log("Status:", res.status);
    console.log(JSON.stringify(data, null, 2));
  } catch (e) {
    console.error("IG 실패:", e);
  }

  // 4. App mode check
  console.log("\n=== APP STATUS ===");
  try {
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${env.meta.appId}?fields=id,name,link&access_token=${env.meta.appId}|${env.meta.appSecret}`,
    );
    const data = await res.json();
    console.log("Status:", res.status);
    console.log(JSON.stringify(data, null, 2));
  } catch (e) {
    console.error("App status 실패:", e);
  }
}

main().catch(console.error);

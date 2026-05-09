// Slack Incoming Webhook 알림 헬퍼 — W2 HITL 게이트 초안 푸시

import { env } from "./env.js";

export async function sendSlack(text: string): Promise<void> {
  if (!env.slack.webhookUrl) return;
  try {
    await fetch(env.slack.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
  } catch (e) {
    console.error("  · Slack 알림 실패:", e);
  }
}

// Paddle webhook 목적지 설정과 최근 발송 이력을 점검하는 스크립트
/**
 * Paddle notification settings(=webhook destinations)와 최근 발송 이력 점검.
 */
import { config } from "dotenv";

async function main() {
  config({ path: ".env.local" });
  config({ path: ".env" });
  const apiKey = process.env.PADDLE_API_KEY;
  if (!apiKey) {
    console.error("Missing PADDLE_API_KEY");
    process.exit(1);
  }

  const base = "https://api.paddle.com";
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };

  console.log("=== notification settings (destinations) ===");
  const settingsRes = await fetch(`${base}/notification-settings`, { headers });
  const settings = await settingsRes.json();
  for (const s of settings.data ?? []) {
    console.log({
      id: s.id,
      description: s.description,
      destination: s.destination,
      active: s.active,
      type: s.type,
      events: (s.subscribed_events ?? []).length,
    });
  }

  console.log("\n=== recent notifications (last 20) ===");
  const notifRes = await fetch(
    `${base}/notifications?per_page=20&order_by=id[DESC]`,
    { headers }
  );
  const notifs = await notifRes.json();
  for (const n of notifs.data ?? []) {
    console.log({
      id: n.id,
      type: n.type,
      status: n.status,
      occurred_at: n.occurred_at,
      delivered_at: n.delivered_at,
      replayed_at: n.replayed_at,
      destination: n.destination,
      notification_setting_id: n.notification_setting_id,
    });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

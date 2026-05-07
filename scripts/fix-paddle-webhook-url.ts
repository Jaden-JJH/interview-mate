/**
 * Paddle notification destination URL 수정.
 * 잘못된 경로(/api/webhooks/clerk) → 올바른 경로(/api/webhooks/paddle)
 */
import { config } from "dotenv";

const SETTING_ID = "ntfset_01kqwa69a76nh1f5f7bnaf0zcv";
const NEW_URL = "https://interview-mate.com/api/webhooks/paddle";

async function main() {
  config({ path: ".env.local" });
  config({ path: ".env" });
  const apiKey = process.env.PADDLE_API_KEY;
  if (!apiKey) {
    console.error("Missing PADDLE_API_KEY");
    process.exit(1);
  }

  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };

  const before = await fetch(
    `https://api.paddle.com/notification-settings/${SETTING_ID}`,
    { headers }
  ).then((r) => r.json());
  console.log("before:", before.data?.destination);

  const res = await fetch(
    `https://api.paddle.com/notification-settings/${SETTING_ID}`,
    {
      method: "PATCH",
      headers,
      body: JSON.stringify({ destination: NEW_URL }),
    }
  );
  const json = await res.json();
  if (!res.ok) {
    console.error("PATCH failed:", res.status, json);
    process.exit(1);
  }
  console.log("after:", json.data?.destination);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

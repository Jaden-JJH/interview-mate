/**
 * Paddle notification setting의 endpoint_secret_key prefix와
 * 로컬 PADDLE_WEBHOOK_SECRET을 매칭만 확인 (전체 값은 출력하지 않음).
 */
import { config } from "dotenv";

const SETTING_ID = "ntfset_01kqwa69a76nh1f5f7bnaf0zcv";

async function main() {
  config({ path: ".env.local" });
  config({ path: ".env" });
  const apiKey = process.env.PADDLE_API_KEY;
  const localSecret = process.env.PADDLE_WEBHOOK_SECRET;
  if (!apiKey) {
    console.error("Missing PADDLE_API_KEY");
    process.exit(1);
  }

  const res = await fetch(
    `https://api.paddle.com/notification-settings/${SETTING_ID}`,
    { headers: { Authorization: `Bearer ${apiKey}` } }
  );
  const json = await res.json();
  const remoteSecret: string = json.data?.endpoint_secret_key ?? "";

  const mask = (s: string) =>
    s ? `${s.slice(0, 12)}…${s.slice(-4)} (len=${s.length})` : "(missing)";
  console.log("paddle setting secret:", mask(remoteSecret));
  console.log("local env secret    :", mask(localSecret ?? ""));
  console.log("match               :", remoteSecret === localSecret);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

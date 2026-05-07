/**
 * 우리 notification setting의 최근 실패 webhook 상세 (응답 코드/본문 포함).
 */
import { config } from "dotenv";

const SETTING_ID = "ntfset_01kqwa69a76nh1f5f7bnaf0zcv";

async function main() {
  config({ path: ".env.local" });
  config({ path: ".env" });
  const apiKey = process.env.PADDLE_API_KEY;
  if (!apiKey) {
    console.error("Missing PADDLE_API_KEY");
    process.exit(1);
  }
  const headers = { Authorization: `Bearer ${apiKey}` };

  const listRes = await fetch(
    `https://api.paddle.com/notifications?notification_setting_id=${SETTING_ID}&per_page=10&order_by=id[DESC]`,
    { headers }
  );
  const list = await listRes.json();
  for (const n of list.data ?? []) {
    const detailRes = await fetch(
      `https://api.paddle.com/notifications/${n.id}/logs`,
      { headers }
    );
    const detail = await detailRes.json();
    console.log({
      id: n.id,
      type: n.type,
      status: n.status,
      occurred_at: n.occurred_at,
      logs: detail.data?.map((d: any) => ({
        attempted_at: d.attempted_at,
        response_code: d.response_code,
        response_body: (d.response_body ?? "").slice(0, 300),
      })),
    });
    console.log("---");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

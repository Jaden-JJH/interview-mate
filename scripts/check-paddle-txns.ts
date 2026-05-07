import { config } from "dotenv";
import { Environment, Paddle } from "@paddle/paddle-node-sdk";

async function main() {
  config({ path: ".env.local" });
  config({ path: ".env" });
  const apiKey = process.env.PADDLE_API_KEY;
  if (!apiKey) {
    console.error("Missing PADDLE_API_KEY");
    process.exit(1);
  }
  const paddle = new Paddle(apiKey, { environment: Environment.production });

  const clerkUserId = process.argv[2] ?? "user_3DOyCczOBK6YfkYJBHehm3GgzOx";

  const collection = paddle.transactions.list();
  const list: Array<Record<string, unknown>> = [];
  let count = 0;
  for await (const txn of collection) {
    const cd = txn.customData as { clerkUserId?: string } | null;
    if (cd?.clerkUserId === clerkUserId) {
      list.push({
        id: txn.id,
        status: txn.status,
        createdAt: txn.createdAt,
        billedAt: txn.billedAt,
        total: txn.details?.totals?.total,
        currency: txn.details?.totals?.currencyCode,
        customerEmail: txn.customer?.email,
      });
    }
    count++;
    if (count >= 200) break;
  }
  console.log(`scanned ${count} txns; matched ${list.length}`);
  console.log(JSON.stringify(list, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

// Slack Socket Mode HITL 서버 — 공개 URL 불필요, WebSocket으로 버튼 콜백 수신
import "../lib/env.js";
import { App } from "@slack/bolt";
import { env } from "../lib/env.js";
import { handleApprove, handleReject, handleRegenerate } from "./slack-actions.js";

if (!env.slack.botToken) throw new Error("SLACK_BOT_TOKEN 환경변수 필요");
if (!env.slack.appToken) throw new Error("SLACK_APP_TOKEN 환경변수 필요 (xapp-...)");

const app = new App({
  token: env.slack.botToken,
  socketMode: true,
  appToken: env.slack.appToken,
});

async function handleAction(
  actionType: string,
  masterId: number,
  user: string,
  respond: (msg: { text: string; replace_original?: boolean }) => Promise<unknown>,
) {
  console.log(`[HITL] ${user} → ${actionType} master_id=${masterId}`);

  let result;
  switch (actionType) {
    case "approve":
      result = await handleApprove(masterId);
      break;
    case "reject":
      result = await handleReject(masterId);
      break;
    case "regenerate":
      result = await handleRegenerate(masterId);
      break;
    default:
      console.error(`[HITL] Unknown action: ${actionType}`);
      return;
  }

  console.log(`[HITL] Result: ${result.text}`);
  const emoji = actionType === "approve" ? "✅" : actionType === "reject" ? "❌" : "🔄";
  await respond({ text: `${emoji} *${actionType}* by @${user}\n${result.text}`, replace_original: false });
}

for (const action of ["approve", "reject", "regenerate"] as const) {
  app.action(new RegExp(`^${action}:\\d+$`), async ({ ack, body, respond }) => {
    await ack();
    const actionId = (body as { actions: { action_id: string }[] }).actions[0].action_id;
    const [actionType, masterIdStr] = actionId.split(":");
    const masterId = Number(masterIdStr);
    const user = (body as { user?: { username?: string } }).user?.username ?? "unknown";

    try {
      await handleAction(actionType, masterId, user, respond);
    } catch (e) {
      console.error("[HITL] Action error:", e);
      await respond({ text: `⚠️ 오류: ${e instanceof Error ? e.message : String(e)}`, replace_original: false });
    }
  });
}

(async () => {
  await app.start();
  console.log("🚀 HITL Socket Mode 서버 시작됨");
  console.log("  WebSocket으로 Slack 연결 — 공개 URL 불필요");
})();

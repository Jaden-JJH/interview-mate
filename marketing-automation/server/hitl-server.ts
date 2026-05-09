// Express HITL 서버 — Slack 인터랙티브 버튼 콜백 수신 (Cloudflare Tunnel 경유)
import "../lib/env.js";
import express from "express";
import { verifySlackSignature } from "./verify-slack.js";
import { handleApprove, handleReject, handleRegenerate } from "./slack-actions.js";
import { env } from "../lib/env.js";

const app = express();

app.use(
  express.urlencoded({
    extended: true,
    verify: (req, _res, buf) => {
      (req as express.Request & { rawBody?: Buffer }).rawBody = buf;
    },
  }),
);
app.use(
  express.json({
    verify: (req, _res, buf) => {
      (req as express.Request & { rawBody?: Buffer }).rawBody = buf;
    },
  }),
);

app.get("/health", (_req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

app.post("/slack/actions", verifySlackSignature, async (req, res) => {
  try {
    const payload = JSON.parse(req.body.payload);
    const action = payload.actions?.[0];
    if (!action) {
      res.status(400).json({ error: "No action" });
      return;
    }

    const [actionType, masterIdStr] = (action.action_id as string).split(":");
    const masterId = Number(masterIdStr);
    if (!masterId) {
      res.status(400).json({ error: "Invalid master_id" });
      return;
    }

    const user = payload.user?.username ?? "unknown";
    console.log(`[HITL] ${user} → ${actionType} master_id=${masterId}`);

    res.json({ text: `${actionType} 처리 중...` });

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

    await updateSlackMessage(payload.response_url, result.text, actionType, user);
  } catch (e) {
    console.error("[HITL] Action error:", e);
    if (!res.headersSent) {
      res.status(500).json({ error: "Internal error" });
    }
  }
});

async function updateSlackMessage(
  responseUrl: string,
  resultText: string,
  action: string,
  user: string,
): Promise<void> {
  const emoji = action === "approve" ? "✅" : action === "reject" ? "❌" : "🔄";
  try {
    await fetch(responseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        replace_original: false,
        text: `${emoji} *${action}* by @${user}\n${resultText}`,
      }),
    });
  } catch (e) {
    console.error("[HITL] Failed to update Slack message:", e);
  }
}

const PORT = Number(process.env["HITL_PORT"] ?? 3100);
app.listen(PORT, () => {
  console.log(`🚀 HITL server listening on :${PORT}`);
  console.log(`  health: http://localhost:${PORT}/health`);
  console.log(`  slack:  http://localhost:${PORT}/slack/actions`);
  if (!env.slack.botToken) console.warn("  ⚠ SLACK_BOT_TOKEN not set — interactive messages disabled");
  if (!env.slack.signingSecret) console.warn("  ⚠ SLACK_SIGNING_SECRET not set — signature verification will fail");
});

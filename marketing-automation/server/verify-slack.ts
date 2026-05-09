// Slack request signature 검증 미들웨어 — Signing Secret으로 HMAC-SHA256 확인
import { createHmac, timingSafeEqual } from "node:crypto";
import type { Request, Response, NextFunction } from "express";
import { env } from "../lib/env.js";

const MAX_AGE_SECONDS = 300;

export function verifySlackSignature(req: Request, res: Response, next: NextFunction): void {
  const secret = env.slack.signingSecret;
  if (!secret) {
    res.status(500).json({ error: "SLACK_SIGNING_SECRET not configured" });
    return;
  }

  const timestamp = req.headers["x-slack-request-timestamp"] as string | undefined;
  const signature = req.headers["x-slack-signature"] as string | undefined;

  if (!timestamp || !signature) {
    res.status(400).json({ error: "Missing Slack signature headers" });
    return;
  }

  const age = Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp));
  if (age > MAX_AGE_SECONDS) {
    res.status(400).json({ error: "Request too old" });
    return;
  }

  const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;
  if (!rawBody) {
    res.status(400).json({ error: "Missing raw body" });
    return;
  }

  const sigBaseString = `v0:${timestamp}:${rawBody.toString("utf8")}`;
  const expected = "v0=" + createHmac("sha256", secret).update(sigBaseString).digest("hex");

  if (!timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) {
    res.status(401).json({ error: "Invalid signature" });
    return;
  }

  next();
}

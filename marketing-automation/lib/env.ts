import { config } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

config({ path: resolve(__dirname, "../../.env.local") });

function need(k: string): string {
  const v = process.env[k];
  if (!v) throw new Error(`환경변수 누락: ${k}`);
  return v;
}

function optional(k: string): string | undefined {
  return process.env[k] || undefined;
}

export const env = {
  threads: {
    longToken: need("THREADS_LONG_TOKEN"),
    userId: need("THREADS_USER_ID"),
    appId: need("THREADS_APP_ID"),
    appSecret: need("THREADS_APP_SECRET"),
  },
  meta: {
    accessToken: need("META_ACCESS_TOKEN"),
    appId: need("META_APP_ID"),
    appSecret: need("META_APP_SECRET"),
  },
  instagram: {
    // 옵션 A: FB Graph 경유. INSTAGRAM_ACCOUNT_ID = IG biz account id.
    accountId: need("INSTAGRAM_ACCOUNT_ID"),
  },
  anthropic: {
    apiKey: need("ANTHROPIC_API_KEY"),
  },
  slack: {
    webhookUrl: optional("SLACK_WEBHOOK_URL"),
    botToken: optional("SLACK_BOT_TOKEN"),
    appToken: optional("SLACK_APP_TOKEN"),
  },
  youtube: {
    apiKey: optional("YOUTUBE_API_KEY"),
  },
};

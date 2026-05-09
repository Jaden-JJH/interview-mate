import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = resolve(__dirname, "../data/queue.sqlite");

mkdirSync(dirname(DB_PATH), { recursive: true });

export const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

export type QueueRow = {
  id: number;
  account: string;
  channel: string;
  text: string;
  media_url: string | null;
  topic: string | null;
  format: string | null;
  has_link: 0 | 1;
  utm_campaign: string | null;
  scheduled_at: string;
  status: "pending" | "publishing" | "published" | "failed" | "skipped";
  created_at: string;
  attempts: number;
  last_error: string | null;
};

export type PublishedRow = {
  id: number;
  queue_id: number;
  account: string;
  channel: string;
  platform_media_id: string;
  permalink: string | null;
  published_at: string;
};

import "../lib/env.js";
import { db } from "../lib/db.js";

const failed = db.prepare(`
  UPDATE content_queue
  SET status = 'skipped'
  WHERE status = 'failed'
    AND channel IN ('instagram', 'threads', 'facebook')
`).run();

console.log("failed 정리:", failed.changes, "건");

const fbPending = db.prepare(`
  UPDATE content_queue
  SET status = 'skipped'
  WHERE channel = 'facebook'
    AND status = 'pending'
`).run();

console.log("FB pending 스킵:", fbPending.changes, "건");

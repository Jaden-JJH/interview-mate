import "../lib/env.js";
import { sendHitlMessage } from "../lib/slack.js";
import { db } from "../lib/db.js";

async function main() {
  const m = db.prepare(
    "SELECT * FROM master_contents WHERE id = 3"
  ).get() as any;

  const v = db.prepare(`
    SELECT text, media_spec
    FROM content_variants
    WHERE master_id = 3
      AND channel = 'instagram'
    ORDER BY id DESC
    LIMIT 1
  `).get() as any;

  const cards = v.media_spec
    ? JSON.parse(v.media_spec)
    : [];

  await sendHitlMessage({
    masterId: 3,
    headline: m.headline,
    topicSlug: m.topic_slug,
    qualityPass: true,
    caption: v.text,
    cards,
  });

  console.log("전송 완료");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

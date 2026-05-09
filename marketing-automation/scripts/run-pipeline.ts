// W2 파이프라인 1회 실행 — 수집→Master→Threads·IG 변환→품질 게이트→Slack HITL 알림

import "../lib/env.js";
import { collectAndSelectTopic, registerDedupSlug } from "../agents/data-collector.js";
import { writeMasterContent } from "../agents/master-writer.js";
import { transformToThreads } from "../agents/transformer-threads.js";
import { transformToIg } from "../agents/transformer-ig.js";
import { runQualityGate } from "../guards/quality-gate.js";
import { sendSlack } from "../lib/slack.js";
import { db } from "../lib/db.js";

async function main() {
  console.log("🚀 W2 파이프라인 시작:", new Date().toISOString());

  // Step 1: 주제 선정 (Haiku)
  console.log("\n[Step 1] 주제 선정 (Haiku)");
  const topic = await collectAndSelectTopic();
  if (!topic) {
    const msg = "⚠️ W2 파이프라인: 오늘 발행할 주제를 찾지 못했습니다. source_articles 데이터 확인 필요.";
    console.log("  · 주제 없음. 종료.");
    await sendSlack(msg);
    return;
  }
  console.log(`  ✓ 주제: ${topic.headline} (${topic.slug}), 기사 ${topic.selectedIds.length}건`);

  // Step 2: Master Content 생성 (Sonnet)
  console.log("\n[Step 2] Master Content 생성 (Sonnet)");
  const master = await writeMasterContent(topic.slug, topic.headline, topic.selectedIds);
  if (!master) {
    const msg = `❌ W2 파이프라인: Master Content 생성 실패 (주제: ${topic.headline}). dedup 미등록 — 다음 사이클 재시도 가능.`;
    console.log("  · 생성 실패");
    await sendSlack(msg);
    return;
  }
  console.log(`  ✓ Master [id=${master.id}]: ${master.headline} (${master.body.length}자)`);

  // Master 저장 성공 — 이제 dedup_index 등록(24h 재발행 차단).
  registerDedupSlug(topic.slug);

  // Step 3: Threads 변환 (Sonnet)
  console.log("\n[Step 3] Threads 변환 (Sonnet)");
  const threadsPosts = await transformToThreads(master);
  console.log(`  ✓ Threads ${threadsPosts.length}편 생성`);

  // Step 4: IG 변환 (Sonnet)
  console.log("\n[Step 4] Instagram 변환 (Sonnet)");
  const igVariant = await transformToIg(master);
  console.log(igVariant ? `  ✓ IG 캡션 + 카드 ${igVariant.cards.length}장` : "  · IG 변환 실패");

  // Step 5: 품질 게이트 (Haiku)
  console.log("\n[Step 5] 품질 게이트 (Haiku)");
  const allTexts = [
    ...threadsPosts.map((p) => p.text),
    ...(igVariant ? [igVariant.caption] : []),
  ];

  let allPass = true;
  for (const text of allTexts) {
    const result = await runQualityGate(text);
    if (!result.pass) {
      allPass = false;
      console.log(`  ✗ 불합격 (${result.naturalScore}점): ${result.issues.join(", ")}`);
    } else {
      console.log(`  ✓ 통과 (${result.naturalScore}점)`);
    }
  }

  db.prepare("UPDATE master_contents SET status = ? WHERE id = ?").run(
    allPass ? "approved" : "failed",
    master.id
  );
  if (allPass) {
    db.prepare(
      "UPDATE content_variants SET status = 'approved' WHERE master_id = ? AND status = 'draft'"
    ).run(master.id);
  } else {
    // 품질 게이트 실패 — 'draft' 잔류 변형도 'failed'로 일관 처리 (publisher 누수 방지).
    db.prepare(
      "UPDATE content_variants SET status = 'failed' WHERE master_id = ? AND status = 'draft'"
    ).run(master.id);
  }

  console.log(`\n  품질 게이트: ${allPass ? "✓ 전체 통과" : "✗ 일부 실패"}`);

  // Step 6: Slack HITL 알림
  const threadsPreview = threadsPosts
    .map((p, i) => `편 ${i + 1}: ${p.text.slice(0, 80)}${p.text.length > 80 ? "..." : ""}`)
    .join("\n");

  const slackMsg = [
    `📝 *W2 콘텐츠 초안 준비됨* (${allPass ? "품질 통과 ✅" : "품질 실패 ⚠️"})`,
    `*주제:* ${master.headline}`,
    `*슬러그:* ${topic.slug}  |  *master_id:* ${master.id}`,
    "",
    `*Threads ${threadsPosts.length}편:*`,
    threadsPreview,
    "",
    `*IG 캡션:* ${igVariant?.caption.slice(0, 100) ?? "생성 실패"}${(igVariant?.caption.length ?? 0) > 100 ? "..." : ""}`,
    "",
    `확인: \`npx tsx scripts/queue-list.ts\``,
  ].join("\n");

  await sendSlack(slackMsg);
  console.log("\n✓ Slack 알림 전송");
  console.log(`\n✅ 파이프라인 완료. master_id=${master.id}`);
  console.log(`  내용 확인: npx tsx scripts/queue-list.ts`);
}

main().catch((e) => {
  console.error("파이프라인 오류:", e);
  sendSlack(`🔥 W2 파이프라인 예외 발생: ${e instanceof Error ? e.message : String(e)}`).finally(
    () => process.exit(1)
  );
});

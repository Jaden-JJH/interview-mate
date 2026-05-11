// W2 파이프라인 1회 실행 — 수집→Master→Threads·IG·Blog 변환→품질 게이트→Slack HITL 알림 + 블로그 파일 업로드

import "../lib/env.js";
import { collectAndSelectTopic, registerDedupSlug } from "../agents/data-collector.js";
import { writeMasterContent } from "../agents/master-writer.js";
import { transformToIg } from "../agents/transformer-ig.js";
import { transformToShorts } from "../agents/transformer-shorts.js";
import { transformToBlog } from "../agents/transformer-blog.js";
import { runQualityGate } from "../guards/quality-gate.js";
import { sendSlack, sendHitlMessage, uploadBlogFile } from "../lib/slack.js";
import { db } from "../lib/db.js";
import { env } from "../lib/env.js";

// 정책: Threads = IG carousel 클론. 별도 텍스트 변환(transformer-threads)은 비활성화.
// IG variant 생성 후 carousel-pipeline에서 IG/Threads 큐 동시 적재.

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

  // Step 3: IG 변환 (Sonnet) — Threads는 carousel 클론으로 동시 발행되므로 별도 변환 없음
  console.log("\n[Step 3] Instagram 변환 (Sonnet)");
  const igVariant = await transformToIg(master);
  console.log(igVariant ? `  ✓ IG 캡션 + 카드 ${igVariant.cards.length}장` : "  · IG 변환 실패");

  // Step 3b: Shorts 변환 (Sonnet) — OPENAI_API_KEY 있을 때만
  let shortsScript = null;
  if (env.openai.apiKey) {
    console.log("\n[Step 3b] YouTube Shorts 각본 변환 (Sonnet)");
    shortsScript = await transformToShorts({
      id: master.id,
      headline: master.headline,
      body: master.body,
      topicSlug: topic.slug,
      keywords: master.keywords ?? [],
    });
    console.log(shortsScript ? `  ✓ Shorts 각본 ${shortsScript.scenes.length}씬` : "  · Shorts 변환 실패");
  } else {
    console.log("\n[Step 3b] Shorts 건너뜀 (OPENAI_API_KEY 미설정)");
  }

  // Step 3c: Blog 변환 (Sonnet) — 항상 실행. Slack 파일 업로드로 전달 (티스토리 수동 발행용)
  console.log("\n[Step 3c] Blog SEO 변환 (Sonnet)");
  let blogVariant = null;
  blogVariant = await transformToBlog(master);
  console.log(blogVariant ? `  ✓ Blog: ${blogVariant.title} (${blogVariant.htmlBody.replace(/<[^>]*>/g, "").length}자)` : "  · Blog 변환 실패");

  // Step 4: 품질 게이트 (Haiku)
  console.log("\n[Step 4] 품질 게이트 (Haiku)");
  const allTexts = igVariant ? [igVariant.caption] : [];
  if (shortsScript) {
    allTexts.push(...shortsScript.scenes.map((s) => s.narration));
  }
  if (blogVariant) {
    allTexts.push(blogVariant.htmlBody.replace(/<[^>]*>/g, ""));
  }

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

  // Step 5: Slack HITL 인터랙티브 메시지 (Bot Token 있으면 버튼, 없으면 텍스트 fallback)
  await sendHitlMessage({
    masterId: master.id,
    headline: master.headline,
    topicSlug: topic.slug,
    qualityPass: allPass,
    caption: igVariant?.caption,
    cards: igVariant?.cards,
    blogTitle: blogVariant?.title,
  });
  console.log("\n✓ Slack HITL 메시지 전송");

  // Step 6: 블로그 초안 HTML 파일 Slack 업로드
  const hitlChannel = process.env["SLACK_HITL_CHANNEL"];
  if (blogVariant && env.slack.botToken && hitlChannel) {
    const date = new Date().toISOString().slice(0, 10);
    const safeSlug = blogVariant.slug.replace(/[^a-z0-9-]/gi, "-").slice(0, 60);
    const imageUrl = blogVariant.htmlBody.match(/src=["']([^"']+)["']/)?.[1] ?? "(없음)";
    const fileContent = [
      `<!-- ===== 인터뷰메이트 블로그 초안 =====`,
      `제목: ${blogVariant.title}`,
      `슬러그: ${blogVariant.slug}`,
      `발췌(메타 디스크립션): ${blogVariant.excerpt}`,
      `키워드: ${blogVariant.keywords.join(", ")}`,
      `대표 이미지 URL: ${imageUrl}`,
      `생성일: ${date}`,
      `===================================== -->`,
      ``,
      blogVariant.htmlBody,
    ].join("\n");

    console.log("\n[Step 6] 블로그 초안 Slack 파일 업로드");
    await uploadBlogFile({
      content: fileContent,
      filename: `blog-${safeSlug}-${date}.html`,
      title: blogVariant.title,
      channel: hitlChannel,
      token: env.slack.botToken,
    });
    console.log("  ✓ 블로그 파일 업로드 완료");
  } else {
    console.log(`\n[Step 6] 블로그 파일 업로드 건너뜀 — blogVariant=${blogVariant ? "있음" : "없음"} botToken=${env.slack.botToken ? "설정" : "미설정"} SLACK_HITL_CHANNEL=${hitlChannel ?? "미설정"}`);
  }

  console.log(`\n✅ 파이프라인 완료. master_id=${master.id}`);
  console.log(`  내용 확인: npx tsx scripts/queue-list.ts`);
}

main().catch((e) => {
  console.error("파이프라인 오류:", e);
  sendSlack(`🔥 W2 파이프라인 예외 발생: ${e instanceof Error ? e.message : String(e)}`).finally(
    () => process.exit(1)
  );
});

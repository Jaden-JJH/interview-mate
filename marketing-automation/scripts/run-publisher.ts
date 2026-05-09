import { runPublisherOnce, runPublisherLoop, type PublisherResult } from "../agents/publisher.js";

function printResult(result: PublisherResult) {
  switch (result.kind) {
    case "no-due":
      console.log("· 발행할 콘텐츠 없음 (due가 도래한 pending 항목 없음)");
      break;
    case "published":
      console.log(`✓ 발행 성공  queue_id=${result.queueId}  media_id=${result.mediaId}  permalink=${result.permalink ?? "(조회 실패)"}`);
      break;
    case "failed":
      console.error(`✗ 발행 실패  queue_id=${result.queueId}  error=${result.error}`);
      break;
  }
}

const allMode = process.argv.includes("--all");

if (allMode) {
  const results = await runPublisherLoop();
  if (results.length === 0) {
    console.log("· 발행할 콘텐츠 없음 (due가 도래한 pending 항목 없음)");
  } else {
    for (const r of results) printResult(r);
    const ok = results.filter((r) => r.kind === "published").length;
    const fail = results.filter((r) => r.kind === "failed").length;
    console.log(`\n총 ${results.length}건 처리 (성공 ${ok} / 실패 ${fail})`);
    if (fail > 0) process.exit(1);
  }
} else {
  const result = await runPublisherOnce();
  printResult(result);
  if (result.kind === "failed") process.exit(1);
}

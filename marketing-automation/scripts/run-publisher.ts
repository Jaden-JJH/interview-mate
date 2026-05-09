import { runPublisherOnce } from "../agents/publisher.js";

const result = await runPublisherOnce();

switch (result.kind) {
  case "no-due":
    console.log("· 발행할 콘텐츠 없음 (due가 도래한 pending 항목 없음)");
    break;
  case "published":
    console.log(`✓ 발행 성공`);
    console.log(`  queue_id: ${result.queueId}`);
    console.log(`  media_id: ${result.mediaId}`);
    console.log(`  permalink: ${result.permalink ?? "(조회 실패)"}`);
    break;
  case "failed":
    console.error(`✗ 발행 실패`);
    console.error(`  queue_id: ${result.queueId}`);
    console.error(`  error: ${result.error}`);
    process.exit(1);
}

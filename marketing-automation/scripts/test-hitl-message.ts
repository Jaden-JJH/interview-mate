// 테스트용 — Slack HITL 인터랙티브 메시지 전송 확인
import "../lib/env.js";
import { sendHitlMessage } from "../lib/slack.js";

const channel = process.argv[2] || "#interview-mate";

async function main() {
  await sendHitlMessage({
    masterId: 999,
    headline: "[테스트] HITL 버튼 테스트",
    topicSlug: "test-hitl",
    qualityPass: true,
    caption: "이것은 테스트 캡션입니다. 버튼 3개가 보이면 성공! #면접준비 #취업",
    cards: [
      { type: "cover", title: "테스트 커버", body: "HITL 인터랙티브 테스트입니다" },
      { type: "insight", title: "테스트 인사이트1", body: "버튼이 잘 동작하는지 확인" },
      { type: "insight", title: "테스트 인사이트2", body: "승인/반려/재생성 버튼 테스트" },
    ],
    channel,
  });
  console.log(`✓ 전송 완료 → ${channel}`);
}

main().catch((e) => {
  console.error("실패:", e);
  process.exit(1);
});

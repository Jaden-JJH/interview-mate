// Slack 알림 헬퍼 — webhook(단방향) + Bot Token(Block Kit 인터랙티브 + 파일 업로드)
import { env } from "./env.js";

export async function sendSlack(text: string): Promise<void> {
  if (!env.slack.webhookUrl) return;
  try {
    await fetch(env.slack.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
  } catch (e) {
    console.error("  · Slack 알림 실패:", e);
  }
}

export type HitlMessageParams = {
  masterId: number;
  headline: string;
  topicSlug: string;
  qualityPass: boolean;
  caption?: string;
  cards?: { type: string; title: string; body: string }[];
  channel?: string;
  blogTitle?: string;
};

export async function sendHitlMessage(params: HitlMessageParams): Promise<void> {
  const token = env.slack.botToken;
  const channel = params.channel ?? process.env["SLACK_HITL_CHANNEL"] ?? "#content-review";

  if (!token) {
    console.warn("  · SLACK_BOT_TOKEN 없음 — webhook 텍스트 fallback");
    await sendSlack(buildFallbackText(params));
    return;
  }

  const blocks = buildBlocks(params);

  try {
    const res = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ channel, blocks, text: `HITL: ${params.headline}` }),
    });
    const data = (await res.json()) as { ok: boolean; error?: string };
    if (!data.ok) console.error("  · Slack postMessage 실패:", data.error);
  } catch (e) {
    console.error("  · Slack HITL 메시지 전송 실패:", e);
  }
}

function buildBlocks(p: HitlMessageParams): object[] {
  const statusEmoji = p.qualityPass ? "✅" : "⚠️";
  const cardsPreview = (p.cards ?? [])
    .map((c, i) => `${i + 1}. [${c.type}] *${c.title}* — ${c.body.slice(0, 40)}`)
    .join("\n");

  return [
    {
      type: "header",
      text: { type: "plain_text", text: `📝 콘텐츠 리뷰 — ${p.headline}`, emoji: true },
    },
    {
      type: "section",
      fields: [
        { type: "mrkdwn", text: `*슬러그:* ${p.topicSlug}` },
        { type: "mrkdwn", text: `*master_id:* ${p.masterId}` },
        { type: "mrkdwn", text: `*품질 게이트:* ${statusEmoji} ${p.qualityPass ? "통과" : "실패"}` },
      ],
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*IG 캡션:*\n${p.caption?.slice(0, 300) ?? "_(생성 실패)_"}${(p.caption?.length ?? 0) > 300 ? "..." : ""}`,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*카드 ${p.cards?.length ?? 0}장 + CTA:*\n${cardsPreview || "_(생성 실패)_"}`,
      },
    },
    ...(p.blogTitle
      ? [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*블로그 초안:* 📎 \`${p.blogTitle}\` — 파일 별도 첨부`,
            },
          },
        ]
      : []),
    { type: "divider" },
    {
      type: "actions",
      elements: [
        {
          type: "button",
          text: { type: "plain_text", text: "✅ 승인 → 큐 적재", emoji: true },
          style: "primary",
          action_id: `approve:${p.masterId}`,
          confirm: {
            title: { type: "plain_text", text: "승인 확인" },
            text: { type: "mrkdwn", text: `master_id=${p.masterId} 을(를) 발행 큐에 적재합니다.` },
            confirm: { type: "plain_text", text: "승인" },
            deny: { type: "plain_text", text: "취소" },
          },
        },
        {
          type: "button",
          text: { type: "plain_text", text: "❌ 반려", emoji: true },
          style: "danger",
          action_id: `reject:${p.masterId}`,
        },
        {
          type: "button",
          text: { type: "plain_text", text: "🔄 재생성", emoji: true },
          action_id: `regenerate:${p.masterId}`,
        },
      ],
    },
  ];
}

function buildFallbackText(p: HitlMessageParams): string {
  const cardsPreview = (p.cards ?? [])
    .map((c, i) => `${i + 1}. [${c.type}] ${c.title} — ${c.body.slice(0, 40)}`)
    .join("\n");
  return [
    `📝 *W2 콘텐츠 초안 준비됨* (${p.qualityPass ? "품질 통과 ✅" : "품질 실패 ⚠️"})`,
    `*주제:* ${p.headline}`,
    `*슬러그:* ${p.topicSlug}  |  *master_id:* ${p.masterId}`,
    "",
    `*IG 캡션:* ${p.caption?.slice(0, 200) ?? "생성 실패"}${(p.caption?.length ?? 0) > 200 ? "..." : ""}`,
    "",
    `*카드 ${p.cards?.length ?? 0}장 + CTA:*`,
    cardsPreview || "(생성 실패)",
    "",
    `발행 정책: IG carousel 4장 → Threads 동일 클론`,
    `승인 후: \`npx tsx scripts/approve-and-queue.ts ${p.masterId}\``,
    ...(p.blogTitle ? [``, `*블로그 초안:* 📎 ${p.blogTitle} — 파일 별도 첨부`] : []),
  ].join("\n");
}

export async function uploadBlogFile(params: {
  content: string;
  filename: string;
  title: string;
  channel: string;
  token: string;
}): Promise<void> {
  const { content, filename, title, channel, token } = params;

  if (!channel.startsWith("C")) {
    console.error(`  · SLACK_HITL_CHANNEL은 채널 ID(C…) 형식이어야 합니다 — 현재값: ${channel}`);
    return;
  }

  try {
    const bytes = Buffer.from(content, "utf-8");

    const urlRes = await fetch("https://slack.com/api/files.getUploadURLExternal", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ filename, length: String(bytes.length) }),
    });
    const urlData = (await urlRes.json()) as { ok: boolean; upload_url?: string; file_id?: string; error?: string };
    if (!urlData.ok || !urlData.upload_url || !urlData.file_id) {
      console.error("  · Slack 파일 업로드 URL 발급 실패:", urlData.error);
      return;
    }

    const uploadRes = await fetch(urlData.upload_url, {
      method: "POST",
      body: bytes,
    });
    if (!uploadRes.ok) {
      console.error("  · Slack 파일 업로드 실패:", uploadRes.status);
      return;
    }

    const completeRes = await fetch("https://slack.com/api/files.completeUploadExternal", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        files: [{ id: urlData.file_id, title }],
        channel_id: channel,
      }),
    });
    const completeData = (await completeRes.json()) as { ok: boolean; error?: string };
    if (!completeData.ok) {
      console.error("  · Slack 파일 채널 공유 실패:", completeData.error);
    }
  } catch (e) {
    console.error("  · Slack 블로그 파일 업로드 실패:", e);
  }
}

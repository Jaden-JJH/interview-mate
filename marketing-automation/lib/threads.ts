import { env } from "./env.js";

const BASE = "https://graph.threads.net/v1.0";

export type PublishResult = {
  mediaId: string;
  permalink: string | null;
};

type JsonRecord = Record<string, any>;

async function postForm(url: string, params: Record<string, string>): Promise<JsonRecord> {
  const body = new URLSearchParams(params);
  const res = await fetch(url, { method: "POST", body });
  const data = (await res.json().catch(() => ({}))) as JsonRecord;
  if (!res.ok) {
    throw new Error(`Threads API ${res.status}: ${JSON.stringify(data)}`);
  }
  return data;
}

async function getJson(url: string): Promise<JsonRecord> {
  const res = await fetch(url);
  const data = (await res.json().catch(() => ({}))) as JsonRecord;
  if (!res.ok) {
    throw new Error(`Threads API ${res.status}: ${JSON.stringify(data)}`);
  }
  return data;
}

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

/**
 * 텍스트 포스트 발행. 2단계: container 생성 → 30초 대기 → publish.
 *
 * Threads 발행 흐름은 비동기라 container가 검증되기까지 짧게 기다려야 함.
 * 운영에선 status 폴링으로 바꿀 수 있으나, Phase 0~1은 단순화.
 *
 * `replyToId`를 주면 해당 Threads 미디어에 답글로 발행. 분할 발행에서 사용.
 */
export async function publishText(
  text: string,
  opts: { replyToId?: string } = {},
): Promise<PublishResult> {
  const userId = env.threads.userId;
  const token = env.threads.longToken;

  const params: Record<string, string> = {
    media_type: "TEXT",
    text,
    access_token: token,
  };
  if (opts.replyToId) params.reply_to_id = opts.replyToId;

  const container = await postForm(`${BASE}/${userId}/threads`, params);

  if (!container.id) throw new Error(`container id 없음: ${JSON.stringify(container)}`);

  await sleep(30_000);

  const published = await postForm(`${BASE}/${userId}/threads_publish`, {
    creation_id: container.id,
    access_token: token,
  });

  if (!published.id) throw new Error(`media id 없음: ${JSON.stringify(published)}`);

  let permalink: string | null = null;
  try {
    const meta = await getJson(
      `${BASE}/${published.id}?fields=permalink,timestamp&access_token=${token}`,
    );
    permalink = meta.permalink ?? null;
  } catch {
    // permalink 조회 실패는 치명적 아님
  }

  return { mediaId: published.id, permalink };
}

/**
 * 이미지 포스트 발행. IG 카드뉴스 클론용.
 * container 생성 → 상태 폴링(최대 60초) → publish.
 */
export async function publishImage(
  text: string,
  imageUrl: string,
): Promise<PublishResult> {
  const userId = env.threads.userId;
  const token = env.threads.longToken;

  const container = await postForm(`${BASE}/${userId}/threads`, {
    media_type: "IMAGE",
    image_url: imageUrl,
    text,
    access_token: token,
  });

  if (!container.id) throw new Error(`container id 없음: ${JSON.stringify(container)}`);

  for (let i = 0; i < 12; i++) {
    await sleep(5_000);
    const status = await getJson(
      `${BASE}/${container.id}?fields=status&access_token=${token}`,
    );
    if (status.status === "FINISHED") break;
    if (status.status === "ERROR" || status.status === "EXPIRED") {
      throw new Error(`container ${status.status}: ${JSON.stringify(status)}`);
    }
  }

  const published = await postForm(`${BASE}/${userId}/threads_publish`, {
    creation_id: container.id,
    access_token: token,
  });

  if (!published.id) throw new Error(`media id 없음: ${JSON.stringify(published)}`);

  let permalink: string | null = null;
  try {
    const meta = await getJson(`${BASE}/${published.id}?fields=permalink&access_token=${token}`);
    permalink = meta.permalink ?? null;
  } catch {
    // permalink 조회 실패는 치명적 아님
  }

  return { mediaId: published.id, permalink };
}

/**
 * 토큰이 살아있는지 빠른 확인. /me 호출.
 */
export async function pingThreads(): Promise<{ id: string; username: string }> {
  const meta = await getJson(
    `${BASE}/me?fields=id,username&access_token=${env.threads.longToken}`,
  );
  return { id: meta.id, username: meta.username };
}

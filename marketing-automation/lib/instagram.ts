import { env } from "./env.js";

const FB = "https://graph.facebook.com/v21.0";

type JsonRecord = Record<string, any>;

async function postForm(url: string, params: Record<string, string>): Promise<JsonRecord> {
  const res = await fetch(url, { method: "POST", body: new URLSearchParams(params) });
  const data = (await res.json().catch(() => ({}))) as JsonRecord;
  if (!res.ok) throw new Error(`IG API ${res.status}: ${JSON.stringify(data)}`);
  return data;
}

async function getJson(url: string): Promise<JsonRecord> {
  const res = await fetch(url);
  const data = (await res.json().catch(() => ({}))) as JsonRecord;
  if (!res.ok) throw new Error(`IG API ${res.status}: ${JSON.stringify(data)}`);
  return data;
}

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

let cachedPageToken: { token: string; pageId: string } | null = null;

/**
 * INSTAGRAM_ACCOUNT_ID를 소유한 페이스북 페이지를 찾아 그 페이지의 access_token을 반환.
 * 페이지 토큰은 만료 없음(`expires_at=0`)이라 첫 호출 후 메모리에 캐시.
 */
export async function getPageAccessToken(): Promise<{ token: string; pageId: string }> {
  if (cachedPageToken) return cachedPageToken;

  const data = await getJson(
    `${FB}/me/accounts?fields=id,name,access_token,instagram_business_account&access_token=${env.meta.accessToken}`,
  );
  const pages = (data.data || []) as JsonRecord[];
  const owner = pages.find(
    (p) => p.instagram_business_account?.id === env.instagram.accountId,
  );
  if (!owner) {
    throw new Error(
      `INSTAGRAM_ACCOUNT_ID(${env.instagram.accountId})를 소유한 페이지 없음. 페이지 목록: ${pages.map((p) => `${p.name}/${p.id}`).join(", ")}`,
    );
  }
  cachedPageToken = { token: owner.access_token, pageId: owner.id };
  return cachedPageToken;
}

export type IgPublishResult = {
  mediaId: string;
  permalink: string | null;
};

/**
 * IG 단일 이미지 발행. FB Graph 경유 2단계.
 *
 * IG는 텍스트 단독 발행 불가. image_url은 공개 URL(HTTPS)이어야 함 — 로컬 파일은 미리 업로드 필요.
 * Phase 2에서 이미지 자동 생성 + Vercel Blob/공개 호스팅 흐름 추가 예정.
 */
export async function publishImage(caption: string, imageUrl: string): Promise<IgPublishResult> {
  const { token } = await getPageAccessToken();
  const igId = env.instagram.accountId;

  const container = await postForm(`${FB}/${igId}/media`, {
    image_url: imageUrl,
    caption,
    access_token: token,
  });
  if (!container.id) throw new Error(`container id 없음: ${JSON.stringify(container)}`);

  // 컨테이너 검증 폴링 — 최대 60초
  for (let i = 0; i < 12; i++) {
    await sleep(5_000);
    const status = await getJson(
      `${FB}/${container.id}?fields=status_code,status&access_token=${token}`,
    );
    if (status.status_code === "FINISHED") break;
    if (status.status_code === "ERROR" || status.status_code === "EXPIRED") {
      throw new Error(`container ${status.status_code}: ${JSON.stringify(status)}`);
    }
  }

  const published = await postForm(`${FB}/${igId}/media_publish`, {
    creation_id: container.id,
    access_token: token,
  });
  if (!published.id) throw new Error(`media id 없음: ${JSON.stringify(published)}`);

  let permalink: string | null = null;
  try {
    const meta = await getJson(
      `${FB}/${published.id}?fields=permalink,timestamp&access_token=${token}`,
    );
    permalink = meta.permalink ?? null;
  } catch {
    // permalink 조회 실패는 치명적 아님
  }

  return { mediaId: published.id, permalink };
}

/**
 * IG carousel 발행 — 2~10장. FB Graph 3단계.
 * 1) child container N개 (is_carousel_item=true)
 * 2) CAROUSEL parent (children=child IDs)
 * 3) media_publish
 */
export async function publishCarousel(
  caption: string,
  imageUrls: string[]
): Promise<IgPublishResult> {
  if (imageUrls.length < 2 || imageUrls.length > 10) {
    throw new Error(`IG carousel은 2~10장만 지원: 입력 ${imageUrls.length}장`);
  }
  const { token } = await getPageAccessToken();
  const igId = env.instagram.accountId;

  // 1단계: child container N개
  const childIds: string[] = [];
  for (const url of imageUrls) {
    const child = await postForm(`${FB}/${igId}/media`, {
      image_url: url,
      is_carousel_item: "true",
      access_token: token,
    });
    if (!child.id) throw new Error(`child container id 없음: ${JSON.stringify(child)}`);
    childIds.push(child.id);
  }

  // 모든 child가 FINISHED 될 때까지 대기 (각 60초 한도)
  for (const id of childIds) {
    for (let i = 0; i < 12; i++) {
      await sleep(5_000);
      const status = await getJson(
        `${FB}/${id}?fields=status_code&access_token=${token}`,
      );
      if (status.status_code === "FINISHED") break;
      if (status.status_code === "ERROR" || status.status_code === "EXPIRED") {
        throw new Error(`child container ${id} ${status.status_code}: ${JSON.stringify(status)}`);
      }
    }
  }

  // 2단계: CAROUSEL parent
  const parent = await postForm(`${FB}/${igId}/media`, {
    media_type: "CAROUSEL",
    caption,
    children: childIds.join(","),
    access_token: token,
  });
  if (!parent.id) throw new Error(`carousel parent id 없음: ${JSON.stringify(parent)}`);

  // parent 검증
  for (let i = 0; i < 12; i++) {
    await sleep(5_000);
    const status = await getJson(
      `${FB}/${parent.id}?fields=status_code&access_token=${token}`,
    );
    if (status.status_code === "FINISHED") break;
    if (status.status_code === "ERROR" || status.status_code === "EXPIRED") {
      throw new Error(`carousel parent ${status.status_code}: ${JSON.stringify(status)}`);
    }
  }

  // 3단계: publish
  const published = await postForm(`${FB}/${igId}/media_publish`, {
    creation_id: parent.id,
    access_token: token,
  });
  if (!published.id) throw new Error(`media id 없음: ${JSON.stringify(published)}`);

  let permalink: string | null = null;
  try {
    const meta = await getJson(
      `${FB}/${published.id}?fields=permalink,timestamp&access_token=${token}`,
    );
    permalink = meta.permalink ?? null;
  } catch {
    // permalink 조회 실패는 치명적 아님
  }

  return { mediaId: published.id, permalink };
}

/**
 * 토큰/계정 헬스체크. 발행 안 함.
 */
export async function pingInstagram(): Promise<{ id: string; username: string }> {
  const { token } = await getPageAccessToken();
  const data = await getJson(
    `${FB}/${env.instagram.accountId}?fields=id,username&access_token=${token}`,
  );
  return { id: data.id, username: data.username };
}

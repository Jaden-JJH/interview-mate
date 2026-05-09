// Facebook Page 멀티포토 발행 — IG getPageAccessToken 재사용

import { getPageAccessToken } from "./instagram.js";

const FB = "https://graph.facebook.com/v21.0";

type JsonRecord = Record<string, any>;

async function postForm(url: string, params: Record<string, string>): Promise<JsonRecord> {
  const res = await fetch(url, { method: "POST", body: new URLSearchParams(params) });
  const data = (await res.json().catch(() => ({}))) as JsonRecord;
  if (!res.ok) throw new Error(`FB API ${res.status}: ${JSON.stringify(data)}`);
  return data;
}

async function getJson(url: string): Promise<JsonRecord> {
  const res = await fetch(url);
  const data = (await res.json().catch(() => ({}))) as JsonRecord;
  if (!res.ok) throw new Error(`FB API ${res.status}: ${JSON.stringify(data)}`);
  return data;
}

export type FbPublishResult = {
  mediaId: string;
  permalink: string | null;
};

/**
 * Facebook Page에 멀티포토 게시물 발행.
 * 1) 각 이미지를 unpublished photo로 업로드
 * 2) feed post에 attached_media로 묶어 발행
 */
export async function publishMultiPhoto(
  message: string,
  imageUrls: string[],
): Promise<FbPublishResult> {
  if (imageUrls.length === 0) {
    throw new Error("facebook 채널은 이미지 1장 이상 필수");
  }
  const { token, pageId } = await getPageAccessToken();

  const photoIds: string[] = [];
  for (const url of imageUrls) {
    const photo = await postForm(`${FB}/${pageId}/photos`, {
      url,
      published: "false",
      access_token: token,
    });
    if (!photo.id) throw new Error(`FB photo upload 실패: ${JSON.stringify(photo)}`);
    photoIds.push(photo.id);
  }

  const params: Record<string, string> = {
    message,
    access_token: token,
  };
  for (let i = 0; i < photoIds.length; i++) {
    params[`attached_media[${i}]`] = JSON.stringify({ media_fbid: photoIds[i] });
  }

  const post = await postForm(`${FB}/${pageId}/feed`, params);
  if (!post.id) throw new Error(`FB feed post 실패: ${JSON.stringify(post)}`);

  let permalink: string | null = null;
  try {
    const meta = await getJson(
      `${FB}/${post.id}?fields=permalink_url&access_token=${token}`,
    );
    permalink = meta.permalink_url ?? null;
  } catch {
    // permalink 조회 실패는 치명적 아님
  }

  return { mediaId: post.id, permalink };
}

export async function pingFacebook(): Promise<{ id: string; name: string }> {
  const { token, pageId } = await getPageAccessToken();
  const data = await getJson(
    `${FB}/${pageId}?fields=id,name&access_token=${token}`,
  );
  return { id: data.id, name: data.name };
}

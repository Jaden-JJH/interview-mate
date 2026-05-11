// WordPress REST API 어댑터 — Application Password 인증 + 포스트 CRUD + 미디어 업로드

import { env } from "./env.js";

type JsonRecord = Record<string, any>;

const wpUrl = () => `${env.wordpress.siteUrl}/wp-json/wp/v2`;

function authHeaders(): Record<string, string> {
  const credentials = Buffer.from(
    `${env.wordpress.username}:${env.wordpress.appPassword}`,
  ).toString("base64");
  return {
    Authorization: `Basic ${credentials}`,
    "Content-Type": "application/json",
  };
}

export type WpPostInput = {
  title: string;
  content: string;
  excerpt?: string;
  slug?: string;
  status?: "publish" | "draft" | "pending";
  categories?: number[];
  tags?: number[];
  featured_media?: number;
  meta?: Record<string, string>;
};

export type WpPostResult = {
  id: number;
  link: string;
  status: string;
};

export async function createPost(input: WpPostInput): Promise<WpPostResult> {
  const res = await fetch(`${wpUrl()}/posts`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      title: input.title,
      content: input.content,
      excerpt: input.excerpt ?? "",
      slug: input.slug,
      status: input.status ?? "publish",
      categories: input.categories,
      tags: input.tags,
      featured_media: input.featured_media,
      meta: input.meta,
    }),
  });
  const data = (await res.json()) as JsonRecord;
  if (!res.ok) {
    throw new Error(`WP createPost ${res.status}: ${JSON.stringify(data)}`);
  }
  return { id: data.id, link: data.link, status: data.status };
}

export async function updatePost(
  postId: number,
  input: Partial<WpPostInput>,
): Promise<WpPostResult> {
  const res = await fetch(`${wpUrl()}/posts/${postId}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(input),
  });
  const data = (await res.json()) as JsonRecord;
  if (!res.ok) {
    throw new Error(`WP updatePost ${res.status}: ${JSON.stringify(data)}`);
  }
  return { id: data.id, link: data.link, status: data.status };
}

export async function uploadMedia(
  imageUrl: string,
  filename: string,
  altText?: string,
): Promise<{ id: number; source_url: string }> {
  const imgRes = await fetch(imageUrl);
  if (!imgRes.ok) throw new Error(`이미지 다운로드 실패: ${imageUrl}`);
  const blob = await imgRes.arrayBuffer();

  const contentType = imgRes.headers.get("content-type") ?? "image/png";
  const credentials = Buffer.from(
    `${env.wordpress.username}:${env.wordpress.appPassword}`,
  ).toString("base64");

  const res = await fetch(`${wpUrl()}/media`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Type": contentType,
    },
    body: blob,
  });
  const data = (await res.json()) as JsonRecord;
  if (!res.ok) {
    throw new Error(`WP uploadMedia ${res.status}: ${JSON.stringify(data)}`);
  }

  if (altText) {
    await fetch(`${wpUrl()}/media/${data.id}`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify({ alt_text: altText }),
    });
  }

  return { id: data.id, source_url: data.source_url };
}

export async function pingWordPress(): Promise<{ name: string; url: string }> {
  const res = await fetch(`${env.wordpress.siteUrl}/wp-json`);
  if (!res.ok) throw new Error(`WP ping 실패: ${res.status}`);
  const data = (await res.json()) as JsonRecord;
  return { name: data.name, url: data.url };
}

export async function findOrCreateTag(name: string): Promise<number> {
  const searchRes = await fetch(
    `${wpUrl()}/tags?search=${encodeURIComponent(name)}`,
    { headers: authHeaders() },
  );
  const tags = (await searchRes.json()) as JsonRecord[];
  if (Array.isArray(tags) && tags.length > 0) return tags[0].id;

  const createRes = await fetch(`${wpUrl()}/tags`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ name }),
  });
  const created = (await createRes.json()) as JsonRecord;
  if (!createRes.ok) throw new Error(`WP tag 생성 실패: ${JSON.stringify(created)}`);
  return created.id;
}

export async function findOrCreateCategory(name: string): Promise<number> {
  const searchRes = await fetch(
    `${wpUrl()}/categories?search=${encodeURIComponent(name)}`,
    { headers: authHeaders() },
  );
  const cats = (await searchRes.json()) as JsonRecord[];
  if (Array.isArray(cats) && cats.length > 0) return cats[0].id;

  const createRes = await fetch(`${wpUrl()}/categories`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ name }),
  });
  const created = (await createRes.json()) as JsonRecord;
  if (!createRes.ok) throw new Error(`WP category 생성 실패: ${JSON.stringify(created)}`);
  return created.id;
}

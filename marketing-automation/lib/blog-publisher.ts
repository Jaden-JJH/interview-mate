// 블로그 발행 — content_queue(channel='blog') → WordPress REST API 포스트 생성

import { db } from "./db.js";
import { env } from "./env.js";
import {
  createPost,
  uploadMedia,
  findOrCreateTag,
  findOrCreateCategory,
  type WpPostInput,
} from "./wordpress.js";

type BlogSpec = {
  title: string;
  slug: string;
  excerpt: string;
  htmlBody: string;
  keywords: string[];
  unsplashImage?: { url: string; alt: string } | null;
};

type VariantRow = { media_spec: string };

export async function publishBlogPost(
  queueId: number,
): Promise<{ mediaId: string; permalink: string | null }> {
  if (!env.wordpress.siteUrl || !env.wordpress.appPassword) {
    throw new Error("WORDPRESS_SITE_URL 또는 WORDPRESS_APP_PASSWORD 미설정");
  }

  const variant = db
    .prepare<[number], VariantRow>(
      `SELECT cv.media_spec FROM content_variants cv
       JOIN content_queue cq ON CAST(cq.topic AS INTEGER) = cv.master_id
       WHERE cq.id = ? AND cv.channel = 'blog'
       ORDER BY cv.id DESC LIMIT 1`,
    )
    .get(queueId);

  if (!variant?.media_spec) {
    throw new Error(`blog variant 조회 실패 (queue_id=${queueId})`);
  }

  const spec: BlogSpec = JSON.parse(variant.media_spec);

  // featured image 업로드 (Unsplash 이미지 or 카드뉴스)
  let featuredMediaId: number | undefined;
  if (spec.unsplashImage?.url) {
    try {
      const media = await uploadMedia(
        spec.unsplashImage.url,
        `${spec.slug}-featured.jpg`,
        spec.unsplashImage.alt,
      );
      featuredMediaId = media.id;
    } catch (e) {
      console.error("  · WP featured image 업로드 실패:", e);
    }
  }

  // 태그 생성/조회
  const tagIds: number[] = [];
  for (const kw of spec.keywords.slice(0, 5)) {
    try {
      tagIds.push(await findOrCreateTag(kw));
    } catch {
      // 태그 생성 실패 무시
    }
  }

  // 카테고리: "면접" 기본
  let categoryId: number | undefined;
  try {
    categoryId = await findOrCreateCategory("면접·취업");
  } catch {
    // 카테고리 실패 무시
  }

  const postInput: WpPostInput = {
    title: spec.title,
    content: spec.htmlBody,
    excerpt: spec.excerpt,
    slug: spec.slug,
    status: "publish",
    featured_media: featuredMediaId,
    tags: tagIds.length > 0 ? tagIds : undefined,
    categories: categoryId ? [categoryId] : undefined,
  };

  const result = await createPost(postInput);
  return { mediaId: String(result.id), permalink: result.link };
}

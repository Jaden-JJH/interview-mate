/**
 * wanted.ts — 원티드랩 블로그 어댑터
 *
 * 원티드 블로그(blog.wantedlab.com)는 공식 RSS 피드를 제공하지 않는다.
 * (404 확인: https://blog.wantedlab.com/rss.xml, /feed 등 모두 없음)
 *
 * 대안: 원티드 공식 채용 공고 RSS는 없으나,
 * 원티드랩 공식 블로그 페이지를 주기적으로 scrape하는 방식만 가능.
 *
 * 현재 구현: HTTP fetch + HTML 파싱으로 최신 포스트 목록 추출.
 * (robots.txt 확인 필요 시 https://blog.wantedlab.com/robots.txt 참고)
 *
 * TOS 위험도: 중간 — 공개 블로그이나 공식 RSS 없음, 저속 폴링 권장
 * 일 한도: 자체 제한 없음 (폴링 간격 최소 1시간 권장)
 * 권장 여부: 조건부 (RSS 제공 시 전환)
 */

import type { SourceArticle } from "./types.js";
import { makeDedupHash } from "./types.js";

const BLOG_BASE = "https://blog.wantedlab.com";

interface WantedPost {
  title: string;
  url: string;
  publishedAt: string;
  excerpt: string;
}

/**
 * blog.wantedlab.com의 Next.js __NEXT_DATA__ JSON에서
 * 블로그 포스트 목록을 추출한다.
 *
 * Next.js 기반 사이트이므로 SSR 페이로드를 파싱 가능.
 */
async function scrapeWantedBlog(): Promise<WantedPost[]> {
  const res = await fetch(BLOG_BASE, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; InterviewMateBot/1.0; +https://interview-mate.kr)",
      Accept: "text/html",
    },
  });

  if (!res.ok) {
    throw new Error(`Wanted blog fetch failed: ${res.status}`);
  }

  const html = await res.text();

  // Next.js SSR 페이로드 추출
  const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
  if (!match) {
    throw new Error("Wanted blog: __NEXT_DATA__ not found");
  }

  const nextData = JSON.parse(match[1]) as Record<string, unknown>;

  // 페이지 구조에 따라 posts 배열 위치 탐색
  const props = (nextData?.props as Record<string, unknown>)?.pageProps as
    | Record<string, unknown>
    | undefined;

  const posts = (
    (props?.posts as WantedPost[]) ??
    (props?.data as Record<string, unknown>)?.posts ??
    []
  ) as WantedPost[];

  return posts;
}

export async function fetchArticles(): Promise<SourceArticle[]> {
  const posts = await scrapeWantedBlog();

  return posts.map((post) => {
    const url = post.url.startsWith("http")
      ? post.url
      : `${BLOG_BASE}${post.url}`;
    const title = post.title?.trim() ?? "";
    return {
      source: "wanted-blog",
      url,
      title,
      content: post.excerpt?.trim() ?? "",
      publishedAt: post.publishedAt ? new Date(post.publishedAt) : new Date(),
      lang: "ko" as const,
      dedup_hash: makeDedupHash(url, title),
    };
  });
}

// Unsplash 무료 이미지 검색 — 블로그 본문 삽입용 (attribution 자동 포함)

import { env } from "./env.js";

export type UnsplashImage = {
  url: string;
  thumbUrl: string;
  alt: string;
  attribution: string;
  downloadLink: string;
};

export async function searchImage(query: string): Promise<UnsplashImage | null> {
  const accessKey = env.unsplash?.accessKey;
  if (!accessKey) return null;

  const res = await fetch(
    `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`,
    { headers: { Authorization: `Client-ID ${accessKey}` } },
  );
  if (!res.ok) return null;

  const data = (await res.json()) as { results?: any[] };
  const photo = data.results?.[0];
  if (!photo) return null;

  // Unsplash API guideline: trigger download endpoint
  if (photo.links?.download_location) {
    fetch(photo.links.download_location, {
      headers: { Authorization: `Client-ID ${accessKey}` },
    }).catch(() => {});
  }

  return {
    url: photo.urls.regular,
    thumbUrl: photo.urls.thumb,
    alt: photo.alt_description ?? query,
    attribution: `Photo by <a href="${photo.user.links.html}?utm_source=interview-mate&utm_medium=referral">${photo.user.name}</a> on <a href="https://unsplash.com/?utm_source=interview-mate&utm_medium=referral">Unsplash</a>`,
    downloadLink: photo.links.download_location,
  };
}

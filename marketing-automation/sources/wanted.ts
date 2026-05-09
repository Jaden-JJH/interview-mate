// 원티드 블로그 어댑터 — 비활성화 (사이트가 Next.js → 정적 전환, __NEXT_DATA__ 영구 소멸)

import type { SourceArticle } from "./types.js";

export async function fetchArticles(): Promise<SourceArticle[]> {
  return [];
}

import { createHash } from "node:crypto";

export interface SourceArticle {
  source: string;
  url: string;
  title: string;
  content: string;
  publishedAt: Date;
  lang: "ko" | "en";
  dedup_hash: string; // SHA-256 of url+title
}

/** 공통 유틸: url + title 조합으로 dedup_hash 생성 */
export function makeDedupHash(url: string, title: string): string {
  return createHash("sha256").update(url + title).digest("hex");
}

// W7 블로그 변환기 — Master Content → SEO long-form HTML (티스토리/WordPress 발행용)

import Anthropic from "@anthropic-ai/sdk";
import { env } from "../lib/env.js";
import { db } from "../lib/db.js";
import { checkForbiddenWords } from "../guards/forbidden-words.js";
import { searchImage } from "../lib/unsplash.js";
import type { MasterContent } from "./master-writer.js";

const client = new Anthropic({ apiKey: env.anthropic.apiKey });

export type BlogVariant = {
  title: string;
  slug: string;
  excerpt: string;
  htmlBody: string;
  keywords: string[];
  featuredImageQuery: string;
};

export async function transformToBlog(
  master: MasterContent,
  carouselImageUrl?: string,
): Promise<BlogVariant | null> {
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    system: [
      {
        type: "text",
        text: `인터뷰메이트(interview-mate.com) SEO 블로그 전문 작가입니다.
타겟: 취준생·이직자 (20-35세, 한국어).
톤: 친근하고 실용적. 전문성 있지만 딱딱하지 않게.

구조 규칙:
- 1500~3000자 (한국어 기준)
- 도입부 (150자 내): 검색 의도 정확히 충족
- 핵심 요약 박스: 도입부 바로 아래. <div style="background:#f0f4ff;border-left:4px solid #3b82f6;padding:16px 20px;border-radius:6px;margin:24px 0"><strong>📌 이 글의 핵심</strong><ul style="margin:8px 0 0 0;padding-left:20px">...3줄 이내 핵심 포인트...</ul></div>
- 목차(TOC): 핵심 요약 박스 아래. <nav style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:16px 20px;margin:24px 0"><strong>📋 목차</strong><ol style="margin:8px 0 0 0;padding-left:20px">...H2 앵커 링크 목록...</ol></nav>
- H2 2-3개 (id 앵커 포함, 예: <h2 id="section-1">제목</h2>), H3 2-4개
- 이미지 삽입 위치: {{IMAGE_1}} 태그 (첫 H2 아래)
- FAQ 섹션: 마지막 H2로 "자주 묻는 질문" 3개. <details><summary>질문</summary><p>답변</p></details> 구조
- FAQ JSON-LD: htmlBody 맨 끝에 추가. <script type="application/ld+json">{"@context":"https://schema.org","@type":"FAQPage","mainEntity":[...]}</script>
- 마무리 CTA: "더 깊은 면접 연습이 필요하다면 <a href="https://interview-mate.com">인터뷰메이트</a>에서 AI 모의 면접을 체험해보세요."
- SEO: title은 핵심 키워드 포함 50자 이내, excerpt 120자 이내

절대 금지 단어: 자동화, 봇, 테스트, 시스템, publisher, 에이전트, 큐, API, dev`,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      {
        role: "user",
        content: `Master Content:
주제: ${master.headline}
본문: ${master.body}
키워드: ${master.keywords.join(", ")}

SEO 블로그 아티클 작성. JSON으로만 응답:
{
  "title": "SEO 최적화 제목 (50자 이내, 키워드 포함)",
  "slug": "url-slug-english-lowercase",
  "excerpt": "메타 디스크립션 120자 이내",
  "htmlBody": "HTML 본문 전체 (1500-3000자)",
  "keywords": ["SEO키워드1", "SEO키워드2", "..."],
  "featuredImageQuery": "Unsplash 검색 키워드 (영어, 2-3단어)"
}`,
      },
    ],
  });

  try {
    const raw = response.content[0].type === "text" ? response.content[0].text : "{}";
    const parsed = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] ?? "{}") as BlogVariant;

    if (!parsed.title || !parsed.htmlBody) {
      console.error("  · transformer-blog: title 또는 htmlBody 누락");
      return null;
    }

    const bodyLen = parsed.htmlBody.replace(/<[^>]*>/g, "").length;
    if (bodyLen < 1000 || bodyLen > 4000) {
      console.error(`  · transformer-blog: 본문 길이 ${bodyLen}자 (목표 1500-3000자)`);
      db.prepare(
        `INSERT INTO content_variants (master_id, channel, variant_index, text, media_spec, status)
         VALUES (?, 'blog', 0, ?, ?, 'failed')`,
      ).run(master.id, parsed.title, JSON.stringify(parsed));
      return null;
    }

    // 이미지 삽입: Unsplash 검색 → {{IMAGE_1}} 치환
    let finalHtml = parsed.htmlBody;
    const unsplashImg = await searchImage(parsed.featuredImageQuery);
    if (unsplashImg) {
      const imgHtml = `<figure><img src="${unsplashImg.url}" alt="${unsplashImg.alt}" /><figcaption>${unsplashImg.attribution}</figcaption></figure>`;
      finalHtml = finalHtml.replace("{{IMAGE_1}}", imgHtml);
    } else if (carouselImageUrl) {
      const imgHtml = `<figure><img src="${carouselImageUrl}" alt="${parsed.title}" /></figure>`;
      finalHtml = finalHtml.replace("{{IMAGE_1}}", imgHtml);
    } else {
      finalHtml = finalHtml.replace("{{IMAGE_1}}", "");
    }

    // 남은 이미지 placeholder 제거
    finalHtml = finalHtml.replace(/\{\{IMAGE_\d+\}\}/g, "");

    const check = checkForbiddenWords(finalHtml.replace(/<[^>]*>/g, ""));
    const status = check.pass ? "draft" : "failed";

    db.prepare(
      `INSERT INTO content_variants (master_id, channel, variant_index, text, media_spec, has_cta, status)
       VALUES (?, 'blog', 0, ?, ?, 1, ?)`,
    ).run(
      master.id,
      parsed.title,
      JSON.stringify({ ...parsed, htmlBody: finalHtml, unsplashImage: unsplashImg }),
      status,
    );

    return { ...parsed, htmlBody: finalHtml };
  } catch (e) {
    console.error("  · transformer-blog 파싱 오류:", e);
    return null;
  }
}

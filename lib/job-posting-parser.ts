// 채용공고 URL에서 텍스트를 추출하고 Claude로 구조화하는 공유 함수 모듈
import * as cheerio from "cheerio";
import { anthropic, CLAUDE_MODEL, extractText, parseJsonFromText } from "@/lib/anthropic";

const FETCH_TIMEOUT_MS = 10_000;
const MIN_TEXT_LENGTH = 50;
const MAX_TEXT_LENGTH = 12_000;

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

interface SiteSelectors {
  match: (host: string) => boolean;
  selectors: string[];
}

const SITES: SiteSelectors[] = [
  {
    match: (h) => h.includes("saramin.co.kr"),
    selectors: [
      ".user_content",
      ".jview",
      ".wrap_jv_cont",
      ".cont_box",
      ".job_summary",
    ],
  },
  {
    match: (h) => h.includes("jumpit.saramin.co.kr"),
    selectors: [
      "[class*='JobDescription']",
      "[class*='JobInfo']",
      "main",
    ],
  },
  {
    match: (h) => h.includes("wanted.co.kr"),
    selectors: [
      "[data-testid='jobDescription']",
      "section[class*='JobDescription']",
      "article",
    ],
  },
  {
    match: (h) => h.includes("jobplanet.co.kr"),
    selectors: [
      ".recruitment_info_section",
      ".body_inner",
      ".content",
      "main",
    ],
  },
];

export interface ParsedJobPosting {
  company: string;
  position: string;
  requirements: string;
  preferredQualifications: string;
  description: string;
}

const STRUCTURE_SYSTEM_PROMPT = `You are a Korean job posting analyzer. The user will give you raw text scraped from a job posting page. Extract and structure the key information into Korean. Return strictly valid JSON with this exact shape:
{
  "company": "회사명",
  "position": "포지션/직무명",
  "requirements": "주요 자격 요건 (한 단락 또는 줄바꿈 포함)",
  "preferredQualifications": "우대사항 (없으면 빈 문자열)",
  "description": "직무 설명 요약 (2-3 문장)"
}
All fields must be in Korean. If information is missing, use a short Korean placeholder. Do not add any commentary outside the JSON.`;

function cleanText(raw: string): string {
  return raw
    .replace(/\s+/g, " ")
    .replace(/ /g, " ")
    .trim();
}

export async function fetchWithTimeout(url: string, ms: number = FETCH_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": USER_AGENT,
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
      },
    });
  } finally {
    clearTimeout(timer);
  }
}

export function extractFromHtml(html: string, host: string): string {
  const $ = cheerio.load(html);
  $("script, style, noscript, iframe, svg").remove();

  const site = SITES.find((s) => s.match(host));
  if (site) {
    for (const sel of site.selectors) {
      const el = $(sel).first();
      const txt = cleanText(el.text());
      if (txt.length >= MIN_TEXT_LENGTH) {
        return txt.slice(0, MAX_TEXT_LENGTH);
      }
    }
  }

  const body = cleanText($("body").text());
  return body.slice(0, MAX_TEXT_LENGTH);
}

export { MIN_TEXT_LENGTH };

export async function structureJobPosting(rawText: string): Promise<ParsedJobPosting> {
  const message = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 1500,
    system: [
      {
        type: "text",
        text: STRUCTURE_SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      {
        role: "user",
        content: `다음 채용공고 본문에서 정보를 추출해 JSON으로 응답하세요.\n\n[채용공고 본문]\n${rawText}`,
      },
    ],
  });

  const text = extractText(message);
  const parsed = parseJsonFromText<ParsedJobPosting>(text);

  return {
    company: String(parsed.company ?? "").trim() || "회사 정보 없음",
    position: String(parsed.position ?? "").trim() || "포지션 정보 없음",
    requirements: String(parsed.requirements ?? "").trim(),
    preferredQualifications: String(parsed.preferredQualifications ?? "").trim(),
    description: String(parsed.description ?? "").trim(),
  };
}

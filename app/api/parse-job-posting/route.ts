import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { anthropic, CLAUDE_MODEL, extractText, parseJsonFromText } from "@/lib/anthropic";

export const runtime = "nodejs";
export const maxDuration = 30;

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

interface ParsedJobPosting {
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

interface RequestBody {
  url?: string;
}

function cleanText(raw: string): string {
  return raw
    .replace(/\s+/g, " ")
    .replace(/ /g, " ")
    .trim();
}

async function fetchWithTimeout(url: string, ms: number): Promise<Response> {
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

function extractFromHtml(html: string, host: string): string {
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

async function structure(rawText: string): Promise<ParsedJobPosting> {
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

export async function POST(req: NextRequest) {
  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const rawUrl = body.url?.trim();
  if (!rawUrl) {
    return NextResponse.json({ error: "url is required" }, { status: 400 });
  }

  let url: URL;
  try {
    url = new URL(rawUrl);
    if (!["http:", "https:"].includes(url.protocol)) throw new Error("bad protocol");
  } catch {
    return NextResponse.json({ error: "유효하지 않은 URL입니다" }, { status: 400 });
  }

  let res: Response;
  try {
    res = await fetchWithTimeout(url.toString(), FETCH_TIMEOUT_MS);
  } catch (err) {
    const reason = err instanceof Error ? err.message : "fetch failed";
    console.warn("[parse-job-posting] fetch failed:", reason);
    return NextResponse.json({
      success: false,
      fallbackRequired: true,
      error: "URL을 가져오지 못했습니다. 본문을 직접 붙여넣어 주세요.",
    });
  }

  if (res.status === 403 || res.status === 429 || res.status >= 500) {
    return NextResponse.json({
      success: false,
      fallbackRequired: true,
      error: "사이트가 자동 접근을 차단했어요. 본문을 직접 붙여넣어 주세요.",
    });
  }
  if (!res.ok) {
    return NextResponse.json({
      success: false,
      fallbackRequired: true,
      error: `페이지 응답 오류 (${res.status})`,
    });
  }

  const html = await res.text();
  const rawText = extractFromHtml(html, url.hostname);

  if (rawText.length < MIN_TEXT_LENGTH) {
    return NextResponse.json({
      success: false,
      fallbackRequired: true,
      error: "공고 본문을 추출하지 못했어요. 본문을 직접 붙여넣어 주세요.",
    });
  }

  try {
    const data = await structure(rawText);
    return NextResponse.json({ success: true, data, raw: rawText });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "structuring failed";
    console.warn("[parse-job-posting] structure failed:", msg);
    return NextResponse.json({
      success: false,
      fallbackRequired: true,
      error: "공고 분석에 실패했어요. 본문을 직접 붙여넣어 주세요.",
    });
  }
}

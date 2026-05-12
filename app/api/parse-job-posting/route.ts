// 채용공고 URL을 fetch·cheerio로 크롤링하고 Claude로 구조화하는 API 라우트
import { NextRequest, NextResponse } from "next/server";
import {
  fetchWithTimeout,
  extractFromHtml,
  structureJobPosting,
  MIN_TEXT_LENGTH,
} from "@/lib/job-posting-parser";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { captureServerError } from "@/lib/posthog-server";

export const runtime = "nodejs";
export const maxDuration = 30;

interface RequestBody {
  url?: string;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = checkRateLimit(ip, "parse-job-posting", RATE_LIMITS["parse-job-posting"]);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." },
      { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
    );
  }

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
    res = await fetchWithTimeout(url.toString());
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
    const data = await structureJobPosting(rawText);
    return NextResponse.json({ success: true, data, raw: rawText });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "structuring failed";
    console.warn("[parse-job-posting] structure failed:", msg);
    captureServerError("parse-job-posting", err, { ip, url: rawUrl });
    return NextResponse.json({
      success: false,
      fallbackRequired: true,
      error: "공고 분석에 실패했어요. 본문을 직접 붙여넣어 주세요.",
    });
  }
}

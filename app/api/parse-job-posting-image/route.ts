import { NextRequest, NextResponse } from "next/server";
import { anthropic, CLAUDE_MODEL, extractText, parseJsonFromText } from "@/lib/anthropic";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { captureServerError } from "@/lib/posthog-server";

export const runtime = "nodejs";
export const maxDuration = 30;

interface ParsedJobPosting {
  company: string;
  position: string;
  requirements: string;
  preferredQualifications: string;
  description: string;
}

const STRUCTURE_SYSTEM_PROMPT = `You are a Korean job posting analyzer. The user will give you an image of a job posting. Extract and structure the key information into Korean. Return strictly valid JSON with this exact shape:
{
  "company": "회사명",
  "position": "포지션/직무명",
  "requirements": "주요 자격 요건 (한 단락 또는 줄바꿈 포함)",
  "preferredQualifications": "우대사항 (없으면 빈 문자열)",
  "description": "직무 설명 요약 (2-3 문장)"
}
All fields must be in Korean. If information is missing, use a short Korean placeholder. Do not add any commentary outside the JSON.`;

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const;
type AllowedMime = (typeof ALLOWED_MIME_TYPES)[number];

interface RequestBody {
  imageBase64?: string;
  mimeType?: string;
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

  const { imageBase64, mimeType } = body;
  if (!imageBase64 || !mimeType) {
    return NextResponse.json({ error: "imageBase64 and mimeType are required" }, { status: 400 });
  }

  if (!(ALLOWED_MIME_TYPES as readonly string[]).includes(mimeType)) {
    return NextResponse.json({ error: "지원하지 않는 이미지 형식입니다." }, { status: 400 });
  }

  try {
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
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mimeType as AllowedMime,
                data: imageBase64,
              },
            },
            {
              type: "text",
              text: "이 채용공고 이미지에서 정보를 추출해 JSON으로 응답하세요.",
            },
          ],
        },
      ],
    });

    const text = extractText(message);
    const parsed = parseJsonFromText<ParsedJobPosting>(text);

    const data: ParsedJobPosting = {
      company: String(parsed.company ?? "").trim() || "회사 정보 없음",
      position: String(parsed.position ?? "").trim() || "포지션 정보 없음",
      requirements: String(parsed.requirements ?? "").trim(),
      preferredQualifications: String(parsed.preferredQualifications ?? "").trim(),
      description: String(parsed.description ?? "").trim(),
    };

    return NextResponse.json({ success: true, data, raw: "" });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "vision failed";
    console.warn("[parse-job-posting-image] failed:", msg);
    captureServerError("parse-job-posting-image", err, { ip });
    return NextResponse.json({
      success: false,
      error: "이미지 분석에 실패했어요. 다시 시도해 주세요.",
    });
  }
}

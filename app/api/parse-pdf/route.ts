// PDF 파일에서 텍스트를 추출하는 API 라우트 (pdftotext 우선, 실패 시 Claude 비전 폴백)
import { NextRequest, NextResponse } from "next/server";
import { spawn } from "node:child_process";
import { anthropic, CLAUDE_HAIKU, extractText } from "@/lib/anthropic";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { captureServerError } from "@/lib/posthog-server";

export const runtime = "nodejs";
export const maxDuration = 90;

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
// If pdftotext yields fewer characters than this, treat it as a parse failure
// and fall back to Claude. A real resume / cover letter has hundreds+ chars.
const PRIMARY_MIN_CHARS = 50;

const CLAUDE_EXTRACTION_PROMPT = `이 PDF의 모든 텍스트를 그대로 추출해 출력하세요. 표는 줄바꿈으로 구분, 헤더/페이지번호 같은 의미 없는 반복 요소는 제외하세요. 어떤 설명, 요약, 마크다운 포매팅도 추가하지 마세요. 추출된 원문만 출력하세요.`;

function pdfToText(buf: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn("pdftotext", ["-layout", "-enc", "UTF-8", "-", "-"]);
    const out: Buffer[] = [];
    const err: Buffer[] = [];
    proc.stdout.on("data", (c: Buffer) => out.push(c));
    proc.stderr.on("data", (c: Buffer) => err.push(c));
    proc.on("error", (e) => reject(e));
    proc.on("close", (code) => {
      if (code === 0) {
        resolve(Buffer.concat(out).toString("utf8"));
      } else {
        const stderr = Buffer.concat(err).toString("utf8").trim();
        reject(new Error(stderr || `pdftotext exited with code ${code}`));
      }
    });
    proc.stdin.write(buf);
    proc.stdin.end();
  });
}

async function claudePdfExtract(buf: Buffer): Promise<string> {
  const message = await anthropic.messages.create({
    model: CLAUDE_HAIKU,
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: {
              type: "base64",
              media_type: "application/pdf",
              data: buf.toString("base64"),
            },
          },
          { type: "text", text: CLAUDE_EXTRACTION_PROMPT },
        ],
      },
    ],
  });
  return extractText(message).trim();
}

type ParseMethod = "pdftotext" | "claude";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = checkRateLimit(ip, "parse-pdf", RATE_LIMITS["parse-pdf"]);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." },
      { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
    );
  }

  const ab = await req.arrayBuffer();
  if (ab.byteLength === 0) {
    return NextResponse.json({ error: "빈 파일입니다" }, { status: 400 });
  }
  if (ab.byteLength > MAX_BYTES) {
    return NextResponse.json(
      { error: `파일이 너무 큽니다 (최대 ${MAX_BYTES / 1024 / 1024}MB)` },
      { status: 413 }
    );
  }

  const buf = Buffer.from(ab);

  // 1차: poppler pdftotext (무료, 빠름, 디지털 텍스트 PDF 거의 다 커버)
  let text = "";
  let method: ParseMethod = "pdftotext";
  let primaryError: string | null = null;
  try {
    const raw = await pdfToText(buf);
    text = raw.replace(/\s+\n/g, "\n").trim();
  } catch (err) {
    primaryError = err instanceof Error ? err.message : "pdftotext 실패";
    console.warn("[parse-pdf] pdftotext failed:", primaryError);
  }

  // 2차: pdftotext가 빈 결과거나 실패 → Claude vision으로 OCR/추출
  // 비용이 발생하므로 1차에서 충분히 추출된 경우 호출하지 않음.
  if (text.length < PRIMARY_MIN_CHARS) {
    try {
      console.info(
        `[parse-pdf] primary yielded ${text.length} chars, falling back to Claude`
      );
      text = await claudePdfExtract(buf);
      method = "claude";
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Claude 추출 실패";
      console.error("[parse-pdf] claude fallback failed:", msg);
      captureServerError("parse-pdf", err, { ip, stage: "claude-fallback" });
      const hasApiKey = Boolean(process.env.ANTHROPIC_API_KEY);
      const lowerMsg = msg.toLowerCase();
      const isAuth =
        lowerMsg.includes("authentication") ||
        lowerMsg.includes("401") ||
        lowerMsg.includes("invalid x-api-key");
      const hint = !hasApiKey
        ? "ANTHROPIC_API_KEY 환경변수가 설정되지 않음"
        : isAuth
        ? "ANTHROPIC_API_KEY가 잘못되었거나 권한 없음"
        : null;
      return NextResponse.json(
        {
          error: `PDF 추출 실패. 1차(pdftotext): ${primaryError ?? "빈 결과"}. 2차(Claude): ${msg}${hint ? ` [원인 추정: ${hint}]` : ""}`,
        },
        { status: 500 }
      );
    }
  }

  if (text.length === 0) {
    return NextResponse.json(
      {
        error:
          "PDF에서 텍스트를 추출하지 못했어요. 직접 입력 탭을 이용해 주세요.",
      },
      { status: 422 }
    );
  }

  return NextResponse.json({ text, method, chars: text.length });
}

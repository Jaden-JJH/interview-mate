import { NextRequest, NextResponse } from "next/server";
import { spawn } from "node:child_process";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

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

export async function POST(req: NextRequest) {
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

  try {
    const text = await pdfToText(Buffer.from(ab));
    const cleaned = text.replace(/\s+\n/g, "\n").trim();
    if (cleaned.length === 0) {
      return NextResponse.json(
        {
          error:
            "PDF에서 텍스트를 추출하지 못했어요. 스캔 이미지 PDF일 수 있어요.",
        },
        { status: 422 }
      );
    }
    return NextResponse.json({ text: cleaned });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "pdftotext 실행 실패";
    console.error("[parse-pdf]", msg);
    const isBinaryMissing =
      msg.includes("ENOENT") || msg.includes("not found");
    return NextResponse.json(
      {
        error: isBinaryMissing
          ? "서버에 pdftotext(poppler)가 설치돼 있지 않습니다."
          : `PDF 파싱 실패: ${msg}`,
      },
      { status: 500 }
    );
  }
}

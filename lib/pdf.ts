// PDF 파일을 서버 /api/parse-pdf로 전송해 텍스트를 추출하는 클라이언트 유틸 함수
"use client";

// PDF text extraction is performed server-side via poppler `pdftotext` so that
// font/encoding edge cases (Figma exports, embedded subsets, Korean glyphs
// without ToUnicode CMaps) are handled by a real PDF engine instead of
// pdfjs-in-the-browser. The server route streams the file as a raw body.

export async function extractPdfText(file: File): Promise<string> {
  const res = await fetch("/api/parse-pdf", {
    method: "POST",
    headers: { "Content-Type": "application/pdf" },
    body: file,
  });

  if (!res.ok) {
    let detail = `${res.status}`;
    try {
      const data = await res.json();
      if (data?.error) detail = data.error;
    } catch {
      // ignore JSON parse errors
    }
    throw new Error(detail);
  }

  const data = (await res.json()) as { text?: string };
  return (data.text ?? "").trim();
}

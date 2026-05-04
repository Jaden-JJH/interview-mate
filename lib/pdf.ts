"use client";

// Worker file is copied into /public via postinstall (see scripts/copy-pdf-worker.mjs).
// Same-origin .mjs avoids MIME/CSP issues that break module workers loaded from CDNs.
const PDF_WORKER_URL = "/pdf.worker.min.mjs";

export async function extractPdfText(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = PDF_WORKER_URL;

  const buffer = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buffer }).promise;

  const parts: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ");
    parts.push(text);
  }
  await doc.destroy();
  return parts.join("\n").replace(/\s+/g, " ").trim();
}

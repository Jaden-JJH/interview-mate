"use client";

// pdfjs-dist v5 frequently breaks under Next.js 14 webpack ESM interop with
// `Object.defineProperty called on non-object`. The robust workaround is to
// bypass the bundler entirely: load both the main library and the worker as
// browser-native ESM modules at runtime via `webpackIgnore`. The files are
// copied into /public by scripts/copy-pdf-worker.mjs (postinstall).

interface PdfTextItem {
  str?: string;
}

interface PdfPage {
  getTextContent: () => Promise<{ items: PdfTextItem[] }>;
}

interface PdfDocument {
  numPages: number;
  getPage: (n: number) => Promise<PdfPage>;
  destroy: () => Promise<void>;
}

interface PdfjsModule {
  GlobalWorkerOptions: { workerSrc: string };
  getDocument: (opts: { data: ArrayBuffer }) => { promise: Promise<PdfDocument> };
}

let pdfjsPromise: Promise<PdfjsModule> | null = null;

function loadPdfjs(): Promise<PdfjsModule> {
  if (pdfjsPromise) return pdfjsPromise;
  pdfjsPromise = (async () => {
    // webpackIgnore makes this a runtime browser ESM import, not a webpack bundle.
    // The string is wrapped in a dynamic expression to keep TS from resolving it.
    const url = "/pdf.min.mjs";
    const mod = (await import(/* webpackIgnore: true */ url)) as PdfjsModule;
    mod.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
    return mod;
  })();
  return pdfjsPromise;
}

export async function extractPdfText(file: File): Promise<string> {
  const pdfjs = await loadPdfjs();
  const buffer = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buffer }).promise;

  const parts: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .map((item) => item.str ?? "")
      .join(" ");
    parts.push(text);
  }
  await doc.destroy();
  return parts.join("\n").replace(/\s+/g, " ").trim();
}

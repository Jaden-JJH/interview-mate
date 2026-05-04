// Copies pdfjs-dist runtime files into /public so they can be served same-origin
// AND loaded via dynamic ESM import that bypasses Next.js webpack processing.
// Pinning both the library and worker to the installed pdfjs-dist version
// avoids version-mismatch errors at runtime.
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const FILES = [
  ["pdfjs-dist/legacy/build/pdf.min.mjs", "public/pdf.min.mjs"],
  ["pdfjs-dist/legacy/build/pdf.worker.min.mjs", "public/pdf.worker.min.mjs"],
];

for (const [pkgPath, outPath] of FILES) {
  const src = require.resolve(pkgPath);
  const dest = resolve(process.cwd(), outPath);
  mkdirSync(dirname(dest), { recursive: true });
  copyFileSync(src, dest);
  console.log(`[pdf-worker] copied ${src} -> ${dest}`);
}

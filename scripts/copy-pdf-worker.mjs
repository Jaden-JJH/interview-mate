// Copies pdfjs-dist runtime assets into /public so they can be served same-origin
// AND loaded via dynamic ESM import that bypasses Next.js webpack processing.
//
// Includes:
//   - pdf.min.mjs           main library (loaded via webpackIgnore)
//   - pdf.worker.min.mjs    background worker
//   - cmaps/                CJK glyph→Unicode tables (required for Korean PDFs)
//   - standard_fonts/       fallback fonts for PDFs that omit them
import { copyFileSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

function pkgDir() {
  // Walk up from any resolved path inside pdfjs-dist to its package root.
  const probe = require.resolve("pdfjs-dist/package.json");
  return dirname(probe);
}

function copyFile(srcAbs, destRel) {
  const dest = resolve(process.cwd(), destRel);
  mkdirSync(dirname(dest), { recursive: true });
  copyFileSync(srcAbs, dest);
}

function copyDir(srcAbs, destRel) {
  const dest = resolve(process.cwd(), destRel);
  mkdirSync(dest, { recursive: true });
  for (const entry of readdirSync(srcAbs)) {
    const s = join(srcAbs, entry);
    if (statSync(s).isFile()) copyFileSync(s, join(dest, entry));
  }
}

const root = pkgDir();

copyFile(join(root, "legacy/build/pdf.min.mjs"), "public/pdf.min.mjs");
copyFile(join(root, "legacy/build/pdf.worker.min.mjs"), "public/pdf.worker.min.mjs");
copyDir(join(root, "cmaps"), "public/pdf-cmaps");
copyDir(join(root, "standard_fonts"), "public/pdf-standard-fonts");

console.log("[pdf-worker] copied lib, worker, cmaps, standard_fonts to public/");

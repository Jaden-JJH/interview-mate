// Copies pdfjs-dist worker into /public so it can be served same-origin.
// Pinning the worker version to the installed pdfjs-dist version avoids
// version-mismatch errors at runtime.
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const workerPath = require.resolve("pdfjs-dist/build/pdf.worker.min.mjs");
const dest = resolve(process.cwd(), "public", "pdf.worker.min.mjs");

mkdirSync(dirname(dest), { recursive: true });
copyFileSync(workerPath, dest);
console.log(`[pdf-worker] copied ${workerPath} -> ${dest}`);

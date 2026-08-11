/**
 * Hostinger Node.js deploy looks for a root output directory (.next / dist / build / out).
 * Next.js in this monorepo writes to apps/web/.next — expose it at the repo root.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const webNext = path.join(root, "apps", "web", ".next");
const rootNext = path.join(root, ".next");
const apiDist = path.join(root, "apps", "api", "dist");
const rootDist = path.join(root, "dist");

function removeIfExists(target) {
  try {
    fs.lstatSync(target);
    fs.rmSync(target, { recursive: true, force: true });
  } catch {
    // missing is fine
  }
}

function linkOrCopy(src, dest, label) {
  if (!fs.existsSync(src)) {
    console.error(`[hostinger-postbuild] Missing ${label}: ${src}`);
    process.exit(1);
  }

  removeIfExists(dest);

  try {
    fs.symlinkSync(src, dest, "dir");
    console.log(`[hostinger-postbuild] Linked ${path.relative(root, dest)} -> ${path.relative(root, src)}`);
  } catch (err) {
    console.warn(`[hostinger-postbuild] Symlink failed (${err.message}); copying instead`);
    fs.cpSync(src, dest, { recursive: true });
    console.log(`[hostinger-postbuild] Copied ${path.relative(root, src)} -> ${path.relative(root, dest)}`);
  }
}

linkOrCopy(webNext, rootNext, "Next.js build output");

// Some Hostinger detectors also accept dist/; point it at the Nest build for clarity.
if (fs.existsSync(apiDist)) {
  linkOrCopy(apiDist, rootDist, "NestJS build output");
}

// Sanity: Hostinger checks that the output directory exists and is non-empty.
const entries = fs.readdirSync(rootNext);
if (entries.length === 0) {
  console.error("[hostinger-postbuild] Root .next is empty");
  process.exit(1);
}

console.log(`[hostinger-postbuild] Ready — output directory: .next (${entries.length} entries)`);

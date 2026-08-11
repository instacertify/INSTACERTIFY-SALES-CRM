/**
 * Hostinger Node.js deploy checks for a real output directory at the app root
 * (typically `.next`). Next.js in this monorepo writes to `apps/web/.next`.
 *
 * Symlinks are not reliable on Hostinger's checker — always copy.
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

function copyDir(src, dest, label) {
  if (!fs.existsSync(src)) {
    console.error(`[hostinger-postbuild] Missing ${label}: ${src}`);
    process.exit(1);
  }

  const srcStat = fs.statSync(src);
  if (!srcStat.isDirectory()) {
    console.error(`[hostinger-postbuild] ${label} is not a directory: ${src}`);
    process.exit(1);
  }

  removeIfExists(dest);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.cpSync(src, dest, { recursive: true, dereference: true });

  const destStat = fs.lstatSync(dest);
  if (destStat.isSymbolicLink()) {
    console.error(`[hostinger-postbuild] ${dest} is still a symlink; Hostinger requires a real directory`);
    process.exit(1);
  }
  if (!destStat.isDirectory()) {
    console.error(`[hostinger-postbuild] Failed to create directory ${dest}`);
    process.exit(1);
  }

  const entries = fs.readdirSync(dest);
  console.log(
    `[hostinger-postbuild] Copied ${path.relative(root, src)} -> ${path.relative(root, dest)} (${entries.length} entries, real directory)`,
  );
  return entries;
}

const nextEntries = copyDir(webNext, rootNext, "Next.js build output (apps/web/.next)");

if (fs.existsSync(apiDist)) {
  copyDir(apiDist, rootDist, "NestJS build output (apps/api/dist)");
}

// Marker Hostinger / operators can see in logs
const marker = path.join(rootNext, "HOSTINGER_OUTPUT_OK");
fs.writeFileSync(
  marker,
  `ok ${new Date().toISOString()}\nsource=${webNext}\nentries=${nextEntries.length}\n`,
);

console.log(`[hostinger-postbuild] Ready — output directory: .next (${nextEntries.length} entries)`);
console.log(`[hostinger-postbuild] path=${rootNext}`);
console.log(`[hostinger-postbuild] isDirectory=${fs.statSync(rootNext).isDirectory()} isSymlink=${fs.lstatSync(rootNext).isSymbolicLink()}`);

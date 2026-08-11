/**
 * Hostinger copies ONLY the Output directory into:
 *   ~/domains/.../hbuilds/current/nodejs/
 * So entry `server.js` must live INSIDE that output folder.
 *
 * We assemble `hostinger-run/` containing:
 *   - server.js (LiteSpeed entry)
 *   - Next standalone build + static assets
 *   - Nest API dist
 *
 * hPanel:
 *   Output directory: hostinger-run
 *   Entry file:       server.js
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const webDir = path.join(root, "apps", "web");
const webNext = path.join(webDir, ".next");
const standalone = path.join(webNext, "standalone");
const apiDist = path.join(root, "apps", "api", "dist");
const outDir = path.join(root, "hostinger-run");
const rootNext = path.join(root, ".next");
const rootDist = path.join(root, "dist");

function rm(target) {
  try {
    fs.rmSync(target, { recursive: true, force: true });
  } catch {
    // ignore
  }
}

function mustExist(p, label) {
  if (!fs.existsSync(p)) {
    console.error(`[hostinger-postbuild] Missing ${label}: ${p}`);
    process.exit(1);
  }
}

mustExist(webNext, "apps/web/.next");
mustExist(standalone, "apps/web/.next/standalone (enable output:'standalone')");
mustExist(path.join(root, "server.js"), "server.js");
mustExist(apiDist, "apps/api/dist");

rm(outDir);
fs.mkdirSync(outDir, { recursive: true });

// 1) Copy Next standalone tree (includes minimal node_modules)
fs.cpSync(standalone, outDir, { recursive: true, dereference: true });
console.log("[hostinger-postbuild] Copied Next standalone → hostinger-run/");

// 2) Static assets (required by Next standalone)
const staticSrc = path.join(webNext, "static");
const staticDestCandidates = [
  path.join(outDir, "apps", "web", ".next", "static"),
  path.join(outDir, ".next", "static"),
];
mustExist(staticSrc, "apps/web/.next/static");
for (const dest of staticDestCandidates) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.cpSync(staticSrc, dest, { recursive: true, dereference: true });
  console.log(`[hostinger-postbuild] Copied static → ${path.relative(root, dest)}`);
}

const publicSrc = path.join(webDir, "public");
if (fs.existsSync(publicSrc)) {
  for (const dest of [
    path.join(outDir, "apps", "web", "public"),
    path.join(outDir, "public"),
  ]) {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.cpSync(publicSrc, dest, { recursive: true, dereference: true });
  }
  console.log("[hostinger-postbuild] Copied public assets");
}

// 3) Nest API
const apiOut = path.join(outDir, "api-dist");
fs.cpSync(apiDist, apiOut, { recursive: true, dereference: true });
console.log("[hostinger-postbuild] Copied Nest dist → hostinger-run/api-dist");

// 4) Merge root node_modules so Nest API (+ Prisma) can resolve deps at runtime
const rootNm = path.join(root, "node_modules");
const outNm = path.join(outDir, "node_modules");
if (fs.existsSync(rootNm)) {
  console.log("[hostinger-postbuild] Merging root node_modules → hostinger-run/node_modules …");
  fs.cpSync(rootNm, outNm, { recursive: true, dereference: true, force: true });
  console.log("[hostinger-postbuild] node_modules merge done");
}

// 5) Hostinger LiteSpeed entry (OVERWRITE standalone's default server.js)
const entrySrc = path.join(root, "scripts", "hostinger-server.cjs");
const entryDest = path.join(outDir, "server.js");
mustExist(entrySrc, "scripts/hostinger-server.cjs");
fs.copyFileSync(entrySrc, entryDest);
console.log("[hostinger-postbuild] Wrote hostinger-run/server.js (LiteSpeed entry)");

// 6) Keep root .next for any validator still checking ".next"
rm(rootNext);
fs.cpSync(webNext, rootNext, { recursive: true, dereference: true });
rm(rootDist);
fs.cpSync(apiDist, rootDist, { recursive: true, dereference: true });

// Also place a copy of entry at root .next/server.js as a safety net
fs.copyFileSync(entrySrc, path.join(rootNext, "server.js"));

// Marker
fs.writeFileSync(
  path.join(outDir, "HOSTINGER_RUN_OK"),
  `ok ${new Date().toISOString()}\nentry=server.js\n`,
);

const listing = fs.readdirSync(outDir);
if (!listing.includes("server.js")) {
  console.error("[hostinger-postbuild] server.js missing from hostinger-run/");
  process.exit(1);
}

console.log(`[hostinger-postbuild] Ready — Output directory: hostinger-run (${listing.length} entries)`);
console.log(`[hostinger-postbuild] path=${outDir}`);
console.log("[hostinger-postbuild] hPanel → Output directory = hostinger-run , Entry file = server.js");

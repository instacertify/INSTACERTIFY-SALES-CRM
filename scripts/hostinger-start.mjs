/**
 * Single-process start for Hostinger Node.js Application hosting.
 * Boots Nest API in the background, then Next.js from apps/web (where next.config lives).
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const webDir = path.join(root, "apps", "web");
const apiDir = path.join(root, "apps", "api");
const apiMain = path.join(apiDir, "dist", "main.js");
const webNext = path.join(webDir, ".next");
const rootNext = path.join(root, ".next");

function ensureEnvCopies() {
  const envPath = path.join(root, ".env");
  if (!fs.existsSync(envPath)) return;
  for (const dest of [
    path.join(apiDir, ".env"),
    path.join(root, "packages", "database", ".env"),
  ]) {
    try {
      fs.copyFileSync(envPath, dest);
    } catch {
      // non-fatal
    }
  }
}

/** Prefer apps/web/.next; restore from root copy if Hostinger only kept root output. */
function ensureWebNext() {
  if (fs.existsSync(webNext) && fs.statSync(webNext).isDirectory()) {
    return;
  }
  if (fs.existsSync(rootNext) && fs.statSync(rootNext).isDirectory()) {
    console.log("[hostinger-start] Restoring apps/web/.next from root .next copy");
    fs.mkdirSync(path.dirname(webNext), { recursive: true });
    fs.cpSync(rootNext, webNext, { recursive: true, dereference: true });
    return;
  }
  console.error("[hostinger-start] Missing Next.js build output (.next)");
  process.exit(1);
}

ensureEnvCopies();
ensureWebNext();

if (!fs.existsSync(apiMain)) {
  console.error(`[hostinger-start] Missing API build: ${apiMain}`);
  process.exit(1);
}

const apiPort = process.env.PORT_API || process.env.API_PORT || "4000";
const webPort = process.env.PORT || process.env.WEB_PORT || "3000";

const nextBin = [
  path.join(root, "node_modules", "next", "dist", "bin", "next"),
  path.join(webDir, "node_modules", "next", "dist", "bin", "next"),
].find((p) => fs.existsSync(p));

if (!nextBin) {
  console.error("[hostinger-start] next binary not found in node_modules");
  process.exit(1);
}

const api = spawn(process.execPath, [apiMain], {
  cwd: apiDir,
  env: { ...process.env, NODE_ENV: "production", PORT: String(apiPort) },
  stdio: "inherit",
});

api.on("exit", (code, signal) => {
  console.error(`[hostinger-start] API exited code=${code} signal=${signal}`);
  process.exit(code ?? 1);
});

const web = spawn(
  process.execPath,
  [nextBin, "start", "--port", String(webPort)],
  {
    cwd: webDir,
    env: { ...process.env, NODE_ENV: "production", PORT: String(webPort) },
    stdio: "inherit",
  },
);

web.on("exit", (code, signal) => {
  console.error(`[hostinger-start] Web exited code=${code} signal=${signal}`);
  api.kill("SIGTERM");
  process.exit(code ?? 1);
});

for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, () => {
    web.kill(sig);
    api.kill(sig);
  });
}

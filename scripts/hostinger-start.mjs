/**
 * Single-process start for Hostinger Node.js Application hosting.
 * Boots Nest API in the background, then Next.js in the foreground.
 * Prefer PM2 (ecosystem.config.cjs) on a VPS when you have SSH.
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const webDir = path.join(root, "apps", "web");
const apiDir = path.join(root, "apps", "api");

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

ensureEnvCopies();

const apiPort = process.env.PORT_API || process.env.API_PORT || "4000";
const webPort = process.env.PORT || process.env.WEB_PORT || "3000";

const api = spawn(
  process.execPath,
  [path.join(apiDir, "dist", "main.js")],
  {
    cwd: apiDir,
    env: { ...process.env, NODE_ENV: "production", PORT: String(apiPort) },
    stdio: "inherit",
  },
);

api.on("exit", (code, signal) => {
  console.error(`[hostinger-start] API exited code=${code} signal=${signal}`);
  process.exit(code ?? 1);
});

const web = spawn(
  process.execPath,
  [
    path.join(root, "node_modules", "next", "dist", "bin", "next"),
    "start",
    "--port",
    String(webPort),
  ],
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

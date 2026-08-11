/**
 * Hostinger Node.js entry (Application type: other, Entry file: server.mjs)
 *
 * Hostinger reverse-proxies to ONE port: process.env.PORT on 0.0.0.0.
 * This process:
 *  1) restores build artifacts if needed
 *  2) starts Nest API on an internal port (API_PORT, default 4000)
 *  3) serves Next.js + proxies /api/* → Nest on the public PORT
 *
 * Do NOT set PORT in hPanel env vars — Hostinger injects it.
 * Use API_PORT for the Nest internal port instead.
 */
import { createServer, request as httpRequest } from "node:http";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseUrl } from "node:url";
import next from "next";

const root = path.dirname(fileURLToPath(import.meta.url));
const webDir = path.join(root, "apps", "web");
const apiDir = path.join(root, "apps", "api");
const apiMain = path.join(apiDir, "dist", "main.js");
const rootDistMain = path.join(root, "dist", "main.js");
const webNext = path.join(webDir, ".next");
const rootNext = path.join(root, ".next");

function log(...args) {
  console.log("[hostinger]", ...args);
}

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

function restoreDir(src, dest, label) {
  if (fs.existsSync(dest) && fs.statSync(dest).isDirectory()) return true;
  if (!fs.existsSync(src) || !fs.statSync(src).isDirectory()) return false;
  log(`Restoring ${label}: ${path.relative(root, src)} -> ${path.relative(root, dest)}`);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.cpSync(src, dest, { recursive: true, dereference: true });
  return true;
}

function ensureArtifacts() {
  if (!restoreDir(rootNext, webNext, "Next.js .next") && !fs.existsSync(webNext)) {
    throw new Error("Missing Next.js build output (apps/web/.next or root .next)");
  }
  if (!fs.existsSync(apiMain)) {
    if (fs.existsSync(rootDistMain)) {
      restoreDir(path.join(root, "dist"), path.join(apiDir, "dist"), "API dist");
    }
  }
  if (!fs.existsSync(apiMain) && !fs.existsSync(rootDistMain)) {
    log("WARNING: Nest API dist missing — UI will start but /api will return 502");
  }
}

function startApi(apiPort) {
  const main = fs.existsSync(apiMain) ? apiMain : rootDistMain;
  if (!fs.existsSync(main)) return null;

  const child = spawn(process.execPath, [main], {
    cwd: fs.existsSync(apiMain) ? apiDir : root,
    env: {
      ...process.env,
      NODE_ENV: "production",
      // Nest must NOT steal Hostinger's public PORT
      PORT: String(apiPort),
      API_PORT: String(apiPort),
    },
    stdio: "inherit",
  });

  child.on("exit", (code, signal) => {
    log(`API process exited code=${code} signal=${signal} (web keeps running)`);
  });

  return child;
}

function proxyToApi(req, res, apiPort) {
  const headers = { ...req.headers, host: `127.0.0.1:${apiPort}` };
  const opts = {
    hostname: "127.0.0.1",
    port: apiPort,
    path: req.url,
    method: req.method,
    headers,
  };

  const upstream = httpRequest(opts, (pres) => {
    res.writeHead(pres.statusCode || 502, pres.headers);
    pres.pipe(res);
  });

  upstream.on("error", (err) => {
    log("API proxy error:", err.message);
    if (!res.headersSent) {
      res.statusCode = 502;
      res.setHeader("content-type", "application/json");
    }
    res.end(
      JSON.stringify({
        error: "API unavailable",
        message: err.message,
        hint: "Check DATABASE_URL / JWT_SECRET and Runtime Logs",
      }),
    );
  });

  req.pipe(upstream);
}

async function main() {
  ensureEnvCopies();
  ensureArtifacts();

  // Public port Hostinger (or local) expects — never hardcode 3000/4000 as required
  const port = Number(process.env.PORT || 3000);
  const hostname = process.env.HOST || process.env.HOSTNAME || "0.0.0.0";
  const apiPort = Number(process.env.API_PORT || process.env.PORT_API || 4000);

  if (apiPort === port) {
    log(
      `WARNING: API_PORT (${apiPort}) equals public PORT — using API_PORT=4001 internally`,
    );
  }
  const internalApiPort = apiPort === port ? 4001 : apiPort;

  const apiChild = startApi(internalApiPort);

  process.env.HOSTINGER_CUSTOM_SERVER = "1";

  const app = next({
    dev: false,
    dir: webDir,
    hostname,
    port,
  });
  await app.prepare();
  const handle = app.getRequestHandler();

  const server = createServer((req, res) => {
    const parsed = parseUrl(req.url || "/", true);
    if (parsed.pathname?.startsWith("/api/")) {
      proxyToApi(req, res, internalApiPort);
      return;
    }
    handle(req, res, parsed).catch((err) => {
      log("Next handler error:", err);
      if (!res.headersSent) res.statusCode = 500;
      res.end("Internal Server Error");
    });
  });

  server.listen(port, hostname, () => {
    log(`Listening on http://${hostname}:${port}`);
    log(`Nest API internal: http://127.0.0.1:${internalApiPort}`);
    log(`Proxy: /api/* → Nest`);
  });

  for (const sig of ["SIGINT", "SIGTERM"]) {
    process.on(sig, () => {
      server.close();
      apiChild?.kill(sig);
      process.exit(0);
    });
  }
}

main().catch((err) => {
  console.error("[hostinger] FATAL:", err);
  process.exit(1);
});

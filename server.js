/**
 * Hostinger LiteSpeed (lsnode) entry — MUST be CommonJS `server.js`.
 * lsnode does: require(.../nodejs/server.js)
 *
 * Do NOT set PORT in hPanel — Hostinger injects it.
 * Nest runs on API_PORT; this process serves Next on PORT and proxies /api/*.
 */
"use strict";

const { createServer, request: httpRequest } = require("node:http");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const { parse: parseUrl } = require("node:url");
const next = require("next");

const root = __dirname;
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
  log(
    `Restoring ${label}: ${path.relative(root, src)} -> ${path.relative(root, dest)}`,
  );
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.cpSync(src, dest, { recursive: true, dereference: true });
  return true;
}

function ensureArtifacts() {
  if (!restoreDir(rootNext, webNext, "Next.js .next") && !fs.existsSync(webNext)) {
    throw new Error(
      "Missing Next.js build output (apps/web/.next or root .next)",
    );
  }
  if (!fs.existsSync(apiMain) && fs.existsSync(rootDistMain)) {
    restoreDir(path.join(root, "dist"), path.join(apiDir, "dist"), "API dist");
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

  const port = Number(process.env.PORT || 3000);
  const hostname = process.env.HOST || process.env.HOSTNAME || "0.0.0.0";
  const apiPort = Number(process.env.API_PORT || process.env.PORT_API || 4000);

  if (apiPort === port) {
    log(
      `WARNING: API_PORT (${apiPort}) equals public PORT — using 4001 internally`,
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
    if (parsed.pathname && parsed.pathname.startsWith("/api/")) {
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
    log("Proxy: /api/* → Nest");
    log("Entry: server.js (LiteSpeed / lsnode compatible)");
  });

  for (const sig of ["SIGINT", "SIGTERM"]) {
    process.on(sig, () => {
      server.close();
      if (apiChild) apiChild.kill(sig);
      process.exit(0);
    });
  }
}

main().catch((err) => {
  console.error("[hostinger] FATAL:", err);
  process.exit(1);
});

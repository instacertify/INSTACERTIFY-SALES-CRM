/**
 * Runtime entry copied to hostinger-run/server.js for Hostinger LiteSpeed.
 * Works when cwd/__dirname is the published Output directory (hostinger-run).
 */
"use strict";

const { createServer, request: httpRequest } = require("node:http");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const { parse: parseUrl } = require("node:url");

const root = __dirname;

function log(...args) {
  console.log("[hostinger]", ...args);
}

/** Resolve Next app dir inside standalone layout */
function resolveWebDir() {
  const candidates = [
    path.join(root, "apps", "web"),
    path.join(root, "apps", "web", ".next") && path.join(root, "apps", "web"),
    root,
  ];
  for (const dir of candidates) {
    if (!dir) continue;
    const hasNext =
      fs.existsSync(path.join(dir, ".next")) ||
      fs.existsSync(path.join(dir, "server.js")) ||
      fs.existsSync(path.join(root, "apps", "web", ".next"));
    if (fs.existsSync(dir) && (fs.existsSync(path.join(dir, ".next")) || fs.existsSync(path.join(dir, "package.json")) || dir === root)) {
      // Prefer apps/web when present
      if (fs.existsSync(path.join(root, "apps", "web"))) {
        return path.join(root, "apps", "web");
      }
      return dir;
    }
  }
  if (fs.existsSync(path.join(root, "apps", "web"))) {
    return path.join(root, "apps", "web");
  }
  return root;
}

function resolveNextModule() {
  const candidates = [
    path.join(root, "node_modules", "next"),
    path.join(root, "apps", "web", "node_modules", "next"),
    path.join(root, "..", "node_modules", "next"),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return require(p);
  }
  return require("next");
}

function resolveApiMain() {
  const candidates = [
    path.join(root, "api-dist", "main.js"),
    path.join(root, "dist", "main.js"),
    path.join(root, "apps", "api", "dist", "main.js"),
  ];
  return candidates.find((p) => fs.existsSync(p)) || null;
}

function startApi(apiPort) {
  const main = resolveApiMain();
  if (!main) {
    log("WARNING: API dist not found — /api will 502");
    return null;
  }
  const child = spawn(process.execPath, [main], {
    cwd: path.dirname(main),
    env: {
      ...process.env,
      NODE_ENV: "production",
      PORT: String(apiPort),
      API_PORT: String(apiPort),
    },
    stdio: "inherit",
  });
  child.on("exit", (code, signal) => {
    log(`API exited code=${code} signal=${signal} (web keeps running)`);
  });
  return child;
}

function proxyToApi(req, res, apiPort) {
  const headers = { ...req.headers, host: `127.0.0.1:${apiPort}` };
  const upstream = httpRequest(
    {
      hostname: "127.0.0.1",
      port: apiPort,
      path: req.url,
      method: req.method,
      headers,
    },
    (pres) => {
      res.writeHead(pres.statusCode || 502, pres.headers);
      pres.pipe(res);
    },
  );
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
      }),
    );
  });
  req.pipe(upstream);
}

async function main() {
  const port = Number(process.env.PORT || 3000);
  const hostname = process.env.HOST || "0.0.0.0";
  let apiPort = Number(process.env.API_PORT || process.env.PORT_API || 4000);
  if (apiPort === port) apiPort = 4001;

  const apiChild = startApi(apiPort);
  process.env.HOSTINGER_CUSTOM_SERVER = "1";

  const next = resolveNextModule();
  const webDir = resolveWebDir();
  log(`Next dir: ${webDir}`);
  log(`API main: ${resolveApiMain() || "(none)"}`);

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
      proxyToApi(req, res, apiPort);
      return;
    }
    handle(req, res, parsed).catch((err) => {
      log("Next error:", err);
      if (!res.headersSent) res.statusCode = 500;
      res.end("Internal Server Error");
    });
  });

  server.listen(port, hostname, () => {
    log(`Listening on http://${hostname}:${port}`);
    log(`Nest internal http://127.0.0.1:${apiPort}`);
    log("Entry OK: hostinger-run/server.js");
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

/**
 * ESM alias — Hostinger LiteSpeed requires CommonJS `server.js`.
 * Prefer Entry file: server.js
 */
import { createRequire } from "node:module";
createRequire(import.meta.url)("./server.js");

/**
 * Backward-compatible launcher — real Hostinger entry is ../server.js
 */
import { createRequire } from "node:module";
createRequire(import.meta.url)("../server.js");

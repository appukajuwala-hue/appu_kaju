/**
 * Node HTTP server for hosts that run Node directly — Hostinger's "Setup
 * Node.js App", cPanel/Passenger, a VPS, or plain `node infra/node/server.js`.
 *
 * It serves the built site AND the api/ endpoints from one origin. That is the
 * whole point: the browser keeps calling plain `/api/create-order` exactly as
 * it does under Vite and on Vercel, so there is no CORS, no preflight, and not
 * one line of client code changes between hosts.
 *
 * Like infra/lambda/handler.js, this is an adapter and nothing more. The
 * handlers in api/ stay the single source of truth for what the endpoints do;
 * this file only knows how to speak HTTP to them. Deploying somewhere new
 * should never mean editing api/.
 *
 * No dependencies. Node's own http and fs modules are enough, which keeps the
 * upload small and means nothing to `npm install` on the host.
 *
 * Run:  NODE_ENV=production node infra/node/server.js
 * Port: process.env.PORT (Passenger and most hosts set it), else 3000.
 */

import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { extname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import config from "../../api/config.js";
import createOrder from "../../api/create-order.js";
import verify from "../../api/verify.js";
import webhook from "../../api/webhook.js";

const ROUTES = {
  "/api/config": config,
  "/api/create-order": createOrder,
  "/api/verify": verify,
  "/api/webhook": webhook,
};

/** Where the built site lives. Override with SITE_ROOT if you deploy it elsewhere. */
const ROOT = resolve(
  process.env.SITE_ROOT ||
    join(fileURLToPath(new URL(".", import.meta.url)), "..", "..", "dist")
);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".mp4": "video/mp4",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
};

/**
 * Cache lifetimes, matching the S3 strategy in .github/workflows/deploy.yml so
 * the two hosts behave identically.
 *
 * Vite fingerprints everything in assets/, so those are immutable forever.
 * index.html must never be cached or visitors keep loading the previous
 * build's asset names and see a blank page. Everything else — images, video,
 * fonts, which keep their filenames across builds — gets a week.
 */
const cacheFor = (urlPath) => {
  if (urlPath === "/index.html") return "no-cache";
  if (urlPath.startsWith("/assets/")) return "public,max-age=31536000,immutable";
  return "public,max-age=604800";
};

const send = (res, status, body, headers = {}) => {
  res.writeHead(status, { "Content-Type": "application/json", ...headers });
  res.end(typeof body === "string" ? body : JSON.stringify(body));
};

/**
 * Resolves a url path to a file inside ROOT, or null.
 *
 * The containment check is the security boundary: a request for
 * `/../../.env.local` must not escape the site directory. Decoding first and
 * comparing the *resolved* path is what makes that hold — checking the raw
 * string for ".." is not enough, because "%2e%2e" decodes to the same thing.
 */
const resolveFile = async (urlPath) => {
  let decoded;
  try {
    decoded = decodeURIComponent(urlPath);
  } catch {
    return null; // malformed percent-encoding
  }
  if (decoded.includes("\0")) return null;

  const full = resolve(join(ROOT, decoded));
  if (full !== ROOT && !full.startsWith(ROOT + sep)) return null;

  try {
    const info = await stat(full);
    return info.isFile() ? full : null;
  } catch {
    return null;
  }
};

const serveFile = (res, file, urlPath, status = 200) => {
  res.writeHead(status, {
    "Content-Type": MIME[extname(file).toLowerCase()] || "application/octet-stream",
    "Cache-Control": cacheFor(urlPath),
    "X-Content-Type-Options": "nosniff",
  });
  createReadStream(file).pipe(res);
};

/** Reads the body as both parsed JSON and raw bytes — webhook.js needs the raw. */
const readBody = (req) =>
  new Promise((done) => {
    let raw = "";
    req.on("data", (c) => {
      raw += c;
      // Nothing this API accepts is remotely this large; stop a request from
      // buffering the process to death.
      if (raw.length > 1_000_000) req.destroy();
    });
    req.on("end", () => {
      let body = {};
      try {
        body = raw ? JSON.parse(raw) : {};
      } catch {
        body = {}; // validators turn this into a clean 400, not a 500
      }
      done({ body, raw });
    });
    req.on("error", () => done({ body: {}, raw: "" }));
  });

const server = createServer(async (req, res) => {
  const urlPath = (req.url || "/").split("?")[0];

  // ---- api ----------------------------------------------------------------
  const route = ROUTES[urlPath.replace(/\/+$/, "") || "/"];
  if (route) {
    const { body, raw } = await readBody(req);
    req.body = body;
    req.rawBody = raw;

    // The two helpers the handlers expect, on top of Node's ServerResponse.
    res.status = (code) => {
      res.statusCode = code;
      return res;
    };
    res.json = (payload) => {
      if (!res.headersSent) res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(payload));
      return res;
    };

    try {
      await route(req, res);
    } catch (err) {
      console.error(`Unhandled error in ${urlPath}:`, err);
      if (!res.writableEnded) send(res, 500, { error: "Something went wrong at our end." });
    }
    return;
  }

  if (urlPath.startsWith("/api/")) {
    return send(res, 404, { error: "Not found." }, { "Cache-Control": "no-store" });
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    return send(res, 405, { error: "Method not allowed." }, { Allow: "GET, HEAD" });
  }

  // ---- static -------------------------------------------------------------
  const direct = await resolveFile(urlPath === "/" ? "/index.html" : urlPath);
  if (direct) return serveFile(res, direct, urlPath);

  // ---- SPA fallback -------------------------------------------------------
  // Client-side routes like /shop and /checkout have no file behind them. They
  // must return index.html with 200, or a hard refresh 404s. Returning 200 for
  // a genuinely missing asset is the accepted trade — the app renders its own
  // 404 page for unknown routes.
  const index = await resolveFile("/index.html");
  if (index) return serveFile(res, index, "/index.html");

  send(res, 404, { error: "Not found." });
});

const port = Number(process.env.PORT) || 3000;
server.listen(port, () => {
  console.log(`Appu Kaju listening on ${port}`);
  console.log(`serving ${ROOT}`);
});

export default server;

/**
 * Node HTTP server for hosts that run Node directly — Hostinger's Node.js web
 * apps (Business / "Unlimited" and Cloud plans), a VPS, or plain
 * `node infra/node/server.js`.
 *
 * It serves the built site AND the api/ endpoints from one origin. That is the
 * whole point: the browser keeps calling plain `/api/create-order` exactly as
 * it does under Vite, so there is no CORS and VITE_API_BASE stays unset.
 *
 * Like infra/lambda/handler.js, this is an adapter and nothing more. The
 * handlers in api/ stay the single source of truth for what the endpoints do;
 * this file only knows how to speak HTTP to them.
 *
 * No dependencies. Node's own http, fs and zlib are enough, so there is
 * nothing extra to install on the host.
 *
 * WHY THE STATIC SERVING IS MORE THAN A READ STREAM. On a CDN — CloudFront,
 * Amplify — range requests, compression and conditional requests are handled
 * for you. Here nothing sits in front, so this file has to do them itself, and
 * each one fixes something a visitor would notice:
 *
 *   Range requests  Safari and every iPhone refuse to play a <video> unless
 *                   the server answers byte-range requests with 206 Partial
 *                   Content. Without them the three videos are blank on iOS.
 *   Compression     The main bundle is ~409 KB raw and ~130 KB as Brotli —
 *                   the difference between a quick and a slow first load on
 *                   mobile data.
 *   ETag / 304      index.html is served no-cache, so every visit revalidates
 *                   it. A 304 answers that with no body instead of resending it.
 *
 * Run:  node infra/node/server.js      (or `npm start`)
 * Port: process.env.PORT, which the host supplies; 3000 if unset.
 */

import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { readFile, readdir, stat } from "node:fs/promises";
import { extname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { brotliCompressSync, constants as zlib, gzipSync } from "node:zlib";

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
 * Text formats worth compressing. Images, video and woff2 are already
 * compressed formats; running them through Brotli costs CPU for nothing.
 */
const COMPRESSIBLE = new Set([".html", ".js", ".mjs", ".css", ".json", ".xml", ".txt", ".svg"]);

/**
 * Cache lifetimes, matching the S3 strategy so every host behaves the same.
 * Vite fingerprints everything in assets/, so those are immutable. index.html
 * must never be cached or visitors keep loading the previous build's asset
 * names and see a blank page.
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

// ---------------------------------------------------------------- precompress

/**
 * Brotli and gzip copies of every compressible file, built once at startup.
 *
 * The site is small and changes only on redeploy — which restarts this
 * process — so compressing per request would spend CPU on every visit to
 * produce the same bytes. Built once, Brotli can run at its slowest, smallest
 * setting, and serving costs nothing.
 */
const precompressed = new Map();

const walk = async (dir) => {
  const entries = await readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((e) => (e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]))
  );
  return nested.flat();
};

const precompress = async () => {
  let saved = 0;
  for (const file of await walk(ROOT)) {
    if (!COMPRESSIBLE.has(extname(file).toLowerCase())) continue;
    const raw = await readFile(file);
    // Below this, headers outweigh the saving.
    if (raw.length < 1024) continue;
    const br = brotliCompressSync(raw, {
      params: {
        [zlib.BROTLI_PARAM_QUALITY]: zlib.BROTLI_MAX_QUALITY,
        [zlib.BROTLI_PARAM_SIZE_HINT]: raw.length,
      },
    });
    const gz = gzipSync(raw, { level: 9 });
    precompressed.set(resolve(file), { br, gz });
    saved += raw.length - br.length;
  }
  return { files: precompressed.size, saved };
};

// --------------------------------------------------------------- static files

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
    return info.isFile() ? { full, info } : null;
  } catch {
    return null;
  }
};

/**
 * Parses a single `Range: bytes=…` header against a file size.
 *
 * Returns null to serve the whole file, "unsatisfiable" for a range past the
 * end, or { start, end } inclusive. Multi-range requests are answered with the
 * whole file, which the HTTP spec allows and no browser needs otherwise.
 */
const parseRange = (header, size) => {
  if (!header) return null;
  const m = /^bytes=(\d*)-(\d*)$/.exec(String(header).trim());
  if (!m || (m[1] === "" && m[2] === "")) return null;

  let start;
  let end;
  if (m[1] === "") {
    // "bytes=-500": the final 500 bytes.
    const suffix = Number(m[2]);
    if (suffix === 0) return "unsatisfiable";
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else {
    start = Number(m[1]);
    end = m[2] === "" ? size - 1 : Math.min(Number(m[2]), size - 1);
  }

  if (start >= size || start > end) return "unsatisfiable";
  return { start, end };
};

/** True when the browser already holds this exact version. */
const isFresh = (req, etag) =>
  String(req.headers["if-none-match"] || "")
    .split(",")
    .some((tag) => tag.trim() === etag || tag.trim() === "*");

const serveFile = (req, res, { full, info }, urlPath) => {
  const etag = `W/"${info.size.toString(16)}-${Math.floor(info.mtimeMs).toString(16)}"`;
  const headers = {
    "Content-Type": MIME[extname(full).toLowerCase()] || "application/octet-stream",
    "Cache-Control": cacheFor(urlPath),
    "X-Content-Type-Options": "nosniff",
    "Last-Modified": info.mtime.toUTCString(),
    ETag: etag,
  };
  const head = req.method === "HEAD";

  if (isFresh(req, etag)) {
    res.writeHead(304, { ETag: etag, "Cache-Control": headers["Cache-Control"] });
    return res.end();
  }

  // ---- compressed, from memory ---------------------------------------------
  const pre = precompressed.get(full);
  if (pre) {
    // Tells any cache between here and the visitor that the body depends on
    // what the browser said it accepts, so a Brotli copy is never handed to
    // a client that cannot decode it.
    headers.Vary = "Accept-Encoding";
    const accept = String(req.headers["accept-encoding"] || "");
    const chosen = /\bbr\b/.test(accept)
      ? ["br", pre.br]
      : /\bgzip\b/.test(accept)
        ? ["gzip", pre.gz]
        : null;

    if (chosen) {
      headers["Content-Encoding"] = chosen[0];
      headers["Content-Length"] = chosen[1].length;
      res.writeHead(200, headers);
      return res.end(head ? undefined : chosen[1]);
    }
  }

  // ---- identity, with byte ranges -------------------------------------------
  headers["Accept-Ranges"] = "bytes";
  const range = parseRange(req.headers.range, info.size);

  if (range === "unsatisfiable") {
    res.writeHead(416, { "Content-Range": `bytes */${info.size}` });
    return res.end();
  }

  const stream = (options) =>
    createReadStream(full, options)
      // A file removed mid-request must end the response, not hang it.
      .on("error", () => res.destroy())
      .pipe(res);

  if (range) {
    headers["Content-Range"] = `bytes ${range.start}-${range.end}/${info.size}`;
    headers["Content-Length"] = range.end - range.start + 1;
    res.writeHead(206, headers);
    return head ? res.end() : stream(range);
  }

  headers["Content-Length"] = info.size;
  res.writeHead(200, headers);
  return head ? res.end() : stream();
};

// ------------------------------------------------------------------------ api

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

// --------------------------------------------------------------------- server

const server = createServer(async (req, res) => {
  const urlPath = (req.url || "/").split("?")[0];

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

  const direct = await resolveFile(urlPath === "/" ? "/index.html" : urlPath);
  if (direct) return serveFile(req, res, direct, urlPath === "/" ? "/index.html" : urlPath);

  // Client-side routes like /shop and /checkout have no file behind them. They
  // must return index.html with 200, or a hard refresh 404s. The app renders
  // its own 404 page for routes it does not know.
  const index = await resolveFile("/index.html");
  if (index) return serveFile(req, res, index, "/index.html");

  send(res, 404, { error: "Not found." });
});

// Compress before listening, so the first visitor never gets the slow path.
// If it fails — an unreadable dist/, say — the site still serves uncompressed.
try {
  const { files, saved } = await precompress();
  console.log(`precompressed ${files} files, ${Math.round(saved / 1024)} KB saved per full load`);
} catch (err) {
  console.error("precompression skipped:", err?.message || err);
}

const port = Number(process.env.PORT) || 3000;
server.listen(port, () => {
  console.log(`Appu Kaju listening on ${port}`);
  console.log(`serving ${ROOT}`);
});

export default server;

/**
 * Tests infra/node/server.js as a real process, over real HTTP.
 *
 *   npm run build && node infra/node/server.test.js
 *
 * Needs dist/ built. Starts the server as a child process on a spare port, so
 * it exercises exactly what a host runs — including the startup precompression
 * — then stops it.
 *
 * Uses node:http rather than fetch on purpose: fetch silently decompresses
 * responses, which would hide whether compression happened at all.
 *
 * Offline. The API checks stop at validation and signature verification, both
 * of which reject before any outbound call.
 */

import { spawn, spawnSync } from "node:child_process";
import { createHmac } from "node:crypto";
import { existsSync, statSync } from "node:fs";
import { request } from "node:http";
import { join, resolve } from "node:path";

const ROOT = resolve(process.cwd());
const DIST = join(ROOT, "dist");

if (!existsSync(join(DIST, "index.html"))) {
  console.error("dist/ is not built — run `npm run build` first.");
  process.exit(1);
}

const PORT = 40000 + Math.floor(Math.random() * 20000);
const WEBHOOK_SECRET = "whsec_server_test";

let pass = 0;
let fail = 0;
const check = (label, ok, detail = "") => {
  if (ok) {
    pass += 1;
    console.log(`  PASS  ${label}`);
  } else {
    fail += 1;
    console.log(`  FAIL  ${label}   ${detail}`);
  }
};

/**
 * Some hosts start a Node app by require()-ing the entry file instead of
 * importing it — LiteSpeed's lsnode.js, which Hostinger uses, is one. If any
 * module in the graph gains a top-level await, require() throws
 * ERR_REQUIRE_ASYNC_MODULE before a line runs, and the site serves 503 with a
 * perfectly clean build log. This caught exactly that, so it runs first.
 */
const checkRequireable = () => {
  const r = spawnSync(
    process.execPath,
    ["--input-type=commonjs", "-e", "require('./server.js'); process.exit(0);"],
    { cwd: ROOT, encoding: "utf8", timeout: 30000 }
  );
  const stderr = r.stderr || "";
  const tla = stderr.includes("ERR_REQUIRE_ASYNC_MODULE");
  check(
    "entry file can be require()d — no top-level await in the graph",
    r.status === 0 && !tla,
    tla ? "ERR_REQUIRE_ASYNC_MODULE — a top-level await crept back in" : stderr.split("\n")[0] || `exit ${r.status}`
  );
};

/** Raw HTTP, returning status, headers and the exact bytes sent. */
const http = (method, path, { headers = {}, body } = {}) =>
  new Promise((done, reject) => {
    const req = request(
      { host: "127.0.0.1", port: PORT, method, path, headers },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () =>
          done({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) })
        );
      }
    );
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });

// ---------------------------------------------------------------- start server
const child = spawn(process.execPath, [join(ROOT, "server.js")], {
  env: {
    ...process.env,
    PORT: String(PORT),
    RAZORPAY_KEY_ID: "rzp_test_server_dummy",
    RAZORPAY_KEY_SECRET: "server_dummy_secret",
    RAZORPAY_WEBHOOK_SECRET: WEBHOOK_SECRET,
  },
  stdio: ["ignore", "pipe", "pipe"],
});

let log = "";
child.stdout.on("data", (d) => (log += d));
child.stderr.on("data", (d) => (log += d));

const ready = await new Promise((done) => {
  const started = Date.now();
  const poll = setInterval(() => {
    if (log.includes("listening on")) {
      clearInterval(poll);
      done(true);
    } else if (Date.now() - started > 30000 || child.exitCode !== null) {
      clearInterval(poll);
      done(false);
    }
  }, 100);
});

if (!ready) {
  console.error("server did not start:\n" + log);
  child.kill();
  process.exit(1);
}

try {
  console.log("\n=== startup contract ===");
  checkRequireable();

  const precompressLine = log.split("\n").find((l) => l.startsWith("precompressed"));
  console.log(`started on ${PORT} — ${precompressLine || "no precompression line"}`);

  // --------------------------------------------------------- pages and routing
  console.log("\n=== pages and routing ===");
  {
    const home = await http("GET", "/");
    check("/ -> 200 html", home.status === 200 && /text\/html/.test(home.headers["content-type"]), home.status);

    for (const route of ["/shop", "/checkout", "/order/APK-TEST"]) {
      const r = await http("GET", route);
      check(`${route} -> app shell (SPA fallback)`, r.status === 200 && /text\/html/.test(r.headers["content-type"]), r.status);
    }

    const sitemap = await http("GET", "/sitemap.xml");
    check("/sitemap.xml served as xml, not the app", sitemap.status === 200 && /xml/.test(sitemap.headers["content-type"]), sitemap.headers["content-type"]);

    const post = await http("POST", "/shop");
    check("POST to a page -> 405", post.status === 405, post.status);
  }

  // --------------------------------------------------------------- compression
  console.log("\n=== compression ===");
  {
    const { readdirSync } = await import("node:fs");
    const js = readdirSync(join(DIST, "assets")).find((f) => /^index-.*\.js$/.test(f));
    const path = `/assets/${js}`;
    const size = statSync(join(DIST, "assets", js)).size;

    const br = await http("GET", path, { headers: { "Accept-Encoding": "gzip, deflate, br" } });
    check("Brotli when the browser offers it", br.headers["content-encoding"] === "br", br.headers["content-encoding"]);
    check(
      `Brotli body actually smaller (${Math.round(br.body.length / 1024)} KB vs ${Math.round(size / 1024)} KB)`,
      br.body.length < size * 0.5,
      `${br.body.length} of ${size}`
    );
    check("Content-Length matches the compressed bytes", Number(br.headers["content-length"]) === br.body.length, br.headers["content-length"]);
    check("Vary: Accept-Encoding, so caches keep encodings apart", /accept-encoding/i.test(br.headers.vary || ""), br.headers.vary);

    const gz = await http("GET", path, { headers: { "Accept-Encoding": "gzip" } });
    check("gzip when Brotli is not offered", gz.headers["content-encoding"] === "gzip", gz.headers["content-encoding"]);

    const plain = await http("GET", path);
    check("identity when nothing is offered", !plain.headers["content-encoding"] && plain.body.length === size, `${plain.body.length} of ${size}`);

    const index = await http("GET", "/", { headers: { "Accept-Encoding": "br" } });
    check("index.html is compressed too", index.headers["content-encoding"] === "br", index.headers["content-encoding"]);

    const video = await http("GET", "/videos/pour.mp4", { headers: { "Accept-Encoding": "gzip, br" } });
    check("video is never re-compressed", !video.headers["content-encoding"], video.headers["content-encoding"]);
  }

  // ------------------------------------------------------------- byte ranges
  console.log("\n=== byte ranges (what iPhone Safari needs to play video) ===");
  {
    const size = statSync(join(DIST, "videos", "pour.mp4")).size;

    const full = await http("GET", "/videos/pour.mp4");
    check("advertises Accept-Ranges: bytes", full.headers["accept-ranges"] === "bytes", full.headers["accept-ranges"]);
    check("full response carries Content-Length", Number(full.headers["content-length"]) === size, full.headers["content-length"]);

    const first = await http("GET", "/videos/pour.mp4", { headers: { Range: "bytes=0-1023" } });
    check("bytes=0-1023 -> 206", first.status === 206, first.status);
    check("  with the right Content-Range", first.headers["content-range"] === `bytes 0-1023/${size}`, first.headers["content-range"]);
    check("  and exactly 1024 bytes", first.body.length === 1024, first.body.length);

    // Safari's opening probe.
    const probe = await http("GET", "/videos/pour.mp4", { headers: { Range: "bytes=0-1" } });
    check("Safari's bytes=0-1 probe -> 206, 2 bytes", probe.status === 206 && probe.body.length === 2, `${probe.status} ${probe.body.length}`);

    const tail = await http("GET", "/videos/pour.mp4", { headers: { Range: "bytes=-500" } });
    check("suffix bytes=-500 -> last 500 bytes", tail.status === 206 && tail.body.length === 500 && tail.headers["content-range"] === `bytes ${size - 500}-${size - 1}/${size}`, `${tail.status} ${tail.headers["content-range"]}`);

    const open = await http("GET", "/videos/pour.mp4", { headers: { Range: `bytes=${size - 100}-` } });
    check("open-ended range -> to the end", open.status === 206 && open.body.length === 100, `${open.status} ${open.body.length}`);

    const past = await http("GET", "/videos/pour.mp4", { headers: { Range: `bytes=${size + 10}-` } });
    check("range past the end -> 416", past.status === 416 && past.headers["content-range"] === `bytes */${size}`, `${past.status} ${past.headers["content-range"]}`);

    const junk = await http("GET", "/videos/pour.mp4", { headers: { Range: "lines=1-2" } });
    check("malformed range -> whole file, not an error", junk.status === 200 && junk.body.length === size, junk.status);
  }

  // ------------------------------------------------- conditional requests, HEAD
  console.log("\n=== conditional requests and HEAD ===");
  {
    const first = await http("GET", "/");
    check("index.html has an ETag", Boolean(first.headers.etag), first.headers.etag);
    check("index.html is no-cache", first.headers["cache-control"] === "no-cache", first.headers["cache-control"]);

    const again = await http("GET", "/", { headers: { "If-None-Match": first.headers.etag } });
    check("revisit with the ETag -> 304, no body", again.status === 304 && again.body.length === 0, `${again.status} ${again.body.length}`);

    const head = await http("HEAD", "/videos/pour.mp4");
    check("HEAD -> headers only", head.status === 200 && head.body.length === 0 && Number(head.headers["content-length"]) > 0, `${head.status} body=${head.body.length}`);

    const js = await http("GET", "/robots.txt");
    check("robots.txt cached a week", js.headers["cache-control"] === "public,max-age=604800", js.headers["cache-control"]);
  }

  // ----------------------------------------------------------------- security
  console.log("\n=== path traversal ===");
  {
    for (const path of ["/../.env.local", "/..%2f..%2f.env.local", "/%2e%2e/%2e%2e/package.json", "/./../../server.js"]) {
      const r = await http("GET", path);
      const text = r.body.toString("utf8");
      check(`${path} leaks nothing`, !/RAZORPAY|"name":\s*"appu-kaju"|import "\.\/infra/.test(text), r.status);
    }

    // dist/ really does contain a .htaccess, so this proves the block works on
    // a file that exists rather than one that would 404 anyway.
    const htaccess = await http("GET", "/.htaccess");
    check(
      "/.htaccess exists in dist but is not served",
      existsSync(join(DIST, ".htaccess")) && htaccess.status === 404 && !/RewriteEngine/.test(htaccess.body.toString()),
      `${htaccess.status}`
    );
    const nestedDot = await http("GET", "/assets/.env");
    check("dotfiles in subfolders -> 404 too", nestedDot.status === 404, nestedDot.status);
  }

  // ---------------------------------------------------------------------- api
  console.log("\n=== api through the same server ===");
  {
    const cfg = await http("GET", "/api/config");
    const cfgBody = JSON.parse(cfg.body.toString());
    check("GET /api/config -> 200 testMode", cfg.status === 200 && cfgBody.testMode === true, cfg.status);

    const wrong = await http("GET", "/api/create-order");
    check("GET /api/create-order -> 405", wrong.status === 405, wrong.status);

    const missing = await http("GET", "/api/nope");
    check("unknown /api path -> 404 json, not the app", missing.status === 404 && /json/.test(missing.headers["content-type"]), missing.status);

    const bad = await http("POST", "/api/create-order", {
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: [{ id: "gold-bar", qty: 1 }], customer: { name: "A" } }),
    });
    check("POST body is parsed and validated -> 400", bad.status === 400, `${bad.status} ${bad.body}`);

    const payload = JSON.stringify({ event: "refund.created", payload: {} });
    const good = await http("POST", "/api/webhook", {
      headers: {
        "Content-Type": "application/json",
        "x-razorpay-signature": createHmac("sha256", WEBHOOK_SECRET).update(payload).digest("hex"),
      },
      body: payload,
    });
    check("webhook signed over the raw body -> 200", good.status === 200, `${good.status} ${good.body}`);

    const forged = await http("POST", "/api/webhook", {
      headers: { "Content-Type": "application/json", "x-razorpay-signature": "deadbeef" },
      body: payload,
    });
    check("forged webhook signature -> 400", forged.status === 400, forged.status);
  }
} finally {
  child.kill();
}

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);

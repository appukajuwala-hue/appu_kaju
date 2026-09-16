import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

import { absoluteUrl, SITE_URL, sitemapRoutes } from "./src/constants/index.js";
import { organisationLd } from "./src/lib/structuredData.js";

/**
 * Substitutes %SITE_URL% in index.html with the constant.
 *
 * index.html is static, so it cannot import the constant the way the React
 * code does — but its canonical and Open Graph tags need the same absolute
 * origin, and a domain written in two places is a domain that will eventually
 * disagree with itself. This keeps src/constants/index.js the only place the
 * origin appears.
 */
const siteUrlHtml = () => ({
  name: "site-url-html",
  transformIndexHtml: {
    order: "pre",
    handler: (html) =>
      html
        .replaceAll("%SITE_URL%", SITE_URL)
        // The shop's Schema.org block, built from the same constants the
        // pages render from. Injected here rather than mounted by React so a
        // crawler that does not execute JavaScript still sees the address,
        // phone number and opening details.
        .replace(
          "</head>",
          `  <script type="application/ld+json">${JSON.stringify(
            organisationLd()
          )}</script>
  </head>`
        ),
  },
});

/**
 * Serves the api/ directory during `npm run dev`.
 *
 * In production Vercel turns every api/*.js file into a serverless function.
 * Plain `vite` knows nothing about that, so without this the checkout would 404
 * on /api/create-order locally and the only way to exercise payments would be a
 * deploy. `vercel dev` is the usual answer, but it needs the project linked to
 * the Vercel account that owns it, which is not always the account at the
 * keyboard — this keeps local development self-contained either way.
 *
 * The handlers are re-imported per request (with a cache-busting query) so
 * editing an endpoint takes effect without restarting the dev server.
 */
const apiDevServer = (env) => ({
  name: "api-dev-server",
  configureServer(server) {
    // Vercel injects environment variables into the function process; mirror
    // that locally from .env.local so handlers read process.env as they would
    // in production.
    Object.assign(process.env, env);

    server.middlewares.use(async (req, res, next) => {
      if (!req.url?.startsWith("/api/")) return next();

      const route = req.url.split("?")[0].replace(/\/+$/, "");
      // Only ever resolve inside api/ — a route with ".." must not walk out.
      if (!/^\/api\/[\w-]+$/.test(route)) return next();
      if (!existsSync(resolve(process.cwd(), `.${route}.js`))) return next();

      // Read the body Connect-style; Vercel hands handlers an already-parsed
      // req.body, so match that contract.
      const raw = await new Promise((resolve) => {
        let data = "";
        req.on("data", (c) => (data += c));
        req.on("end", () => resolve(data));
      });
      try {
        req.body = raw ? JSON.parse(raw) : {};
      } catch {
        req.body = {};
      }
      // The exact bytes, kept alongside the parsed object: api/webhook.js
      // verifies Razorpay's signature against these and nothing else.
      req.rawBody = raw;

      // Shim the two response helpers the handlers use.
      res.status = (code) => {
        res.statusCode = code;
        return res;
      };
      res.json = (payload) => {
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify(payload));
        return res;
      };

      try {
        // Root-relative so this works the same on Windows and POSIX.
        const mod = await server.ssrLoadModule(`.${route}.js`);
        await mod.default(req, res);
      } catch (err) {
        server.config.logger.error(`api ${route} failed: ${err?.stack || err}`);
        if (!res.writableEnded) {
          res.status(500).json({ error: "Something went wrong at our end." });
        }
      }
    });
  },
});

/**
 * Emits robots.txt and sitemap.xml.
 *
 * Generated rather than committed to public/, for two reasons: both files have
 * to carry the absolute domain, which lives in one constant and must not be
 * copy-pasted; and the sitemap's url list is derived from the navigation, so a
 * page added to the nav appears in the sitemap without anyone remembering to
 * edit a second file.
 *
 * Served from memory in dev and written into dist/ on build, so `npm run dev`
 * and the deployed site answer /robots.txt identically.
 */
const seoFiles = () => {
  // Date only — sitemaps take W3C dates, and a build timestamp would churn
  // lastmod on every deploy whether or not the page actually changed.
  const lastmod = new Date().toISOString().slice(0, 10);

  const robotsTxt = () =>
    [
      "User-agent: *",
      "Allow: /",
      "",
      "# Transactional pages. /checkout is empty without a cart, and an order",
      "# page is one customer's address and phone number.",
      "Disallow: /checkout",
      "Disallow: /order/",
      "",
      `Sitemap: ${SITE_URL}/sitemap.xml`,
      "",
    ].join("\n");

  const sitemapXml = () =>
    [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      ...sitemapRoutes.map(({ path, priority, changefreq }) =>
        [
          "  <url>",
          `    <loc>${absoluteUrl(path)}</loc>`,
          `    <lastmod>${lastmod}</lastmod>`,
          `    <changefreq>${changefreq}</changefreq>`,
          `    <priority>${priority}</priority>`,
          "  </url>",
        ].join("\n")
      ),
      "</urlset>",
      "",
    ].join("\n");

  const FILES = {
    "/robots.txt": { type: "text/plain", body: robotsTxt },
    "/sitemap.xml": { type: "application/xml", body: sitemapXml },
  };

  return {
    name: "seo-files",

    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const file = FILES[req.url?.split("?")[0]];
        if (!file) return next();
        res.setHeader("Content-Type", `${file.type}; charset=utf-8`);
        res.end(file.body());
      });
    },

    generateBundle() {
      for (const [route, file] of Object.entries(FILES)) {
        this.emitFile({
          type: "asset",
          fileName: route.slice(1),
          source: file.body(),
        });
      }
    },
  };
};

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Empty prefix: load every variable, not just VITE_ ones. These stay on the
  // server side of the dev middleware and are never exposed to the client
  // bundle — only `import.meta.env.VITE_*` reaches the browser.
  const env = loadEnv(mode, process.cwd(), "");

  return {
    base: "/",
    plugins: [
      react(),
      tailwindcss(),
      siteUrlHtml(),
      seoFiles(),
      apiDevServer(env),
    ],
  };
});

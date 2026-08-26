import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

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

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Empty prefix: load every variable, not just VITE_ ones. These stay on the
  // server side of the dev middleware and are never exposed to the client
  // bundle — only `import.meta.env.VITE_*` reaches the browser.
  const env = loadEnv(mode, process.cwd(), "");

  return {
    base: "/",
    plugins: [react(), tailwindcss(), apiDevServer(env)],
  };
});

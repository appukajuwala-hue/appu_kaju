/**
 * Where the API lives.
 *
 * Empty by default, so every call stays relative — `/api/create-order` — and
 * reaches the same origin as the page. That is how it works under
 * `npm run dev`, behind CloudFront, and from infra/node/server.js, and none of
 * those need anything set.
 *
 * Set VITE_API_BASE only when the pages and the API are on different origins:
 * AWS Amplify hosting the site, with the endpoints on a Lambda Function URL.
 * Amplify cannot proxy /api/* to a Function URL, because its rewrites keep the
 * visitor's Host header and a Function URL rejects any Host but its own — so
 * the browser has to call the Function URL directly, and that URL's CORS
 * settings decide which sites may.
 *
 * Vite bakes this in at build time. Changing it needs a rebuild, and it must
 * never go in .env.local, or local development starts calling the live API.
 * It is not a secret: the browser has to know it.
 */
const BASE = (import.meta.env.VITE_API_BASE || "").replace(/\/+$/, "");

/** `apiUrl("/api/verify")` -> "/api/verify", or "https://…on.aws/api/verify". */
export const apiUrl = (path) => `${BASE}${path}`;

/**
 * AWS Lambda adapter for the handlers in api/.
 *
 * Those handlers are written to Vercel's convention: an exported `(req, res)`
 * function that replies through `res.status().json()`. A Lambda Function URL
 * speaks something else entirely — it hands you an event object and expects
 * `{ statusCode, headers, body }` back.
 *
 * Rather than rewrite the handlers for AWS — which would also break running
 * them on Vercel and under the Vite dev middleware in vite.config.js — this
 * file translates between the two shapes. api/ stays the single source of
 * truth for what the endpoints do; this is the only file that knows about AWS.
 *
 * One function serves both routes rather than one function per endpoint. There
 * is no cost difference inside the free tier, but a single function takes all
 * the traffic and so stays warm more of the time, and there is one set of
 * environment variables to keep in step instead of two.
 *
 * Deployed as: handler = infra/lambda/handler.handler
 */

import createOrder from "../../api/create-order.js";
import verify from "../../api/verify.js";

const ROUTES = {
  "/api/create-order": createOrder,
  "/api/verify": verify,
};

const JSON_HEADERS = { "content-type": "application/json" };

const reply = (statusCode, payload) => ({
  statusCode,
  headers: JSON_HEADERS,
  body: JSON.stringify(payload),
});

/**
 * Decodes the event body into whatever the handlers expect on `req.body`.
 * Vercel hands handlers an already-parsed object, so match that contract.
 */
const parseBody = (event) => {
  if (!event.body) return {};
  const raw = event.isBase64Encoded
    ? Buffer.from(event.body, "base64").toString("utf8")
    : event.body;
  try {
    return JSON.parse(raw);
  } catch {
    // Same choice as the dev shim: a malformed body becomes an empty one, so
    // the field validators reject it as a clean 400 rather than a 500.
    return {};
  }
};

/**
 * Minimal stand-in for Node's ServerResponse covering only what the handlers
 * actually touch: setHeader, status and json. `settled` resolves the moment
 * json() is called, which every code path in api/ does exactly once.
 */
const createResponse = () => {
  let resolve;
  const settled = new Promise((r) => (resolve = r));
  const headers = { ...JSON_HEADERS };
  let statusCode = 200;
  let responded = false;

  const res = {
    setHeader(name, value) {
      headers[String(name).toLowerCase()] = String(value);
      return res;
    },
    status(code) {
      statusCode = code;
      return res;
    },
    json(payload) {
      // Guard against a double reply resolving the promise twice; the first
      // response is the one that counts, as it would be over a real socket.
      if (!responded) {
        responded = true;
        resolve({ statusCode, headers, body: JSON.stringify(payload) });
      }
      return res;
    },
  };

  return { res, settled, hasResponded: () => responded };
};

export const handler = async (event) => {
  const method = event?.requestContext?.http?.method || "GET";
  // Strip a trailing slash so /api/verify/ and /api/verify are the same route.
  const path = (event?.rawPath || "/").replace(/\/+$/, "") || "/";

  const route = ROUTES[path];
  if (!route) return reply(404, { error: "Not found." });

  const req = {
    method,
    body: parseBody(event),
    headers: event?.headers || {},
    url: path,
  };
  const { res, settled, hasResponded } = createResponse();

  try {
    await route(req, res);
  } catch (err) {
    // postOnly already catches errors thrown inside the handlers, so getting
    // here means something failed outside it. Log loudly, say nothing useful
    // to the caller.
    console.error(`Unhandled error in ${path}:`, err);
    return reply(500, { error: "Something went wrong at our end." });
  }

  if (!hasResponded()) {
    console.error(`Handler for ${path} returned without replying.`);
    return reply(500, { error: "Something went wrong at our end." });
  }

  return settled;
};

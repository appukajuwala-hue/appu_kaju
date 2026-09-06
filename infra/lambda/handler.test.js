/**
 * Tests the Lambda adapter with synthetic Function URL events.
 *
 *   infra/package-lambda.sh && node infra/lambda/handler.test.js
 *
 * If build/fn exists it tests the *staged zip contents* rather than the repo,
 * which also proves the packaged file layout resolves — the api/ handlers
 * import ../../src/constants/index.js and that path has to survive zipping.
 *
 * Needs RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET. The final case creates one
 * real test-mode order to prove server-side pricing end to end; set SKIP_LIVE=1
 * to stop before it. Everything before that is offline — the validators reject
 * bad input before any outbound call, which is the whole point of them.
 */

import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const staged = resolve(process.cwd(), "build/fn/infra/lambda/handler.js");
const target = existsSync(staged) ? staged : resolve(process.cwd(), "infra/lambda/handler.js");
const { handler } = await import(pathToFileURL(target).href);
console.log(`testing ${existsSync(staged) ? "staged package" : "repo copy"}: ${target}`);

const CUST = {
  name: "Asha R",
  email: "a@b.com",
  phone: "9876543210",
  address: "12 Hazratganj",
  city: "Lucknow",
  state: "UP",
  pin: "226001",
};

const event = (method, path, body, { base64 = false } = {}) => {
  let raw = body === undefined ? null : typeof body === "string" ? body : JSON.stringify(body);
  if (raw !== null && base64) raw = Buffer.from(raw, "utf8").toString("base64");
  return {
    version: "2.0",
    rawPath: path,
    rawQueryString: "",
    headers: { "content-type": "application/json" },
    requestContext: { http: { method, path } },
    body: raw,
    isBase64Encoded: base64,
  };
};

let pass = 0;
let fail = 0;

const check = (label, cond, detail = "") => {
  if (cond) {
    pass += 1;
    console.log(`  PASS  ${label}`);
  } else {
    fail += 1;
    console.log(`  FAIL  ${label}   ${detail}`);
  }
};

const run = async (ev, assert) => {
  const res = await handler(ev);
  let body = {};
  try {
    body = JSON.parse(res.body);
  } catch {
    /* non-JSON body leaves it empty */
  }
  assert(res, body);
};

console.log("\n=== routing and method guards ===");
await run(event("GET", "/api/create-order"), (r) =>
  check("GET /api/create-order -> 405", r.statusCode === 405 && r.headers.allow === "POST", r.statusCode)
);
await run(event("GET", "/api/verify"), (r) => check("GET /api/verify -> 405", r.statusCode === 405, r.statusCode));
await run(event("POST", "/api/nope", {}), (r) => check("unknown path -> 404", r.statusCode === 404, r.statusCode));
await run(event("GET", "/api/verify/"), (r) =>
  check("trailing slash routes the same", r.statusCode === 405, r.statusCode)
);

console.log("\n=== body decoding ===");
await run(event("POST", "/api/create-order", "{oops"), (r) =>
  check("malformed JSON -> 400, not 500", r.statusCode === 400, r.statusCode)
);
await run(event("POST", "/api/create-order"), (r) =>
  check("absent body -> 400, not 500", r.statusCode === 400, r.statusCode)
);
await run(
  event("POST", "/api/create-order", { customer: CUST, items: [{ id: "nope", qty: 1 }] }, { base64: true }),
  (r, b) =>
    check("base64 body is decoded", r.statusCode === 400 && /nope/.test(b.error || ""), `${r.statusCode} ${r.body}`)
);

console.log("\n=== validation, all before any outbound call ===");
const rejected = [
  ["negative qty", { customer: CUST, items: [{ id: "appu-10kg", qty: -5 }] }],
  ["zero qty", { customer: CUST, items: [{ id: "appu-10kg", qty: 0 }] }],
  ["fractional qty", { customer: CUST, items: [{ id: "appu-250", qty: 1.5 }] }],
  ["unknown sku", { customer: CUST, items: [{ id: "free-cashews", qty: 1 }] }],
  ["empty cart", { customer: CUST, items: [] }],
  ["items not an array", { customer: CUST, items: "kuber-250" }],
  ["missing customer", { items: [{ id: "kuber-250", qty: 1 }] }],
  ["bad email", { customer: { ...CUST, email: "not-an-email" }, items: [{ id: "kuber-250", qty: 1 }] }],
  ["5-digit pin", { customer: { ...CUST, pin: "22600" }, items: [{ id: "kuber-250", qty: 1 }] }],
  ["short phone", { customer: { ...CUST, phone: "98765" }, items: [{ id: "kuber-250", qty: 1 }] }],
];
for (const [label, body] of rejected) {
  await run(event("POST", "/api/create-order", body), (r) =>
    check(`${label} -> 400`, r.statusCode === 400, `${r.statusCode} ${r.body}`)
  );
}

console.log("\n=== forged verification ===");
await run(
  event("POST", "/api/verify", {
    razorpay_order_id: "order_FAKE",
    razorpay_payment_id: "pay_FAKE",
    razorpay_signature: "deadbeef",
  }),
  (r, b) => check("forged signature -> 400 {ok:false}", r.statusCode === 400 && b.ok === false, r.statusCode)
);
await run(event("POST", "/api/verify", {}), (r) =>
  check("missing verify fields -> 400", r.statusCode === 400, r.statusCode)
);

if (!process.env.SKIP_LIVE) {
  console.log("\n=== server-side pricing, against the live Razorpay API ===");
  // rimmee-250 is ₹300 each. The payload claims the whole order costs ₹1.
  await run(
    event("POST", "/api/create-order", {
      customer: CUST,
      items: [{ id: "rimmee-250", qty: 2 }],
      amount: 1,
      amountPaise: 100,
    }),
    (r, b) => {
      check("live order created", r.statusCode === 200, `${r.statusCode} ${r.body}`);
      check("injected amount ignored (600, not 1)", b.amount === 600, `got ${b.amount}`);
      check("razorpay order id returned", /^order_/.test(b.orderId || ""), `got ${b.orderId}`);
      check("test mode detected from key", b.testMode === true, `got ${b.testMode}`);
    }
  );
}

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);

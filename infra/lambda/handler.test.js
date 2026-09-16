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

import { createHmac } from "node:crypto";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const staged = resolve(process.cwd(), "build/fn/infra/lambda/handler.js");
const target = existsSync(staged) ? staged : resolve(process.cwd(), "infra/lambda/handler.js");
const { handler } = await import(pathToFileURL(target).href);
console.log(`testing ${existsSync(staged) ? "staged package" : "repo copy"}: ${target}`);


// Resolve api/_lib and the catalogue from whichever copy is under test, so
// these run against the staged zip contents exactly like the handler does.
const baseDir = target.replace(/infra[/\\]lambda[/\\]handler\.js$/, "");
const libUrl = (f) => pathToFileURL(resolve(baseDir, "api/_lib/", f)).href;
const constantsUrl = () => pathToFileURL(resolve(baseDir, "src/constants/index.js")).href;

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

console.log("\n=== order notes round-trip ===");
{
  // The Razorpay order's `notes` are the only record of what was bought —
  // there is no database. If buildNotes and parseItemsNote ever disagree, the
  // customer's receipt and the shop's picking list silently lose lines while
  // the money stays correct, which is the worst way for this to fail.
  const { buildNotes, priceCart } = await import(libUrl("orders.js"));
  const { parseItemsNote } = await import(libUrl("email.js"));
  const { products } = await import(constantsUrl());

  const lines = priceCart(products.map((p) => ({ id: p.id, qty: 3 }))).lines;
  const note = buildNotes(CUST, lines).items;
  const back = parseItemsNote(note);

  check(
    "every catalogue line survives the round-trip",
    back.length === lines.length &&
      back.every((l, i) => l.id === lines[i].id && l.qty === lines[i].qty && l.lineTotal === lines[i].lineTotal),
    `${back.length} of ${lines.length}`
  );

  check(
    "the full catalogue fits inside Razorpay's 256-char note limit",
    note.length < 250 && !note.endsWith("\u2026"),
    `${note.length} chars`
  );

  // Notes are visible and editable in the Razorpay dashboard, so a human may
  // well tidy one up. That must not delete a line from someone's receipt.
  check(
    "a hand-added space does not drop a line",
    parseItemsNote("kuber-250x2, rimmee-1kg x1, appu-250x1").length === 3,
    "line dropped"
  );

  // Guards the parser against a future SKU whose id contains an "x" — the old
  // last-index-of split would have read "deluxe-500x2" as id "delu".
  const withX = { id: "deluxe-500", brandId: "appu", brand: "Deluxe", size: "500 g", weightKg: 0.5, price: 600, image: "/x.png", description: "d" };
  products.push(withX);
  check(
    "an id containing x parses correctly",
    parseItemsNote("deluxe-500x2").some((l) => l.id === "deluxe-500" && l.qty === 2),
    "misparsed"
  );
  products.pop();

  check("junk is dropped, not guessed at", parseItemsNote("nonsense, x, 5x").length === 0, "parsed junk");
  check("an empty note yields no lines", parseItemsNote("").length === 0 && parseItemsNote(null).length === 0, "not empty");
}

console.log("\n=== order email rendering ===");
{
  // These emails are assembled from customer-supplied strings and mailed out.
  // Every one of them must arrive as text, never as markup.
  const prevKey = process.env.RESEND_API_KEY;
  const prevFrom = process.env.ORDER_EMAIL_FROM;
  const prevTo = process.env.ORDER_EMAIL_TO;
  process.env.RESEND_API_KEY = "re_test_dummy";
  process.env.ORDER_EMAIL_FROM = "orders@appukaju.com";
  process.env.ORDER_EMAIL_TO = "shop@appukaju.com";

  const realFetch = globalThis.fetch;
  const sent = [];
  globalThis.fetch = async (url, init) => {
    sent.push(JSON.parse(init.body));
    return { ok: true, status: 200, text: async () => "" };
  };

  const { sendOrderEmails, parseItemsNote } = await import(libUrl("email.js") + "?fresh");
  const result = await sendOrderEmails({
    receipt: "APK-TEST01",
    paymentId: "pay_TEST",
    customer: {
      name: '<img src=x onerror="alert(1)">Ravi & "Sons"',
      email: "buyer@example.com",
      phone: "9876543210",
      address: "12 Hazratganj <script>alert(1)</script>",
      city: "Lucknow",
      state: "UP",
      pin: "226001",
    },
    lines: parseItemsNote("kuber-250x2"),
    total: 438,
    testMode: true,
  });

  globalThis.fetch = realFetch;

  check("both emails are sent", result.sent === true && sent.length === 2, JSON.stringify(result));
  const all = JSON.stringify(sent);
  check("script tags are escaped", !/<script/i.test(all), "INJECTION");
  check("img onerror is escaped", !all.includes("<img src=x"), "INJECTION");
  check("the api key never reaches a payload", !all.includes("re_test_dummy"), "KEY LEAKED");
  check("customer copy replies to the shop", sent[0].reply_to === "shop@appukaju.com", sent[0].reply_to);
  check("shop copy replies to the customer", sent[1].reply_to === "buyer@example.com", sent[1].reply_to);
  check("test-mode notice is present", sent[0].html.includes("Test mode"), "missing");

  // Unconfigured is a normal state, not an error: payments must still succeed.
  delete process.env.RESEND_API_KEY;
  const none = await sendOrderEmails({ receipt: "X", paymentId: "p", customer: {}, lines: [], total: 0, testMode: true });
  check("unconfigured reports rather than throws", none.sent === false, JSON.stringify(none));

  if (prevKey === undefined) delete process.env.RESEND_API_KEY; else process.env.RESEND_API_KEY = prevKey;
  if (prevFrom === undefined) delete process.env.ORDER_EMAIL_FROM; else process.env.ORDER_EMAIL_FROM = prevFrom;
  if (prevTo === undefined) delete process.env.ORDER_EMAIL_TO; else process.env.ORDER_EMAIL_TO = prevTo;
}


console.log("\n=== config endpoint ===");
{
  // GET, unlike every other route here, and it must never leak the secret.
  await run(event("GET", "/api/config"), (r, b) =>
    check(
      "GET /api/config -> 200 testMode:true on test keys",
      r.statusCode === 200 && b.testMode === true && b.configured === true,
      r.statusCode + " " + r.body
    )
  );

  await run(event("GET", "/api/config"), (r) =>
    check("config is not cacheable", r.headers["cache-control"] === "no-store", r.headers["cache-control"])
  );

  await run(event("GET", "/api/config"), (r) =>
    check(
      "config response carries no secret",
      !r.body.includes(process.env.RAZORPAY_KEY_SECRET || "\u0000"),
      "SECRET LEAKED"
    )
  );

  await run(event("POST", "/api/config", {}), (r) =>
    check("POST /api/config -> 405", r.statusCode === 405 && r.headers.allow === "GET", r.statusCode)
  );
}


console.log("\n=== webhook signature ===");
{
  // The signature is the only thing between a stranger and a fabricated
  // "payment.captured" that would have the shop dispatch goods nobody paid
  // for. Every case below must be refused.
  const SECRET = "whsec_test_dummy";
  const prev = process.env.RAZORPAY_WEBHOOK_SECRET;
  process.env.RAZORPAY_WEBHOOK_SECRET = SECRET;

  const sign = (raw) => createHmac("sha256", SECRET).update(raw).digest("hex");
  const hook = (payload, signature, { base64 = false } = {}) => {
    const ev = event("POST", "/api/webhook", JSON.stringify(payload), { base64 });
    if (signature !== null) ev.headers["x-razorpay-signature"] = signature;
    return ev;
  };

  const captured = {
    event: "payment.captured",
    payload: { payment: { entity: { id: "pay_TEST", order_id: "order_TEST" } } },
  };

  await run(hook(captured, "deadbeef"), (r, b) =>
    check("forged signature -> 400 {ok:false}", r.statusCode === 400 && b.ok === false, r.statusCode)
  );

  await run(hook(captured, null), (r) =>
    check("no signature header -> 400", r.statusCode === 400, r.statusCode)
  );

  // Correctly signed, but for a DIFFERENT body than the one delivered. This is
  // the attack that lands if the signature is ever checked against the parsed
  // object re-serialised, instead of the exact bytes received.
  await run(hook(captured, sign(JSON.stringify({ event: "payment.captured", payload: {} }))), (r) =>
    check("signature from a different body -> 400", r.statusCode === 400, r.statusCode)
  );

  // Valid signature, event we do not act on: acknowledged so Razorpay stops
  // retrying, and crucially never reaching fulfilment.
  const refund = { event: "refund.created", payload: {} };
  await run(hook(refund, sign(JSON.stringify(refund))), (r, b) =>
    check(
      "valid signature, unhandled event -> 200 ignored",
      r.statusCode === 200 && b.ignored === "refund.created",
      r.statusCode + " " + r.body
    )
  );

  // Base64 delivery: Lambda may send either encoding, and the raw bytes have to
  // survive the decode or the HMAC breaks.
  const noIds = { event: "payment.captured", payload: { payment: { entity: {} } } };
  await run(hook(noIds, sign(JSON.stringify(noIds)), { base64: true }), (r, b) =>
    check(
      "base64 body verifies, missing ids -> 200 ignored",
      r.statusCode === 200 && b.ignored === "no order id",
      r.statusCode + " " + r.body
    )
  );

  // Missing secret must fail closed, and with a 500 so Razorpay retries rather
  // than dropping events while the variable is unset.
  delete process.env.RAZORPAY_WEBHOOK_SECRET;
  await run(hook(captured, sign(JSON.stringify(captured))), (r) =>
    check("no RAZORPAY_WEBHOOK_SECRET -> 500 (retryable)", r.statusCode === 500, r.statusCode)
  );

  if (prev === undefined) delete process.env.RAZORPAY_WEBHOOK_SECRET;
  else process.env.RAZORPAY_WEBHOOK_SECRET = prev;
}

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

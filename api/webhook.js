/**
 * POST /api/webhook — Razorpay calling us, server to server.
 *
 * Body:  a Razorpay event envelope. Reply: { ok: true } | { ok: false }
 *
 * WHY THIS EXISTS. api/verify.js only runs if the customer's browser survives
 * long enough to call it. It very often does not: they close the tab on the
 * success screen, the train enters a tunnel, the phone kills the page to
 * reclaim memory. In every one of those cases the money has moved and nothing
 * has told the shop. Razorpay retries a webhook for hours, so this path
 * eventually gets through where the browser never did.
 *
 * THE SIGNATURE IS CHECKED OVER THE RAW BODY, NOT THE PARSED OBJECT. Razorpay
 * signs the exact bytes it sent; re-serialising the parsed JSON reorders keys
 * and changes whitespace, and the HMAC then never matches. `req.rawBody` is
 * populated by the Lambda adapter and by the Vite dev middleware for this
 * reason — see infra/lambda/handler.js.
 *
 * This endpoint is public and unauthenticated, exactly like the payment
 * callback. The signature is the entire access control: without it, anyone
 * could POST a fabricated "payment.captured" and have the shop dispatch goods
 * for an order nobody paid for.
 *
 * Set RAZORPAY_WEBHOOK_SECRET to the secret entered when creating the webhook
 * in the Razorpay dashboard. It is NOT the API key secret — a different value
 * for a different purpose.
 */

import crypto from "node:crypto";
import { postOnly, razorpayLookup, signatureMatches } from "./_lib/orders.js";
import { fulfilOrder } from "./_lib/fulfil.js";

/**
 * Events worth acting on.
 *
 * `payment.captured` is the one that matters — money settled. `order.paid`
 * fires alongside it for the same order, and fulfilOrder's marker means
 * whichever lands second does nothing. Everything else (refunds, failures,
 * settlement reports) is acknowledged and ignored rather than rejected, so
 * Razorpay does not retry events we simply have no use for.
 */
const HANDLED = new Set(["payment.captured", "order.paid"]);

export default postOnly(async (body, req, res) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    // A deployment mistake, not a caller error. Answering 500 makes Razorpay
    // retry, so events are not lost while the variable is missing.
    console.error("Missing RAZORPAY_WEBHOOK_SECRET — webhook cannot be verified.");
    return res.status(500).json({ ok: false });
  }

  const raw = req.rawBody;
  if (typeof raw !== "string" || !raw) {
    console.error("Webhook received with no raw body; cannot verify signature.");
    return res.status(400).json({ ok: false });
  }

  const expected = crypto.createHmac("sha256", secret).update(raw).digest("hex");
  if (!signatureMatches(expected, req.headers?.["x-razorpay-signature"])) {
    console.error("Webhook signature mismatch — ignoring.");
    return res.status(400).json({ ok: false });
  }

  // ---- signed by Razorpay from here on -------------------------------------

  const event = body?.event;
  if (!HANDLED.has(event)) {
    return res.status(200).json({ ok: true, ignored: event || "unknown" });
  }

  const payment = body?.payload?.payment?.entity;
  const orderId = payment?.order_id || body?.payload?.order?.entity?.id;

  if (!orderId || !payment?.id) {
    console.error(`Webhook ${event} carried no usable order/payment id.`);
    return res.status(200).json({ ok: true, ignored: "no order id" });
  }

  // Re-fetch rather than trusting the payload. The event body is authentic,
  // but the order it names carries the delivery address and the fulfilment
  // marker, and both must be read at their current value — not as they were
  // whenever this event was first queued for delivery.
  const order = await razorpayLookup(`/orders/${encodeURIComponent(orderId)}`);
  if (!order) {
    console.error(`Webhook ${event}: order ${orderId} not found.`);
    return res.status(200).json({ ok: true, ignored: "order not found" });
  }

  const result = await fulfilOrder({
    order,
    paymentId: payment.id,
    source: "webhook",
  });

  console.log(
    `Webhook ${event} for ${order.receipt}: ${
      result.duplicate ? result.reason : result.sent ? "emails sent" : "not sent"
    }`
  );

  return res.status(200).json({ ok: true, receipt: order.receipt });
});

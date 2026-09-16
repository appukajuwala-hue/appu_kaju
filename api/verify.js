/**
 * POST /api/verify
 *
 * Body:  { razorpay_order_id, razorpay_payment_id, razorpay_signature }
 * Reply: { ok: true, paymentId, receipt, amount, testMode } | { ok: false }
 *
 * THIS ENDPOINT IS THE ONLY THING THAT DECIDES WHETHER A PAYMENT HAPPENED.
 * Razorpay's browser callback is attacker-controllable — anyone can POST a
 * made-up payment id from curl. Two independent checks stand between that and
 * a confirmed order:
 *
 *   1. The signature. HMAC-SHA256 over "<order_id>|<payment_id>" keyed with the
 *      account secret. Only Razorpay and this server can produce it, so a match
 *      proves Razorpay signed this exact pairing.
 *   2. The payment itself, fetched from Razorpay. The signature proves
 *      authenticity; this proves the money actually moved and that the amount
 *      matches the order we created.
 *
 * Failures deliberately return a bare `ok: false` with no detail — an error
 * message that explains *which* check failed is a probe for whoever is testing.
 */

import crypto from "node:crypto";
import {
  httpError,
  postOnly,
  razorpayAuth,
  razorpayLookup,
  signatureMatches,
} from "./_lib/orders.js";
import { fulfilOrder } from "./_lib/fulfil.js";

export default postOnly(async (body, req, res) => {
  const orderId = body.razorpay_order_id;
  const paymentId = body.razorpay_payment_id;
  const signature = body.razorpay_signature;

  if (!orderId || !paymentId || !signature) {
    throw httpError(400, "Incomplete payment details.");
  }

  const { keySecret, keyId } = razorpayAuth();

  // ---- check 1: the signature ---------------------------------------------
  const expected = crypto
    .createHmac("sha256", keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  if (!signatureMatches(expected, signature)) {
    console.error(`Signature mismatch for order ${orderId}`);
    return res.status(400).json({ ok: false });
  }

  // ---- check 2: the payment, straight from Razorpay ------------------------
  //
  // razorpayLookup, not razorpayFetch: a payment id Razorpay has never heard of
  // must fail exactly like a bad signature does. It used to surface as a 502
  // with a different message, which told whoever was probing that their
  // signature had been accepted and only the lookup stopped them — precisely
  // the distinction the bare `ok: false` above exists to hide.
  //
  // A 5xx or an unreachable Razorpay still throws, and still becomes a 502.
  // That case is not a rejection: the customer may well have paid, and
  // Checkout.jsx reads a non-`ok:false` failure as "you have been charged,
  // call us" rather than "your payment failed".
  const payment = await razorpayLookup(`/payments/${encodeURIComponent(paymentId)}`);
  if (!payment) {
    console.error(`Payment ${paymentId} does not exist (order ${orderId})`);
    return res.status(400).json({ ok: false });
  }

  // `authorized` means captured is still pending (manual-capture accounts);
  // both mean the customer's money is committed. Anything else is not a sale.
  const settled = payment.status === "captured" || payment.status === "authorized";
  if (!settled || payment.order_id !== orderId) {
    console.error(
      `Payment ${paymentId} not usable: status=${payment.status} order=${payment.order_id}`
    );
    return res.status(400).json({ ok: false });
  }

  const order = await razorpayLookup(`/orders/${encodeURIComponent(orderId)}`);
  if (!order) {
    console.error(`Order ${orderId} does not exist`);
    return res.status(400).json({ ok: false });
  }
  if (order.amount !== payment.amount) {
    console.error(`Amount mismatch on ${orderId}: order=${order.amount} paid=${payment.amount}`);
    return res.status(400).json({ ok: false });
  }

  // ---- the sale is real from here on --------------------------------------
  //
  // Fulfilment is shared with the webhook rather than done here, so whichever
  // path reaches a given order first is the one that emails, and the other
  // stands down. See api/_lib/fulfil.js.
  const email = await fulfilOrder({ order, paymentId, source: "browser" });

  return res.status(200).json({
    ok: true,
    paymentId,
    receipt: order.receipt,
    amount: order.amount / 100,
    testMode: keyId.startsWith("rzp_test_"),
    emailed: Boolean(email?.sent || email?.duplicate),
  });
});

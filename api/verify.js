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
import { httpError, postOnly, razorpayAuth, razorpayFetch } from "./_lib/orders.js";
import { parseItemsNote, sendOrderEmails } from "./_lib/email.js";

const CUSTOMER_KEYS = ["name", "email", "phone", "address", "city", "state", "pin"];

/** Constant-time compare that tolerates unequal lengths without throwing. */
const signatureMatches = (expected, actual) => {
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(String(actual || ""), "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
};

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
  const payment = await razorpayFetch(`/payments/${encodeURIComponent(paymentId)}`);

  // `authorized` means captured is still pending (manual-capture accounts);
  // both mean the customer's money is committed. Anything else is not a sale.
  const settled = payment.status === "captured" || payment.status === "authorized";
  if (!settled || payment.order_id !== orderId) {
    console.error(
      `Payment ${paymentId} not usable: status=${payment.status} order=${payment.order_id}`
    );
    return res.status(400).json({ ok: false });
  }

  const order = await razorpayFetch(`/orders/${encodeURIComponent(orderId)}`);
  if (order.amount !== payment.amount) {
    console.error(`Amount mismatch on ${orderId}: order=${order.amount} paid=${payment.amount}`);
    return res.status(400).json({ ok: false });
  }

  // ---- the sale is real from here on --------------------------------------
  const notes = order.notes || {};
  const customer = Object.fromEntries(CUSTOMER_KEYS.map((k) => [k, notes[k] || ""]));
  const lines = parseItemsNote(notes.items);
  const total = order.amount / 100;
  const testMode = keyId.startsWith("rzp_test_");

  // Best-effort. The customer has paid; an email outage is not their problem
  // and must not become a payment error on their screen.
  const email = await sendOrderEmails({
    receipt: order.receipt,
    paymentId,
    customer,
    lines,
    total,
    testMode,
  }).catch((err) => {
    console.error("Order email threw:", err);
    return { sent: false };
  });

  return res.status(200).json({
    ok: true,
    paymentId,
    receipt: order.receipt,
    amount: total,
    testMode,
    emailed: Boolean(email?.sent),
  });
});

/**
 * Turning a confirmed payment into a fulfilled order.
 *
 * Two entirely separate things now confirm payments:
 *
 *   api/verify.js    the customer's browser, immediately after they pay.
 *   api/webhook.js   Razorpay calling us server-to-server, with retries.
 *
 * The webhook exists because the browser path is fragile in exactly the moment
 * that matters: the customer closes the tab, loses signal in a lift, or the
 * verify call times out. Their money has moved and nothing has told the shop.
 * Razorpay retries a webhook for hours, so it catches all of those.
 *
 * The cost of having two paths is that both fire for the same order, within the
 * same second, on every single sale. That is what this file is for: it owns the
 * "has this order already been dealt with" question so both callers ask it the
 * same way, and exactly one of them sends.
 */

import crypto from "node:crypto";

import { parseItemsNote, sendOrderEmails } from "./email.js";
import { razorpayAuth, razorpayFetch, razorpayLookup } from "./orders.js";

const CUSTOMER_KEYS = ["name", "email", "phone", "address", "city", "state", "pin"];

/**
 * The note key that records "the emails for this order have gone out".
 *
 * There is no database, so the Razorpay order is the only durable thing we
 * have — which makes its notes the only place a marker can live. The value is
 * the path that sent them plus a random claim id: `webhook:a3f9c1d2`. The path
 * is for whoever reads the dashboard, the claim id is how a caller recognises
 * its own write.
 */
const SENT_KEY = "sent";

/**
 * How long a path waits before trying to claim an order.
 *
 * The browser is the fast path and never waits. The webhook hangs back, so in
 * the ordinary case it arrives to find the browser's claim already in place and
 * stands down without writing anything. When the browser never made it — closed
 * tab, dead signal — nobody claims, and the webhook goes ahead 1.5s later.
 *
 * Razorpay expects a webhook to answer within about five seconds. The waiting
 * branch returns after roughly two, and the sending branch after three, so this
 * stays clear of a delivery timeout and the retries one would trigger.
 */
const CLAIM_DELAY_MS = { browser: 0, webhook: 1500 };

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Pulls the delivery address back out of the notes buildNotes wrote. */
export const customerFromNotes = (notes = {}) =>
  Object.fromEntries(CUSTOMER_KEYS.map((k) => [k, notes[k] || ""]));

/** True when this account is running on test credentials. */
export const isTestMode = () => razorpayAuth().keyId.startsWith("rzp_test_");

/**
 * Replaces an order's notes.
 *
 * Razorpay's update-order endpoint overwrites the whole notes object rather
 * than merging, so callers pass the complete set every time. Losing them would
 * take the delivery address with them, which is the one thing that must not
 * happen.
 */
const writeNotes = (orderId, notes) =>
  razorpayFetch(`/orders/${encodeURIComponent(orderId)}`, {
    method: "PATCH",
    body: JSON.stringify({ notes }),
  });

/** The order as Razorpay holds it now, or null if it cannot be read. */
const readOrder = (orderId) =>
  razorpayLookup(`/orders/${encodeURIComponent(orderId)}`).catch((err) => {
    console.error(`Could not re-read order ${orderId}:`, err?.message || err);
    return null;
  });

/**
 * Sends the order emails, at most once per order.
 *
 * @param {object} arg
 * @param {object} arg.order     The Razorpay order, freshly fetched.
 * @param {string} arg.paymentId The payment that settled it.
 * @param {string} arg.source    "browser" | "webhook" — recorded in the notes.
 *
 * Always resolves. The customer has already been charged by the time anything
 * here runs, so a mail failure must never become a payment failure on their
 * screen; callers log and carry on.
 *
 * The marker is written *before* the emails go out, not after. Writing it
 * afterwards is what let both paths read an unmarked order and both send, which
 * is every order once a webhook exists. Razorpay's notes are last-write-wins
 * with no compare-and-set, so claiming alone is not enough: the claim is read
 * back, and a caller that finds someone else's id there stands down. If the
 * send then fails the claim is released, so the next webhook retry tries again
 * rather than inheriting a marker for an email that never went out.
 */
export const fulfilOrder = async ({ order, paymentId, source = "browser" }) => {
  const orderId = order?.id;
  const notes = order?.notes || {};

  // Everything except the marker. This is both what the emails are built from
  // and what gets written back, with or without a claim on top.
  const baseNotes = { ...notes };
  delete baseNotes[SENT_KEY];

  const standDown = (holder) => ({
    sent: false,
    duplicate: true,
    reason: `already sent via ${holder}`,
  });

  if (notes[SENT_KEY]) return standDown(notes[SENT_KEY]);

  const delay = CLAIM_DELAY_MS[source] ?? 0;
  if (delay) {
    await sleep(delay);
    const settled = await readOrder(orderId);
    const holder = settled?.notes?.[SENT_KEY];
    if (holder) return standDown(holder);
  }

  const claim = `${source}:${crypto.randomBytes(4).toString("hex")}`;
  let claimed = true;
  await writeNotes(orderId, { ...baseNotes, [SENT_KEY]: claim }).catch((err) => {
    claimed = false;
    console.error(`Could not claim order ${orderId}:`, err?.message || err);
  });

  if (claimed) {
    // Both paths may have written by now. Whoever's id survived owns the send;
    // the other one leaves. An unreadable order leaves `holder` undefined and
    // falls through to sending, because a duplicate email is a far smaller
    // harm than a paid order nobody hears about.
    const settled = await readOrder(orderId);
    const holder = settled?.notes?.[SENT_KEY];
    if (holder && holder !== claim) return standDown(holder);
  }

  const result = await sendOrderEmails({
    receipt: order.receipt,
    paymentId,
    customer: customerFromNotes(baseNotes),
    lines: parseItemsNote(baseNotes.items),
    total: order.amount / 100,
    testMode: isTestMode(),
  }).catch((err) => {
    console.error("Order email threw:", err);
    return { sent: false };
  });

  if (claimed && !result?.sent) {
    await writeNotes(orderId, baseNotes).catch((err) =>
      console.error(`Could not release order ${orderId}:`, err?.message || err)
    );
  }

  return result;
};

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
 * The cost of having two paths is that both can fire for the same order, and
 * nobody wants two confirmation emails. That is what this file is for: it owns
 * the "has this order already been dealt with" question so both callers ask it
 * the same way.
 */

import { parseItemsNote, sendOrderEmails } from "./email.js";
import { razorpayAuth, razorpayFetch } from "./orders.js";

const CUSTOMER_KEYS = ["name", "email", "phone", "address", "city", "state", "pin"];

/**
 * The note key that records "the emails for this order have gone out".
 *
 * There is no database, so the Razorpay order is the only durable thing we
 * have — which makes its notes the only place a marker can live. The value is
 * which path sent them, purely so the dashboard shows whether the browser or
 * the webhook did the work.
 */
const SENT_KEY = "sent";

/** Pulls the delivery address back out of the notes buildNotes wrote. */
export const customerFromNotes = (notes = {}) =>
  Object.fromEntries(CUSTOMER_KEYS.map((k) => [k, notes[k] || ""]));

/** True when this account is running on test credentials. */
export const isTestMode = () => razorpayAuth().keyId.startsWith("rzp_test_");

/**
 * Writes the marker back onto the Razorpay order.
 *
 * Razorpay's update-order endpoint replaces the whole notes object rather than
 * merging, so the existing notes are spread back in. Losing them would take
 * the delivery address with them, which is the one thing that must not happen.
 */
const markSent = async (order, source) =>
  razorpayFetch(`/orders/${encodeURIComponent(order.id)}`, {
    method: "PATCH",
    body: JSON.stringify({
      notes: { ...(order.notes || {}), [SENT_KEY]: source },
    }),
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
 * Not transactional. Two callers arriving within the same second can both read
 * an unmarked order and both send — the marker is written after the send, not
 * before, because sending twice is a smaller harm than a marker that suppresses
 * an email which never went out. At this shop's volume the window is
 * theoretical; a real order table would close it.
 */
export const fulfilOrder = async ({ order, paymentId, source = "browser" }) => {
  const notes = order?.notes || {};

  if (notes[SENT_KEY]) {
    return { sent: false, duplicate: true, reason: `already sent via ${notes[SENT_KEY]}` };
  }

  const result = await sendOrderEmails({
    receipt: order.receipt,
    paymentId,
    customer: customerFromNotes(notes),
    lines: parseItemsNote(notes.items),
    total: order.amount / 100,
    testMode: isTestMode(),
  }).catch((err) => {
    console.error("Order email threw:", err);
    return { sent: false };
  });

  // Only claim it is done when it actually is. If Resend is unconfigured or
  // erroring, leaving the order unmarked means the next webhook retry tries
  // again — which is the behaviour worth having.
  if (result?.sent) {
    await markSent(order, source).catch((err) =>
      console.error(`Could not mark order ${order.id} as sent:`, err?.message || err)
    );
  }

  return result;
};

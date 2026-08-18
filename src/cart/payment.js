/**
 * PAYMENT SEAM — the only file that has to change to start taking real money.
 * ===========================================================================
 *
 * Right now this SIMULATES a payment. Nothing is charged, no card details leave
 * the page, and nothing is stored. The checkout UI says so on screen, and it
 * must keep saying so until this file is replaced.
 *
 * Why it is faked: a real gateway needs a server. Creating an order and
 * verifying the payment signature both require the Razorpay `key_secret`, and
 * anything shipped in this bundle is readable by anyone who opens devtools —
 * a leaked secret lets a stranger mint orders against the merchant account.
 * So the secret half has to live somewhere the browser cannot see.
 *
 * ---------------------------------------------------------------------------
 * TO GO LIVE WITH RAZORPAY
 * ---------------------------------------------------------------------------
 * 1. Add two serverless endpoints (Vercel `api/`, Netlify functions, or any
 *    small Node server). They hold RAZORPAY_KEY_SECRET as an env var:
 *
 *      POST /api/create-order   { amount, currency, receipt }
 *        -> razorpay.orders.create(...)          returns { id: "order_..." }
 *
 *      POST /api/verify         { razorpay_order_id, razorpay_payment_id,
 *                                 razorpay_signature }
 *        -> HMAC-SHA256(order_id + "|" + payment_id, KEY_SECRET)
 *           compared against razorpay_signature   returns { ok: true }
 *
 *    Never trust the client's word that a payment succeeded — step 2's callback
 *    is attacker-controllable. Only /api/verify decides.
 *
 * 2. Load Razorpay's checkout.js and replace the body of processPayment below:
 *
 *      const { id } = await fetch("/api/create-order", { ... }).then(r => r.json());
 *      const result = await new Promise((resolve) => {
 *        new window.Razorpay({
 *          key: import.meta.env.VITE_RAZORPAY_KEY_ID,   // publishable, safe
 *          order_id: id,
 *          amount: Math.round(amount * 100),            // paise, integer
 *          currency,
 *          name: "Appu Kaju",
 *          prefill: { name: customer.name, email: customer.email,
 *                     contact: customer.phone },
 *          handler: resolve,
 *          modal: { ondismiss: () => resolve(null) },
 *        }).open();
 *      });
 *      if (!result) return { ok: false, error: "Payment was cancelled." };
 *      const verified = await fetch("/api/verify", { ... }).then(r => r.json());
 *      return verified.ok
 *        ? { ok: true, paymentId: result.razorpay_payment_id }
 *        : { ok: false, error: "We could not verify that payment." };
 *
 * 3. Delete the card fields from Checkout.jsx — Razorpay collects them in its
 *    own iframe, which is what keeps this site out of PCI scope. Keep the
 *    address fields. Then remove the demo notices.
 *
 * The return shape below is already what step 2 produces, so Checkout.jsx does
 * not change.
 */

/** Test card the demo accepts. Shown in the UI so the flow is walkable. */
export const DEMO_CARD = "4242 4242 4242 4242";

const digitsOnly = (s) => (s || "").replace(/\D/g, "");

/** Standard Luhn checksum — the same check a real gateway runs client-side. */
export const luhnValid = (cardNumber) => {
  const digits = digitsOnly(cardNumber);
  if (digits.length < 13 || digits.length > 19) return false;
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    let d = Number(digits[i]);
    if (double) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    double = !double;
  }
  return sum % 10 === 0;
};

/** Accepts MM/YY or MM/YYYY and requires the month to be now or later. */
export const expiryValid = (value) => {
  const m = /^(\d{2})\s*\/\s*(\d{2}|\d{4})$/.exec((value || "").trim());
  if (!m) return false;
  const month = Number(m[1]);
  if (month < 1 || month > 12) return false;
  const year = m[2].length === 2 ? 2000 + Number(m[2]) : Number(m[2]);
  const now = new Date();
  const endOfMonth = new Date(year, month, 0, 23, 59, 59);
  return endOfMonth >= now;
};

/**
 * @returns {Promise<{ok: true, paymentId: string} | {ok: false, error: string}>}
 */
export async function processPayment({ amount, currency = "INR", card }) {
  if (!(Number.isFinite(amount) && amount > 0)) {
    return { ok: false, error: "That order total does not look right." };
  }
  if (currency !== "INR") {
    return { ok: false, error: `We can only take payments in INR right now.` };
  }
  if (!luhnValid(card?.number)) {
    return { ok: false, error: "That card number is not valid." };
  }
  if (!expiryValid(card?.expiry)) {
    return { ok: false, error: "That expiry date has passed." };
  }
  if (digitsOnly(card?.cvc).length < 3) {
    return { ok: false, error: "Check the security code on the back." };
  }

  // Stand in for gateway latency so the pending state is actually visible.
  await new Promise((r) => setTimeout(r, 1400));

  const ref = Math.random().toString(36).slice(2, 10);
  return { ok: true, paymentId: `demo_pay_${ref}` };
}

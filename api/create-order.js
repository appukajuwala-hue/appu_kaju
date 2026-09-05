/**
 * POST /api/create-order
 *
 * Body:  { items: [{ id, qty }], customer: { name, email, phone, ... } }
 * Reply: { orderId, receipt, amount, currency, keyId, testMode }
 *
 * The client never sends an amount — see priceCart in _lib/orders.js for why.
 *
 * `keyId` is returned rather than baked into the bundle as a VITE_ variable.
 * The key id is public either way, but this keeps both halves of the credential
 * in one place (Vercel's env settings) and means no stale key can survive in an
 * old build. It also means no VITE_-prefixed payment variable exists to
 * accidentally paste a secret into.
 */

import {
  buildNotes,
  cleanCustomer,
  makeReceipt,
  postOnly,
  priceCart,
  razorpayAuth,
  razorpayFetch,
} from "./_lib/orders.js";

export default postOnly(async (body, req, res) => {
  const customer = cleanCustomer(body.customer);
  const { lines, amountRupees, amountPaise } = priceCart(body.items);
  const { keyId } = razorpayAuth();

  const receipt = makeReceipt();

  const order = await razorpayFetch("/orders", {
    method: "POST",
    body: JSON.stringify({
      amount: amountPaise,
      currency: "INR",
      receipt,
      notes: buildNotes(customer, lines),
    }),
  });

  return res.status(200).json({
    orderId: order.id,
    receipt,
    // Rupees, to compare against the subtotal the customer is looking at.
    amount: amountRupees,
    currency: "INR",
    keyId,
    // Lets the UI show a test-mode banner that removes itself the moment live
    // keys are set, rather than relying on someone remembering to delete it.
    testMode: keyId.startsWith("rzp_test_"),
  });
});

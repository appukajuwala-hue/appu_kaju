/**
 * GET /api/config
 *
 * Reply: { testMode: boolean }
 *
 * The one piece of payment configuration the browser is allowed to know before
 * a customer commits to anything: whether this deployment is running on test
 * credentials.
 *
 * WHY AN ENDPOINT RATHER THAN A BUILD-TIME FLAG. The key id is deliberately not
 * exposed as a VITE_ variable — see the note in create-order.js — so the bundle
 * genuinely cannot tell. And /api/create-order cannot answer the question
 * either, because calling it mints a real Razorpay order; asking "are we in
 * test mode?" must not leave litter in the merchant dashboard.
 *
 * Nothing secret is returned. `testMode` is derived from the key id's prefix,
 * and the key id itself is public — it is handed to Razorpay's checkout script
 * in every real order anyway. The secret is never read here.
 *
 * Deliberately not cached: switching to live keys must take effect on the next
 * request, not whenever a CDN decides to revalidate.
 */

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed." });
  }

  const keyId = process.env.RAZORPAY_KEY_ID || "";

  res.setHeader("Cache-Control", "no-store");
  return res.status(200).json({
    testMode: keyId.startsWith("rzp_test_"),
    // Lets the checkout distinguish "test mode" from "payments are not set up
    // at all", which are different problems and need different wording.
    configured: Boolean(keyId && process.env.RAZORPAY_KEY_SECRET),
  });
}

/**
 * PAYMENT — Razorpay Checkout.
 *
 * This file runs in the browser, so it holds nothing secret. The account secret
 * lives only in the two serverless functions under api/, which is what keeps a
 * stranger from minting orders against the merchant account.
 *
 * Card details are typed into Razorpay's own iframe and never touch this origin.
 * That is deliberate and load-bearing: it is the reason this site is out of PCI
 * scope, and the reason there is no card field anywhere in the codebase.
 *
 * The flow:
 *   1. POST /api/create-order   — the server prices the cart and creates the
 *                                 Razorpay order. The browser never names a price.
 *   2. Razorpay Checkout opens  — the customer pays inside Razorpay's iframe.
 *   3. POST /api/verify         — the server checks the signature against the
 *                                 account secret and confirms the payment with
 *                                 Razorpay. Nothing here is trusted; step 3
 *                                 decides whether the sale happened.
 */

const CHECKOUT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

let scriptPromise = null;

/** Injects Razorpay's checkout script once, reusing the promise thereafter. */
const loadRazorpay = () => {
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve();

    const script = document.createElement("script");
    script.src = CHECKOUT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      // Ad blockers and filtered DNS block this domain routinely. Without an
      // explicit rejection the pay button just spins forever, which reads as a
      // broken site rather than a blocked script.
      scriptPromise = null;
      reject(new Error("blocked"));
    };
    document.head.appendChild(script);
  });

  return scriptPromise;
};

/**
 * POSTs JSON and insists on JSON back.
 *
 * vercel.json rewrites everything unmatched to /index.html, so a missing or
 * misnamed api route answers 200 with a page of HTML. Parsing that yields an
 * incomprehensible syntax error, so check the content type and say something
 * useful instead.
 */
const postJson = async (url, payload) => {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const isJson = (res.headers.get("content-type") || "").includes("application/json");
  if (!isJson) {
    throw new Error("The payment service is not reachable right now.");
  }

  const body = await res.json();
  if (!res.ok) throw new Error(body?.error || "That payment could not be started.");
  return body;
};

/**
 * Runs a whole purchase.
 *
 * @param {object}   arg
 * @param {Array}    arg.items          [{ id, qty }] — ids and counts only.
 * @param {object}   arg.customer       Delivery details, re-validated server-side.
 * @param {number}   arg.expectedAmount Rupee total currently on screen.
 * @param {Function} [arg.onStage]      Called with "opening" | "confirming" so
 *                                      the button can say what is happening.
 *                                      "confirming" matters: it covers the gap
 *                                      after the modal closes while the server
 *                                      checks the signature.
 *
 * @returns {Promise<
 *   { ok: true,  paymentId: string, receipt: string, amount: number, testMode: boolean } |
 *   { ok: false, error: string, cancelled?: boolean, paid?: boolean, paymentId?: string }
 * >}
 *
 * `cancelled` means the customer closed the modal — not an error, and the UI
 * should say nothing. `paid: true` means the money left their account but the
 * confirmation failed, which needs very different wording; see Checkout.jsx.
 */
export async function processPayment({ items, customer, expectedAmount, onStage }) {
  onStage?.("opening");

  // Fetch the script and create the order at the same time. The catch keeps a
  // script failure from surfacing as an unhandled rejection while we wait on
  // the order; the real error still arrives at the `await` below.
  const scriptReady = loadRazorpay();
  scriptReady.catch(() => {});

  let order;
  try {
    order = await postJson("/api/create-order", { items, customer });
  } catch (err) {
    return { ok: false, error: err.message };
  }

  try {
    await scriptReady;
  } catch {
    return {
      ok: false,
      error:
        "We could not load the payment window. An ad blocker or network filter " +
        "may be blocking it — try disabling it, or call us to order by phone.",
    };
  }

  // The server priced the cart independently. If that disagrees with the total
  // the customer is looking at, they are on a stale build — stop rather than
  // charge a price they were never shown.
  if (Number(order.amount) !== Number(expectedAmount)) {
    return {
      ok: false,
      error: "Prices have changed since you added these. Please refresh and try again.",
    };
  }

  const outcome = await new Promise((resolve) => {
    const rzp = new window.Razorpay({
      key: order.keyId,
      order_id: order.orderId,
      amount: order.amount * 100,
      currency: order.currency,
      name: "Appu Kaju",
      description: `Order ${order.receipt}`,
      image: "/images/logo.png",
      prefill: {
        name: customer.name,
        email: customer.email,
        contact: customer.phone,
      },
      notes: { receipt: order.receipt },
      theme: { color: "#12386E" },
      handler: (response) => resolve({ type: "paid", response }),
      modal: {
        // Closing the window is a decision, not a failure.
        ondismiss: () => resolve({ type: "cancelled" }),
      },
    });

    // Without this a declined card just closes the modal and looks like the
    // customer changed their mind.
    rzp.on("payment.failed", (event) =>
      resolve({ type: "failed", error: event?.error })
    );

    rzp.open();
  });

  if (outcome.type === "cancelled") {
    return { ok: false, cancelled: true, error: "" };
  }

  if (outcome.type === "failed") {
    return {
      ok: false,
      error:
        outcome.error?.description ||
        "That payment did not go through. No money has been taken.",
    };
  }

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = outcome.response;
  onStage?.("confirming");

  try {
    const verified = await postJson("/api/verify", {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    });
    if (!verified.ok) throw new Error("unverified");

    return {
      ok: true,
      paymentId: verified.paymentId,
      receipt: verified.receipt,
      amount: verified.amount,
      testMode: Boolean(verified.testMode),
    };
  } catch {
    // The charge succeeded but we could not confirm it. Flagging `paid` lets
    // the UI warn them NOT to pay again — telling an already-charged customer
    // to retry is the worst thing this code could cause.
    return {
      ok: false,
      paid: true,
      paymentId: razorpay_payment_id,
      error: "unverified",
    };
  }
}

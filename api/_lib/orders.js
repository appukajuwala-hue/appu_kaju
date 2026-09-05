/**
 * Server-side order helpers. Runs on Vercel's Node runtime, never in a browser.
 *
 * Files under api/ prefixed with `_` are not routed, so this is shared code
 * rather than an endpoint.
 */

import { products } from "../../src/constants/index.js";

const MAX_QTY = 99;
const MAX_LINES = 50;
const RAZORPAY_API = "https://api.razorpay.com/v1";

/** An error carrying the HTTP status the handler should reply with. */
export const httpError = (status, message) => {
  const err = new Error(message);
  err.status = status;
  return err;
};

/** e.g. APK-K2P9XQ4B — short enough to read out over the phone. */
export const makeReceipt = () => {
  const stamp = Date.now().toString(36).slice(-4);
  const rand = Math.random().toString(36).slice(2, 6);
  return `APK-${(stamp + rand).toUpperCase()}`;
};

/**
 * Prices a cart from the catalogue.
 *
 * THIS IS THE SECURITY CORE. The client sends ids and quantities and nothing
 * else — never an amount. If the browser were allowed to name the price, a
 * ₹12,000 pack could be bought for ₹1 by editing one request in devtools.
 *
 * Prices are whole rupees, so `× 100` is exact integer paise with no float
 * rounding to reason about.
 */
export const priceCart = (rawItems) => {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    throw httpError(400, "Your cart is empty.");
  }
  if (rawItems.length > MAX_LINES) {
    throw httpError(400, "That is too many different items for one order.");
  }

  // Merge duplicate ids rather than trusting the client to have done it.
  const merged = new Map();
  for (const raw of rawItems) {
    if (!raw || typeof raw.id !== "string") {
      throw httpError(400, "That cart could not be read.");
    }
    const product = products.find((p) => p.id === raw.id);
    if (!product) {
      throw httpError(400, `We no longer sell "${raw.id}".`);
    }
    if (!Number.isInteger(raw.qty) || raw.qty < 1) {
      throw httpError(400, `Check the quantity for ${product.brand}.`);
    }
    const qty = Math.min(MAX_QTY, (merged.get(raw.id)?.qty || 0) + raw.qty);
    merged.set(raw.id, { product, qty });
  }

  const lines = [...merged.values()].map(({ product, qty }) => ({
    id: product.id,
    brand: product.brand,
    size: product.size,
    price: product.price,
    qty,
    lineTotal: product.price * qty,
  }));

  const amountRupees = lines.reduce((n, l) => n + l.lineTotal, 0);
  if (amountRupees <= 0) throw httpError(400, "That order total is not valid.");

  return { lines, amountRupees, amountPaise: amountRupees * 100 };
};

const REQUIRED_CUSTOMER = ["name", "email", "phone", "address", "city", "state", "pin"];

/**
 * Re-checks the delivery details. The form in Checkout.jsx validates the same
 * things, but that is a courtesy to the customer, not a control — this request
 * can be made without ever loading the page.
 */
export const cleanCustomer = (raw) => {
  if (!raw || typeof raw !== "object") {
    throw httpError(400, "We need a delivery address.");
  }
  const out = {};
  for (const key of REQUIRED_CUSTOMER) {
    const value = typeof raw[key] === "string" ? raw[key].trim() : "";
    if (!value) throw httpError(400, `Please fill in your ${key}.`);
    out[key] = value.slice(0, 240);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(out.email)) {
    throw httpError(400, "That email address does not look right.");
  }
  if (out.phone.replace(/\D/g, "").length < 10) {
    throw httpError(400, "Please give a 10-digit phone number.");
  }
  if (!/^\d{6}$/.test(out.pin)) {
    throw httpError(400, "Indian PIN codes are 6 digits.");
  }
  return out;
};

const truncate = (s, n = 250) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

/**
 * There is no database behind this shop, so the Razorpay dashboard IS the order
 * book — these notes are what makes a payment actionable. Razorpay allows 15
 * keys with values up to 256 characters; this uses 8.
 */
export const buildNotes = (customer, lines) => ({
  name: truncate(customer.name),
  phone: truncate(customer.phone),
  email: truncate(customer.email),
  address: truncate(customer.address),
  city: truncate(customer.city),
  state: truncate(customer.state),
  pin: truncate(customer.pin),
  items: truncate(lines.map((l) => `${l.id}x${l.qty}`).join(", ")),
});

/** Reads credentials at call time so a redeploy picks up rotated keys. */
export const razorpayAuth = () => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    // Deliberately vague to the customer, loud in the logs — this is a
    // deployment mistake, not something they did.
    console.error("Missing RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET.");
    throw httpError(500, "Payments are not configured yet.");
  }
  return { keyId, keySecret };
};

export const razorpayFetch = async (path, init = {}) => {
  const { keyId, keySecret } = razorpayAuth();
  const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");

  const res = await fetch(`${RAZORPAY_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = body?.error?.description || `HTTP ${res.status}`;
    console.error(`Razorpay ${path} failed:`, detail);
    throw httpError(502, "The payment provider rejected that request.");
  }
  return body;
};

/** Shared handler wrapper: POST-only, JSON body, consistent error shape. */
export const postOnly = (handler) => async (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }
  try {
    // Vercel parses JSON bodies; the dev-server shim in vite.config.js does the
    // same. Guard anyway so a malformed body is a 400, not a 500.
    const body = typeof req.body === "object" && req.body ? req.body : {};
    return await handler(body, req, res);
  } catch (err) {
    const status = err?.status || 500;
    if (status >= 500) console.error(err);
    return res
      .status(status)
      .json({ error: status >= 500 ? "Something went wrong at our end." : err.message });
  }
};

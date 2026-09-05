/**
 * Order records, kept in localStorage.
 *
 * This is a receipt for the customer, NOT the record of truth. The authoritative
 * copy of every order lives in the Razorpay dashboard (the delivery address
 * rides along in the payment's notes) and in the order email. What is kept here
 * only lets /order/:id survive a refresh on the same browser; it disappears if
 * the visitor clears site data.
 *
 * Order ids are minted server-side in api/create-order.js and used as the
 * Razorpay receipt, so the number on this screen is the number in the dashboard.
 */

const STORAGE_KEY = "appu-kaju-orders-v1";
const MAX_ORDERS = 20;

const readAll = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const saveOrder = (order) => {
  try {
    // Newest first, capped — this is a convenience cache, not an archive.
    const next = [order, ...readAll().filter((o) => o?.id !== order.id)].slice(
      0,
      MAX_ORDERS
    );
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage unavailable: the confirmation still renders from router state.
  }
  return order;
};

export const getOrder = (id) => {
  if (!id) return null;
  return readAll().find((o) => o?.id === id) || null;
};

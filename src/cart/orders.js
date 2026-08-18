/**
 * Order records, kept in localStorage.
 *
 * There is no backend, so the confirmation page has nowhere else to read an
 * order back from. This is enough for the order screen to survive a refresh or
 * a shared-with-yourself link on the same browser — it is NOT a record of
 * truth, and it disappears if the visitor clears site data. When payment.js
 * moves to Razorpay, orders should be written server-side and this file becomes
 * a cache at most.
 */

const STORAGE_KEY = "appu-kaju-orders-v1";
const MAX_ORDERS = 20;

/** e.g. APK-K2P9XQ — short enough to read out over the phone. */
export const makeOrderId = () => {
  const stamp = Date.now().toString(36).slice(-4);
  const rand = Math.random().toString(36).slice(2, 6);
  return `APK-${(stamp + rand).toUpperCase()}`;
};

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

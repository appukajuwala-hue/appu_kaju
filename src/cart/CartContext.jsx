import { useEffect, useMemo, useReducer, useState } from "react";
import { CartContext } from "./context";
import { products } from "../constants";

const STORAGE_KEY = "appu-kaju-cart-v1";
const MAX_QTY = 99;

/**
 * The cart stores ONLY { id, qty }. Names, prices and images are resolved from
 * `products` at render time, so a cart left in localStorage last month can
 * never resurrect a stale price or a discontinued pack.
 */
const reducer = (state, action) => {
  switch (action.type) {
    case "HYDRATE":
      return action.lines;

    case "ADD": {
      const existing = state.find((l) => l.id === action.id);
      const add = action.qty ?? 1;
      if (existing) {
        return state.map((l) =>
          l.id === action.id
            ? { ...l, qty: Math.min(MAX_QTY, l.qty + add) }
            : l
        );
      }
      return [...state, { id: action.id, qty: Math.min(MAX_QTY, add) }];
    }

    case "SET_QTY": {
      if (action.qty <= 0) return state.filter((l) => l.id !== action.id);
      return state.map((l) =>
        l.id === action.id
          ? { ...l, qty: Math.min(MAX_QTY, action.qty) }
          : l
      );
    }

    case "REMOVE":
      return state.filter((l) => l.id !== action.id);

    case "CLEAR":
      return [];

    default:
      return state;
  }
};

/** Reads persisted lines, discarding anything malformed or no longer sold. */
const readStoredLines = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (l) =>
          l &&
          typeof l.id === "string" &&
          Number.isFinite(l.qty) &&
          l.qty > 0 &&
          products.some((p) => p.id === l.id)
      )
      .map((l) => ({ id: l.id, qty: Math.min(MAX_QTY, Math.floor(l.qty)) }));
  } catch {
    // Corrupt or unavailable storage (private mode, quota, hand-edited JSON)
    // must not take the whole app down — start empty instead.
    return [];
  }
};

export const CartProvider = ({ children }) => {
  const [lines, dispatch] = useReducer(reducer, []);
  const [hydrated, setHydrated] = useState(false);
  const [isOpen, setOpen] = useState(false);

  // Hydrate after mount so the first paint never depends on storage.
  useEffect(() => {
    const stored = readStoredLines();
    if (stored.length) dispatch({ type: "HYDRATE", lines: stored });
    setHydrated(true);
  }, []);

  // Persist, but only once hydration has run — otherwise the initial empty
  // state would immediately overwrite a real saved cart.
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch {
      // Storage full or blocked: the cart still works for this session.
    }
  }, [lines, hydrated]);

  const value = useMemo(() => {
    const items = lines
      .map((l) => {
        const product = products.find((p) => p.id === l.id);
        return product ? { ...product, qty: l.qty, lineTotal: product.price * l.qty } : null;
      })
      .filter(Boolean);

    return {
      items,
      // Consumers must not act on an empty cart until this is true — before
      // hydration runs, `items` is empty simply because storage has not been
      // read yet. Checkout's "empty cart, go back to /shop" redirect would
      // otherwise fire on every direct load of /checkout.
      hydrated,
      count: items.reduce((n, i) => n + i.qty, 0),
      subtotal: items.reduce((n, i) => n + i.lineTotal, 0),
      add: (id, qty) => dispatch({ type: "ADD", id, qty }),
      setQty: (id, qty) => dispatch({ type: "SET_QTY", id, qty }),
      remove: (id) => dispatch({ type: "REMOVE", id }),
      clear: () => dispatch({ type: "CLEAR" }),
      isOpen,
      openCart: () => setOpen(true),
      closeCart: () => setOpen(false),
    };
  }, [lines, isOpen, hydrated]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

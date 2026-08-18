import { createContext, useContext } from "react";

/**
 * Kept apart from CartContext.jsx so that file exports a component and nothing
 * else — mixing a hook in with it breaks React Fast Refresh during dev.
 */
export const CartContext = createContext(null);

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
};

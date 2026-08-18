import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { gsap, useGSAP, usePrefersReducedMotion } from "../lib/gsap";
import { useCart } from "../cart/context";

const FOCUSABLE =
  'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

const CartDrawer = () => {
  const { items, count, subtotal, setQty, remove, isOpen, closeCart } = useCart();
  const panel = useRef(null);
  const backdrop = useRef(null);
  const restoreTo = useRef(null);
  const reduced = usePrefersReducedMotion();

  // Escape to close, and trap Tab inside the panel while it is open.
  useEffect(() => {
    if (!isOpen) return undefined;

    restoreTo.current =
      document.querySelector("[data-cart-trigger]") || document.activeElement;

    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        closeCart();
        return;
      }
      if (e.key !== "Tab" || !panel.current) return;
      const nodes = [...panel.current.querySelectorAll(FOCUSABLE)].filter(
        (n) => n.offsetParent !== null
      );
      if (!nodes.length) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [isOpen, closeCart]);

  // Move focus in on open; hand it back to the bag button on close.
  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => {
        const target = panel.current?.querySelector("[data-autofocus]");
        (target || panel.current)?.focus();
      }, 30);
      return () => clearTimeout(t);
    }
    restoreTo.current?.focus?.();
    return undefined;
  }, [isOpen]);

  // Same body-scroll lock the mobile nav uses.
  useEffect(() => {
    if (!isOpen) return undefined;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useGSAP(
    () => {
      if (!isOpen || reduced) return;
      gsap.fromTo(
        panel.current,
        { xPercent: 100 },
        { xPercent: 0, duration: 0.45, ease: "power3.out" }
      );
      gsap.fromTo(backdrop.current, { opacity: 0 }, { opacity: 1, duration: 0.3 });
      gsap.fromTo(
        ".cart-line",
        { x: 24, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.35, stagger: 0.05, delay: 0.1, ease: "power2.out" }
      );
    },
    { dependencies: [isOpen, reduced] }
  );

  if (!isOpen) return null;

  return (
    <div className="cart-overlay">
      <div
        ref={backdrop}
        className="cart-backdrop"
        onClick={closeCart}
        aria-hidden="true"
      />

      <aside
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label="Your bag"
        tabIndex={-1}
        className="cart-drawer"
      >
        <header className="cart-head">
          <h2>
            Your bag{" "}
            <span className="font-paragraph text-base font-normal text-ink/50">
              ({count})
            </span>
          </h2>
          <button
            type="button"
            onClick={closeCart}
            data-autofocus
            aria-label="Close bag"
            className="cart-close"
          >
            <svg viewBox="0 0 24 24" className="size-6" fill="none" aria-hidden="true">
              <path
                d="m6 6 12 12M18 6 6 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </header>

        {items.length === 0 ? (
          <div className="cart-empty">
            <p className="font-bold uppercase text-2xl tracking-tight text-ink">
              Nothing in the bag yet
            </p>
            <p className="font-paragraph text-ink/60 mt-2">
              Eight packs across three grades, from 250 g to 10 kg.
            </p>
            <Link to="/shop" onClick={closeCart} className="btn-primary mt-8">
              Browse the range
            </Link>
          </div>
        ) : (
          <>
            <ul className="cart-lines">
              {items.map((i) => (
                <li key={i.id} className="cart-line">
                  <img src={i.image} alt="" aria-hidden="true" className="cart-thumb" />

                  <div className="min-w-0 grow">
                    <p className="font-bold uppercase tracking-tight text-ink leading-tight">
                      {i.brand}
                    </p>
                    <p className="font-paragraph text-sm text-ink/55">{i.size} pack</p>

                    <div className="flex items-center gap-3 mt-3">
                      <div className="qty-group">
                        <button
                          type="button"
                          onClick={() => setQty(i.id, i.qty - 1)}
                          aria-label={`Decrease ${i.brand} ${i.size} quantity`}
                          className="qty-btn"
                        >
                          −
                        </button>
                        <span
                          className="qty-value"
                          aria-live="polite"
                          aria-label={`Quantity ${i.qty}`}
                        >
                          {i.qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => setQty(i.id, i.qty + 1)}
                          aria-label={`Increase ${i.brand} ${i.size} quantity`}
                          className="qty-btn"
                        >
                          +
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => remove(i.id)}
                        className="cart-remove"
                      >
                        Remove
                      </button>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="font-bold text-lg tracking-tight text-ink">
                      ₹{i.lineTotal.toLocaleString("en-IN")}
                    </p>
                    {i.qty > 1 && (
                      <p className="font-paragraph text-xs text-ink/45 mt-0.5">
                        ₹{i.price.toLocaleString("en-IN")} each
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>

            <footer className="cart-foot">
              <div className="flex items-baseline justify-between">
                <span className="font-paragraph text-ink/60">Subtotal</span>
                <span className="font-bold text-3xl tracking-tight text-ink">
                  ₹{subtotal.toLocaleString("en-IN")}
                </span>
              </div>
              <p className="font-paragraph text-sm text-ink/50 mt-1">
                Delivery is free on every order.
              </p>

              <Link
                to="/checkout"
                onClick={closeCart}
                className="btn-primary w-full justify-center mt-5"
              >
                Checkout
              </Link>
              <button
                type="button"
                onClick={closeCart}
                className="cart-keep-shopping"
              >
                Keep shopping
              </button>
            </footer>
          </>
        )}
      </aside>
    </div>
  );
};

export default CartDrawer;

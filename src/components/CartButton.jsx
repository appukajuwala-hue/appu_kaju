import { useCart } from "../cart/context";

const BagIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
    <path
      d="M5.5 8h13l-1 11.5a1.5 1.5 0 0 1-1.5 1.4H8a1.5 1.5 0 0 1-1.5-1.4L5.5 8Z"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinejoin="round"
    />
    <path
      d="M9 10V6.8a3 3 0 0 1 6 0V10"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
    />
  </svg>
);

const CartButton = ({ className = "" }) => {
  const { count, openCart } = useCart();

  return (
    <button
      type="button"
      onClick={openCart}
      data-cart-trigger
      aria-label={
        count === 0 ? "Open bag, empty" : `Open bag, ${count} item${count === 1 ? "" : "s"}`
      }
      className={`cart-trigger ${className}`}
    >
      <BagIcon className="size-6" />
      {count > 0 && (
        <span className="cart-badge" aria-hidden="true">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </button>
  );
};

export default CartButton;

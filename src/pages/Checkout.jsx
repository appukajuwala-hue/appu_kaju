import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Seo from "../components/Seo";
import PageHeader from "../components/PageHeader";
import { useCart } from "../cart/context";
import { processPayment, DEMO_CARD } from "../cart/payment";
import { makeOrderId, saveOrder } from "../cart/orders";
import { company } from "../constants";

const EMPTY = {
  name: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  state: "",
  pin: "",
  cardNumber: "",
  expiry: "",
  cvc: "",
};

const Checkout = () => {
  const { items, subtotal, clear, hydrated } = useCart();
  const navigate = useNavigate();

  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState("");

  // Set the instant an order succeeds. Placing an order empties the cart, and
  // an empty cart is exactly what the redirect below watches for — without this
  // guard the redirect races the navigation to the confirmation page and wins,
  // dumping the customer back on /shop right after they paid.
  const placed = useRef(false);

  // Nothing to pay for — send them back to the range rather than render a
  // zero-total form. `replace` so Back does not bounce them straight here.
  // Gated on `hydrated`: on a direct load of /checkout the cart is empty until
  // localStorage has been read, and redirecting on that would throw away a
  // perfectly good cart on every refresh.
  useEffect(() => {
    if (placed.current) return;
    if (hydrated && items.length === 0) navigate("/shop", { replace: true });
  }, [hydrated, items.length, navigate]);

  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setErrors((x) => ({ ...x, [k]: undefined }));
    setFailure("");
  };

  const validate = () => {
    const next = {};
    if (!form.name.trim()) next.name = "We need a name for the delivery.";
    if (!form.email.trim()) next.email = "We send the receipt here.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      next.email = "That email address does not look right.";
    if (!form.phone.trim()) next.phone = "The courier needs a number to call.";
    else if (form.phone.replace(/\D/g, "").length < 10)
      next.phone = "Please give a 10-digit phone number.";
    if (!form.address.trim()) next.address = "Street address is required.";
    if (!form.city.trim()) next.city = "Which city?";
    if (!form.state.trim()) next.state = "Which state?";
    if (!/^\d{6}$/.test(form.pin.trim()))
      next.pin = "Indian PIN codes are 6 digits.";
    if (!form.cardNumber.trim()) next.cardNumber = "Enter the card number.";
    if (!form.expiry.trim()) next.expiry = "Enter the expiry as MM/YY.";
    if (!form.cvc.trim()) next.cvc = "Enter the security code.";
    return next;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (pending) return;

    const next = validate();
    setErrors(next);
    if (Object.keys(next).length) return;

    setPending(true);
    setFailure("");

    const result = await processPayment({
      amount: subtotal,
      currency: "INR",
      card: {
        number: form.cardNumber,
        expiry: form.expiry,
        cvc: form.cvc,
      },
    });

    if (!result.ok) {
      setPending(false);
      setFailure(result.error);
      return;
    }

    // Snapshot the priced lines — the cart is about to be emptied, and the
    // confirmation must show what was actually bought at what it actually cost.
    const order = saveOrder({
      id: makeOrderId(),
      placedAt: new Date().toISOString(),
      paymentId: result.paymentId,
      demo: true,
      total: subtotal,
      items: items.map((i) => ({
        id: i.id,
        brand: i.brand,
        size: i.size,
        price: i.price,
        qty: i.qty,
        lineTotal: i.lineTotal,
        image: i.image,
      })),
      customer: {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        pin: form.pin.trim(),
      },
    });

    placed.current = true;
    clear();
    navigate(`/order/${order.id}`, { replace: true });
  };

  const field =
    "w-full font-paragraph text-ink bg-cream border-2 border-ink/15 rounded-2xl px-5 py-4 focus:border-royal outline-none transition-colors";

  const Err = ({ id, msg }) =>
    msg ? (
      <p id={id} className="font-paragraph text-sm text-chilli mt-1.5">
        {msg}
      </p>
    ) : null;

  // Blank for the one frame between mount and hydration, then either the form
  // or the redirect above takes over.
  if (!hydrated || items.length === 0) return null;

  return (
    <div>
      <Seo
        title="Checkout — Appu Kaju"
        description="Complete your Appu Kaju order."
      />

      <PageHeader
        eyebrow="Almost there"
        title="Checkout"
        lead="Tell us where it is going. Delivery is free on every order, anywhere in India."
      />

      <section className="md:pb-24 pb-16">
        <div className="wrap grid lg:grid-cols-[1.3fr_1fr] gap-10 items-start">
          {/* ---------------------------------------------------- form */}
          <form onSubmit={handleSubmit} noValidate className="checkout-panel">
            <h2 className="section-title text-ink">Delivery address</h2>

            <div className="grid sm:grid-cols-2 gap-5 mt-7">
              <div className="sm:col-span-2">
                <label htmlFor="co-name" className="checkout-label">
                  Full name
                </label>
                <input
                  id="co-name"
                  value={form.name}
                  onChange={set("name")}
                  aria-invalid={!!errors.name}
                  aria-describedby={errors.name ? "co-name-err" : undefined}
                  className={field}
                />
                <Err id="co-name-err" msg={errors.name} />
              </div>

              <div>
                <label htmlFor="co-email" className="checkout-label">
                  Email
                </label>
                <input
                  id="co-email"
                  type="email"
                  value={form.email}
                  onChange={set("email")}
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? "co-email-err" : undefined}
                  className={field}
                />
                <Err id="co-email-err" msg={errors.email} />
              </div>

              <div>
                <label htmlFor="co-phone" className="checkout-label">
                  Phone
                </label>
                <input
                  id="co-phone"
                  type="tel"
                  inputMode="numeric"
                  value={form.phone}
                  onChange={set("phone")}
                  aria-invalid={!!errors.phone}
                  aria-describedby={errors.phone ? "co-phone-err" : undefined}
                  className={field}
                />
                <Err id="co-phone-err" msg={errors.phone} />
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="co-address" className="checkout-label">
                  Address
                </label>
                <input
                  id="co-address"
                  value={form.address}
                  onChange={set("address")}
                  placeholder="House / flat, street, area"
                  aria-invalid={!!errors.address}
                  aria-describedby={errors.address ? "co-address-err" : undefined}
                  className={field}
                />
                <Err id="co-address-err" msg={errors.address} />
              </div>

              <div>
                <label htmlFor="co-city" className="checkout-label">
                  City
                </label>
                <input
                  id="co-city"
                  value={form.city}
                  onChange={set("city")}
                  aria-invalid={!!errors.city}
                  aria-describedby={errors.city ? "co-city-err" : undefined}
                  className={field}
                />
                <Err id="co-city-err" msg={errors.city} />
              </div>

              <div>
                <label htmlFor="co-state" className="checkout-label">
                  State
                </label>
                <input
                  id="co-state"
                  value={form.state}
                  onChange={set("state")}
                  aria-invalid={!!errors.state}
                  aria-describedby={errors.state ? "co-state-err" : undefined}
                  className={field}
                />
                <Err id="co-state-err" msg={errors.state} />
              </div>

              <div>
                <label htmlFor="co-pin" className="checkout-label">
                  PIN code
                </label>
                <input
                  id="co-pin"
                  inputMode="numeric"
                  maxLength={6}
                  value={form.pin}
                  onChange={set("pin")}
                  aria-invalid={!!errors.pin}
                  aria-describedby={errors.pin ? "co-pin-err" : undefined}
                  className={field}
                />
                <Err id="co-pin-err" msg={errors.pin} />
              </div>
            </div>

            {/* ------------------------------------------------ payment */}
            <h2 className="section-title text-ink md:mt-14 mt-10">Payment</h2>

            <div className="demo-notice" role="note">
              <p className="font-bold uppercase tracking-wide text-sm">
                Demo checkout
              </p>
              <p className="font-paragraph text-sm mt-1.5 leading-relaxed">
                No real payment is taken and no card details are stored or sent
                anywhere. Use the test card{" "}
                <strong className="font-bold whitespace-nowrap">{DEMO_CARD}</strong>{" "}
                with any future expiry and any 3-digit code.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-5 mt-6">
              <div className="sm:col-span-2">
                <label htmlFor="co-card" className="checkout-label">
                  Card number
                </label>
                <input
                  id="co-card"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder={DEMO_CARD}
                  value={form.cardNumber}
                  onChange={set("cardNumber")}
                  aria-invalid={!!errors.cardNumber}
                  aria-describedby={errors.cardNumber ? "co-card-err" : undefined}
                  className={field}
                />
                <Err id="co-card-err" msg={errors.cardNumber} />
              </div>

              <div>
                <label htmlFor="co-exp" className="checkout-label">
                  Expiry
                </label>
                <input
                  id="co-exp"
                  placeholder="MM/YY"
                  autoComplete="off"
                  value={form.expiry}
                  onChange={set("expiry")}
                  aria-invalid={!!errors.expiry}
                  aria-describedby={errors.expiry ? "co-exp-err" : undefined}
                  className={field}
                />
                <Err id="co-exp-err" msg={errors.expiry} />
              </div>

              <div>
                <label htmlFor="co-cvc" className="checkout-label">
                  Security code
                </label>
                <input
                  id="co-cvc"
                  inputMode="numeric"
                  maxLength={4}
                  autoComplete="off"
                  placeholder="123"
                  value={form.cvc}
                  onChange={set("cvc")}
                  aria-invalid={!!errors.cvc}
                  aria-describedby={errors.cvc ? "co-cvc-err" : undefined}
                  className={field}
                />
                <Err id="co-cvc-err" msg={errors.cvc} />
              </div>
            </div>

            {failure && (
              <p role="alert" className="payment-error">
                {failure}
              </p>
            )}

            <button
              type="submit"
              disabled={pending}
              aria-busy={pending}
              className="btn-primary w-full justify-center mt-8 disabled:opacity-60 disabled:hover:scale-100"
            >
              {pending
                ? "Placing your order…"
                : `Pay ₹${subtotal.toLocaleString("en-IN")}`}
            </button>

            <p className="font-paragraph text-xs text-ink/50 text-center mt-4">
              Questions? Call {company.phone}.
            </p>
          </form>

          {/* ------------------------------------------------- summary */}
          <aside className="order-summary">
            <h2 className="text-2xl font-bold uppercase tracking-tight text-ink">
              Order summary
            </h2>

            <ul className="mt-6 flex flex-col gap-4">
              {items.map((i) => (
                <li key={i.id} className="flex items-center gap-4">
                  <img src={i.image} alt="" aria-hidden="true" className="summary-thumb" />
                  <div className="min-w-0 grow">
                    <p className="font-bold uppercase tracking-tight text-ink text-sm leading-tight">
                      {i.brand}
                    </p>
                    <p className="font-paragraph text-xs text-ink/55">
                      {i.size} × {i.qty}
                    </p>
                  </div>
                  <p className="font-bold text-ink shrink-0">
                    ₹{i.lineTotal.toLocaleString("en-IN")}
                  </p>
                </li>
              ))}
            </ul>

            <div className="border-t-2 border-ink/10 mt-6 pt-5 flex flex-col gap-2">
              <div className="flex justify-between font-paragraph text-ink/70">
                <span>Subtotal</span>
                <span>₹{subtotal.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between font-paragraph text-ink/70">
                <span>Delivery</span>
                <span className="text-leaf font-semibold">Free</span>
              </div>
              <div className="flex justify-between items-baseline mt-2">
                <span className="font-bold uppercase tracking-tight text-ink">
                  Total
                </span>
                <span className="font-bold text-3xl tracking-tight text-ink">
                  ₹{subtotal.toLocaleString("en-IN")}
                </span>
              </div>
            </div>

            <Link to="/shop" className="summary-back">
              ← Add something else
            </Link>
          </aside>
        </div>
      </section>
    </div>
  );
};

export default Checkout;

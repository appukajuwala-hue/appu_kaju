import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Seo from "../components/Seo";
import PageHeader from "../components/PageHeader";
import { useCart } from "../cart/context";
import { processPayment } from "../cart/payment";
import { saveOrder } from "../cart/orders";
import { company } from "../constants";

// No card fields. Razorpay collects those inside its own iframe, which is what
// keeps this site out of PCI scope — see src/cart/payment.js.
const EMPTY = {
  name: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  state: "",
  pin: "",
};

const LABELS = {
  opening: "Opening payment…",
  confirming: "Confirming payment…",
};

const Checkout = () => {
  const { items, subtotal, clear, hydrated } = useCart();
  const navigate = useNavigate();

  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [stage, setStage] = useState("");
  const [failure, setFailure] = useState(null);

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
    setFailure(null);
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
    return next;
  };

  const pending = Boolean(stage);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (pending) return;

    const next = validate();
    setErrors(next);
    if (Object.keys(next).length) return;

    setFailure(null);

    const customer = Object.fromEntries(
      Object.entries(form).map(([k, v]) => [k, v.trim()])
    );

    const result = await processPayment({
      items: items.map((i) => ({ id: i.id, qty: i.qty })),
      customer,
      expectedAmount: subtotal,
      onStage: setStage,
    });

    if (!result.ok) {
      setStage("");
      // Closing the Razorpay window is a decision, not a failure. Saying
      // nothing is the correct response.
      if (result.cancelled) return;

      if (result.paid) {
        setFailure({
          paid: true,
          text:
            `Your payment went through, but we could not confirm it automatically. ` +
            `Please do not pay again — call us on ${company.phone} quoting ` +
            `reference ${result.paymentId} and we will sort it out.`,
        });
        return;
      }

      setFailure({ text: result.error });
      return;
    }

    // Snapshot the priced lines — the cart is about to be emptied, and the
    // confirmation must show what was actually bought at what it actually cost.
    // The id is Razorpay's receipt, so this number matches the dashboard.
    const order = saveOrder({
      id: result.receipt,
      placedAt: new Date().toISOString(),
      paymentId: result.paymentId,
      testMode: result.testMode,
      total: result.amount,
      items: items.map((i) => ({
        id: i.id,
        brand: i.brand,
        size: i.size,
        price: i.price,
        qty: i.qty,
        lineTotal: i.lineTotal,
        image: i.image,
      })),
      customer,
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
                  autoComplete="name"
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
                  autoComplete="email"
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
                  autoComplete="tel"
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
                  autoComplete="street-address"
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
                  autoComplete="address-level2"
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
                  autoComplete="address-level1"
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
                  autoComplete="postal-code"
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

            <div className="notice-info" role="note">
              <p className="font-paragraph text-sm leading-relaxed">
                Card, UPI, netbanking and wallets are handled by{" "}
                <strong className="font-bold">Razorpay</strong>, which opens in a
                secure window when you continue. Your card details go straight to
                them — they never reach this website, and we never store them.
              </p>
            </div>

            {failure && (
              <p
                role="alert"
                className={failure.paid ? "notice-warn mt-6" : "payment-error"}
              >
                {failure.text}
              </p>
            )}

            <button
              type="submit"
              disabled={pending}
              aria-busy={pending}
              className="btn-primary w-full justify-center mt-8 disabled:opacity-60 disabled:hover:scale-100"
            >
              {pending
                ? LABELS[stage]
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

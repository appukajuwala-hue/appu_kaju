import { Link, useParams } from "react-router-dom";
import Seo from "../components/Seo";
import { getOrder } from "../cart/orders";
import { company } from "../constants";

const OrderConfirmation = () => {
  const { orderId } = useParams();
  const order = getOrder(orderId);

  if (!order) {
    return (
      <div>
        <Seo title="Order not found — Appu Kaju" description="We could not find that order." />
        <section className="min-h-[70vh] flex-center md:pt-32 pt-24 md:pb-24 pb-16">
          <div className="wrap max-w-xl text-center">
            <h1 className="section-title text-ink">We can&apos;t find that order</h1>
            <p className="font-paragraph text-ink/70 mt-4 leading-relaxed">
              Order records are kept in this browser, so the link won&apos;t open
              on another device or after clearing site data. If you need a hand,
              call us on {company.phone}.
            </p>
            <Link to="/shop" className="btn-primary mt-8">
              Back to the shop
            </Link>
          </div>
        </section>
      </div>
    );
  }

  const placed = new Date(order.placedAt);

  return (
    <div>
      <Seo
        title={`Order ${order.id} — Appu Kaju`}
        description="Your Appu Kaju order is confirmed."
      />

      <section className="md:pt-40 pt-28 md:pb-24 pb-16">
        <div className="wrap max-w-3xl">
          <div className="order-card">
            <div className="order-tick" aria-hidden="true">
              <svg viewBox="0 0 24 24" className="size-8" fill="none">
                <path
                  d="m5 13 4.5 4.5L19 7"
                  stroke="currentColor"
                  strokeWidth="2.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <p className="eyebrow text-leaf mt-6">Order confirmed</p>
            <h1 className="general-title text-ink md:!text-6xl !text-4xl mt-2">
              Thank you
            </h1>

            <p className="font-paragraph text-ink/70 md:text-lg mt-4 leading-relaxed">
              Your order is in, {order.customer.name.split(" ")[0]}. We&apos;ll
              email a receipt to {order.customer.email} and call before the
              courier collects.
            </p>

            <dl className="order-meta">
              <div>
                <dt>Order number</dt>
                <dd className="font-bold tracking-tight">{order.id}</dd>
              </div>
              <div>
                <dt>Placed</dt>
                <dd>
                  {placed.toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </dd>
              </div>
              <div>
                <dt>Payment reference</dt>
                <dd className="break-all">{order.paymentId}</dd>
              </div>
            </dl>

            {order.demo && (
              <div className="demo-notice mt-8" role="note">
                <p className="font-bold uppercase tracking-wide text-sm">
                  Demo order
                </p>
                <p className="font-paragraph text-sm mt-1.5 leading-relaxed">
                  This checkout is a demonstration. No payment was taken, no card
                  details were stored, and nothing will be dispatched.
                </p>
              </div>
            )}

            <h2 className="text-2xl font-bold uppercase tracking-tight text-ink md:mt-12 mt-10">
              What you ordered
            </h2>

            <ul className="mt-6 flex flex-col gap-4">
              {order.items.map((i) => (
                <li key={i.id} className="flex items-center gap-4">
                  <img src={i.image} alt="" aria-hidden="true" className="summary-thumb" />
                  <div className="min-w-0 grow">
                    <p className="font-bold uppercase tracking-tight text-ink leading-tight">
                      {i.brand}
                    </p>
                    <p className="font-paragraph text-sm text-ink/55">
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
                <span>Delivery</span>
                <span className="text-leaf font-semibold">Free</span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="font-bold uppercase tracking-tight text-ink">
                  Total paid
                </span>
                <span className="font-bold text-3xl tracking-tight text-ink">
                  ₹{order.total.toLocaleString("en-IN")}
                </span>
              </div>
            </div>

            <h2 className="text-2xl font-bold uppercase tracking-tight text-ink md:mt-12 mt-10">
              Delivering to
            </h2>
            <address className="not-italic font-paragraph text-ink/75 leading-relaxed mt-4">
              {order.customer.name}
              <br />
              {order.customer.address}
              <br />
              {order.customer.city}, {order.customer.state} {order.customer.pin}
              <br />
              <span className="text-ink/50">{order.customer.phone}</span>
            </address>

            <div className="flex flex-wrap gap-4 md:mt-12 mt-10">
              <Link to="/shop" className="btn-primary">
                Keep shopping
              </Link>
              <Link to="/contact" className="btn-ghost text-ink hover:bg-ink hover:text-cream">
                Contact us
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default OrderConfirmation;

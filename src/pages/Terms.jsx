import { Link } from "react-router-dom";
import PolicyPage from "../components/PolicyPage";
import { company } from "../constants";

const Terms = () => (
  <PolicyPage
    title="Terms & conditions"
    seoTitle="Terms & Conditions — Appu Kaju"
    description="The terms that apply when you order cashews from Appu Kaju."
    lead="The agreement between you and Appu Kaju when you place an order on this website."
    updated="26 August 2026"
  >
    <h2>Who we are</h2>
    <p>
      This website is operated by <strong>{company.name}</strong>, a cashew
      business trading since {company.founded}, with its shop at{" "}
      {company.shopAddress} and its processing facility in {company.factory}.
      Throughout these terms, &ldquo;we&rdquo;, &ldquo;us&rdquo; and
      &ldquo;our&rdquo; mean {company.name}; &ldquo;you&rdquo; means the person
      placing an order.
    </p>
    <p>
      You can reach us on {company.phone} or at{" "}
      <a href={`mailto:${company.emails[0]}`}>{company.emails[0]}</a>.
    </p>

    <h2>Placing an order</h2>
    <p>
      Adding items to your bag does not reserve them. A contract of sale is
      formed only once your payment has been successfully authorised and we have
      sent you an order confirmation by email.
    </p>
    <p>
      We may decline or cancel an order — and will refund it in full — where the
      item is unavailable, where a price or description was listed in error, or
      where we cannot deliver to the address given. Cashew kernels are a natural
      agricultural product, so kernel size, colour and count per kilogram vary
      between harvests within the grade you have bought.
    </p>

    <h2>Prices and payment</h2>
    <p>
      All prices are shown in Indian Rupees and are inclusive of applicable
      taxes. {/* TODO(confirm): GST registration status and whether prices are
      genuinely tax-inclusive. */}
      Delivery is free anywhere in India, so the total shown at checkout is the
      total you pay.
    </p>
    <p>
      Payments are processed by <strong>Razorpay</strong>. Your card, UPI or
      netbanking details are entered in Razorpay&rsquo;s own secure window and
      are never received or stored by this website. We see only that a payment
      succeeded, its reference number, and the delivery details you gave us.
    </p>
    <p>
      We may change prices at any time, but never after your order is confirmed.
      If a pricing error is discovered before dispatch, we will contact you and
      offer either the corrected price or a full refund.
    </p>

    <h2>Delivery</h2>
    <p>
      Delivery timelines, dispatch windows and what to do if a parcel arrives
      damaged are set out in our <Link to="/shipping">shipping policy</Link>.
      Cancellations and refunds are covered by our{" "}
      <Link to="/refunds">refund &amp; cancellation policy</Link>. Both form part of
      these terms.
    </p>

    <h2>Using this website</h2>
    <p>
      The text, photography, brand names and page designs on this site belong to{" "}
      {company.name}. You may not copy or reuse them commercially without our
      written permission.
    </p>
    <p>
      You agree not to use this site to place fraudulent orders, to interfere
      with its operation, or to attempt to gain access to systems or data that
      are not yours.
    </p>

    <h2>Liability</h2>
    <p>
      Our responsibility for any order is limited to the amount you paid for it.
      Nothing in these terms limits liability that cannot lawfully be limited,
      including liability for death or personal injury caused by negligence.
    </p>
    <p>
      Our products contain <strong>cashew nuts</strong> and are packed in a
      facility that handles tree nuts. If you have a nut allergy, do not consume
      them. Storage guidance is printed on every pack; please follow it.
    </p>

    <h2>Governing law</h2>
    <p>
      These terms are governed by the laws of India, and the courts at Lucknow,
      Uttar Pradesh have exclusive jurisdiction over any dispute arising from
      them. {/* TODO(confirm): jurisdiction — Lucknow assumed from the shop
      address. */}
    </p>

    <h2>Changes</h2>
    <p>
      We may update these terms from time to time. The version published here at
      the moment you place an order is the version that applies to it.
    </p>
  </PolicyPage>
);

export default Terms;

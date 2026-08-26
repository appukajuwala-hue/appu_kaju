import PolicyPage from "../components/PolicyPage";
import { company } from "../constants";

const Refunds = () => (
  <PolicyPage
    title="Refunds & cancellations"
    seoTitle="Refund & Cancellation Policy — Appu Kaju"
    description="How to cancel an Appu Kaju order, and how refunds for damaged or incorrect deliveries work."
    lead="Cashews are food, so we cannot take them back once they have left us — but anything wrong with an order is ours to fix."
    updated="26 August 2026"
  >
    <h2>Cancelling an order</h2>
    <p>
      You can cancel any order at no cost <strong>before it is dispatched</strong>
      . Call us on {company.phone} or email{" "}
      <a href={`mailto:${company.emails[0]}`}>{company.emails[0]}</a> with your
      order number and we will stop the parcel and refund you in full.
    </p>
    <p>
      Once a parcel has been handed to the courier we can no longer cancel it.
      {/* TODO(confirm): dispatch usually happens within 1–2 working days —
      confirm the real cut-off so customers know how long they actually have. */}
    </p>

    <h2>Returns</h2>
    <p>
      Because cashew kernels are a perishable food product, we cannot accept
      returns of packs that have been opened, or that were delivered correctly
      and in good condition. This is a food-safety limit, not a commercial one.
    </p>

    <h2>When something is wrong</h2>
    <p>
      We will replace or refund an order, entirely at your choice, if any of the
      following applies:
    </p>
    <ul>
      <li>the pack arrived damaged, torn or with a broken vacuum seal;</li>
      <li>you received a different grade or pack size from the one you ordered;</li>
      <li>the contents are spoiled, stale or otherwise not fit to eat;</li>
      <li>part of your order is missing.</li>
    </ul>
    <p>
      Tell us within <strong>48 hours of delivery</strong> and send a photograph
      of the pack and the outer parcel — that is usually all we need to settle it
      immediately.{" "}
      {/* TODO(confirm): 48 hours is the common standard for food; widen it if
      you would rather be more generous. */}
    </p>

    <h2>How to claim</h2>
    <p>
      Call {company.phone} or email{" "}
      <a href={`mailto:${company.emails[0]}`}>{company.emails[0]}</a> with your
      order number, what went wrong, and a photograph if the pack was damaged. We
      answer during shop hours and will confirm the outcome in writing.
    </p>

    <h2>How refunds are paid</h2>
    <p>
      Refunds are issued to the original payment method through Razorpay. Once we
      approve a refund it is initiated the same working day, and the money
      typically reaches your account in <strong>5 to 7 working days</strong>,
      depending on your bank. We cannot refund to a different card or account
      from the one used to pay.
    </p>
    <p>
      Where an order was delivered free of charge and is refunded in full, you
      are refunded the full amount you paid — there is no delivery charge to
      deduct.
    </p>

    <h2>Failed payments</h2>
    <p>
      If money left your account but no order confirmation arrived, the payment
      was most likely not completed and your bank will release the amount
      automatically, usually within 5 to 7 working days. If it does not, contact
      us with the payment reference and we will trace it with Razorpay.{" "}
      <strong>Please do not pay a second time</strong> until you have spoken to
      us.
    </p>
  </PolicyPage>
);

export default Refunds;

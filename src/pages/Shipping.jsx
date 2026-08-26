import { Link } from "react-router-dom";
import PolicyPage from "../components/PolicyPage";
import { company } from "../constants";

const Shipping = () => (
  <PolicyPage
    title="Shipping policy"
    seoTitle="Shipping Policy — Appu Kaju"
    description="Where Appu Kaju delivers, how long it takes, and what delivery costs."
    lead="Where we deliver, how long it takes, and what to do if a parcel turns up damaged."
    updated="26 August 2026"
  >
    <h2>Where we deliver</h2>
    <p>
      We deliver anywhere in India. We do not ship internationally at present.
    </p>
    <p>
      Orders leave our facility in {company.factory} or our shop at{" "}
      {company.shopAddress}, depending on the pack size.
    </p>

    <h2>What delivery costs</h2>
    <p>
      <strong>Delivery is free on every order</strong>, at every pack size,
      anywhere in the country. The total shown at checkout is the total you pay —
      there are no handling fees, packing charges or courier surcharges added
      afterwards.
    </p>

    <h2>How long it takes</h2>
    <ul>
      <li>
        <strong>Dispatch:</strong> within 1 to 2 working days of your order being
        confirmed. Retail pouches usually go the next working day; 10 kg cartons
        can take a day longer to pack.
      </li>
      <li>
        <strong>Delivery:</strong> typically 3 to 7 working days after dispatch,
        depending on how far the parcel has to travel.
      </li>
    </ul>
    <p>
      {/* TODO(confirm): dispatch and delivery windows are estimates — replace
      both with your real courier's committed timelines. */}
      Deliveries to remote PIN codes, and to areas affected by weather, strikes
      or festival backlogs, can take longer. We do not dispatch on Sundays or
      public holidays.
    </p>

    <h2>Tracking your order</h2>
    <p>
      We call or message you with courier and tracking details once your parcel
      has been picked up. If you have not heard from us within three working days
      of ordering, call {company.phone} with your order number and we will find
      out where it is.
    </p>

    <h2>How your order is packed</h2>
    <p>
      Every pack is vacuum-sealed before it is boxed, which is what keeps the
      kernels fresh in transit. Retail pouches travel inside a rigid outer carton;
      10 kg orders ship in their own carton with the seal intact.
    </p>

    <h2>If a parcel arrives damaged</h2>
    <p>
      Please check the outer carton before you accept it. If it is visibly
      crushed, wet or open, you are entitled to refuse the delivery — and
      refusing it is the cleanest outcome for both of us.
    </p>
    <p>
      If you only notice the damage after opening, photograph the pack and the
      outer carton and contact us within 48 hours. Our{" "}
      <Link to="/refunds">refund &amp; cancellation policy</Link> sets out what
      happens next.
    </p>

    <h2>Wrong or incomplete address</h2>
    <p>
      Couriers cannot deliver to an incomplete address. Please check your address
      and PIN code before paying. If a parcel is returned to us undelivered
      because the address was wrong or nobody was available after repeated
      attempts, we will contact you to arrange redelivery; a second delivery
      attempt to a corrected address may be chargeable.{" "}
      {/* TODO(confirm): whether you actually want to charge for redelivery. */}
    </p>

    <h2>Questions</h2>
    <p>
      Call {company.phone} or email{" "}
      <a href={`mailto:${company.emails[0]}`}>{company.emails[0]}</a>.
    </p>
  </PolicyPage>
);

export default Shipping;

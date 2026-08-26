import PolicyPage from "../components/PolicyPage";
import { company } from "../constants";

const Privacy = () => (
  <PolicyPage
    title="Privacy policy"
    seoTitle="Privacy Policy — Appu Kaju"
    description="What personal information Appu Kaju collects, why, and how it is handled."
    lead="What we collect when you order, why we need it, and what we never see."
    updated="26 August 2026"
  >
    <h2>The short version</h2>
    <p>
      We collect the details needed to deliver cashews to you and nothing else.
      We do not sell your information, we do not run advertising trackers on this
      site, and <strong>we never see your card details</strong> — those go
      directly to Razorpay.
    </p>

    <h2>What we collect</h2>
    <ul>
      <li>
        <strong>Delivery details</strong> — your name, email address, phone
        number and postal address, so the order can be packed, dispatched and
        confirmed.
      </li>
      <li>
        <strong>Order details</strong> — which packs you bought, the amount paid
        and the payment reference.
      </li>
      <li>
        <strong>Messages you send us</strong> — anything you write on the contact
        form or by email, kept so we can reply and follow up.
      </li>
    </ul>
    <p>
      We do not ask for, and have no use for, your date of birth, your ID
      documents or any financial information.
    </p>

    <h2>What we never receive</h2>
    <p>
      Card numbers, UPI PINs, CVVs and netbanking passwords are entered inside
      Razorpay&rsquo;s payment window, which is theirs and not ours. That
      information never reaches this website&rsquo;s servers in any form. We are
      told only whether a payment succeeded and its reference number.
    </p>

    <h2>Where it is stored</h2>
    <p>
      Your order and delivery details are held in our Razorpay merchant account,
      which is where we look up orders to fulfil them, and in the order email we
      send ourselves. Razorpay is an RBI-authorised payment aggregator and
      processes this data as part of taking your payment; their handling of it is
      covered by their own privacy policy.
    </p>
    <p>
      Your browser also stores your shopping bag and a copy of your most recent
      order receipts locally on your own device, so the bag survives a refresh
      and your confirmation page can be reopened. That data stays on your device,
      is never transmitted to us, and is cleared when you clear your browser
      data.
    </p>

    <h2>How long we keep it</h2>
    <p>
      Order records are retained for as long as we need them for accounting and
      tax purposes, and to handle any question about a past order.{" "}
      {/* TODO(confirm): retention period — set a definite number of years once
      your accountant has confirmed the requirement. */}
    </p>

    <h2>Cookies and tracking</h2>
    <p>
      This site sets no advertising or analytics cookies and embeds no
      third-party trackers. Razorpay&rsquo;s payment window sets its own cookies
      when it opens, which are necessary for the payment to work.
    </p>

    <h2>Your rights</h2>
    <p>
      You can ask us what we hold about you, ask us to correct it, or ask us to
      delete it where we are not required to keep it. Write to{" "}
      <a href={`mailto:${company.emails[0]}`}>{company.emails[0]}</a> or call{" "}
      {company.phone} and we will respond as quickly as we can.
    </p>

    <h2>Contact</h2>
    <p>
      {company.name}
      <br />
      {company.shopAddress}
      <br />
      {company.phone} ·{" "}
      <a href={`mailto:${company.emails[0]}`}>{company.emails[0]}</a>
    </p>
  </PolicyPage>
);

export default Privacy;

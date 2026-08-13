import { useState } from "react";
import Seo from "../components/Seo";
import PageHeader from "../components/PageHeader";
import { company } from "../constants";

const EMPTY = { name: "", email: "", phone: "", message: "" };

const Contact = () => {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setErrors((x) => ({ ...x, [k]: undefined }));
  };

  const validate = () => {
    const next = {};
    if (!form.name.trim()) next.name = "Please tell us your name.";
    if (!form.email.trim()) next.email = "We need an email to reply to.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      next.email = "That email address does not look right.";
    if (!form.message.trim()) next.message = "Let us know what you need.";
    return next;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length) return;

    // NOTE: there is no backend wired up yet. Rather than silently discard the
    // message, we hand the visitor a prefilled mailto so it actually reaches
    // the shop. Swap this block for Formspree/EmailJS/an API call when ready.
    const body = [
      `Name: ${form.name}`,
      `Email: ${form.email}`,
      form.phone ? `Phone: ${form.phone}` : null,
      "",
      form.message,
    ]
      .filter(Boolean)
      .join("\n");

    window.location.href = `mailto:${company.emails[0]}?subject=${encodeURIComponent(
      `Website enquiry from ${form.name}`
    )}&body=${encodeURIComponent(body)}`;

    setSubmitted(true);
  };

  const field =
    "w-full font-paragraph text-ink bg-cream border-2 border-ink/15 rounded-2xl px-5 py-4 focus:border-royal outline-none transition-colors";

  return (
    <div>
      <Seo
        title="Contact Appu Kaju — Lucknow shop, phone and email"
        description={`Reach Appu Kaju at ${company.phone} or visit ${company.shopAddress}.`}
      />

      <PageHeader
        eyebrow="Get in touch"
        title="Come and see us"
        lead="Walk into the Lucknow shop, call us, or send a message. Bulk and retail enquiries both welcome."
      />

      <section className="md:pb-24 pb-16">
        <div className="wrap grid lg:grid-cols-2 gap-12">
          {/* details */}
          <div className="flex flex-col gap-6">
            <div className="rounded-3xl border-2 border-ink/10 bg-cream p-8">
              <p className="eyebrow text-royal mb-3">The shop</p>
              <address className="not-italic font-paragraph md:text-lg text-ink/80 leading-relaxed">
                {company.shopAddress}
              </address>
              <p className="font-paragraph text-sm text-ink/55 mt-3">
                Factory: {company.factory} · Delivery across India
              </p>
            </div>

            <div className="rounded-3xl border-2 border-ink/10 bg-cream p-8">
              <p className="eyebrow text-royal mb-3">Phone</p>
              <a
                href={company.phoneHref}
                className="font-bold md:text-4xl text-3xl tracking-tight text-ink hover:text-royal transition-colors"
              >
                {company.phone}
              </a>
              <p className="font-paragraph text-sm text-ink/55 mt-3">
                Dedicated support, seven days a week
              </p>
            </div>

            <div className="rounded-3xl border-2 border-ink/10 bg-cream p-8">
              <p className="eyebrow text-royal mb-3">Email</p>
              <ul className="flex flex-col gap-1.5">
                {company.emails.map((e) => (
                  <li key={e}>
                    <a
                      href={`mailto:${e}`}
                      className="font-paragraph md:text-lg text-ink/80 hover:text-royal transition-colors break-all"
                    >
                      {e}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex gap-3">
              <a
                href={company.instagram}
                target="_blank"
                rel="noreferrer noopener"
                className="btn-ghost text-ink hover:bg-ink hover:text-cream"
              >
                Instagram
              </a>
              <a
                href={company.facebook}
                target="_blank"
                rel="noreferrer noopener"
                className="btn-ghost text-ink hover:bg-ink hover:text-cream"
              >
                Facebook
              </a>
            </div>
          </div>

          {/* form */}
          <div>
            <form
              onSubmit={handleSubmit}
              noValidate
              className="rounded-3xl bg-kernel/40 border-2 border-ink/10 md:p-10 p-7 flex flex-col gap-5"
            >
              <h2 className="section-title text-ink">Send a message</h2>

              <div>
                <label
                  htmlFor="name"
                  className="eyebrow text-ink/60 block mb-2"
                >
                  Your name
                </label>
                <input
                  id="name"
                  className={field}
                  value={form.name}
                  onChange={set("name")}
                  aria-invalid={!!errors.name}
                  aria-describedby={errors.name ? "err-name" : undefined}
                />
                {errors.name && (
                  <p id="err-name" className="font-paragraph text-sm text-chilli mt-2">
                    {errors.name}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="email" className="eyebrow text-ink/60 block mb-2">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  className={field}
                  value={form.email}
                  onChange={set("email")}
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? "err-email" : undefined}
                />
                {errors.email && (
                  <p id="err-email" className="font-paragraph text-sm text-chilli mt-2">
                    {errors.email}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="phone" className="eyebrow text-ink/60 block mb-2">
                  Phone <span className="normal-case tracking-normal">(optional)</span>
                </label>
                <input
                  id="phone"
                  type="tel"
                  className={field}
                  value={form.phone}
                  onChange={set("phone")}
                />
              </div>

              <div>
                <label htmlFor="message" className="eyebrow text-ink/60 block mb-2">
                  Message
                </label>
                <textarea
                  id="message"
                  rows={5}
                  className={`${field} resize-y`}
                  value={form.message}
                  onChange={set("message")}
                  aria-invalid={!!errors.message}
                  aria-describedby={errors.message ? "err-message" : undefined}
                />
                {errors.message && (
                  <p id="err-message" className="font-paragraph text-sm text-chilli mt-2">
                    {errors.message}
                  </p>
                )}
              </div>

              <button type="submit" className="btn-primary justify-center">
                Send message
              </button>

              <p
                className="font-paragraph text-xs text-ink/55"
                role={submitted ? "status" : undefined}
              >
                {submitted
                  ? "Your email app should have opened with the message ready to send."
                  : "This opens your email app with the message prefilled — no form backend is connected yet."}
              </p>
            </form>
          </div>
        </div>
      </section>

      {/* map */}
      <section className="pb-0">
        <iframe
          title="Appu Kaju shop location in Lucknow"
          src={`https://www.google.com/maps?q=${encodeURIComponent(
            company.mapQuery
          )}&output=embed`}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          className="w-full md:h-[28rem] h-80 border-0 block"
        />
      </section>
    </div>
  );
};

export default Contact;

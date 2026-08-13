import { useState } from "react";
import { Link } from "react-router-dom";
import { company, navLinks } from "../constants";

const Instagram = (props) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" {...props}>
    <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="1.8" />
    <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" />
    <circle cx="17.4" cy="6.6" r="1.2" fill="currentColor" />
  </svg>
);

const Facebook = (props) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
    <path
      d="M15.12 5.32H17V2.14A26.11 26.11 0 0 0 14.26 2C11.54 2 9.68 3.66 9.68 6.7v2.62H6.61v3.56h3.07V22h3.68v-9.12h3.06l.46-3.56h-3.52V7.05c0-1.03.28-1.73 1.76-1.73Z"
      fill="currentColor"
    />
  </svg>
);

const MailIcon = (props) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" {...props}>
    <rect x="3" y="5" width="18" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
    <path d="m4 7 8 6 8-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

const Footer = () => {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  // No mailing-list backend yet, so this hands the address to the shop's inbox
  // rather than pretending to subscribe someone. Swap for a real provider later.
  const subscribe = (e) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("That email address does not look right.");
      return;
    }
    setError("");
    window.location.href = `mailto:${company.emails[0]}?subject=${encodeURIComponent(
      "Newsletter signup"
    )}&body=${encodeURIComponent(`Please add ${email} to the Appu Kaju mailing list.`)}`;
  };

  return (
    <footer className="footer-section">
      {/* Pour footage, composited with a lighten blend so the black background
          drops away. Masked at the edges so any lift in the source's blacks
          fades out instead of showing as a rectangle. */}
      <video
        src="/videos/pour.mp4"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        aria-hidden="true"
        className="footer-pour"
      />

      <div className="relative z-10 wrap md:pt-24 pt-16">
        <h2 className="footer-hash">#AppuKaju</h2>

        <div className="flex-center gap-4 md:mt-10 mt-8">
          <a
            href={company.instagram}
            target="_blank"
            rel="noreferrer noopener"
            className="social-btn"
            aria-label="Appu Kaju on Instagram"
          >
            <Instagram className="size-6" />
          </a>
          <a
            href={company.facebook}
            target="_blank"
            rel="noreferrer noopener"
            className="social-btn"
            aria-label="Appu Kaju on Facebook"
          >
            <Facebook className="size-7" />
          </a>
          <a
            href={`mailto:${company.emails[0]}`}
            className="social-btn"
            aria-label={`Email Appu Kaju at ${company.emails[0]}`}
          >
            <MailIcon className="size-6" />
          </a>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 md:mt-32 mt-20">
          <div className="flex flex-wrap md:gap-16 gap-10">
            <div>
              <h3 className="eyebrow text-gold mb-4">Explore</h3>
              <ul className="flex flex-col gap-2.5 font-paragraph text-cream/75">
                {navLinks.map((l) => (
                  <li key={l.to}>
                    <Link to={l.to} className="hover:text-cream transition-colors">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="eyebrow text-gold mb-4">Visit the shop</h3>
              <address className="not-italic font-paragraph text-cream/75 leading-relaxed max-w-xs">
                {company.shopAddress}
                <br />
                <span className="text-cream/50">Factory: {company.factory}</span>
              </address>
            </div>

            <div>
              <h3 className="eyebrow text-gold mb-4">Get in touch</h3>
              <ul className="flex flex-col gap-2.5 font-paragraph text-cream/75">
                <li>
                  <a href={company.phoneHref} className="hover:text-cream transition-colors">
                    {company.phone}
                  </a>
                </li>
                {company.emails.map((e) => (
                  <li key={e}>
                    <a
                      href={`mailto:${e}`}
                      className="hover:text-cream transition-colors break-all"
                    >
                      {e}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="lg:max-w-lg lg:justify-self-end w-full">
            <p className="font-paragraph text-cream/75 md:text-lg">
              Get the new harvest first. Occasional notes on stock, festival
              boxes and what is worth buying this season.
            </p>

            <form onSubmit={subscribe} noValidate className="md:mt-10 mt-6">
              <div className="flex items-center gap-4 border-b border-cream/30 py-4">
                <label htmlFor="footer-email" className="sr-only">
                  Your email address
                </label>
                <input
                  id="footer-email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError("");
                  }}
                  placeholder="Enter your email"
                  aria-invalid={!!error}
                  aria-describedby={error ? "footer-email-error" : undefined}
                  className="w-full bg-transparent 2xl:text-4xl text-2xl text-cream placeholder:text-cream/40 placeholder:font-bold placeholder:tracking-tight outline-none"
                />
                <button
                  type="submit"
                  aria-label="Sign up for the newsletter"
                  className="shrink-0 text-cream hover:text-gold transition-colors"
                >
                  <svg viewBox="0 0 24 24" className="size-8" fill="none" aria-hidden="true">
                    <path
                      d="M4 12h15m0 0-6-6m6 6-6 6"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>
              {error && (
                <p id="footer-email-error" className="font-paragraph text-sm text-gold mt-3">
                  {error}
                </p>
              )}
            </form>
          </div>
        </div>
      </div>

      <div className="copyright-box relative z-10">
        <p>
          © {new Date().getFullYear()} {company.name}. All rights reserved.
        </p>
        <p className="max-w-xl md:text-right">
          Nutrition and health information on this site is general in nature and
          is not medical advice.
        </p>
      </div>
    </footer>
  );
};

export default Footer;

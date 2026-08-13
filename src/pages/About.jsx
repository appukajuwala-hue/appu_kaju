import { useRef } from "react";
import { Link } from "react-router-dom";
import Seo from "../components/Seo";
import PageHeader from "../components/PageHeader";
import { gsap, useGSAP, usePrefersReducedMotion } from "../lib/gsap";
import { company, values, stats } from "../constants";

const About = () => {
  const root = useRef(null);
  const reduced = usePrefersReducedMotion();

  useGSAP(
    () => {
      if (reduced) return;

      // Count the stat numbers up as the strip scrolls in. The markup already
      // holds the real figure, so if this never runs the numbers are still
      // correct — the animation only ever decorates a truthful value.
      gsap.utils.toArray(".stat-value").forEach((el) => {
        const target = Number(el.dataset.value);
        const isYear = el.dataset.format === "plain";
        const format = (n) =>
          isYear ? String(n) : Math.round(n).toLocaleString("en-IN");
        const counter = { v: isYear ? target - 25 : 0 };

        gsap.to(counter, {
          v: target,
          duration: 1.4,
          ease: "power2.out",
          scrollTrigger: { trigger: el, start: "top 88%" },
          onUpdate: () => {
            el.textContent = format(Math.round(counter.v));
          },
          // Guarantee the true value is what's left on screen.
          onComplete: () => {
            el.textContent = format(target);
          },
        });
      });

      gsap.from(".value-card", {
        y: 40,
        opacity: 0,
        duration: 0.6,
        stagger: 0.1,
        ease: "power2.out",
        scrollTrigger: { trigger: ".value-grid", start: "top 80%" },
      });
    },
    { scope: root, dependencies: [reduced] }
  );

  return (
    <div ref={root}>
      <Seo
        title="About Appu Kaju — Cashew specialists since 1998"
        description="Founded in 1998 in Andhra Pradesh, Appu Kaju supplies handpicked cashew nuts across India from its factory and its Lucknow shop."
      />

      <PageHeader
        eyebrow="Our story"
        title="Twenty-seven years of one thing"
        lead={`Appu Kaju was established in ${company.founded} in ${company.factory}. We have never diversified, never chased a trend, and never sold a kernel we would not eat ourselves.`}
      />

      {/* stats */}
      <section className="bg-ink text-cream md:py-20 py-14">
        <div className="wrap grid grid-cols-2 md:grid-cols-4 gap-y-10">
          {stats.map((s) => (
            <div key={s.label} className="text-center px-3">
              <p className="font-bold md:text-6xl text-4xl tracking-tight text-gold">
                <span
                  className="stat-value"
                  data-value={s.value}
                  data-format={s.format || "num"}
                >
                  {s.format === "plain"
                    ? s.value
                    : s.value.toLocaleString("en-IN")}
                </span>
                {s.suffix || ""}
              </p>
              <p className="font-paragraph text-sm text-cream/65 mt-2 max-w-[16ch] mx-auto">
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* mission / vision */}
      <section className="md:py-28 py-20">
        <div className="wrap grid md:grid-cols-2 gap-10">
          <div className="rounded-3xl bg-royal text-cream p-10">
            <p className="eyebrow text-cream/70 mb-4">Mission</p>
            <p className="font-bold uppercase md:text-4xl text-2xl leading-tight tracking-tight">
              {company.mission}
            </p>
          </div>
          <div className="rounded-3xl bg-kernel/60 text-ink p-10">
            <p className="eyebrow text-ink/60 mb-4">Vision</p>
            <p className="font-bold uppercase md:text-4xl text-2xl leading-tight tracking-tight">
              {company.vision}
            </p>
          </div>
        </div>
      </section>

      {/* where we are */}
      <section className="bg-cream md:pb-28 pb-20">
        <div className="wrap grid md:grid-cols-2 gap-10">
          <div>
            <p className="eyebrow text-royal mb-3">The factory</p>
            <h2 className="section-title text-ink">{company.factory}</h2>
            <p className="font-paragraph text-ink/70 leading-relaxed mt-4">
              Where the harvest arrives, gets dried, shelled, graded and sealed.
              Everything that carries our name passes through here first.
            </p>
          </div>
          <div>
            <p className="eyebrow text-royal mb-3">The shop</p>
            <h2 className="section-title text-ink">Lucknow</h2>
            <p className="font-paragraph text-ink/70 leading-relaxed mt-4">
              {company.shopAddress}. Walk in and buy the same stock we ship
              across the country — or order online and we will send it to you.
            </p>
            <Link to="/contact" className="btn-ghost text-ink hover:bg-ink hover:text-cream mt-7">
              Find us
            </Link>
          </div>
        </div>
      </section>

      {/* values */}
      <section className="bg-kernel/35 md:py-28 py-20">
        <div className="wrap">
          <h2 className="section-title text-ink text-center">What we hold to</h2>
          <div className="value-grid grid md:grid-cols-2 2xl:grid-cols-4 gap-6 md:mt-16 mt-10">
            {values.map((v) => (
              <article
                key={v.title}
                className="value-card rounded-3xl bg-cream border-2 border-ink/10 p-8"
              >
                <h3 className="text-2xl font-bold uppercase tracking-tight text-ink">
                  {v.title}
                </h3>
                <p className="font-paragraph text-ink/75 leading-relaxed mt-3">
                  {v.detail}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default About;

import { useRef } from "react";
import { gsap, useGSAP, usePrefersReducedMotion } from "../lib/gsap";
import { testimonials } from "../constants";

const Star = () => (
  <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
    <path
      fill="currentColor"
      d="m12 2 2.9 6.3 6.8.8-5 4.7 1.3 6.8L12 17.4 6 20.6l1.3-6.8-5-4.7 6.8-.8Z"
    />
  </svg>
);

const TestimonialSection = () => {
  const root = useRef(null);
  const reduced = usePrefersReducedMotion();

  useGSAP(
    () => {
      if (reduced) return;

      gsap.from(".quote-card", {
        y: 60,
        opacity: 0,
        duration: 0.7,
        stagger: 0.12,
        ease: "power2.out",
        scrollTrigger: { trigger: root.current, start: "top 70%" },
      });
    },
    { scope: root, dependencies: [reduced] }
  );

  return (
    <section ref={root} className="bg-cream md:py-28 py-20">
      <div className="wrap">
        <div className="col-center text-center">
          <p className="eyebrow text-royal mb-4">From our customers</p>
          <h2 className="section-title text-ink max-w-3xl">
            What everyone&apos;s talking about
          </h2>
        </div>

        {/* 4-up on very wide screens so the quotes keep a readable measure
            now that the section runs edge to edge. */}
        <div className="grid md:grid-cols-2 2xl:grid-cols-4 gap-6 md:mt-16 mt-10">
          {testimonials.map((t, i) => (
            <figure key={i} className="quote-card">
              <div className="flex gap-1 text-gold" aria-label="5 out of 5">
                {Array.from({ length: 5 }, (_, s) => (
                  <Star key={s} />
                ))}
              </div>
              <blockquote>“{t.quote}”</blockquote>
              <figcaption className="font-paragraph text-sm text-ink/55 mt-auto">
                {t.name} · {t.source}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialSection;

import { useRef } from "react";
import { Link } from "react-router-dom";
import {
  gsap,
  useGSAP,
  SplitText,
  fontsReady,
  usePrefersReducedMotion,
} from "../lib/gsap";
import { company } from "../constants";

const HeroSection = () => {
  const root = useRef(null);
  const reduced = usePrefersReducedMotion();

  useGSAP(
    () => {
      // Nothing is hidden in the markup: if JS or GSAP never runs, the hero
      // still renders. The hidden state is applied here instead, inside
      // useLayoutEffect, so it lands before the browser paints.
      if (reduced) return;

      gsap.set(".hero-content", { opacity: 0, y: 24 });
      gsap.set(".hero-text-scroll", {
        clipPath: "polygon(50% 0, 50% 0, 50% 100%, 50% 100%)",
      });
      gsap.set(".hero-tail > *", { opacity: 0, y: 24 });

      // Split only once webfonts have landed, otherwise the char boxes are
      // measured against the fallback face and jump on swap. The guard matters:
      // this resolves after useGSAP's cleanup, so without it React's
      // double-mount would build the intro twice.
      let cancelled = false;
      let split;
      let intro;

      fontsReady().then(() => {
        if (cancelled) return;
        split = SplitText.create(".hero-title", { type: "chars" });

        const tl = gsap.timeline({ delay: 0.2 });
        intro = tl;
        tl.to(".hero-content", { opacity: 1, y: 0, duration: 0.6, ease: "power1.inOut" })
          .from(
            split.chars,
            { yPercent: 160, stagger: 0.02, ease: "power2.out", duration: 0.8 },
            "-=0.3"
          )
          .to(
            ".hero-text-scroll",
            {
              duration: 0.9,
              clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
              ease: "circ.out",
            },
            "-=0.5"
          )
          .to(
            ".hero-tail > *",
            { y: 0, opacity: 1, stagger: 0.12, ease: "power2.out" },
            "-=0.4"
          );
      });

      // The whole hero tips and sinks away as the next section arrives —
      // the reference's signature exit.
      gsap.to(".hero-container", {
        rotate: 5,
        scale: 0.92,
        yPercent: 18,
        ease: "power1.inOut",
        scrollTrigger: {
          trigger: ".hero-container",
          start: "1% top",
          end: "bottom top",
          scrub: true,
        },
      });

      return () => {
        cancelled = true;
        if (intro) intro.kill();
        if (split) split.revert();
      };
    },
    { scope: root, dependencies: [reduced] }
  );

  return (
    <section ref={root} className="bg-cream">
      <div className="hero-container">
        {/* Warm ground that shows while the video buffers, and behind it on
            phones where the video never loads at all. */}
        <div
          className="absolute inset-0 pointer-events-none"
          aria-hidden="true"
          style={{
            background:
              "radial-gradient(60% 55% at 50% 18%, rgba(242,183,5,.28) 0%, rgba(246,239,226,0) 70%), radial-gradient(55% 50% at 12% 88%, rgba(27,108,181,.22) 0%, rgba(246,239,226,0) 70%), radial-gradient(50% 45% at 88% 78%, rgba(127,208,224,.30) 0%, rgba(246,239,226,0) 70%)",
          }}
        />

        {/* Served at every size — the clip is only ~2.6MB, and muted +
            playsInline autoplays on iOS. The gradient above shows while it
            buffers, so there is no blank frame. */}
        <video
          src="/videos/hero-kaju.mp4"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Keeps the navy headline legible over whatever the footage is doing
            underneath it. */}
        <div
          className="hero-scrim absolute inset-0 pointer-events-none"
          aria-hidden="true"
        />

        <div className="hero-content">
          <p className="eyebrow text-royal mb-5">
            Est. {company.founded} · {company.factory} → Lucknow
          </p>

          <div className="overflow-hidden">
            <h1 className="hero-title">{company.tagline}</h1>
          </div>

          <div className="hero-text-scroll">
            <div className="hero-subtitle">
              <h2>{company.subTagline}</h2>
            </div>
          </div>

          <div className="hero-tail col-center">
            <p>{company.blurb}</p>

            <div className="flex flex-wrap justify-center gap-4 md:mt-12 mt-8">
              <Link to="/shop" className="btn-primary">
                See the range
              </Link>
              <Link
                to="/process"
                className="btn-ghost text-ink hover:bg-ink hover:text-cream"
              >
                How it&apos;s made
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;

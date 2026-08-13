import { useRef } from "react";
import { useMediaQuery } from "react-responsive";
import { gsap, useGSAP, usePrefersReducedMotion } from "../lib/gsap";
import { healthGroups } from "../constants";

/**
 * The reference's closing move, applied to the health content: three lines of
 * oversized type that slide apart at different rates while a fan of cards
 * rises into place over them.
 *
 * Unlike the reference, the section does not pull itself up with a hardcoded
 * negative margin — that made the original fragile against content changes.
 * It simply owns its own height.
 */

const CARDS = [
  ...healthGroups.map((group, i) => ({
    id: group.id,
    n: String(i + 1).padStart(2, "0"),
    title: group.label,
    headline: group.headline,
    points: group.points.slice(0, 3),
    bg: ["#7FD0E0", "#1B6CB5", "#12386E"][i],
    ink: [ "#0E2A4E", "#F6EFE2", "#F6EFE2"][i],
    rotation: ["rotate-[-5deg]", "rotate-[3deg]", "rotate-[-2deg]"][i],
  })),
  {
    id: "skin",
    n: "04",
    title: "Your Skin",
    headline: "What your skin rebuilds with",
    points: [
      "Copper and zinc support collagen production.",
      "Vitamin E brings antioxidant, anti-ageing protection.",
      "Healthy fats help skin hold its own moisture.",
    ],
    bg: "#F2B705",
    ink: "#0E2A4E",
    rotation: "rotate-[5deg]",
  },
];

const HealthStack = () => {
  const root = useRef(null);
  const reduced = usePrefersReducedMotion();
  const isDesktop = useMediaQuery({ query: "(min-width: 1024px)" });

  useGSAP(
    () => {
      if (!isDesktop || reduced) return;

      // Headline lines drift apart as the section passes.
      const drift = gsap.timeline({
        scrollTrigger: {
          trigger: root.current,
          start: "top bottom",
          end: "bottom top",
          scrub: true,
        },
      });
      drift
        .to(".hs-line-1", { xPercent: 16, ease: "none" })
        .to(".hs-line-2", { xPercent: -12, ease: "none" }, "<")
        .to(".hs-line-3", { xPercent: 9, ease: "none" }, "<");

      // Cards rise into the frame, staggered.
      const rise = gsap.timeline({
        scrollTrigger: {
          trigger: root.current,
          start: "top top",
          end: "+=140%",
          scrub: 1.4,
          pin: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      });
      rise.from(".health-card", {
        yPercent: 160,
        opacity: 0,
        stagger: 0.18,
        ease: "power1.inOut",
      });

      return () => {
        drift.scrollTrigger && drift.scrollTrigger.kill();
        rise.scrollTrigger && rise.scrollTrigger.kill();
      };
    },
    { scope: root, dependencies: [isDesktop, reduced] }
  );

  return (
    <section ref={root} className="health-stack">
      <div className="hs-titles" aria-hidden="true">
        <h2 className="hs-line-1 text-ink">What</h2>
        <h2 className="hs-line-2 text-royal/35">it does</h2>
        <h2 className="hs-line-3 text-ink">for you</h2>
      </div>

      {/* Real heading for assistive tech, since the display type above is
          split into decorative lines. */}
      <h2 className="sr-only">What cashews do for you, by age group</h2>

      <div className="hs-cards">
        {CARDS.map((card) => (
          <article
            key={card.id}
            className={`health-card ${card.rotation}`}
            style={{ backgroundColor: card.bg, color: card.ink }}
          >
            <span className="hc-num">{card.n}</span>
            <h3>{card.title}</h3>
            <p className="hc-headline">{card.headline}</p>
            <ul>
              {card.points.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
};

export default HealthStack;

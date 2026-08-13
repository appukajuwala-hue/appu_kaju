import { useRef } from "react";
import { Link } from "react-router-dom";
import { gsap, useGSAP, usePrefersReducedMotion } from "../lib/gsap";
import ClipPathTitle from "../components/ClipPathTitle";
import VideoPinSection from "../components/VideoPinSection";
import { benefitTitles } from "../constants";

const ROTATIONS = ["rotate-[2deg]", "rotate-[-1.5deg]", "rotate-[1deg]", "rotate-[-2.5deg]"];

const BenefitSection = () => {
  const root = useRef(null);
  const titlesRef = useRef(null);
  const reduced = usePrefersReducedMotion();

  useGSAP(
    () => {
      const targets = gsap.utils.toArray(".clip-title");

      if (reduced) return;

      gsap.set(targets, {
        opacity: 0,
        clipPath: "polygon(0% 0%, 0% 100%, 0% 100%, 0% 0%)",
      });

      gsap.to(targets, {
        opacity: 1,
        clipPath: "polygon(0% 0%, 100% 0, 100% 100%, 0% 100%)",
        duration: 1,
        ease: "circ.out",
        stagger: 0.6,
        // Trigger on the titles themselves, NOT the section. The section also
        // contains the pinned video reveal, which makes it thousands of pixels
        // tall — measuring against it stretched this scrub so far that the
        // titles were still at opacity 0 while on screen, leaving a blank gap.
        scrollTrigger: {
          trigger: titlesRef.current,
          start: "top 80%",
          end: "bottom 60%",
          scrub: 1.2,
        },
      });
    },
    { scope: root, dependencies: [reduced] }
  );

  return (
    <section ref={root} className="benefit-section">
      <div className="wrap col-center">
        <p className="text-cream/70 font-paragraph text-center md:text-lg max-w-md">
          What you actually get when you open a pack with our name on it
        </p>

        <div ref={titlesRef} className="md:mt-16 mt-10 col-center">
          {benefitTitles.map((b, i) => (
            <ClipPathTitle
              key={b.title}
              title={b.title}
              bg={b.bg}
              color={b.color}
              borderColor="#0e2a4e"
              className={ROTATIONS[i % ROTATIONS.length]}
            />
          ))}
        </div>

        <Link
          to="/process"
          className="btn-ghost text-cream hover:bg-cream hover:text-ink md:mt-16 mt-10"
        >
          See all 10 steps
        </Link>
      </div>

      {/* The circular reveal onto the harvest footage, as in the reference */}
      <div className="relative md:mt-24 mt-16">
        <VideoPinSection />
      </div>
    </section>
  );
};

export default BenefitSection;

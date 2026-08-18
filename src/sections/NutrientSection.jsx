import { useRef } from "react";
import {
  gsap,
  useGSAP,
  SplitText,
  fontsReady,
  usePrefersReducedMotion,
} from "../lib/gsap";
import { nutrients } from "../constants";

const NutrientSection = () => {
  const root = useRef(null);
  const reduced = usePrefersReducedMotion();

  useGSAP(
    () => {
      if (reduced) return;

      gsap.set(".nutrition-text-scroll", {
        opacity: 0,
        clipPath: "polygon(0 0, 0 0, 0 100%, 0% 100%)",
      });

      // Guarded: resolves after useGSAP's cleanup, so React's double-mount
      // would otherwise create this twice with no way to revert it.
      let cancelled = false;
      let split;
      let titleTween;

      fontsReady().then(() => {
        if (cancelled) return;
        split = SplitText.create(".nutrient-title", { type: "chars" });
        titleTween = gsap.from(split.chars, {
          yPercent: 110,
          stagger: 0.02,
          ease: "power2.out",
          scrollTrigger: { trigger: root.current, start: "top 65%" },
        });
      });

      gsap.to(".nutrition-text-scroll", {
        duration: 1,
        opacity: 1,
        clipPath: "polygon(0 0, 100% 0, 100% 100%, 0 100%)",
        ease: "power1.inOut",
        scrollTrigger: { trigger: root.current, start: "top 70%" },
      });

      gsap.from(".nutrient", {
        y: 40,
        opacity: 0,
        stagger: 0.08,
        ease: "power2.out",
        scrollTrigger: { trigger: ".nutrient-strip", start: "top 90%" },
      });

      // The note pops in rather than fading.
      gsap.from(".nutrient-note", {
        scale: 0.92,
        y: 24,
        opacity: 0,
        duration: 0.55,
        ease: "back.out(1.7)",
        scrollTrigger: { trigger: root.current, start: "top 60%" },
      });

      // Slow drift on the photograph as the section passes.
      gsap.to(".nutrition-bg", {
        yPercent: -6,
        ease: "none",
        scrollTrigger: {
          trigger: root.current,
          start: "top bottom",
          end: "bottom top",
          scrub: true,
        },
      });

      return () => {
        cancelled = true;
        if (titleTween) {
          if (titleTween.scrollTrigger) titleTween.scrollTrigger.kill();
          titleTween.kill();
        }
        if (split) split.revert();
      };
    },
    { scope: root, dependencies: [reduced] }
  );

  return (
    <section ref={root} className="nutrition-section">
      <img
        src="/images/nutrition-bg.jpg"
        alt=""
        aria-hidden="true"
        className="nutrition-bg"
      />
      <div className="nutrition-fade" aria-hidden="true" />

      <div className="relative z-10 wrap min-h-dvh flex flex-col justify-between md:pt-36 pt-28 md:pb-12 pb-10">
        <div>
          <div className="overflow-hidden">
            <h2 className="nutrient-title general-title text-ink">
              Good for you
            </h2>
          </div>

          <div className="nutrition-text-scroll inline-block border-[6px] border-cream mt-3 rotate-[-2deg]">
            <div className="bg-leaf md:px-5 px-3 md:pb-3 pb-2 pt-1">
              <p className="text-cream font-bold uppercase md:text-6xl text-3xl leading-none tracking-tight">
                Naturally
              </p>
            </div>
          </div>

          {/* Runs on as a second line of headline copy — same face and colour
              as the title above it. White was the original intent, but the
              photograph measures 0.73–0.81 luminance right here, which puts
              white at 1.29:1; navy lands at ~11:1 with nothing behind it. */}
          <p className="nutrient-note">
            Cashews carry protein, healthy fats and a spread of minerals most
            snacks simply do not — which is the whole reason we sell them.
          </p>
        </div>

        <div>
          <div className="nutrient-strip">
            {nutrients.map((n, i) => (
              <div key={n.label} className="nutrient">
                <p className="font-bold uppercase md:text-3xl text-xl tracking-tight text-ink">
                  {n.label}
                </p>
                <p className="font-paragraph text-sm text-ink/60 mt-1.5">
                  {n.note}
                </p>
                {i !== nutrients.length - 1 && <span className="spacer-border" />}
              </div>
            ))}
          </div>

          {/* Chipped so it stays legible sitting over the photograph */}
          <p className="mx-auto mt-4 w-fit bg-cream/85 rounded-full px-4 py-1.5 font-paragraph text-xs text-ink/65 text-center">
            Naturally occurring in cashew kernels. General information, not
            medical advice.
          </p>
        </div>
      </div>
    </section>
  );
};

export default NutrientSection;

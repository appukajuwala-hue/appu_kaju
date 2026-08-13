import { useRef } from "react";
import {
  gsap,
  useGSAP,
  SplitText,
  fontsReady,
  usePrefersReducedMotion,
} from "../lib/gsap";

const FIRST = "Every kernel we sell is";
const SECOND = "handpicked, graded by eye and sealed the same week";

const StorySection = () => {
  const root = useRef(null);
  const reduced = usePrefersReducedMotion();

  useGSAP(
    () => {
      if (reduced) return;

      // Dim the headline and close the wipe only once we know we can animate
      // them back open.
      gsap.set(".msg-wrapper h2", { color: "#f6efe210" });
      gsap.set(".msg-text-scroll", {
        clipPath: "polygon(0 0, 0 0, 0 100%, 0% 100%)",
      });

      // The split happens in an async callback, which resolves AFTER useGSAP's
      // cleanup has already run. Without this guard React's double-mount
      // created the tween twice and cleanup could not reach it, leaving two
      // competing ScrollTriggers on the same words.
      let cancelled = false;
      const created = [];

      fontsReady().then(() => {
        if (cancelled) return;
        const first = SplitText.create(".first-message", { type: "words" });
        const second = SplitText.create(".second-message", { type: "words" });
        created.push(first, second);

        // One tween over BOTH headings, in DOM order, on a single trigger.
        // Two separate scroll ranges used to overlap, so the second line began
        // lighting before the first had finished — words lit out of order.
        // A single stagger guarantees a strict top-to-bottom fill.
        const words = [...first.words, ...second.words];

        created.push(
          gsap.to(words, {
            color: "#f6efe2",
            ease: "none",
            stagger: 1,
            scrollTrigger: {
              trigger: ".message-content",
              start: "top 70%",
              end: "bottom 65%",
              scrub: true,
            },
          })
        );
      });

      gsap.to(".msg-text-scroll", {
        duration: 1,
        clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
        ease: "circ.inOut",
        scrollTrigger: { trigger: ".msg-text-scroll", start: "top 70%" },
      });

      return () => {
        cancelled = true;
        created.forEach((o) => {
          if (!o) return;
          if (o.scrollTrigger) o.scrollTrigger.kill();
          if (o.revert) o.revert();
          else if (o.kill) o.kill();
        });
      };
    },
    { scope: root, dependencies: [reduced] }
  );

  return (
    <section ref={root} className="message-content">
      <div className="wrap flex-center py-28 relative">
        <div className="w-full">
          <div className="msg-wrapper">
            <h2 className="first-message">{FIRST}</h2>

            <div className="msg-text-scroll">
              <div className="bg-gold md:pb-4 pb-2 pt-1 px-5">
                <p className="text-ink font-bold uppercase md:text-7xl text-4xl leading-none tracking-tight">
                  No shortcuts
                </p>
              </div>
            </div>

            <h2 className="second-message">{SECOND}</h2>
          </div>

          <div className="flex-center md:mt-24 mt-14">
            <p className="max-w-md px-6 md:text-lg">
              No artificial preservatives, no bulking, no last season&apos;s
              stock quietly repacked. Just cashew, the way we have sold it for
              nearly three decades.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default StorySection;

import { gsap, useGSAP, usePrefersReducedMotion } from "./gsap";
import { useMediaQuery } from "react-responsive";

/**
 * Pins a section and drives a track sideways as the visitor scrolls down.
 *
 * The distance is measured against the track's own scroll container, never
 * `window.innerWidth`. That distinction matters: BrandSection's track sits in a
 * flex row beside a 34%-wide title panel, so measuring against the window
 * under-shot the overflow by ~0.34 x viewport and left the last card
 * permanently stranded off the right edge.
 *
 * @param {object}  opts
 * @param {React.RefObject} opts.rootRef     section to pin
 * @param {React.RefObject} opts.trackRef    flex row that slides
 * @param {number}  [opts.trailingPad=48]    breathing room past the last card
 * @param {number}  [opts.minWidth=1024]     below this the track just stacks
 */
export const useHorizontalPin = ({
  rootRef,
  trackRef,
  trailingPad = 48,
  minWidth = 1024,
}) => {
  const reduced = usePrefersReducedMotion();
  const isWide = useMediaQuery({ query: `(min-width: ${minWidth}px)` });

  useGSAP(
    () => {
      if (!isWide || reduced || !trackRef.current || !rootRef.current) return;

      const track = trackRef.current;

      // Re-measured on every ScrollTrigger refresh, so resizing stays correct.
      const distance = () => {
        const viewport = track.parentElement;
        if (!viewport) return 0;
        return Math.max(0, track.scrollWidth - viewport.clientWidth + trailingPad);
      };

      if (distance() === 0) return;

      const tween = gsap.to(track, {
        x: () => -distance(),
        ease: "none",
        scrollTrigger: {
          trigger: rootRef.current,
          start: "top top",
          end: () => `+=${distance()}`,
          scrub: 1,
          pin: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      });

      return () => {
        if (tween.scrollTrigger) tween.scrollTrigger.kill();
        tween.kill();
        gsap.set(track, { clearProps: "x" });
      };
    },
    { scope: rootRef, dependencies: [isWide, reduced, trailingPad, minWidth] }
  );

  return { pinned: isWide && !reduced };
};

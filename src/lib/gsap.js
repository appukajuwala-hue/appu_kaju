import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger, SplitText } from "gsap/all";
import { useMediaQuery } from "react-responsive";

// Register once, here, so no component has to remember to.
// The reference project registered ScrollTrigger but never SplitText.
gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText);

export { gsap, useGSAP, ScrollTrigger, SplitText };

/**
 * True when the visitor has asked their OS to reduce motion.
 * Every scroll animation in this project is wrapped in a check on this so the
 * site degrades to a plain, readable, fully-scrollable document.
 */
export const usePrefersReducedMotion = () =>
  useMediaQuery({ query: "(prefers-reduced-motion: reduce)" });

/**
 * SplitText measures glyph boxes, so splitting before webfonts land produces
 * chars in the wrong places (the reference logged "SplitText called before
 * fonts loaded" 15x on every load). Await this first.
 */
export const fontsReady = () =>
  typeof document !== "undefined" && document.fonts
    ? document.fonts.ready
    : Promise.resolve();

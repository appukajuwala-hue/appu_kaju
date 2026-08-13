import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { ScrollTrigger } from "../lib/gsap";

/**
 * ScrollTrigger measures the document when a trigger is created. On a
 * multi-page site the next route mounts at whatever scroll offset the previous
 * one was left at, and every pin then measures against stale numbers. Jumping
 * to the top and refreshing on each navigation is what keeps pinning correct.
 */
const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });

    // Let the incoming route paint before remeasuring.
    const id = requestAnimationFrame(() => ScrollTrigger.refresh());
    return () => cancelAnimationFrame(id);
  }, [pathname]);

  return null;
};

export default ScrollToTop;

import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { ScrollTrigger } from "../lib/gsap";

/**
 * ScrollTrigger measures the document when a trigger is created. On a
 * multi-page site the next route mounts at whatever scroll offset the previous
 * one was left at, and every pin then measures against stale numbers. Jumping
 * to the top and refreshing on each navigation is what keeps pinning correct.
 *
 * Routes are lazy-loaded (see App.jsx), so this now runs while the incoming
 * page's chunk is still in flight. That is deliberate and safe: the scroll
 * reset is what has to happen immediately, and the refresh here only clears
 * triggers belonging to the route being left. The incoming page creates its
 * own triggers in useGSAP after it mounts, and GSAP measures those at creation
 * — they never depend on this call having run first.
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

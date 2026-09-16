import { useCallback, useEffect, useRef, useState } from "react";

/**
 * A <video> that does not fetch anything until it is nearly on screen.
 *
 * The three clips on this site total about 7 MB, and every one of them used to
 * start downloading the moment its page was parsed. The footer's is the worst
 * offender by far: <Footer> sits in the App-level layout, so its 2.3 MB was
 * pulled on /checkout, /terms and everywhere else, none of which ever show it
 * without a deliberate scroll to the bottom. On a phone on Indian mobile data
 * that is real money and a real wait, spent on footage most visitors never see.
 *
 * The fix is to withhold `src` rather than to set preload="none" and hope.
 * A <video> with no src has nothing to fetch, which is the only version of
 * "don't download this" that every browser agrees on — preload is famously a
 * hint, and Chrome and Safari have each ignored it.
 *
 * `rootMargin` starts the fetch before the video is actually visible, so it
 * has a head start and is usually ready by the time it scrolls into frame.
 *
 * The poster is withheld on the same signal rather than set upfront. It is
 * only 16–39 KB, but the footer's would otherwise load on every page for a
 * video three screens below the fold — and there is nothing to show early
 * anyway, since before intersection the element is off screen. Fetched
 * together, the poster wins the race by two orders of magnitude and paints
 * while the video is still streaming.
 *
 * Poster frames are NOT frame zero: harvest.mp4 fades up from black over two
 * seconds, so its first frame is a black rectangle. See the poster note in
 * README.md for the timestamps and how to regenerate them.
 *
 * WHAT THIS DELIBERATELY DOES NOT CHANGE: autoplay, looping and muting are
 * passed straight through, and nothing here pauses a video that has scrolled
 * away. VideoPinSection gives the visitor a real play/pause button, and a
 * component that silently resumed playback would be overriding a choice they
 * made. This is about when bytes are fetched, nothing else.
 */
const LazyVideo = ({ src, poster, rootMargin = "300px", ref, ...rest }) => {
  const nodeRef = useRef(null);
  const [load, setLoad] = useState(false);

  // Keeps our own handle on the element while still honouring a ref from the
  // parent — VideoPinSection needs one to drive its toggle button.
  const setRefs = useCallback(
    (node) => {
      nodeRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    },
    [ref]
  );

  useEffect(() => {
    if (load) return undefined;
    const el = nodeRef.current;
    if (!el) return undefined;

    // No IntersectionObserver (very old browsers, some embedded webviews):
    // load immediately rather than leave a permanently blank box.
    if (typeof IntersectionObserver === "undefined") {
      setLoad(true);
      return undefined;
    }

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setLoad(true);
          io.disconnect();
        }
      },
      { rootMargin }
    );

    io.observe(el);
    return () => io.disconnect();
  }, [load, rootMargin]);

  return (
    <video
      ref={setRefs}
      // Undefined until we want it: React omits the attribute entirely, so
      // there is no request at all rather than a deprioritised one.
      src={load ? src : undefined}
      poster={load ? poster : undefined}
      preload={load ? "auto" : "none"}
      {...rest}
    />
  );
};

export default LazyVideo;

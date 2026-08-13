import { useRef, useState } from "react";
import { useMediaQuery } from "react-responsive";
import { gsap, useGSAP, usePrefersReducedMotion } from "../lib/gsap";

/**
 * The reference's signature moment: the section pins and a small circular
 * window onto the footage opens out to fill the screen as you scroll.
 *
 * The ring of type and the button are not decoration — the button really
 * toggles playback, so it is a genuine control rather than a picture of one.
 */
const RING_TEXT = "HOW OUR KAJU IS MADE · HOW OUR KAJU IS MADE · ";

const VideoPinSection = () => {
  const root = useRef(null);
  const videoRef = useRef(null);
  const [playing, setPlaying] = useState(true);

  const reduced = usePrefersReducedMotion();
  const isMobile = useMediaQuery({ query: "(max-width: 768px)" });
  // On phones and for reduced motion the window is simply open from the start.
  const alwaysOpen = isMobile || reduced;

  useGSAP(
    () => {
      if (alwaysOpen) {
        gsap.set(".video-box", { clipPath: "circle(100% at 50% 50%)" });
        return;
      }

      gsap.set(".video-box", { clipPath: "circle(7% at 50% 50%)" });

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: root.current,
          start: "top top",
          end: "+=150%",
          scrub: 1.2,
          pin: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      });

      tl.to(".video-box", {
        clipPath: "circle(100% at 50% 50%)",
        ease: "power1.inOut",
      }).to(".video-badge", { opacity: 0, scale: 0.85, ease: "power1.out" }, 0.55);

      return () => tl.scrollTrigger && tl.scrollTrigger.kill();
    },
    { scope: root, dependencies: [alwaysOpen] }
  );

  const toggle = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play();
      setPlaying(true);
    } else {
      v.pause();
      setPlaying(false);
    }
  };

  return (
    <section ref={root} className="vd-pin-section">
      <div className="video-box size-full">
        <video
          ref={videoRef}
          src="/videos/harvest.mp4"
          playsInline
          muted
          loop
          autoPlay
          preload="auto"
          aria-hidden="true"
        />

        <div className="video-badge abs-center md:scale-100 scale-[1.6]">
          {/* type running around a circle */}
          <svg
            viewBox="0 0 200 200"
            className="spin-slow md:size-[15vw] size-40"
            aria-hidden="true"
          >
            <defs>
              <path
                id="kaju-ring"
                fill="none"
                d="M100,100 m-74,0 a74,74 0 1,1 148,0 a74,74 0 1,1 -148,0"
              />
            </defs>
            <text
              fill="#F6EFE2"
              fontSize="15"
              fontWeight="700"
              letterSpacing="2.2"
              style={{ fontFamily: "Antonio, sans-serif" }}
            >
              <textPath href="#kaju-ring">{RING_TEXT}</textPath>
            </text>
          </svg>

          <button
            type="button"
            onClick={toggle}
            aria-label={playing ? "Pause the video" : "Play the video"}
            className="play-btn"
          >
            {playing ? (
              <svg viewBox="0 0 24 24" className="md:size-[2.4vw] size-6" aria-hidden="true">
                <rect x="6" y="4.5" width="4" height="15" rx="1.2" fill="#F6EFE2" />
                <rect x="14" y="4.5" width="4" height="15" rx="1.2" fill="#F6EFE2" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="md:size-[2.4vw] size-6 ml-1" aria-hidden="true">
                <path d="M7 4.5 L19.5 12 L7 19.5 Z" fill="#F6EFE2" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </section>
  );
};

export default VideoPinSection;

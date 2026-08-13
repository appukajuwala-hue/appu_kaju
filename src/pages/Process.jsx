import { useRef } from "react";
import { Link } from "react-router-dom";
import Seo from "../components/Seo";
import PageHeader from "../components/PageHeader";
import ProcessCard from "../components/ProcessCard";
import { gsap, useGSAP } from "../lib/gsap";
import { useHorizontalPin } from "../lib/useHorizontalPin";
import { processSteps } from "../constants";

const Process = () => {
  const pinRoot = useRef(null);
  const trackRef = useRef(null);

  // Under lg the steps stack into a normal vertical list — no pin.
  const { pinned } = useHorizontalPin({ rootRef: pinRoot, trackRef });

  // Progress bar rides the same pinned scroll range.
  useGSAP(
    () => {
      if (!pinned || !trackRef.current) return;

      const track = trackRef.current;
      const distance = () =>
        Math.max(0, track.scrollWidth - track.parentElement.clientWidth + 48);
      if (distance() === 0) return;

      const bar = gsap.to(".process-progress", {
        scaleX: 1,
        ease: "none",
        scrollTrigger: {
          trigger: pinRoot.current,
          start: "top top",
          end: () => `+=${distance()}`,
          scrub: true,
          invalidateOnRefresh: true,
        },
      });

      return () => bar.scrollTrigger && bar.scrollTrigger.kill();
    },
    { scope: pinRoot, dependencies: [pinned] }
  );

  return (
    <div>
      <Seo
        title="Our Process — how Appu Kaju cashews are made"
        description="The ten steps from harvest to your door: drying, steaming, shelling, grading, quality control and vacuum packaging."
      />

      <PageHeader
        eyebrow="Farm to pack"
        title="How a cashew gets to you"
        lead="Ten steps between a cashew apple in the dry season and a sealed pack in your kitchen. This is all of them."
      />

      <section
        ref={pinRoot}
        className="bg-kernel/35 lg:h-dvh lg:flex lg:flex-col lg:justify-center overflow-hidden lg:py-0 py-16"
      >
        {/* desktop progress bar */}
        <div className="hidden lg:block wrap mb-10">
          <div className="h-1 w-full bg-ink/10 rounded-full overflow-hidden">
            <div className="process-progress h-full bg-royal origin-left scale-x-0 rounded-full" />
          </div>
        </div>

        {/* The track's parent is what the pin distance is measured against, so
            it must be the element that clips the overflow. */}
        <div className="lg:overflow-hidden">
          <div ref={trackRef} className="process-track lg:px-10 px-5">
            {processSteps.map((step) => (
              <ProcessCard key={step.n} step={step} />
            ))}
          </div>
        </div>
      </section>

      <section className="md:py-24 py-16">
        <div className="wrap col-center text-center">
          <h2 className="section-title text-ink max-w-2xl">
            That is why it tastes like it does
          </h2>
          <p className="font-paragraph text-ink/70 max-w-xl mt-5 leading-relaxed">
            Grading at step seven is what separates Kuber from Appu from Rimmee.
            Same care, three price points.
          </p>
          <Link to="/shop" className="btn-primary mt-9">
            See the range
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Process;

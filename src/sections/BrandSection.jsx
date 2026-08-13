import { useRef } from "react";
import { Link } from "react-router-dom";
import BrandCard from "../components/BrandCard";
import { useHorizontalPin } from "../lib/useHorizontalPin";
import { brands, products } from "../constants";

const priceFrom = (brandId) =>
  Math.min(...products.filter((p) => p.brandId === brandId).map((p) => p.price));

// Alternating tilt, kept modest so the rotated corners stay inside the
// slider viewport and nothing clips.
const ROTATIONS = [
  "lg:rotate-[-6deg]",
  "lg:rotate-[6deg]",
  "lg:rotate-[-6deg]",
];

const BrandSection = () => {
  const root = useRef(null);
  const trackRef = useRef(null);

  useHorizontalPin({ rootRef: root, trackRef });

  return (
    <section ref={root} className="brand-section">
      <div className="h-full flex lg:flex-row flex-col lg:items-center relative">
        <div className="lg:w-[30%] flex-none lg:h-dvh flex flex-col justify-center md:px-10 px-5 lg:py-0 py-16">
          <p className="eyebrow text-royal mb-4">Three grades</p>

          <h2 className="section-title text-ink">One nut,</h2>
          {/* The reference's boxed highlight word */}
          <span className="inline-block self-start bg-gold rotate-[-2deg] px-4 pb-2 pt-1 mt-2">
            <span className="section-title text-ink">three ways</span>
          </span>

          <p className="font-paragraph text-ink/70 mt-7 max-w-sm leading-relaxed">
            The same harvest, sorted by size, colour and wholeness. Where a
            kernel lands decides which of our packs it goes into — and what you
            pay for it.
          </p>
          <Link to="/shop" className="btn-primary mt-9 self-start">
            All 8 packs
          </Link>
        </div>

        <div className="slider-wrapper lg:overflow-hidden">
          <div ref={trackRef} className="brands lg:px-10 px-5">
            {brands.map((brand, i) => (
              <BrandCard
                key={brand.id}
                brand={brand}
                price={priceFrom(brand.id)}
                rotation={ROTATIONS[i % ROTATIONS.length]}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default BrandSection;

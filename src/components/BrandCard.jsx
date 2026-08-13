/**
 * A brand card in the reference's style: a tilted colour panel with the retail
 * pack breaking out past its top edge, and the grade name set large along the
 * bottom.
 *
 * The structure matters. The rotated wrapper does NOT clip, and the coloured
 * panel is deliberately shorter than the wrapper — that height difference is
 * what lets the pack stand proud of the card instead of being cut off by it.
 */
const BrandCard = ({ brand, price, rotation }) => (
  <article className={`brand-card ${rotation}`}>
    {/* Colour panel — shorter than the wrapper so the pack can rise above it */}
    <div className="brand-panel" style={{ backgroundColor: brand.accent }}>
      {/* Soft two-tone blobs, the reference's camo-ish card fill. White and
          black tints work over any of the three brand colours. */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 400 500"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <ellipse
          cx="70"
          cy="110"
          rx="150"
          ry="100"
          transform="rotate(-18 70 110)"
          fill="rgb(255 255 255 / 0.16)"
        />
        <ellipse
          cx="340"
          cy="300"
          rx="130"
          ry="165"
          transform="rotate(24 340 300)"
          fill="rgb(255 255 255 / 0.13)"
        />
        <ellipse
          cx="150"
          cy="450"
          rx="175"
          ry="105"
          transform="rotate(-8 150 450)"
          fill="rgb(0 0 0 / 0.06)"
        />
        <ellipse
          cx="300"
          cy="60"
          rx="110"
          ry="70"
          transform="rotate(14 300 60)"
          fill="rgb(0 0 0 / 0.05)"
        />
      </svg>
    </div>

    <img
      src={brand.image}
      alt={`${brand.name} retail pack`}
      loading="lazy"
      className="brand-pack"
    />

    <div className="brand-meta" style={{ color: brand.ink }}>
      <p className="eyebrow opacity-75">{brand.tier}</p>
      <h3>{brand.name}</h3>
    </div>

    <p className="brand-price" style={{ color: brand.ink }}>
      from ₹{price.toLocaleString("en-IN")}
    </p>
  </article>
);

export default BrandCard;

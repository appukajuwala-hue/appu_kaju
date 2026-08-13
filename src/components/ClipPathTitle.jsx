/**
 * A block of type that wipes into view behind a clip-path.
 * The wipe itself is driven by the parent section's timeline, which animates
 * `clipPath` and `opacity` — this component only paints the resting state.
 */
const ClipPathTitle = ({ title, color, bg, borderColor, className = "" }) => (
  <div className={`overflow-hidden ${className}`}>
    {/* Resting state is fully visible. BenefitSection hides these via gsap.set
        before painting, so the copy survives a JS failure. */}
    <div
      style={{ backgroundColor: bg, borderColor, color }}
      className="clip-title"
    >
      <h3>{title}</h3>
    </div>
  </div>
);

export default ClipPathTitle;

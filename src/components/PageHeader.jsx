/**
 * Shared masthead for every inner page, so the six routes read as one site
 * and each gets clear space under the fixed nav.
 */
const PageHeader = ({ eyebrow, title, lead }) => (
  <header className="bg-cream md:pt-40 pt-32 md:pb-20 pb-14">
    <div className="wrap">
      {eyebrow && <p className="eyebrow text-royal mb-4">{eyebrow}</p>}
      {/* Measured in characters so the display type breaks sensibly at any
          viewport now that it scales in vw. */}
      <h1 className="general-title text-ink max-w-[16ch]">{title}</h1>
      {lead && (
        <p className="font-paragraph text-ink/70 md:text-xl text-lg leading-relaxed wrap-text mt-6">
          {lead}
        </p>
      )}
    </div>
  </header>
);

export default PageHeader;

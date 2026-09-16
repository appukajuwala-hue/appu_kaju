import { useEffect } from "react";

/**
 * Adds a JSON-LD block to the document head for the life of a route.
 *
 * The organisation block is baked into index.html at build time, so it is
 * there whether or not JavaScript runs. This component is for the extra blocks
 * only some pages have — the product range on /shop — where a crawler that
 * renders JS is the audience anyway.
 *
 * Keyed by `id` so navigating away removes exactly this block and nothing
 * else: leaving /shop's product list attached to /terms would describe that
 * page as a catalogue.
 */
const JsonLd = ({ id, data }) => {
  useEffect(() => {
    if (!data) return undefined;

    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.dataset.jsonld = id;
    script.textContent = JSON.stringify(data);

    // Replace rather than append, so a fast re-render cannot leave two.
    document.head.querySelector(`script[data-jsonld="${id}"]`)?.remove();
    document.head.appendChild(script);

    return () => script.remove();
  }, [id, data]);

  return null;
};

export default JsonLd;

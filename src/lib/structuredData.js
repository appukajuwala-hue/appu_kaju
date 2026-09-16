/**
 * Schema.org JSON-LD.
 *
 * This is the machine-readable version of what the pages already say in prose:
 * that there is a real shop in Lucknow with a phone number, and that it sells
 * eight specific things at eight specific prices. It is what lets Google show
 * the shop in local results and put a price under a product listing.
 *
 * Built from src/constants/index.js rather than written out, so a price change
 * updates the markup with everything else. Imported by two places:
 *
 *   vite.config.js    injects the organisation block into index.html, so it is
 *                     present without JavaScript running.
 *   JsonLd.jsx        adds per-route blocks for pages that have more to say.
 *
 * NOTHING HERE IS INVENTED. There is deliberately no `aggregateRating`: the
 * testimonials are real Google reviews but carry no star ratings, and marking
 * up ratings that were never given is both a lie and a manual penalty from
 * Google. If the client wants review stars, the reviews have to come from a
 * source that actually has them.
 */

import { absoluteUrl, SITE_URL } from "../constants/index.js";
import { brands, company, products } from "../constants/index.js";

/** Strips undefined so optional fields vanish instead of serialising as null. */
const compact = (obj) =>
  Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined && v !== ""));

/**
 * The shop itself.
 *
 * `Store` rather than the vaguer `Organization`: there is a physical counter
 * in Lucknow that people walk into, and that is what makes it eligible for
 * local search results at all.
 */
export const organisationLd = () =>
  compact({
    "@context": "https://schema.org",
    "@type": "Store",
    "@id": `${SITE_URL}/#shop`,
    name: company.name,
    url: SITE_URL,
    image: `${SITE_URL}/images/logo.png`,
    logo: `${SITE_URL}/images/logo.png`,
    description: company.blurb,
    telephone: company.phone,
    email: company.emails[0],
    foundingDate: String(company.founded),
    priceRange: `₹${Math.min(...products.map((p) => p.price))}–₹${Math.max(
      ...products.map((p) => p.price)
    )}`,
    address: compact({
      "@type": "PostalAddress",
      streetAddress: company.postalAddress.street,
      addressLocality: company.postalAddress.locality,
      addressRegion: company.postalAddress.region,
      addressCountry: company.postalAddress.country,
    }),
    sameAs: [company.instagram, company.facebook].filter(Boolean),
  });

/** One product, as an offer. */
const productLd = (product) => {
  const brand = brands.find((b) => b.id === product.brandId);
  return compact({
    "@type": "Product",
    name: `${product.brand} — ${product.size}`,
    sku: product.id,
    description: product.description,
    image: `${SITE_URL}${product.image}`,
    brand: { "@type": "Brand", name: brand?.name || product.brand },
    offers: {
      "@type": "Offer",
      url: absoluteUrl("/shop"),
      priceCurrency: "INR",
      price: String(product.price),
      // Nothing tracks stock, so every pack is always purchasable — this
      // states exactly what the site does. It stops being true the day the
      // client wants items to sell out; see the inventory item in the runbook.
      availability: "https://schema.org/InStock",
      itemCondition: "https://schema.org/NewCondition",
      seller: { "@id": `${SITE_URL}/#shop` },
      shippingDetails: {
        "@type": "OfferShippingDetails",
        shippingRate: { "@type": "MonetaryAmount", value: "0", currency: "INR" },
        shippingDestination: {
          "@type": "DefinedRegion",
          addressCountry: "IN",
        },
      },
    },
  });
};

/** The whole range, for /shop. */
export const productListLd = () => ({
  "@context": "https://schema.org",
  "@type": "ItemList",
  name: `${company.name} cashew packs`,
  numberOfItems: products.length,
  itemListElement: products.map((product, i) => ({
    "@type": "ListItem",
    position: i + 1,
    item: productLd(product),
  })),
});

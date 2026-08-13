import { useMemo, useRef, useState } from "react";
import Seo from "../components/Seo";
import PageHeader from "../components/PageHeader";
import { gsap, useGSAP, usePrefersReducedMotion } from "../lib/gsap";
import { products, brands, productPromises, productUses } from "../constants";

const SORTS = {
  "price-asc": { label: "Price: low to high", fn: (a, b) => a.price - b.price },
  "price-desc": { label: "Price: high to low", fn: (a, b) => b.price - a.price },
  size: { label: "Pack size", fn: (a, b) => a.weightKg - b.weightKg },
};

const Shop = () => {
  const root = useRef(null);
  const reduced = usePrefersReducedMotion();
  const [brandId, setBrandId] = useState("all");
  const [sort, setSort] = useState("price-asc");

  const visible = useMemo(() => {
    const list =
      brandId === "all"
        ? [...products]
        : products.filter((p) => p.brandId === brandId);
    return list.sort(SORTS[sort].fn);
  }, [brandId, sort]);

  useGSAP(
    () => {
      if (reduced) return;
      gsap.fromTo(
        ".product-card",
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.45,
          stagger: 0.06,
          ease: "power2.out",
          overwrite: true,
        }
      );
    },
    { scope: root, dependencies: [brandId, sort, reduced] }
  );

  return (
    <div ref={root}>
      <Seo
        title="Shop — Appu Kaju cashew packs from 250g to 10kg"
        description="Eight cashew packs across three grades: Kuber, Appu and Rimmee Kaju. From ₹219 for 250g up to ₹12,000 for 10kg."
      />

      <PageHeader
        eyebrow="The range"
        title="Eight packs, three grades"
        lead="Pick the grade, then the size. Every pack is vacuum-sealed and 100% natural. Checkout happens on our main store."
      />

      {/* controls */}
      <section className="bg-cream sticky top-[4.5rem] z-30 border-y border-ink/10 py-4">
        <div className="wrap flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by grade">
            <button
              type="button"
              onClick={() => setBrandId("all")}
              aria-pressed={brandId === "all"}
              className={`font-paragraph text-xs font-semibold uppercase tracking-widest rounded-full px-5 py-2.5 border-2 transition-colors ${
                brandId === "all"
                  ? "bg-ink text-cream border-ink"
                  : "border-ink/20 text-ink hover:border-ink"
              }`}
            >
              All ({products.length})
            </button>
            {brands.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => setBrandId(b.id)}
                aria-pressed={brandId === b.id}
                className={`font-paragraph text-xs font-semibold uppercase tracking-widest rounded-full px-5 py-2.5 border-2 transition-colors ${
                  brandId === b.id
                    ? "bg-ink text-cream border-ink"
                    : "border-ink/20 text-ink hover:border-ink"
                }`}
              >
                {b.name}
              </button>
            ))}
          </div>

          <label className="font-paragraph text-xs uppercase tracking-widest text-ink/60 flex items-center gap-2">
            Sort
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="font-paragraph text-sm normal-case tracking-normal text-ink bg-cream border-2 border-ink/20 rounded-full px-4 py-2"
            >
              {Object.entries(SORTS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {/* grid */}
      <section className="md:py-20 py-14">
        <div className="wrap">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {visible.map((p) => {
              const brand = brands.find((b) => b.id === p.brandId);
              return (
                <article
                  key={p.id}
                  className="product-card group rounded-3xl border-2 border-ink/10 bg-cream overflow-hidden flex flex-col"
                >
                  <div
                    className="relative aspect-4/5 flex-center"
                    style={{ backgroundColor: `${brand.accent}26` }}
                  >
                    <img
                      src={p.image}
                      alt={`${p.brand} ${p.size} pack`}
                      loading="lazy"
                      className="h-4/5 object-contain drop-shadow-lg transition-transform duration-500 group-hover:scale-105"
                    />
                    <span
                      className="absolute top-4 left-4 font-paragraph text-[10px] font-bold uppercase tracking-widest rounded-full px-3 py-1.5"
                      style={{ backgroundColor: brand.accent, color: brand.ink }}
                    >
                      {brand.tier}
                    </span>
                  </div>

                  <div className="p-6 flex flex-col grow">
                    <h2 className="text-2xl font-bold uppercase tracking-tight text-ink">
                      {p.brand}
                    </h2>
                    <p className="font-paragraph text-ink/60 text-sm mt-1">
                      {p.size} pack
                    </p>

                    <p className="font-bold text-3xl tracking-tight text-ink mt-4">
                      ₹{p.price.toLocaleString("en-IN")}
                    </p>
                    <p className="font-paragraph text-xs text-ink/50 mt-1">
                      ₹{Math.round(p.price / p.weightKg).toLocaleString("en-IN")}{" "}
                      per kg
                    </p>

                    <a
                      href={p.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="btn-primary w-full justify-center mt-6 md:text-sm text-sm md:px-6 md:py-4"
                    >
                      Buy on our store
                    </a>
                  </div>
                </article>
              );
            })}
          </div>

          <p className="font-paragraph text-sm text-ink/50 text-center mt-10">
            Showing {visible.length} of {products.length} packs. Orders are taken
            on appukaju.com.
          </p>
        </div>
      </section>

      {/* what's in every pack */}
      <section className="bg-kernel/35 md:py-24 py-16">
        <div className="wrap grid md:grid-cols-2 gap-12">
          <div>
            <h2 className="section-title text-ink">In every pack</h2>
            <ul className="mt-7 flex flex-col gap-3">
              {productPromises.map((t) => (
                <li
                  key={t}
                  className="font-paragraph text-ink/80 flex items-start gap-3"
                >
                  <span className="mt-2 size-2 rounded-full bg-gold flex-none" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="section-title text-ink">How to use them</h2>
            <ul className="mt-7 flex flex-col gap-3">
              {productUses.map((t) => (
                <li
                  key={t}
                  className="font-paragraph text-ink/80 flex items-start gap-3"
                >
                  <span className="mt-2 size-2 rounded-full bg-royal flex-none" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Shop;

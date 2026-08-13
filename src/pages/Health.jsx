import Seo from "../components/Seo";
import PageHeader from "../components/PageHeader";
import HealthStack from "../sections/HealthStack";
import { skinBenefits, nutrients } from "../constants";

const Health = () => {
  return (
    <div>
      <Seo
        title="Health Advantages — why cashews are worth eating"
        description="What cashews offer children, adults and older adults: protein, magnesium, monounsaturated fats, vitamin E, copper and zinc."
      />

      <PageHeader
        eyebrow="Health advantages"
        title="A snack that gives something back"
        lead="Cashews carry protein, healthy fats and a spread of minerals. What that means depends on who is eating them."
      />

      {/* Giant headline with the fan of benefit cards rising over it —
          replaces the old tab UI, which carried the same content. */}
      <HealthStack />

      {/* nutrients */}
      <section className="bg-kernel/35 md:py-24 py-16">
        <div className="wrap">
          <h2 className="section-title text-ink text-center">
            What is naturally in there
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 md:mt-14 mt-9">
            {nutrients.map((n) => (
              <div
                key={n.label}
                className="rounded-2xl bg-cream border-2 border-ink/10 p-6 text-center"
              >
                <p className="font-bold uppercase md:text-2xl text-xl tracking-tight text-ink">
                  {n.label}
                </p>
                <p className="font-paragraph text-sm text-ink/60 mt-2">
                  {n.note}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* skin */}
      <section className="md:py-24 py-16">
        <div className="wrap">
          <div className="max-w-2xl">
            <p className="eyebrow text-royal mb-4">And for your skin</p>
            <h2 className="section-title text-ink">
              The nutrients your skin rebuilds with
            </h2>
          </div>

          <div className="grid md:grid-cols-2 2xl:grid-cols-4 gap-6 md:mt-14 mt-9">
            {skinBenefits.map((s) => (
              <article
                key={s.title}
                className="rounded-3xl border-2 border-ink/10 bg-cream p-8"
              >
                <h3 className="text-2xl font-bold uppercase tracking-tight text-ink">
                  {s.title}
                </h3>
                <p className="font-paragraph text-ink/75 leading-relaxed mt-3">
                  {s.detail}
                </p>
              </article>
            ))}
          </div>

          <p className="font-paragraph text-sm text-ink/50 mt-10 max-w-2xl">
            This page is general information about cashew nutrition, not medical
            advice. If you have a nut allergy or a specific health condition,
            speak to a doctor before changing your diet.
          </p>
        </div>
      </section>
    </div>
  );
};

export default Health;

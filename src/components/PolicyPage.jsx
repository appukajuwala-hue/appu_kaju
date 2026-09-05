import Seo from "./Seo";
import PageHeader from "./PageHeader";

/**
 * Shell for the four legal pages.
 *
 * Razorpay will not activate a live account without published terms, privacy,
 * refund and shipping policies, and they have to look like part of the site
 * rather than pasted boilerplate. Element styling lives in `.policy-prose`
 * (src/index.css) so each page stays readable as prose.
 */
const PolicyPage = ({ title, seoTitle, description, lead, updated, children }) => (
  <div>
    <Seo title={seoTitle} description={description} />
    <PageHeader eyebrow="Legal" title={title} lead={lead} />

    <section className="md:pb-24 pb-16">
      <div className="wrap max-w-3xl policy-prose">
        <p className="policy-updated">Last updated {updated}</p>
        {children}
      </div>
    </section>
  </div>
);

export default PolicyPage;

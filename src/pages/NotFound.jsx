import { Link } from "react-router-dom";
import Seo from "../components/Seo";

const NotFound = () => (
  <section className="min-h-dvh flex-center bg-cream px-5">
    <Seo title="Page not found — Appu Kaju" />
    <div className="col-center text-center">
      <p className="general-title text-royal/25">404</p>
      <h1 className="section-title text-ink mt-2">
        That page has been shelled
      </h1>
      <p className="font-paragraph text-ink/70 max-w-md mt-4">
        We could not find what you were looking for. The cashews, however, are
        exactly where we left them.
      </p>
      <div className="flex flex-wrap justify-center gap-4 mt-9">
        <Link to="/" className="btn-primary">
          Back home
        </Link>
        <Link to="/shop" className="btn-ghost text-ink hover:bg-ink hover:text-cream">
          See the range
        </Link>
      </div>
    </div>
  </section>
);

export default NotFound;

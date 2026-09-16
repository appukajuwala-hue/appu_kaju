import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { absoluteUrl, SITE_URL } from "../constants";

/**
 * Per-route document head management.
 *
 * A router-driven site otherwise keeps index.html's title, description and
 * canonical on every page, which is wrong for sharing and actively harmful for
 * search — thirteen routes all claiming to be the same page.
 *
 * Three kinds of tag are managed here:
 *
 *   title / description   what a search result shows.
 *   canonical / og:url    which url this page *is*. Absolute, always: a
 *                         relative canonical is ignored, and a relative
 *                         og:image is why link previews render blank.
 *   robots                keeps /checkout and /order/:id out of the index.
 *                         Those pages are either empty (the cart redirect) or
 *                         private to one customer, so there is nothing there
 *                         worth indexing and something worth not indexing.
 *
 * Tags are updated in place rather than appended, so navigating between routes
 * never leaves two descriptions in the head.
 */

const OG_IMAGE = `${SITE_URL}/images/logo.png`;

/** Finds a managed meta tag, creating it the first time it is needed. */
const meta = (attr, value) => {
  let tag = document.head.querySelector(`meta[${attr}="${value}"]`);
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute(attr, value);
    document.head.appendChild(tag);
  }
  return tag;
};

const setMeta = (attr, value, content) => {
  if (!content) return;
  meta(attr, value).setAttribute("content", content);
};

const Seo = ({ title, description, noindex = false }) => {
  const { pathname } = useLocation();

  useEffect(() => {
    const url = absoluteUrl(pathname);

    if (title) {
      document.title = title;
      setMeta("property", "og:title", title);
      setMeta("name", "twitter:title", title);
    }

    if (description) {
      setMeta("name", "description", description);
      setMeta("property", "og:description", description);
      setMeta("name", "twitter:description", description);
    }

    setMeta("property", "og:url", url);
    setMeta("property", "og:image", OG_IMAGE);
    setMeta("name", "twitter:image", OG_IMAGE);

    // Canonical is a <link>, not a <meta>, so it is handled separately.
    let canonical = document.head.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", url);

    // Present only while it applies: leaving a stale `noindex` behind after
    // navigating away from /checkout would quietly deindex the whole site.
    const robots = document.head.querySelector('meta[name="robots"]');
    if (noindex) {
      meta("name", "robots").setAttribute("content", "noindex, nofollow");
    } else if (robots) {
      robots.remove();
    }
  }, [title, description, noindex, pathname]);

  return null;
};

export default Seo;

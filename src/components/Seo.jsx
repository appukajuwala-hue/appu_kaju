import { useEffect } from "react";

/**
 * Minimal per-route document head management. A router-driven site otherwise
 * keeps the index.html title on every page, which is bad for sharing and SEO.
 */
const Seo = ({ title, description }) => {
  useEffect(() => {
    if (title) document.title = title;

    if (description) {
      let tag = document.querySelector('meta[name="description"]');
      if (!tag) {
        tag = document.createElement("meta");
        tag.setAttribute("name", "description");
        document.head.appendChild(tag);
      }
      tag.setAttribute("content", description);
    }
  }, [title, description]);

  return null;
};

export default Seo;

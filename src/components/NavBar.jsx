import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { navLinks, company } from "../constants";

const NavBar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the mobile menu whenever the route changes.
  useEffect(() => setOpen(false), [pathname]);

  // Lock body scroll while the mobile menu is open.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header
      className={`fixed top-0 left-0 z-50 w-full transition-colors duration-300 ${
        scrolled || open
          ? "bg-cream/95 backdrop-blur-md shadow-sm"
          : "bg-transparent"
      }`}
    >
      <nav className="w-full flex items-center justify-between md:px-9 px-4 md:py-5 py-3">
        <NavLink
          to="/"
          className="flex items-center gap-3"
          aria-label={`${company.name} — home`}
        >
          <img
            src="/images/logo.png"
            alt=""
            className="md:size-14 size-11"
            width="330"
            height="330"
          />
          <span className="text-ink font-bold uppercase leading-none md:text-2xl text-xl tracking-tight">
            Appu&nbsp;Kaju
          </span>
        </NavLink>

        {/* desktop */}
        <ul className="hidden md:flex items-center gap-9 text-ink">
          {navLinks.map((link) => (
            <li key={link.to}>
              <NavLink
                to={link.to}
                end={link.to === "/"}
                className={({ isActive }) =>
                  `nav-link ${isActive ? "is-active" : ""}`
                }
              >
                {link.label}
              </NavLink>
            </li>
          ))}
        </ul>

        <a
          href={company.storeUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="hidden md:inline-flex bg-ink text-cream font-paragraph text-xs font-semibold uppercase tracking-widest rounded-full px-6 py-3 hover:bg-royal transition-colors"
        >
          Order now
        </a>

        {/* mobile toggle */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? "Close menu" : "Open menu"}
          className="md:hidden relative z-50 flex flex-col justify-center gap-1.5 size-11 items-center text-ink"
        >
          <span
            className={`block h-0.5 w-6 bg-current transition-transform ${
              open ? "translate-y-2 rotate-45" : ""
            }`}
          />
          <span
            className={`block h-0.5 w-6 bg-current transition-opacity ${
              open ? "opacity-0" : ""
            }`}
          />
          <span
            className={`block h-0.5 w-6 bg-current transition-transform ${
              open ? "-translate-y-2 -rotate-45" : ""
            }`}
          />
        </button>
      </nav>

      {/* mobile drawer */}
      <div
        id="mobile-menu"
        hidden={!open}
        className="md:hidden bg-cream border-t border-ink/10"
      >
        <ul className="w-full md:px-9 px-4 flex flex-col py-4">
          {navLinks.map((link) => (
            <li key={link.to}>
              <NavLink
                to={link.to}
                end={link.to === "/"}
                className={({ isActive }) =>
                  `block py-4 font-paragraph text-lg font-semibold uppercase tracking-wide border-b border-ink/10 ${
                    isActive ? "text-royal" : "text-ink"
                  }`
                }
              >
                {link.label}
              </NavLink>
            </li>
          ))}
          <li>
            <a
              href={company.storeUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="mt-5 btn-primary w-full justify-center"
            >
              Order now
            </a>
          </li>
        </ul>
      </div>
    </header>
  );
};

export default NavBar;

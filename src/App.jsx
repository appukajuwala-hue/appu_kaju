import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";

import NavBar from "./components/NavBar";
import Footer from "./components/Footer";
import ScrollToTop from "./components/ScrollToTop";
import CartDrawer from "./components/CartDrawer";
import { CartProvider } from "./cart/CartContext";

/**
 * Routes are split per page.
 *
 * Home stays a static import: it is where almost everyone arrives, and making
 * the commonest landing wait an extra round trip to speed up /terms is a bad
 * trade. Everything else is fetched on navigation.
 *
 * Note what this does NOT solve. GSAP is imported by ScrollToTop and
 * CartDrawer, both of which live in the shell below and mount on every route,
 * so it stays in the entry chunk regardless. Splitting pages out is worth
 * doing, but the big dependency is structural and would need those two
 * components reworked to move it.
 */
import Home from "./pages/Home";

const About = lazy(() => import("./pages/About"));
const Shop = lazy(() => import("./pages/Shop"));
const Process = lazy(() => import("./pages/Process"));
const Health = lazy(() => import("./pages/Health"));
const Contact = lazy(() => import("./pages/Contact"));
const Checkout = lazy(() => import("./pages/Checkout"));
const OrderConfirmation = lazy(() => import("./pages/OrderConfirmation"));
const Terms = lazy(() => import("./pages/Terms"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Refunds = lazy(() => import("./pages/Refunds"));
const Shipping = lazy(() => import("./pages/Shipping"));
const NotFound = lazy(() => import("./pages/NotFound"));

const App = () => (
  <CartProvider>
    <ScrollToTop />
    {/* First thing in the tab order, and invisible until it has focus. The
        navigation is six links plus a cart button, and a keyboard or screen
        reader user should not have to walk all of them on every page to reach
        the content. */}
    <a href="#main" className="skip-link">
      Skip to content
    </a>
    <NavBar />
    <CartDrawer />
    {/* tabIndex -1 so the jump actually moves focus rather than only scrolling
        — without it, the next Tab press lands back at the top of the nav. */}
    <main id="main" tabIndex={-1}>
      {/* No spinner. Chunks are small and same-origin, so on any real
          connection this resolves within a frame or two; a spinner that
          flashes for 40ms reads as jank, not as progress. The min-height
          holds the footer down so the page does not jump as it lands. */}
      <Suspense fallback={<div className="min-h-screen" aria-busy="true" />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/process" element={<Process />} />
          <Route path="/health" element={<Health />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/order/:orderId" element={<OrderConfirmation />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/refunds" element={<Refunds />} />
          <Route path="/shipping" element={<Shipping />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </main>
    <Footer />
  </CartProvider>
);

export default App;

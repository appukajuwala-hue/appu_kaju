import { Routes, Route } from "react-router-dom";

import NavBar from "./components/NavBar";
import Footer from "./components/Footer";
import ScrollToTop from "./components/ScrollToTop";
import CartDrawer from "./components/CartDrawer";
import { CartProvider } from "./cart/CartContext";

import Home from "./pages/Home";
import About from "./pages/About";
import Shop from "./pages/Shop";
import Process from "./pages/Process";
import Health from "./pages/Health";
import Contact from "./pages/Contact";
import Checkout from "./pages/Checkout";
import OrderConfirmation from "./pages/OrderConfirmation";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Refunds from "./pages/Refunds";
import Shipping from "./pages/Shipping";
import NotFound from "./pages/NotFound";

const App = () => (
  <CartProvider>
    <ScrollToTop />
    <NavBar />
    <CartDrawer />
    <main id="main">
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
    </main>
    <Footer />
  </CartProvider>
);

export default App;

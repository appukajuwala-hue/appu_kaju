import Seo from "../components/Seo";
import HeroSection from "../sections/HeroSection";
import StorySection from "../sections/StorySection";
import BrandSection from "../sections/BrandSection";
import NutrientSection from "../sections/NutrientSection";
import BenefitSection from "../sections/BenefitSection";
import HealthStack from "../sections/HealthStack";
import TestimonialSection from "../sections/TestimonialSection";

const Home = () => (
  <>
    <Seo
      title="Appu Kaju — Finest Cashew Nuts in India Since 1998"
      description="Handpicked, vacuum-sealed, 100% natural cashews from our Andhra Pradesh factory. Appu, Kuber and Rimmee Kaju in 250g, 1kg and 10kg packs."
    />
    <HeroSection />
    <StorySection />
    <BrandSection />
    <NutrientSection />
    <BenefitSection />
    <HealthStack />
    <TestimonialSection />
  </>
);

export default Home;

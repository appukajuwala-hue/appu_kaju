// Single source of truth for all site content.
// Product range, pricing and company details as of 2026-08.

export const company = {
  name: "Appu Kaju",
  founded: 1998,
  tagline: "Finest Cashews",
  subTagline: "Since 1998",
  blurb:
    "Handpicked from India's finest farms, processed with care and sealed the same week — cashews the way they were meant to taste.",
  mission:
    "Provide the highest quality cashew nuts that embody health, flavor, and satisfaction.",
  vision:
    "To become India's leading cashew brand, recognised for quality and innovation while promoting healthier lifestyles for generations to come.",
  factory: "Andhra Pradesh",
  shopAddress: "L.D.A Shop No. 1, City Station Road, Subhash Marg, Lucknow",
  phone: "+91 9616224108",
  phoneHref: "tel:+919616224108",
  emails: ["appukaju@gmail.com", "appukajuwala@gmail.com"],
  facebook: "https://www.facebook.com/people/AppuKaju/61557383272183/",
  instagram: "https://www.instagram.com/appukaju.in/",
  mapQuery: "L.D.A Shop No 1, City Station Road, Subhash Marg, Lucknow",
};

export const navLinks = [
  { label: "Home", to: "/" },
  { label: "About", to: "/about" },
  { label: "Shop", to: "/shop" },
  { label: "Process", to: "/process" },
  { label: "Health", to: "/health" },
  { label: "Contact", to: "/contact" },
];

// Footer-only. Kept out of navLinks so the main nav stays six items, but these
// must be reachable from every page — Razorpay requires them published before
// it will activate a live merchant account.
export const legalLinks = [
  { label: "Terms & conditions", to: "/terms" },
  { label: "Privacy policy", to: "/privacy" },
  { label: "Refunds & cancellations", to: "/refunds" },
  { label: "Shipping policy", to: "/shipping" },
];

export const stats = [
  { value: 1998, label: "Serving India since", format: "plain" },
  { value: 8, label: "Pack sizes in the range", suffix: "" },
  { value: 100, label: "Natural, no preservatives", suffix: "%" },
  { value: 3, label: "Signature grades" },
];

// ---------------------------------------------------------------------------
// Products — 8 live SKUs across 3 sub-brands.
// ---------------------------------------------------------------------------

export const brands = [
  {
    id: "kuber",
    name: "Kuber Kaju",
    tier: "Everyday",
    color: "sky",
    accent: "#7FD0E0",
    ink: "#0E2A4E",
    image: "/images/kuber-kaju.png",
    blurb:
      "Our everyday grade. Wholesome, evenly roasted kernels that make sense by the kilo — for kitchens, mithai counters and families that get through a lot of kaju.",
  },
  {
    id: "appu",
    name: "Appu Kaju",
    tier: "Signature",
    color: "royal",
    accent: "#1B6CB5",
    ink: "#F6EFE2",
    image: "/images/appu-kaju.png",
    blurb:
      "The grade the shop was built on. Whole white kernels, hand-sorted for size and colour, the balance of price and quality we have sold since 1998.",
  },
  {
    id: "rimmee",
    name: "Rimmee Kaju",
    tier: "Premium",
    color: "navy",
    accent: "#12386E",
    ink: "#F6EFE2",
    image: "/images/rimmee-kaju.png",
    blurb:
      "Our top selection. The largest, palest, most uniform kernels of the harvest — the tin you take to someone's house at Diwali.",
  },
];

export const products = [
  {
    id: "kuber-250",
    brandId: "kuber",
    brand: "Kuber Kaju",
    size: "250 g",
    weightKg: 0.25,
    price: 219,
    image: "/images/kuber-kaju.png",
    description:
      "A 250 g pouch of our everyday grade — evenly roasted whole kernels. The size to keep in the kitchen for cooking, garnishing and snacking through the week.",
  },
  {
    id: "kuber-10kg",
    brandId: "kuber",
    brand: "Kuber Kaju",
    size: "10 kg",
    weightKg: 10,
    price: 8760,
    image: "/images/kuber-kaju.png",
    description:
      "Ten kilos of our everyday grade, packed for kitchens that get through kaju by the sack — mithai counters, caterers and restaurant prep.",
  },
  {
    id: "appu-250",
    brandId: "appu",
    brand: "Appu Kaju",
    size: "250 g",
    weightKg: 0.25,
    price: 243,
    image: "/images/appu-kaju.png",
    description:
      "Our signature grade in a 250 g pouch. Whole white kernels, hand-sorted for size and colour — the pack to start with if you are new to us.",
  },
  {
    id: "appu-1kg",
    brandId: "appu",
    brand: "Appu Kaju",
    size: "1 kg",
    weightKg: 1,
    price: 972,
    image: "/images/appu-kaju.png",
    description:
      "A full kilo of the grade the shop was built on. Enough for a month of family cooking, and the size most of our regulars reorder.",
  },
  {
    id: "appu-10kg",
    brandId: "appu",
    brand: "Appu Kaju",
    size: "10 kg",
    weightKg: 10,
    price: 9720,
    image: "/images/appu-kaju.png",
    description:
      "Bulk signature grade for shops and commercial kitchens — the same hand-sorted kernels as the retail pouch, vacuum-sealed in a 10 kg carton.",
  },
  {
    id: "rimmee-250",
    brandId: "rimmee",
    brand: "Rimmee Kaju",
    size: "250 g",
    weightKg: 0.25,
    price: 300,
    image: "/images/rimmee-kaju.png",
    description:
      "Our top selection in a 250 g pouch: the largest, palest, most uniform kernels of the harvest. The one to take to someone's house.",
  },
  {
    id: "rimmee-1kg",
    brandId: "rimmee",
    brand: "Rimmee Kaju",
    size: "1 kg",
    weightKg: 1,
    price: 1200,
    image: "/images/rimmee-kaju.png",
    description:
      "A kilo of premium grade, sized for festival gifting and for households that want the best on the table at Diwali.",
  },
  {
    id: "rimmee-10kg",
    brandId: "rimmee",
    brand: "Rimmee Kaju",
    size: "10 kg",
    weightKg: 10,
    price: 12000,
    image: "/images/rimmee-kaju-10kg.png",
    description:
      "Ten kilos of our finest grade, for premium retailers and gifting operations that need volume without dropping the standard.",
  },
];

export const productPromises = [
  "100% natural — no artificial preservatives",
  "Handpicked and hand-sorted kernels",
  "Vacuum-sealed for freshness",
  "Recyclable, eco-friendly packaging",
];

export const productUses = [
  "Straight from the pack",
  "Curries and stir-fries",
  "Baking and desserts",
  "Garnish and mithai",
];

// ---------------------------------------------------------------------------
// The 10-step process
// ---------------------------------------------------------------------------

export const processSteps = [
  {
    n: "01",
    title: "Harvesting",
    detail:
      "Cashew nuts are harvested by hand from the cashew apple during the dry season, picked only once the fruit has properly ripened.",
  },
  {
    n: "02",
    title: "Sun Drying",
    detail:
      "Raw nuts are sun-dried for two to three days down to 8–10% moisture — enough to stop mould forming and to make them safe to store.",
  },
  {
    n: "03",
    title: "Steaming",
    detail:
      "The nuts are steamed to soften the hard outer shell so it can be opened without splitting the kernel inside.",
  },
  {
    n: "04",
    title: "Shelling",
    detail:
      "Softened shells are cracked with specialised tools and the edible kernel is drawn out whole — the step that decides how much of a batch stays intact.",
  },
  {
    n: "05",
    title: "Kernel Drying",
    detail:
      "Kernels go back to dry a second time, down to 3–4% moisture. This is what gives the cashew its shelf life and its snap.",
  },
  {
    n: "06",
    title: "Husk Removal",
    detail:
      "Once cooled, the thin silken testa clinging to each kernel is peeled away to reveal the pale ivory nut.",
  },
  {
    n: "07",
    title: "Grading & Sorting",
    detail:
      "Kernels are graded by size, colour and wholeness so every pack is uniform — this is where Kuber, Appu and Rimmee part ways.",
  },
  {
    n: "08",
    title: "Quality Control",
    detail:
      "Moisture and integrity checks run on every lot. Only kernels that clear them carry our name.",
  },
  {
    n: "09",
    title: "Vacuum Packaging",
    detail:
      "Cleared kernels are vacuum-sealed in bags or cartons that keep moisture, air and handling damage out.",
  },
  {
    n: "10",
    title: "Distribution",
    detail:
      "Sealed stock leaves our Andhra Pradesh factory for our Lucknow shop, for retailers, and for doorsteps across India.",
  },
];

// ---------------------------------------------------------------------------
// Health
// ---------------------------------------------------------------------------

export const nutrients = [
  { label: "Protein", note: "Builds and repairs" },
  { label: "Magnesium", note: "Bone strength" },
  { label: "Copper", note: "Collagen support" },
  { label: "Zinc", note: "Immunity" },
  { label: "Vitamin E", note: "Antioxidant" },
];

export const healthGroups = [
  {
    id: "children",
    label: "Children & Teens",
    headline: "Fuel for growing years",
    points: [
      "Rich in protein, healthy fats and essential vitamins and minerals.",
      "Magnesium and vitamin K support developing bone density.",
      "B vitamins and antioxidants support cognitive function.",
      "Copper and zinc aid collagen production for healthy skin.",
    ],
  },
  {
    id: "adults",
    label: "Adults",
    headline: "Everyday balance",
    points: [
      "Monounsaturated fats help lower bad cholesterol levels.",
      "Fibre and protein promote satiety, helping with weight management.",
      "May improve insulin sensitivity and blood sugar regulation.",
      "Vitamin E supports moisture retention and skin healing.",
    ],
  },
  {
    id: "seniors",
    label: "Older Adults",
    headline: "Support that lasts",
    points: [
      "High magnesium content supports bone health and may ease osteoarthritis.",
      "Vitamin E and antioxidants help protect cognitive function.",
      "Fibre promotes healthy digestion.",
      "Nutrients that help maintain collagen and reduce age spots.",
    ],
  },
];

export const skinBenefits = [
  { title: "Copper & Zinc", detail: "Support the collagen your skin rebuilds with." },
  { title: "Vitamin E", detail: "Antioxidant protection with anti-ageing properties." },
  { title: "Healthy Fats", detail: "Help skin hold on to its own moisture." },
  {
    title: "Proanthocyanidins",
    detail: "The antioxidant group cashews are naturally rich in.",
  },
];

// ---------------------------------------------------------------------------
// Benefits shown as clip-path titles on the home page
// ---------------------------------------------------------------------------

export const benefitTitles = [
  { title: "Handpicked", bg: "#F2B705", color: "#0E2A4E" },
  { title: "100% Natural", bg: "#F6EFE2", color: "#0E2A4E" },
  { title: "Vacuum Sealed", bg: "#1B6CB5", color: "#F6EFE2" },
  { title: "Since 1998", bg: "#D32027", color: "#F6EFE2" },
];

// ---------------------------------------------------------------------------
// Testimonials — customer reviews left on Google (2024)
// ---------------------------------------------------------------------------

export const testimonials = [
  {
    name: "Verified buyer",
    source: "Google review, 2024",
    quote:
      "The quality is genuinely better than what we get locally. Big, clean kernels and nothing broken in the pack.",
  },
  {
    name: "Verified buyer",
    source: "Google review, 2024",
    quote:
      "Ordered the 1 kg for Diwali gifting. Fresh, crunchy and the taste is exactly what you want from good kaju.",
  },
  {
    name: "Verified buyer",
    source: "Google review, 2024",
    quote:
      "Affordable for the grade you get. I have been buying from their Lucknow shop for years and it has never dropped off.",
  },
  {
    name: "Verified buyer",
    source: "Google review, 2024",
    quote:
      "Packing was airtight and it reached us in perfect condition. Will be reordering the 10 kg for the shop.",
  },
];

export const values = [
  {
    title: "Quality first",
    detail:
      "Every kernel is handpicked, processed with care and kept 100% natural — no artificial preservatives, ever.",
  },
  {
    title: "Customer delight",
    detail:
      "100% customer satisfaction is the promise we have traded on since 1998, in the shop and online.",
  },
  {
    title: "Sustainable practice",
    detail:
      "Direct sourcing from farms we know, and recyclable packaging that does not outlive what is inside it.",
  },
  {
    title: "Heritage",
    detail:
      "Nearly three decades of doing one thing properly, from our Andhra Pradesh factory to your kitchen.",
  },
];

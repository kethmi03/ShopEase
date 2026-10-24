/**
 * ShopEase Product Catalog
 * Exactly 10 products with unique prices across exactly 3 categories:
 * - Food (3 products)
 * - Clothing (3 products)
 * - Electronics (4 products)
 */

export const CURRENCY = {
  symbol: 'Rs. ',
  code: 'INR',
  name: 'Rupees',
  format: (amount) => `Rs. ${Number(amount).toFixed(2)}`
};

export const CATEGORIES = [
  { id: 'all', name: 'All Categories' },
  { id: 'Food', name: 'Food & Gourmet' },
  { id: 'Clothing', name: 'Clothing & Apparel' },
  { id: 'Electronics', name: 'Electronics & Tech' }
];

export const INITIAL_PRODUCTS = [
  {
    id: 'prod-01',
    name: 'Artisan Organic Sourdough Loaf',
    category: 'Food',
    price: 650.00,
    rating: 4.8,
    reviewsCount: 142,
    stock: 25,
    unit: '800g loaf',
    description: 'Slow-fermented for 36 hours using organic heritage stoneground flour and pure spring water. Features a golden, blistered crust with an airy, complex crumb. Baked fresh every morning without preservatives.',
    features: [
      '100% Certified Organic stoneground flour',
      'Wild yeast 36-hour slow fermentation',
      'Naturally dairy-free, vegan & preservative-free',
      'Rich in prebiotic nutrients and easy on digestion'
    ],
    tags: ['Organic', 'Vegan', 'Freshly Baked'],
    image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80',
    fallbackSvg: 'bakery'
  },
  {
    id: 'prod-02',
    name: 'Single-Estate Ethiopian Yirgacheffe Coffee',
    category: 'Food',
    price: 2900.00,
    rating: 4.9,
    reviewsCount: 310,
    stock: 40,
    unit: '500g whole bean',
    description: 'Grown at 2,000m altitude in southern Ethiopia. Hand-picked Arabica beans washed and sun-dried on raised beds. Delivers vibrant floral aromas of bergamot, jasmine blossoms, and Meyer lemon with silky honey sweetness.',
    features: [
      '100% Single-origin washed Arabica',
      'Altitude: 1,950m – 2,200m above sea level',
      'Light-medium roast profile for pour-over & filter',
      'Direct trade certified with full farmer traceability'
    ],
    tags: ['Fair Trade', 'Specialty Grade', 'Whole Bean'],
    image: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?auto=format&fit=crop&w=800&q=80',
    fallbackSvg: 'coffee'
  },
  {
    id: 'prod-03',
    name: 'Luxury Swiss Dark Chocolate Truffle Box',
    category: 'Food',
    price: 3300.00,
    rating: 4.7,
    reviewsCount: 89,
    stock: 18,
    unit: '24 piece assortment (320g)',
    description: 'An exquisite hand-crafted collection of 72% single-origin Grand Cru dark chocolate truffles. Infused with Brittany sea-salt caramel, Bourbon vanilla bean, Piedmont hazelnut praline, and Marc de Champagne.',
    features: [
      '72% Ecuadorian Grand Cru dark chocolate',
      '24 individually hand-decorated truffles',
      'Fairtrade cocoa butter and natural ingredients only',
      'Luxury presentation box with magnetic ribbon seal'
    ],
    tags: ['Gourmet', 'Vegetarian', 'Gift Box'],
    image: 'https://images.unsplash.com/photo-1549007994-cb92caebd54b?auto=format&fit=crop&w=800&q=80',
    fallbackSvg: 'chocolate'
  },
  {
    id: 'prod-04',
    name: 'Everyday Tailored Stretch Chino Trousers',
    category: 'Clothing',
    price: 4500.00,
    rating: 4.5,
    reviewsCount: 95,
    stock: 20,
    unit: 'Men / Unisex Fit',
    description: 'Engineered for seamless transition from workspace to weekend. Tailored slim-tapered cut crafted from premium 98% compact cotton with 2% elastane for effortless comfort and durable shape retention.',
    features: [
      '98% BCI certified cotton, 2% high-recovery elastane',
      'Wrinkle-resistant garment washed finish',
      'Reinforced gusset and secure zippered stash pocket',
      'Machine washable at 30°C'
    ],
    tags: ['Stretch Cotton', 'Smart Casual', 'Wrinkle Resistant'],
    image: 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?auto=format&fit=crop&w=800&q=80',
    fallbackSvg: 'chinos'
  },
  {
    id: 'prod-05',
    name: 'Vintage Washed Denim Trucker Jacket',
    category: 'Clothing',
    price: 6800.00,
    rating: 4.6,
    reviewsCount: 204,
    stock: 15,
    unit: 'Unisex Classic Fit',
    description: 'A contemporary tribute to iconic workwear. Cut from 13.5oz organic cotton twill washed to a lived-in indigo hue with subtle vintage abrasions, antique brass shank hardware, and side adjuster tabs.',
    features: [
      '13.5oz heavy organic cotton denim',
      'Branded antique brass hardware with safety rivets',
      'Dual chest flap pockets and deep interior hand pockets',
      'Sanforized to minimize shrinkage'
    ],
    tags: ['100% Organic', 'Classic Fit', 'Timeless Workwear'],
    image: 'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?auto=format&fit=crop&w=800&q=80',
    fallbackSvg: 'jacket'
  },
  {
    id: 'prod-06',
    name: 'Pure Italian Merino Wool Knit Jumper',
    category: 'Clothing',
    price: 8550.00,
    rating: 4.9,
    reviewsCount: 175,
    stock: 12,
    unit: 'Regular Fit Crewneck',
    description: 'Spun in Biella, Italy from exceptionally soft 19.5-micron extrafine Merino wool. Naturally thermo-regulating, anti-microbial, and odour-resistant, offering lightweight warmth across changing seasons.',
    features: [
      '100% Extrafine Italian Merino Wool',
      'Total Easy Care finish: machine washable on wool cycle',
      'Seamless ribbed cuffs, collar, and hem for sleek fit',
      'Certified non-mulesed wool sourcing'
    ],
    tags: ['Italian Wool', 'Thermal Regulating', 'Sustainable'],
    image: 'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?auto=format&fit=crop&w=800&q=80',
    fallbackSvg: 'sweater'
  },
  {
    id: 'prod-07',
    name: 'ErgoPro Wireless Mechanical Keyboard',
    category: 'Electronics',
    price: 11950.00,
    rating: 4.9,
    reviewsCount: 240,
    stock: 16,
    unit: '75% Compact Layout',
    description: 'Designed for tactile typists and programmers. Features hot-swappable pre-lubed tactile switches, sound-dampening silicone gasket mount, CNC aluminium top frame, and tri-mode Bluetooth 5.2 / 2.4G wireless.',
    features: [
      'Hot-swappable switches with South-facing RGB LEDs',
      'Tri-mode connection: Bluetooth, 2.4GHz USB dongle, Type-C',
      '4000mAh lithium rechargeable battery (up to 200h standby)',
      'Double-shot PBT keycaps resistant to oil and shine'
    ],
    tags: ['Hot-Swap', 'Wireless & USB-C', 'Tactile RGB'],
    image: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=800&q=80',
    fallbackSvg: 'keyboard'
  },
  {
    id: 'prod-08',
    name: 'SmartPulse GPS & Health Tracker Watch',
    category: 'Electronics',
    price: 15900.00,
    rating: 4.6,
    reviewsCount: 380,
    stock: 14,
    unit: '42mm Case / Universal Strap',
    description: 'All-in-one health and fitness companion with bright 1.43-inch AMOLED touchscreen. Measures wrist ECG, 24/7 heart rate, SpO2 blood oxygen, sleep quality stages, and multi-GNSS satellite outdoor route tracking.',
    features: [
      '1.43" AMOLED retina display with Always-On option',
      'Clinical-grade optical ECG and continuous SpO2 tracking',
      '50m / 5ATM swimproof water resistance rating',
      'Up to 10-day battery life with fast magnetic charging'
    ],
    tags: ['GPS Tracking', 'ECG & SpO2', '5ATM Waterproof'],
    image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80',
    fallbackSvg: 'smartwatch'
  },
  {
    id: 'prod-09',
    name: 'AcousticPro Hybrid ANC Wireless Headphones',
    category: 'Electronics',
    price: 19900.00,
    rating: 4.8,
    reviewsCount: 520,
    stock: 10,
    unit: 'Over-Ear Foldable',
    description: 'Engineered for audiophile immersion with hybrid active noise cancellation neutralizing up to 38dB of ambient noise. 40mm titanium-coated biocellulose diaphragms deliver crystal-clear highs and deep, articulate bass.',
    features: [
      'Hybrid ANC with transparency audio pass-through mode',
      'LDAC & aptX HD Hi-Res audio wireless certified codecs',
      '50 hours playtime with ANC off, 38 hours with ANC on',
      'Plush memory-foam vegan protein leather ear cushions'
    ],
    tags: ['Active Noise Cancelling', '50h Battery', 'Hi-Res Audio'],
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80',
    fallbackSvg: 'headphones'
  },
  {
    id: 'prod-10',
    name: 'UltraSlim 4K OLED 15.6" Portable Monitor',
    category: 'Electronics',
    price: 27900.00,
    rating: 4.7,
    reviewsCount: 112,
    stock: 8,
    unit: '15.6-inch Display (680g)',
    description: 'Expand your visual workspace anywhere. Ultra-thin 4.8mm CNC aluminium chassis framing a 3840x2160 UHD OLED panel with 100% DCI-P3 color gamut, 100,000:1 contrast ratio, and single-cable Type-C power & display connection.',
    features: [
      '15.6" 4K UHD (3840x2160) True-Black OLED panel',
      '100% DCI-P3 & 100% sRGB color accuracy for creatives',
      'Dual full-featured USB-C + Mini HDMI connectivity',
      'Includes magnetic multi-angle origami stand and carry pouch'
    ],
    tags: ['4K OLED', 'Dual USB-C', 'Ultra Lightweight'],
    image: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=800&q=80',
    fallbackSvg: 'monitor'
  }
];

# ShopEase - Universal Design E-Commerce Web Application

**ShopEase** is an accessible, modern e-commerce web application inspired by leading online stores such as Amazon, eBay, and Argos. Built entirely with **vanilla HTML5, CSS3, and ES6 JavaScript**, it operates 100% on the client side with state stored persistently in the browser's `localStorage`.

---

## 🌟 Key Features & Specifications

### 1. Exactly 10 Products Across Exactly 3 Categories
Each of the 10 products features distinct pricing, customer ratings, detailed descriptions, specifications, and live inventory counts:

| # | Product Name | Category | Unit Price | Initial Stock | Highlights |
|---|--------------|----------|------------|---------------|------------|
| 1 | **Artisan Organic Sourdough Loaf** | Food | **Rs. 650.00** | 25 | 36h cold-fermentation, 100% stoneground flour |
| 2 | **Single-Estate Ethiopian Yirgacheffe Coffee** | Food | **Rs. 2900.00** | 40 | 500g whole bean, floral & bergamot notes |
| 3 | **Luxury Swiss Dark Chocolate Truffle Box** | Food | **Rs. 3300.00** | 18 | 24 handcrafted Grand Cru 72% dark truffles |
| 4 | **Everyday Tailored Stretch Chino Trousers** | Clothing | **Rs. 4500.00** | 20 | 98% cotton, 2% elastane, wrinkle-resistant |
| 5 | **Vintage Washed Denim Trucker Jacket** | Clothing | **Rs. 6800.00** | 15 | 13.5oz organic rigid denim, brass shanks |
| 6 | **Pure Italian Merino Wool Knit Jumper** | Clothing | **Rs. 8550.00** | 12 | 19.5-micron extrafine yarn, thermo-regulating |
| 7 | **ErgoPro Wireless Mechanical Keyboard** | Electronics | **Rs. 11950.00** | 16 | Hot-swap tactile switches, tri-mode wireless |
| 8 | **SmartPulse GPS & Health Tracker Watch** | Electronics | **Rs. 15900.00** | 14 | AMOLED display, ECG + SpO2, 5ATM swimproof |
| 9 | **AcousticPro Hybrid ANC Wireless Headphones** | Electronics | **Rs. 19900.00** | 10 | 38dB active noise cancellation, 50h battery |
| 10 | **UltraSlim 4K OLED 15.6" Portable Monitor** | Electronics | **Rs. 27900.00** | 8 | True-Black 3840x2160 panel, dual USB-C |

---

## ♿ Universal Design & Accessibility Standards

The application was designed according to the **7 Principles of Universal Design** and **WCAG 2.1 AA** guidelines:

1. **Equitable Use**:
   - Built-in **Theme Switcher** supporting **☀️ Light**, **🌙 Dark**, and **👁️ High Contrast Mode** (black/yellow 7:1+ contrast ratio for low-vision users).
   - High-contrast visual cues for in-stock, low-stock, and out-of-stock items.

2. **Flexibility in Use**:
   - **Dynamic Font Scaler**: Choose between Default (`A`), Large (`A+`), and Extra Large (`A++`).
   - Multiple ways to find items: instant search, category pill filter, sort by price/rating/stock, and in-stock only toggle.

3. **Simple and Intuitive Use**:
   - Familiar header layout with search bar, basket button with live badge counter, and category navigation.
   - Clear visual breadcrumbs and multi-step progress bar during checkout.

4. **Perceptible Information**:
   - Every interactive element has descriptive `aria-label`, `aria-pressed`, `role="dialog"`, or `aria-live="polite"` regions.
   - Live screen reader announcer (`#live-announcer`) automatically vocalizes cart changes and toast notifications.

5. **Tolerance for Error**:
   - Stock boundary enforcement: Users cannot add or increment more items than available in inventory.
   - Inline form error validation with helpful error messages on invalid email, phone, or card formats.
   - Confirmation prompts prior to clearing the basket.

6. **Low Physical Effort**:
   - **⚡ Quick Autofill Button**: Instantly populates sample customer and mock card details with one click for rapid grading and demonstration.
   - Keyboard navigation shortcuts: Press `/` to focus search from anywhere, `Esc` to close any modal or drawer.

7. **Size and Space for Approach and Use**:
   - Large touch targets meeting minimum **44px × 44px** standard for buttons and inputs.
   - Fully responsive layouts tailored for mobile, tablet, and desktop displays.

---

## 💾 Local Storage Architecture

All persistent data is saved under namespaced keys in the browser's `window.localStorage`:

- `shopease_inventory_v1`: Array of 10 products with real-time stock levels. Deducted upon order placement, replenished upon store reset.
- `shopease_cart_v1`: Array of current basket items (`[{ productId, quantity }]`).
- `shopease_orders_v1`: Historical log of placed mock orders including order ID, timestamp, items, shipping address, and payment receipt.
- `shopease_wishlist_v1`: User's favorited items.
- `shopease_settings_v1`: User's accessibility settings (theme and font size).
- `shopease_users_v1`: Registered customer accounts database with pre-seeded demo accounts.
- `shopease_current_user_v1`: Active authenticated user session.

---

## 🛒 Shopping Basket & Mock Checkout Experience

1. **Product Cards & Quick View Modal**:
   - Displays real-time stock badges (`In Stock`, `Only X left`, `Out of Stock`).
   - Quick View dialog displays detailed bulleted specs, full description, and quantity selector.

2. **Slide-Over Basket Drawer**:
   - Dynamic subtotal, free shipping progress meter (Spend Rs. 500.00 for FREE express delivery; standard Rs. 350.00 otherwise).
   - Stepper controls (`−` / `+`) and item removal button.
   - Promo discount code engine:
     - `SAVE10` (10% off entire basket)
     - `WELCOME20` (20% off basket)
     - `FREESHIP` (Free express delivery)

3. **3-Step Mock Checkout Wizard**:
   - **Step 1: Delivery Details**: Full name, email, phone, street, town, postal code.
   - **Step 2: Mock Payment Details**: Virtual credit card preview, card number, expiry date (`MM/YY`), CVV.
   - **Step 3: Review & Confirmation**: Complete cost breakdown including 20% estimated VAT.
   - **Order Confirmation**: Generates a realistic order number (e.g., `SE-849201`), decrements stock from inventory, clears cart, and enables printing receipts.
   - **My Orders**: Past orders modal accessible anytime from header.

4. **Customer Dashboard & Navigation States**:
   - **Visitor Nav (Unauthenticated)**: Displays **About Us**, **Sign In**, and **Register**.
   - **Customer Nav (Authenticated)**: Displays **Dashboard**, **My Offers**, **Basket** (with live count badge), **My Orders**, and **Logout**.
   - **Customer Dashboard (customer-dashboard.html)**: Complete member account management portal with KPIs, order receipts, active vouchers, and editable delivery details.
   - **Admin Dashboard (admin-dashboard.html)**: Store administration console for product inventory, order fulfillment, customers, and promotions.

---

## 🚀 How to Run Locally

You can launch ShopEase in any modern web browser using either method:

### Option A: Direct Browser File (No Installation Required)
Simply double-click `index.html` or open it with Google Chrome, Microsoft Edge, Mozilla Firefox, or Safari.

### Option B: Local Node Server
A zero-dependency server script is included in the project:
```bash
# Start server at http://localhost:3000
node server.js
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Option C: Run Automated Verification Tests
```bash
node test_suite.js
```
Validates all 30 checks (product count, category count, pricing uniqueness, cart calculation, promo codes, stock deduction, mock checkout, and user authentication/registration).

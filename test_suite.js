/**
 * ShopEase Comprehensive Test Suite
 * Validates requirements:
 * 1. Exactly 10 products
 * 2. Exactly 3 categories
 * 3. Unique prices for all 10 products
 * 4. LocalStorage operations and state management
 * 5. Cart addition, stock limit check, and removal
 * 6. Checkout flow and mock order generation
 */

// Mock browser window and localStorage for headless Node test
const mockLocalStorage = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, val) => { store[key] = String(val); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; }
  };
})();

global.window = {
  localStorage: mockLocalStorage,
  dispatchEvent: () => {}
};
global.CustomEvent = class CustomEvent { constructor(type, detail) { this.type = type; this.detail = detail; } };

async function runTests() {
  console.log('--- Starting ShopEase Verification Suite ---\n');
  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${message}`);
    }
  }

  // 1. Verify Catalog
  const { INITIAL_PRODUCTS, CATEGORIES } = await import('./js/products.js');
  
  assert(INITIAL_PRODUCTS.length === 10, `Store has exactly 10 products (Found: ${INITIAL_PRODUCTS.length})`);

  const uniqueCategories = [...new Set(INITIAL_PRODUCTS.map(p => p.category))];
  assert(uniqueCategories.length === 3, `Store has exactly 3 categories (Found: ${uniqueCategories.join(', ')})`);
  assert(uniqueCategories.includes('Food') && uniqueCategories.includes('Clothing') && uniqueCategories.includes('Electronics'),
    'Categories match required domains (Food, Clothing, Electronics)');

  const prices = INITIAL_PRODUCTS.map(p => p.price);
  const uniquePrices = new Set(prices);
  assert(uniquePrices.size === 10, `All 10 products have unique distinct prices (Prices: ${prices.join(', ')})`);

  // 2. Verify Storage & Inventory
  const { Storage } = await import('./js/storage.js');
  const products = Storage.getProducts();
  assert(products.length === 10, `Storage initializes and returns 10 products from localStorage`);

  // 3. Verify Cart Operations
  const { Cart } = await import('./js/cart.js');
  Cart.clear();

  // Test Add to Cart
  const firstProd = products[0]; // Food: Artisan Sourdough, price £4.95, stock 25
  const addRes1 = Cart.addItem(firstProd.id, 2);
  assert(addRes1.success === true, `Successfully added 2 of "${firstProd.name}" to cart`);

  let summary = Cart.getSummary();
  assert(summary.totalItems === 2, `Cart total items is 2 (Found: ${summary.totalItems})`);
  assert(summary.subtotal === 9.90, `Subtotal correctly computed: £${summary.subtotal} (Expected: £9.90)`);
  assert(summary.deliveryFee === 3.99, `Standard delivery fee (£3.99) charged below £50 threshold`);

  // Test Stock Boundary (Attempt to add more than available stock)
  const highQtyRes = Cart.addItem(firstProd.id, 100);
  assert(highQtyRes.success === false, `Blocked adding quantity exceeding stock (Result: "${highQtyRes.message}")`);

  // Test Second Item & Free Delivery Threshold
  const headphones = products.find(p => p.id === 'prod-09'); // £199.99
  Cart.addItem(headphones.id, 1);
  summary = Cart.getSummary();
  assert(summary.items.length === 2, `Cart now has 2 distinct product lines`);
  assert(summary.subtotal > 50, `Subtotal (£${summary.subtotal}) exceeds £50 free delivery threshold`);
  assert(summary.deliveryFee === 0, `Free delivery successfully granted (£0.00)`);

  // Test Promo Codes
  const promoRes = Cart.setPromo('SAVE10');
  assert(promoRes.success === true, `Promo code SAVE10 successfully applied`);
  summary = Cart.getSummary();
  const expectedDiscount = Number((summary.subtotal * 0.10).toFixed(2));
  assert(summary.discount === expectedDiscount, `10% discount correctly computed: £${summary.discount}`);

  // Test Quantity Update
  Cart.updateQuantity(firstProd.id, 1);
  summary = Cart.getSummary();
  const updatedItem = summary.items.find(i => i.productId === firstProd.id);
  assert(updatedItem.quantity === 1, `Quantity updated to 1`);

  // 4. Test Checkout Process
  const { Checkout, DEMO_USER } = await import('./js/checkout.js');
  
  const deliveryValidation = Checkout.validateDeliveryForm(DEMO_USER);
  assert(deliveryValidation.isValid === true, 'Delivery form validates demo customer details');

  const paymentValidation = Checkout.validatePaymentForm(DEMO_USER);
  assert(paymentValidation.isValid === true, 'Payment form validates mock card details');

  const originalStock = Storage.getProductById(firstProd.id).stock;
  const orderResult = await Checkout.processMockOrder({
    ...DEMO_USER,
    paymentMethod: 'Mock Card'
  });

  assert(orderResult.success === true, `Mock order processed successfully: ${orderResult.order.orderId}`);
  
  // Verify inventory deduction
  const remainingStock = Storage.getProductById(firstProd.id).stock;
  assert(remainingStock === originalStock - 1, `Stock properly deducted from ${originalStock} to ${remainingStock}`);

  // Verify Cart cleared
  const emptySummary = Cart.getSummary();
  assert(emptySummary.items.length === 0, `Shopping basket cleared after checkout`);

  // Verify Order History persistence
  const savedOrders = Storage.getOrders();
  assert(savedOrders.length === 1, `Order saved to localStorage history`);
  assert(savedOrders[0].orderId === orderResult.order.orderId, `Saved order ID matches generated ID`);

  console.log(`\n========================================`);
  console.log(`Suite Summary: ${passed} of ${total} tests PASSED!`);
  console.log(`========================================\n`);
}

runTests().catch(console.error);

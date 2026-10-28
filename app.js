/**
 * ShopEase Main Application Controller
 * Handles UI interactions, accessibility tools, filters, search,
 * modals, cart drawer, checkout, and order history.
 */

import { CATEGORIES } from './products.js';
import { Storage } from './storage.js';
import { Cart } from './cart.js';
import { Checkout, DEMO_USER } from './checkout.js';
import { Auth } from './auth.js';

// Application State
const state = {
  selectedCategory: 'all',
  searchQuery: '',
  sortBy: 'featured',
  inStockOnly: false,
  quickViewProduct: null,
  activeModal: null // 'cart' | 'quick-view' | 'checkout' | 'orders'
};

/* ==========================================================================
   DOM Elements
   ========================================================================== */
const DOM = {
  // Theme & Controls
  themeToggleBtn: document.getElementById('theme-toggle-btn'),
  themeIcon: document.getElementById('theme-icon'),
  liveAnnouncer: document.getElementById('live-announcer'),

  // Search & Filters
  searchForm: document.getElementById('search-form'),
  searchInput: document.getElementById('search-input'),
  searchClearBtn: document.getElementById('search-clear-btn'),
  categoryPillsContainer: document.getElementById('category-pills'),
  sortSelect: document.getElementById('sort-select'),
  inStockToggle: document.getElementById('in-stock-toggle'),
  productResultsCount: document.getElementById('product-results-count'),
  productGrid: document.getElementById('product-grid'),

  // Cart Header Button & Badge
  cartToggleBtn: document.getElementById('cart-toggle-btn'),
  cartBadge: document.getElementById('cart-badge'),
  ordersToggleBtn: document.getElementById('orders-toggle-btn'),
  offersToggleBtn: document.getElementById('offers-toggle-btn'),
  resetStoreBtn: document.getElementById('btn-reset-store'),

  // Hero Section Elements
  heroPrevBtn: document.getElementById('hero-prev-btn'),
  heroNextBtn: document.getElementById('hero-next-btn'),
  heroPlayPauseBtn: document.getElementById('hero-play-pause-btn'),
  heroSlideNum: document.getElementById('hero-slide-num'),
  heroTotalSlides: document.getElementById('hero-total-slides'),
  heroProgressFill: document.getElementById('hero-progress-fill'),
  heroImageStage: document.getElementById('hero-image-stage'),
  heroCardTitle: document.getElementById('hero-card-title'),
  heroCardCategory: document.getElementById('hero-card-category'),
  heroCardPrice: document.getElementById('hero-card-price'),
  heroCardQuickBtn: document.getElementById('hero-card-quick-btn'),

  // Spotlight Elements
  spotlightContainer: document.getElementById('spotlight-container'),
  spotlightPrevBtn: document.getElementById('spotlight-prev-btn'),
  spotlightNextBtn: document.getElementById('spotlight-next-btn'),

  // Video / Media Strip
  videoMotionBtn: document.getElementById('video-motion-btn'),
  cinematicStrip: document.getElementById('cinematic-strip'),

  // Mobile Menu
  mobileMenuBtn: document.getElementById('mobile-menu-btn'),
  mobileMenuCloseBtn: document.getElementById('mobile-menu-close-btn'),
  mobileMenuDrawer: document.getElementById('mobile-menu-drawer'),

  // Cart Drawer Elements
  cartOverlay: document.getElementById('cart-overlay'),
  cartCloseBtn: document.getElementById('cart-close-btn'),
  cartItemsContainer: document.getElementById('cart-items-container'),
  cartDeliveryMeter: document.getElementById('cart-delivery-meter'),
  cartDeliveryText: document.getElementById('cart-delivery-text'),
  cartDeliveryBar: document.getElementById('cart-delivery-bar'),
  cartSubtotal: document.getElementById('cart-subtotal'),
  cartDeliveryFee: document.getElementById('cart-delivery-fee'),
  cartDiscountRow: document.getElementById('cart-discount-row'),
  cartDiscountAmount: document.getElementById('cart-discount-amount'),
  cartGrandTotal: document.getElementById('cart-grand-total'),
  cartCheckoutBtn: document.getElementById('cart-checkout-btn'),
  promoInput: document.getElementById('promo-input'),
  promoApplyBtn: document.getElementById('promo-apply-btn'),
  activePromoContainer: document.getElementById('active-promo-container'),

  // Quick View Modal
  quickViewOverlay: document.getElementById('quick-view-overlay'),
  quickViewCloseBtn: document.getElementById('quick-view-close-btn'),
  quickViewContent: document.getElementById('quick-view-content'),

  // Checkout Modal
  checkoutOverlay: document.getElementById('checkout-overlay'),
  checkoutCloseBtn: document.getElementById('checkout-close-btn'),
  checkoutForm: document.getElementById('checkout-form'),
  checkoutStep1: document.getElementById('checkout-step-1'),
  checkoutStep2: document.getElementById('checkout-step-2'),
  checkoutStep3: document.getElementById('checkout-step-3'),
  stepIndicator1: document.getElementById('step-indicator-1'),
  stepIndicator2: document.getElementById('step-indicator-2'),
  stepIndicator3: document.getElementById('step-indicator-3'),
  checkoutNextBtn: document.getElementById('checkout-next-btn'),
  checkoutPrevBtn: document.getElementById('checkout-prev-btn'),
  checkoutSubmitBtn: document.getElementById('checkout-submit-btn'),
  btnAutofillDemo: document.getElementById('btn-autofill-demo'),
  checkoutReviewItems: document.getElementById('checkout-review-items'),
  checkoutReviewTotal: document.getElementById('checkout-review-total'),
  orderSuccessView: document.getElementById('order-success-view'),

  // Orders History Modal
  ordersOverlay: document.getElementById('orders-overlay'),
  ordersCloseBtn: document.getElementById('orders-close-btn'),
  ordersListContainer: document.getElementById('orders-list-container'),

  // Toast Container
  toastContainer: document.getElementById('toast-container')
};

/* ==========================================================================
   Helper Utilities: Audio / Toast / Announcement / Security
   ========================================================================== */
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function announce(message) {
  if (DOM.liveAnnouncer) {
    DOM.liveAnnouncer.textContent = '';
    setTimeout(() => {
      DOM.liveAnnouncer.textContent = message;
    }, 50);
  }
}

function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.setAttribute('role', 'status');

  const icon = type === 'success' ? '✓' : type === 'warning' ? '⚠️' : 'ℹ️';
  toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;

  DOM.toastContainer.appendChild(toast);
  announce(message);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 4000);
}

/* ==========================================================================
   Theme Management (Icon-only theme switcher - No theme words)
   ========================================================================== */
const THEMES = ['light', 'dark', 'high-contrast'];
const THEME_ICONS = {
  'light': '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>',
  'dark': '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>',
  'high-contrast': '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><path d="M12 2a10 10 0 0 1 0 20z" fill="currentColor"></path></svg>'
};
const THEME_NAMES = {
  'light': 'Light',
  'dark': 'Dark',
  'high-contrast': 'High Contrast'
};

function applyTheme(theme) {
  const targetTheme = THEMES.includes(theme) ? theme : 'light';
  document.documentElement.setAttribute('data-theme', targetTheme);
  Storage.saveSettings({ theme: targetTheme });

  const iconSpan = document.getElementById('theme-icon');
  const btn = document.getElementById('theme-toggle-btn');
  if (iconSpan) {
    iconSpan.innerHTML = THEME_ICONS[targetTheme] || THEME_ICONS['light'];
  }
  if (btn) {
    btn.setAttribute('aria-label', `Toggle theme (Current: ${THEME_NAMES[targetTheme]})`);
    btn.setAttribute('title', `Switch theme (Current: ${THEME_NAMES[targetTheme]})`);
  }
}

function initAccessibilitySettings() {
  const settings = Storage.getSettings();

  // Apply Theme
  applyTheme(settings.theme || 'light');

  // Maintain font size attribute for document
  document.documentElement.setAttribute('data-font-size', settings.fontSize || 'normal');

  // Theme Toggle Button (Icon-only cycle: Light -> Dark -> High Contrast -> Light)
  const themeToggleBtn = document.getElementById('theme-toggle-btn');
  themeToggleBtn?.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const nextIdx = (THEMES.indexOf(currentTheme) + 1) % THEMES.length;
    const nextTheme = THEMES[nextIdx];
    applyTheme(nextTheme);
    announce(`Theme switched to ${THEME_NAMES[nextTheme]} mode.`);
    showToast(`Switched to ${THEME_NAMES[nextTheme]} theme`, 'info');
  });
}

/* ==========================================================================
   Category Navigation & Filter Rendering
   ========================================================================== */
function renderCategoryPills() {
  const products = Storage.getProducts();

  // Calculate counts
  const counts = {
    all: products.length,
    Food: products.filter(p => p.category === 'Food').length,
    Clothing: products.filter(p => p.category === 'Clothing').length,
    Electronics: products.filter(p => p.category === 'Electronics').length
  };

  DOM.categoryPillsContainer.innerHTML = CATEGORIES.map(cat => {
    const isActive = state.selectedCategory === cat.id;
    const count = counts[cat.id] || 0;
    return `
      <button 
        type="button" 
        class="category-pill-btn ${isActive ? 'active' : ''}" 
        data-category="${cat.id}"
        aria-pressed="${isActive}"
        aria-label="Filter by ${cat.name} (${count} products)"
      >
        <span>${cat.name}</span>
        <span class="category-count">${count}</span>
      </button>
    `;
  }).join('');

  // Attach event listeners
  DOM.categoryPillsContainer.querySelectorAll('.category-pill-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.selectedCategory = btn.dataset.category;
      renderCategoryPills();
      renderProductCatalog();
      announce(`Showing category: ${btn.textContent.trim()}`);
    });
  });
}

/* ==========================================================================
   Product Catalog Rendering & Filtering
   ========================================================================== */
function getFilteredAndSortedProducts() {
  let products = Storage.getProducts();

  // Category filter
  if (state.selectedCategory !== 'all') {
    products = products.filter(p => p.category === state.selectedCategory);
  }

  // Search filter
  if (state.searchQuery.trim() !== '') {
    const q = state.searchQuery.toLowerCase().trim();
    products = products.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      (p.tags && p.tags.some(tag => tag.toLowerCase().includes(q)))
    );
  }

  // In-stock only filter
  if (state.inStockOnly) {
    products = products.filter(p => p.stock > 0);
  }

  // Sorting
  switch (state.sortBy) {
    case 'price-asc':
      products.sort((a, b) => a.price - b.price);
      break;
    case 'price-desc':
      products.sort((a, b) => b.price - a.price);
      break;
    case 'rating':
      products.sort((a, b) => b.rating - a.rating);
      break;
    case 'stock':
      products.sort((a, b) => b.stock - a.stock);
      break;
    case 'name':
      products.sort((a, b) => a.name.localeCompare(b.name));
      break;
    default:
      // Featured / Default id order
      break;
  }

  return products;
}

function renderProductCatalog() {
  const products = getFilteredAndSortedProducts();
  const wishlist = Storage.getWishlist();

  DOM.productResultsCount.textContent = `${products.length} product${products.length === 1 ? '' : 's'} found`;

  if (products.length === 0) {
    DOM.productGrid.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🔍</div>
        <h3>No products match your criteria</h3>
        <p>Try resetting filters or searching with different keywords.</p>
        <button type="button" class="btn btn-secondary" id="btn-clear-filters">
          Reset All Filters
        </button>
      </div>
    `;
    document.getElementById('btn-clear-filters')?.addEventListener('click', resetAllFilters);
    return;
  }

  DOM.productGrid.innerHTML = products.map(product => {
    const isWishlisted = wishlist.includes(product.id);
    const isOutOfStock = product.stock <= 0;
    const isLowStock = product.stock > 0 && product.stock <= 4;

    const stockBadge = isOutOfStock
      ? `<span class="badge badge-stock-out">Out of Stock</span>`
      : isLowStock
        ? `<span class="badge badge-stock-low">Only ${product.stock} left</span>`
        : `<span class="badge badge-stock-in">${product.stock} in stock</span>`;

    // Star rating generator
    const stars = '★'.repeat(Math.floor(product.rating)) + (product.rating % 1 >= 0.5 ? '½' : '');

    return `
      <article class="product-card" data-product-id="${product.id}" aria-labelledby="prod-title-${product.id}">
        <div class="card-media-wrapper">
          <img 
            src="${product.image}" 
            alt="${product.name}" 
            class="product-image" 
            loading="lazy"
            onerror="this.src='https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=800&q=80'"
          />
          <div class="card-badges">
            <span class="badge badge-category">${product.category}</span>
            ${stockBadge}
          </div>
          <button 
            type="button" 
            class="wishlist-btn ${isWishlisted ? 'active' : ''}" 
            data-wishlist-id="${product.id}"
            aria-label="${isWishlisted ? 'Remove from wishlist' : 'Save to wishlist'} for ${product.name}"
            title="${isWishlisted ? 'Remove from wishlist' : 'Save to wishlist'}"
          >
            ♥
          </button>
        </div>

        <div class="card-body">
          <div class="card-rating" aria-label="Rating: ${product.rating} out of 5 stars (${product.reviewsCount} reviews)">
            <span>${stars}</span>
            <strong>${product.rating.toFixed(1)}</strong>
            <span class="review-count">(${product.reviewsCount})</span>
          </div>

          <h3 class="product-title" id="prod-title-${product.id}">${product.name}</h3>
          <p class="product-desc">${product.description}</p>

          <div class="card-footer">
            <div class="price-row">
              <span class="product-price">Rs. ${product.price.toFixed(2)}</span>
              <span class="product-unit">${product.unit}</span>
            </div>

            <div class="card-actions">
              <button 
                type="button" 
                class="btn btn-primary add-to-cart-btn" 
                data-add-id="${product.id}"
                ${isOutOfStock ? 'disabled aria-disabled="true"' : ''}
              >
                <span>${isOutOfStock ? 'Out of Stock' : 'Add to Cart'}</span>
              </button>
              <button 
                type="button" 
                class="btn btn-secondary quick-view-btn" 
                data-quick-id="${product.id}"
                aria-label="Quick preview of ${product.name}"
                title="View full product specifications"
              >
                View Details
              </button>
            </div>
          </div>
        </div>
      </article>
    `;
  }).join('');

  // Authentication gate for cart additions
  function ensureAuthenticatedForCart() {
    if (!Auth.isLoggedIn()) {
      showToast('Please sign in to add items to your shopping cart. Redirecting to login...', 'warning');
      announce('Please sign in to your account to add items to the cart.');
      setTimeout(() => {
        window.location.href = 'login.html?redirect=index.html';
      }, 950);
      return false;
    }
    return true;
  }

  // Attach event listeners for product card buttons
  DOM.productGrid.querySelectorAll('.add-to-cart-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      if (!ensureAuthenticatedForCart()) return;
      const id = btn.dataset.addId;
      const res = Cart.addItem(id, 1);
      if (res.success) {
        showToast(res.message, 'success');
        triggerCartBadgePulse();
      } else {
        showToast(res.message, 'warning');
      }
    });
  });

  DOM.productGrid.querySelectorAll('.quick-view-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.quickId;
      openQuickView(id);
    });
  });

  DOM.productGrid.querySelectorAll('.wishlist-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.wishlistId;
      const added = Storage.toggleWishlist(id);
      btn.classList.toggle('active', added);
      btn.setAttribute('aria-label', added ? 'Remove from wishlist' : 'Save to wishlist');
      showToast(added ? 'Saved to your Wishlist!' : 'Removed from Wishlist.', 'info');
    });
  });
}

function resetAllFilters() {
  state.selectedCategory = 'all';
  state.searchQuery = '';
  state.sortBy = 'featured';
  state.inStockOnly = false;
  if (DOM.searchInput) DOM.searchInput.value = '';
  if (DOM.searchClearBtn) DOM.searchClearBtn.classList.remove('visible');
  if (DOM.sortSelect) DOM.sortSelect.value = 'featured';
  if (DOM.inStockToggle) DOM.inStockToggle.checked = false;
  renderCategoryPills();
  renderProductCatalog();
  announce('All filters have been reset.');
}

/* ==========================================================================
   Shopping Basket UI & Slide Drawer
   ========================================================================== */
function updateCartUI() {
  const summary = Cart.getSummary();

  // Update header badge if present
  const badge = document.getElementById('cart-badge');
  if (badge) {
    badge.textContent = summary.totalItems;
    badge.setAttribute('aria-label', `${summary.totalItems} items in shopping basket`);
  }

  // Update Drawer Subtotal & Totals
  DOM.cartSubtotal.textContent = `Rs. ${summary.subtotal.toFixed(2)}`;
  DOM.cartDeliveryFee.textContent = summary.deliveryFee === 0 ? 'FREE' : `Rs. ${summary.deliveryFee.toFixed(2)}`;
  DOM.cartGrandTotal.textContent = `Rs. ${summary.grandTotal.toFixed(2)}`;

  // Discount row
  if (summary.discount > 0) {
    DOM.cartDiscountRow.style.display = 'flex';
    DOM.cartDiscountAmount.textContent = `-Rs. ${summary.discount.toFixed(2)}`;
  } else {
    DOM.cartDiscountRow.style.display = 'none';
  }

  // Active Promo Display
  if (summary.activePromoCode && summary.promoDetails) {
    DOM.activePromoContainer.style.display = 'block';
    DOM.activePromoContainer.innerHTML = `
      <div class="active-promo-tag">
        <div>
          <strong>${summary.activePromoCode}</strong>: ${summary.promoDetails.description}
        </div>
        <button type="button" id="btn-remove-promo" class="btn-icon-only" style="background:none;border:none;cursor:pointer;font-weight:bold;color:var(--color-danger);" aria-label="Remove promo code">✕</button>
      </div>
    `;
    document.getElementById('btn-remove-promo')?.addEventListener('click', () => {
      Cart.clearPromo();
      updateCartUI();
      showToast('Promo code removed', 'info');
    });
  } else {
    DOM.activePromoContainer.style.display = 'none';
    DOM.activePromoContainer.innerHTML = '';
  }

  // Free delivery progress meter
  if (summary.isFreeDelivery) {
    DOM.cartDeliveryText.innerHTML = `<span>🎉 You qualify for <strong>FREE Express Delivery!</strong></span>`;
    DOM.cartDeliveryBar.style.width = '100%';
    DOM.cartDeliveryBar.style.backgroundColor = 'var(--color-success)';
  } else if (summary.subtotal === 0) {
    DOM.cartDeliveryText.innerHTML = `<span>Spend <strong>Rs. 50.00</strong> for FREE Delivery</span>`;
    DOM.cartDeliveryBar.style.width = '0%';
  } else {
    const percent = Math.min(100, Math.round((summary.subtotal / 50) * 100));
    DOM.cartDeliveryText.innerHTML = `<span>Add <strong>Rs. ${summary.freeShippingRemaining.toFixed(2)}</strong> more for <strong>FREE Delivery</strong></span>`;
    DOM.cartDeliveryBar.style.width = `${percent}%`;
    DOM.cartDeliveryBar.style.backgroundColor = '';
  }

  // Render items list
  if (summary.items.length === 0) {
    DOM.cartItemsContainer.innerHTML = `
      <div class="empty-state" style="padding: 2.5rem 1rem;">
        <div class="empty-state-icon">🛒</div>
        <h3>Your cart is empty</h3>
        <p>Explore our products and add your favorites to your cart!</p>
        <button type="button" class="btn btn-primary" id="btn-cart-browse">
          Start Shopping
        </button>
      </div>
    `;
    DOM.cartCheckoutBtn.disabled = true;
    document.getElementById('btn-cart-browse')?.addEventListener('click', () => closeCart());
    return;
  }

  DOM.cartCheckoutBtn.disabled = false;
  DOM.cartItemsContainer.innerHTML = `
    <ul class="cart-items-list">
      ${summary.items.map(item => `
        <li class="cart-item" data-cart-item-id="${item.productId}">
          <img src="${item.image}" alt="${item.name}" class="cart-item-img" />
          <div class="cart-item-details">
            <h4 class="cart-item-title">${item.name}</h4>
            <div class="cart-item-unit-price">Rs. ${item.price.toFixed(2)} each</div>
            <div class="cart-item-bottom">
              <div class="qty-stepper" role="group" aria-label="Quantity for ${item.name}">
                <button 
                  type="button" 
                  class="qty-stepper-btn btn-qty-dec" 
                  data-id="${item.productId}"
                  aria-label="Decrease quantity"
                >−</button>
                <span class="qty-stepper-val" aria-live="polite">${item.quantity}</span>
                <button 
                  type="button" 
                  class="qty-stepper-btn btn-qty-inc" 
                  data-id="${item.productId}"
                  ${item.quantity >= item.stock ? 'disabled' : ''}
                  aria-label="Increase quantity"
                >+</button>
              </div>

              <div class="cart-item-total">
                Rs. ${item.totalPrice.toFixed(2)}
              </div>

              <button 
                type="button" 
                class="cart-item-remove-btn" 
                data-remove-id="${item.productId}"
                aria-label="Remove ${item.name} from cart"
                title="Remove item"
              >
                🗑️
              </button>
            </div>
          </div>
        </li>
      `).join('')}
    </ul>
    <div style="display:flex; justify-content:space-between; align-items:center; margin-top:0.75rem;">
      <button type="button" id="btn-clear-entire-cart" class="btn btn-secondary btn-danger-outline" style="font-size:0.8rem; padding:0.4rem 0.75rem;">
        Clear Cart
      </button>
      <span style="font-size:0.8rem; color:var(--color-text-muted);">
        Includes 20% estimated VAT (Rs. ${summary.estimatedTax.toFixed(2)})
      </span>
    </div>
  `;

  // Attach cart item quantity buttons
  DOM.cartItemsContainer.querySelectorAll('.btn-qty-dec').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const currentItem = summary.items.find(i => i.productId === id);
      if (currentItem) {
        Cart.updateQuantity(id, currentItem.quantity - 1);
        updateCartUI();
      }
    });
  });

  DOM.cartItemsContainer.querySelectorAll('.btn-qty-inc').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const currentItem = summary.items.find(i => i.productId === id);
      if (currentItem) {
        const res = Cart.updateQuantity(id, currentItem.quantity + 1);
        if (!res.success) {
          showToast(res.message, 'warning');
        }
        updateCartUI();
      }
    });
  });

  DOM.cartItemsContainer.querySelectorAll('.cart-item-remove-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.removeId;
      const res = Cart.removeItem(id);
      showToast(res.message, 'info');
      updateCartUI();
    });
  });

  document.getElementById('btn-clear-entire-cart')?.addEventListener('click', () => {
    if (confirm('Are you sure you want to remove all items from your basket?')) {
      Cart.clear();
      updateCartUI();
      showToast('Shopping basket cleared.', 'info');
    }
  });
}

function openCart() {
  state.activeModal = 'cart';
  DOM.cartOverlay.classList.add('open');
  DOM.cartOverlay.setAttribute('aria-hidden', 'false');
  updateCartUI();
  DOM.cartCloseBtn?.focus();
  announce('Shopping basket drawer opened.');
}

function closeCart() {
  state.activeModal = null;
  DOM.cartOverlay.classList.remove('open');
  DOM.cartOverlay.setAttribute('aria-hidden', 'true');
  DOM.cartToggleBtn?.focus();
}

function triggerCartBadgePulse() {
  document.querySelectorAll('.cart-badge').forEach(badge => {
    badge.classList.add('pulse');
    setTimeout(() => badge.classList.remove('pulse'), 400);
  });
}

/* ==========================================================================
   Product Quick View Modal
   ========================================================================== */
function openQuickView(productId) {
  const product = Storage.getProductById(productId);
  if (!product) return;

  state.quickViewProduct = product;
  state.activeModal = 'quick-view';

  const isOutOfStock = product.stock <= 0;
  const stars = '★'.repeat(Math.floor(product.rating)) + (product.rating % 1 >= 0.5 ? '½' : '');

  DOM.quickViewContent.innerHTML = `
    <div class="quick-view-grid">
      <div>
        <img src="${product.image}" alt="${product.name}" class="quick-view-img" />
      </div>
      <div>
        <div class="badge badge-category" style="margin-bottom:0.5rem;">${product.category}</div>
        <h2 style="font-size:1.4rem; font-weight:800; line-height:1.3; margin-bottom:0.5rem;">${product.name}</h2>
        
        <div class="card-rating" style="margin-bottom:1rem;">
          <span>${stars}</span>
          <strong>${product.rating.toFixed(1)}</strong>
          <span class="review-count">(${product.reviewsCount} verified customer reviews)</span>
        </div>

        <div style="font-size:1.75rem; font-weight:800; color:var(--color-brand-primary); margin-bottom:0.5rem;">
          Rs. ${product.price.toFixed(2)}
          <span style="font-size:0.85rem; font-weight:normal; color:var(--color-text-muted);">/ ${product.unit}</span>
        </div>

        <p style="font-size:0.95rem; color:var(--color-text-secondary); line-height:1.6; margin-bottom:1rem;">
          ${product.description}
        </p>

        <h4 style="font-size:0.9rem; font-weight:700; margin-bottom:0.5rem;">Key Specifications:</h4>
        <ul class="feature-list">
          ${product.features.map(f => `<li>${f}</li>`).join('')}
        </ul>

        <div style="margin: 1.25rem 0; padding:0.75rem; background:var(--color-surface-subtle); border:1px solid var(--color-border); border-radius:var(--radius-sm); font-size:0.9rem;">
          <strong>Availability: </strong> 
          ${isOutOfStock ? '<span style="color:var(--color-danger); font-weight:bold;">Out of Stock</span>' : `<span style="color:var(--color-success); font-weight:bold;">${product.stock} items currently in stock</span>`}
        </div>

        <div style="display:flex; gap:0.75rem; align-items:center;">
          <div style="display:flex; align-items:center; border:1px solid var(--color-border); border-radius:var(--radius-sm); overflow:hidden; height:44px;">
            <button type="button" id="qv-qty-dec" class="qty-stepper-btn" aria-label="Decrease quantity" style="width:38px;height:100%;">−</button>
            <input type="number" id="qv-qty-input" value="1" min="1" max="${product.stock}" style="width:45px; text-align:center; border:none; font-weight:bold; font-size:1rem; outline:none;" />
            <button type="button" id="qv-qty-inc" class="qty-stepper-btn" aria-label="Increase quantity" style="width:38px;height:100%;">+</button>
          </div>

          <button 
            type="button" 
            class="btn btn-primary" 
            id="qv-add-cart-btn" 
            style="flex:1;"
            ${isOutOfStock ? 'disabled' : ''}
          >
            ${isOutOfStock ? 'Currently Unavailable' : 'Add to Shopping Basket'}
          </button>
        </div>
      </div>
    </div>
  `;

  DOM.quickViewOverlay.classList.add('open');
  DOM.quickViewOverlay.setAttribute('aria-hidden', 'false');
  DOM.quickViewCloseBtn?.focus();

  // Quantity handlers in quick view
  const qvQtyInput = document.getElementById('qv-qty-input');
  const qvDec = document.getElementById('qv-qty-dec');
  const qvInc = document.getElementById('qv-qty-inc');
  const qvAddBtn = document.getElementById('qv-add-cart-btn');

  qvDec?.addEventListener('click', () => {
    let val = parseInt(qvQtyInput.value, 10) || 1;
    if (val > 1) qvQtyInput.value = val - 1;
  });

  qvInc?.addEventListener('click', () => {
    let val = parseInt(qvQtyInput.value, 10) || 1;
    if (val < product.stock) qvQtyInput.value = val + 1;
  });

  qvAddBtn?.addEventListener('click', () => {
    if (!Auth.isLoggedIn()) {
      showToast('Please sign in to add items to your shopping cart. Redirecting to login...', 'warning');
      announce('Please sign in to your account to add items to the cart.');
      setTimeout(() => {
        window.location.href = 'login.html?redirect=index.html';
      }, 950);
      return;
    }
    const qty = parseInt(qvQtyInput.value, 10) || 1;
    const res = Cart.addItem(product.id, qty);
    if (res.success) {
      showToast(res.message, 'success');
      triggerCartBadgePulse();
      closeQuickView();
    } else {
      showToast(res.message, 'warning');
    }
  });

  announce(`Quick preview for ${product.name}`);
}

function closeQuickView() {
  state.activeModal = null;
  DOM.quickViewOverlay.classList.remove('open');
  DOM.quickViewOverlay.setAttribute('aria-hidden', 'true');
}

/* ==========================================================================
   Checkout & Mock Payment Wizard
   ========================================================================== */
function openCheckout() {
  const summary = Cart.getSummary();
  if (summary.items.length === 0) {
    showToast('Your basket is empty.', 'warning');
    return;
  }

  closeCart();
  state.activeModal = 'checkout';
  Checkout.currentStep = 1;

  // Auto-populate delivery fields if user is authenticated
  const currentUser = Auth.getCurrentUser();
  if (currentUser) {
    const fn = document.getElementById('checkout-fullname');
    const em = document.getElementById('checkout-email');
    const ph = document.getElementById('checkout-phone');
    const ad = document.getElementById('checkout-address');
    const ci = document.getElementById('checkout-city');
    const pc = document.getElementById('checkout-postcode');

    if (fn && !fn.value) fn.value = currentUser.fullName || '';
    if (em && !em.value) em.value = currentUser.email || '';
    if (ph && !ph.value) ph.value = currentUser.phone || '';
    if (ad && !ad.value) ad.value = currentUser.address || '';
    if (ci && !ci.value) ci.value = currentUser.city || '';
    if (pc && !pc.value) pc.value = currentUser.postcode || '';
  }

  updateCheckoutStepDisplay();

  DOM.checkoutOverlay.classList.add('open');
  DOM.checkoutOverlay.setAttribute('aria-hidden', 'false');
  DOM.checkoutCloseBtn?.focus();
  announce('Checkout wizard opened. Step 1: Delivery Details.');
}

function closeCheckout() {
  state.activeModal = null;
  DOM.checkoutOverlay.classList.remove('open');
  DOM.checkoutOverlay.setAttribute('aria-hidden', 'true');
}

function updateCheckoutStepDisplay() {
  // Hide all step sections
  DOM.checkoutStep1.style.display = 'none';
  DOM.checkoutStep2.style.display = 'none';
  DOM.checkoutStep3.style.display = 'none';
  DOM.orderSuccessView.style.display = 'none';

  // Update step indicators
  [DOM.stepIndicator1, DOM.stepIndicator2, DOM.stepIndicator3].forEach((el, idx) => {
    el.classList.remove('active', 'completed');
    if (idx + 1 === Checkout.currentStep) {
      el.classList.add('active');
    } else if (idx + 1 < Checkout.currentStep) {
      el.classList.add('completed');
    }
  });

  if (Checkout.currentStep === 1) {
    DOM.checkoutStep1.style.display = 'block';
    DOM.checkoutPrevBtn.style.display = 'none';
    DOM.checkoutNextBtn.style.display = 'inline-flex';
    DOM.checkoutSubmitBtn.style.display = 'none';
    DOM.checkoutNextBtn.textContent = 'Continue to Payment →';
  } else if (Checkout.currentStep === 2) {
    DOM.checkoutStep2.style.display = 'block';
    DOM.checkoutPrevBtn.style.display = 'inline-flex';
    DOM.checkoutNextBtn.style.display = 'inline-flex';
    DOM.checkoutSubmitBtn.style.display = 'none';
    DOM.checkoutNextBtn.textContent = 'Review Order →';
  } else if (Checkout.currentStep === 3) {
    DOM.checkoutStep3.style.display = 'block';
    DOM.checkoutPrevBtn.style.display = 'inline-flex';
    DOM.checkoutNextBtn.style.display = 'none';
    DOM.checkoutSubmitBtn.style.display = 'inline-flex';
    populateOrderReviewStep();
  }
}

function populateOrderReviewStep() {
  const summary = Cart.getSummary();
  const formData = getCheckoutFormData();

  DOM.checkoutReviewItems.innerHTML = `
    <div style="background:var(--color-surface-subtle); padding:1rem; border-radius:var(--radius-sm); border:1px solid var(--color-border); margin-bottom:1rem;">
      <h4 style="font-size:0.95rem; margin-bottom:0.5rem;">Dispatching to:</h4>
      <p style="font-size:0.9rem; color:var(--color-text-secondary); line-height:1.4;">
        <strong>${formData.fullName}</strong><br>
        ${formData.address}, ${formData.city}, ${formData.postcode}<br>
        Email: ${formData.email} | Phone: ${formData.phone}
      </p>
    </div>

    <div style="background:var(--color-surface-subtle); padding:1rem; border-radius:var(--radius-sm); border:1px solid var(--color-border); margin-bottom:1rem;">
      <h4 style="font-size:0.95rem; margin-bottom:0.5rem;">Payment Method:</h4>
      <p style="font-size:0.9rem; color:var(--color-text-secondary);">
        Card ending in <strong>•••• ${(formData.cardNumber || '8892').slice(-4)}</strong> (Mock Authorized)
      </p>
    </div>

    <h4 style="font-size:0.95rem; margin-bottom:0.5rem;">Order Summary (${summary.totalItems} items):</h4>
    <ul style="list-style:none; display:flex; flex-direction:column; gap:0.5rem; margin-bottom:1rem;">
      ${summary.items.map(item => `
        <li style="display:flex; justify-content:space-between; font-size:0.875rem;">
          <span>${item.quantity} × ${item.name}</span>
          <strong>Rs. ${item.totalPrice.toFixed(2)}</strong>
        </li>
      `).join('')}
    </ul>
  `;

  DOM.checkoutReviewTotal.innerHTML = `
    <div class="financial-row"><span>Subtotal:</span> <span>Rs. ${summary.subtotal.toFixed(2)}</span></div>
    ${summary.discount > 0 ? `<div class="financial-row" style="color:var(--color-success)"><span>Discount:</span> <span>-Rs. ${summary.discount.toFixed(2)}</span></div>` : ''}
    <div class="financial-row"><span>Delivery:</span> <span>${summary.deliveryFee === 0 ? 'FREE' : 'Rs. ' + summary.deliveryFee.toFixed(2)}</span></div>
    <div class="financial-row total-row"><span>Grand Total:</span> <span>Rs. ${summary.grandTotal.toFixed(2)}</span></div>
  `;
}

function getCheckoutFormData() {
  return {
    fullName: document.getElementById('checkout-fullname')?.value || '',
    email: document.getElementById('checkout-email')?.value || '',
    phone: document.getElementById('checkout-phone')?.value || '',
    address: document.getElementById('checkout-address')?.value || '',
    city: document.getElementById('checkout-city')?.value || '',
    postcode: document.getElementById('checkout-postcode')?.value || '',
    cardNumber: document.getElementById('checkout-cardnumber')?.value || '',
    cardHolder: document.getElementById('checkout-cardholder')?.value || '',
    cardExpiry: document.getElementById('checkout-cardexpiry')?.value || '',
    cardCvv: document.getElementById('checkout-cardcvv')?.value || ''
  };
}

function handleCheckoutNext() {
  const data = getCheckoutFormData();

  if (Checkout.currentStep === 1) {
    const val = Checkout.validateDeliveryForm(data);
    clearFormErrors();
    if (!val.isValid) {
      displayFormErrors(val.errors);
      showToast('Please fix the errors in your delivery information.', 'warning');
      return;
    }
    Checkout.currentStep = 2;
    updateCheckoutStepDisplay();
    announce('Step 2: Payment Details.');
  } else if (Checkout.currentStep === 2) {
    const val = Checkout.validatePaymentForm(data);
    clearFormErrors();
    if (!val.isValid) {
      displayFormErrors(val.errors);
      showToast('Please check your mock card details.', 'warning');
      return;
    }
    Checkout.currentStep = 3;
    updateCheckoutStepDisplay();
    announce('Step 3: Review and Place Order.');
  }
}

function handleCheckoutPrev() {
  if (Checkout.currentStep > 1) {
    Checkout.currentStep--;
    updateCheckoutStepDisplay();
  }
}

async function handleCheckoutSubmit(e) {
  e.preventDefault();
  const data = getCheckoutFormData();

  DOM.checkoutSubmitBtn.disabled = true;
  DOM.checkoutSubmitBtn.innerHTML = '<span>⏳ Processing Mock Authorization...</span>';

  setTimeout(async () => {
    const result = await Checkout.processMockOrder(data);
    DOM.checkoutSubmitBtn.disabled = false;
    DOM.checkoutSubmitBtn.innerHTML = '<span>🔒 Confirm & Pay Mock Order</span>';

    if (result.success) {
      showOrderSuccess(result.order);
      renderProductCatalog();
      updateCartUI();
      announce(`Order ${result.order.orderId} placed successfully.`);
    } else {
      showToast(result.message, 'danger');
    }
  }, 1200);
}

function showOrderSuccess(order) {
  DOM.checkoutStep1.style.display = 'none';
  DOM.checkoutStep2.style.display = 'none';
  DOM.checkoutStep3.style.display = 'none';
  document.querySelector('.checkout-stepper').style.display = 'none';
  document.querySelector('.checkout-footer-nav').style.display = 'none';

  DOM.orderSuccessView.style.display = 'block';
  DOM.orderSuccessView.innerHTML = `
    <div class="order-success-box">
      <div class="success-icon-badge">✓</div>
      <h2 style="font-size:1.6rem; font-weight:800; margin-bottom:0.5rem;">Order Confirmed!</h2>
      <p style="color:var(--color-text-secondary); max-width:440px; margin:0 auto 1.5rem;">
        Thank you for your order, <strong>${order.customer.fullName}</strong>. A mock confirmation has been securely recorded to your browser's Local Storage.
      </p>

      <div class="order-receipt-card">
        <div style="display:flex; justify-content:space-between; margin-bottom:0.75rem; border-bottom:1px solid var(--color-border); padding-bottom:0.5rem;">
          <div>
            <strong>Order Reference:</strong> <span style="font-family:var(--font-mono); color:var(--color-brand-primary);">${order.orderId}</span>
          </div>
          <div>
            <strong>Date:</strong> ${order.formattedDate}
          </div>
        </div>

        <p style="margin-bottom:0.75rem;">
          <strong>Delivery To:</strong> ${order.customer.address}
        </p>

        <h5 style="margin-bottom:0.5rem; font-size:0.85rem; text-transform:uppercase; color:var(--color-text-muted);">Purchased Items:</h5>
        <ul style="list-style:none; display:flex; flex-direction:column; gap:0.4rem; margin-bottom:1rem;">
          ${order.items.map(item => `
            <li style="display:flex; justify-content:space-between;">
              <span>${item.quantity} × ${item.name}</span>
              <strong>Rs. ${item.totalPrice.toFixed(2)}</strong>
            </li>
          `).join('')}
        </ul>

        <div style="border-top:1px dashed var(--color-border-strong); padding-top:0.75rem; display:flex; justify-content:space-between; font-size:1.1rem; font-weight:800;">
          <span>Total Paid:</span>
          <span style="color:var(--color-brand-primary);">Rs. ${order.financials.grandTotal.toFixed(2)}</span>
        </div>
      </div>

      <div style="display:flex; justify-content:center; gap:1rem; flex-wrap:wrap;">
        <button type="button" class="btn btn-secondary" onclick="window.print()">
          🖨️ Print Receipt
        </button>
        <button type="button" class="btn btn-primary" id="btn-finish-shopping">
          Continue Shopping
        </button>
      </div>
    </div>
  `;

  document.getElementById('btn-finish-shopping')?.addEventListener('click', () => {
    closeCheckout();
    // Reset checkout form and stepper visibility
    document.querySelector('.checkout-stepper').style.display = 'flex';
    document.querySelector('.checkout-footer-nav').style.display = 'flex';
    Checkout.currentStep = 1;
  });
}

function displayFormErrors(errors) {
  Object.keys(errors).forEach(field => {
    const input = document.getElementById(`checkout-${field.toLowerCase()}`);
    const errorEl = document.getElementById(`error-${field.toLowerCase()}`);
    if (input) input.classList.add('has-error');
    if (errorEl) {
      errorEl.textContent = errors[field];
      errorEl.classList.add('visible');
    }
  });
}

function clearFormErrors() {
  document.querySelectorAll('.form-input').forEach(i => i.classList.remove('has-error'));
  document.querySelectorAll('.field-error').forEach(e => {
    e.textContent = '';
    e.classList.remove('visible');
  });
}

function autofillDemoCheckout() {
  document.getElementById('checkout-fullname').value = DEMO_USER.fullName;
  document.getElementById('checkout-email').value = DEMO_USER.email;
  document.getElementById('checkout-phone').value = DEMO_USER.phone;
  document.getElementById('checkout-address').value = DEMO_USER.address;
  document.getElementById('checkout-city').value = DEMO_USER.city;
  document.getElementById('checkout-postcode').value = DEMO_USER.postcode;
  document.getElementById('checkout-cardnumber').value = DEMO_USER.cardNumber;
  document.getElementById('checkout-cardholder').value = DEMO_USER.cardHolder;
  document.getElementById('checkout-cardexpiry').value = DEMO_USER.cardExpiry;
  document.getElementById('checkout-cardcvv').value = DEMO_USER.cardCvv;

  clearFormErrors();
  showToast('Test sample delivery & payment info autofilled!', 'info');
}

/* ==========================================================================
   Order History Modal
   ========================================================================== */
function openOrderHistory() {
  state.activeModal = 'orders';
  const orders = Storage.getOrders();

  if (orders.length === 0) {
    DOM.ordersListContainer.innerHTML = `
      <div class="empty-state" style="padding: 3rem 1.5rem;">
        <div class="empty-state-icon">📦</div>
        <h3>No Past Orders Found</h3>
        <p>Once you complete a mock checkout, your order receipts will be stored here in your browser.</p>
        <button type="button" class="btn btn-primary" id="btn-orders-shop-now">Explore Products</button>
      </div>
    `;
    document.getElementById('btn-orders-shop-now')?.addEventListener('click', closeOrderHistory);
  } else {
    DOM.ordersListContainer.innerHTML = orders.map(order => `
      <div class="order-receipt-card" style="margin-bottom:1.25rem;">
        <div style="display:flex; justify-content:space-between; flex-wrap:wrap; gap:0.5rem; margin-bottom:0.75rem; border-bottom:1px solid var(--color-border); padding-bottom:0.5rem;">
          <div>
            <strong style="color:var(--color-brand-primary);">${order.orderId}</strong>
            <span style="display:inline-block; margin-left:0.5rem; font-size:0.75rem; padding:0.15rem 0.5rem; background:var(--color-success-bg); color:var(--color-success); border-radius:4px; font-weight:bold;">
              ${order.status}
            </span>
          </div>
          <div style="font-size:0.85rem; color:var(--color-text-muted);">
            ${order.formattedDate}
          </div>
        </div>

        <p style="font-size:0.85rem; margin-bottom:0.5rem;">
          <strong>Delivered to:</strong> ${order.customer.fullName} (${order.customer.address})
        </p>

        <ul style="list-style:none; display:flex; flex-direction:column; gap:0.35rem; font-size:0.85rem; margin-bottom:0.75rem;">
          ${order.items.map(i => `
            <li style="display:flex; justify-content:space-between;">
              <span>${i.quantity} × ${i.name}</span>
              <span>Rs. ${i.totalPrice.toFixed(2)}</span>
            </li>
          `).join('')}
        </ul>

        <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid var(--color-border); padding-top:0.5rem;">
          <span style="font-size:0.85rem; color:var(--color-text-muted);">
            Payment: Mock Card (•••• ${order.payment.last4})
          </span>
          <strong style="font-size:1.1rem; color:var(--color-text-primary);">
            Rs. ${order.financials.grandTotal.toFixed(2)}
          </strong>
        </div>
      </div>
    `).join('');
  }

  DOM.ordersOverlay.classList.add('open');
  DOM.ordersOverlay.setAttribute('aria-hidden', 'false');
  DOM.ordersCloseBtn?.focus();
  announce('Order history modal opened.');
}

function closeOrderHistory() {
  state.activeModal = null;
  DOM.ordersOverlay.classList.remove('open');
  DOM.ordersOverlay.setAttribute('aria-hidden', 'true');
  DOM.ordersToggleBtn?.focus();
}

/* ==========================================================================
   Store Reset (Demo Reset to Fresh 10 Products)
   ========================================================================== */
function resetStoreData() {
  if (confirm('Reset store back to fresh state? This replenishes all 10 products to full initial stock and clears the shopping basket.')) {
    Storage.resetStore(true);
    Cart.clearPromo();
    renderCategoryPills();
    renderProductCatalog();
    updateCartUI();
    showToast('Store inventory and cart reset to fresh initial state.', 'success');
  }
}

/* ==========================================================================
   Global Event Handlers & Initialization
   ========================================================================== */
function initEventListeners() {
  // Search input live filtering with clear button
  let debounceTimer;
  DOM.searchInput?.addEventListener('input', (e) => {
    clearTimeout(debounceTimer);
    const val = e.target.value;
    DOM.searchClearBtn?.classList.toggle('visible', val.length > 0);
    debounceTimer = setTimeout(() => {
      state.searchQuery = val;
      renderProductCatalog();
    }, 200);
  });

  DOM.searchClearBtn?.addEventListener('click', () => {
    DOM.searchInput.value = '';
    DOM.searchClearBtn.classList.remove('visible');
    state.searchQuery = '';
    renderProductCatalog();
    DOM.searchInput.focus();
  });

  // Sort dropdown
  DOM.sortSelect?.addEventListener('change', (e) => {
    state.sortBy = e.target.value;
    renderProductCatalog();
  });

  // In-stock toggle
  DOM.inStockToggle?.addEventListener('change', (e) => {
    state.inStockOnly = e.target.checked;
    renderProductCatalog();
  });

  // Cart Drawer toggles
  DOM.cartToggleBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    openCart();
  });
  DOM.cartCloseBtn?.addEventListener('click', closeCart);
  DOM.cartOverlay?.addEventListener('click', (e) => {
    if (e.target === DOM.cartOverlay) closeCart();
  });
  DOM.cartCheckoutBtn?.addEventListener('click', openCheckout);

  // Promo Code submission
  DOM.promoApplyBtn?.addEventListener('click', () => {
    const val = DOM.promoInput.value;
    const res = Cart.setPromo(val);
    if (res.success) {
      showToast(res.message, 'success');
      DOM.promoInput.value = '';
    } else {
      showToast(res.message, 'warning');
    }
    updateCartUI();
  });

  // Quick View Modal
  DOM.quickViewCloseBtn?.addEventListener('click', closeQuickView);
  DOM.quickViewOverlay?.addEventListener('click', (e) => {
    if (e.target === DOM.quickViewOverlay) closeQuickView();
  });

  // Checkout Modal
  DOM.checkoutCloseBtn?.addEventListener('click', closeCheckout);
  DOM.checkoutOverlay?.addEventListener('click', (e) => {
    if (e.target === DOM.checkoutOverlay) closeCheckout();
  });
  DOM.checkoutNextBtn?.addEventListener('click', handleCheckoutNext);
  DOM.checkoutPrevBtn?.addEventListener('click', handleCheckoutPrev);
  DOM.checkoutForm?.addEventListener('submit', handleCheckoutSubmit);
  DOM.btnAutofillDemo?.addEventListener('click', autofillDemoCheckout);

  // My Offers in Navigation Bar
  DOM.offersToggleBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    (document.getElementById('deals-section') || document.getElementById('catalog-section'))?.scrollIntoView({ behavior: 'smooth' });
  });

  // Orders History in Navigation Bar
  DOM.ordersToggleBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    openOrderHistory();
  });
  DOM.ordersCloseBtn?.addEventListener('click', closeOrderHistory);
  DOM.ordersOverlay?.addEventListener('click', (e) => {
    if (e.target === DOM.ordersOverlay) closeOrderHistory();
  });

  // Reset Store button
  DOM.resetStoreBtn?.addEventListener('click', resetStoreData);

  // Global Keyboard Shortcuts
  window.addEventListener('keydown', (e) => {
    // Escape closes any active overlay
    if (e.key === 'Escape') {
      if (state.activeModal === 'cart') closeCart();
      if (state.activeModal === 'quick-view') closeQuickView();
      if (state.activeModal === 'checkout') closeCheckout();
      if (state.activeModal === 'orders') closeOrderHistory();
    }
    // '/' key focuses search bar when not already typing
    if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
      e.preventDefault();
      DOM.searchInput?.focus();
    }
  });

  // Storage and Inventory sync events
  window.addEventListener('shopease:inventory-updated', () => {
    renderProductCatalog();
  });

  window.addEventListener('shopease:cart-updated', () => {
    updateCartUI();
  });

  window.addEventListener('shopease:auth-changed', () => {
    renderUserMenu();
    renderUserWelcomeBanner();
  });

  // Check if URL specifies auto-opening checkout
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('open') === 'checkout') {
    setTimeout(() => {
      openCheckout();
    }, 350);
  }
}

/**
 * Renders Navigation Bar actions dynamically:
 * When NOT logged in: Shows About Us, Sign In, Register.
 * When LOGGED IN: Shows Customer Dashboard, My Offers, Basket, My Orders, Logout.
 */
function renderNavBar() {
  const container = document.getElementById('main-nav-actions');
  if (!container) return;

  const user = Auth.getCurrentUser();

  if (!user) {
    container.innerHTML = `
      <a href="login.html" class="nav-btn nav-btn-ghost" id="nav-login-btn" aria-label="Sign in to your account" title="Sign In">
        <span>Sign In</span>
      </a>
      <a href="register.html" class="nav-btn nav-btn-primary" id="nav-register-btn" aria-label="Create new account" title="Register">
        <span>Register</span>
      </a>
    `;
    return;
  }

  const isAdmin = user && user.role === 'Admin';
  container.innerHTML = `
    ${isAdmin ? `
      <a href="admin-dashboard.html" class="nav-btn nav-btn-primary" id="nav-admin-btn" aria-label="Admin Dashboard" title="Open Admin Console" style="background:var(--color-brand-primary); color:#ffffff; font-weight:600;">
        <span>🛡️ Admin Console</span>
      </a>
    ` : `
      <a href="customer-dashboard.html" class="nav-btn nav-btn-dashboard" id="nav-dashboard-btn" aria-label="Customer Dashboard" title="View Customer Dashboard">
        <span>👤 Dashboard</span>
      </a>
    `}

    <button 
      type="button" 
      id="orders-toggle-btn" 
      class="nav-btn nav-btn-ghost" 
      aria-label="View past orders"
      title="View order history"
    >
      <span>Orders</span>
    </button>

    <button 
      type="button" 
      id="nav-logout-btn" 
      class="nav-btn nav-btn-danger" 
      aria-label="Sign out of account"
      title="Sign Out"
    >
      <span>Logout</span>
    </button>
  `;

  // Attach event handlers for authenticated dynamic buttons
  document.getElementById('orders-toggle-btn')?.addEventListener('click', openOrderHistory);
  document.getElementById('nav-logout-btn')?.addEventListener('click', () => {
    Auth.logout();
    showToast('Signed out successfully.', 'info');
    renderNavBar();
    renderUserWelcomeBanner();
  });
}

const renderUserMenu = renderNavBar;

// Global Interaction Helpers for Home Page
window.shopeaseFilterCategory = (category) => {
  const btn = document.querySelector(`.category-pill-btn[data-category="${category}"]`);
  if (btn) {
    btn.click();
  } else {
    state.selectedCategory = category;
    renderCategoryPills();
    renderProductCatalog();
  }
  document.getElementById('catalog-section')?.scrollIntoView({ behavior: 'smooth' });
};

window.shopeaseApplyVoucher = (code) => {
  const res = Cart.setPromo(code);
  if (res.success) {
    showToast(`Voucher "${code}" applied to your cart!`, 'success');
    announce(`Promotional code ${code} applied.`);
    updateCartUI();
    openCart();
  } else {
    showToast(res.message, 'warning');
  }
};

window.shopeaseQuickAdd = (productId) => {
  if (!Auth.isLoggedIn()) {
    showToast('Please sign in to add items to your shopping cart. Redirecting to login...', 'warning');
    announce('Please sign in to your account to add items to the cart.');
    setTimeout(() => {
      window.location.href = 'login.html?redirect=index.html';
    }, 950);
    return;
  }
  const res = Cart.addItem(productId, 1);
  if (res.success) {
    showToast(res.message, 'success');
    triggerCartBadgePulse();
    openCart();
  } else {
    showToast(res.message, 'warning');
  }
};

window.shopeaseOpenQuickView = (productId) => {
  openQuickView(productId);
};

/* ==========================================================================
   Hero Dynamic Image Carousel (Editorial Motion Commerce)
   ========================================================================== */
const HERO_SLIDES = [
  {
    productId: 'prod-01',
    name: 'Artisan Organic Sourdough Loaf',
    category: 'Food & Gourmet',
    price: 650.00,
    unit: '800g loaf',
    image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=1200&q=85',
    editionTag: 'Issue No. 10 • Heritage Baking',
    headlineLead: 'Wild Yeast.',
    headlineAccent: 'Artisan Loaf.',
    tagline: '36-hour cold fermentation with stoneground heritage flours and pure spring water. Crisp blistered crust with deep complex flavor.'
  },
  {
    productId: 'prod-05',
    name: 'Vintage Washed Denim Trucker Jacket',
    category: 'Clothing & Apparel',
    price: 6800.00,
    unit: 'Unisex Classic Fit',
    image: 'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?auto=format&fit=crop&w=1200&q=85',
    editionTag: 'Workwear Archive • Issue No. 10',
    headlineLead: 'Raw Heritage.',
    headlineAccent: 'Tailored Indigo.',
    tagline: 'Crafted from 13.5oz organic cotton twill washed to an authentic lived-in patina with branded antique brass hardware.'
  },
  {
    productId: 'prod-09',
    name: 'AcousticPro Hybrid ANC Wireless Headphones',
    category: 'Electronics & Tech',
    price: 19900.00,
    unit: 'Over-Ear Foldable',
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1200&q=85',
    editionTag: 'Acoustic Engineering • Studio Edition',
    headlineLead: 'Pure Silence.',
    headlineAccent: 'Studio Fidelity.',
    tagline: 'Hybrid active noise cancellation neutralizing 38dB of ambient noise with 40mm titanium-coated biocellulose diaphragms.'
  },
  {
    productId: 'prod-02',
    name: 'Single-Estate Ethiopian Yirgacheffe Coffee',
    category: 'Food & Gourmet',
    price: 2900.00,
    unit: '500g whole bean',
    image: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?auto=format&fit=crop&w=1200&q=85',
    editionTag: 'Direct Trade • High Altitude',
    headlineLead: 'Sun-Drenched.',
    headlineAccent: 'Floral Bergamot.',
    tagline: 'Hand-picked washed Arabica grown at 2,000m altitude. Vibrant floral notes of jasmine, bergamot, and sweet Meyer lemon.'
  }
];

let currentHeroIndex = 0;
let heroAutoplayTimer = null;
let heroIsPlaying = true;

function showHeroSlide(index) {
  currentHeroIndex = (index + HERO_SLIDES.length) % HERO_SLIDES.length;
  const slide = HERO_SLIDES[currentHeroIndex];
  const storedProduct = Storage.getProductById(slide.productId);
  const product = storedProduct || slide;

  // Update Hero Image with tasteful transition
  const stage = document.getElementById('hero-image-stage');
  if (stage) {
    let img = stage.querySelector('.hero-stage-img');
    if (img) {
      img.classList.add('fade-transition');
      setTimeout(() => {
        img.src = product.image || slide.image;
        img.alt = product.name;
        img.classList.remove('fade-transition');
      }, 150);
    } else {
      stage.innerHTML = `<img src="${product.image || slide.image}" alt="${escapeHtml(product.name)}" class="hero-stage-img" loading="eager" />`;
    }
  }

  // Update Floating Product Pill
  const titleEl = document.getElementById('hero-card-title');
  const catEl = document.getElementById('hero-card-category');
  const priceEl = document.getElementById('hero-card-price');
  const quickBtn = document.getElementById('hero-card-quick-btn');

  if (titleEl) titleEl.textContent = product.name;
  if (catEl) catEl.textContent = product.category;
  if (priceEl) priceEl.textContent = `Rs. ${product.price.toFixed(2)}`;
  if (quickBtn) {
    quickBtn.onclick = (e) => {
      e.preventDefault();
      openQuickView(product.id || slide.productId);
    };
  }

  // Update Numbering & Progress
  const numEl = document.getElementById('hero-slide-num');
  const totalEl = document.getElementById('hero-total-slides');
  const progressFill = document.getElementById('hero-progress-fill');

  if (numEl) numEl.textContent = String(currentHeroIndex + 1).padStart(2, '0');
  if (totalEl) totalEl.textContent = String(HERO_SLIDES.length).padStart(2, '0');
  if (progressFill) {
    const pct = ((currentHeroIndex + 1) / HERO_SLIDES.length) * 100;
    progressFill.style.width = `${pct}%`;
  }

  // Update Dot Indicator Pills
  document.querySelectorAll('.hero-dot-btn').forEach((dot, idx) => {
    const isActive = idx === currentHeroIndex;
    dot.classList.toggle('active', isActive);
    dot.setAttribute('aria-current', isActive ? 'true' : 'false');
  });
}

function nextHeroSlide() {
  showHeroSlide(currentHeroIndex + 1);
}

function prevHeroSlide() {
  showHeroSlide(currentHeroIndex - 1);
}

function startHeroAutoplay() {
  stopHeroAutoplay();
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) {
    heroIsPlaying = false;
    updateHeroPlayPauseBtn();
    return;
  }
  heroAutoplayTimer = setInterval(() => {
    nextHeroSlide();
  }, 5500);
  heroIsPlaying = true;
  updateHeroPlayPauseBtn();
}

function stopHeroAutoplay() {
  if (heroAutoplayTimer) {
    clearInterval(heroAutoplayTimer);
    heroAutoplayTimer = null;
  }
  heroIsPlaying = false;
  updateHeroPlayPauseBtn();
}

function updateHeroPlayPauseBtn() {
  const btn = document.getElementById('hero-play-pause-btn');
  if (!btn) return;
  btn.innerHTML = heroIsPlaying ? '⏸' : '▶';
  btn.setAttribute('aria-label', heroIsPlaying ? 'Pause hero slideshow' : 'Play hero slideshow');
  btn.setAttribute('title', heroIsPlaying ? 'Pause slideshow' : 'Play slideshow');
}

function initHeroSlider() {
  showHeroSlide(0);

  document.getElementById('hero-prev-btn')?.addEventListener('click', () => {
    prevHeroSlide();
    announce(`Hero slide: ${HERO_SLIDES[currentHeroIndex].name}`);
  });

  document.getElementById('hero-next-btn')?.addEventListener('click', () => {
    nextHeroSlide();
    announce(`Hero slide: ${HERO_SLIDES[currentHeroIndex].name}`);
  });

  document.getElementById('hero-play-pause-btn')?.addEventListener('click', () => {
    if (heroIsPlaying) {
      stopHeroAutoplay();
      announce('Hero image slideshow paused.');
    } else {
      startHeroAutoplay();
      announce('Hero image slideshow resumed.');
    }
  });

  const heroStage = document.getElementById('hero-stage-wrapper');
  heroStage?.addEventListener('mouseenter', () => {
    if (heroIsPlaying && heroAutoplayTimer) clearInterval(heroAutoplayTimer);
  });
  heroStage?.addEventListener('mouseleave', () => {
    if (heroIsPlaying) startHeroAutoplay();
  });

  document.querySelectorAll('.hero-dot-btn').forEach((dot, idx) => {
    dot.addEventListener('click', () => {
      showHeroSlide(idx);
    });
  });

  startHeroAutoplay();
}

/* ==========================================================================
   Interactive Product Spotlight (Editorial Exhibition)
   ========================================================================== */
const SPOTLIGHT_IDS = ['prod-09', 'prod-06', 'prod-10', 'prod-03'];
let currentSpotlightIndex = 0;

function renderProductSpotlight() {
  const container = document.getElementById('spotlight-container');
  if (!container) return;

  const products = Storage.getProducts();
  const currentId = SPOTLIGHT_IDS[currentSpotlightIndex];
  const product = products.find(p => p.id === currentId) || products[0];
  if (!product) return;

  const isOutOfStock = product.stock <= 0;
  const isLowStock = product.stock > 0 && product.stock <= 4;
  const stars = '★'.repeat(Math.floor(product.rating)) + (product.rating % 1 >= 0.5 ? '½' : '');

  const stockBadge = isOutOfStock
    ? `<span class="badge badge-stock-out">Out of Stock</span>`
    : isLowStock
      ? `<span class="badge badge-stock-low">Only ${product.stock} left in stock</span>`
      : `<span class="badge badge-stock-in">${product.stock} available in inventory</span>`;

  container.innerHTML = `
    <div class="spotlight-card">
      <div class="spotlight-media-col">
        <div class="spotlight-image-wrapper">
          <img 
            src="${product.image}" 
            alt="${escapeHtml(product.name)}" 
            class="spotlight-img"
            loading="lazy"
          />
          <div class="spotlight-media-badge">
            <span class="spotlight-edition-tag">Featured Studio Selection</span>
          </div>
        </div>
      </div>
      <div class="spotlight-info-col">
        <div class="spotlight-header-meta">
          <span class="spotlight-step-tag">Exhibit 0${currentSpotlightIndex + 1} / 0${SPOTLIGHT_IDS.length}</span>
          <span class="badge badge-category">${product.category}</span>
        </div>

        <h3 class="spotlight-title">${escapeHtml(product.name)}</h3>

        <div class="card-rating" style="margin-bottom:0.85rem;" aria-label="Rating: ${product.rating} stars">
          <span>${stars}</span>
          <strong>${product.rating.toFixed(1)}</strong>
          <span class="review-count">(${product.reviewsCount} customer reviews)</span>
        </div>

        <p class="spotlight-description">${escapeHtml(product.description)}</p>

        <div class="spotlight-specs-box">
          <h4 class="spotlight-specs-title">Craft Highlights &amp; Specifications:</h4>
          <ul class="spotlight-specs-list">
            ${(product.features || []).slice(0, 3).map(f => `<li>${escapeHtml(f)}</li>`).join('')}
          </ul>
        </div>

        <div class="spotlight-purchase-row">
          <div class="spotlight-price-box">
            <span class="spotlight-price">Rs. ${product.price.toFixed(2)}</span>
            <span class="spotlight-unit">${escapeHtml(product.unit)}</span>
          </div>
          <div class="spotlight-stock-status">
            ${stockBadge}
          </div>
        </div>

        <div class="spotlight-actions">
          <button 
            type="button" 
            class="btn btn-editorial-primary spotlight-add-btn" 
            data-spotlight-add="${product.id}"
            ${isOutOfStock ? 'disabled aria-disabled="true"' : ''}
          >
            <span>${isOutOfStock ? 'Currently Out of Stock' : 'Add to Shopping Basket →'}</span>
          </button>
          <button 
            type="button" 
            class="btn btn-editorial-secondary spotlight-quick-btn" 
            data-spotlight-quick="${product.id}"
          >
            View Full Specs
          </button>
        </div>
      </div>
    </div>
  `;

  container.querySelector('.spotlight-add-btn')?.addEventListener('click', () => {
    if (!Auth.isLoggedIn()) {
      showToast('Please sign in to add items to your shopping cart. Redirecting to login...', 'warning');
      announce('Please sign in to your account to add items to the cart.');
      setTimeout(() => {
        window.location.href = 'login.html?redirect=index.html';
      }, 950);
      return;
    }
    const res = Cart.addItem(product.id, 1);
    if (res.success) {
      showToast(res.message, 'success');
      triggerCartBadgePulse();
    } else {
      showToast(res.message, 'warning');
    }
  });

  container.querySelector('.spotlight-quick-btn')?.addEventListener('click', () => {
    openQuickView(product.id);
  });
}

function initProductSpotlight() {
  const container = document.getElementById('spotlight-container');
  if (!container) return;
  renderProductSpotlight();

  document.getElementById('spotlight-prev-btn')?.addEventListener('click', () => {
    currentSpotlightIndex = (currentSpotlightIndex - 1 + SPOTLIGHT_IDS.length) % SPOTLIGHT_IDS.length;
    renderProductSpotlight();
    announce(`Spotlight exhibit changed to item ${currentSpotlightIndex + 1}`);
  });

  document.getElementById('spotlight-next-btn')?.addEventListener('click', () => {
    currentSpotlightIndex = (currentSpotlightIndex + 1) % SPOTLIGHT_IDS.length;
    renderProductSpotlight();
    announce(`Spotlight exhibit changed to item ${currentSpotlightIndex + 1}`);
  });
}

/* ==========================================================================
   Promotions, Brands & Discounts Swapping Deck Controller
   ========================================================================== */
function initCinematicMediaStrip() {
  const strip = document.getElementById('cinematic-strip');
  const btn = document.getElementById('video-motion-btn');
  if (!strip) return;

  const deck = document.getElementById('promo-swap-deck');
  const cards = Array.from(document.querySelectorAll('.promo-card'));
  const dots = Array.from(document.querySelectorAll('.promo-dot'));
  const prevBtn = document.getElementById('promo-prev-btn');
  const nextBtn = document.getElementById('promo-next-btn');

  let currentCardIndex = 0;
  let isPaused = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let autoSwapTimer = null;
  let isHovered = false;

  function updateDeckClasses() {
    if (!cards.length) return;
    const total = cards.length;

    cards.forEach((card, i) => {
      let diff = (i - currentCardIndex + total) % total;
      if (diff > total / 2) diff -= total;

      card.classList.remove('card-active', 'card-next', 'card-prev', 'card-far-right', 'card-far-left');

      if (diff === 0) {
        card.classList.add('card-active');
        card.setAttribute('aria-hidden', 'false');
      } else if (diff === 1) {
        card.classList.add('card-next');
        card.setAttribute('aria-hidden', 'true');
      } else if (diff === -1) {
        card.classList.add('card-prev');
        card.setAttribute('aria-hidden', 'true');
      } else if (diff > 1) {
        card.classList.add('card-far-right');
        card.setAttribute('aria-hidden', 'true');
      } else {
        card.classList.add('card-far-left');
        card.setAttribute('aria-hidden', 'true');
      }
    });

    dots.forEach((dot, idx) => {
      const isActive = idx === currentCardIndex;
      dot.classList.toggle('active', isActive);
      dot.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });
  }

  function goToCard(idx) {
    if (!cards.length) return;
    currentCardIndex = (idx + cards.length) % cards.length;
    updateDeckClasses();
    const activeTitle = cards[currentCardIndex]?.querySelector('.promo-card-title')?.textContent || `Promotion ${currentCardIndex + 1}`;
    announce(`Showing promotion: ${activeTitle}`);
  }

  function startAutoSwap() {
    stopAutoSwap();
    if (isPaused || isHovered) return;
    autoSwapTimer = setInterval(() => {
      goToCard(currentCardIndex + 1);
    }, 4200);
  }

  function stopAutoSwap() {
    if (autoSwapTimer) {
      clearInterval(autoSwapTimer);
      autoSwapTimer = null;
    }
  }

  function resetAutoSwap() {
    stopAutoSwap();
    startAutoSwap();
  }

  if (prevBtn) {
    prevBtn.addEventListener('click', (e) => {
      e.preventDefault();
      goToCard(currentCardIndex - 1);
      resetAutoSwap();
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', (e) => {
      e.preventDefault();
      goToCard(currentCardIndex + 1);
      resetAutoSwap();
    });
  }

  dots.forEach((dot, idx) => {
    dot.addEventListener('click', () => {
      goToCard(idx);
      resetAutoSwap();
    });
  });

  cards.forEach((card) => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('button') || e.target.closest('a') || e.target.closest('.promo-code-btn')) {
        return;
      }
      if (card.classList.contains('card-next')) {
        goToCard(currentCardIndex + 1);
        resetAutoSwap();
      } else if (card.classList.contains('card-prev')) {
        goToCard(currentCardIndex - 1);
        resetAutoSwap();
      }
    });
  });

  if (deck) {
    deck.addEventListener('mouseenter', () => {
      isHovered = true;
      stopAutoSwap();
    });
    deck.addEventListener('mouseleave', () => {
      isHovered = false;
      startAutoSwap();
    });
    deck.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        goToCard(currentCardIndex + 1);
        resetAutoSwap();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goToCard(currentCardIndex - 1);
        resetAutoSwap();
      }
    });
  }

  // Live Countdown Timer Engine
  const timeElements = document.querySelectorAll('.timer-digits');
  if (timeElements.length) {
    setInterval(() => {
      timeElements.forEach((el) => {
        let remaining = parseInt(el.getAttribute('data-countdown') || '14400', 10);
        remaining = Math.max(0, remaining - 1);
        el.setAttribute('data-countdown', String(remaining));
        const hours = String(Math.floor(remaining / 3600)).padStart(2, '0');
        const mins = String(Math.floor((remaining % 3600) / 60)).padStart(2, '0');
        const secs = String(remaining % 60).padStart(2, '0');
        el.textContent = `${hours}:${mins}:${secs}`;
      });
    }, 1000);
  }

  // Reduced motion initial check
  if (btn) {
    if (isPaused) {
      strip.classList.add('is-paused');
      btn.setAttribute('aria-pressed', 'true');
      btn.innerHTML = '<span>▶ Resume Visual Motion</span>';
    } else {
      startAutoSwap();
    }

    btn.addEventListener('click', () => {
      isPaused = !isPaused;
      strip.classList.toggle('is-paused', isPaused);
      btn.setAttribute('aria-pressed', isPaused ? 'true' : 'false');
      btn.innerHTML = isPaused ? '<span>▶ Resume Visual Motion</span>' : '<span>⏸ Pause Visual Motion</span>';
      if (isPaused) {
        stopAutoSwap();
      } else {
        startAutoSwap();
      }
      announce(isPaused ? 'Visual motion paused.' : 'Visual motion resumed.');
      showToast(isPaused ? 'Visual motion paused' : 'Visual motion resumed', 'info');
    });
  } else {
    if (isPaused) {
      strip.classList.add('is-paused');
    } else {
      startAutoSwap();
    }
  }

  updateDeckClasses();
}

/* ==========================================================================
   Mobile Navigation Drawer Controller
   ========================================================================== */
function initMobileMenu() {
  const menuBtn = document.getElementById('mobile-menu-btn');
  const closeBtn = document.getElementById('mobile-menu-close-btn');
  const drawer = document.getElementById('mobile-menu-drawer');
  if (!menuBtn || !drawer) return;

  function openMenu() {
    drawer.classList.add('open');
    drawer.setAttribute('aria-hidden', 'false');
    menuBtn.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
    closeBtn?.focus();
    announce('Mobile navigation opened.');
  }

  function closeMenu() {
    drawer.classList.remove('open');
    drawer.setAttribute('aria-hidden', 'true');
    menuBtn.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    menuBtn.focus();
  }

  menuBtn.addEventListener('click', openMenu);
  closeBtn?.addEventListener('click', closeMenu);
  drawer.addEventListener('click', (e) => {
    if (e.target === drawer) closeMenu();
  });

  drawer.querySelectorAll('a, button:not(#mobile-menu-close-btn)').forEach(el => {
    el.addEventListener('click', () => {
      closeMenu();
    });
  });
}

/**
 * Renders Authenticated Member Welcome Banner above catalog
 */
function renderUserWelcomeBanner() {
  const container = document.getElementById('user-welcome-slot');
  if (!container) return;

  const user = Auth.getCurrentUser();
  if (!user) {
    container.innerHTML = '';
    return;
  }

  const initials = user.fullName
    .split(' ')
    .filter(Boolean)
    .map(p => p[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  container.innerHTML = `
    <div class="user-welcome-banner" role="region" aria-label="Authenticated customer session">
      <div class="user-welcome-left">
        <div class="user-welcome-avatar" aria-hidden="true">${initials}</div>
        <div>
          <div class="user-welcome-title">
            👋 Welcome back, <strong>${escapeHtml(user.fullName)}</strong>!
          </div>
          <div class="user-welcome-subtitle">
            Signed in as <strong>${escapeHtml(user.email)}</strong> • Exclusive member discounts & fast checkout active
          </div>
        </div>
      </div>
      <div class="user-welcome-actions">
        <button type="button" class="btn btn-secondary" style="font-size:0.85rem; padding:0.4rem 0.85rem;" onclick="document.getElementById('orders-toggle-btn')?.click()">
          📦 Past Orders
        </button>
        <button type="button" class="btn btn-secondary" style="font-size:0.85rem; padding:0.4rem 0.85rem;" id="banner-signout-btn">
          🚪 Sign Out
        </button>
      </div>
    </div>
  `;

  document.getElementById('banner-signout-btn')?.addEventListener('click', () => {
    Auth.logout();
    showToast('Signed out successfully.', 'info');
    renderUserMenu();
    renderUserWelcomeBanner();
  });
}

// Initial App Boot
document.addEventListener('DOMContentLoaded', () => {
  initAccessibilitySettings();

  // Show full home page and product catalog first
  renderUserMenu();
  renderUserWelcomeBanner();
  renderCategoryPills();
  renderProductCatalog();
  updateCartUI();
  initEventListeners();

  // Initialize Editorial Motion Commerce components
  initHeroSlider();
  initProductSpotlight();
  initCinematicMediaStrip();
  initMobileMenu();

  // Handle incoming deep links (e.g. from Dashboard or Login redirect)
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const openParam = urlParams.get('open');
    if (openParam === 'checkout') {
      const cart = Cart.getCart();
      if (cart && cart.length > 0) {
        setTimeout(() => openCheckoutModal(), 250);
      } else {
        setTimeout(() => {
          openCartDrawer();
          showToast('Your shopping basket is empty. Add products before proceeding to checkout.', 'info');
        }, 250);
      }
    } else if (openParam === 'cart') {
      setTimeout(() => openCartDrawer(), 250);
    }
  } catch (err) {
    console.debug('Deep link parsing:', err);
  }

  // Newsletter Form Handler
  document.getElementById('newsletter-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = document.getElementById('newsletter-email');
    if (input && input.value.trim()) {
      showToast('Thank you for subscribing! Check your mock inbox for exclusive updates.', 'success');
      announce('Subscribed to ShopEase newsletter.');
      input.value = '';
    }
  });
});

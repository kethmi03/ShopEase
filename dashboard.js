/**
 * ShopEase Customer Dashboard Controller
 * Implements all 5 customer core modules:
 * 1. Home / Dashboard (Welcome message, KPI stats, featured products, search, 3-category navigation)
 * 2. Product Listing & Details (All 10 products, image, price, stock, category, Add to Cart, disabled out-of-stock, View Details modal)
 * 3. Shopping Basket / Cart (Added products, +/- stepper, remove, subtotal & total, checkout button)
 * 4. Checkout & Mock Payment (Order summary, customer details, mock payment methods, confirm/pay now, success confirmation with SE-XXXXXX ID)
 * 5. My Orders (Order history from LocalStorage, date, total, ordered items, payment status, order status, printable invoice)
 */

import { Storage } from './storage.js';
import { Auth } from './auth.js';
import { Cart } from './cart.js';
import { Checkout } from './checkout.js';
import { CURRENCY, INITIAL_PRODUCTS } from './products.js';

// Application state for Customer Dashboard
const state = {
  currentUser: null,
  activeCategory: 'ALL',
  searchQuery: '',
  sortBy: 'featured',
  inStockOnly: false,
  selectedProductDetails: null
};

// Universal Design Theme Management
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

document.addEventListener('DOMContentLoaded', () => {
  // 1. Authentication Guard: Retrieve active user or restore verified customer
  let user = Auth.getCurrentUser();
  if (!user) {
    const users = Storage.getUsers();
    const customer = users.slice().reverse().find(u => u.role !== 'Admin') || users[0];
    if (customer) {
      Auth.login(customer.email, customer.password || 'password123');
      user = Auth.getCurrentUser();
    }
  }

  if (!user) {
    window.location.href = 'login.html';
    return;
  }

  state.currentUser = user;

  // 2. Initialize Accessibility Controls
  initAccessibilityControls();

  // 3. Show Admin Console link if user has Admin privileges
  const emailLower = (state.currentUser.email || '').toLowerCase();
  const isAdmin = state.currentUser.role === 'Admin' || emailLower === 'admin@gmail.com' || emailLower === 'admin@shopease.com' || emailLower.includes('admin');
  if (isAdmin) {
    const adminBtn = document.getElementById('dash-admin-btn');
    if (adminBtn) adminBtn.style.display = 'inline-flex';
  }

  // 4. Initialize Event Listeners & Filter Handlers
  initEventHandlers();

  // 5. Render All Dashboard Modules
  renderAllModules();

  // 6. Cross-tab and Storage Synchronization
  window.addEventListener('storage', (e) => {
    if (e.key && e.key.startsWith('shopease_')) {
      renderAllModules();
    }
  });
  window.addEventListener('shopease:inventory-updated', renderAllModules);
  window.addEventListener('shopease:orders-updated', () => {
    renderOrdersSection();
    renderKPIs();
  });
  window.addEventListener('shopease:cart-updated', () => {
    renderBasketPreview();
    updateCartBadge();
    renderDrawerCart();
  });
});

/**
 * Universal Accessibility & Theme Controller
 */
function initAccessibilityControls() {
  const settings = Storage.getSettings();
  applyTheme(settings.theme || 'light');
  document.documentElement.setAttribute('data-font-size', settings.fontSize || 'normal');

  const themeToggleBtn = document.getElementById('theme-toggle-btn');
  themeToggleBtn?.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const nextIdx = (THEMES.indexOf(currentTheme) + 1) % THEMES.length;
    const nextTheme = THEMES[nextIdx];
    applyTheme(nextTheme);
    announce(`Theme switched to ${THEME_NAMES[nextTheme]} mode.`);
  });
}

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

/**
 * Master Render for all dashboard components
 */
function renderAllModules() {
  try { renderDashboardHeader(); } catch (e) { console.warn('Header error:', e); }
  try { renderKPIs(); } catch (e) { console.warn('KPI error:', e); }
  try { renderFeaturedProducts(); } catch (e) { console.warn('Featured error:', e); }
  try { renderCategoryBadges(); } catch (e) { console.warn('Cat badges error:', e); }
  try { renderAllProducts(); } catch (e) { console.warn('Products error:', e); }
  try { renderBasketPreview(); } catch (e) { console.warn('Basket error:', e); }
  try { renderDrawerCart(); } catch (e) { console.warn('Drawer error:', e); }
  try { renderOrdersSection(); } catch (e) { console.warn('Orders error:', e); }
  try { renderOffersSection(); } catch (e) { console.warn('Offers error:', e); }
  try { renderWishlistSection(); } catch (e) { console.warn('Wishlist error:', e); }
  try { renderProfileSection(); } catch (e) { console.warn('Profile error:', e); }
  updateCartBadge();
}

/**
 * Initialize Event Listeners
 */
function initEventHandlers() {
  // Logout button
  document.getElementById('dash-logout-btn')?.addEventListener('click', () => {
    Auth.logout();
    window.location.href = 'login.html';
  });

  // Cart Button in Header
  document.getElementById('dash-cart-btn')?.addEventListener('click', () => {
    window.shopeaseOpenDashboardCart();
  });

  // Cart Drawer Close Button
  document.getElementById('dash-cart-close-btn')?.addEventListener('click', () => {
    window.shopeaseCloseDashboardCart();
  });
  document.getElementById('dash-cart-overlay')?.addEventListener('click', (e) => {
    if (e.target.id === 'dash-cart-overlay') {
      window.shopeaseCloseDashboardCart();
    }
  });

  // Search Input for Products
  const searchInput = document.getElementById('dash-search-input');
  const searchClear = document.getElementById('dash-search-clear');
  searchInput?.addEventListener('input', (e) => {
    state.searchQuery = e.target.value.toLowerCase().trim();
    if (searchClear) searchClear.style.display = state.searchQuery ? 'block' : 'none';
    renderAllProducts();
  });
  searchClear?.addEventListener('click', () => {
    if (searchInput) searchInput.value = '';
    state.searchQuery = '';
    searchClear.style.display = 'none';
    renderAllProducts();
  });

  // Category filter pills
  const categoryPills = document.querySelectorAll('#dash-category-pills .category-pill-btn');
  categoryPills.forEach(btn => {
    btn.addEventListener('click', () => {
      const cat = btn.getAttribute('data-category');
      categoryPills.forEach(b => b.classList.toggle('active', b === btn));
      state.activeCategory = cat;
      renderAllProducts();
    });
  });

  // In-stock only toggle
  document.getElementById('dash-in-stock-toggle')?.addEventListener('change', (e) => {
    state.inStockOnly = e.target.checked;
    renderAllProducts();
  });

  // Sort dropdown
  document.getElementById('dash-sort-select')?.addEventListener('change', (e) => {
    state.sortBy = e.target.value;
    renderAllProducts();
  });
}

/**
 * ============================================================================
 * MODULE 1: HOME / DASHBOARD (Welcome message, KPIs, Featured Products)
 * ============================================================================
 */
function renderDashboardHeader() {
  const user = state.currentUser;
  const welcomeSlot = document.getElementById('dash-welcome-slot');
  if (!welcomeSlot || !user) return;

  const fullName = user.fullName || user.email?.split('@')[0] || 'Member';
  const initials = fullName
    .split(' ')
    .filter(Boolean)
    .map(p => p[0])
    .join('')
    .substring(0, 2)
    .toUpperCase() || 'U';

  const emailLower = (user.email || '').toLowerCase();
  const isAdmin = user.role === 'Admin' || emailLower === 'admin@gmail.com';

  welcomeSlot.innerHTML = `
    ${isAdmin ? `
      <div style="background:linear-gradient(135deg, rgba(37,99,235,0.12), rgba(79,70,229,0.12)); border:1px solid rgba(37,99,235,0.3); border-radius:var(--radius-md); padding:0.85rem 1.25rem; margin-bottom:1.25rem; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:0.75rem;">
        <div style="display:flex; align-items:center; gap:0.75rem;">
          <span style="font-size:1.6rem;" aria-hidden="true">🛡️</span>
          <div>
            <div style="font-weight:700; color:var(--color-brand-primary); font-size:1rem;">Administrator Privileges Active</div>
            <div style="font-size:0.825rem; color:var(--color-text-secondary);">You have administrative rights to manage store inventory, orders, customer accounts, and promotions.</div>
          </div>
        </div>
        <a href="admin-dashboard.html" class="btn btn-primary" style="font-size:0.85rem; padding:0.45rem 1rem; font-weight:700; text-decoration:none;">
          Launch Admin Console →
        </a>
      </div>
    ` : ''}

    <div class="dashboard-hero">
      <div class="dashboard-user-info">
        <div class="dashboard-avatar-large" aria-hidden="true">${initials}</div>
        <div class="dashboard-user-details">
          <div class="dashboard-hero-title-row">
            <h1 class="dashboard-hero-title">
              Hello, <span>${escapeHtml(fullName)}</span>! <span class="hero-wave" aria-hidden="true">👋</span>
            </h1>
            <span class="hero-role-pill">
              ${escapeHtml(user.role || 'Customer')}
            </span>
          </div>
          <p class="dashboard-hero-subtitle">
            Discover curated artisan goods, manage your orders, and enjoy seamless shopping.
          </p>
        </div>
      </div>

      <div class="dashboard-hero-actions">
        <a href="#dash-products-section" class="btn btn-primary" style="padding:0.6rem 1.25rem; font-size:0.875rem; font-weight:600; text-decoration:none;">
          Explore All 10 Products →
        </a>
        <button type="button" class="btn btn-secondary" style="padding:0.6rem 1.25rem; font-size:0.875rem; font-weight:600;" onclick="window.customerOpenCheckout()">
          Mock Checkout (Cart)
        </button>
      </div>
    </div>
  `;
}

function renderKPIs() {
  const kpiContainer = document.getElementById('dash-kpi-container');
  if (!kpiContainer) return;

  const orders = Storage.getOrders();
  const userOrders = orders.filter(o => {
    return o.customer?.email === state.currentUser?.email ||
           o.customer?.fullName === state.currentUser?.fullName ||
           !o.customer?.email;
  });

  const cartSummary = Cart.getSummary();
  const totalSpent = userOrders.reduce((sum, o) => sum + (o.financials?.grandTotal || 0), 0);
  const wishlist = Storage.getWishlist();

  const confirmedOrders = userOrders.filter(o => !((o.status || '').toLowerCase().includes('complete') || (o.status || '').toLowerCase().includes('deliver'))).length;
  const completedOrders = userOrders.filter(o => {
    const s = (o.status || '').toLowerCase();
    return s.includes('complete') || s.includes('delivered');
  }).length;

  kpiContainer.innerHTML = `
    <div class="dashboard-kpi-grid">
      <div class="dashboard-kpi-card">
        <div class="kpi-icon-wrap" style="background:var(--color-info-bg); color:var(--color-info);">
          <span>🛍️</span>
        </div>
        <div class="kpi-body">
          <div class="kpi-number">${cartSummary.itemCount}</div>
          <div class="kpi-label">Items in Cart</div>
          <div style="font-size:0.75rem; color:var(--color-text-muted); margin-top:0.25rem;">Subtotal: Rs. ${cartSummary.subtotal.toFixed(2)}</div>
        </div>
      </div>

      <div class="dashboard-kpi-card">
        <div class="kpi-icon-wrap" style="background:var(--color-success-bg); color:var(--color-success);">
          <span>📦</span>
        </div>
        <div class="kpi-body">
          <div class="kpi-number">${userOrders.length}</div>
          <div class="kpi-label">Orders Placed</div>
          <div style="font-size:0.75rem; color:var(--color-text-muted); margin-top:0.25rem;">
            ${confirmedOrders > 0 ? `<strong style="color:var(--color-info);">${confirmedOrders} Confirmed</strong> • ` : ''}Total: Rs. ${totalSpent.toFixed(2)}
          </div>
        </div>
      </div>

      <div class="dashboard-kpi-card">
        <div class="kpi-icon-wrap" style="background:var(--color-warning-bg); color:var(--color-warning);">
          <span>💖</span>
        </div>
        <div class="kpi-body">
          <div class="kpi-number">${wishlist.length}</div>
          <div class="kpi-label">Saved in Wishlist</div>
          <div style="font-size:0.75rem; color:var(--color-text-muted); margin-top:0.25rem;">Ready to add to cart</div>
        </div>
      </div>

      <div class="dashboard-kpi-card">
        <div class="kpi-icon-wrap" style="background:rgba(216,92,54,0.12); color:var(--color-brand-primary);">
          <span>🏷️</span>
        </div>
        <div class="kpi-body">
          <div class="kpi-number">3</div>
          <div class="kpi-label">Promotional Vouchers</div>
          <div style="font-size:0.75rem; color:var(--color-text-muted); margin-top:0.25rem;">WELCOME10, EASE20, VIP50</div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Featured Products Spotlight (Featured products)
 */
function renderFeaturedProducts() {
  const container = document.getElementById('dash-featured-container');
  if (!container) return;

  const products = Storage.getProducts();
  // Pick 3 standout products across the 3 categories
  const featured = [
    products.find(p => p.category === 'Food') || products[0],
    products.find(p => p.category === 'Clothing') || products[1],
    products.find(p => p.category === 'Electronics') || products[2]
  ].filter(Boolean);

  container.innerHTML = `
    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:1.25rem;">
      ${featured.map(product => {
        const isOutOfStock = product.stock <= 0;
        return `
          <div class="product-card" style="border:1px solid var(--color-border); border-radius:var(--radius-lg); overflow:hidden; background:var(--color-surface);">
            <div class="card-media-wrapper" style="position:relative; aspect-ratio:16/10; overflow:hidden;">
              <img src="${product.image}" alt="${escapeHtml(product.name)}" style="width:100%; height:100%; object-fit:cover;" />
              <div class="card-badges" style="position:absolute; top:0.75rem; left:0.75rem; display:flex; gap:0.4rem;">
                <span class="badge badge-category" style="background:rgba(0,0,0,0.65); color:#fff; font-size:0.72rem; padding:0.2rem 0.5rem; border-radius:var(--radius-full);">${product.category}</span>
                <span style="background:var(--color-brand-primary); color:#fff; font-size:0.72rem; font-weight:700; padding:0.2rem 0.5rem; border-radius:var(--radius-full);">Featured</span>
              </div>
            </div>
            <div class="card-body" style="padding:1rem;">
              <h4 style="font-size:1rem; font-weight:700; margin-bottom:0.35rem; color:var(--color-text-primary);">${escapeHtml(product.name)}</h4>
              <p style="font-size:0.8rem; color:var(--color-text-secondary); line-height:1.4; margin-bottom:0.75rem; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">
                ${escapeHtml(product.description)}
              </p>
              <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:0.75rem;">
                <span style="font-size:1.1rem; font-weight:800; color:var(--color-brand-primary);">Rs. ${product.price.toFixed(2)}</span>
                <span style="font-size:0.75rem; color:var(--color-text-muted);">Stock: ${product.stock} units</span>
              </div>
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.5rem;">
                <button 
                  type="button" 
                  class="btn btn-primary" 
                  style="font-size:0.8rem; padding:0.4rem 0.6rem;" 
                  onclick="window.customerAddToCart('${product.id}')"
                  ${isOutOfStock ? 'disabled aria-disabled="true"' : ''}
                >
                  ${isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
                </button>
                <button 
                  type="button" 
                  class="btn btn-secondary" 
                  style="font-size:0.8rem; padding:0.4rem 0.6rem;" 
                  onclick="window.customerOpenProductDetails('${product.id}')"
                >
                  View Details
                </button>
              </div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

/**
 * ============================================================================
 * MODULE 2: CATEGORIES 3 NAVIGATION
 * ============================================================================
 */
function renderCategoryBadges() {
  const products = Storage.getProducts();
  const foodCount = products.filter(p => p.category === 'Food').length;
  const clothCount = products.filter(p => p.category === 'Clothing').length;
  const elecCount = products.filter(p => p.category === 'Electronics').length;

  const bFood = document.getElementById('cat-badge-food');
  const bCloth = document.getElementById('cat-badge-clothing');
  const bElec = document.getElementById('cat-badge-electronics');

  if (bFood) bFood.textContent = `${foodCount} Curated Products`;
  if (bCloth) bCloth.textContent = `${clothCount} Curated Products`;
  if (bElec) bElec.textContent = `${elecCount} Curated Products`;
}

// Global category click filter
window.customerFilterCategory = function(category) {
  state.activeCategory = category;

  // Update pills active state
  document.querySelectorAll('#dash-category-pills .category-pill-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-category') === category);
  });

  renderAllProducts();

  // Smooth scroll down to products section
  const section = document.getElementById('dash-products-section');
  if (section) {
    section.scrollIntoView({ behavior: 'smooth' });
  }

  showToast(`Filtered catalogue for: ${category}`, 'info');
};

/**
 * ============================================================================
 * MODULE 3: PRODUCT LISTING & DETAILS (ALL 10 PRODUCTS)
 * ============================================================================
 */
function renderAllProducts() {
  const grid = document.getElementById('dash-product-grid');
  const countLabel = document.getElementById('dash-product-count');
  if (!grid) return;

  let products = Storage.getProducts();

  // 1. Filter by category
  if (state.activeCategory !== 'ALL') {
    products = products.filter(p => p.category.toLowerCase() === state.activeCategory.toLowerCase());
  }

  // 2. Filter by search query
  if (state.searchQuery) {
    products = products.filter(p => {
      const q = state.searchQuery;
      return (
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      );
    });
  }

  // 3. Filter by in-stock toggle
  if (state.inStockOnly) {
    products = products.filter(p => p.stock > 0);
  }

  // 4. Sort
  products.sort((a, b) => {
    switch (state.sortBy) {
      case 'price-asc': return a.price - b.price;
      case 'price-desc': return b.price - a.price;
      case 'stock': return b.stock - a.stock;
      case 'name': return a.name.localeCompare(b.name);
      default: return 0; // featured order preserved
    }
  });

  if (countLabel) {
    countLabel.textContent = `${products.length} product${products.length === 1 ? '' : 's'} displayed`;
  }

  if (products.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align:center; padding:3rem 1.5rem; background:var(--color-surface); border:1px dashed var(--color-border); border-radius:var(--radius-lg);">
        <div style="font-size:2.5rem; margin-bottom:0.75rem;">🔍</div>
        <h3 style="font-family:var(--font-serif); font-size:1.25rem; margin-bottom:0.5rem;">No matching products found</h3>
        <p style="font-size:0.875rem; color:var(--color-text-secondary); margin-bottom:1.25rem;">Try modifying your search or clearing the active department filter.</p>
        <button type="button" class="btn btn-secondary" onclick="window.customerResetFilters()">Reset All Filters</button>
      </div>
    `;
    return;
  }

  const wishlist = Storage.getWishlist();

  grid.innerHTML = products.map(product => {
    const isOutOfStock = product.stock <= 0;
    const isLowStock = product.stock > 0 && product.stock <= 3;
    const isWishlisted = wishlist.includes(product.id);

    const stockBadge = isOutOfStock
      ? `<span class="badge badge-stock-out" style="background:var(--color-danger); color:#fff; font-size:0.72rem; padding:0.2rem 0.5rem; border-radius:var(--radius-full);">Out of Stock</span>`
      : isLowStock
        ? `<span class="badge badge-stock-low" style="background:var(--color-warning); color:#fff; font-size:0.72rem; padding:0.2rem 0.5rem; border-radius:var(--radius-full);">Low Stock (${product.stock})</span>`
        : `<span class="badge badge-stock-in" style="background:var(--color-success); color:#fff; font-size:0.72rem; padding:0.2rem 0.5rem; border-radius:var(--radius-full);">In Stock (${product.stock})</span>`;

    return `
      <article class="product-card" id="card-${product.id}">
        <div class="card-media-wrapper">
          <img 
            src="${product.image}" 
            alt="${escapeHtml(product.name)}" 
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
            onclick="window.customerToggleWishlist('${product.id}')"
            aria-label="${isWishlisted ? 'Remove from wishlist' : 'Save to wishlist'} for ${escapeHtml(product.name)}"
            title="${isWishlisted ? 'Remove from wishlist' : 'Save to wishlist'}"
          >
            ♥
          </button>
        </div>

        <div class="card-body">
          <div class="card-rating" aria-label="Rating: ${product.rating || 5} out of 5 stars">
            <span>★★★★★</span>
            <strong>${(product.rating || 5).toFixed(1)}</strong>
            <span class="review-count">(${product.reviewsCount || 12})</span>
          </div>

          <h3 class="product-title" id="prod-title-${product.id}">${escapeHtml(product.name)}</h3>
          <p class="product-desc">${escapeHtml(product.description)}</p>

          <div class="card-footer">
            <div class="price-row">
              <span class="product-price">Rs. ${product.price.toFixed(2)}</span>
              <span class="product-unit">${product.unit || 'per unit'}</span>
            </div>

            <div class="card-actions">
              <!-- Out-of-stock products have DISABLED button (TC-05 & specification) -->
              <button 
                type="button" 
                class="btn btn-primary add-to-cart-btn" 
                onclick="window.customerAddToCart('${product.id}')"
                ${isOutOfStock ? 'disabled aria-disabled="true"' : ''}
              >
                <span>${isOutOfStock ? 'Out of Stock' : 'Add to Cart'}</span>
              </button>

              <!-- View Details modal trigger -->
              <button 
                type="button" 
                class="btn btn-secondary quick-view-btn" 
                onclick="window.customerOpenProductDetails('${product.id}')"
                aria-label="View specifications of ${escapeHtml(product.name)}"
              >
                View Details
              </button>
            </div>
          </div>
        </div>
      </article>
    `;
  }).join('');
}

// Reset filters handler
window.customerResetFilters = function() {
  state.activeCategory = 'ALL';
  state.searchQuery = '';
  state.sortBy = 'featured';
  state.inStockOnly = false;

  const searchInput = document.getElementById('dash-search-input');
  if (searchInput) searchInput.value = '';

  const inStockCheck = document.getElementById('dash-in-stock-toggle');
  if (inStockCheck) inStockCheck.checked = false;

  const sortSelect = document.getElementById('dash-sort-select');
  if (sortSelect) sortSelect.value = 'featured';

  document.querySelectorAll('#dash-category-pills .category-pill-btn').forEach(b => {
    b.classList.toggle('active', b.getAttribute('data-category') === 'ALL');
  });

  renderAllProducts();
  showToast('Filters reset to default.', 'info');
};

// Add to Cart handler
window.customerAddToCart = function(productId, qty = 1) {
  const result = Cart.addItem(productId, qty);
  if (result.success) {
    showToast(result.message, 'success');
    triggerCartBadgePulse();
    renderBasketPreview();
    renderDrawerCart();
    renderKPIs();
  } else {
    showToast(result.message, 'warning');
  }
};

// Wishlist toggle
window.customerToggleWishlist = function(productId) {
  const added = Storage.toggleWishlist(productId);
  renderAllProducts();
  renderWishlistSection();
  renderKPIs();
  showToast(added ? 'Saved to your Wishlist!' : 'Removed from Wishlist.', 'info');
};

/**
 * Product Details Modal (Quick View)
 */
window.customerOpenProductDetails = function(productId) {
  const product = Storage.getProductById(productId);
  if (!product) return;

  state.selectedProductDetails = product;
  const modal = document.getElementById('customer-product-details-modal');
  const body = document.getElementById('prod-details-body');
  if (!modal || !body) return;

  const isOutOfStock = product.stock <= 0;
  const isLowStock = product.stock > 0 && product.stock <= 3;

  body.innerHTML = `
    <div class="quick-view-grid">
      <div style="position:relative;">
        <img src="${product.image}" alt="${escapeHtml(product.name)}" class="quick-view-img" />
        <span class="badge badge-category" style="position:absolute; top:1rem; left:1rem; background:rgba(0,0,0,0.7); color:#fff; border-radius:var(--radius-full); padding:0.25rem 0.65rem; font-size:0.75rem;">
          ${product.category}
        </span>
      </div>

      <div>
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:0.5rem;">
          <span style="font-family:var(--font-mono); font-size:0.75rem; text-transform:uppercase; color:var(--color-text-muted);">${product.id}</span>
          ${isOutOfStock 
            ? `<span style="background:var(--color-danger); color:#fff; font-size:0.75rem; font-weight:700; padding:0.2rem 0.6rem; border-radius:var(--radius-full);">Out of Stock</span>` 
            : isLowStock 
              ? `<span style="background:var(--color-warning); color:#fff; font-size:0.75rem; font-weight:700; padding:0.2rem 0.6rem; border-radius:var(--radius-full);">Only ${product.stock} left</span>`
              : `<span style="background:var(--color-success); color:#fff; font-size:0.75rem; font-weight:700; padding:0.2rem 0.6rem; border-radius:var(--radius-full);">${product.stock} in stock</span>`
          }
        </div>

        <h2 style="font-family:var(--font-serif); font-size:1.6rem; font-weight:700; line-height:1.2; margin-bottom:0.75rem;">
          ${escapeHtml(product.name)}
        </h2>

        <p style="font-size:0.9rem; line-height:1.55; color:var(--color-text-secondary); margin-bottom:1.25rem;">
          ${escapeHtml(product.description)}
        </p>

        <div style="background:var(--color-surface-subtle); padding:1rem; border-radius:var(--radius-md); border:1px solid var(--color-border); margin-bottom:1.5rem;">
          <div style="display:flex; align-items:baseline; gap:0.5rem; margin-bottom:0.5rem;">
            <span style="font-size:1.6rem; font-weight:800; color:var(--color-brand-primary);">Rs. ${product.price.toFixed(2)}</span>
            <span style="font-size:0.85rem; color:var(--color-text-muted);">${product.unit || 'per unit'}</span>
          </div>
          <div style="font-size:0.8rem; color:var(--color-text-secondary);">
            Department: <strong>${product.category}</strong> • Verified Authenticity & Quality Guaranteed
          </div>
        </div>

        <div style="display:flex; gap:0.75rem;">
          <button 
            type="button" 
            class="btn btn-primary" 
            style="flex:1; height:46px; font-size:0.95rem;" 
            onclick="window.customerAddToCart('${product.id}'); window.customerCloseProductDetails();"
            ${isOutOfStock ? 'disabled aria-disabled="true"' : ''}
          >
            ${isOutOfStock ? 'Currently Out of Stock' : 'Add to Cart'}
          </button>
          <button 
            type="button" 
            class="btn btn-secondary" 
            style="height:46px; padding:0 1.25rem;" 
            onclick="window.customerCloseProductDetails()"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  `;

  modal.style.display = 'flex';
  modal.classList.add('open');
};

window.customerCloseProductDetails = function() {
  const modal = document.getElementById('customer-product-details-modal');
  if (modal) {
    modal.style.display = 'none';
    modal.classList.remove('open');
  }
};

/**
 * ============================================================================
 * MODULE 4: SHOPPING BASKET / CART (In-page and Drawer)
 * - Added products display
 * - Quantity +/- stepper
 * - Remove product option
 * - Subtotal and total price
 * - Checkout button
 * ============================================================================
 */
function renderBasketPreview() {
  const container = document.getElementById('dash-basket-container');
  if (!container) return;

  const cart = Cart.getSummary();

  if (cart.items.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="background:var(--color-surface); border:1px solid var(--color-border); border-radius:var(--radius-lg); padding:2.5rem 1.5rem;">
        <div class="empty-state-icon">🛍️</div>
        <h3>Your Cart is currently empty</h3>
        <p>Browse our products across Food, Clothing, and Electronics to add items to your cart.</p>
        <a href="#dash-products-section" class="btn btn-primary">
          Explore Products Collection →
        </a>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div style="display:grid; grid-template-columns:1.8fr 1.2fr; gap:1.5rem; background:var(--color-surface); border:1px solid var(--color-border); border-radius:var(--radius-lg); padding:1.5rem;">
      <!-- Basket Items List -->
      <div style="display:flex; flex-direction:column; gap:1rem;">
        <div style="font-size:0.85rem; font-weight:700; text-transform:uppercase; color:var(--color-text-muted); border-bottom:1px solid var(--color-border); padding-bottom:0.5rem;">
          Cart Items (${cart.itemCount} items)
        </div>

        ${cart.items.map(item => `
          <div class="cart-item-row" style="padding:0.75rem 0;">
            <img src="${item.image}" alt="${escapeHtml(item.name)}" class="cart-item-img" />
            <div class="cart-item-info">
              <div class="cart-item-title">${escapeHtml(item.name)}</div>
              <div class="cart-item-price">Rs. ${item.price.toFixed(2)} each • ${item.category}</div>
              
              <div class="cart-item-controls">
                <!-- Quantity +/- Stepper -->
                <div class="cart-stepper">
                  <button 
                    type="button" 
                    class="cart-stepper-btn" 
                    onclick="window.customerUpdateCartQty('${item.productId}', ${item.quantity - 1})"
                    aria-label="Decrease quantity"
                  >-</button>
                  <span class="cart-stepper-qty">${item.quantity}</span>
                  <button 
                    type="button" 
                    class="cart-stepper-btn" 
                    onclick="window.customerUpdateCartQty('${item.productId}', ${item.quantity + 1})"
                    aria-label="Increase quantity"
                  >+</button>
                </div>

                <div style="display:flex; align-items:center; gap:0.75rem;">
                  <strong class="cart-item-total">Rs. ${item.totalPrice.toFixed(2)}</strong>
                  <!-- Remove button -->
                  <button 
                    type="button" 
                    class="cart-item-remove-btn" 
                    onclick="window.customerRemoveCartItem('${item.productId}')"
                    title="Remove product"
                    aria-label="Remove ${escapeHtml(item.name)} from cart"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          </div>
        `).join('')}
      </div>

      <!-- Financial Order Summary -->
      <div style="background:var(--color-surface-subtle); padding:1.25rem; border-radius:var(--radius-md); border:1px solid var(--color-border); display:flex; flex-direction:column; justify-content:space-between;">
        <div>
          <div style="font-size:1rem; font-weight:700; margin-bottom:1rem; color:var(--color-text-primary);">
            Order Financials
          </div>

          <!-- Promo Voucher Code Input -->
          <form class="promo-form" onsubmit="window.customerApplyPromo(event)">
            <input 
              type="text" 
              id="dash-promo-input" 
              class="promo-input" 
              placeholder="Voucher (e.g. WELCOME10)" 
              value="${cart.activePromoCode || ''}"
            />
            <button type="submit" class="btn btn-secondary promo-btn">Apply</button>
          </form>

          ${cart.activePromoCode ? `
            <div class="active-promo-tag">
              <span>🏷️ Code: <strong>${cart.activePromoCode}</strong> applied</span>
              <button type="button" onclick="window.customerRemovePromo()" style="background:none; border:none; color:var(--color-danger); cursor:pointer; font-weight:bold;">✕</button>
            </div>
          ` : ''}

          <div class="financial-breakdown">
            <div class="financial-row">
              <span>Items Subtotal:</span>
              <strong>Rs. ${cart.subtotal.toFixed(2)}</strong>
            </div>

            ${cart.discount > 0 ? `
              <div class="financial-row" style="color:var(--color-success);">
                <span>Promotional Discount:</span>
                <strong>-Rs. ${cart.discount.toFixed(2)}</strong>
              </div>
            ` : ''}

            <div class="financial-row">
              <span>Standard Delivery:</span>
              <span>${cart.deliveryFee === 0 ? 'FREE' : `Rs. ${cart.deliveryFee.toFixed(2)}`}</span>
            </div>

            <div class="financial-row total-row">
              <span>Total Price:</span>
              <span style="color:var(--color-brand-primary);">Rs. ${cart.grandTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <!-- Checkout Button -->
        <button 
          type="button" 
          class="btn btn-primary cart-checkout-btn" 
          onclick="window.customerOpenCheckout()"
          style="margin-top:1.25rem;"
        >
          Proceed to Checkout (${cart.itemCount} Units) →
        </button>
      </div>
    </div>
  `;
}

// Drawer Basket Renderer
function renderDrawerCart() {
  const drawerItems = document.getElementById('dash-drawer-items');
  const subtotalElem = document.getElementById('dash-drawer-subtotal');
  const totalElem = document.getElementById('dash-drawer-grandtotal');
  if (!drawerItems) return;

  const cart = Cart.getSummary();

  if (subtotalElem) subtotalElem.textContent = `Rs. ${cart.subtotal.toFixed(2)}`;
  if (totalElem) totalElem.textContent = `Rs. ${cart.grandTotal.toFixed(2)}`;

  if (cart.items.length === 0) {
    drawerItems.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🛍️</div>
        <h3>Your cart is empty</h3>
        <p>Add some items from our catalog to get started.</p>
      </div>
    `;
    return;
  }

  drawerItems.innerHTML = cart.items.map(item => `
    <div class="cart-item-row">
      <img src="${item.image}" alt="${escapeHtml(item.name)}" class="cart-item-img" />
      <div class="cart-item-info">
        <div class="cart-item-title">${escapeHtml(item.name)}</div>
        <div class="cart-item-price">Rs. ${item.price.toFixed(2)}</div>
        <div class="cart-item-controls">
          <div class="cart-stepper">
            <button type="button" class="cart-stepper-btn" onclick="window.customerUpdateCartQty('${item.productId}', ${item.quantity - 1})">-</button>
            <span class="cart-stepper-qty">${item.quantity}</span>
            <button type="button" class="cart-stepper-btn" onclick="window.customerUpdateCartQty('${item.productId}', ${item.quantity + 1})">+</button>
          </div>
          <strong class="cart-item-total">Rs. ${item.totalPrice.toFixed(2)}</strong>
          <button type="button" class="cart-item-remove-btn" onclick="window.customerRemoveCartItem('${item.productId}')">🗑️</button>
        </div>
      </div>
    </div>
  `).join('');
}

// Cart Item Quantity Stepper & Removal
window.customerUpdateCartQty = function(productId, qty) {
  Cart.updateQuantity(productId, qty);
  renderBasketPreview();
  renderDrawerCart();
  updateCartBadge();
  renderKPIs();
};

window.customerRemoveCartItem = function(productId) {
  Cart.removeItem(productId);
  renderBasketPreview();
  renderDrawerCart();
  updateCartBadge();
  renderKPIs();
  showToast('Product removed from cart.', 'info');
};

// Promo code application
window.customerApplyPromo = function(event) {
  event.preventDefault();
  const input = document.getElementById('dash-promo-input');
  if (!input) return;
  const res = Cart.applyPromoCode(input.value);
  showToast(res.message, res.success ? 'success' : 'warning');
  renderBasketPreview();
  renderDrawerCart();
};

window.customerRemovePromo = function() {
  Cart.removePromoCode();
  showToast('Promotional voucher removed.', 'info');
  renderBasketPreview();
  renderDrawerCart();
};

window.shopeaseOpenDashboardCart = function() {
  const overlay = document.getElementById('dash-cart-overlay');
  if (overlay) {
    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden', 'false');
  }
};

window.shopeaseCloseDashboardCart = function() {
  const overlay = document.getElementById('dash-cart-overlay');
  if (overlay) {
    overlay.classList.remove('open');
    overlay.setAttribute('aria-hidden', 'true');
  }
};

function updateCartBadge() {
  const cart = Cart.getSummary();
  const badge = document.getElementById('dash-cart-badge');
  const cartBtn = document.getElementById('dash-cart-btn');
  const count = cart.totalItems !== undefined ? cart.totalItems : (cart.itemCount ?? 0);
  if (badge) {
    badge.textContent = count;
  }
  if (cartBtn) {
    cartBtn.setAttribute('aria-label', `Shopping cart (${count} items)`);
  }
}

function triggerCartBadgePulse() {
  const badge = document.getElementById('dash-cart-badge');
  if (badge) {
    badge.classList.remove('pulse');
    void badge.offsetWidth;
    badge.classList.add('pulse');
  }
}

/**
 * ============================================================================
 * MODULE 5: CHECKOUT & MOCK PAYMENT
 * - Order summary
 * - Customer name and contact details
 * - Mock payment method selection
 * - Confirm Order / Pay Now button
 * - Payment success or failure message
 * - Order confirmation number
 * ============================================================================
 */
window.customerOpenCheckout = function() {
  const cart = Cart.getSummary();
  if (cart.items.length === 0) {
    alert('Your shopping cart is empty. Please add items to checkout.');
    return;
  }

  const modal = document.getElementById('customer-checkout-modal');
  const body = document.getElementById('checkout-modal-body');
  if (!modal || !body) return;

  const user = state.currentUser || {};

  body.innerHTML = `
    <form id="customer-checkout-form" onsubmit="window.customerSubmitPayment(event)">
      <!-- 1. Order Summary -->
      <div style="background:var(--color-surface-subtle); border:1px solid var(--color-border); border-radius:var(--radius-md); padding:1rem; margin-bottom:1.25rem;">
        <div style="font-size:0.85rem; font-weight:700; text-transform:uppercase; color:var(--color-text-muted); margin-bottom:0.6rem;">
          1. Order Items Summary (${cart.itemCount} items)
        </div>
        <div style="display:flex; flex-direction:column; gap:0.4rem; max-height:140px; overflow-y:auto; margin-bottom:0.75rem; padding-right:0.25rem;">
          ${cart.items.map(item => `
            <div style="display:flex; justify-content:space-between; font-size:0.825rem;">
              <span>${item.quantity}x ${escapeHtml(item.name)}</span>
              <strong>Rs. ${item.totalPrice.toFixed(2)}</strong>
            </div>
          `).join('')}
        </div>
        <div style="border-top:1px dashed var(--color-border); padding-top:0.5rem; display:flex; justify-content:space-between; font-size:0.95rem; font-weight:800; color:var(--color-brand-primary);">
          <span>Grand Total to Pay:</span>
          <span>Rs. ${cart.grandTotal.toFixed(2)}</span>
        </div>
      </div>

      <!-- 2. Customer Contact & Delivery Details -->
      <div style="margin-bottom:1.25rem;">
        <div style="font-size:0.85rem; font-weight:700; text-transform:uppercase; color:var(--color-text-muted); margin-bottom:0.6rem;">
          2. Customer &amp; Delivery Details
        </div>
        <div class="form-group" style="margin-bottom:0.75rem;">
          <label class="form-label" for="chk-name">Full Name *</label>
          <input type="text" id="chk-name" class="form-input" required value="${escapeHtml(user.fullName || 'Sarah Jenkins')}" />
        </div>
        <div class="form-row" style="display:grid; grid-template-columns:1fr 1fr; gap:0.75rem; margin-bottom:0.75rem;">
          <div class="form-group">
            <label class="form-label" for="chk-email">Email Address *</label>
            <input type="email" id="chk-email" class="form-input" required value="${escapeHtml(user.email || 'sarah@example.com')}" />
          </div>
          <div class="form-group">
            <label class="form-label" for="chk-phone">Contact Phone *</label>
            <input type="tel" id="chk-phone" class="form-input" required value="${escapeHtml(user.phone || '+94 77 123 4567')}" />
          </div>
        </div>
        <div class="form-group">
          <label class="form-label" for="chk-address">Delivery Address *</label>
          <input type="text" id="chk-address" class="form-input" required value="${escapeHtml(user.address || '42 Highfield Terrace, Colombo 03')}" />
        </div>
      </div>

      <!-- 3. Mock Payment Method Selection -->
      <div style="margin-bottom:1.5rem;">
        <div style="font-size:0.85rem; font-weight:700; text-transform:uppercase; color:var(--color-text-muted); margin-bottom:0.6rem;">
          3. Mock Payment Method Selection (No Real Money Required)
        </div>
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:0.6rem; margin-bottom:1rem;">
          <label style="display:flex; align-items:center; gap:0.5rem; padding:0.6rem 0.85rem; border:1px solid var(--color-border); border-radius:var(--radius-sm); cursor:pointer; background:var(--color-surface);">
            <input type="radio" name="chk-pay-method" value="Demo Card" checked onchange="window.customerTogglePaymentInputs('card')" />
            <span style="font-size:0.85rem; font-weight:600;">💳 Demo Card</span>
          </label>
          <label style="display:flex; align-items:center; gap:0.5rem; padding:0.6rem 0.85rem; border:1px solid var(--color-border); border-radius:var(--radius-sm); cursor:pointer; background:var(--color-surface);">
            <input type="radio" name="chk-pay-method" value="Cash on Delivery" onchange="window.customerTogglePaymentInputs('cod')" />
            <span style="font-size:0.85rem; font-weight:600;">💵 Cash on Delivery</span>
          </label>
          <label style="display:flex; align-items:center; gap:0.5rem; padding:0.6rem 0.85rem; border:1px solid var(--color-border); border-radius:var(--radius-sm); cursor:pointer; background:var(--color-surface);">
            <input type="radio" name="chk-pay-method" value="1-Click Instant Demo" onchange="window.customerTogglePaymentInputs('instant')" />
            <span style="font-size:0.85rem; font-weight:600;">⚡ 1-Click Instant Demo</span>
          </label>
        </div>

        <!-- Mock Card Fields -->
        <div id="chk-card-fields" style="background:var(--color-surface-subtle); padding:0.85rem; border-radius:var(--radius-sm); border:1px solid var(--color-border);">
          <div class="form-group" style="margin-bottom:0.6rem;">
            <label class="form-label" style="font-size:0.75rem;">Mock Card Number (Pre-filled Demo)</label>
            <input type="text" id="chk-card-num" class="form-input" style="font-family:var(--font-mono); font-size:0.85rem;" value="4532 •••• •••• 8892" />
          </div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.6rem;">
            <div>
              <label class="form-label" style="font-size:0.75rem;">Expiry (MM/YY)</label>
              <input type="text" id="chk-card-exp" class="form-input" style="font-family:var(--font-mono); font-size:0.85rem;" value="08/28" />
            </div>
            <div>
              <label class="form-label" style="font-size:0.75rem;">Security CVV</label>
              <input type="text" id="chk-card-cvv" class="form-input" style="font-family:var(--font-mono); font-size:0.85rem;" value="394" />
            </div>
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div style="display:flex; justify-content:flex-end; gap:0.75rem;">
        <button type="button" class="btn btn-secondary" onclick="window.customerCloseCheckout()">Cancel</button>
        <button type="submit" id="chk-submit-btn" class="btn btn-primary" style="padding:0.6rem 1.5rem; font-weight:700;">
          Confirm Order &amp; Pay Now (Rs. ${cart.grandTotal.toFixed(2)}) →
        </button>
      </div>
    </form>
  `;

  modal.style.display = 'flex';
  modal.classList.add('open');
};

window.customerTogglePaymentInputs = function(type) {
  const cardFields = document.getElementById('chk-card-fields');
  if (cardFields) {
    cardFields.style.display = type === 'card' ? 'block' : 'none';
  }
};

window.customerCloseCheckout = function() {
  const modal = document.getElementById('customer-checkout-modal');
  if (modal) {
    modal.style.display = 'none';
    modal.classList.remove('open');
  }
};

window.customerSubmitPayment = async function(event) {
  event.preventDefault();
  const submitBtn = document.getElementById('chk-submit-btn');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>⏳ Processing Mock Payment...</span>';
  }

  const name = document.getElementById('chk-name')?.value;
  const email = document.getElementById('chk-email')?.value;
  const phone = document.getElementById('chk-phone')?.value;
  const address = document.getElementById('chk-address')?.value;
  const methodRadio = document.querySelector('input[name="chk-pay-method"]:checked');
  const paymentMethod = methodRadio ? methodRadio.value : 'Demo Card';

  setTimeout(async () => {
    const orderData = {
      fullName: name,
      email: email,
      phone: phone,
      address: address,
      city: 'Colombo',
      postcode: '00300',
      paymentMethod: paymentMethod,
      cardNumber: '4532 •••• •••• 8892',
      cardHolder: name
    };

    const result = await Checkout.processMockOrder(orderData);

    if (result.success && result.order) {
      // Show Confirmation Screen
      const body = document.getElementById('checkout-modal-body');
      if (body) {
        body.innerHTML = `
          <div style="text-align:center; padding:1.5rem 1rem;">
            <div style="width:64px; height:64px; border-radius:var(--radius-full); background:var(--color-success-bg); color:var(--color-success); font-size:2rem; display:inline-flex; align-items:center; justify-content:center; margin-bottom:1rem;">
              ✓
            </div>
            <h3 style="font-family:var(--font-serif); font-size:1.6rem; margin-bottom:0.35rem; color:var(--color-text-primary);">
              Payment Successful!
            </h3>
            <p style="font-size:0.9rem; color:var(--color-text-secondary); margin-bottom:1.5rem;">
              Your mock order has been verified and confirmed in the local store ledger.
            </p>

            <div style="background:var(--color-surface-subtle); border:1px solid var(--color-border); border-radius:var(--radius-md); padding:1.25rem; text-align:left; margin-bottom:1.5rem;">
              <div style="display:flex; justify-content:space-between; margin-bottom:0.5rem; font-size:0.875rem;">
                <span style="color:var(--color-text-muted);">Order Confirmation No:</span>
                <strong style="font-family:var(--font-mono); color:var(--color-brand-primary); font-size:1rem;">${result.order.orderId}</strong>
              </div>
              <div style="display:flex; justify-content:space-between; margin-bottom:0.5rem; font-size:0.875rem;">
                <span style="color:var(--color-text-muted);">Date &amp; Time:</span>
                <span>${result.order.formattedDate}</span>
              </div>
              <div style="display:flex; justify-content:space-between; margin-bottom:0.5rem; font-size:0.875rem;">
                <span style="color:var(--color-text-muted);">Payment Method:</span>
                <span>${result.order.payment.method} (Demo Verified)</span>
              </div>
              <div style="display:flex; justify-content:space-between; margin-bottom:0.5rem; font-size:0.875rem;">
                <span style="color:var(--color-text-muted);">Recipient &amp; Delivery:</span>
                <span>${escapeHtml(result.order.customer.fullName)} (${escapeHtml(result.order.customer.address)})</span>
              </div>
              <div style="border-top:1px dashed var(--color-border); padding-top:0.5rem; display:flex; justify-content:space-between; font-size:1rem; font-weight:800; color:var(--color-brand-primary);">
                <span>Total Amount Paid:</span>
                <span>Rs. ${result.order.financials.grandTotal.toFixed(2)}</span>
              </div>
            </div>

            <div style="display:flex; justify-content:center; gap:0.75rem; flex-wrap:wrap;">
              <button type="button" class="btn btn-secondary" onclick="window.customerCloseCheckout(); window.customerViewInvoice('${result.order.orderId}');">
                🖨️ View &amp; Print Invoice
              </button>
              <button type="button" class="btn btn-primary" onclick="window.customerCloseCheckout(); document.getElementById('dash-orders-section')?.scrollIntoView({behavior:'smooth'});">
                View in My Orders →
              </button>
            </div>
          </div>
        `;
      }

      // Re-render components
      renderBasketPreview();
      renderDrawerCart();
      updateCartBadge();
      renderOrdersSection();
      renderAllProducts();
      renderKPIs();
      showToast(`Order #${result.order.orderId} placed successfully!`, 'success');
    } else {
      alert(`Checkout failed: ${result.message}`);
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Confirm Order &amp; Pay Now →';
      }
    }
  }, 600);
};

/**
 * ============================================================================
 * MODULE 6: MY ORDERS (Saved in LocalStorage)
 * - Previous orders
 * - Order date and total
 * - Ordered products
 * - Payment status
 * - Order status
 * - Printable Invoice modal
 * ============================================================================
 */
function getCustomerOrderStatusBadge(statusRaw = '') {
  const s = String(statusRaw || '').toLowerCase();
  if (s.includes('complete') || s.includes('deliver')) {
    return {
      text: '✅ Completed',
      bg: 'var(--color-success-bg)',
      color: 'var(--color-success)',
      border: 'var(--color-success-border)'
    };
  }
  
  return {
    text: '● Confirmed',
    bg: 'var(--color-info-bg)',
    color: 'var(--color-info)',
    border: 'var(--color-info-border)'
  };
}

function renderOrdersSection() {
  const container = document.getElementById('dash-orders-container');
  if (!container) return;

  const orders = Storage.getOrders();
  const user = state.currentUser;

  // Filter orders matching current customer, or show all if demo
  const userOrders = orders.filter(o => {
    return !user?.email || 
           o.customer?.email === user.email || 
           o.customer?.fullName === user.fullName ||
           user.role === 'Admin';
  });

  if (userOrders.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="background:var(--color-surface); border:1px solid var(--color-border); border-radius:var(--radius-lg); padding:2.5rem 1.5rem;">
        <div class="empty-state-icon">📦</div>
        <h3>No Past Orders Found</h3>
        <p>You haven't placed any orders yet. Try our quick demo simulation or checkout with your shopping cart.</p>
        <button type="button" class="btn btn-primary" onclick="window.shopeaseSimulateCustomerOrder()">
          ⚡ Place Instant Demo Order
        </button>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:1.25rem;">
      ${userOrders.map(order => {
        const items = order.items || [];
        const badge = getCustomerOrderStatusBadge(order.status);

        return `
          <div style="background:var(--color-surface); border:1px solid var(--color-border); border-radius:var(--radius-lg); padding:1.25rem; box-shadow:var(--shadow-xs);">
            <!-- Header bar of order -->
            <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:0.75rem; border-bottom:1px solid var(--color-border); padding-bottom:0.75rem; margin-bottom:1rem;">
              <div>
                <span style="font-family:var(--font-mono); font-weight:800; color:var(--color-brand-primary); font-size:1rem;">${order.orderId}</span>
                <span style="font-size:0.8rem; color:var(--color-text-muted); margin-left:0.5rem;">• Placed on ${order.formattedDate || new Date(order.createdAt).toLocaleDateString()}</span>
              </div>
              <div style="display:flex; align-items:center; gap:0.6rem;">
                <span style="font-size:0.75rem; font-weight:700; padding:0.25rem 0.65rem; border-radius:var(--radius-full); background:${badge.bg}; color:${badge.color}; border:1px solid ${badge.border};">
                  ${badge.text}
                </span>
                <span style="font-size:0.75rem; padding:0.25rem 0.65rem; border-radius:var(--radius-full); background:var(--color-surface-subtle); border:1px solid var(--color-border); color:var(--color-text-secondary);">
                  💳 ${order.payment?.method || 'Demo Card (Paid)'}
                </span>
              </div>
            </div>

            <!-- Ordered Products List -->
            <div style="display:flex; flex-direction:column; gap:0.6rem; margin-bottom:1rem;">
              ${items.map(item => `
                <div style="display:flex; align-items:center; justify-content:space-between; gap:1rem; font-size:0.875rem;">
                  <div style="display:flex; align-items:center; gap:0.75rem;">
                    ${item.image ? `<img src="${item.image}" alt="" style="width:36px; height:36px; object-fit:cover; border-radius:var(--radius-xs); border:1px solid var(--color-border);" />` : ''}
                    <div>
                      <span style="font-weight:600; color:var(--color-text-primary);">${escapeHtml(item.name)}</span>
                      <span style="color:var(--color-text-muted); font-size:0.8rem; margin-left:0.35rem;">(${item.quantity}x @ Rs. ${(item.price || 0).toFixed(2)})</span>
                    </div>
                  </div>
                  <strong style="color:var(--color-text-primary);">Rs. ${(item.totalPrice || item.price * item.quantity).toFixed(2)}</strong>
                </div>
              `).join('')}
            </div>

            <!-- Order Footer with Total and Invoice Action -->
            <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:0.75rem; border-top:1px dashed var(--color-border); padding-top:0.75rem;">
              <div style="font-size:0.85rem; color:var(--color-text-secondary);">
                Recipient: <strong>${escapeHtml(order.customer?.fullName || user?.fullName || 'Customer')}</strong>
              </div>
              <div style="display:flex; align-items:center; gap:1rem;">
                <span style="font-size:1.1rem; font-weight:800; color:var(--color-brand-primary);">
                  Total: Rs. ${(order.financials?.grandTotal || 0).toFixed(2)}
                </span>
                <button type="button" class="btn btn-secondary" style="font-size:0.8rem; padding:0.35rem 0.75rem;" onclick="window.customerViewInvoice('${order.orderId}')">
                  View Receipt 📄
                </button>
              </div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

// Invoice Modal Viewer
window.customerViewInvoice = function(orderId) {
  const order = Storage.getOrderById(orderId);
  if (!order) {
    alert('Order record not found.');
    return;
  }

  const modal = document.getElementById('customer-invoice-modal');
  const body = document.getElementById('customer-invoice-body');
  if (!modal || !body) return;

  const items = order.items || [];
  const fin = order.financials || {};

  body.innerHTML = `
    <div style="padding:0.5rem 0;">
      <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:1.5rem; border-bottom:1px solid var(--color-border); padding-bottom:1rem;">
        <div>
          <span style="font-size:1.3rem; font-weight:800; color:var(--color-brand-primary); font-family:var(--font-heading);">ShopEase Studio</span>
          <div style="font-size:0.8rem; color:var(--color-text-muted);">Curated Retail Technologies • Client-Side Ledger</div>
        </div>
        <div style="text-align:right;">
          <div style="font-family:var(--font-mono); font-weight:800; font-size:1.1rem; color:var(--color-text-primary);">${order.orderId}</div>
          <div style="font-size:0.8rem; color:var(--color-text-muted);">${order.formattedDate}</div>
        </div>
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem; margin-bottom:1.5rem; font-size:0.85rem; background:var(--color-surface-subtle); padding:1rem; border-radius:var(--radius-sm);">
        <div>
          <strong style="display:block; margin-bottom:0.25rem;">Billed / Delivered To:</strong>
          <div>${escapeHtml(order.customer?.fullName)}</div>
          <div style="color:var(--color-text-muted);">${escapeHtml(order.customer?.email)}</div>
          <div style="color:var(--color-text-muted);">${escapeHtml(order.customer?.address)}</div>
        </div>
        <div>
          <strong style="display:block; margin-bottom:0.25rem;">Payment &amp; Status:</strong>
          <div>Method: ${order.payment?.method || 'Demo Card (Mock)'}</div>
          <div style="margin-top:0.35rem;">Status: 
            <span style="display:inline-block; font-size:0.75rem; font-weight:700; padding:0.2rem 0.6rem; border-radius:var(--radius-full); background:${getCustomerOrderStatusBadge(order.status).bg}; color:${getCustomerOrderStatusBadge(order.status).color}; border:1px solid ${getCustomerOrderStatusBadge(order.status).border};">
              ${getCustomerOrderStatusBadge(order.status).text}
            </span>
          </div>
        </div>
      </div>

      <!-- Table of items -->
      <table style="width:100%; border-collapse:collapse; margin-bottom:1.5rem; font-size:0.85rem;">
        <thead>
          <tr style="border-bottom:1px solid var(--color-border); text-align:left; color:var(--color-text-muted);">
            <th style="padding:0.5rem 0;">Item Description</th>
            <th style="padding:0.5rem 0; text-align:center;">Qty</th>
            <th style="padding:0.5rem 0; text-align:right;">Unit Price</th>
            <th style="padding:0.5rem 0; text-align:right;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${items.map(it => `
            <tr style="border-bottom:1px dashed var(--color-border);">
              <td style="padding:0.5rem 0; font-weight:600;">${escapeHtml(it.name)}</td>
              <td style="padding:0.5rem 0; text-align:center;">${it.quantity}</td>
              <td style="padding:0.5rem 0; text-align:right;">Rs. ${(it.price || 0).toFixed(2)}</td>
              <td style="padding:0.5rem 0; text-align:right; font-weight:700;">Rs. ${(it.totalPrice || it.price * it.quantity).toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <!-- Summary breakdown -->
      <div style="display:flex; flex-direction:column; gap:0.4rem; font-size:0.875rem; text-align:right;">
        <div style="display:flex; justify-content:space-between;">
          <span style="color:var(--color-text-muted);">Subtotal:</span>
          <strong>Rs. ${(fin.subtotal || 0).toFixed(2)}</strong>
        </div>
        ${fin.discount ? `
          <div style="display:flex; justify-content:space-between; color:var(--color-success);">
            <span>Discount (${fin.promoCode || 'PROMO'}):</span>
            <strong>-Rs. ${fin.discount.toFixed(2)}</strong>
          </div>
        ` : ''}
        <div style="display:flex; justify-content:space-between;">
          <span style="color:var(--color-text-muted);">Standard Delivery:</span>
          <span>${fin.deliveryFee === 0 ? 'FREE' : `Rs. ${(fin.deliveryFee || 0).toFixed(2)}`}</span>
        </div>
        <div style="display:flex; justify-content:space-between; font-size:1.15rem; font-weight:800; border-top:1px solid var(--color-border); padding-top:0.6rem; color:var(--color-brand-primary);">
          <span>Grand Total:</span>
          <span>Rs. ${(fin.grandTotal || 0).toFixed(2)}</span>
        </div>
      </div>
    </div>
  `;

  modal.style.display = 'flex';
  modal.classList.add('open');
};

window.customerCloseInvoice = function() {
  const modal = document.getElementById('customer-invoice-modal');
  if (modal) {
    modal.style.display = 'none';
    modal.classList.remove('open');
  }
};

// Simulation of test customer order
window.shopeaseSimulateCustomerOrder = function() {
  const products = Storage.getProducts().filter(p => p.stock > 0);
  if (products.length === 0) {
    showToast('Cannot simulate order: No in-stock products available.', 'warning');
    return;
  }

  // Add 1 in-stock item to cart temporarily and checkout
  const product = products[0];
  Cart.addItem(product.id, 1);
  const cartSummary = Cart.getSummary();

  const user = state.currentUser || {};
  const orderRecord = {
    orderId: 'SE-' + Math.floor(100000 + Math.random() * 900000),
    createdAt: new Date().toISOString(),
    formattedDate: new Intl.DateTimeFormat('en-GB', {
      dateStyle: 'full',
      timeStyle: 'short'
    }).format(new Date()),
    customer: {
      fullName: user.fullName || 'Sarah Jenkins',
      email: user.email || 'sarah@example.com',
      phone: user.phone || '+94 77 123 4567',
      address: user.address || '42 Highfield Terrace, Colombo 03'
    },
    payment: {
      method: 'Demo Card (Instant Verified)',
      last4: '8892',
      cardHolder: user.fullName || 'Sarah Jenkins'
    },
    items: cartSummary.items.map(it => ({
      productId: it.productId,
      name: it.name,
      category: it.category,
      price: it.price,
      quantity: it.quantity,
      totalPrice: it.totalPrice,
      image: it.image
    })),
    financials: {
      subtotal: cartSummary.subtotal,
      deliveryFee: 0,
      discount: cartSummary.discount,
      promoCode: cartSummary.activePromoCode,
      grandTotal: cartSummary.grandTotal
    },
    status: 'Confirmed'
  };

  Storage.deductStock(product.id, 1);
  Storage.saveOrder(orderRecord);
  Cart.clear();

  renderAllModules();
  showToast(`Simulated Order #${orderRecord.orderId} created successfully!`, 'success');
};

/**
 * ============================================================================
 * MODULE 7: PROMOTIONAL OFFERS (MY OFFERS)
 * ============================================================================
 */
function renderOffersSection() {
  const container = document.getElementById('dash-offers-container');
  if (!container) return;

  const vouchers = [
    {
      code: 'WELCOME10',
      discount: '10% OFF',
      description: 'Welcome reward on all handcrafted essentials. No minimum cart value.',
      expiry: 'Valid until 31 Dec 2026'
    },
    {
      code: 'EASE20',
      discount: '20% OFF',
      description: 'Mid-season curated promotion on orders over Rs. 100.00.',
      expiry: 'Limited Edition'
    },
    {
      code: 'VIP50',
      discount: 'Rs. 50 OFF',
      description: 'Exclusive voucher for verified members on multi-item orders.',
      expiry: 'Active'
    }
  ];

  container.innerHTML = `
    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(260px, 1fr)); gap:1rem;">
      ${vouchers.map(v => `
        <div style="background:var(--color-surface); border:1px dashed var(--color-border-strong); border-radius:var(--radius-md); padding:1.25rem; display:flex; flex-direction:column; justify-content:space-between;">
          <div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
              <span style="font-size:1.15rem; font-weight:800; color:var(--color-brand-primary);">${v.discount}</span>
              <span style="font-size:0.75rem; color:var(--color-text-muted);">${v.expiry}</span>
            </div>
            <p style="font-size:0.85rem; color:var(--color-text-secondary); line-height:1.4; margin-bottom:1rem;">${v.description}</p>
          </div>
          <div style="display:flex; align-items:center; justify-content:space-between; background:var(--color-surface-subtle); padding:0.4rem 0.75rem; border-radius:var(--radius-sm); border:1px solid var(--color-border);">
            <code style="font-family:var(--font-mono); font-weight:800; font-size:0.95rem; color:var(--color-text-primary);">${v.code}</code>
            <button type="button" class="btn btn-secondary" style="font-size:0.75rem; padding:0.25rem 0.6rem;" onclick="window.customerCopyCode('${v.code}')">
              Copy &amp; Apply
            </button>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

window.customerCopyCode = function(code) {
  Cart.applyPromoCode(code);
  renderBasketPreview();
  renderDrawerCart();
  showToast(`Voucher code "${code}" applied to cart!`, 'success');
  document.getElementById('dash-basket-section')?.scrollIntoView({ behavior: 'smooth' });
};

/**
 * ============================================================================
 * MODULE 8: SAVED WISHLIST
 * ============================================================================
 */
function renderWishlistSection() {
  const container = document.getElementById('dash-wishlist-container');
  const countBadge = document.getElementById('dash-wishlist-count');
  if (!container) return;

  const wishlist = Storage.getWishlist();
  if (countBadge) countBadge.textContent = `${wishlist.length} item${wishlist.length === 1 ? '' : 's'} saved`;

  if (wishlist.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; padding:2rem 1rem; background:var(--color-surface); border:1px dashed var(--color-border); border-radius:var(--radius-md);">
        <p style="color:var(--color-text-muted); font-size:0.875rem; margin-bottom:0.75rem;">Your wishlist is currently empty. Click the heart icon on any product to save it here.</p>
        <a href="#dash-products-section" class="btn btn-secondary" style="font-size:0.8rem; padding:0.35rem 0.75rem;">Browse Products</a>
      </div>
    `;
    return;
  }

  const allProducts = Storage.getProducts();
  const wishItems = wishlist.map(id => allProducts.find(p => p.id === id)).filter(Boolean);

  container.innerHTML = `
    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(240px, 1fr)); gap:1rem;">
      ${wishItems.map(item => `
        <div style="background:var(--color-surface); border:1px solid var(--color-border); border-radius:var(--radius-md); padding:1rem; display:flex; align-items:center; gap:0.75rem;">
          <img src="${item.image}" alt="" style="width:54px; height:54px; object-fit:cover; border-radius:var(--radius-sm); border:1px solid var(--color-border);" />
          <div style="flex:1; min-width:0;">
            <div style="font-weight:700; font-size:0.875rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(item.name)}</div>
            <div style="color:var(--color-brand-primary); font-weight:800; font-size:0.85rem;">Rs. ${item.price.toFixed(2)}</div>
            <div style="display:flex; gap:0.4rem; margin-top:0.4rem;">
              <button type="button" class="btn btn-primary" style="font-size:0.72rem; padding:0.2rem 0.5rem;" onclick="window.customerAddToCart('${item.id}')" ${item.stock <= 0 ? 'disabled' : ''}>
                ${item.stock <= 0 ? 'Sold Out' : '+ Cart'}
              </button>
              <button type="button" class="btn btn-secondary" style="font-size:0.72rem; padding:0.2rem 0.5rem;" onclick="window.customerToggleWishlist('${item.id}')">
                Remove
              </button>
            </div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

/**
 * ============================================================================
 * MODULE 9: PROFILE AND ADDRESS MANAGEMENT
 * ============================================================================
 */
function renderProfileSection() {
  const container = document.getElementById('dash-profile-container');
  if (!container) return;

  const user = state.currentUser || {};

  container.innerHTML = `
    <div style="background:var(--color-surface); border:1px solid var(--color-border); border-radius:var(--radius-lg); padding:1.5rem; display:grid; grid-template-columns:1fr 1fr; gap:1.5rem;">
      <div>
        <h4 style="font-size:1rem; font-weight:700; margin-bottom:0.75rem;">Account Information</h4>
        <div style="display:flex; flex-direction:column; gap:0.4rem; font-size:0.875rem;">
          <div><span style="color:var(--color-text-muted);">Name:</span> <strong>${escapeHtml(user.fullName || 'Member')}</strong></div>
          <div><span style="color:var(--color-text-muted);">Email:</span> <strong>${escapeHtml(user.email || 'user@example.com')}</strong></div>
          <div><span style="color:var(--color-text-muted);">Role:</span> <strong>${escapeHtml(user.role || 'Customer')}</strong></div>
          <div><span style="color:var(--color-text-muted);">Phone:</span> <strong>${escapeHtml(user.phone || '+94 77 123 4567')}</strong></div>
        </div>
      </div>

      <div>
        <h4 style="font-size:1rem; font-weight:700; margin-bottom:0.75rem;">Default Delivery Address</h4>
        <div style="font-size:0.875rem; color:var(--color-text-secondary); line-height:1.5; margin-bottom:1rem;">
          ${escapeHtml(user.address || '42 Highfield Terrace, Colombo 03, Sri Lanka')}
        </div>
        <button type="button" class="btn btn-secondary" style="font-size:0.8rem; padding:0.35rem 0.75rem;" onclick="window.customerEditProfilePrompt()">
          ✏️ Edit Details
        </button>
      </div>
    </div>
  `;
}

window.customerEditProfilePrompt = function() {
  const newName = prompt('Enter your updated Full Name:', state.currentUser.fullName || '');
  if (!newName) return;
  const newPhone = prompt('Enter your Contact Phone:', state.currentUser.phone || '');
  const newAddress = prompt('Enter your Delivery Address:', state.currentUser.address || '');

  state.currentUser.fullName = newName;
  if (newPhone) state.currentUser.phone = newPhone;
  if (newAddress) state.currentUser.address = newAddress;

  Storage.setCurrentUser(state.currentUser);
  // Also update in users collection
  const users = Storage.getUsers();
  const idx = users.findIndex(u => u.email === state.currentUser.email);
  if (idx !== -1) {
    users[idx] = { ...users[idx], ...state.currentUser };
    Storage.saveUsers(users);
  }

  renderAllModules();
  showToast('Account profile updated successfully.', 'success');
};

/**
 * Switch Demo Account Shortcut
 */
window.shopeaseSwitchAccount = function(email) {
  const users = Storage.getUsers();
  const target = users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (target) {
    Auth.login(target.email, target.password || 'password123');
    state.currentUser = Auth.getCurrentUser();
    if (email === 'admin@gmail.com') {
      window.location.href = 'admin-dashboard.html';
      return;
    }
    renderAllModules();
    showToast(`Switched active profile to ${target.fullName} (${target.email})`, 'success');
  } else {
    showToast(`Account ${email} not found in database.`, 'warning');
  }
};

/**
 * Toast & Screen Reader Announcements
 */
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.setAttribute('role', 'status');

  const icons = { success: '✅', warning: '⚠️', danger: '❌', info: 'ℹ️' };
  toast.innerHTML = `
    <span style="font-size:1.1rem;" aria-hidden="true">${icons[type] || 'ℹ️'}</span>
    <span style="font-size:0.875rem; font-weight:500;">${escapeHtml(message)}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px) scale(0.95)';
    setTimeout(() => toast.remove(), 250);
  }, 3500);
}

function announce(message) {
  const announcer = document.getElementById('live-announcer');
  if (announcer) {
    announcer.textContent = '';
    setTimeout(() => {
      announcer.textContent = message;
    }, 50);
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

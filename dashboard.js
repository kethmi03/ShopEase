/**
 * ShopEase Customer Dashboard Controller
 * Handles customer session verification, KPI statistics,
 * order history rendering, offers vouchers, address management, and navigation.
 */

import { Storage } from './storage.js';
import { Auth } from './auth.js';
import { Cart } from './cart.js';
import { CURRENCY } from './products.js';

// Application state for dashboard
const state = {
  currentUser: null,
  activeModal: null // 'cart' | 'address-edit'
};

document.addEventListener('DOMContentLoaded', () => {
  // 1. Authentication Guard: Must be logged in to view dashboard
  if (!Auth.isLoggedIn()) {
    window.location.href = 'login.html?redirect=dashboard.html';
    return;
  }

  state.currentUser = Auth.getCurrentUser();

  // 2. Initialize Accessibility Controls
  initAccessibilityControls();

  // 3. Render Dashboard Sections
  if (state.currentUser.role === 'Admin') {
    const adminBtn = document.getElementById('dash-admin-btn');
    if (adminBtn) adminBtn.style.display = 'inline-flex';
  }

  renderDashboardHeader();
  renderKPIs();
  renderOrdersSection();
  renderWishlistSection();
  renderOffersSection();
  renderBasketPreview();
  renderProfileSection();

  // 4. Initialize Navigation and Event Listeners
  initDashboardEvents();
  updateCartBadge();
});

/**
 * Universal Design Preferences (Theme & Font Scaling)
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

/**
 * Universal Design Preferences (Theme Management - Icon Only)
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

/**
 * Renders Welcome Hero Header
 */
function renderDashboardHeader() {
  const user = state.currentUser;
  const welcomeSlot = document.getElementById('dash-welcome-slot');
  if (!welcomeSlot) return;

  const initials = user.fullName
    .split(' ')
    .filter(Boolean)
    .map(p => p[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  const isAdmin = user.role === 'Admin';

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
        <a href="admin.html" class="btn btn-primary" style="font-size:0.85rem; padding:0.45rem 1rem; font-weight:700; text-decoration:none;">
          Launch Admin Console →
        </a>
      </div>
    ` : ''}

    <div class="dashboard-hero">
      <div class="dashboard-user-info">
        <div class="dashboard-avatar-large" aria-hidden="true">${initials}</div>
        <div>
          <div style="display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap;">
            <h1 class="dashboard-hero-title">Welcome back, ${escapeHtml(user.fullName)}!</h1>
            <span style="font-size:0.75rem; font-weight:800; padding:0.2rem 0.6rem; border-radius:var(--radius-full); background:var(--color-brand-primary); color:#ffffff; text-transform:uppercase;">
              ${escapeHtml(user.role || 'Verified Member')}
            </span>
          </div>
          <div class="dashboard-hero-meta">
            <span>📧 ${escapeHtml(user.email)}</span>
            <span>📞 ${escapeHtml(user.phone || '07700 900123')}</span>
            <span>📍 ${escapeHtml(user.city || 'London')}</span>
          </div>
        </div>
      </div>

      <div class="dashboard-hero-actions">
        ${isAdmin ? `
          <a href="admin.html" class="btn btn-primary" style="display:inline-flex; align-items:center; gap:0.4rem; background:linear-gradient(135deg, #1e40af, #3b82f6); color:#fff; text-decoration:none;">
            <span>🛡️</span>
            <span>Admin Console</span>
          </a>
        ` : ''}
        <a href="index.html#catalog-section" class="btn btn-secondary" style="display:inline-flex; align-items:center; gap:0.4rem; text-decoration:none;">
          <span>🛍️</span>
          <span>Explore Products</span>
        </a>
        <button type="button" class="btn btn-secondary" id="dash-hero-edit-profile-btn" style="display:inline-flex; align-items:center; gap:0.4rem;">
          <span>✏️</span>
          <span>Edit Address</span>
        </button>
      </div>
    </div>
  `;

  document.getElementById('dash-hero-edit-profile-btn')?.addEventListener('click', openAddressEditModal);
}

/**
 * Renders Quick KPI Summary Cards
 */
function renderKPIs() {
  const kpiContainer = document.getElementById('dash-kpi-container');
  if (!kpiContainer) return;

  const orders = Storage.getOrders();
  const summary = Cart.getSummary();

  kpiContainer.innerHTML = `
    <div class="dashboard-kpi-grid">
      <div class="dashboard-kpi-card">
        <div class="dashboard-kpi-icon" aria-hidden="true">📦</div>
        <div>
          <div class="dashboard-kpi-val">${orders.length}</div>
          <div class="dashboard-kpi-label">Completed Orders</div>
        </div>
      </div>

      <div class="dashboard-kpi-card">
        <div class="dashboard-kpi-icon" aria-hidden="true">🛍️</div>
        <div>
          <div class="dashboard-kpi-val">${summary.totalItems}</div>
          <div class="dashboard-kpi-label">Items in Basket (${CURRENCY.format(summary.grandTotal)})</div>
        </div>
      </div>

      <div class="dashboard-kpi-card">
        <div class="dashboard-kpi-icon" aria-hidden="true">🏷️</div>
        <div>
          <div class="dashboard-kpi-val">3</div>
          <div class="dashboard-kpi-label">Active Discount Offers</div>
        </div>
      </div>

      <div class="dashboard-kpi-card">
        <div class="dashboard-kpi-icon" aria-hidden="true">🛡️</div>
        <div>
          <div class="dashboard-kpi-val" style="color:var(--color-success); font-size:1.3rem;">Active</div>
          <div class="dashboard-kpi-label">Member Session Secure</div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Renders Orders History
 */
function renderOrdersSection() {
  const container = document.getElementById('dash-orders-container');
  if (!container) return;

  const orders = Storage.getOrders();

  if (orders.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="padding:3rem 1.5rem; text-align:center;">
        <div style="font-size:3rem; margin-bottom:1rem;" aria-hidden="true">📦</div>
        <h3 style="font-size:1.3rem; margin-bottom:0.5rem;">No orders placed yet</h3>
        <p style="color:var(--color-text-secondary); max-width:420px; margin:0 auto 1.5rem;">
          Explore our handpicked catalog of 10 curated products and place your first order today!
        </p>
        <a href="index.html#catalog-section" class="btn btn-primary" style="padding:0.75rem 1.5rem;">
          🛍️ Browse 10 Products
        </a>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:1.25rem;">
      ${orders.map(order => {
        const status = order.status || 'Confirmed';
        const isDelivered = /delivered/i.test(status);
        const isShipped = /shipped|dispatched/i.test(status) || isDelivered;
        const isProcessing = /processing/i.test(status) || isShipped;

        return `
        <article class="dashboard-order-card" aria-label="Order receipt ${order.orderId}">
          <div class="dashboard-order-header">
            <div>
              <strong style="color:var(--color-brand-primary); font-size:1.1rem; font-family:var(--font-mono);">${order.orderId}</strong>
              <span style="display:inline-block; margin-left:0.5rem; font-size:0.75rem; padding:0.25rem 0.65rem; background:${isDelivered ? 'var(--color-success-bg)' : isShipped ? 'var(--color-info-bg)' : 'var(--color-warning-bg)'}; color:${isDelivered ? 'var(--color-success)' : isShipped ? 'var(--color-info)' : 'var(--color-warning)'}; border-radius:var(--radius-full); font-weight:bold;">
                ● ${escapeHtml(status)}
              </span>
            </div>
            <div style="font-size:0.85rem; color:var(--color-text-muted);">
              📅 ${order.formattedDate}
            </div>
          </div>

          <!-- Order Status Timeline Tracker -->
          <div style="margin: 0.75rem 0 1rem; padding: 0.75rem; background: var(--color-surface-subtle); border-radius: var(--radius-sm); border: 1px solid var(--color-border);">
            <div style="font-size:0.75rem; font-weight:700; text-transform:uppercase; color:var(--color-text-muted); margin-bottom:0.5rem;">
              Shipment Progress Tracker
            </div>
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.25rem; text-align: center; font-size: 0.75rem;">
              <div style="display:flex; flex-direction:column; align-items:center; gap:0.2rem; color: var(--color-success); font-weight:600;">
                <div style="width:20px; height:20px; border-radius:50%; background:var(--color-success); color:#fff; display:flex; align-items:center; justify-content:center; font-size:11px;">✓</div>
                <span>Confirmed</span>
              </div>
              <div style="display:flex; flex-direction:column; align-items:center; gap:0.2rem; color: ${isProcessing ? 'var(--color-success)' : 'var(--color-text-muted)'}; font-weight:${isProcessing ? '600' : 'normal'};">
                <div style="width:20px; height:20px; border-radius:50%; background:${isProcessing ? 'var(--color-success)' : 'var(--color-border)'}; color:#fff; display:flex; align-items:center; justify-content:center; font-size:11px;">${isProcessing ? '✓' : '2'}</div>
                <span>Processing</span>
              </div>
              <div style="display:flex; flex-direction:column; align-items:center; gap:0.2rem; color: ${isShipped ? 'var(--color-success)' : 'var(--color-text-muted)'}; font-weight:${isShipped ? '600' : 'normal'};">
                <div style="width:20px; height:20px; border-radius:50%; background:${isShipped ? 'var(--color-success)' : 'var(--color-border)'}; color:#fff; display:flex; align-items:center; justify-content:center; font-size:11px;">${isShipped ? '✓' : '3'}</div>
                <span>Dispatched</span>
              </div>
              <div style="display:flex; flex-direction:column; align-items:center; gap:0.2rem; color: ${isDelivered ? 'var(--color-success)' : 'var(--color-text-muted)'}; font-weight:${isDelivered ? '600' : 'normal'};">
                <div style="width:20px; height:20px; border-radius:50%; background:${isDelivered ? 'var(--color-success)' : 'var(--color-border)'}; color:#fff; display:flex; align-items:center; justify-content:center; font-size:11px;">${isDelivered ? '✓' : '4'}</div>
                <span>Delivered</span>
              </div>
            </div>
          </div>

          <div style="font-size:0.875rem; color:var(--color-text-secondary); margin-bottom:0.75rem;">
            📍 <strong>Delivered to:</strong> ${escapeHtml(order.customer.fullName)}, ${escapeHtml(order.customer.address)}, ${escapeHtml(order.customer.city)} (${escapeHtml(order.customer.postcode)})
          </div>

          <ul class="dashboard-order-items">
            ${order.items.map(item => `
              <li style="display:flex; justify-content:space-between; align-items:center; font-size:0.9rem; padding:0.35rem 0; border-bottom:1px dashed var(--color-border);">
                <span>${item.quantity} × <strong>${escapeHtml(item.name)}</strong></span>
                <span style="font-weight:700;">${CURRENCY.format(item.totalPrice)}</span>
              </li>
            `).join('')}
          </ul>

          <div class="dashboard-order-footer">
            <span style="font-size:0.85rem; color:var(--color-text-muted);">
              💳 Mock Authorized ••••• ${order.payment.last4 || '8892'}
            </span>
            <div style="display:flex; align-items:center; gap:0.75rem;">
              <span style="font-size:1.15rem; font-weight:800; color:var(--color-text-primary);">
                Total: ${CURRENCY.format(order.financials.grandTotal)}
              </span>
              <button type="button" class="btn btn-secondary" style="font-size:0.8rem; padding:0.35rem 0.75rem;" onclick="window.print()">
                🖨️ Receipt
              </button>
            </div>
          </div>
        </article>
      `;
      }).join('')}
    </div>
  `;
}

/**
 * Renders Active Offers & Vouchers
 */
function renderOffersSection() {
  const container = document.getElementById('dash-offers-container');
  if (!container) return;

  const offers = [
    {
      code: 'SAVE10',
      title: '10% Off Entire Basket',
      desc: 'No minimum order required. Apply anytime for 10% instant discount.',
      badge: '🔥 Popular'
    },
    {
      code: 'WELCOME20',
      title: '20% Welcome Member Offer',
      desc: 'Exclusive first-order discount across all 3 curated departments.',
      badge: '✨ Member Perk'
    },
    {
      code: 'FREESHIP',
      title: 'Free Express Delivery',
      desc: 'Waives the standard Rs. 3.99 delivery fee completely on any order.',
      badge: '🚚 Free Shipping'
    }
  ];

  container.innerHTML = `
    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:1.25rem;">
      ${offers.map(offer => `
        <div class="voucher-ticket" style="background:var(--color-surface); border:1px solid var(--color-border); padding:1.25rem; border-radius:var(--radius-md);">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:0.5rem;">
            <div style="font-size:1.05rem; font-weight:800; color:var(--color-text-primary);">${offer.title}</div>
            <span style="font-size:0.75rem; background:var(--color-brand-primary); color:#ffffff; padding:0.15rem 0.5rem; border-radius:var(--radius-full); font-weight:700;">
              ${offer.badge}
            </span>
          </div>
          <p style="font-size:0.85rem; color:var(--color-text-secondary); margin-bottom:1rem; line-height:1.4;">
            ${offer.desc}
          </p>
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span style="font-family:var(--font-mono); font-size:0.95rem; font-weight:800; color:var(--color-brand-primary); background:var(--color-surface-subtle); padding:0.25rem 0.6rem; border-radius:4px; border:1px solid var(--color-border);">
              ${offer.code}
            </span>
            <button 
              type="button" 
              class="btn btn-primary" 
              style="font-size:0.85rem; padding:0.4rem 0.85rem;"
              onclick="window.shopeaseApplyDashboardOffer('${offer.code}')"
            >
              Apply to Basket →
            </button>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

/**
 * Renders Current Basket Preview
 */
function renderBasketPreview() {
  const container = document.getElementById('dash-basket-container');
  if (!container) return;

  const summary = Cart.getSummary();

  if (summary.items.length === 0) {
    container.innerHTML = `
      <div style="padding:1.5rem; text-align:center; background:var(--color-surface-subtle); border-radius:var(--radius-md); border:1px solid var(--color-border);">
        <p style="color:var(--color-text-secondary); margin-bottom:0.75rem;">Your shopping basket is currently empty.</p>
        <a href="index.html#catalog-section" class="btn btn-primary" style="font-size:0.85rem; padding:0.4rem 1rem;">
          🛒 Start Shopping
        </a>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div style="background:var(--color-surface-subtle); border:1px solid var(--color-border); border-radius:var(--radius-md); padding:1.25rem;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
        <strong>${summary.totalItems} Items currently in your basket</strong>
        <span style="font-size:1.15rem; font-weight:800; color:var(--color-brand-primary);">
          Total: ${CURRENCY.format(summary.grandTotal)}
        </span>
      </div>

      <ul style="list-style:none; display:flex; flex-direction:column; gap:0.5rem; margin-bottom:1.25rem;">
        ${summary.items.map(item => `
          <li style="display:flex; justify-content:space-between; font-size:0.875rem;">
            <span>${item.quantity} × ${escapeHtml(item.name)}</span>
            <strong>${CURRENCY.format(item.totalPrice)}</strong>
          </li>
        `).join('')}
      </ul>

      <div style="display:flex; gap:0.75rem; flex-wrap:wrap;">
        <button type="button" class="btn btn-primary" style="flex:1;" onclick="window.shopeaseOpenDashboardCart()">
          🛍️ View Basket Drawer & Checkout
        </button>
        <a href="index.html#catalog-section" class="btn btn-secondary">
          + Add More Products
        </a>
      </div>
    </div>
  `;
}

/**
 * Renders Profile & Address Details
 */
function renderProfileSection() {
  const container = document.getElementById('dash-profile-container');
  if (!container) return;

  const user = state.currentUser;

  container.innerHTML = `
    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:1.5rem;">
      <div style="background:var(--color-surface-subtle); border:1px solid var(--color-border); border-radius:var(--radius-md); padding:1.25rem;">
        <h4 style="font-size:0.95rem; margin-bottom:0.75rem; color:var(--color-brand-primary);">👤 Personal Information</h4>
        <p style="font-size:0.9rem; line-height:1.6; color:var(--color-text-secondary);">
          <strong>Full Name:</strong> ${escapeHtml(user.fullName)}<br>
          <strong>Email:</strong> ${escapeHtml(user.email)}<br>
          <strong>Account Role:</strong> ${escapeHtml(user.role || 'Customer')}<br>
          <strong>Joined:</strong> ${escapeHtml(user.joinedDate || '2026-01-15')}
        </p>
      </div>

      <div style="background:var(--color-surface-subtle); border:1px solid var(--color-border); border-radius:var(--radius-md); padding:1.25rem;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem;">
          <h4 style="font-size:0.95rem; color:var(--color-brand-primary); margin:0;">🚚 Default Delivery Address</h4>
          <button type="button" class="btn btn-secondary" style="font-size:0.75rem; padding:0.2rem 0.5rem;" id="dash-btn-edit-addr">
            Edit
          </button>
        </div>
        <p style="font-size:0.9rem; line-height:1.6; color:var(--color-text-secondary);">
          <strong>Street Address:</strong> ${escapeHtml(user.address || '42 Highfield Terrace')}<br>
          <strong>City / Town:</strong> ${escapeHtml(user.city || 'Manchester')}<br>
          <strong>Postal Code:</strong> ${escapeHtml(user.postcode || 'M14 6XX')}<br>
          <strong>Contact Phone:</strong> ${escapeHtml(user.phone || '07700 900123')}
        </p>
      </div>
    </div>
  `;

  document.getElementById('dash-btn-edit-addr')?.addEventListener('click', openAddressEditModal);
}

/**
 * Event Listeners & Navigation Bar handlers
 */
function initDashboardEvents() {
  // Navigation Bar Buttons
  document.getElementById('dash-offers-btn')?.addEventListener('click', () => {
    document.getElementById('dash-offers-section')?.scrollIntoView({ behavior: 'smooth' });
  });

  document.getElementById('dash-orders-btn')?.addEventListener('click', () => {
    document.getElementById('dash-orders-section')?.scrollIntoView({ behavior: 'smooth' });
  });

  document.getElementById('dash-cart-btn')?.addEventListener('click', () => {
    openDrawer();
  });

  document.getElementById('dash-logout-btn')?.addEventListener('click', () => {
    Auth.logout();
    window.location.href = 'index.html';
  });

  // Drawer Close
  document.getElementById('dash-cart-close-btn')?.addEventListener('click', closeDrawer);
  document.getElementById('dash-cart-overlay')?.addEventListener('click', (e) => {
    if (e.target === document.getElementById('dash-cart-overlay')) closeDrawer();
  });

  // Global escape
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeDrawer();
      closeAddressModal();
    }
  });

  // Listen for storage updates
  window.addEventListener('shopease:cart-updated', () => {
    updateCartBadge();
    renderKPIs();
    renderBasketPreview();
    renderDrawerItems();
  });

  window.addEventListener('shopease:auth-changed', () => {
    state.currentUser = Auth.getCurrentUser();
    if (!state.currentUser) {
      window.location.href = 'index.html';
      return;
    }
    renderDashboardHeader();
    renderProfileSection();
  });
}

function updateCartBadge() {
  const summary = Cart.getSummary();
  const badge = document.getElementById('dash-cart-badge');
  if (badge) {
    badge.textContent = summary.totalItems;
  }
}

function openDrawer() {
  const overlay = document.getElementById('dash-cart-overlay');
  if (overlay) {
    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden', 'false');
    renderDrawerItems();
  }
}

function closeDrawer() {
  const overlay = document.getElementById('dash-cart-overlay');
  if (overlay) {
    overlay.classList.remove('open');
    overlay.setAttribute('aria-hidden', 'true');
  }
}

function renderDrawerItems() {
  const container = document.getElementById('dash-drawer-items');
  const subtotalEl = document.getElementById('dash-drawer-subtotal');
  const grandTotalEl = document.getElementById('dash-drawer-grandtotal');
  if (!container) return;

  const summary = Cart.getSummary();

  if (subtotalEl) subtotalEl.textContent = CURRENCY.format(summary.subtotal);
  if (grandTotalEl) grandTotalEl.textContent = CURRENCY.format(summary.grandTotal);

  if (summary.items.length === 0) {
    container.innerHTML = `
      <div style="padding:2.5rem 1rem; text-align:center;">
        <p style="color:var(--color-text-secondary);">Your basket is empty.</p>
        <a href="index.html#catalog-section" class="btn btn-primary" style="margin-top:0.75rem;">
          Start Shopping
        </a>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <ul style="list-style:none; display:flex; flex-direction:column; gap:0.75rem;">
      ${summary.items.map(item => `
        <li style="display:flex; justify-content:space-between; align-items:center; padding-bottom:0.5rem; border-bottom:1px solid var(--color-border);">
          <div>
            <div style="font-weight:700; font-size:0.9rem;">${escapeHtml(item.name)}</div>
            <div style="font-size:0.8rem; color:var(--color-text-muted);">
              ${item.quantity} × ${CURRENCY.format(item.price)}
            </div>
          </div>
          <div style="font-weight:800; font-size:0.95rem;">
            ${CURRENCY.format(item.totalPrice)}
          </div>
        </li>
      `).join('')}
    </ul>
  `;
}

/**
 * Edit Address Modal
 */
function openAddressEditModal() {
  const modal = document.getElementById('dash-address-modal');
  if (!modal) return;

  const user = state.currentUser;
  document.getElementById('edit-fullname').value = user.fullName || '';
  document.getElementById('edit-phone').value = user.phone || '';
  document.getElementById('edit-address').value = user.address || '';
  document.getElementById('edit-city').value = user.city || '';
  document.getElementById('edit-postcode').value = user.postcode || '';

  modal.style.display = 'flex';
  modal.setAttribute('aria-hidden', 'false');
}

function closeAddressModal() {
  const modal = document.getElementById('dash-address-modal');
  if (modal) {
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');
  }
}

// Global dashboard helpers
window.shopeaseApplyDashboardOffer = (code) => {
  const res = Cart.setPromo(code);
  if (res.success) {
    showToast(`Voucher "${code}" applied to your basket!`, 'success');
    renderKPIs();
    renderBasketPreview();
    openDrawer();
  } else {
    showToast(res.message, 'warning');
  }
};

window.shopeaseOpenDashboardCart = () => {
  openDrawer();
};

window.shopeaseSaveAddress = (e) => {
  e.preventDefault();
  const fullName = document.getElementById('edit-fullname').value.trim();
  const phone = document.getElementById('edit-phone').value.trim();
  const address = document.getElementById('edit-address').value.trim();
  const city = document.getElementById('edit-city').value.trim();
  const postcode = document.getElementById('edit-postcode').value.trim();

  if (!fullName || !address) {
    showToast('Name and Address are required.', 'warning');
    return;
  }

  Storage.updateUser({ fullName, phone, address, city, postcode });
  state.currentUser = Auth.getCurrentUser();
  closeAddressModal();
  renderDashboardHeader();
  renderProfileSection();
  showToast('Delivery address updated successfully.', 'success');
};

window.shopeaseCloseAddressModal = () => {
  closeAddressModal();
};

/**
 * Renders Saved Wishlist Section
 */
function renderWishlistSection() {
  const container = document.getElementById('dash-wishlist-container');
  const countSpan = document.getElementById('dash-wishlist-count');
  if (!container) return;

  const wishlistIds = Storage.getWishlist();
  const allProducts = Storage.getProducts();
  const wishlistItems = allProducts.filter(p => wishlistIds.includes(p.id));

  if (countSpan) {
    countSpan.textContent = `${wishlistItems.length} item${wishlistItems.length === 1 ? '' : 's'} saved`;
  }

  if (wishlistItems.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="padding:2.5rem 1.5rem; text-align:center; background:var(--color-surface); border:1px dashed var(--color-border); border-radius:var(--radius-md);">
        <div style="font-size:2.5rem; margin-bottom:0.75rem;" aria-hidden="true">🤍</div>
        <h3 style="font-size:1.2rem; margin-bottom:0.4rem;">Your Wishlist is Empty</h3>
        <p style="color:var(--color-text-secondary); max-width:400px; margin:0 auto 1.25rem; font-size:0.9rem;">
          Save products you love by clicking the heart button on any item in our store.
        </p>
        <a href="index.html#catalog-section" class="btn btn-secondary" style="padding:0.5rem 1.2rem; text-decoration:none;">
          🛍️ Browse Products
        </a>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(260px, 1fr)); gap:1rem;">
      ${wishlistItems.map(item => `
        <div style="background:var(--color-surface); border:1px solid var(--color-border); border-radius:var(--radius-md); padding:1rem; display:flex; flex-direction:column; justify-content:space-between; gap:0.75rem;">
          <div style="display:flex; gap:0.75rem; align-items:center;">
            <img src="${item.image}" alt="${escapeHtml(item.name)}" style="width:56px; height:56px; object-fit:cover; border-radius:var(--radius-sm); border:1px solid var(--color-border);" />
            <div>
              <span style="font-size:0.7rem; text-transform:uppercase; font-weight:700; color:var(--color-brand-primary);">${item.category}</span>
              <div style="font-weight:700; font-size:0.9rem; line-height:1.2; margin-top:0.15rem; color:var(--color-text-primary);">${escapeHtml(item.name)}</div>
              <div style="font-weight:800; font-size:1rem; color:var(--color-text-primary); margin-top:0.25rem;">${CURRENCY.format(item.price)}</div>
            </div>
          </div>
          <div style="display:flex; align-items:center; justify-content:space-between; gap:0.5rem; padding-top:0.5rem; border-top:1px solid var(--color-border);">
            <button type="button" class="btn btn-primary" style="font-size:0.8rem; padding:0.35rem 0.75rem; flex:1;" onclick="window.shopeaseAddWishlistToCart('${item.id}')">
              🛒 Add to Basket
            </button>
            <button type="button" class="btn btn-secondary" style="font-size:0.8rem; padding:0.35rem 0.6rem; color:var(--color-danger);" onclick="window.shopeaseRemoveWishlist('${item.id}')" title="Remove from wishlist">
              ✕
            </button>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

// Global Wishlist and Profile Switch Handlers
window.shopeaseAddWishlistToCart = (productId) => {
  const res = Cart.addItem(productId, 1);
  if (res.success) {
    showToast(`Added to basket! (${res.item.name})`, 'success');
    updateCartBadge();
    renderBasketPreview();
    renderKPIs();
  } else {
    showToast(res.message, 'warning');
  }
};

window.shopeaseRemoveWishlist = (productId) => {
  Storage.toggleWishlist(productId);
  showToast('Removed from wishlist', 'info');
  renderWishlistSection();
};

window.shopeaseSwitchAccount = (email) => {
  const users = Storage.getUsers();
  const u = users.find(x => x.email.toLowerCase() === email.toLowerCase());
  if (u) {
    Auth.login(u.email, u.password || 'password123');
    showToast(`Switched active profile to ${u.fullName} (${u.role})`, 'success');
    setTimeout(() => {
      if (u.role === 'Admin') {
        window.location.href = 'admin.html';
      } else {
        window.location.reload();
      }
    }, 250);
  }
};

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
  const el = document.getElementById('live-announcer');
  if (el) {
    el.textContent = '';
    setTimeout(() => { el.textContent = message; }, 50);
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

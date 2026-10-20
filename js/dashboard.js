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
  renderDashboardHeader();
  renderKPIs();
  renderOrdersSection();
  renderOffersSection();
  renderBasketPreview();
  renderProfileSection();

  // 4. Initialize Navigation and Event Listeners
  initDashboardEvents();
  updateCartBadge();
});

/**
 * Universal Design Preferences (Theme & Font Scaling)
 */
function initAccessibilityControls() {
  const themeSelect = document.getElementById('theme-select');
  const btnFontNormal = document.getElementById('btn-font-normal');
  const btnFontLarge = document.getElementById('btn-font-large');
  const btnFontXLarge = document.getElementById('btn-font-xlarge');

  const settings = Storage.getSettings();
  document.documentElement.setAttribute('data-theme', settings.theme || 'light');
  document.documentElement.setAttribute('data-font-size', settings.fontSize || 'normal');

  if (themeSelect) {
    themeSelect.value = settings.theme || 'light';
    themeSelect.addEventListener('change', (e) => {
      const theme = e.target.value;
      document.documentElement.setAttribute('data-theme', theme);
      Storage.saveSettings({ theme });
      announce(`Theme changed to ${theme} mode.`);
    });
  }

  const fontBtns = [
    { btn: btnFontNormal, size: 'normal' },
    { btn: btnFontLarge, size: 'large' },
    { btn: btnFontXLarge, size: 'xlarge' }
  ];

  fontBtns.forEach(({ btn, size }) => {
    if (!btn) return;
    if (settings.fontSize === size) btn.classList.add('active');

    btn.addEventListener('click', () => {
      fontBtns.forEach(b => b.btn?.classList.remove('active'));
      btn.classList.add('active');
      document.documentElement.setAttribute('data-font-size', size);
      Storage.saveSettings({ fontSize: size });
      announce(`Font size changed to ${size}.`);
    });
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

  welcomeSlot.innerHTML = `
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
        <a href="index.html#catalog-section" class="btn btn-primary" style="display:inline-flex; align-items:center; gap:0.4rem;">
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
    <div style="display:flex; flex-direction:column; gap:1rem;">
      ${orders.map(order => `
        <article class="dashboard-order-card" aria-label="Order receipt ${order.orderId}">
          <div class="dashboard-order-header">
            <div>
              <strong style="color:var(--color-brand-primary); font-size:1.05rem;">${order.orderId}</strong>
              <span style="display:inline-block; margin-left:0.5rem; font-size:0.75rem; padding:0.2rem 0.6rem; background:var(--color-success-bg); color:var(--color-success); border-radius:var(--radius-full); font-weight:bold;">
                ${order.status}
              </span>
            </div>
            <div style="font-size:0.85rem; color:var(--color-text-muted);">
              📅 ${order.formattedDate}
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
            <div style="display:flex; align-items:center; gap:1rem;">
              <span style="font-size:1.15rem; font-weight:800; color:var(--color-text-primary);">
                Total: ${CURRENCY.format(order.financials.grandTotal)}
              </span>
              <button type="button" class="btn btn-secondary" style="font-size:0.8rem; padding:0.35rem 0.75rem;" onclick="window.print()">
                🖨️ Receipt
              </button>
            </div>
          </div>
        </article>
      `).join('')}
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

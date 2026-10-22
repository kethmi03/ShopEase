/**
 * ShopEase Admin Console Controller
 * Full-featured store management: inventory, orders, customer directory,
 * promotions, live KPI analytics, and system utilities.
 */

import { Storage } from './storage.js';
import { Auth } from './auth.js';
import { CURRENCY, INITIAL_PRODUCTS } from './products.js';
import { PROMO_CODES } from './cart.js';

// Application State
const state = {
  currentUser: null,
  activeTab: 'overview',
  productFilter: {
    search: '',
    category: 'ALL',
    stock: 'ALL'
  },
  orderFilter: {
    search: '',
    status: 'ALL'
  },
  customerFilter: {
    search: '',
    role: 'ALL'
  }
};

// Universal Theme Management
const THEMES = ['light', 'dark', 'high-contrast'];
const THEME_ICONS = {
  'light': '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>',
  'dark': '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>',
  'high-contrast': '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><path d="M12 2a10 10 0 0 1 0 20z" fill="currentColor"></path></svg>'
};

document.addEventListener('DOMContentLoaded', () => {
  // 1. Session Verification
  const user = Auth.getCurrentUser();
  if (!user) {
    // If not logged in, auto-login as Admin for seamless demonstration or redirect
    const adminUser = Storage.getUsers().find(u => u.role === 'Admin');
    if (adminUser) {
      Auth.login(adminUser.email, adminUser.password || 'password123');
      state.currentUser = Auth.getCurrentUser();
    } else {
      window.location.href = 'login.html?redirect=admin.html';
      return;
    }
  } else {
    state.currentUser = user;
  }

  // 2. Initialize Theme & Accessibility
  initTheme();

  // 3. Setup Navigation & Listeners
  initTabNavigation();
  initFilterListeners();
  initLogout();

  // 4. Initial Render
  refreshAllData();

  // 5. Setup Live Storage Sync
  window.addEventListener('shopease:inventory-updated', refreshAllData);
  window.addEventListener('shopease:orders-updated', refreshAllData);
  window.addEventListener('shopease:users-updated', refreshAllData);
});

function initTheme() {
  const settings = Storage.getSettings();
  applyTheme(settings.theme || 'light');
  document.documentElement.setAttribute('data-font-size', settings.fontSize || 'normal');

  const btn = document.getElementById('theme-toggle-btn');
  btn?.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const nextIdx = (THEMES.indexOf(current) + 1) % THEMES.length;
    applyTheme(THEMES[nextIdx]);
    announce(`Theme switched to ${THEMES[nextIdx]} mode.`);
  });
}

function applyTheme(theme) {
  const targetTheme = THEMES.includes(theme) ? theme : 'light';
  document.documentElement.setAttribute('data-theme', targetTheme);
  Storage.saveSettings({ theme: targetTheme });

  const iconSpan = document.getElementById('theme-icon');
  if (iconSpan) {
    iconSpan.innerHTML = THEME_ICONS[targetTheme] || THEME_ICONS['light'];
  }
}

function initTabNavigation() {
  const buttons = document.querySelectorAll('.admin-nav-btn[data-tab]');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.getAttribute('data-tab');
      switchTab(tab);
    });
  });
}

function switchTab(tabId) {
  state.activeTab = tabId;

  // Update nav buttons
  document.querySelectorAll('.admin-nav-btn[data-tab]').forEach(b => {
    const isActive = b.getAttribute('data-tab') === tabId;
    b.classList.toggle('active', isActive);
    b.setAttribute('aria-selected', isActive ? 'true' : 'false');
  });

  // Update panels
  document.querySelectorAll('.admin-panel').forEach(p => {
    p.classList.toggle('active', p.id === `panel-${tabId}`);
  });

  announce(`Navigated to ${tabId} panel.`);
}

function initLogout() {
  document.getElementById('admin-logout-btn')?.addEventListener('click', () => {
    Auth.logout();
    window.location.href = 'login.html';
  });
}

function initFilterListeners() {
  // Product Filters
  document.getElementById('filter-products-search')?.addEventListener('input', (e) => {
    state.productFilter.search = e.target.value.toLowerCase().trim();
    renderProductsTable();
  });
  document.getElementById('filter-products-category')?.addEventListener('change', (e) => {
    state.productFilter.category = e.target.value;
    renderProductsTable();
  });
  document.getElementById('filter-products-stock')?.addEventListener('change', (e) => {
    state.productFilter.stock = e.target.value;
    renderProductsTable();
  });

  // Order Filters
  document.getElementById('filter-orders-search')?.addEventListener('input', (e) => {
    state.orderFilter.search = e.target.value.toLowerCase().trim();
    renderOrdersTable();
  });
  document.getElementById('filter-orders-status')?.addEventListener('change', (e) => {
    state.orderFilter.status = e.target.value;
    renderOrdersTable();
  });

  // Customer Filters
  document.getElementById('filter-customers-search')?.addEventListener('input', (e) => {
    state.customerFilter.search = e.target.value.toLowerCase().trim();
    renderCustomersTable();
  });
  document.getElementById('filter-customers-role')?.addEventListener('change', (e) => {
    state.customerFilter.role = e.target.value;
    renderCustomersTable();
  });
}

function refreshAllData() {
  renderOverviewKPIs();
  renderOverviewRecentOrders();
  renderOverviewStockHealth();
  renderProductsTable();
  renderOrdersTable();
  renderCustomersTable();
  renderVouchersGrid();
  updateBadges();
}

function updateBadges() {
  const products = Storage.getProducts();
  const orders = Storage.getOrders();
  const users = Storage.getUsers();

  const prodBadge = document.getElementById('badge-products-count');
  const orderBadge = document.getElementById('badge-orders-count');
  const custBadge = document.getElementById('badge-customers-count');

  if (prodBadge) prodBadge.textContent = products.length;
  if (orderBadge) orderBadge.textContent = orders.length;
  if (custBadge) custBadge.textContent = users.length;
}

/**
 * 1. Overview KPIs
 */
function renderOverviewKPIs() {
  const orders = Storage.getOrders();
  const products = Storage.getProducts();
  const users = Storage.getUsers();

  const totalRevenue = orders.reduce((sum, o) => sum + (o.financials?.grandTotal || 0), 0);
  const lowStockCount = products.filter(p => p.stock <= 10).length;

  const revEl = document.getElementById('kpi-total-revenue');
  const ordEl = document.getElementById('kpi-total-orders');
  const custEl = document.getElementById('kpi-total-customers');
  const stockEl = document.getElementById('kpi-low-stock-count');

  if (revEl) revEl.textContent = CURRENCY.format(totalRevenue);
  if (ordEl) ordEl.textContent = orders.length;
  if (custEl) custEl.textContent = users.length;
  if (stockEl) stockEl.textContent = lowStockCount;
}

function renderOverviewRecentOrders() {
  const tbody = document.getElementById('overview-orders-tbody');
  if (!tbody) return;

  const orders = Storage.getOrders().slice(0, 5);
  if (orders.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="4" style="text-align:center; padding: 2rem; color: var(--color-text-muted);">
          No orders placed yet. Click <strong>⚡ Generate Test Order</strong> above to create one.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = orders.map(order => `
    <tr>
      <td>
        <strong style="color:var(--color-brand-primary); font-family:var(--font-mono);">${order.orderId}</strong>
      </td>
      <td>
        <div style="font-weight:600;">${escapeHtml(order.customer.fullName)}</div>
        <div style="font-size:0.75rem; color:var(--color-text-muted);">${escapeHtml(order.customer.email)}</div>
      </td>
      <td>
        <strong>${CURRENCY.format(order.financials?.grandTotal || 0)}</strong>
      </td>
      <td>
        <span class="admin-status-badge ${getStatusBadgeClass(order.status)}">
          ${escapeHtml(order.status || 'Confirmed')}
        </span>
      </td>
    </tr>
  `).join('');
}

function renderOverviewStockHealth() {
  const container = document.getElementById('overview-stock-health-container');
  if (!container) return;

  const products = Storage.getProducts();
  const sorted = [...products].sort((a, b) => a.stock - b.stock).slice(0, 5);

  container.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:0.85rem;">
      ${sorted.map(p => {
        const pct = Math.min(100, Math.round((p.stock / 40) * 100));
        const color = p.stock === 0 ? 'var(--color-danger)' : p.stock <= 10 ? 'var(--color-warning)' : 'var(--color-success)';

        return `
          <div>
            <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.85rem; margin-bottom:0.25rem;">
              <span style="font-weight:600; color:var(--color-text-primary);">${escapeHtml(p.name)}</span>
              <strong style="color:${color};">${p.stock} units left</strong>
            </div>
            <div style="height:6px; background:var(--color-border); border-radius:var(--radius-full); overflow:hidden;">
              <div style="width:${pct}%; height:100%; background:${color}; border-radius:var(--radius-full); transition:width 300ms ease;"></div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

/**
 * 2. Products Table
 */
function renderProductsTable() {
  const tbody = document.getElementById('products-tbody');
  const countEl = document.getElementById('products-table-count');
  if (!tbody) return;

  let products = Storage.getProducts();
  const { search, category, stock } = state.productFilter;

  if (search) {
    products = products.filter(p => p.name.toLowerCase().includes(search) || p.id.toLowerCase().includes(search));
  }
  if (category !== 'ALL') {
    products = products.filter(p => p.category === category);
  }
  if (stock === 'LOW') {
    products = products.filter(p => p.stock > 0 && p.stock <= 10);
  } else if (stock === 'OUT') {
    products = products.filter(p => p.stock === 0);
  } else if (stock === 'IN') {
    products = products.filter(p => p.stock > 10);
  }

  if (countEl) countEl.textContent = `${products.length} Products`;

  if (products.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align:center; padding: 2.5rem; color: var(--color-text-muted);">
          No products matched the active search filters.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = products.map(p => {
    const isOut = p.stock === 0;
    const isLow = p.stock > 0 && p.stock <= 10;
    const stockBadge = isOut 
      ? '<span class="admin-status-badge status-badge-danger">Out of Stock</span>'
      : isLow 
      ? '<span class="admin-status-badge status-badge-warning">Low Stock</span>'
      : '<span class="admin-status-badge status-badge-success">In Stock</span>';

    return `
      <tr>
        <td>
          <div style="display:flex; align-items:center; gap:0.75rem;">
            <img src="${p.image}" alt="${escapeHtml(p.name)}" style="width:44px; height:44px; object-fit:cover; border-radius:var(--radius-sm); border:1px solid var(--color-border);" />
            <div>
              <div style="font-weight:700; color:var(--color-text-primary);">${escapeHtml(p.name)}</div>
              <div style="font-size:0.75rem; color:var(--color-text-muted); font-family:var(--font-mono);">${p.id}</div>
            </div>
          </div>
        </td>
        <td>
          <span style="font-size:0.75rem; font-weight:700; color:var(--color-brand-primary); background:var(--color-surface-subtle); padding:0.2rem 0.5rem; border-radius:var(--radius-sm); border:1px solid var(--color-border);">
            ${p.category}
          </span>
        </td>
        <td>
          <strong style="font-size:0.95rem;">${CURRENCY.format(p.price)}</strong>
        </td>
        <td>
          <div style="display:flex; align-items:center; gap:0.5rem;">
            <strong style="font-size:1rem; ${isOut ? 'color:var(--color-danger);' : isLow ? 'color:var(--color-warning);' : ''}">${p.stock}</strong>
            ${stockBadge}
          </div>
        </td>
        <td>
          <!-- Inline Stock Stepper -->
          <div style="display:inline-flex; align-items:center; gap:0.35rem; background:var(--color-surface-subtle); padding:0.2rem; border-radius:var(--radius-sm); border:1px solid var(--color-border);">
            <button type="button" class="admin-stepper-btn" onclick="window.adminAdjustStock('${p.id}', -1)" title="Decrement stock" ${p.stock <= 0 ? 'disabled' : ''}>−</button>
            <span style="min-width:28px; text-align:center; font-weight:700; font-size:0.85rem;">${p.stock}</span>
            <button type="button" class="admin-stepper-btn" onclick="window.adminAdjustStock('${p.id}', 1)" title="Increment stock">+</button>
            <button type="button" class="admin-stepper-btn" onclick="window.adminAdjustStock('${p.id}', 10)" title="Quick +10 restock" style="width:auto; padding:0 0.4rem; font-size:0.75rem;">+10</button>
          </div>
        </td>
        <td>
          <div style="display:flex; align-items:center; gap:0.4rem;">
            <button type="button" class="btn btn-secondary" style="font-size:0.75rem; padding:0.3rem 0.6rem;" onclick="window.adminOpenEditProduct('${p.id}')">
              ✏️ Edit
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

/**
 * 3. Orders Table
 */
function renderOrdersTable() {
  const tbody = document.getElementById('orders-tbody');
  const countEl = document.getElementById('orders-table-count');
  if (!tbody) return;

  let orders = Storage.getOrders();
  const { search, status } = state.orderFilter;

  if (search) {
    orders = orders.filter(o => 
      o.orderId.toLowerCase().includes(search) || 
      o.customer.fullName.toLowerCase().includes(search) || 
      o.customer.email.toLowerCase().includes(search)
    );
  }
  if (status !== 'ALL') {
    orders = orders.filter(o => o.status.toLowerCase().includes(status.toLowerCase()));
  }

  if (countEl) countEl.textContent = `${orders.length} Order${orders.length === 1 ? '' : 's'}`;

  if (orders.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center; padding: 2.5rem; color: var(--color-text-muted);">
          No orders found matching the filter criteria.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = orders.map(order => {
    const currentStatus = order.status || 'Confirmed';

    return `
      <tr>
        <td>
          <strong style="color:var(--color-brand-primary); font-family:var(--font-mono); font-size:0.95rem;">${order.orderId}</strong>
        </td>
        <td>
          <div style="font-size:0.8rem; color:var(--color-text-primary); font-weight:600;">${order.formattedDate || 'Recent'}</div>
        </td>
        <td>
          <div style="font-weight:700;">${escapeHtml(order.customer.fullName)}</div>
          <div style="font-size:0.75rem; color:var(--color-text-muted);">${escapeHtml(order.customer.email)}</div>
          <div style="font-size:0.7rem; color:var(--color-text-muted);">${escapeHtml(order.customer.address)}</div>
        </td>
        <td>
          <div style="font-size:0.85rem; max-width:220px;">
            ${order.items.map(i => `<div>${i.quantity} × ${escapeHtml(i.name)}</div>`).join('')}
          </div>
        </td>
        <td>
          <strong style="font-size:1rem; color:var(--color-text-primary);">${CURRENCY.format(order.financials?.grandTotal || 0)}</strong>
        </td>
        <td>
          <!-- Live Status Dropdown -->
          <select 
            class="form-input" 
            style="font-size:0.8rem; padding:0.25rem 0.5rem; height:auto; width:auto; font-weight:600;" 
            onchange="window.adminUpdateOrderStatus('${order.orderId}', this.value)"
          >
            <option value="Confirmed" ${currentStatus.includes('Confirmed') ? 'selected' : ''}>● Confirmed</option>
            <option value="Processing" ${currentStatus.includes('Processing') ? 'selected' : ''}>⏳ Processing</option>
            <option value="Dispatched / Shipped" ${currentStatus.includes('Dispatched') || currentStatus.includes('Shipped') ? 'selected' : ''}>🚚 Dispatched / Shipped</option>
            <option value="Delivered" ${currentStatus.includes('Delivered') ? 'selected' : ''}>✅ Delivered</option>
            <option value="Cancelled" ${currentStatus.includes('Cancelled') ? 'selected' : ''}>❌ Cancelled</option>
          </select>
        </td>
        <td>
          <div style="display:flex; align-items:center; gap:0.4rem;">
            <button type="button" class="btn btn-secondary" style="font-size:0.75rem; padding:0.3rem 0.6rem;" onclick="window.adminViewInvoice('${order.orderId}')">
              📄 Invoice
            </button>
            <button type="button" class="btn btn-secondary" style="font-size:0.75rem; padding:0.3rem 0.5rem; color:var(--color-danger);" onclick="window.adminDeleteOrder('${order.orderId}')" title="Delete Order Record">
              🗑️
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

/**
 * 4. Customers Table
 */
function renderCustomersTable() {
  const tbody = document.getElementById('customers-tbody');
  const countEl = document.getElementById('customers-table-count');
  if (!tbody) return;

  let users = Storage.getUsers();
  const { search, role } = state.customerFilter;

  if (search) {
    users = users.filter(u => u.fullName.toLowerCase().includes(search) || u.email.toLowerCase().includes(search));
  }
  if (role !== 'ALL') {
    users = users.filter(u => u.role === role);
  }

  if (countEl) countEl.textContent = `${users.length} User${users.length === 1 ? '' : 's'}`;

  tbody.innerHTML = users.map(user => {
    const initials = (user.fullName || 'User')
      .split(' ')
      .map(p => p[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();

    const roleBadge = user.role === 'Admin'
      ? '<span class="admin-status-badge status-badge-info">🛡️ Admin</span>'
      : user.role === 'VIP Member'
      ? '<span class="admin-status-badge status-badge-warning">⭐ VIP</span>'
      : '<span class="admin-status-badge status-badge-success">👤 Customer</span>';

    return `
      <tr>
        <td>
          <div style="display:flex; align-items:center; gap:0.75rem;">
            <div style="width:36px; height:36px; border-radius:50%; background:var(--color-brand-primary); color:#fff; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:0.85rem;">
              ${initials}
            </div>
            <div>
              <div style="font-weight:700;">${escapeHtml(user.fullName)}</div>
              <div style="font-size:0.75rem; color:var(--color-text-muted); font-family:var(--font-mono);">${user.id}</div>
            </div>
          </div>
        </td>
        <td>
          <div style="font-weight:600;">${escapeHtml(user.email)}</div>
          <div style="font-size:0.75rem; color:var(--color-text-muted);">${escapeHtml(user.phone || 'N/A')}</div>
        </td>
        <td>
          <div style="font-size:0.85rem;">${escapeHtml(user.address || 'London')}, ${escapeHtml(user.city || 'UK')}</div>
          <div style="font-size:0.75rem; color:var(--color-text-muted);">${escapeHtml(user.postcode || '')}</div>
        </td>
        <td>
          <select 
            class="form-input" 
            style="font-size:0.8rem; padding:0.25rem 0.5rem; height:auto; width:auto; font-weight:600;" 
            onchange="window.adminUpdateUserRole('${user.id}', this.value)"
          >
            <option value="Customer" ${user.role === 'Customer' ? 'selected' : ''}>👤 Customer</option>
            <option value="VIP Member" ${user.role === 'VIP Member' ? 'selected' : ''}>⭐ VIP Member</option>
            <option value="Admin" ${user.role === 'Admin' ? 'selected' : ''}>🛡️ Administrator</option>
          </select>
        </td>
        <td>
          <div style="font-size:0.8rem; color:var(--color-text-muted);">${user.joinedDate || '2026-01-01'}</div>
        </td>
        <td>
          <button type="button" class="btn btn-secondary" style="font-size:0.75rem; padding:0.25rem 0.5rem;" onclick="window.adminSwitchUser('${user.email}')" title="Log in as this user">
            Login As User →
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

/**
 * 5. Vouchers Grid
 */
function renderVouchersGrid() {
  const grid = document.getElementById('vouchers-grid');
  if (!grid) return;

  const codes = Object.entries(PROMO_CODES);

  grid.innerHTML = codes.map(([code, data]) => `
    <div class="admin-table-card" style="padding: 1.25rem; display:flex; flex-direction:column; justify-content:space-between; gap:0.75rem;">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <span style="font-family:var(--font-mono); font-size:1.15rem; font-weight:800; color:var(--color-brand-primary); background:var(--color-surface-subtle); padding:0.25rem 0.6rem; border-radius:var(--radius-sm); border:1px dashed var(--color-brand-primary);">
          ${code}
        </span>
        <span class="admin-status-badge status-badge-success">● Active</span>
      </div>
      <div>
        <div style="font-weight:700; font-size:1rem; margin-bottom:0.2rem; color:var(--color-text-primary);">${escapeHtml(data.description)}</div>
        <div style="font-size:0.85rem; color:var(--color-text-muted);">
          Benefit: <strong>${data.type === 'percent' ? `${data.value * 100}% Discount` : 'Free Express Delivery (Rs. 3.99 saved)'}</strong>
        </div>
      </div>
      <div style="padding-top:0.75rem; border-top:1px solid var(--color-border); display:flex; justify-content:space-between; align-items:center;">
        <span style="font-size:0.75rem; color:var(--color-text-muted);">Storewide Coupon</span>
        <button type="button" class="btn btn-secondary" style="font-size:0.75rem; padding:0.25rem 0.5rem;" onclick="navigator.clipboard.writeText('${code}'); window.showToast('Copied ${code}!', 'info');">
          📋 Copy Code
        </button>
      </div>
    </div>
  `).join('');
}

function getStatusBadgeClass(status) {
  if (!status) return 'status-badge-info';
  const s = status.toLowerCase();
  if (s.includes('delivered') || s.includes('complete')) return 'status-badge-success';
  if (s.includes('dispatched') || s.includes('shipped')) return 'status-badge-info';
  if (s.includes('processing')) return 'status-badge-warning';
  if (s.includes('cancel')) return 'status-badge-danger';
  return 'status-badge-info';
}

// =========================================================================
// GLOBAL INTERACTIVE ACTIONS & MODAL CONTROLLERS
// =========================================================================

window.adminSwitchTab = (tab) => {
  switchTab(tab);
};

window.adminAdjustStock = (productId, delta) => {
  const p = Storage.getProductById(productId);
  if (!p) return;
  const newStock = Math.max(0, p.stock + delta);
  Storage.updateStock(productId, newStock);
  showToast(`Stock updated: ${p.name} is now ${newStock}`, 'info');
  refreshAllData();
};

window.adminOpenEditProduct = (productId) => {
  const p = Storage.getProductById(productId);
  if (!p) return;

  document.getElementById('edit-prod-id').value = p.id;
  document.getElementById('edit-prod-name').value = p.name;
  document.getElementById('edit-prod-category').value = p.category;
  document.getElementById('edit-prod-price').value = p.price;
  document.getElementById('edit-prod-stock').value = p.stock;
  document.getElementById('edit-prod-description').value = p.description || '';

  document.getElementById('modal-edit-product').style.display = 'flex';
};

window.adminSaveProductEdit = (e) => {
  e.preventDefault();
  const id = document.getElementById('edit-prod-id').value;
  const name = document.getElementById('edit-prod-name').value.trim();
  const category = document.getElementById('edit-prod-category').value;
  const price = parseFloat(document.getElementById('edit-prod-price').value);
  const stock = parseInt(document.getElementById('edit-prod-stock').value, 10);
  const description = document.getElementById('edit-prod-description').value.trim();

  Storage.updateProduct(id, { name, category, price, stock, description });
  showToast(`Updated "${name}" successfully!`, 'success');
  window.adminCloseModals();
  refreshAllData();
};

window.adminOpenAddProductModal = () => {
  document.getElementById('modal-add-product').style.display = 'flex';
};

window.adminSaveNewProduct = (e) => {
  e.preventDefault();
  const name = document.getElementById('add-prod-name').value.trim();
  const category = document.getElementById('add-prod-category').value;
  const price = parseFloat(document.getElementById('add-prod-price').value);
  const stock = parseInt(document.getElementById('add-prod-stock').value, 10);
  const description = document.getElementById('add-prod-description').value.trim();

  const id = 'prod_' + Date.now();
  const categoryImages = {
    'Food': 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&auto=format&fit=crop&q=80',
    'Clothing': 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&auto=format&fit=crop&q=80',
    'Electronics': 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80'
  };

  const newProduct = {
    id,
    name,
    category,
    price,
    stock,
    rating: 4.8,
    reviewsCount: 12,
    description: description || 'High quality addition to the ShopEase catalog.',
    highlights: ['Premium Craftsmanship', 'Verified Quality', 'Universal Standard'],
    image: categoryImages[category] || categoryImages['Electronics']
  };

  const products = Storage.getProducts();
  products.push(newProduct);
  Storage.saveProducts(products);

  showToast(`Product "${name}" added to store!`, 'success');
  window.adminCloseModals();
  refreshAllData();
};

window.adminUpdateOrderStatus = (orderId, newStatus) => {
  Storage.updateOrderStatus(orderId, newStatus);
  showToast(`Order #${orderId} marked as "${newStatus}"`, 'success');
  refreshAllData();
};

window.adminDeleteOrder = (orderId) => {
  if (confirm(`Are you sure you want to delete order record #${orderId}?`)) {
    Storage.deleteOrder(orderId);
    showToast(`Order #${orderId} removed`, 'info');
    refreshAllData();
  }
};

window.adminViewInvoice = (orderId) => {
  const orders = Storage.getOrders();
  const order = orders.find(o => o.orderId === orderId);
  if (!order) return;

  const content = document.getElementById('invoice-modal-content');
  content.innerHTML = `
    <div style="border-bottom: 2px solid var(--color-brand-primary); padding-bottom: 1rem; margin-bottom: 1.25rem; display:flex; justify-content:space-between; align-items:flex-start;">
      <div>
        <div style="font-size:1.4rem; font-weight:800; color:var(--color-brand-primary);">ShopEase Invoice</div>
        <div style="font-family:var(--font-mono); font-size:0.9rem; color:var(--color-text-secondary);">${order.orderId}</div>
      </div>
      <div style="text-align:right;">
        <span class="admin-status-badge ${getStatusBadgeClass(order.status)}">${escapeHtml(order.status)}</span>
        <div style="font-size:0.8rem; color:var(--color-text-muted); margin-top:0.25rem;">${order.formattedDate}</div>
      </div>
    </div>

    <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem; margin-bottom:1.5rem; font-size:0.85rem;">
      <div style="background:var(--color-surface-subtle); padding:0.75rem; border-radius:var(--radius-sm); border:1px solid var(--color-border);">
        <strong style="color:var(--color-text-primary);">Billed & Delivered To:</strong>
        <div style="font-weight:600; margin-top:0.25rem;">${escapeHtml(order.customer.fullName)}</div>
        <div>${escapeHtml(order.customer.email)}</div>
        <div>${escapeHtml(order.customer.phone)}</div>
        <div>${escapeHtml(order.customer.address)}</div>
      </div>
      <div style="background:var(--color-surface-subtle); padding:0.75rem; border-radius:var(--radius-sm); border:1px solid var(--color-border);">
        <strong style="color:var(--color-text-primary);">Payment Summary:</strong>
        <div style="margin-top:0.25rem;">Method: ${escapeHtml(order.payment.method)}</div>
        <div>Card: •••• ${order.payment.last4 || '8892'}</div>
        <div>Cardholder: ${escapeHtml(order.payment.cardHolder || order.customer.fullName)}</div>
      </div>
    </div>

    <table style="width:100%; border-collapse:collapse; font-size:0.85rem; margin-bottom:1.25rem;">
      <thead>
        <tr style="border-bottom:1px solid var(--color-border); text-align:left; color:var(--color-text-muted);">
          <th style="padding:0.5rem 0;">Item</th>
          <th style="padding:0.5rem; text-align:center;">Qty</th>
          <th style="padding:0.5rem; text-align:right;">Unit Price</th>
          <th style="padding:0.5rem 0; text-align:right;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${order.items.map(item => `
          <tr style="border-bottom:1px dashed var(--color-border);">
            <td style="padding:0.6rem 0; font-weight:600;">${escapeHtml(item.name)}</td>
            <td style="padding:0.6rem; text-align:center;">${item.quantity}</td>
            <td style="padding:0.6rem; text-align:right;">${CURRENCY.format(item.price)}</td>
            <td style="padding:0.6rem 0; text-align:right; font-weight:700;">${CURRENCY.format(item.totalPrice)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <div style="display:flex; flex-direction:column; gap:0.35rem; align-items:flex-end; font-size:0.85rem;">
      <div>Subtotal: <strong>${CURRENCY.format(order.financials.subtotal)}</strong></div>
      <div>Delivery: <strong>${order.financials.deliveryFee === 0 ? 'FREE' : CURRENCY.format(order.financials.deliveryFee)}</strong></div>
      ${order.financials.discount > 0 ? `<div style="color:var(--color-success);">Promo Discount (${order.financials.promoCode || 'PROMO'}): <strong>-${CURRENCY.format(order.financials.discount)}</strong></div>` : ''}
      <div>Estimated VAT (20%): <strong>${CURRENCY.format(order.financials.tax || 0)}</strong></div>
      <div style="font-size:1.15rem; font-weight:800; color:var(--color-text-primary); border-top:1px solid var(--color-border); padding-top:0.4rem; margin-top:0.25rem;">
        Grand Total: ${CURRENCY.format(order.financials.grandTotal)}
      </div>
    </div>
  `;

  document.getElementById('modal-order-invoice').style.display = 'flex';
};

window.adminSimulateOrder = () => {
  const products = Storage.getProducts();
  if (products.length === 0) return;

  const randomProd1 = products[Math.floor(Math.random() * products.length)];
  const randomProd2 = products[Math.floor(Math.random() * products.length)];

  const sampleCustomers = [
    { name: 'David Beckham', email: 'david@example.co.uk', address: '7 Regent St, London, W1B 4DA' },
    { name: 'Emma Watson', email: 'emma@example.org', address: '12 Castle Way, Oxford, OX1 2JD' },
    { name: 'Marcus Rashford', email: 'marcus@example.com', address: '22 Trafford Blvd, Manchester, M16 0RA' }
  ];
  const cust = sampleCustomers[Math.floor(Math.random() * sampleCustomers.length)];

  const orderId = 'SE-' + Math.floor(100000 + Math.random() * 900000);
  const subtotal = randomProd1.price * 2 + (randomProd1.id !== randomProd2.id ? randomProd2.price : 0);
  const delivery = subtotal > 50 ? 0 : 3.99;
  const grandTotal = subtotal + delivery;

  const mockOrder = {
    orderId,
    createdAt: new Date().toISOString(),
    formattedDate: new Intl.DateTimeFormat('en-GB', { dateStyle: 'full', timeStyle: 'short' }).format(new Date()),
    customer: {
      fullName: cust.name,
      email: cust.email,
      phone: '07700 900888',
      address: cust.address
    },
    payment: {
      method: 'Credit Card (Mock)',
      last4: '4192',
      cardHolder: cust.name
    },
    items: [
      {
        productId: randomProd1.id,
        name: randomProd1.name,
        category: randomProd1.category,
        price: randomProd1.price,
        quantity: 2,
        totalPrice: randomProd1.price * 2,
        image: randomProd1.image
      }
    ],
    financials: {
      subtotal,
      deliveryFee: delivery,
      discount: 0,
      promoCode: null,
      tax: subtotal * 0.20,
      grandTotal
    },
    status: 'Processing'
  };

  Storage.saveOrder(mockOrder);
  showToast(`Generated test order #${orderId} (${CURRENCY.format(grandTotal)})!`, 'success');
  refreshAllData();
};

window.adminSeedSampleOrders = () => {
  const products = Storage.getProducts();
  const sampleBatches = [
    {
      cust: { name: 'Oliver Twist', email: 'oliver@demo.co.uk', address: '48 Baker St, London, NW1 6XE' },
      items: [products[0], products[1]],
      status: 'Delivered'
    },
    {
      cust: { name: 'Sophia Loren', email: 'sophia@demo.com', address: '85 Promenade, Brighton, BN1 2EN' },
      items: [products[6], products[7]],
      status: 'Dispatched / Shipped'
    },
    {
      cust: { name: 'Liam Gallagher', email: 'liam@demo.org', address: '19 Park Lane, Manchester, M2 4WQ' },
      items: [products[2]],
      status: 'Confirmed'
    }
  ];

  sampleBatches.forEach(b => {
    const orderId = 'SE-' + Math.floor(100000 + Math.random() * 900000);
    const subtotal = b.items.reduce((acc, it) => acc + (it ? it.price : 20), 0);
    const grandTotal = subtotal + (subtotal > 50 ? 0 : 3.99);

    Storage.saveOrder({
      orderId,
      createdAt: new Date().toISOString(),
      formattedDate: new Intl.DateTimeFormat('en-GB', { dateStyle: 'full', timeStyle: 'short' }).format(new Date()),
      customer: {
        fullName: b.cust.name,
        email: b.cust.email,
        phone: '07123 999111',
        address: b.cust.address
      },
      payment: {
        method: 'Mock Card',
        last4: '9921',
        cardHolder: b.cust.name
      },
      items: b.items.filter(Boolean).map(it => ({
        productId: it.id,
        name: it.name,
        category: it.category,
        price: it.price,
        quantity: 1,
        totalPrice: it.price,
        image: it.image
      })),
      financials: {
        subtotal,
        deliveryFee: subtotal > 50 ? 0 : 3.99,
        discount: 0,
        promoCode: null,
        tax: subtotal * 0.2,
        grandTotal
      },
      status: b.status
    });
  });

  showToast('Seeded 3 realistic sample orders!', 'success');
  refreshAllData();
};

window.adminRestockAll = () => {
  const initialMap = {};
  INITIAL_PRODUCTS.forEach(p => { initialMap[p.id] = p.stock; });

  const products = Storage.getProducts();
  products.forEach(p => {
    p.stock = initialMap[p.id] !== undefined ? initialMap[p.id] : 20;
  });
  Storage.saveProducts(products);

  showToast('All products restocked to factory defaults!', 'success');
  refreshAllData();
};

window.adminUpdateUserRole = (userId, newRole) => {
  Storage.updateUserRole(userId, newRole);
  showToast(`Updated user role to "${newRole}"`, 'success');
  refreshAllData();
};

window.adminOpenAddUserModal = () => {
  document.getElementById('modal-add-user').style.display = 'flex';
};

window.adminSaveNewUser = (e) => {
  e.preventDefault();
  const fullName = document.getElementById('new-user-name').value.trim();
  const email = document.getElementById('new-user-email').value.trim();
  const role = document.getElementById('new-user-role').value;
  const city = document.getElementById('new-user-city').value.trim() || 'London';

  Storage.addUser({
    fullName,
    email,
    role,
    city,
    address: '10 High Street',
    phone: '07700 900555',
    password: 'password123'
  });

  showToast(`User account created for ${fullName}!`, 'success');
  window.adminCloseModals();
  refreshAllData();
};

window.adminSwitchUser = (email) => {
  const users = Storage.getUsers();
  const u = users.find(x => x.email.toLowerCase() === email.toLowerCase());
  if (u) {
    Auth.login(u.email, u.password || 'password123');
    showToast(`Switched active profile to ${u.fullName} (${u.role})`, 'success');
    setTimeout(() => {
      if (u.role === 'Admin') {
        window.location.reload();
      } else {
        window.location.href = 'dashboard.html';
      }
    }, 250);
  }
};

window.adminExportJSON = () => {
  const data = {
    products: Storage.getProducts(),
    orders: Storage.getOrders(),
    users: Storage.getUsers(),
    settings: Storage.getSettings(),
    exportedAt: new Date().toISOString()
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `shopease-store-backup-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Store JSON snapshot downloaded!', 'success');
};

window.adminFactoryReset = () => {
  if (confirm('WARNING: This will wipe all test orders and reset the store to factory defaults. Proceed?')) {
    Storage.resetStore(false);
    showToast('Store data reset to initial state.', 'warning');
    setTimeout(() => window.location.reload(), 400);
  }
};

window.adminCloseModals = () => {
  document.querySelectorAll('.modal-overlay').forEach(m => { m.style.display = 'none'; });
};

// Utilities
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

window.showToast = showToast;

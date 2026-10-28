import { Storage } from './storage.js';
import { Auth } from './auth.js';
import { CURRENCY, INITIAL_PRODUCTS } from './products.js';

// Application State
const state = {
  currentUser: null,
  activeTab: 'dashboard',
  productFilter: {
    search: '',
    category: 'ALL',
    stock: 'ALL'
  },
  orderFilter: {
    search: '',
    status: 'ALL'
  },
  inventoryFilter: {
    search: '',
    stock: 'ALL'
  },
  categoryTableFilter: 'ALL',
  userFilter: {
    search: '',
    role: 'ALL'
  },
  categoryNames: {
    'Food': 'Food & Gourmet',
    'Clothing': 'Clothing & Apparel',
    'Electronics': 'Electronics & Tech'
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
  // 1. Session Verification: Must be authenticated as Admin
  const user = Auth.getCurrentUser();
  const emailLower = (user?.email || '').toLowerCase();
  const isAdmin = user && (user.role === 'Admin' || emailLower === 'admin@gmail.com' || emailLower === 'admin@shopease.com' || emailLower.includes('admin'));

  if (!user) {
    window.location.href = 'login.html';
    return;
  } else if (!isAdmin) {
    alert('Access Restricted: The Admin Console is only accessible to Administrator accounts. Redirecting to Customer Dashboard...');
    window.location.href = 'customer-dashboard.html';
    return;
  } else {
    state.currentUser = user;
    if (state.currentUser.role !== 'Admin') {
      state.currentUser.role = 'Admin';
      Storage.setCurrentUser(state.currentUser);
    }
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
  window.addEventListener('storage', (e) => {
    if (e.key && e.key.startsWith('shopease_')) {
      refreshAllData();
    }
  });

  // 6. Setup Modal Backdrop & Escape Dismiss
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        window.adminCloseModals();
      }
    });
  });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      window.adminCloseModals();
    }
  });
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
  const navButtons = document.querySelectorAll('.admin-nav-btn[data-tab]');
  navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.getAttribute('data-tab');
      switchTab(tabId);
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
  const logoutAction = () => {
    Auth.logout();
    window.location.href = 'login.html';
  };
  document.getElementById('admin-logout-btn')?.addEventListener('click', logoutAction);
  document.getElementById('sidebar-logout-btn')?.addEventListener('click', logoutAction);
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

  // Inventory Filters
  document.getElementById('filter-inventory-search')?.addEventListener('input', (e) => {
    state.inventoryFilter.search = e.target.value.toLowerCase().trim();
    renderInventoryTable();
  });
  document.getElementById('filter-inventory-stock')?.addEventListener('change', (e) => {
    state.inventoryFilter.stock = e.target.value;
    renderInventoryTable();
  });

  // User Filters
  document.getElementById('filter-users-search')?.addEventListener('input', (e) => {
    state.userFilter.search = e.target.value.toLowerCase().trim();
    renderUsersTable();
  });
  document.getElementById('filter-users-role')?.addEventListener('change', (e) => {
    state.userFilter.role = e.target.value;
    renderUsersTable();
  });
}

function refreshAllData() {
  renderOverviewKPIs();
  renderOverviewRecentOrders();
  renderOverviewStockHealth();
  renderProductsTable();
  renderCategoriesSection();
  renderOrdersTable();
  renderInventoryTable();
  renderReportsSection();
  renderUsersKPIs();
  renderUsersTable();
  updateBadges();
}

function updateBadges() {
  const products = Storage.getProducts();
  const orders = Storage.getOrders();
  const users = Storage.getUsers();

  const prodBadge = document.getElementById('badge-products-count');
  const catBadge = document.getElementById('badge-categories-count');
  const orderBadge = document.getElementById('badge-orders-count');
  const invBadge = document.getElementById('badge-inventory-count');
  const userBadge = document.getElementById('badge-users-count');

  if (prodBadge) prodBadge.textContent = products.length;
  if (catBadge) catBadge.textContent = '3';
  if (orderBadge) orderBadge.textContent = orders.length;
  if (invBadge) invBadge.textContent = products.length;
  if (userBadge) userBadge.textContent = users.length;
}

/**
 * =========================================================================
 * 1. DASHBOARD OVERVIEW (6 KPIS, RECENT ORDERS, LOW STOCK SUMMARY)
 * =========================================================================
 */
function renderOverviewKPIs() {
  const orders = Storage.getOrders();
  const products = Storage.getProducts();

  const totalSales = orders.reduce((sum, o) => sum + (o.financials?.grandTotal || 0), 0);
  const confirmedOrders = orders.filter(o => !((o.status || '').toLowerCase().includes('complete') || (o.status || '').toLowerCase().includes('deliver'))).length;
  const completedOrders = orders.filter(o => {
    const s = (o.status || '').toLowerCase();
    return s.includes('complete') || s.includes('delivered') || s.includes('confirmed');
  }).length;
  const lowStockCount = products.filter(p => p.stock <= 10).length;

  const prodEl = document.getElementById('kpi-total-products');
  const catEl = document.getElementById('kpi-total-categories');
  const ordEl = document.getElementById('kpi-total-orders');
  const salesEl = document.getElementById('kpi-total-sales');
  const splitEl = document.getElementById('kpi-order-status-split');
  const stockEl = document.getElementById('kpi-low-stock-count');

  if (prodEl) prodEl.textContent = `${products.length}`;
  if (catEl) catEl.textContent = '3';
  if (ordEl) ordEl.textContent = `${orders.length}`;
  if (salesEl) salesEl.textContent = CURRENCY.format(totalSales);
  if (splitEl) splitEl.textContent = `${confirmedOrders} Confirmed / ${completedOrders} Done`;
  if (stockEl) stockEl.textContent = `${lowStockCount}`;
}

function renderOverviewRecentOrders() {
  const tbody = document.getElementById('overview-orders-tbody');
  if (!tbody) return;

  const orders = Storage.getOrders().slice(0, 5);
  if (orders.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align:center; padding: 2rem; color: var(--color-text-muted);">
          No customer orders recorded yet.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = orders.map(order => {
    const activeStatus = resolveOrderStatus(order.status);
    const selectClass = getStatusSelectClass(activeStatus);

    return `
    <tr>
      <td>
        <strong style="color:var(--color-brand-primary); font-family:var(--font-mono); font-size:0.9rem;">${order.orderId}</strong>
      </td>
      <td>
        <div style="font-weight:700; color:var(--color-text-primary); font-size:0.875rem;">${escapeHtml(order.customer?.fullName || 'Customer')}</div>
        <div style="font-size:0.75rem; color:var(--color-text-muted);">${escapeHtml(order.customer?.email || '')}</div>
      </td>
      <td>
        <strong style="color:var(--color-text-primary); font-size:0.95rem;">${CURRENCY.format(order.financials?.grandTotal || 0)}</strong>
      </td>
      <td>
        <select 
          class="admin-status-select ${selectClass}" 
          aria-label="Order ${order.orderId} status"
          title="Click to change order status"
          onchange="window.adminUpdateOrderStatus('${order.orderId}', this.value)"
        >
          <option value="Confirmed" ${activeStatus === 'Confirmed' ? 'selected' : ''}>● Confirmed</option>
          <option value="Completed" ${activeStatus === 'Completed' ? 'selected' : ''}>✅ Completed</option>
        </select>
      </td>
      <td style="text-align:right;">
        <button type="button" class="btn btn-secondary" style="font-size:0.75rem; padding:0.25rem 0.6rem;" onclick="window.adminViewInvoice('${order.orderId}')">
          📄 View
        </button>
      </td>
    </tr>
  `;
  }).join('');
}

function renderOverviewStockHealth() {
  const tbody = document.getElementById('overview-stock-tbody');
  if (!tbody) return;

  const products = Storage.getProducts();
  const sorted = [...products].sort((a, b) => a.stock - b.stock).slice(0, 5);

  tbody.innerHTML = sorted.map(p => {
    const isOut = p.stock === 0;
    const isLow = p.stock > 0 && p.stock <= 10;
    const badge = isOut
      ? '<span class="admin-status-badge status-badge-danger">Out of Stock</span>'
      : isLow
        ? '<span class="admin-status-badge status-badge-warning">Low Stock</span>'
        : '<span class="admin-status-badge status-badge-success">In Stock</span>';

    return `
      <tr>
        <td>
          <div style="display:flex; align-items:center; gap:0.6rem;">
            <img src="${p.image}" alt="" style="width:34px; height:34px; object-fit:cover; border-radius:var(--radius-xs); border:1px solid var(--color-border);" onerror="this.src='https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=800&q=80'" />
            <div>
              <div style="font-weight:700; color:var(--color-text-primary); font-size:0.875rem;">${escapeHtml(p.name)}</div>
              <div style="font-size:0.72rem; color:var(--color-text-muted); font-family:var(--font-mono);">${p.id}</div>
            </div>
          </div>
        </td>
        <td>
          <span style="font-size:0.75rem; font-weight:700; color:var(--color-brand-primary); background:var(--color-surface-subtle); padding:0.2rem 0.5rem; border-radius:var(--radius-sm); border:1px solid var(--color-border);">
            ${p.category}
          </span>
        </td>
        <td>
          <strong style="font-size:0.95rem; ${isOut ? 'color:var(--color-danger);' : isLow ? 'color:var(--color-warning);' : 'color:var(--color-text-primary);'}">
            ${p.stock} units
          </strong>
        </td>
        <td>
          ${badge}
        </td>
        <td style="text-align:right;">
          <button type="button" class="btn btn-secondary" style="font-size:0.75rem; padding:0.25rem 0.6rem;" onclick="window.adminAdjustStock('${p.id}', 5)" title="Add +5 units to stock">
            +5 Restock
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

/**
 * =========================================================================
 * 2. PRODUCT MANAGEMENT (CLEAN, SIMPLE, SPACIOUS TABLE)
 * =========================================================================
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

  if (countEl) countEl.textContent = `${products.length} Products Found`;

  if (products.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align:center; padding: 2.5rem; color: var(--color-text-muted);">
          No products matched your search.
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
        ? '<span class="admin-status-badge status-badge-warning">Low Stock (≤10)</span>'
        : '<span class="admin-status-badge status-badge-success">In Stock</span>';

    return `
      <tr>
        <td>
          <div style="display:flex; align-items:center; gap:0.75rem;">
            <img src="${p.image}" alt="${escapeHtml(p.name)}" style="width:44px; height:44px; object-fit:cover; border-radius:var(--radius-sm); border:1px solid var(--color-border);" onerror="this.src='https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=800&q=80'" />
            <div>
              <div style="font-weight:700; color:var(--color-text-primary);">${escapeHtml(p.name)}</div>
              <div style="font-size:0.75rem; color:var(--color-text-muted); font-family:var(--font-mono);">${p.id}</div>
            </div>
          </div>
        </td>
        <td>
          <span style="font-size:0.75rem; font-weight:700; color:var(--color-brand-primary); background:var(--color-surface-subtle); padding:0.25rem 0.6rem; border-radius:var(--radius-sm); border:1px solid var(--color-border);">
            ${p.category}
          </span>
        </td>
        <td>
          <strong style="font-size:0.95rem; color:var(--color-text-primary);">${CURRENCY.format(p.price)}</strong>
        </td>
        <td>
          <strong style="font-size:1rem; ${isOut ? 'color:var(--color-danger);' : isLow ? 'color:var(--color-warning);' : 'color:var(--color-text-primary);'}">
            ${p.stock} units
          </strong>
        </td>
        <td>
          ${stockBadge}
        </td>
        <td style="text-align:right;">
          <div style="display:inline-flex; align-items:center; gap:0.4rem;">
            <button type="button" class="btn btn-secondary" style="font-size:0.75rem; padding:0.35rem 0.75rem;" onclick="window.adminOpenEditProduct('${p.id}')">
              ✏️ Edit
            </button>
            <button type="button" class="btn btn-secondary" style="font-size:0.75rem; padding:0.35rem 0.6rem; color:var(--color-danger);" onclick="window.adminDeleteProduct('${p.id}')" title="Delete product">
              🗑️
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

/**
 * =========================================================================
 * 3. CATEGORY MANAGEMENT (3 CATEGORIES & SIMPLE PRODUCTS LIST)
 * =========================================================================
 */
function renderCategoriesSection() {
  const cardsContainer = document.getElementById('categories-cards-grid');
  const tbody = document.getElementById('category-products-tbody');
  if (!cardsContainer) return;

  const products = Storage.getProducts();
  const categories = ['Food', 'Clothing', 'Electronics'];

  // 1. Render 3 Category Summary Cards
  cardsContainer.innerHTML = categories.map(cat => {
    const catProducts = products.filter(p => p.category === cat);
    const totalStock = catProducts.reduce((sum, p) => sum + p.stock, 0);
    const title = state.categoryNames[cat] || cat;

    const icons = {
      'Food': '🥖',
      'Clothing': '👔',
      'Electronics': '🎧'
    };

    return `
      <div class="admin-table-card" style="padding:1.25rem; margin-bottom:0;">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:0.75rem;">
          <div style="display:flex; align-items:center; gap:0.6rem;">
            <span style="font-size:1.8rem;" aria-hidden="true">${icons[cat] || '📦'}</span>
            <div>
              <h3 style="font-size:1.1rem; font-weight:700; color:var(--color-text-primary); margin:0;">${escapeHtml(title)}</h3>
              <div style="font-size:0.75rem; color:var(--color-text-muted); font-family:var(--font-mono);">Key: ${cat}</div>
            </div>
          </div>
          <button type="button" class="btn btn-secondary" style="font-size:0.75rem; padding:0.25rem 0.5rem;" onclick="window.adminOpenEditCategory('${cat}')">
            ✏️ Rename
          </button>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.5rem; background:var(--color-surface-subtle); padding:0.6rem 0.85rem; border-radius:var(--radius-sm); margin-bottom:0.75rem; font-size:0.85rem;">
          <div>
            <div style="color:var(--color-text-muted); font-size:0.75rem;">Products</div>
            <strong style="font-size:1.05rem; color:var(--color-brand-primary);">${catProducts.length} Items</strong>
          </div>
          <div>
            <div style="color:var(--color-text-muted); font-size:0.75rem;">Total Stock Units</div>
            <strong style="font-size:1.05rem; color:var(--color-text-primary);">${totalStock} units</strong>
          </div>
        </div>

        <div style="font-size:0.8rem; color:var(--color-text-secondary); line-height:1.4;">
          <strong>Products: </strong> ${catProducts.map(p => escapeHtml(p.name)).join(', ')}
        </div>
      </div>
    `;
  }).join('');

  // 2. Render Unified Category Products Table
  if (tbody) {
    let filteredProducts = products;
    if (state.categoryTableFilter !== 'ALL') {
      filteredProducts = products.filter(p => p.category === state.categoryTableFilter);
    }

    tbody.innerHTML = filteredProducts.map(p => {
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
            <div style="display:flex; align-items:center; gap:0.6rem;">
              <img src="${p.image}" alt="" style="width:36px; height:36px; object-fit:cover; border-radius:var(--radius-sm); border:1px solid var(--color-border);" />
              <div>
                <strong style="color:var(--color-text-primary); font-size:0.875rem;">${escapeHtml(p.name)}</strong>
                <div style="font-size:0.75rem; color:var(--color-text-muted); font-family:var(--font-mono);">${p.id}</div>
              </div>
            </div>
          </td>
          <td>
            <span style="font-size:0.75rem; font-weight:700; color:var(--color-brand-primary); background:var(--color-surface-subtle); padding:0.2rem 0.5rem; border-radius:var(--radius-sm); border:1px solid var(--color-border);">
              ${state.categoryNames[p.category] || p.category}
            </span>
          </td>
          <td><strong>${CURRENCY.format(p.price)}</strong></td>
          <td>${p.stock} units</td>
          <td>${stockBadge}</td>
          <td style="text-align:right;">
            <button type="button" class="btn btn-secondary" style="font-size:0.75rem; padding:0.25rem 0.6rem;" onclick="window.adminOpenEditProduct('${p.id}')">
              ✏️ Edit Product
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }
}

window.adminFilterCategoryTable = function (cat) {
  state.categoryTableFilter = cat;
  renderCategoriesSection();
};

/**
 * =========================================================================
 * 4. ORDER MANAGEMENT (SIMPLE, CLEAR ORDERS TABLE)
 * =========================================================================
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
      (o.customer?.fullName || '').toLowerCase().includes(search) ||
      (o.customer?.email || '').toLowerCase().includes(search) ||
      (o.customer?.phone || '').toLowerCase().includes(search)
    );
  }
  if (status !== 'ALL') {
    orders = orders.filter(o => resolveOrderStatus(o.status) === status);
  }

  if (countEl) countEl.textContent = `${orders.length} Order${orders.length === 1 ? '' : 's'}`;

  if (orders.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align:center; padding: 2.5rem; color: var(--color-text-muted);">
          No orders found. Click <strong>⚡ Add Sample Orders</strong> above to test.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = orders.map(order => {
    const currentStatus = order.status || 'Confirmed';
    const itemsList = (order.items || []).map(i => `${i.quantity}x ${escapeHtml(i.name)}`).join(', ');

    return `
      <tr>
        <td>
          <strong style="color:var(--color-brand-primary); font-family:var(--font-mono); font-size:0.95rem;">${order.orderId}</strong>
        </td>
        <td>
          <div style="font-size:0.8rem; color:var(--color-text-primary); font-weight:600;">
            ${order.formattedDate || new Date(order.createdAt).toLocaleDateString()}
          </div>
        </td>
        <td>
          <div style="font-weight:700; color:var(--color-text-primary);">${escapeHtml(order.customer?.fullName || 'Customer')}</div>
          <div style="font-size:0.75rem; color:var(--color-text-muted);">${escapeHtml(order.customer?.phone || order.customer?.email || '')}</div>
        </td>
        <td>
          <div style="font-size:0.8rem; max-width:240px; color:var(--color-text-secondary); line-height:1.4;">
            ${itemsList || '1x Handcrafted Item'}
          </div>
        </td>
        <td>
          <strong style="font-size:1rem; color:var(--color-text-primary);">${CURRENCY.format(order.financials?.grandTotal || 0)}</strong>
        </td>
        <td>
          <span style="font-size:0.75rem; font-weight:700; color:var(--color-success); background:rgba(16,185,129,0.1); padding:0.2rem 0.5rem; border-radius:var(--radius-sm); border:1px solid rgba(16,185,129,0.3);">
            ● Paid (Demo)
          </span>
        </td>
        <td>
          <!-- Live Status Dropdown with 2 options: Confirmed, Completed -->
          <select 
            class="admin-status-select ${getStatusSelectClass(order.status)}" 
            aria-label="Order ${order.orderId} status"
            title="Click to change order status"
            onchange="window.adminUpdateOrderStatus('${order.orderId}', this.value)"
          >
            <option value="Confirmed" ${resolveOrderStatus(order.status) === 'Confirmed' ? 'selected' : ''}>● Confirmed</option>
            <option value="Completed" ${resolveOrderStatus(order.status) === 'Completed' ? 'selected' : ''}>✅ Completed</option>
          </select>
        </td>
        <td style="text-align:right;">
          <div style="display:inline-flex; align-items:center; gap:0.4rem;">
            <button type="button" class="btn btn-secondary" style="font-size:0.75rem; padding:0.3rem 0.6rem;" onclick="window.adminViewInvoice('${order.orderId}')">
              📄 Invoice
            </button>
            <button type="button" class="btn btn-secondary" style="font-size:0.75rem; padding:0.3rem 0.5rem; color:var(--color-danger);" onclick="window.adminDeleteOrder('${order.orderId}')" title="Delete Order">
              🗑️
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

/**
 * =========================================================================
 * 5. INVENTORY & STOCK MANAGEMENT (SIMPLE INVENTORY TABLE & STEPPERS)
 * =========================================================================
 */
function renderInventoryTable() {
  const tbody = document.getElementById('inventory-tbody');
  const countEl = document.getElementById('inventory-table-count');
  if (!tbody) return;

  let products = Storage.getProducts();
  const { search, stock } = state.inventoryFilter;

  if (search) {
    products = products.filter(p => p.name.toLowerCase().includes(search) || p.id.toLowerCase().includes(search));
  }
  if (stock === 'LOW') {
    products = products.filter(p => p.stock > 0 && p.stock <= 10);
  } else if (stock === 'OUT') {
    products = products.filter(p => p.stock === 0);
  } else if (stock === 'IN') {
    products = products.filter(p => p.stock > 10);
  }

  if (countEl) countEl.textContent = `${products.length} Products Tracked`;

  if (products.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align:center; padding: 2.5rem; color: var(--color-text-muted);">
          No products matched your search.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = products.map(p => {
    const isOut = p.stock === 0;
    const isLow = p.stock > 0 && p.stock <= 10;
    const badge = isOut
      ? '<span class="admin-status-badge status-badge-danger">Out of Stock (0)</span>'
      : isLow
        ? '<span class="admin-status-badge status-badge-warning">Low Stock (≤10)</span>'
        : '<span class="admin-status-badge status-badge-success">In Stock (>10)</span>';

    return `
      <tr>
        <td>
          <div style="display:flex; align-items:center; gap:0.75rem;">
            <img src="${p.image}" alt="${escapeHtml(p.name)}" style="width:40px; height:40px; object-fit:cover; border-radius:var(--radius-sm); border:1px solid var(--color-border);" />
            <div>
              <strong style="color:var(--color-text-primary); font-size:0.9rem;">${escapeHtml(p.name)}</strong>
              <div style="font-size:0.75rem; color:var(--color-text-muted); font-family:var(--font-mono);">${p.id}</div>
            </div>
          </div>
        </td>
        <td>
          <span style="font-size:0.75rem; font-weight:600; padding:0.2rem 0.5rem; background:var(--color-surface-subtle); border-radius:var(--radius-sm); border:1px solid var(--color-border);">
            ${p.category}
          </span>
        </td>
        <td>
          <strong style="font-size:1.05rem; ${isOut ? 'color:var(--color-danger);' : isLow ? 'color:var(--color-warning);' : 'color:var(--color-success);'}">
            ${p.stock} units
          </strong>
        </td>
        <td>
          ${badge}
        </td>
        <td>
          <div style="display:inline-flex; align-items:center; gap:0.4rem; background:var(--color-surface-subtle); padding:0.25rem 0.5rem; border-radius:var(--radius-sm); border:1px solid var(--color-border);">
            <button type="button" class="admin-stepper-btn" onclick="window.adminAdjustStock('${p.id}', -1)" title="Decrease stock" ${p.stock <= 0 ? 'disabled' : ''}>−</button>
            <input type="number" id="inv-input-${p.id}" value="${p.stock}" min="0" style="width:52px; text-align:center; font-weight:700; border:1px solid var(--color-border); border-radius:var(--radius-sm); padding:0.2rem;" />
            <button type="button" class="admin-stepper-btn" onclick="window.adminAdjustStock('${p.id}', 1)" title="Increase stock">+</button>
            <button type="button" class="btn btn-secondary" style="font-size:0.72rem; padding:0.25rem 0.5rem;" onclick="window.adminSaveDirectStock('${p.id}')">Save</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

/**
 * =========================================================================
 * 6. SALES & REPORTS (COMPUTED ANALYTICS)
 * =========================================================================
 */
function renderReportsSection() {
  const orders = Storage.getOrders();
  const products = Storage.getProducts();

  const totalSales = orders.reduce((sum, o) => sum + (o.financials?.grandTotal || 0), 0);
  const totalOrders = orders.length;
  const avgOrder = totalOrders > 0 ? totalSales / totalOrders : 0;

  const completedCount = orders.filter(o => {
    const s = (o.status || '').toLowerCase();
    return s.includes('complete') || s.includes('delivered') || s.includes('confirmed');
  }).length;
  const confirmedCount = orders.filter(o => !((o.status || '').toLowerCase().includes('complete') || (o.status || '').toLowerCase().includes('deliver'))).length;

  // Update KPI counters
  const rSales = document.getElementById('rep-total-sales');
  const rOrders = document.getElementById('rep-total-orders');
  const rAvg = document.getElementById('rep-avg-order');
  const rPay = document.getElementById('rep-payments-status');

  if (rSales) rSales.textContent = CURRENCY.format(totalSales);
  if (rOrders) rOrders.textContent = `${totalOrders}`;
  if (rAvg) rAvg.textContent = CURRENCY.format(avgOrder);
  if (rPay) rPay.textContent = `${completedCount} Paid / ${confirmedCount} Confirmed`;

  // Compute Most Popular Products
  const productSalesMap = {};
  products.forEach(p => {
    productSalesMap[p.id] = { product: p, unitsSold: 0, revenue: 0 };
  });

  orders.forEach(order => {
    (order.items || []).forEach(it => {
      if (productSalesMap[it.productId]) {
        productSalesMap[it.productId].unitsSold += (it.quantity || 1);
        productSalesMap[it.productId].revenue += (it.totalPrice || it.price || 0);
      }
    });
  });

  const popularList = Object.values(productSalesMap).sort((a, b) => b.unitsSold - a.unitsSold);

  const popTbody = document.getElementById('rep-popular-products-tbody');
  if (popTbody) {
    if (orders.length === 0) {
      popTbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:1.5rem; color:var(--color-text-muted);">No sales recorded yet.</td></tr>`;
    } else {
      const medals = ['🥇 1st', '🥈 2nd', '🥉 3rd', '4th', '5th'];
      popTbody.innerHTML = popularList.slice(0, 5).map((item, idx) => `
        <tr>
          <td><strong>${medals[idx] || `${idx + 1}th`}</strong></td>
          <td>
            <div style="display:flex; align-items:center; gap:0.5rem;">
              <img src="${item.product.image}" alt="" style="width:28px; height:28px; object-fit:cover; border-radius:var(--radius-sm);" />
              <span>${escapeHtml(item.product.name)}</span>
            </div>
          </td>
          <td><strong>${item.unitsSold} units</strong></td>
          <td style="color:var(--color-success); font-weight:700;">${CURRENCY.format(item.revenue)}</td>
        </tr>
      `).join('');
    }
  }

  // Compute Category-wise Sales
  const categorySales = { Food: 0, Clothing: 0, Electronics: 0 };
  orders.forEach(order => {
    (order.items || []).forEach(it => {
      const cat = it.category || 'Food';
      if (categorySales[cat] !== undefined) {
        categorySales[cat] += (it.totalPrice || it.price || 0);
      }
    });
  });

  const catContainer = document.getElementById('rep-category-sales-container');
  if (catContainer) {
    const totalCatSales = categorySales.Food + categorySales.Clothing + categorySales.Electronics;
    const cats = ['Food', 'Clothing', 'Electronics'];
    const colors = { Food: '#f59e0b', Clothing: '#8b5cf6', Electronics: '#3b82f6' };

    catContainer.innerHTML = cats.map(cat => {
      const sales = categorySales[cat];
      const pct = totalCatSales > 0 ? Math.round((sales / totalCatSales) * 100) : 0;
      const color = colors[cat] || 'var(--color-brand-primary)';

      return `
        <div style="margin-bottom:1.25rem;">
          <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.85rem; margin-bottom:0.35rem;">
            <span style="font-weight:700; color:var(--color-text-primary);">${state.categoryNames[cat] || cat}</span>
            <div style="display:flex; gap:0.5rem; align-items:center;">
              <strong>${CURRENCY.format(sales)}</strong>
              <span style="font-size:0.75rem; color:var(--color-text-muted);">(${pct}%)</span>
            </div>
          </div>
          <div style="height:8px; background:var(--color-border); border-radius:var(--radius-full); overflow:hidden;">
            <div style="width:${pct}%; height:100%; background:${color}; border-radius:var(--radius-full); transition:width 300ms ease;"></div>
          </div>
        </div>
      `;
    }).join('');
  }
}

/**
 * =========================================================================
 * MODAL INTERACTIONS & CRUD ACTIONS
 * =========================================================================
 */

// Tab switch helper
window.adminSwitchTab = function (tabId) {
  switchTab(tabId);
};

// 1. Edit Product Modal
window.adminOpenEditProduct = function (productId) {
  const product = Storage.getProductById(productId);
  if (!product) return;

  document.getElementById('edit-prod-id').value = product.id;
  document.getElementById('edit-prod-name').value = product.name;
  document.getElementById('edit-prod-category').value = product.category;
  document.getElementById('edit-prod-price').value = product.price;
  document.getElementById('edit-prod-stock').value = product.stock;
  document.getElementById('edit-prod-image').value = product.image || '';
  document.getElementById('edit-prod-description').value = product.description || '';

  const modal = document.getElementById('modal-edit-product');
  modal.style.display = 'flex';
  modal.classList.add('open');
};

window.adminSaveProductEdit = function (event) {
  event.preventDefault();
  const id = document.getElementById('edit-prod-id').value;
  const name = document.getElementById('edit-prod-name').value;
  const category = document.getElementById('edit-prod-category').value;
  const price = parseFloat(document.getElementById('edit-prod-price').value);
  const stock = parseInt(document.getElementById('edit-prod-stock').value, 10);
  const image = document.getElementById('edit-prod-image').value;
  const description = document.getElementById('edit-prod-description').value;

  const products = Storage.getProducts();
  const idx = products.findIndex(p => p.id === id);
  if (idx !== -1) {
    products[idx] = {
      ...products[idx],
      name,
      category,
      price,
      stock,
      image: image || products[idx].image,
      description
    };
    Storage.saveProducts(products);
    showToast(`Product "${name}" updated successfully.`, 'success');
    window.adminCloseModals();
    refreshAllData();
  }
};

// 2. Add / Replace Product Modal (Guarded to 10 products)
window.adminOpenAddProductModal = function () {
  const products = Storage.getProducts();
  const slotSelect = document.getElementById('add-prod-slot');
  if (slotSelect) {
    slotSelect.innerHTML = products.map((p, idx) => `
      <option value="${p.id}">Slot ${idx + 1}: ${escapeHtml(p.name)} (${p.category} - ${p.id})</option>
    `).join('');
  }

  const modal = document.getElementById('modal-add-product');
  modal.style.display = 'flex';
  modal.classList.add('open');
};

window.adminSaveNewProduct = function (event) {
  event.preventDefault();
  const slotId = document.getElementById('add-prod-slot').value;
  const name = document.getElementById('add-prod-name').value;
  const category = document.getElementById('add-prod-category').value;
  const price = parseFloat(document.getElementById('add-prod-price').value);
  const stock = parseInt(document.getElementById('add-prod-stock').value, 10);
  const image = document.getElementById('add-prod-image').value || 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=800&q=80';
  const description = document.getElementById('add-prod-description').value || 'Handcrafted store essential.';

  const products = Storage.getProducts();
  const idx = products.findIndex(p => p.id === slotId);

  if (idx !== -1) {
    products[idx] = {
      id: slotId,
      name,
      category,
      price,
      stock,
      image,
      description,
      unit: 'each',
      rating: 5.0,
      reviewsCount: 1
    };
    Storage.saveProducts(products);
    showToast(`Saved product "${name}" to Slot ${idx + 1} (Catalogue remains strictly 10 products).`, 'success');
    window.adminCloseModals();
    refreshAllData();
  }
};

// 3. Delete Product (Guarded to 10 products)
window.adminDeleteProduct = function (productId) {
  const product = Storage.getProductById(productId);
  if (!product) return;

  const confirmDelete = confirm(`Are you sure you want to reset product "${product.name}"? As per assignment constraints, the store maintains exactly 10 catalogue products, so this slot will be reset to a placeholder.`);
  if (!confirmDelete) return;

  const products = Storage.getProducts();
  const idx = products.findIndex(p => p.id === productId);
  if (idx !== -1) {
    // Reset to clean placeholder in same category
    products[idx] = {
      id: productId,
      name: `Available Product Slot (${product.category})`,
      category: product.category,
      price: 1900.00,
      stock: 15,
      image: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=800&q=80',
      description: 'Slot ready for new product assignment.',
      unit: 'each',
      rating: 5.0,
      reviewsCount: 0
    };
    Storage.saveProducts(products);
    showToast(`Product slot reset. 10 products limit preserved.`, 'info');
    refreshAllData();
  }
};

// 4. Category Management: Rename category
window.adminOpenEditCategory = function (catKey) {
  document.getElementById('edit-cat-key').value = catKey;
  document.getElementById('edit-cat-name').value = state.categoryNames[catKey] || catKey;

  const modal = document.getElementById('modal-edit-category');
  modal.style.display = 'flex';
  modal.classList.add('open');
};

window.adminSaveCategoryEdit = function (event) {
  event.preventDefault();
  const key = document.getElementById('edit-cat-key').value;
  const newName = document.getElementById('edit-cat-name').value.trim();

  if (newName) {
    state.categoryNames[key] = newName;
    showToast(`Department "${key}" renamed to "${newName}".`, 'success');
    window.adminCloseModals();
    renderCategoriesSection();
    renderReportsSection();
  }
};

// 5. Order Management: Update status, View invoice, Delete order
window.adminUpdateOrderStatus = function (orderId, newStatus) {
  const orders = Storage.getOrders();
  const idx = orders.findIndex(o => o.orderId === orderId);
  if (idx !== -1) {
    orders[idx].status = newStatus;
    Storage.saveOrders(orders);
    showToast(`Order #${orderId} status updated to "${newStatus}".`, 'success');
    refreshAllData();
  }
};

window.adminViewInvoice = function (orderId) {
  let order = null;
  if (typeof Storage.getOrderById === 'function') {
    order = Storage.getOrderById(orderId);
  }
  if (!order) {
    const orders = Storage.getOrders();
    order = orders.find(o => String(o.orderId || '').trim().toLowerCase() === String(orderId || '').trim().toLowerCase());
  }

  if (!order) {
    showToast(`Order #${orderId} not found in database.`, 'warning');
    return;
  }

  const content = document.getElementById('invoice-modal-content');
  if (!content) return;

  const items = order.items && order.items.length > 0
    ? order.items
    : [{ name: 'Store Order Line Item', quantity: 1, price: order.financials?.grandTotal || 0, totalPrice: order.financials?.grandTotal || 0 }];
  const fin = order.financials || { grandTotal: 0, subtotal: 0, deliveryFee: 0 };
  const cust = order.customer || {};
  const pay = order.payment || {};

  content.innerHTML = `
    <div style="font-size:0.875rem;">
      <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:1.25rem; border-bottom:1px solid var(--color-border); padding-bottom:1rem;">
        <div>
          <div style="display:flex; align-items:center; gap:0.5rem;">
            <span class="brand-monogram" style="width:28px; height:28px; font-size:0.75rem;">SE</span>
            <strong style="font-size:1.25rem; color:var(--color-text-primary); font-family:var(--font-serif);">Shop<span>Ease</span> Store</strong>
          </div>
          <div style="font-size:0.75rem; color:var(--color-text-muted); margin-top:0.25rem;">Official Store Receipt &amp; Tax Invoice</div>
        </div>
        <div style="text-align:right;">
          <div style="font-family:var(--font-mono); font-weight:800; color:var(--color-brand-primary); font-size:1.05rem;">${escapeHtml(order.orderId)}</div>
          <div style="font-size:0.75rem; color:var(--color-text-muted); margin-top:0.2rem;">${escapeHtml(order.formattedDate || (order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'Recent'))}</div>
        </div>
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem; margin-bottom:1.25rem; background:var(--color-surface-subtle); padding:1rem; border-radius:var(--radius-md); border:1px solid var(--color-border);">
        <div>
          <strong style="display:block; margin-bottom:0.35rem; font-size:0.75rem; text-transform:uppercase; color:var(--color-text-muted); letter-spacing:0.04em;">Billed To:</strong>
          <div style="font-weight:700; color:var(--color-text-primary); font-size:0.92rem;">${escapeHtml(cust.fullName || 'Valued Customer')}</div>
          <div style="color:var(--color-text-secondary); font-size:0.82rem; margin-top:0.15rem;">${escapeHtml(cust.email || 'N/A')}</div>
          <div style="color:var(--color-text-muted); font-size:0.82rem; margin-top:0.15rem;">${escapeHtml(cust.address || 'Standard Delivery')}</div>
          ${cust.phone ? `<div style="color:var(--color-text-muted); font-size:0.82rem; margin-top:0.15rem;">${escapeHtml(cust.phone)}</div>` : ''}
        </div>
        <div>
          <strong style="display:block; margin-bottom:0.35rem; font-size:0.75rem; text-transform:uppercase; color:var(--color-text-muted); letter-spacing:0.04em;">Payment &amp; Status:</strong>
          <div style="font-size:0.85rem;"><span style="color:var(--color-text-muted);">Method:</span> <strong>${escapeHtml(pay.method || 'Card (Demo)')}</strong></div>
          <div style="margin-top:0.4rem; font-size:0.85rem;">
            <span style="color:var(--color-text-muted); display:inline-block; margin-right:0.35rem;">Status:</span>
            <span class="status-badge ${getStatusBadgeClass(order.status)}">${escapeHtml(order.status || 'Confirmed')}</span>
          </div>
        </div>
      </div>

      <table style="width:100%; border-collapse:collapse; margin-bottom:1.25rem; font-size:0.85rem;">
        <thead>
          <tr style="border-bottom:1.5px solid var(--color-border); color:var(--color-text-muted); font-size:0.75rem; text-transform:uppercase;">
            <th style="padding:0.5rem 0; text-align:left;">Item Description</th>
            <th style="padding:0.5rem 0; text-align:center;">Qty</th>
            <th style="padding:0.5rem 0; text-align:right;">Unit Price</th>
            <th style="padding:0.5rem 0; text-align:right;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${items.map(it => `
            <tr style="border-bottom:1px dashed var(--color-border);">
              <td style="padding:0.6rem 0; color:var(--color-text-primary); font-weight:600;">
                ${escapeHtml(it.name || 'Store Item')}
              </td>
              <td style="padding:0.6rem 0; text-align:center; font-family:var(--font-mono);">${it.quantity || 1}</td>
              <td style="padding:0.6rem 0; text-align:right; font-family:var(--font-mono);">${CURRENCY.format(it.price || 0)}</td>
              <td style="padding:0.6rem 0; text-align:right; font-weight:700; font-family:var(--font-mono); color:var(--color-text-primary);">${CURRENCY.format(it.totalPrice || (it.price || 0) * (it.quantity || 1))}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div style="display:flex; flex-direction:column; gap:0.4rem; font-size:0.85rem; border-top:1px solid var(--color-border); padding-top:0.75rem;">
        <div style="display:flex; justify-content:space-between;">
          <span style="color:var(--color-text-muted);">Subtotal:</span>
          <strong style="font-family:var(--font-mono);">${CURRENCY.format(fin.subtotal !== undefined ? fin.subtotal : (fin.grandTotal || 0))}</strong>
        </div>
        ${fin.discount ? `
          <div style="display:flex; justify-content:space-between; color:var(--color-success);">
            <span>Promotional Discount:</span>
            <span style="font-family:var(--font-mono); font-weight:700;">-${CURRENCY.format(fin.discount)}</span>
          </div>
        ` : ''}
        <div style="display:flex; justify-content:space-between;">
          <span style="color:var(--color-text-muted);">Standard Delivery:</span>
          <span style="font-family:var(--font-mono);">${!fin.deliveryFee ? 'FREE' : CURRENCY.format(fin.deliveryFee)}</span>
        </div>
        <div style="display:flex; justify-content:space-between; font-size:1.15rem; font-weight:800; border-top:2px solid var(--color-border); padding-top:0.6rem; color:var(--color-brand-primary); margin-top:0.25rem;">
          <span>Grand Total:</span>
          <span style="font-family:var(--font-mono);">${CURRENCY.format(fin.grandTotal || 0)}</span>
        </div>
      </div>
    </div>
  `;

  const modal = document.getElementById('modal-order-invoice');
  if (modal) {
    modal.style.display = 'flex';
    modal.classList.add('open');
  }
};

window.adminDeleteOrder = function (orderId) {
  const confirmDelete = confirm(`Are you sure you want to delete order #${orderId}?`);
  if (!confirmDelete) return;

  const orders = Storage.getOrders().filter(o => o.orderId !== orderId);
  Storage.saveOrders(orders);
  showToast(`Order #${orderId} deleted.`, 'info');
  refreshAllData();
};

// 6. Inventory Adjustments
window.adminAdjustStock = function (productId, delta) {
  const product = Storage.getProductById(productId);
  if (!product) return;

  const newStock = Math.max(0, product.stock + delta);
  Storage.updateStock(productId, newStock);
  showToast(`Stock for "${product.name}" updated to ${newStock}.`, 'info');
  refreshAllData();
};

window.adminSaveDirectStock = function (productId) {
  const input = document.getElementById(`inv-input-${productId}`);
  if (!input) return;

  const val = parseInt(input.value, 10);
  if (isNaN(val) || val < 0) {
    alert('Please enter a valid non-negative number for stock.');
    return;
  }

  Storage.updateStock(productId, val);
  showToast(`Stock updated to ${val} units.`, 'success');
  refreshAllData();
};

window.adminRestockAll = function () {
  const confirmReset = confirm('Restock all 10 products to factory defaults (Food: 12-24, Clothes: 6-18, Tech: 8-15)?');
  if (!confirmReset) return;

  const products = Storage.getProducts().map(p => {
    const defaultItem = INITIAL_PRODUCTS.find(i => i.id === p.id);
    return {
      ...p,
      stock: defaultItem ? defaultItem.stock : 20
    };
  });
  Storage.saveProducts(products);
  showToast('All 10 products restocked to factory defaults.', 'success');
  refreshAllData();
};

// 7. Seed Sample Orders
window.adminSeedSampleOrders = function () {
  const products = Storage.getProducts();
  const sampleOrders = [
    {
      orderId: 'SE-' + Math.floor(100000 + Math.random() * 900000),
      createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      formattedDate: new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(Date.now() - 3600000 * 2)),
      customer: {
        fullName: 'Sarah Jenkins',
        email: 'sarah@example.com',
        phone: '+94 77 123 4567',
        address: '42 Highfield Terrace, Colombo 03'
      },
      payment: { method: 'Demo Card (Instant Verified)' },
      items: [
        { productId: products[0].id, name: products[0].name, category: products[0].category, price: products[0].price, quantity: 2, totalPrice: products[0].price * 2, image: products[0].image },
        { productId: products[1].id, name: products[1].name, category: products[1].category, price: products[1].price, quantity: 1, totalPrice: products[1].price, image: products[1].image }
      ],
      financials: {
        subtotal: products[0].price * 2 + products[1].price,
        deliveryFee: 0,
        discount: 0,
        grandTotal: products[0].price * 2 + products[1].price
      },
      status: 'Confirmed'
    },
    {
      orderId: 'SE-' + Math.floor(100000 + Math.random() * 900000),
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      formattedDate: new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(Date.now() - 86400000)),
      customer: {
        fullName: 'Alex Morgan',
        email: 'alex@example.com',
        phone: '+94 71 987 6543',
        address: '15 Havelock Road, Colombo 05'
      },
      payment: { method: 'Cash on Delivery' },
      items: [
        { productId: products[6].id, name: products[6].name, category: products[6].category, price: products[6].price, quantity: 1, totalPrice: products[6].price, image: products[6].image }
      ],
      financials: {
        subtotal: products[6].price,
        deliveryFee: 0,
        discount: 0,
        grandTotal: products[6].price
      },
      status: 'Completed'
    }
  ];

  sampleOrders.forEach(o => Storage.saveOrder(o));
  showToast('Added 2 sample customer orders.', 'success');
  refreshAllData();
};

window.adminSimulateOrder = function () {
  const products = Storage.getProducts().filter(p => p.stock > 0);
  if (products.length === 0) {
    showToast('Cannot simulate order: No in-stock products.', 'warning');
    return;
  }

  const p = products[Math.floor(Math.random() * products.length)];
  const orderRecord = {
    orderId: 'SE-' + Math.floor(100000 + Math.random() * 900000),
    createdAt: new Date().toISOString(),
    formattedDate: new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date()),
    customer: {
      fullName: 'David Perera',
      email: 'david.p@example.com',
      phone: '+94 77 555 1234',
      address: '88 Galle Road, Mount Lavinia'
    },
    payment: { method: 'Demo Card (Mock)' },
    items: [
      { productId: p.id, name: p.name, category: p.category, price: p.price, quantity: 1, totalPrice: p.price, image: p.image }
    ],
    financials: {
      subtotal: p.price,
      deliveryFee: 0,
      discount: 0,
      grandTotal: p.price
    },
    status: 'Confirmed'
  };

  Storage.deductStock(p.id, 1);
  Storage.saveOrder(orderRecord);
  showToast(`Simulated test order #${orderRecord.orderId} created!`, 'success');
  refreshAllData();
};

window.adminCloseModals = function () {
  document.querySelectorAll('.modal-overlay').forEach(m => {
    m.style.display = 'none';
    m.classList.remove('open');
  });
};

window.adminSwitchUser = function (email) {
  const users = Storage.getUsers();
  const target = users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (target) {
    Auth.login(target.email, target.password || 'password123');
    window.location.href = 'customer-dashboard.html';
  }
};

/**
 * =========================================================================
 * 7. USERS & CUSTOMERS DIRECTORY
 * =========================================================================
 */
function renderUsersKPIs() {
  const users = Storage.getUsers();
  const orders = Storage.getOrders();

  const totalEl = document.getElementById('users-kpi-total');
  const custEl = document.getElementById('users-kpi-customers');
  const adminEl = document.getElementById('users-kpi-admins');
  const activeBuyersEl = document.getElementById('users-kpi-active-buyers');

  const customerCount = users.filter(u => u.role !== 'Admin').length;
  const adminCount = users.filter(u => u.role === 'Admin').length;

  const buyerEmails = new Set(orders.map(o => (o.customer?.email || '').toLowerCase()));
  const activeBuyers = users.filter(u => buyerEmails.has((u.email || '').toLowerCase())).length;

  if (totalEl) totalEl.textContent = users.length;
  if (custEl) custEl.textContent = customerCount;
  if (adminEl) adminEl.textContent = adminCount;
  if (activeBuyersEl) activeBuyersEl.textContent = activeBuyers;
}

function renderUsersTable() {
  const tbody = document.getElementById('users-table-tbody');
  const countEl = document.getElementById('users-table-count');
  if (!tbody) return;

  const users = Storage.getUsers();
  const orders = Storage.getOrders();

  // Filter
  const filtered = users.filter(u => {
    const q = state.userFilter.search;
    const matchSearch = !q ||
      (u.fullName || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.phone || '').toLowerCase().includes(q) ||
      (u.city || '').toLowerCase().includes(q) ||
      (u.address || '').toLowerCase().includes(q);

    const matchRole = state.userFilter.role === 'ALL' || u.role === state.userFilter.role;
    return matchSearch && matchRole;
  });

  if (countEl) {
    countEl.textContent = `Showing ${filtered.length} of ${users.length} users`;
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center; padding: 2.5rem; color: var(--color-text-muted);">
          No users match the current search filter.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(u => {
    // Calculate customer order activity
    const userOrders = orders.filter(o =>
      (o.customer?.email || '').toLowerCase() === (u.email || '').toLowerCase() ||
      (o.userId && o.userId === u.id)
    );
    const userTotalSpent = userOrders.reduce((acc, o) => acc + (o.financials?.grandTotal || 0), 0);

    const initials = (u.fullName || 'User')
      .split(' ')
      .map(n => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();

    let roleBadge = `<span class="badge" style="background:rgba(37, 99, 235, 0.1); color:#2563eb; font-weight:600; padding:0.25rem 0.65rem; border-radius:var(--radius-full); font-size:0.75rem;">🛍️ Customer</span>`;
    if (u.role === 'Admin') {
      roleBadge = `<span class="badge" style="background:rgba(216, 92, 54, 0.12); color:var(--color-brand-primary); font-weight:700; padding:0.25rem 0.65rem; border-radius:var(--radius-full); font-size:0.75rem;">🛡️ Admin</span>`;
    } else if (u.role === 'VIP Member') {
      roleBadge = `<span class="badge" style="background:rgba(139, 92, 246, 0.12); color:#8b5cf6; font-weight:700; padding:0.25rem 0.65rem; border-radius:var(--radius-full); font-size:0.75rem;">⭐ VIP Member</span>`;
    }

    const fullAddr = [u.address, u.city, u.postcode].filter(Boolean).join(', ') || 'Not specified';

    return `
      <tr>
        <td>
          <div style="display:flex; align-items:center; gap:0.75rem;">
            <div style="width:36px; height:36px; border-radius:50%; background:var(--color-surface-hover); border:1px solid var(--color-border); display:flex; align-items:center; justify-content:center; font-weight:700; font-size:0.8rem; color:var(--color-text-primary); flex-shrink:0;">
              ${initials}
            </div>
            <div>
              <strong style="color:var(--color-text-primary); font-size:0.9rem; display:block;">${escapeHtml(u.fullName || 'Anonymous')}</strong>
              <span style="font-size:0.75rem; color:var(--color-text-muted); font-family:var(--font-mono);">${escapeHtml(u.id || '')}</span>
            </div>
          </div>
        </td>
        <td>
          <div style="display:flex; flex-direction:column; gap:0.2rem;">
            <a href="mailto:${escapeHtml(u.email)}" style="color:var(--color-brand-primary); font-size:0.85rem; font-weight:500; text-decoration:none;">${escapeHtml(u.email)}</a>
            <span style="font-size:0.78rem; color:var(--color-text-muted);">${escapeHtml(u.phone || 'No phone')}</span>
          </div>
        </td>
        <td>
          <span style="font-size:0.85rem; color:var(--color-text-secondary); max-width:220px; display:inline-block;" title="${escapeHtml(fullAddr)}">
            ${escapeHtml(fullAddr)}
          </span>
        </td>
        <td>
          ${roleBadge}
        </td>
        <td>
          <span style="font-size:0.82rem; color:var(--color-text-muted); font-family:var(--font-mono);">
            ${escapeHtml(u.joinedDate || '2026-01-01')}
          </span>
        </td>
        <td>
          <div style="display:flex; flex-direction:column; gap:0.15rem;">
            <span style="font-size:0.85rem; font-weight:600; color:var(--color-text-primary);">${userOrders.length} ${userOrders.length === 1 ? 'order' : 'orders'}</span>
            <span style="font-size:0.8rem; font-weight:700; color:var(--color-success); font-family:var(--font-mono);">${CURRENCY.format(userTotalSpent)}</span>
          </div>
        </td>
        <td style="text-align:right;">
          <button type="button" class="btn btn-secondary" style="font-size:0.75rem; padding:0.35rem 0.75rem; border-radius:var(--radius-full);" onclick="window.adminViewUserModal('${escapeHtml(u.id || u.email)}')">
            <span>👁️ Details</span>
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

window.adminRefreshUsers = function () {
  refreshAllData();
  showToast('Users directory refreshed successfully.', 'success');
};

window.adminViewUserModal = function (identifier) {
  const users = Storage.getUsers();
  const orders = Storage.getOrders();
  const user = users.find(u => u.id === identifier || u.email?.toLowerCase() === identifier.toLowerCase());

  if (!user) {
    showToast('User profile not found.', 'danger');
    return;
  }

  const userOrders = orders.filter(o =>
    (o.customer?.email || '').toLowerCase() === (user.email || '').toLowerCase() ||
    (o.userId && o.userId === user.id)
  );
  const totalSpent = userOrders.reduce((acc, o) => acc + (o.financials?.grandTotal || 0), 0);

  const container = document.getElementById('user-modal-content');
  if (!container) return;

  const fullAddr = [user.address, user.city, user.postcode].filter(Boolean).join(', ') || 'No address provided';

  container.innerHTML = `
    <div style="display:flex; align-items:center; gap:1rem; padding-bottom:1.25rem; border-bottom:1px solid var(--color-border); margin-bottom:1.25rem;">
      <div style="width:54px; height:54px; border-radius:50%; background:var(--color-brand-primary); color:#fff; display:flex; align-items:center; justify-content:center; font-size:1.25rem; font-weight:700; flex-shrink:0;">
        ${(user.fullName || 'U').charAt(0).toUpperCase()}
      </div>
      <div style="flex:1;">
        <div style="display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap;">
          <h4 style="margin:0; font-size:1.15rem; color:var(--color-text-primary); font-family:var(--font-serif);">${escapeHtml(user.fullName || 'User')}</h4>
          <span style="font-size:0.75rem; font-weight:700; padding:0.2rem 0.6rem; border-radius:var(--radius-full); background:var(--color-surface-subtle); border:1px solid var(--color-border);">
            ${escapeHtml(user.role || 'Customer')}
          </span>
        </div>
        <p style="margin:0.2rem 0 0 0; font-size:0.8rem; color:var(--color-text-muted); font-family:var(--font-mono);">User ID: ${escapeHtml(user.id || 'N/A')} • Member since ${escapeHtml(user.joinedDate || '2026-01-01')}</p>
      </div>
    </div>

    <!-- Contact & Details Grid -->
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem; margin-bottom:1.5rem; background:var(--color-surface-subtle); padding:1rem; border-radius:var(--radius-md); border:1px solid var(--color-border);">
      <div>
        <label style="font-size:0.75rem; color:var(--color-text-muted); font-weight:600; text-transform:uppercase;">Email Address</label>
        <div style="font-size:0.9rem; font-weight:600; color:var(--color-text-primary); margin-top:0.2rem;">${escapeHtml(user.email)}</div>
      </div>
      <div>
        <label style="font-size:0.75rem; color:var(--color-text-muted); font-weight:600; text-transform:uppercase;">Phone Number</label>
        <div style="font-size:0.9rem; font-weight:600; color:var(--color-text-primary); margin-top:0.2rem;">${escapeHtml(user.phone || 'N/A')}</div>
      </div>
      <div style="grid-column: span 2;">
        <label style="font-size:0.75rem; color:var(--color-text-muted); font-weight:600; text-transform:uppercase;">Delivery Address</label>
        <div style="font-size:0.9rem; color:var(--color-text-secondary); margin-top:0.2rem;">${escapeHtml(fullAddr)}</div>
      </div>
    </div>

    <!-- Order History Header -->
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem;">
      <strong style="font-size:0.95rem; color:var(--color-text-primary);">Customer Order History (${userOrders.length})</strong>
      <span style="font-size:0.85rem; font-weight:700; color:var(--color-success); font-family:var(--font-mono);">Lifetime Spend: ${CURRENCY.format(totalSpent)}</span>
    </div>

    <!-- Orders Mini-List -->
    ${userOrders.length === 0 ? `
      <div style="padding:1.5rem; text-align:center; background:var(--color-surface); border:1px dashed var(--color-border); border-radius:var(--radius-sm); color:var(--color-text-muted); font-size:0.85rem;">
        No purchase orders placed by this customer yet.
      </div>
    ` : `
      <div style="max-height:220px; overflow-y:auto; border:1px solid var(--color-border); border-radius:var(--radius-sm);">
        <table class="admin-table" style="font-size:0.82rem; margin:0;">
          <thead>
            <tr>
              <th scope="col">Order ID</th>
              <th scope="col">Date</th>
              <th scope="col">Items</th>
              <th scope="col">Total</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            ${userOrders.map(o => `
              <tr>
                <td><strong style="color:var(--color-brand-primary); font-family:var(--font-mono);">${escapeHtml(o.orderId)}</strong></td>
                <td>${escapeHtml(o.formattedDate || 'Recent')}</td>
                <td>${o.items?.length || 1} item(s)</td>
                <td><strong style="font-family:var(--font-mono);">${CURRENCY.format(o.financials?.grandTotal || 0)}</strong></td>
                <td>
                  <span class="status-badge ${getStatusBadgeClass(o.status)}">${escapeHtml(o.status || 'Pending')}</span>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `}
  `;

  const modal = document.getElementById('modal-user-details');
  if (modal) {
    modal.style.display = 'flex';
    modal.classList.add('open');
  }
};

function resolveOrderStatus(status = '') {
  const s = String(status || '').toLowerCase();
  if (s.includes('complete') || s.includes('deliver')) return 'Completed';
  return 'Confirmed';
}

function getStatusSelectClass(status = '') {
  const resolved = resolveOrderStatus(status);
  if (resolved === 'Completed') return 'status-select-completed';
  return 'status-select-confirmed';
}

function getStatusBadgeClass(status = '') {
  const s = status.toLowerCase();
  if (s.includes('complete') || s.includes('deliver')) return 'status-badge-success';
  if (s.includes('confirm')) return 'status-badge-info';
  if (s.includes('pend') || s.includes('process')) return 'status-badge-warning';
  if (s.includes('cancel')) return 'status-badge-danger';
  return 'status-badge-info';
}

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

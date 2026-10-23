/**
 * ShopEase Profile Page Controller
 * Handles user account presentation, profile updating, order metrics, theme toggling, and authentication guard.
 */

import { Storage } from './storage.js';
import { Auth } from './auth.js';
import { CURRENCY } from './products.js';

// Global Themes
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

let currentUser = null;

document.addEventListener('DOMContentLoaded', () => {
  // 1. Auth Guard
  currentUser = Auth.getCurrentUser();
  if (!currentUser) {
    const users = Storage.getUsers();
    currentUser = users.slice().reverse().find(u => u.role !== 'Admin') || users[0];
    if (currentUser) {
      Storage.setCurrentUser(currentUser);
    } else {
      window.location.href = 'login.html';
      return;
    }
  }

  // 2. Initialize Theme
  initTheme();

  // 3. Admin Console visibility
  const emailLower = (currentUser.email || '').toLowerCase();
  const isAdmin = currentUser.role === 'Admin' || emailLower === 'admin@gmail.com' || emailLower === 'admin@shopease.com' || emailLower.includes('admin');
  if (isAdmin) {
    const adminBtn = document.getElementById('dash-admin-btn');
    if (adminBtn) adminBtn.style.display = 'inline-flex';
  }

  // 4. Render User Information & Stats
  renderProfile();
  renderOrderSummary();

  // 5. Setup Action Listeners
  setupEventListeners();
});

/**
 * Theme Manager
 */
function initTheme() {
  const settings = Storage.getSettings();
  applyTheme(settings.theme || 'light');

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
 * Screen Reader Live Announcer
 */
function announce(message) {
  const el = document.getElementById('live-announcer');
  if (el) {
    el.textContent = message;
  }
}

/**
 * Render Profile Data on Page
 */
function renderProfile() {
  if (!currentUser) return;

  const initial = (currentUser.fullName || 'User').trim().charAt(0).toUpperCase();
  const avatarEl = document.getElementById('profile-avatar');
  if (avatarEl) avatarEl.textContent = initial;

  const displayNameEl = document.getElementById('profile-display-name');
  if (displayNameEl) displayNameEl.textContent = currentUser.fullName || 'Member';

  const displayRoleEl = document.getElementById('profile-display-role');
  if (displayRoleEl) {
    displayRoleEl.textContent = currentUser.role || 'Customer';
    if (currentUser.role === 'Admin') {
      displayRoleEl.style.background = 'rgba(216,92,54,0.15)';
      displayRoleEl.style.color = 'var(--color-brand-primary)';
    } else if (currentUser.role === 'VIP Member') {
      displayRoleEl.style.background = 'rgba(245,158,11,0.15)';
      displayRoleEl.style.color = '#d97706';
    } else {
      displayRoleEl.style.background = 'rgba(37,99,235,0.12)';
      displayRoleEl.style.color = '#2563eb';
    }
  }

  const displayEmailEl = document.getElementById('profile-display-email');
  if (displayEmailEl) displayEmailEl.textContent = currentUser.email || '';

  const displayMetaEl = document.getElementById('profile-display-meta');
  if (displayMetaEl) {
    displayMetaEl.textContent = `Member Account • Joined ${currentUser.joinedDate || '2026'}`;
  }

  // View Card Elements
  const nameEl = document.getElementById('view-user-name');
  if (nameEl) nameEl.textContent = currentUser.fullName || '-';

  const emailEl = document.getElementById('view-user-email');
  if (emailEl) emailEl.textContent = currentUser.email || '-';

  const phoneEl = document.getElementById('view-user-phone');
  if (phoneEl) phoneEl.textContent = currentUser.phone || 'Not provided';

  const roleEl = document.getElementById('view-user-role');
  if (roleEl) roleEl.textContent = currentUser.role || 'Customer';

  const addressEl = document.getElementById('view-user-address');
  if (addressEl) {
    const parts = [currentUser.address, currentUser.city, currentUser.postcode].filter(Boolean);
    addressEl.textContent = parts.length > 0 ? parts.join(', ') : 'No default address specified.';
  }
}

/**
 * Render Order Summary & Metrics
 */
function renderOrderSummary() {
  const allOrders = Storage.getOrders();
  const userEmail = (currentUser?.email || '').toLowerCase();
  const userId = currentUser?.id;

  const userOrders = allOrders.filter(o => {
    const custEmail = (o.customer?.email || '').toLowerCase();
    return (custEmail && custEmail === userEmail) || (o.userId && o.userId === userId);
  });

  const totalOrdersEl = document.getElementById('stat-total-orders');
  if (totalOrdersEl) {
    totalOrdersEl.textContent = userOrders.length;
  }

  const totalSpent = userOrders.reduce((acc, order) => {
    const val = parseFloat(order.grandTotal ?? order.total ?? 0);
    return acc + (isNaN(val) ? 0 : val);
  }, 0);

  const totalSpentEl = document.getElementById('stat-total-spent');
  if (totalSpentEl) {
    totalSpentEl.textContent = `${CURRENCY.symbol} ${totalSpent.toFixed(2)}`;
  }

  const container = document.getElementById('profile-recent-orders-container');
  if (!container) return;

  if (userOrders.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; padding:2rem 1rem; color:var(--color-text-muted); background:var(--color-surface-subtle); border-radius:var(--radius-lg); border:1px dashed var(--color-border);">
        <div style="font-size:2.2rem; margin-bottom:0.5rem;">🛍️</div>
        <p style="font-size:0.95rem; font-weight:600; color:var(--color-text-primary); margin:0 0 0.25rem 0;">No Purchase History Found</p>
        <p style="font-size:0.85rem; margin:0 0 1.25rem 0;">You have not placed any orders yet. Discover our curated catalog!</p>
        <a href="customer-dashboard.html#dash-products-section" class="btn btn-primary" style="padding:0.45rem 1.15rem; font-size:0.85rem; border-radius:var(--radius-full);">
          Browse Products →
        </a>
      </div>
    `;
    return;
  }

  // Display top recent orders
  const recentOrders = userOrders.slice(0, 5);
  container.innerHTML = `
    <div style="overflow-x:auto;">
      <table style="width:100%; border-collapse:collapse; font-size:0.875rem;">
        <thead>
          <tr style="border-bottom:1.5px solid var(--color-border); text-align:left; color:var(--color-text-muted); font-size:0.75rem; text-transform:uppercase; font-family:var(--font-mono);">
            <th style="padding:0.6rem 0.5rem;">Order Ref</th>
            <th style="padding:0.6rem 0.5rem;">Date</th>
            <th style="padding:0.6rem 0.5rem;">Items</th>
            <th style="padding:0.6rem 0.5rem;">Total</th>
            <th style="padding:0.6rem 0.5rem;">Status</th>
          </tr>
        </thead>
        <tbody>
          ${recentOrders.map(order => {
            const dateStr = order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'Recent';
            const itemsCount = (order.items || []).reduce((sum, item) => sum + (item.quantity || 1), 0);
            const totalVal = parseFloat(order.grandTotal ?? order.total ?? 0).toFixed(2);
            const status = order.status || 'Delivered';
            let badgeBg = 'rgba(16,185,129,0.12)';
            let badgeColor = '#059669';
            if (status.toLowerCase().includes('process') || status.toLowerCase().includes('pending')) {
              badgeBg = 'rgba(245,158,11,0.15)';
              badgeColor = '#d97706';
            }
            return `
              <tr style="border-bottom:1px solid var(--color-border);">
                <td style="padding:0.75rem 0.5rem; font-family:var(--font-mono); font-weight:700; color:var(--color-brand-primary);">
                  ${order.orderId || 'SE-ORD'}
                </td>
                <td style="padding:0.75rem 0.5rem; color:var(--color-text-secondary);">${dateStr}</td>
                <td style="padding:0.75rem 0.5rem; color:var(--color-text-primary); font-weight:600;">${itemsCount} item(s)</td>
                <td style="padding:0.75rem 0.5rem; font-family:var(--font-mono); font-weight:700;">${CURRENCY.symbol} ${totalVal}</td>
                <td style="padding:0.75rem 0.5rem;">
                  <span style="display:inline-block; font-size:0.75rem; font-weight:700; padding:0.2rem 0.55rem; border-radius:var(--radius-full); background:${badgeBg}; color:${badgeColor};">
                    ${status}
                  </span>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

/**
 * Event Handlers
 */
function setupEventListeners() {
  const btnToggleEdit = document.getElementById('btn-toggle-edit');
  const btnCancelEditTop = document.getElementById('btn-cancel-edit-top');
  const btnCancelEdit = document.getElementById('btn-cancel-edit');
  const viewCard = document.getElementById('profile-view-card');
  const editCard = document.getElementById('profile-edit-card');
  const form = document.getElementById('profile-edit-form');
  const logoutBtn = document.getElementById('dash-logout-btn');

  // Toggle Edit Card
  const openEditMode = () => {
    if (!currentUser) return;
    document.getElementById('input-fullname').value = currentUser.fullName || '';
    document.getElementById('input-email').value = currentUser.email || '';
    document.getElementById('input-phone').value = currentUser.phone || '';
    
    const parts = [currentUser.address, currentUser.city, currentUser.postcode].filter(Boolean);
    document.getElementById('input-address').value = parts.length > 0 ? parts.join(', ') : (currentUser.address || '');

    viewCard.style.display = 'none';
    editCard.style.display = 'block';
    document.getElementById('input-fullname').focus();
  };

  const closeEditMode = () => {
    editCard.style.display = 'none';
    viewCard.style.display = 'block';
  };

  btnToggleEdit?.addEventListener('click', openEditMode);
  btnCancelEditTop?.addEventListener('click', closeEditMode);
  btnCancelEdit?.addEventListener('click', closeEditMode);

  // Form Submit
  form?.addEventListener('submit', (e) => {
    e.preventDefault();

    const fullName = document.getElementById('input-fullname').value.trim();
    const phone = document.getElementById('input-phone').value.trim();
    const address = document.getElementById('input-address').value.trim();

    if (!fullName) {
      showToast('Please enter your full name.', 'warning');
      return;
    }
    if (!phone) {
      showToast('Please provide a contact phone number.', 'warning');
      return;
    }
    if (!address) {
      showToast('Please provide a default delivery address.', 'warning');
      return;
    }

    const updated = Storage.updateUser({
      fullName,
      phone,
      address
    });

    if (updated) {
      currentUser = updated;
      renderProfile();
      closeEditMode();
      showToast('Profile details updated successfully!', 'success');
      announce('Profile details have been successfully saved.');
    } else {
      showToast('Failed to save profile changes.', 'error');
    }
  });

  // Logout Handler
  logoutBtn?.addEventListener('click', () => {
    Auth.logout();
    showToast('Signed out successfully.', 'info');
    setTimeout(() => {
      window.location.href = 'login.html';
    }, 400);
  });
}

/**
 * Toast Notification Banner
 */
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.setAttribute('role', 'alert');
  toast.style.animation = 'fadeIn 0.25s ease';

  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ'
  };

  toast.innerHTML = `
    <span class="toast-icon" aria-hidden="true">${icons[type] || 'ℹ'}</span>
    <span class="toast-message">${message}</span>
    <button type="button" class="toast-close" aria-label="Dismiss notification">✕</button>
  `;

  const closeBtn = toast.querySelector('.toast-close');
  closeBtn?.addEventListener('click', () => {
    toast.remove();
  });

  container.appendChild(toast);

  setTimeout(() => {
    if (toast.parentElement) {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(8px)';
      toast.style.transition = 'all 0.25s ease';
      setTimeout(() => toast.remove(), 250);
    }
  }, 3500);
}

/**
 * ShopEase LocalStorage Manager
 * Handles safe read/write operations for products inventory, shopping cart,
 * order history, and accessibility preferences.
 */

import { INITIAL_PRODUCTS } from './products.js';

const STORAGE_KEYS = {
  INVENTORY: 'shopease_inventory_v1',
  CATALOG_VERSION: 'shopease_catalog_version',
  CART: 'shopease_cart_v1',
  ORDERS: 'shopease_orders_v1',
  WISHLIST: 'shopease_wishlist_v1',
  SETTINGS: 'shopease_settings_v1',
  USERS: 'shopease_users_v1',
  CURRENT_USER: 'shopease_current_user_v1'
};

// Seed Demo User Accounts
export const DEFAULT_USERS = [
  {
    id: 'user_alex',
    fullName: 'Alex Morgan',
    email: 'alex@example.com',
    password: 'password123',
    phone: '07123 456789',
    address: '14 Elm Street',
    city: 'London',
    postcode: 'SW1A 1AA',
    role: 'Customer',
    joinedDate: '2026-01-15'
  },
  {
    id: 'user_sarah',
    fullName: 'Sarah Jenkins',
    email: 'sarah@example.com',
    password: 'password123',
    phone: '07700 900123',
    address: '42 Highfield Terrace',
    city: 'Manchester',
    postcode: 'M14 6XX',
    role: 'VIP Member',
    joinedDate: '2026-02-20'
  },
  {
    id: 'user_admin',
    fullName: 'System Administrator',
    email: 'admin@gmail.com',
    password: 'admin@123',
    phone: '07000 999888',
    address: 'ShopEase Headquarters, 1 Tech Square',
    city: 'London',
    postcode: 'EC1A 1BB',
    role: 'Admin',
    joinedDate: '2026-01-01'
  },
  {
    id: 'user_admin_legacy',
    fullName: 'Admin Backup',
    email: 'admin@shopease.com',
    password: 'password123',
    phone: '07000 999888',
    address: 'ShopEase Headquarters, 1 Tech Square',
    city: 'London',
    postcode: 'EC1A 1BB',
    role: 'Admin',
    joinedDate: '2026-01-01'
  }
];

// Default Accessibility and UI Settings
const DEFAULT_SETTINGS = {
  theme: 'light', // 'light' | 'dark' | 'high-contrast'
  fontSize: 'normal', // 'normal' | 'large' | 'xlarge'
  reducedMotion: false,
  soundEffects: false
};

// Memory fallback in case localStorage is blocked by user privacy modes
let memoryStorage = {};

function isLocalStorageAvailable() {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return false;
    const testKey = '__shopease_test__';
    window.localStorage.setItem(testKey, testKey);
    window.localStorage.removeItem(testKey);
    return true;
  } catch (e) {
    return false;
  }
}

const hasLocalStorage = isLocalStorageAvailable();

function dispatchStorageEvent(name, detail = {}) {
  try {
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function' && typeof CustomEvent === 'function') {
      window.dispatchEvent(new CustomEvent(name, { detail }));
    }
  } catch (e) {
    // Non-browser or suppressed environment
  }
}

// Cross-tab synchronisation for multi-window realtime state
if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
  window.addEventListener('storage', (event) => {
    if (event.key === STORAGE_KEYS.ORDERS) {
      try {
        const orders = event.newValue ? JSON.parse(event.newValue) : [];
        dispatchStorageEvent('shopease:orders-updated', { orders });
      } catch (e) {}
    } else if (event.key === STORAGE_KEYS.INVENTORY) {
      try {
        const products = event.newValue ? JSON.parse(event.newValue) : [];
        dispatchStorageEvent('shopease:inventory-updated', { products });
      } catch (e) {}
    }
  });
}

function getItem(key, defaultValue = null) {
  try {
    if (hasLocalStorage) {
      const data = window.localStorage.getItem(key);
      return data !== null ? JSON.parse(data) : defaultValue;
    }
    return memoryStorage[key] !== undefined ? memoryStorage[key] : defaultValue;
  } catch (err) {
    console.error(`Error reading ${key} from storage:`, err);
    return defaultValue;
  }
}

function setItem(key, value) {
  try {
    if (hasLocalStorage) {
      window.localStorage.setItem(key, JSON.stringify(value));
    } else {
      memoryStorage[key] = value;
    }
    return true;
  } catch (err) {
    console.error(`Error saving ${key} to storage:`, err);
    return false;
  }
}

export const Storage = {
  /**
   * Initializes or fetches product inventory from localStorage.
   * If not found, populates with the 10 initial products.
   */
  getProducts() {
    let inventory = getItem(STORAGE_KEYS.INVENTORY, null);
    if (!inventory || !Array.isArray(inventory) || inventory.length < INITIAL_PRODUCTS.length) {
      inventory = JSON.parse(JSON.stringify(INITIAL_PRODUCTS));
      setItem(STORAGE_KEYS.INVENTORY, inventory);
      setItem(STORAGE_KEYS.CATALOG_VERSION, 2);
    } else if (getItem(STORAGE_KEYS.CATALOG_VERSION, 0) !== 2) {
      inventory = inventory.map(product => {
        const initialProduct = INITIAL_PRODUCTS.find(initial => initial.id === product.id);
        return initialProduct ? { ...product, price: initialProduct.price } : product;
      });
      setItem(STORAGE_KEYS.INVENTORY, inventory);
      setItem(STORAGE_KEYS.CATALOG_VERSION, 2);
    }
    return inventory;
  },

  /**
   * Saves updated product array to localStorage
   */
  saveProducts(products) {
    setItem(STORAGE_KEYS.INVENTORY, products);
    dispatchStorageEvent('shopease:inventory-updated', { products });
    return products;
  },

  /**
   * Updates an existing product's fields
   */
  updateProduct(id, updatedFields) {
    const products = this.getProducts();
    const idx = products.findIndex(p => p.id === id);
    if (idx !== -1) {
      products[idx] = { ...products[idx], ...updatedFields };
      this.saveProducts(products);
      return products[idx];
    }
    return null;
  },

  /**
   * Directly sets stock count for a product
   */
  updateStock(id, newStock) {
    return this.updateProduct(id, { stock: Math.max(0, parseInt(newStock, 10) || 0) });
  },

  /**
   * Finds a product by ID from the stored inventory.
   */
  getProductById(id) {
    const products = this.getProducts();
    return products.find(p => p.id === id) || null;
  },

  /**
   * Updates the in-stock quantity of a product (e.g. upon checkout).
   * @param {string} productId 
   * @param {number} quantityDeducted 
   */
  deductStock(productId, quantityDeducted) {
    const products = this.getProducts();
    const product = products.find(p => p.id === productId);
    if (product) {
      product.stock = Math.max(0, product.stock - quantityDeducted);
      setItem(STORAGE_KEYS.INVENTORY, products);
      dispatchStorageEvent('shopease:inventory-updated', { productId, newStock: product.stock });
      return product.stock;
    }
    return null;
  },

  /**
   * Shopping Cart operations
   */
  getCart() {
    const cart = getItem(STORAGE_KEYS.CART, []);
    return Array.isArray(cart) ? cart : [];
  },

  saveCart(cart) {
    setItem(STORAGE_KEYS.CART, cart);
    dispatchStorageEvent('shopease:cart-updated', { cart });
  },

  clearCart() {
    setItem(STORAGE_KEYS.CART, []);
    dispatchStorageEvent('shopease:cart-updated', { cart: [] });
  },

  /**
   * Order History operations
   */
  getOrders() {
    const orders = getItem(STORAGE_KEYS.ORDERS, []);
    return Array.isArray(orders) ? orders : [];
  },

  saveOrder(order) {
    const orders = this.getOrders();
    orders.unshift(order); // Newest order first
    setItem(STORAGE_KEYS.ORDERS, orders);
    dispatchStorageEvent('shopease:orders-updated', { orders });
    return order;
  },

  getOrderById(orderId) {
    if (!orderId) return null;
    const orders = this.getOrders();
    const cleanId = String(orderId).trim().toLowerCase();
    return orders.find(o => String(o.orderId || '').trim().toLowerCase() === cleanId) || null;
  },

  /**
   * Wishlist operations
   */
  getWishlist() {
    const list = getItem(STORAGE_KEYS.WISHLIST, []);
    return Array.isArray(list) ? list : [];
  },

  toggleWishlist(productId) {
    let list = this.getWishlist();
    const exists = list.includes(productId);
    if (exists) {
      list = list.filter(id => id !== productId);
    } else {
      list.push(productId);
    }
    setItem(STORAGE_KEYS.WISHLIST, list);
    dispatchStorageEvent('shopease:wishlist-updated', { wishlist: list, productId, added: !exists });
    return !exists;
  },

  /**
   * Accessibility and UI Settings
   */
  getSettings() {
    const settings = getItem(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
    return { ...DEFAULT_SETTINGS, ...settings };
  },

  saveSettings(newSettings) {
    const current = this.getSettings();
    const updated = { ...current, ...newSettings };
    setItem(STORAGE_KEYS.SETTINGS, updated);
    dispatchStorageEvent('shopease:settings-updated', { settings: updated });
    return updated;
  },

  /**
   * Resets entire store to initial fresh state (restores stock, clears cart, preserves orders if needed or full reset)
   */
  resetStore(preserveOrders = false) {
    setItem(STORAGE_KEYS.INVENTORY, JSON.parse(JSON.stringify(INITIAL_PRODUCTS)));
    setItem(STORAGE_KEYS.CART, []);
    setItem(STORAGE_KEYS.WISHLIST, []);
    if (!preserveOrders) {
      setItem(STORAGE_KEYS.ORDERS, []);
    }
    dispatchStorageEvent('shopease:store-reset');
  },

  /**
   * User Management operations
   */
  getUsers() {
    let users = getItem(STORAGE_KEYS.USERS, null);
    if (!users || !Array.isArray(users) || users.length === 0) {
      users = JSON.parse(JSON.stringify(DEFAULT_USERS));
      setItem(STORAGE_KEYS.USERS, users);
      return users;
    }

    // Ensure default demo users exist and their roles (especially Admin) are guaranteed
    let modified = false;
    DEFAULT_USERS.forEach(defUser => {
      const idx = users.findIndex(u => u.email.toLowerCase() === defUser.email.toLowerCase());
      if (idx === -1) {
        users.push(JSON.parse(JSON.stringify(defUser)));
        modified = true;
      } else {
        if (defUser.role && users[idx].role !== defUser.role) {
          users[idx].role = defUser.role;
          modified = true;
        }
      }
    });

    if (modified) {
      setItem(STORAGE_KEYS.USERS, users);
    }
    return users;
  },

  saveUsers(users) {
    setItem(STORAGE_KEYS.USERS, users);
    dispatchStorageEvent('shopease:users-updated', { users });
  },

  getCurrentUser() {
    const user = getItem(STORAGE_KEYS.CURRENT_USER, null);
    if (!user) return null;
    const emailLower = (user.email || '').toLowerCase();
    if ((emailLower === 'admin@gmail.com' || emailLower === 'admin@shopease.com' || emailLower.includes('admin')) && user.role !== 'Admin') {
      user.role = 'Admin';
      setItem(STORAGE_KEYS.CURRENT_USER, user);
    }
    return user;
  },

  setCurrentUser(user) {
    setItem(STORAGE_KEYS.CURRENT_USER, user);
    dispatchStorageEvent('shopease:auth-changed', { user });
  },

  updateUser(updatedData) {
    const current = this.getCurrentUser();
    if (!current) return null;
    const updated = { ...current, ...updatedData };
    this.setCurrentUser(updated);

    const users = this.getUsers();
    const idx = users.findIndex(u => (u.id && u.id === updated.id) || (u.email && u.email.toLowerCase() === (updated.email || '').toLowerCase()));
    if (idx !== -1) {
      users[idx] = { ...users[idx], ...updatedData };
      this.saveUsers(users);
    }
    return updated;
  },

  clearCurrentUser() {
    setItem(STORAGE_KEYS.CURRENT_USER, null);
    dispatchStorageEvent('shopease:auth-changed', { user: null });
  },

  /**
   * Admin Operations: Orders management
   */
  saveOrders(orders) {
    setItem(STORAGE_KEYS.ORDERS, orders);
    dispatchStorageEvent('shopease:orders-updated', { orders });
    return orders;
  },

  updateOrderStatus(orderId, newStatus) {
    const orders = this.getOrders();
    const order = orders.find(o => o.orderId === orderId);
    if (order) {
      order.status = newStatus;
      this.saveOrders(orders);
      return order;
    }
    return null;
  },

  deleteOrder(orderId) {
    let orders = this.getOrders();
    orders = orders.filter(o => o.orderId !== orderId);
    this.saveOrders(orders);
    return orders;
  },

  /**
   * Admin Operations: User role management
   */
  updateUserRole(userId, newRole) {
    const users = this.getUsers();
    const user = users.find(u => u.id === userId);
    if (user) {
      user.role = newRole;
      this.saveUsers(users);
      // If updating currently logged in user, refresh session
      const current = this.getCurrentUser();
      if (current && current.id === userId) {
        current.role = newRole;
        this.setCurrentUser(current);
      }
      return user;
    }
    return null;
  },

  deleteUser(userId) {
    let users = this.getUsers();
    users = users.filter(u => u.id !== userId);
    this.saveUsers(users);
    return users;
  },

  addUser(userData) {
    const users = this.getUsers();
    const newUser = {
      id: 'user_' + Date.now(),
      joinedDate: new Date().toISOString().split('T')[0],
      role: 'Customer',
      ...userData
    };
    users.push(newUser);
    this.saveUsers(users);
    return newUser;
  }
};

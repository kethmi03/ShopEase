/**
 * ShopEase LocalStorage Manager
 * Handles safe read/write operations for products inventory, shopping cart,
 * order history, and accessibility preferences.
 */

import { INITIAL_PRODUCTS } from './products.js';

const STORAGE_KEYS = {
  INVENTORY: 'shopease_inventory_v1',
  CART: 'shopease_cart_v1',
  ORDERS: 'shopease_orders_v1',
  WISHLIST: 'shopease_wishlist_v1',
  SETTINGS: 'shopease_settings_v1'
};

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
    const testKey = '__shopease_test__';
    window.localStorage.setItem(testKey, testKey);
    window.localStorage.removeItem(testKey);
    return true;
  } catch (e) {
    console.warn('ShopEase: LocalStorage is not accessible, using memory fallback.', e);
    return false;
  }
}

const hasLocalStorage = isLocalStorageAvailable();

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
    if (!inventory || !Array.isArray(inventory) || inventory.length !== INITIAL_PRODUCTS.length) {
      inventory = JSON.parse(JSON.stringify(INITIAL_PRODUCTS));
      setItem(STORAGE_KEYS.INVENTORY, inventory);
    }
    return inventory;
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
      window.dispatchEvent(new CustomEvent('shopease:inventory-updated', { detail: { productId, newStock: product.stock } }));
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
    window.dispatchEvent(new CustomEvent('shopease:cart-updated', { detail: { cart } }));
  },

  clearCart() {
    setItem(STORAGE_KEYS.CART, []);
    window.dispatchEvent(new CustomEvent('shopease:cart-updated', { detail: { cart: [] } }));
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
    window.dispatchEvent(new CustomEvent('shopease:orders-updated', { detail: { orders } }));
    return order;
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
    window.dispatchEvent(new CustomEvent('shopease:wishlist-updated', { detail: { wishlist: list, productId, added: !exists } }));
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
    window.dispatchEvent(new CustomEvent('shopease:settings-updated', { detail: { settings: updated } }));
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
    window.dispatchEvent(new CustomEvent('shopease:store-reset'));
  }
};

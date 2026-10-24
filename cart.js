/**
 * ShopEase Shopping Cart Logic
 * Manages adding, removing, updating quantities, stock constraint checking,
 * discounts, delivery fees, and order calculations.
 */

import { Storage } from './storage.js';

export const PROMO_CODES = {
  'SAVE10': { type: 'percent', value: 0.10, description: '10% off entire basket' },
  'WELCOME20': { type: 'percent', value: 0.20, description: '20% Welcome discount' },
  'FREESHIP': { type: 'shipping', value: 0, description: 'Free Express Shipping' }
};

export const DELIVERY_THRESHOLD = 350.00;
export const STANDARD_DELIVERY_FEE = 500.00;

let activePromoCode = null;

export const Cart = {
  getCart() {
    return Storage.getCart();
  },

  getItemCount() {
    return this.getSummary().totalItems;
  },

  getActivePromo() {
    return activePromoCode;
  },

  setPromo(code) {
    if (!code) {
      activePromoCode = null;
      return { success: true, message: 'Promo code removed' };
    }
    const cleanCode = code.trim().toUpperCase();
    if (PROMO_CODES[cleanCode]) {
      activePromoCode = cleanCode;
      return {
        success: true,
        promo: PROMO_CODES[cleanCode],
        message: `Promo code "${cleanCode}" applied: ${PROMO_CODES[cleanCode].description}`
      };
    }
    return {
      success: false,
      message: `Invalid promo code "${code}". Try "SAVE10", "WELCOME20", or "FREESHIP".`
    };
  },

  clearPromo() {
    activePromoCode = null;
  },

  /**
   * Adds product to cart with strict stock availability check.
   */
  addItem(productId, quantity = 1) {
    const product = Storage.getProductById(productId);
    if (!product) {
      return { success: false, message: 'Product not found.' };
    }

    if (product.stock <= 0) {
      return { success: false, message: `Sorry, "${product.name}" is currently out of stock.` };
    }

    const cart = Storage.getCart();
    const existingIndex = cart.findIndex(item => item.productId === productId);
    const currentQtyInCart = existingIndex > -1 ? cart[existingIndex].quantity : 0;
    const requestedTotal = currentQtyInCart + quantity;

    if (requestedTotal > product.stock) {
      const allowedAdd = Math.max(0, product.stock - currentQtyInCart);
      return {
        success: false,
        message: allowedAdd > 0
          ? `Only ${product.stock} in stock (${currentQtyInCart} already in your basket). You can add at most ${allowedAdd} more.`
          : `Maximum stock limit reached (${product.stock} already in your basket).`
      };
    }

    if (existingIndex > -1) {
      cart[existingIndex].quantity = requestedTotal;
    } else {
      cart.push({
        productId,
        quantity: requestedTotal,
        addedAt: new Date().toISOString()
      });
    }

    Storage.saveCart(cart);
    return {
      success: true,
      message: `Added ${quantity} × "${product.name}" to your basket!`,
      product,
      cart
    };
  },

  /**
   * Updates quantity of an item in the cart
   */
  updateQuantity(productId, newQty) {
    const product = Storage.getProductById(productId);
    if (!product) return { success: false, message: 'Product not found.' };

    const cart = Storage.getCart();
    const index = cart.findIndex(item => item.productId === productId);

    if (index === -1) {
      return { success: false, message: 'Item not in basket.' };
    }

    if (newQty <= 0) {
      return this.removeItem(productId);
    }

    if (newQty > product.stock) {
      return {
        success: false,
        message: `Only ${product.stock} available in stock.`
      };
    }

    cart[index].quantity = newQty;
    Storage.saveCart(cart);
    return {
      success: true,
      message: `Updated quantity for "${product.name}" to ${newQty}.`,
      cart
    };
  },

  /**
   * Removes item from cart
   */
  removeItem(productId) {
    const product = Storage.getProductById(productId);
    let cart = Storage.getCart();
    const exists = cart.some(item => item.productId === productId);

    if (!exists) return { success: false, message: 'Item not found in basket.' };

    cart = cart.filter(item => item.productId !== productId);
    Storage.saveCart(cart);

    return {
      success: true,
      message: product ? `Removed "${product.name}" from your basket.` : 'Item removed.',
      cart
    };
  },

  /**
   * Clears the entire cart
   */
  clear() {
    Storage.clearCart();
    this.clearPromo();
    return { success: true, message: 'Your basket is now empty.' };
  },

  /**
   * Computes full cart items with product details and financial summary
   */
  getSummary() {
    const rawCart = Storage.getCart();
    const products = Storage.getProducts();

    const items = [];
    let subtotal = 0;
    let totalItems = 0;

    for (const item of rawCart) {
      const product = products.find(p => p.id === item.productId);
      if (product) {
        const itemTotal = Number((product.price * item.quantity).toFixed(2));
        subtotal += itemTotal;
        totalItems += item.quantity;
        items.push({
          productId: product.id,
          name: product.name,
          category: product.category,
          price: product.price,
          unit: product.unit,
          stock: product.stock,
          image: product.image,
          quantity: item.quantity,
          totalPrice: itemTotal,
          isLowStock: product.stock <= 3
        });
      }
    }

    subtotal = Number(subtotal.toFixed(2));

    // Calculate delivery fee
    let deliveryFee = 0;
    if (items.length > 0) {
      if (activePromoCode === 'FREESHIP' || subtotal >= DELIVERY_THRESHOLD) {
        deliveryFee = 0;
      } else {
        deliveryFee = STANDARD_DELIVERY_FEE;
      }
    }

    // Calculate discount
    let discount = 0;
    if (activePromoCode && PROMO_CODES[activePromoCode]) {
      const promo = PROMO_CODES[activePromoCode];
      if (promo.type === 'percent') {
        discount = Number((subtotal * promo.value).toFixed(2));
      }
    }

    const freeShippingRemaining = Math.max(0, Number((DELIVERY_THRESHOLD - subtotal).toFixed(2)));
    const grandTotal = Number(Math.max(0, subtotal - discount + deliveryFee).toFixed(2));
    const estimatedTax = Number((grandTotal * (0.20 / 1.20)).toFixed(2)); // Standard 20% VAT breakdown

    return {
      items,
      totalItems,
      subtotal,
      deliveryFee,
      discount,
      activePromoCode,
      promoDetails: activePromoCode ? PROMO_CODES[activePromoCode] : null,
      freeShippingRemaining,
      estimatedTax,
      grandTotal,
      isFreeDelivery: deliveryFee === 0 && items.length > 0
    };
  }
};

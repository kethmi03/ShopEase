/**
 * ShopEase Mock Checkout & Payment Process
 * Manages customer information, mock payment verification,
 * inventory deduction, order persistence to localStorage, and confirmation display.
 */

import { Storage } from './storage.js';
import { Cart } from './cart.js';

export const DEMO_USER = {
  fullName: 'Sarah Jenkins',
  email: 'sarah.jenkins@example.co.uk',
  phone: '07700 900123',
  address: '42 Highfield Terrace',
  city: 'Manchester',
  postcode: 'M14 6XX',
  cardNumber: '4532 •••• •••• 8892',
  cardHolder: 'SARAH JENKINS',
  cardExpiry: '08/28',
  cardCvv: '394'
};

export const Checkout = {
  currentStep: 1, // 1: Delivery Details, 2: Payment Method, 3: Order Confirmation

  /**
   * Validates Customer Delivery Details Form
   */
  validateDeliveryForm(data) {
    const errors = {};
    if (!data.fullName || data.fullName.trim().length < 3) {
      errors.fullName = 'Please enter your full name (minimum 3 letters).';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!data.email || !emailRegex.test(data.email)) {
      errors.email = 'Please provide a valid email address.';
    }
    if (!data.phone || data.phone.trim().length < 8) {
      errors.phone = 'Please enter a valid contact phone number.';
    }
    if (!data.address || data.address.trim().length < 5) {
      errors.address = 'Please enter a valid street address.';
    }
    if (!data.city || data.city.trim().length < 2) {
      errors.city = 'Please enter your city/town.';
    }
    if (!data.postcode || data.postcode.trim().length < 3) {
      errors.postcode = 'Please enter your postal code.';
    }
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  },

  /**
   * Validates Payment Form (Mock Card Details)
   */
  validatePaymentForm(data) {
    const errors = {};
    const cleanCard = (data.cardNumber || '').replace(/[\s-]/g, '');
    if (!cleanCard || cleanCard.length < 13 || cleanCard.length > 19) {
      errors.cardNumber = 'Please enter a valid 16-digit mock card number.';
    }
    if (!data.cardHolder || data.cardHolder.trim().length < 3) {
      errors.cardHolder = 'Please enter the cardholder name as displayed.';
    }
    const expiryRegex = /^(0[1-9]|1[0-2])\/([0-9]{2})$/;
    if (!data.cardExpiry || !expiryRegex.test(data.cardExpiry)) {
      errors.cardExpiry = 'Enter expiry in MM/YY format.';
    }
    const cvvRegex = /^[0-9]{3,4}$/;
    if (!data.cardCvv || !cvvRegex.test(data.cardCvv)) {
      errors.cardCvv = 'Enter a 3 or 4 digit CVV security code.';
    }
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  },

  /**
   * Places the order:
   * 1. Re-verifies stock availability for each cart item
   * 2. Deducts stock from storage
   * 3. Creates and records the order in localStorage
   * 4. Clears the cart
   */
  async processMockOrder(orderData) {
    const cartSummary = Cart.getSummary();
    if (cartSummary.items.length === 0) {
      return { success: false, message: 'Your cart is empty. Cannot process order.' };
    }

    // Verify stock availability
    for (const item of cartSummary.items) {
      const currentProduct = Storage.getProductById(item.productId);
      if (!currentProduct || currentProduct.stock < item.quantity) {
        return {
          success: false,
          message: `Stock changed: "${item.name}" only has ${currentProduct ? currentProduct.stock : 0} items remaining.`
        };
      }
    }

    // Deduct stock in persistent storage
    for (const item of cartSummary.items) {
      Storage.deductStock(item.productId, item.quantity);
    }

    // Generate Order Record
    const orderId = 'SE-' + Math.floor(100000 + Math.random() * 900000);
    const orderRecord = {
      orderId,
      createdAt: new Date().toISOString(),
      formattedDate: new Intl.DateTimeFormat('en-GB', {
        dateStyle: 'full',
        timeStyle: 'short'
      }).format(new Date()),
      customer: {
        fullName: orderData.fullName,
        email: orderData.email,
        phone: orderData.phone,
        address: `${orderData.address}, ${orderData.city}, ${orderData.postcode}`
      },
      payment: {
        method: orderData.paymentMethod || 'Credit/Debit Card (Mock)',
        last4: (orderData.cardNumber || '8892').slice(-4),
        cardHolder: orderData.cardHolder || 'Sarah Jenkins'
      },
      items: cartSummary.items.map(item => ({
        productId: item.productId,
        name: item.name,
        category: item.category,
        price: item.price,
        quantity: item.quantity,
        totalPrice: item.totalPrice,
        image: item.image
      })),
      financials: {
        subtotal: cartSummary.subtotal,
        deliveryFee: cartSummary.deliveryFee,
        discount: cartSummary.discount,
        promoCode: cartSummary.activePromoCode,
        tax: cartSummary.estimatedTax,
        grandTotal: cartSummary.grandTotal
      },
      status: 'Pending'
    };

    // Save order in localStorage
    Storage.saveOrder(orderRecord);

    // Empty Cart
    Cart.clear();

    return {
      success: true,
      order: orderRecord,
      message: `Thank you! Order #${orderId} was placed successfully.`
    };
  }
};

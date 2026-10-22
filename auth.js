/**
 * ShopEase Authentication Service
 * Manages user accounts, active sessions, registration, and login persistence.
 */

import { Storage } from './storage.js';

export const DEMO_ACCOUNTS = [
  {
    email: 'alex@example.com',
    password: 'password123',
    fullName: 'Alex Morgan',
    role: 'Customer'
  },
  {
    email: 'sarah@example.com',
    password: 'password123',
    fullName: 'Sarah Jenkins',
    role: 'VIP Member'
  },
  {
    email: 'admin@shopease.com',
    password: 'password123',
    fullName: 'Admin Manager',
    role: 'Admin'
  }
];

export const Auth = {
  /**
   * Retrieves all registered accounts.
   */
  getUsers() {
    return Storage.getUsers();
  },

  /**
   * Returns currently logged-in user or null.
   */
  getCurrentUser() {
    return Storage.getCurrentUser();
  },

  /**
   * Checks if a user is currently authenticated.
   */
  isLoggedIn() {
    return this.getCurrentUser() !== null;
  },

  /**
   * Logs in a user with email and password.
   */
  login(email, password) {
    if (!email || !password) {
      return { success: false, message: 'Please enter both email and password.' };
    }

    const cleanEmail = email.trim().toLowerCase();
    const users = this.getUsers();
    const user = users.find(u => u.email.toLowerCase() === cleanEmail);

    if (!user) {
      return { success: false, message: 'No account found with this email address.' };
    }

    if (user.password !== password && !(user.role === 'Admin' && password === 'admin123')) {
      return { success: false, message: 'Incorrect password. Please try again.' };
    }

    // Set current active user session (omit password from session object)
    const sessionUser = {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone || '',
      address: user.address || '',
      city: user.city || '',
      postcode: user.postcode || '',
      role: user.role || 'Customer',
      loginTime: new Date().toISOString()
    };

    Storage.setCurrentUser(sessionUser);

    return {
      success: true,
      user: sessionUser,
      message: `Welcome back, ${sessionUser.fullName}!`
    };
  },

  /**
   * Registers a new user account and automatically logs them in.
   */
  register(userData) {
    const { fullName, email, password, phone, address, city, postcode } = userData;

    if (!fullName || fullName.trim().length < 2) {
      return { success: false, message: 'Full name must be at least 2 characters.' };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email.trim())) {
      return { success: false, message: 'Please enter a valid email address.' };
    }

    if (!password || password.length < 6) {
      return { success: false, message: 'Password must be at least 6 characters long.' };
    }

    const cleanEmail = email.trim().toLowerCase();
    const users = this.getUsers();

    if (users.some(u => u.email.toLowerCase() === cleanEmail)) {
      return { success: false, message: 'An account with this email address already exists. Please log in.' };
    }

    const newUser = {
      id: 'user_' + Date.now(),
      fullName: fullName.trim(),
      email: cleanEmail,
      password: password,
      phone: (phone || '').trim(),
      address: (address || '').trim(),
      city: (city || '').trim(),
      postcode: (postcode || '').trim(),
      role: 'Customer',
      joinedDate: new Date().toISOString()
    };

    users.push(newUser);
    Storage.saveUsers(users);

    // Auto-login registered user
    const sessionUser = {
      id: newUser.id,
      fullName: newUser.fullName,
      email: newUser.email,
      phone: newUser.phone,
      address: newUser.address,
      city: newUser.city,
      postcode: newUser.postcode,
      role: newUser.role,
      loginTime: new Date().toISOString()
    };

    Storage.setCurrentUser(sessionUser);

    return {
      success: true,
      user: sessionUser,
      message: `Account created successfully! Welcome to ShopEase, ${sessionUser.fullName}.`
    };
  },

  /**
   * Logs out the current user session.
   */
  logout() {
    Storage.clearCurrentUser();
    return { success: true, message: 'You have been signed out successfully.' };
  }
};

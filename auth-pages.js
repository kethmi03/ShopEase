/**
 * ShopEase Authentication Pages Controller
 * Controls login.html and register.html behavior, form validations,
 * accessibility preferences, demo fast-logins, and redirects.
 */

import { Storage } from './storage.js';
import { Auth, DEMO_ACCOUNTS } from './auth.js';

/**
 * Universal Design Preferences (Theme & Font Size)
 */
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

function initAuthPage() {
  initAccessibilityPreferences();
  initPasswordToggles();

  const isLoginPage = document.getElementById('login-form') !== null;
  const isRegisterPage = document.getElementById('register-form') !== null;

  if (isLoginPage) {
    initLoginForm();
    initDemoLogins();
  }

  if (isRegisterPage) {
    initRegisterForm();
    initRegisterDemoFill();
  }
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAuthPage);
  } else {
    initAuthPage();
  }
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

function initAccessibilityPreferences() {
  const settings = Storage.getSettings();
  applyTheme(settings.theme || 'light');
  document.documentElement.setAttribute('data-font-size', settings.fontSize || 'normal');

  const themeToggleBtn = document.getElementById('theme-toggle-btn');
  themeToggleBtn?.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const nextIdx = (THEMES.indexOf(currentTheme) + 1) % THEMES.length;
    const nextTheme = THEMES[nextIdx];
    applyTheme(nextTheme);
    announceToScreenReader(`Theme switched to ${THEME_NAMES[nextTheme]} mode.`);
  });
}

function applyFontSize(size) {
  document.documentElement.setAttribute('data-font-size', size);
}

/**
 * Toggle Show / Hide Password
 */
const EYE_OPEN_SVG = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
const EYE_OFF_SVG = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`;

function initPasswordToggles() {
  const toggleButtons = document.querySelectorAll('.password-toggle-btn');
  toggleButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      const input = document.getElementById(targetId);
      if (!input) return;

      const isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';
      btn.innerHTML = isPassword ? EYE_OFF_SVG : EYE_OPEN_SVG;
      btn.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
      announceToScreenReader(isPassword ? 'Password is now shown.' : 'Password is now hidden.');
    });
  });
}

/**
 * Login Page Controller
 */
function initLoginForm() {
  const form = document.getElementById('login-form');
  const emailInput = document.getElementById('login-email');
  const passwordInput = document.getElementById('login-password');
  const errorContainer = document.getElementById('login-error-message');
  const submitBtn = document.getElementById('login-submit-btn');

  // Check if user is already logged in
  const currentUser = Auth.getCurrentUser();
  if (currentUser) {
    showAlreadyLoggedInBanner(currentUser);
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    clearErrors();

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    let hasError = false;
    if (!email) {
      showFieldError('login-email', 'Please enter your email address.');
      hasError = true;
    }
    if (!password) {
      showFieldError('login-password', 'Please enter your password.');
      hasError = true;
    }

    if (hasError) return;

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>⏳ Signing in...</span>';

    setTimeout(() => {
      const result = Auth.login(email, password);

      if (result.success) {
        showToast(result.message, 'success');
        announceToScreenReader(result.message);

        const successContainer = document.getElementById('login-success-message');
        if (successContainer) {
          successContainer.innerHTML = `<strong>✅ ${escapeHtml(result.message)}</strong><div style="font-size:0.8rem; margin-top:0.25rem;">Entering your dashboard...</div>`;
          successContainer.style.display = 'block';
        }

        const emailLower = (result.user?.email || '').toLowerCase();
        const isAdmin = result.user?.role === 'Admin' || emailLower === 'admin@gmail.com' || emailLower === 'admin@shopease.com' || emailLower.includes('admin');
        submitBtn.innerHTML = isAdmin 
          ? '<span>🛡️ Successfully Signed In! Entering Admin Console...</span>' 
          : '<span>✅ Successfully Signed In! Entering Customer Dashboard...</span>';

        // Redirect after clear visual confirmation
        setTimeout(() => {
          redirectAfterAuth();
        }, 550);
      } else {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>Sign In</span> <span>→</span>';
        if (errorContainer) {
          errorContainer.textContent = result.message;
          errorContainer.style.display = 'block';
        }
        announceToScreenReader(`Login failed: ${result.message}`);
      }
    }, 350);
  });
}

/**
 * 1-Click Fast Demo Login Buttons
 */
function initDemoLogins() {
  const demoButtons = document.querySelectorAll('[data-demo-email]');
  const emailInput = document.getElementById('login-email');
  const passwordInput = document.getElementById('login-password');
  const form = document.getElementById('login-form');

  demoButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const email = btn.getAttribute('data-demo-email');
      const password = btn.getAttribute('data-demo-pass');

      if (emailInput && passwordInput) {
        emailInput.value = email;
        passwordInput.value = password;
        announceToScreenReader(`Demo credentials for ${email} loaded.`);
        
        // Visual pulse feedback
        btn.style.transform = 'scale(0.97)';
        setTimeout(() => {
          btn.style.transform = '';
          form.dispatchEvent(new Event('submit'));
        }, 150);
      }
    });
  });
}

/**
 * Register Page Controller
 */
function initRegisterForm() {
  const form = document.getElementById('register-form');
  const nameInput = document.getElementById('reg-name');
  const emailInput = document.getElementById('reg-email');
  const phoneInput = document.getElementById('reg-phone');
  const addressInput = document.getElementById('reg-address');
  const cityInput = document.getElementById('reg-city');
  const postcodeInput = document.getElementById('reg-postcode');
  const passwordInput = document.getElementById('reg-password');
  const confirmPasswordInput = document.getElementById('reg-confirm-password');
  const termsCheckbox = document.getElementById('reg-terms');
  const submitBtn = document.getElementById('register-submit-btn');
  const errorContainer = document.getElementById('register-error-message');

  // Password strength meter
  if (passwordInput) {
    passwordInput.addEventListener('input', () => {
      updatePasswordStrength(passwordInput.value);
    });
  }

  // Live matching check
  if (confirmPasswordInput) {
    confirmPasswordInput.addEventListener('input', () => {
      validatePasswordMatch();
    });
  }

  // Role selection visual card feedback
  const roleRadios = form.querySelectorAll('input[name="accountRole"]');
  const customerCard = document.getElementById('role-customer-card');
  const adminCard = document.getElementById('role-admin-card');

  roleRadios.forEach(radio => {
    radio.addEventListener('change', () => {
      if (radio.value === 'Admin') {
        if (adminCard) {
          adminCard.style.borderColor = 'var(--color-brand-primary)';
          adminCard.style.borderWidth = '2px';
        }
        if (customerCard) {
          customerCard.style.borderColor = 'var(--color-border)';
          customerCard.style.borderWidth = '1px';
        }
      } else {
        if (customerCard) {
          customerCard.style.borderColor = 'var(--color-brand-primary)';
          customerCard.style.borderWidth = '2px';
        }
        if (adminCard) {
          adminCard.style.borderColor = 'var(--color-border)';
          adminCard.style.borderWidth = '1px';
        }
      }
    });
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    clearErrors();

    const fullName = nameInput.value.trim();
    const email = emailInput.value.trim();
    const phone = phoneInput ? phoneInput.value.trim() : '';
    const address = addressInput ? addressInput.value.trim() : '';
    const city = cityInput ? cityInput.value.trim() : '';
    const postcode = postcodeInput ? postcodeInput.value.trim() : '';
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    let hasError = false;

    if (!fullName || fullName.length < 2) {
      showFieldError('reg-name', 'Please enter your full name (minimum 2 characters).');
      hasError = true;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      showFieldError('reg-email', 'Please provide a valid email address.');
      hasError = true;
    }

    if (!password) {
      showFieldError('reg-password', 'Please enter a password.');
      hasError = true;
    }

    if (password !== confirmPassword) {
      showFieldError('reg-confirm-password', 'Passwords do not match.');
      hasError = true;
    }

    if (termsCheckbox && !termsCheckbox.checked) {
      showFieldError('reg-terms', 'Please accept the mock terms and conditions to proceed.');
      hasError = true;
    }

    const roleInput = form.querySelector('input[name="accountRole"]:checked') || form.querySelector('input[name="accountRole"]');
    const role = roleInput ? roleInput.value : 'Customer';

    if (hasError) return;

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>⏳ Creating Account...</span>';

    setTimeout(() => {
      const result = Auth.register({
        fullName,
        email,
        password,
        phone,
        address,
        city,
        postcode,
        role
      });

      if (result.success) {
        showToast(result.message, 'success');
        announceToScreenReader(result.message);

        const successContainer = document.getElementById('register-success-message');
        if (successContainer) {
          successContainer.innerHTML = `<strong>✅ ${escapeHtml(result.message)}</strong><div style="font-size:0.8rem; margin-top:0.25rem;">Redirecting to your dashboard...</div>`;
          successContainer.style.display = 'block';
        }

        const emailLower = (result.user?.email || '').toLowerCase();
        const isAdmin = result.user?.role === 'Admin' || emailLower === 'admin@gmail.com' || emailLower === 'admin@shopease.com' || emailLower.includes('admin');
        submitBtn.innerHTML = isAdmin 
          ? '<span>🛡️ Successfully Registered! Entering Admin Console...</span>' 
          : '<span>✅ Successfully Registered! Entering Customer Dashboard...</span>';

        setTimeout(() => {
          redirectAfterAuth();
        }, 600);
      } else {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>Create Account & Sign In</span> <span>→</span>';
        if (errorContainer) {
          errorContainer.textContent = result.message;
          errorContainer.style.display = 'block';
        }
        announceToScreenReader(`Registration failed: ${result.message}`);
      }
    }, 400);
  });
}

function updatePasswordStrength(val) {
  const strengthFill = document.getElementById('password-strength-fill');
  const strengthText = document.getElementById('password-strength-text');
  if (!strengthFill || !strengthText) return;

  if (!val) {
    strengthFill.className = 'password-strength-fill';
    strengthText.textContent = 'Minimum 6 characters';
    return;
  }

  let score = 0;
  if (val.length >= 6) score++;
  if (val.length >= 10) score++;
  if (/[0-9]/.test(val) && /[a-zA-Z]/.test(val)) score++;
  if (/[^A-Za-z0-9]/.test(val)) score++;

  if (score <= 1) {
    strengthFill.className = 'password-strength-fill weak';
    strengthText.textContent = 'Weak password';
    strengthText.style.color = 'var(--color-danger)';
  } else if (score === 2) {
    strengthFill.className = 'password-strength-fill medium';
    strengthText.textContent = 'Good password';
    strengthText.style.color = 'var(--color-warning)';
  } else {
    strengthFill.className = 'password-strength-fill strong';
    strengthText.textContent = 'Strong password';
    strengthText.style.color = 'var(--color-success)';
  }
}

function validatePasswordMatch() {
  const pass = document.getElementById('reg-password')?.value;
  const confirm = document.getElementById('reg-confirm-password')?.value;
  const matchNotice = document.getElementById('password-match-notice');
  if (!matchNotice) return;

  if (!confirm) {
    matchNotice.textContent = '';
    return;
  }

  if (pass === confirm) {
    matchNotice.textContent = '✓ Passwords match';
    matchNotice.style.color = 'var(--color-success)';
  } else {
    matchNotice.textContent = '✕ Passwords do not match';
    matchNotice.style.color = 'var(--color-danger)';
  }
}

/**
 * 1-Click Fast Fill for Register Page
 */
function initRegisterDemoFill() {
  function fillData(role = 'Customer') {
    const randomId = Math.floor(100 + Math.random() * 900);
    const isAdmin = role === 'Admin';
    const demo = {
      name: isAdmin ? `Admin Manager ${randomId}` : `Jordan Parker ${randomId}`,
      email: isAdmin ? `admin${randomId}@shopease.com` : `jordan${randomId}@example.co.uk`,
      phone: '07456 789012',
      address: '15 Victoria Crescent',
      city: 'Bristol',
      postcode: 'BS1 5AH',
      pass: 'securePass2026!'
    };

    const nameInput = document.getElementById('reg-name');
    const emailInput = document.getElementById('reg-email');
    const phoneInput = document.getElementById('reg-phone');
    const addressInput = document.getElementById('reg-address');
    const cityInput = document.getElementById('reg-city');
    const postcodeInput = document.getElementById('reg-postcode');
    const passwordInput = document.getElementById('reg-password');
    const confirmInput = document.getElementById('reg-confirm-password');
    const terms = document.getElementById('reg-terms');

    if (nameInput) nameInput.value = demo.name;
    if (emailInput) emailInput.value = demo.email;
    if (phoneInput) phoneInput.value = demo.phone;
    if (addressInput) addressInput.value = demo.address;
    if (cityInput) cityInput.value = demo.city;
    if (postcodeInput) postcodeInput.value = demo.postcode;
    if (passwordInput) {
      passwordInput.value = demo.pass;
      updatePasswordStrength(demo.pass);
    }
    if (confirmInput) {
      confirmInput.value = demo.pass;
      validatePasswordMatch();
    }
    if (terms) terms.checked = true;

    // Set role radio
    const radioToSelect = document.getElementById(isAdmin ? 'role-admin' : 'role-customer');
    if (radioToSelect) {
      radioToSelect.checked = true;
      radioToSelect.dispatchEvent(new Event('change'));
    }

    clearErrors();
    showToast(`Sample ${role} details filled!`, 'info');
    announceToScreenReader(`Sample ${role} details automatically filled.`);
  }

  document.getElementById('btn-fill-register-demo')?.addEventListener('click', () => fillData('Customer'));
  document.getElementById('btn-fill-register-customer')?.addEventListener('click', () => fillData('Customer'));
  document.getElementById('btn-fill-register-admin')?.addEventListener('click', () => fillData('Admin'));
}

function showAlreadyLoggedInBanner(user) {
  const container = document.getElementById('already-logged-in-banner');
  if (!container) return;

  const isAdmin = user.role === 'Admin';
  const targetHref = isAdmin ? 'admin-dashboard.html' : 'customer-dashboard.html';
  const targetLabel = isAdmin ? '🛡️ Go to Admin Dashboard' : '👤 Go to Customer Dashboard';

  container.innerHTML = `
    <div style="background-color:var(--color-surface); border:1px solid var(--color-border); border-left:4px solid var(--color-brand-primary); border-radius:var(--radius-md); padding:1rem; margin-bottom:1.5rem; display:flex; align-items:center; justify-content:space-between; gap:1rem; flex-wrap:wrap; box-shadow:var(--shadow-sm);">
      <div>
        <div style="font-weight:700; color:var(--color-text-primary); font-size:0.95rem;">
          👋 You are currently signed in as <strong>${escapeHtml(user.fullName)}</strong> (${escapeHtml(user.role || 'Customer')})
        </div>
        <div style="font-size:0.8rem; color:var(--color-text-muted);">
          ${escapeHtml(user.email)}
        </div>
      </div>
      <div style="display:flex; gap:0.5rem; flex-wrap:wrap;">
        <a href="${targetHref}" class="btn btn-primary" style="font-size:0.85rem; padding:0.4rem 0.85rem;">${targetLabel} →</a>
        <a href="index.html" class="btn btn-secondary" style="font-size:0.85rem; padding:0.4rem 0.85rem;">Storefront</a>
        <button type="button" id="btn-banner-logout" class="btn btn-secondary" style="font-size:0.85rem; padding:0.4rem 0.85rem;">Sign Out</button>
      </div>
    </div>
  `;
  container.style.display = 'block';

  document.getElementById('btn-banner-logout')?.addEventListener('click', () => {
    Auth.logout();
    container.style.display = 'none';
    showToast('Signed out successfully.', 'info');
  });
}

function showFieldError(inputId, message) {
  const input = document.getElementById(inputId);
  if (input) {
    input.classList.add('has-error');
  }
  const errSpan = document.getElementById(`error-${inputId}`);
  if (errSpan) {
    errSpan.textContent = message;
    errSpan.classList.add('visible');
  }
}

function clearErrors() {
  document.querySelectorAll('.form-input').forEach(i => i.classList.remove('has-error'));
  document.querySelectorAll('.field-error').forEach(e => {
    e.textContent = '';
    e.classList.remove('visible');
  });
  const loginErr = document.getElementById('login-error-message');
  if (loginErr) loginErr.style.display = 'none';
  const regErr = document.getElementById('register-error-message');
  if (regErr) regErr.style.display = 'none';
  const loginSucc = document.getElementById('login-success-message');
  if (loginSucc) loginSucc.style.display = 'none';
  const regSucc = document.getElementById('register-success-message');
  if (regSucc) regSucc.style.display = 'none';
}

function redirectAfterAuth() {
  const user = Auth.getCurrentUser();
  const emailLower = (user?.email || '').toLowerCase();
  const isAdmin = user && (user.role === 'Admin' || emailLower === 'admin@gmail.com' || emailLower === 'admin@shopease.com' || emailLower.includes('admin'));

  if (isAdmin) {
    window.location.href = 'admin-dashboard.html';
    return;
  }

  const urlParams = new URLSearchParams(window.location.search);
  const redirectTarget = urlParams.get('redirect');
  if (redirectTarget && (redirectTarget === 'index.html' || redirectTarget.startsWith('index.html'))) {
    window.location.href = redirectTarget;
  } else {
    window.location.href = 'customer-dashboard.html';
  }
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

function announceToScreenReader(message) {
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

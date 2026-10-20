/**
 * ShopEase Authentication Pages Controller
 * Controls login.html and register.html behavior, form validations,
 * accessibility preferences, demo fast-logins, and redirects.
 */

import { Storage } from './storage.js';
import { Auth, DEMO_ACCOUNTS } from './auth.js';

document.addEventListener('DOMContentLoaded', () => {
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
});

/**
 * Universal Design Preferences (Theme & Font Size)
 */
function initAccessibilityPreferences() {
  const themeSelect = document.getElementById('theme-select');
  const btnFontNormal = document.getElementById('btn-font-normal');
  const btnFontLarge = document.getElementById('btn-font-large');
  const btnFontXLarge = document.getElementById('btn-font-xlarge');

  const settings = Storage.getSettings();

  // Apply initial theme & font size
  applyTheme(settings.theme || 'light');
  applyFontSize(settings.fontSize || 'normal');

  if (themeSelect) {
    themeSelect.value = settings.theme || 'light';
    themeSelect.addEventListener('change', (e) => {
      const newTheme = e.target.value;
      applyTheme(newTheme);
      Storage.saveSettings({ theme: newTheme });
      announceToScreenReader(`Theme switched to ${newTheme} mode.`);
    });
  }

  const fontBtns = [
    { btn: btnFontNormal, size: 'normal' },
    { btn: btnFontLarge, size: 'large' },
    { btn: btnFontXLarge, size: 'xlarge' }
  ];

  fontBtns.forEach(({ btn, size }) => {
    if (!btn) return;
    btn.addEventListener('click', () => {
      fontBtns.forEach(b => b.btn?.classList.remove('active'));
      btn.classList.add('active');
      applyFontSize(size);
      Storage.saveSettings({ fontSize: size });
      announceToScreenReader(`Font size adjusted to ${size}.`);
    });
  });

  // Highlight active font button
  fontBtns.forEach(({ btn, size }) => {
    if (btn && settings.fontSize === size) {
      btn.classList.add('active');
    }
  });
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
}

function applyFontSize(size) {
  document.documentElement.setAttribute('data-font-size', size);
}

/**
 * Toggle Show / Hide Password
 */
function initPasswordToggles() {
  const toggleButtons = document.querySelectorAll('.password-toggle-btn');
  toggleButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      const input = document.getElementById(targetId);
      if (!input) return;

      const isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';
      btn.textContent = isPassword ? '🙈' : '👁️';
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

        // Redirect after brief pause
        setTimeout(() => {
          redirectAfterAuth();
        }, 600);
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

    if (!password || password.length < 6) {
      showFieldError('reg-password', 'Password must be at least 6 characters.');
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
        postcode
      });

      if (result.success) {
        showToast(result.message, 'success');
        announceToScreenReader(result.message);

        setTimeout(() => {
          redirectAfterAuth();
        }, 700);
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
  const btn = document.getElementById('btn-fill-register-demo');
  if (!btn) return;

  btn.addEventListener('click', () => {
    const randomId = Math.floor(100 + Math.random() * 900);
    const demo = {
      name: `Jordan Parker ${randomId}`,
      email: `jordan${randomId}@example.co.uk`,
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

    clearErrors();
    showToast('Demo registration details filled!', 'info');
    announceToScreenReader('Demo registration details automatically filled.');
  });
}

function showAlreadyLoggedInBanner(user) {
  const container = document.getElementById('already-logged-in-banner');
  if (!container) return;

  container.innerHTML = `
    <div style="background-color:var(--color-info-bg); border:1px solid var(--color-info-border); border-radius:var(--radius-md); padding:1rem; margin-bottom:1.5rem; display:flex; align-items:center; justify-content:space-between; gap:1rem; flex-wrap:wrap;">
      <div>
        <div style="font-weight:700; color:var(--color-text-primary); font-size:0.95rem;">
          👋 You are already logged in as <strong>${escapeHtml(user.fullName)}</strong>
        </div>
        <div style="font-size:0.8rem; color:var(--color-text-muted);">
          ${escapeHtml(user.email)}
        </div>
      </div>
      <div style="display:flex; gap:0.5rem;">
        <a href="index.html" class="btn btn-primary" style="font-size:0.85rem; padding:0.4rem 0.85rem;">Go to Store</a>
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
}

function redirectAfterAuth() {
  const urlParams = new URLSearchParams(window.location.search);
  const redirect = urlParams.get('redirect');

  if (redirect === 'checkout') {
    window.location.href = 'index.html?open=checkout';
  } else if (redirect) {
    window.location.href = redirect;
  } else {
    window.location.href = 'index.html';
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

// toast.js - Toast notification system
class ToastManager {
  constructor() {
    this.container = null;
    this.init();
  }

  init() {
    // Create container if it doesn't exist
    this.container = document.getElementById('toast-container');
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'toast-container';
      this.container.className = 'toast-container';
      document.body.appendChild(this.container);
    }
  }

  show(message, type = 'info', title = null, duration = 5000) {
    const toast = this.createToast(message, type, title);
    this.container.appendChild(toast);

    // Show toast with animation
    setTimeout(() => toast.classList.add('show'), 10);

    // Auto remove
    if (duration > 0) {
      setTimeout(() => this.remove(toast), duration);
    }

    return toast;
  }

  createToast(message, type, title) {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icons = {
      success: '✅',
      error: '❌', 
      warning: '⚠️',
      info: 'ℹ️'
    };

    const titles = {
      success: title || 'Success',
      error: title || 'Error',
      warning: title || 'Warning',
      info: title || 'Info'
    };

    toast.innerHTML = `
      <div class="toast-content">
        <div class="toast-icon">${icons[type] || icons.info}</div>
        <div class="toast-message">
          <div class="toast-title">${titles[type]}</div>
          <div class="toast-text">${message}</div>
        </div>
      </div>
      <button class="toast-close" onclick="toastManager.remove(this.parentElement)">×</button>
    `;

    return toast;
  }

  remove(toast) {
    if (toast && toast.parentElement) {
      toast.classList.remove('show');
      setTimeout(() => {
        if (toast.parentElement) {
          toast.parentElement.removeChild(toast);
        }
      }, 300);
    }
  }

  // Convenience methods
  success(message, title = null, duration = 4000) {
    return this.show(message, 'success', title, duration);
  }

  error(message, title = null, duration = 6000) {
    return this.show(message, 'error', title, duration);
  }

  warning(message, title = null, duration = 5000) {
    return this.show(message, 'warning', title, duration);
  }

  info(message, title = null, duration = 4000) {
    return this.show(message, 'info', title, duration);
  }

  // Specific notifications for the leave system
  leaveRequestSent(type) {
    return this.success(`${type} request sent successfully`, 'Leave Request Sent');
  }

  leaveRequestApproved(id) {
    return this.success(`Request ${id.substring(0,8)}... approved`, 'Leave Request Approved');
  }

  leaveRequestRejected(id, reason = null) {
    const message = reason ? `Request ${id.substring(0,8)}... rejected: ${reason}` : `Request ${id.substring(0,8)}... rejected`;
    return this.error(message, 'Leave Request Rejected');
  }

  loginSuccess(username, role) {
    return this.success(`Welcome ${username}! Role: ${role}`, 'Login Successful');
  }

  logoutSuccess() {
    return this.info('Logout successful', 'Goodbye');
  }

  registrationSuccess(username) {
    return this.success(`User ${username} registered successfully`, 'Registration Complete');
  }

  wifiConfigured(ssid) {
    return this.success(`WiFi "${ssid}" configured correctly`, 'WiFi Configured');
  }

  qrCodeGenerated() {
    return this.info('WiFi QR Code generated successfully', 'QR Code Ready');
  }
}

// Initialize the global toast manager
const toastManager = new ToastManager();

// Global convenience functions
window.showToast = (message, type, title, duration) => toastManager.show(message, type, title, duration);
window.showSuccess = (message, title, duration) => toastManager.success(message, title, duration);
window.showError = (message, title, duration) => toastManager.error(message, title, duration);
window.showWarning = (message, title, duration) => toastManager.warning(message, title, duration);
window.showInfo = (message, title, duration) => toastManager.info(message, title, duration);
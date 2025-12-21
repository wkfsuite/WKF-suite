// toast.js - Sistema di notifiche toast
class ToastManager {
  constructor() {
    this.container = null;
    this.init();
  }

  init() {
    // Crea container se non esiste
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

    // Mostra toast con animazione
    setTimeout(() => toast.classList.add('show'), 10);

    // Auto rimozione
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
      success: title || 'Successo',
      error: title || 'Errore',
      warning: title || 'Attenzione',
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

  // Metodi di convenienza
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

  // Notifiche specifiche per il sistema permessi
  permessoInviato(tipo) {
    return this.success(`Richiesta ${tipo} inviata con successo`, 'Permesso Inviato');
  }

  permessoApprovato(id) {
    return this.success(`Richiesta ${id.substring(0,8)}... approvata`, 'Permesso Approvato');
  }

  permessoRifiutato(id, motivo = null) {
    const message = motivo ? `Richiesta ${id.substring(0,8)}... rifiutata: ${motivo}` : `Richiesta ${id.substring(0,8)}... rifiutata`;
    return this.error(message, 'Permesso Rifiutato');
  }

  loginSuccess(username, ruolo) {
    return this.success(`Benvenuto ${username}! Ruolo: ${ruolo}`, 'Login Effettuato');
  }

  logoutSuccess() {
    return this.info('Logout effettuato con successo', 'Arrivederci');
  }

  registrationSuccess(username) {
    return this.success(`Utente ${username} registrato con successo`, 'Registrazione Completata');
  }

  wifiConfigured(ssid) {
    return this.success(`WiFi "${ssid}" configurato correttamente`, 'WiFi Configurato');
  }

  qrCodeGenerated() {
    return this.info('QR Code WiFi generato con successo', 'QR Code Pronto');
  }
}

// Inizializza il toast manager globale
const toastManager = new ToastManager();

// Funzioni di convenienza globali
window.showToast = (message, type, title, duration) => toastManager.show(message, type, title, duration);
window.showSuccess = (message, title, duration) => toastManager.success(message, title, duration);
window.showError = (message, title, duration) => toastManager.error(message, title, duration);
window.showWarning = (message, title, duration) => toastManager.warning(message, title, duration);
window.showInfo = (message, title, duration) => toastManager.info(message, title, duration);
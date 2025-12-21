// notifications.js - Sistema di notifiche real-time

class NotificationManager {
  constructor() {
    this.lastCheck = localStorage.getItem('lastNotificationCheck') || new Date(0).toISOString();
    this.pollingInterval = 15000; // 15 secondi
    this.intervalId = null;
    this.isRunning = false;
  }

  // Avvia il polling delle notifiche
  start() {
    if (this.isRunning) return;

    console.log('🔔 Avvio sistema notifiche');
    this.isRunning = true;

    // Check immediato
    this.checkNotifications();

    // Polling periodico
    this.intervalId = setInterval(() => {
      this.checkNotifications();
    }, this.pollingInterval);
  }

  // Ferma il polling
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('🔕 Sistema notifiche fermato');
  }

  // Controlla nuove notifiche
  async checkNotifications() {
    try {
      const response = await fetch(`/api/notifications?lastCheck=${encodeURIComponent(this.lastCheck)}`);

      if (!response.ok) {
        if (response.status === 401) {
          // Sessione scaduta, ferma le notifiche
          this.stop();
          return;
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      // Aggiorna timestamp ultimo check
      if (data.lastCheck) {
        this.lastCheck = data.lastCheck;
        localStorage.setItem('lastNotificationCheck', this.lastCheck);
      }

      // Mostra le notifiche
      if (data.notifications && data.notifications.length > 0) {
        console.log(`📬 Ricevute ${data.notifications.length} nuove notifiche`);

        data.notifications.forEach(notification => {
          this.showNotification(notification);
        });
      }

    } catch (error) {
      console.error('❌ Errore controllo notifiche:', error);
    }
  }

  // Mostra una notifica toast
  showNotification(notification) {
    if (!window.toastManager) {
      console.warn('⚠️ Toast manager non disponibile');
      return;
    }

    const { type, title, message } = notification;

    switch (type) {
      case 'new_request':
        toastManager.info(message, title, 8000);
        // Suono opzionale (se supportato)
        this.playNotificationSound();
        break;

      case 'approved':
        toastManager.success(message, title, 10000);
        this.playNotificationSound();
        break;

      case 'rejected':
        toastManager.error(message, title, 12000);
        this.playNotificationSound();
        break;

      default:
        toastManager.info(message, title || 'Notifica', 6000);
    }
  }

  // Suono notifica (opzionale)
  playNotificationSound() {
    try {
      // Usa l'API Web Audio se disponibile
      if ('AudioContext' in window || 'webkitAudioContext' in window) {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);

        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.2);
      }
    } catch (error) {
      // Ignora errori audio
    }
  }

  // Reset timestamp (per testing)
  reset() {
    this.lastCheck = new Date(0).toISOString();
    localStorage.removeItem('lastNotificationCheck');
    console.log('🔄 Reset timestamp notifiche');
  }
}

// Inizializzazione globale
let notificationManager = null;

// Funzioni di convenienza globali
window.startNotifications = () => {
  if (!notificationManager) {
    notificationManager = new NotificationManager();
  }
  notificationManager.start();
};

window.stopNotifications = () => {
  if (notificationManager) {
    notificationManager.stop();
  }
};

window.resetNotifications = () => {
  if (notificationManager) {
    notificationManager.reset();
  }
};

// Auto-start se siamo in una dashboard
document.addEventListener('DOMContentLoaded', () => {
  // Avvia solo se siamo in una pagina dashboard
  const isDashboard = window.location.pathname.includes('dashboard') ||
                     document.body.classList.contains('dashboard-page') ||
                     document.getElementById('usernameDisplay');

  if (isDashboard && !notificationManager) {
    console.log('📱 Dashboard rilevata, avvio notifiche automatico');
    setTimeout(() => {
      window.startNotifications();
    }, 2000); // Delay per permettere il caricamento completo
  }
});

// Cleanup al cambio pagina
window.addEventListener('beforeunload', () => {
  if (notificationManager) {
    notificationManager.stop();
  }
});
// notifications.js - Real-time notification system

class NotificationManager {
  constructor() {
    this.lastCheck = localStorage.getItem('lastNotificationCheck') || new Date(0).toISOString();
    this.pollingInterval = 15000; // 15 seconds
    this.intervalId = null;
    this.isRunning = false;
  }

  // Start notification polling
  start() {
    if (this.isRunning) return;

    console.log('🔔 Starting notification system');
    this.isRunning = true;

    // Immediate check
    this.checkNotifications();

    // Periodic polling
    this.intervalId = setInterval(() => {
      this.checkNotifications();
    }, this.pollingInterval);
  }

  // Stop polling
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('🔕 Notification system stopped');
  }

  // Check for new notifications
  async checkNotifications() {
    try {
      const response = await fetch(`/api/notifications?lastCheck=${encodeURIComponent(this.lastCheck)}`);

      if (!response.ok) {
        if (response.status === 401) {
          // Session expired, stop notifications
          this.stop();
          return;
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      // Update last check timestamp
      if (data.lastCheck) {
        this.lastCheck = data.lastCheck;
        localStorage.setItem('lastNotificationCheck', this.lastCheck);
      }

      // Show notifications
      if (data.notifications && data.notifications.length > 0) {
        console.log(`📬 Received ${data.notifications.length} new notifications`);

        data.notifications.forEach(notification => {
          this.showNotification(notification);
        });
      }

    } catch (error) {
      console.error('❌ Error checking notifications:', error);
    }
  }

  // Show a toast notification
  showNotification(notification) {
    if (!window.toastManager) {
      console.warn('⚠️ Toast manager not available');
      return;
    }

    const { type, title, message } = notification;

    switch (type) {
      case 'new_request':
        toastManager.info(message, title, 8000);
        // Optional sound (if supported)
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
        toastManager.info(message, title || 'Notification', 6000);
    }
  }

  // Optional notification sound
  playNotificationSound() {
    try {
      // Use Web Audio API if available
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
      // Ignore audio errors
    }
  }

  // Reset timestamp (for testing)
  reset() {
    this.lastCheck = new Date(0).toISOString();
    localStorage.removeItem('lastNotificationCheck');
    console.log('🔄 Reset notification timestamp');
  }
}

// Global initialization
let notificationManager = null;

// Global convenience functions
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

// Auto-start if on a dashboard page
document.addEventListener('DOMContentLoaded', () => {
  // Start only if on a dashboard page
  const isDashboard = window.location.pathname.includes('dashboard') ||
                     document.body.classList.contains('dashboard-page') ||
                     document.getElementById('usernameDisplay');

  if (isDashboard && !notificationManager) {
    console.log('📱 Dashboard detected, auto-starting notifications');
    setTimeout(() => {
      window.startNotifications();
    }, 2000); // Delay to allow full page load
  }
});

// Cleanup on page change
window.addEventListener('beforeunload', () => {
  if (notificationManager) {
    notificationManager.stop();
  }
});
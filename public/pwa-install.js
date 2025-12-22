// pwa-install.js - WKF Suite PWA Installation & Service Worker Manager

console.log('📱 PWA Manager initialized - WKF Suite');

let deferredPrompt = null;
let isInstalled = false;

// [DEBUG] Print device and connection info
console.log('[PWA] Device Info:', {
  userAgent: navigator.userAgent,
  isSecureContext: window.isSecureContext,
  protocol: window.location.protocol,
  host: window.location.host,
  hasServiceWorker: 'serviceWorker' in navigator,
  standalone: window.matchMedia('(display-mode: standalone)').matches
});

// === SERVICE WORKER REGISTRATION ===
// [FIX v1.1.1] Service Worker RE-ENABLED
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    registerServiceWorker();
  });
}

async function registerServiceWorker() {
  try {
    const registration = await navigator.serviceWorker.register('/service-worker.js', {
      scope: '/'
    });

    console.log('✅ Service Worker registered:', registration.scope);

    // Check for updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          showUpdateNotification();
        }
      });
    });

    // Check for updates every 30 minutes
    setInterval(() => {
      registration.update();
    }, 30 * 60 * 1000);

  } catch (error) {
    console.error('❌ Error registering Service Worker:', error);
  }
}

// === PWA INSTALLATION MANAGEMENT ===

// Detect if app is already installed
window.addEventListener('DOMContentLoaded', () => {
  checkIfInstalled();
  setupInstallButton();

  // [FIX v1.1.1] Fallback: if we don't receive beforeinstallprompt after 2 seconds,
  // show manual installation instructions anyway (useful for iOS and HTTP)
  setTimeout(() => {
    if (!deferredPrompt && !isInstalled) {
      console.log('[PWA] beforeinstallprompt not received after 2s - showing manual banner');
      showManualInstallBanner();
    }
  }, 2000);
});

// Capture beforeinstallprompt event
window.addEventListener('beforeinstallprompt', (e) => {
  console.log('📱 PWA: beforeinstallprompt RECEIVED - Installation available!');

  // Prevent the automatic prompt
  e.preventDefault();

  // Save the event to use it later
  deferredPrompt = e;

  // Show installation button
  console.log('[PWA] Calling showInstallButton()...');
  showInstallButton();
});

// Detect when app has been installed
window.addEventListener('appinstalled', () => {
  console.log('✅ PWA: App installed successfully!');

  isInstalled = true;
  deferredPrompt = null;

  // Hide installation button
  hideInstallButton();

  // Show success message
  showToastMessage('✅ WKF Suite installed successfully!', 'success');

  // Save installation state
  localStorage.setItem('wkf-pwa-installed', 'true');
});

// Check if app is already installed
function checkIfInstalled() {
  // Check localStorage
  if (localStorage.getItem('wkf-pwa-installed') === 'true') {
    isInstalled = true;
    return;
  }

  // Check standalone mode (app installed)
  if (window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true) {
    isInstalled = true;
    localStorage.setItem('wkf-pwa-installed', 'true');
  }
}

// Setup installation button
function setupInstallButton() {
  const installBtn = document.getElementById('pwa-install-btn');

  if (!installBtn) {
    return; // Button not present on the page
  }

  installBtn.addEventListener('click', async () => {
    if (!deferredPrompt) {
      showInstallInstructions();
      return;
    }

    // Show installation prompt
    deferredPrompt.prompt();

    // Wait for user choice
    const { outcome } = await deferredPrompt.userChoice;

    console.log(`📱 PWA: User choice: ${outcome}`);

    if (outcome === 'accepted') {
      console.log('✅ PWA: Installation accepted');
    } else {
      console.log('❌ PWA: Installation rejected');
    }

    // Reset prompt
    deferredPrompt = null;
    hideInstallButton();
  });
}

// Mostra bottone installazione
function showInstallButton() {
  console.log('[PWA] showInstallButton() chiamato');

  const installBtn = document.getElementById('pwa-install-btn');
  const installBanner = document.getElementById('pwa-install-banner');

  console.log('[PWA] Elementi trovati:', {
    hasButton: !!installBtn,
    hasBanner: !!installBanner,
    isInstalled
  });

  if (installBtn) {
    installBtn.style.display = 'inline-block';
    console.log('[PWA] Installation button shown');
  }

  if (installBanner && !isInstalled) {
    // Check if banner was recently closed
    const bannerDismissed = localStorage.getItem('wkf-install-banner-dismissed');
    const dismissedTime = bannerDismissed ? parseInt(bannerDismissed) : 0;
    const daysSinceDismiss = (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24);

    console.log('[PWA] Check banner dismiss:', {
      dismissed: !!bannerDismissed,
      daysSince: daysSinceDismiss.toFixed(1)
    });

    // Show banner only if not dismissed or more than 7 days have passed
    if (!bannerDismissed || daysSinceDismiss > 7) {
      installBanner.style.display = 'block';
      console.log('[PWA] ✅ Installation banner shown');
    } else {
      console.log('[PWA] ⏸️ Banner hidden (recently dismissed)');
    }
  }
}

// Hide installation button
function hideInstallButton() {
  const installBtn = document.getElementById('pwa-install-btn');
  const installBanner = document.getElementById('pwa-install-banner');

  if (installBtn) {
    installBtn.style.display = 'none';
  }

  if (installBanner) {
    installBanner.style.display = 'none';
  }
}

// Close installation banner
function dismissInstallBanner() {
  const installBanner = document.getElementById('pwa-install-banner');

  if (installBanner) {
    installBanner.style.display = 'none';
    localStorage.setItem('wkf-install-banner-dismissed', Date.now().toString());
  }
}

// [FIX v1.1.1] Show detailed installation instructions for browser/OS
function showInstallInstructions() {
  console.log('[PWA] Showing manual installation instructions');

  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  const isAndroid = /Android/.test(navigator.userAgent);
  const isChrome = /Chrome/.test(navigator.userAgent);

  let message = '';
  let title = '📱 Install WKF Suite';

  if (isIOS && isSafari) {
    title = '📱 Install on iPhone/iPad';
    message = `
      <div style="text-align: left; padding: 10px;">
        <p style="margin-bottom: 15px;"><strong>Follow these steps:</strong></p>
        <ol style="line-height: 1.8;">
          <li>Tap the <strong>Share</strong> button 📤 (bottom center)</li>
          <li>Scroll down and tap <strong>"Add to Home Screen"</strong></li>
          <li>Tap <strong>"Add"</strong> in the top right</li>
          <li>You will find the WKF Suite icon on your home screen!</li>
        </ol>
      </div>
    `;
  } else if (isAndroid && isChrome) {
    title = '📱 Install on Android';
    message = `
      <div style="text-align: left; padding: 10px;">
        <p style="margin-bottom: 15px;"><strong>Method 1 - Browser Menu:</strong></p>
        <ol style="line-height: 1.8;">
          <li>Tap the ⋮ menu (3 dots in the top right)</li>
          <li>Look for the <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong> option</li>
          <li>Tap <strong>"Install"</strong></li>
        </ol>
        <p style="margin: 15px 0;"><strong>Method 2 - Address bar:</strong></p>
        <p>Look for the 📱 icon in the address bar and tap it</p>
        <hr style="margin: 15px 0;">
        <p style="color: #e74c3c;"><strong>⚠️ Note:</strong> If you don't see the option, use HTTPS instead of HTTP:<br>
        <code style="background: #f0f0f0; padding: 5px; display: block; margin-top: 5px;">https://192.168.1.177:8443</code></p>
      </div>
    `;
  } else {
    message = `
      <div style="text-align: left; padding: 10px;">
        <p style="margin-bottom: 15px;"><strong>PWA Installation:</strong></p>
        <ol style="line-height: 1.8;">
          <li>Apri il <strong>menu del browser</strong> (☰ o ⋮)</li>
          <li>Cerca opzione:<br>
            - "Installa app"<br>
            - "Aggiungi a schermata Home"<br>
            - "Aggiungi a Home"
          </li>
          <li>Confirm the installation</li>
        </ol>
        <hr style="margin: 15px 0;">
        <p style="color: #e74c3c;"><strong>⚠️ Tip:</strong><br>
        Per migliore esperienza usa HTTPS:<br>
        <code style="background: #f0f0f0; padding: 5px; display: block; margin-top: 5px;">https://192.168.1.177:8443</code></p>
      </div>
    `;
  }

  showModal(title, message);
}

// === NOTIFICATIONS AND UI ===

// Show available update notification
function showUpdateNotification() {
  const updateBanner = createUpdateBanner();
  document.body.appendChild(updateBanner);
}

// Create update banner
function createUpdateBanner() {
  const banner = document.createElement('div');
  banner.id = 'pwa-update-banner';
  banner.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    background: #2ecc71;
    color: white;
    padding: 15px;
    text-align: center;
    z-index: 10000;
    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
  `;

  banner.innerHTML = `
    <strong>🔄 New version available!</strong>
    <button onclick="updateServiceWorker()" style="
      margin-left: 15px;
      padding: 8px 16px;
      background: white;
      color: #2ecc71;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-weight: bold;
    ">Update Now</button>
    <button onclick="this.parentElement.remove()" style="
      margin-left: 10px;
      padding: 8px 16px;
      background: rgba(255,255,255,0.2);
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    ">Later</button>
  `;

  return banner;
}

// Update Service Worker
async function updateServiceWorker() {
  const registration = await navigator.serviceWorker.getRegistration();

  if (registration && registration.waiting) {
    // Send a message to the service worker to activate the update
    registration.waiting.postMessage({ type: 'SKIP_WAITING' });

    // Reload page after activation
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    });
  }
}

// Mostra toast message
function showToastMessage(message, type = 'info') {
  // Use existing toast function if available
  if (typeof showToast === 'function') {
    showToast(message, type);
    return;
  }

  // Simple toast fallback
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: ${type === 'success' ? '#2ecc71' : '#3498db'};
    color: white;
    padding: 15px 25px;
    border-radius: 8px;
    z-index: 10000;
    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
  `;
  toast.textContent = message;

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3000);
}

// Mostra modal
function showModal(title, content) {
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10001;
  `;

  modal.innerHTML = `
    <div style="
      background: white;
      padding: 25px;
      border-radius: 12px;
      max-width: 400px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    ">
      <h3 style="margin-top: 0;">${title}</h3>
      <div style="margin: 15px 0; line-height: 1.6;">${content}</div>
      <button onclick="this.closest('div[style*=fixed]').remove()" style="
        padding: 10px 20px;
        background: #3498db;
        color: white;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        font-weight: bold;
      ">Got it</button>
    </div>
  `;

  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });

  document.body.appendChild(modal);
}

// === ONLINE/OFFLINE STATUS ===

// Detect connection status change
window.addEventListener('online', () => {
  console.log('🌐 Connection restored');
  hideOfflineBanner();
  showToastMessage('✅ You are online', 'success');
});

window.addEventListener('offline', () => {
  console.log('📡 Connection lost');
  showOfflineBanner();
});

// Show offline banner
function showOfflineBanner() {
  let banner = document.getElementById('offline-banner');

  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'offline-banner';
    banner.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: #e74c3c;
      color: white;
      padding: 10px;
      text-align: center;
      z-index: 9999;
      font-weight: bold;
    `;
    banner.textContent = '📡 You are offline - Some features may not be available';

    document.body.appendChild(banner);
  }
}

// Hide offline banner
function hideOfflineBanner() {
  const banner = document.getElementById('offline-banner');
  if (banner) {
    banner.remove();
  }
}

// Check offline status on startup
if (!navigator.onLine) {
  showOfflineBanner();
}

// [FIX v1.1.1] Show manual installation banner (fallback for iOS/HTTP)
function showManualInstallBanner() {
  const installBanner = document.getElementById('pwa-install-banner');

  if (installBanner && !isInstalled) {
    // Check if banner was recently closed
    const bannerDismissed = localStorage.getItem('wkf-install-banner-dismissed');
    const dismissedTime = bannerDismissed ? parseInt(bannerDismissed) : 0;
    const daysSinceDismiss = (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24);

    console.log('[PWA] Mostro banner manuale - Check dismiss:', {
      dismissed: !!bannerDismissed,
      daysSince: daysSinceDismiss.toFixed(1),
      protocol: window.location.protocol
    });

    // Show banner only if not recently dismissed
    if (!bannerDismissed || daysSinceDismiss > 7) {
      installBanner.style.display = 'block';

      // If on HTTP, show HTTPS suggestion
      const httpsHint = document.getElementById('pwa-https-hint');
      if (window.location.protocol === 'http:' && httpsHint) {
        httpsHint.style.display = 'block';
        console.log('[PWA] ⚠️ On HTTP - showing HTTPS suggestion');
      }

      console.log('[PWA] ✅ Manual installation banner shown');
    } else {
      console.log('[PWA] ⏸️ Banner not shown (recently dismissed)');
    }
  }
}

// Export global functions
window.dismissInstallBanner = dismissInstallBanner;
window.updateServiceWorker = updateServiceWorker;

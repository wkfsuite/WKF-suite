// pwa-install.js - WKF Suite PWA Installation & Service Worker Manager

console.log('📱 PWA Manager inizializzato - WKF Suite');

let deferredPrompt = null;
let isInstalled = false;

// [DEBUG] Stampa info dispositivo e connessione
console.log('[PWA] Device Info:', {
  userAgent: navigator.userAgent,
  isSecureContext: window.isSecureContext,
  protocol: window.location.protocol,
  host: window.location.host,
  hasServiceWorker: 'serviceWorker' in navigator,
  standalone: window.matchMedia('(display-mode: standalone)').matches
});

// === REGISTRAZIONE SERVICE WORKER ===
// [FIX v1.1.1] Service Worker RIABILITATO
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

    console.log('✅ Service Worker registrato:', registration.scope);

    // Controlla aggiornamenti
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          showUpdateNotification();
        }
      });
    });

    // Controlla aggiornamenti ogni 30 minuti
    setInterval(() => {
      registration.update();
    }, 30 * 60 * 1000);

  } catch (error) {
    console.error('❌ Errore registrazione Service Worker:', error);
  }
}

// === GESTIONE INSTALLAZIONE PWA ===

// Rileva se app è già installata
window.addEventListener('DOMContentLoaded', () => {
  checkIfInstalled();
  setupInstallButton();

  // [FIX v1.1.1] Fallback: se dopo 2 secondi non riceviamo beforeinstallprompt,
  // mostra comunque istruzioni installazione manuale (utile per iOS e HTTP)
  setTimeout(() => {
    if (!deferredPrompt && !isInstalled) {
      console.log('[PWA] beforeinstallprompt non ricevuto dopo 2s - mostro banner manuale');
      showManualInstallBanner();
    }
  }, 2000);
});

// Cattura evento beforeinstallprompt
window.addEventListener('beforeinstallprompt', (e) => {
  console.log('📱 PWA: beforeinstallprompt RICEVUTO - Installazione disponibile!');

  // Previeni il prompt automatico
  e.preventDefault();

  // Salva l'evento per usarlo dopo
  deferredPrompt = e;

  // Mostra bottone installazione
  console.log('[PWA] Chiamata showInstallButton()...');
  showInstallButton();
});

// Rileva quando app è stata installata
window.addEventListener('appinstalled', () => {
  console.log('✅ PWA: App installata con successo!');

  isInstalled = true;
  deferredPrompt = null;

  // Nascondi bottone installazione
  hideInstallButton();

  // Mostra messaggio di successo
  showToastMessage('✅ WKF Suite installata con successo!', 'success');

  // Salva stato installazione
  localStorage.setItem('wkf-pwa-installed', 'true');
});

// Controlla se app è già installata
function checkIfInstalled() {
  // Controlla localStorage
  if (localStorage.getItem('wkf-pwa-installed') === 'true') {
    isInstalled = true;
    return;
  }

  // Controlla modalità standalone (app installata)
  if (window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true) {
    isInstalled = true;
    localStorage.setItem('wkf-pwa-installed', 'true');
  }
}

// Setup bottone installazione
function setupInstallButton() {
  const installBtn = document.getElementById('pwa-install-btn');

  if (!installBtn) {
    return; // Bottone non presente nella pagina
  }

  installBtn.addEventListener('click', async () => {
    if (!deferredPrompt) {
      showInstallInstructions();
      return;
    }

    // Mostra prompt installazione
    deferredPrompt.prompt();

    // Attendi scelta utente
    const { outcome } = await deferredPrompt.userChoice;

    console.log(`📱 PWA: Scelta utente: ${outcome}`);

    if (outcome === 'accepted') {
      console.log('✅ PWA: Installazione accettata');
    } else {
      console.log('❌ PWA: Installazione rifiutata');
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
    console.log('[PWA] Bottone installazione mostrato');
  }

  if (installBanner && !isInstalled) {
    // Controlla se banner è stato chiuso di recente
    const bannerDismissed = localStorage.getItem('wkf-install-banner-dismissed');
    const dismissedTime = bannerDismissed ? parseInt(bannerDismissed) : 0;
    const daysSinceDismiss = (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24);

    console.log('[PWA] Check banner dismiss:', {
      dismissed: !!bannerDismissed,
      daysSince: daysSinceDismiss.toFixed(1)
    });

    // Mostra banner solo se non dismisso o sono passati più di 7 giorni
    if (!bannerDismissed || daysSinceDismiss > 7) {
      installBanner.style.display = 'block';
      console.log('[PWA] ✅ Banner installazione mostrato');
    } else {
      console.log('[PWA] ⏸️ Banner nascosto (dismissed recentemente)');
    }
  }
}

// Nascondi bottone installazione
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

// Chiudi banner installazione
function dismissInstallBanner() {
  const installBanner = document.getElementById('pwa-install-banner');

  if (installBanner) {
    installBanner.style.display = 'none';
    localStorage.setItem('wkf-install-banner-dismissed', Date.now().toString());
  }
}

// [FIX v1.1.1] Mostra istruzioni installazione dettagliate per browser/OS
function showInstallInstructions() {
  console.log('[PWA] Mostro istruzioni installazione manuale');

  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  const isAndroid = /Android/.test(navigator.userAgent);
  const isChrome = /Chrome/.test(navigator.userAgent);

  let message = '';
  let title = '📱 Installa WKF Suite';

  if (isIOS && isSafari) {
    title = '📱 Installa su iPhone/iPad';
    message = `
      <div style="text-align: left; padding: 10px;">
        <p style="margin-bottom: 15px;"><strong>Segui questi passaggi:</strong></p>
        <ol style="line-height: 1.8;">
          <li>Tocca il pulsante <strong>Condividi</strong> 📤 (in basso al centro)</li>
          <li>Scorri in basso e tocca <strong>"Aggiungi a Home"</strong></li>
          <li>Tocca <strong>"Aggiungi"</strong> in alto a destra</li>
          <li>Troverai l'icona WKF Suite sulla tua schermata home!</li>
        </ol>
      </div>
    `;
  } else if (isAndroid && isChrome) {
    title = '📱 Installa su Android';
    message = `
      <div style="text-align: left; padding: 10px;">
        <p style="margin-bottom: 15px;"><strong>Metodo 1 - Menu Browser:</strong></p>
        <ol style="line-height: 1.8;">
          <li>Tocca il menu ⋮ (3 puntini in alto a destra)</li>
          <li>Cerca opzione <strong>"Installa app"</strong> o <strong>"Aggiungi a schermata Home"</strong></li>
          <li>Tocca <strong>"Installa"</strong></li>
        </ol>
        <p style="margin: 15px 0;"><strong>Metodo 2 - Barra indirizzi:</strong></p>
        <p>Cerca icona 📱 nella barra indirizzi e toccala</p>
        <hr style="margin: 15px 0;">
        <p style="color: #e74c3c;"><strong>⚠️ Nota:</strong> Se non vedi l'opzione, usa HTTPS invece di HTTP:<br>
        <code style="background: #f0f0f0; padding: 5px; display: block; margin-top: 5px;">https://192.168.1.177:8443</code></p>
      </div>
    `;
  } else {
    message = `
      <div style="text-align: left; padding: 10px;">
        <p style="margin-bottom: 15px;"><strong>Installazione PWA:</strong></p>
        <ol style="line-height: 1.8;">
          <li>Apri il <strong>menu del browser</strong> (☰ o ⋮)</li>
          <li>Cerca opzione:<br>
            - "Installa app"<br>
            - "Aggiungi a schermata Home"<br>
            - "Aggiungi a Home"
          </li>
          <li>Conferma l'installazione</li>
        </ol>
        <hr style="margin: 15px 0;">
        <p style="color: #e74c3c;"><strong>⚠️ Suggerimento:</strong><br>
        Per migliore esperienza usa HTTPS:<br>
        <code style="background: #f0f0f0; padding: 5px; display: block; margin-top: 5px;">https://192.168.1.177:8443</code></p>
      </div>
    `;
  }

  showModal(title, message);
}

// === NOTIFICHE E UI ===

// Mostra notifica aggiornamento disponibile
function showUpdateNotification() {
  const updateBanner = createUpdateBanner();
  document.body.appendChild(updateBanner);
}

// Crea banner aggiornamento
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
    <strong>🔄 Nuova versione disponibile!</strong>
    <button onclick="updateServiceWorker()" style="
      margin-left: 15px;
      padding: 8px 16px;
      background: white;
      color: #2ecc71;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-weight: bold;
    ">Aggiorna Ora</button>
    <button onclick="this.parentElement.remove()" style="
      margin-left: 10px;
      padding: 8px 16px;
      background: rgba(255,255,255,0.2);
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    ">Dopo</button>
  `;

  return banner;
}

// Aggiorna Service Worker
async function updateServiceWorker() {
  const registration = await navigator.serviceWorker.getRegistration();

  if (registration && registration.waiting) {
    // Invia messaggio al service worker per attivare aggiornamento
    registration.waiting.postMessage({ type: 'SKIP_WAITING' });

    // Ricarica pagina dopo attivazione
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    });
  }
}

// Mostra toast message
function showToastMessage(message, type = 'info') {
  // Usa funzione toast esistente se disponibile
  if (typeof showToast === 'function') {
    showToast(message, type);
    return;
  }

  // Fallback toast semplice
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
      ">Ho Capito</button>
    </div>
  `;

  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });

  document.body.appendChild(modal);
}

// === STATO ONLINE/OFFLINE ===

// Rileva cambio stato connessione
window.addEventListener('online', () => {
  console.log('🌐 Connessione ripristinata');
  hideOfflineBanner();
  showToastMessage('✅ Sei online', 'success');
});

window.addEventListener('offline', () => {
  console.log('📡 Connessione persa');
  showOfflineBanner();
});

// Mostra banner offline
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
    banner.textContent = '📡 Sei offline - Alcune funzionalità potrebbero non essere disponibili';

    document.body.appendChild(banner);
  }
}

// Nascondi banner offline
function hideOfflineBanner() {
  const banner = document.getElementById('offline-banner');
  if (banner) {
    banner.remove();
  }
}

// Controlla stato offline all'avvio
if (!navigator.onLine) {
  showOfflineBanner();
}

// [FIX v1.1.1] Mostra banner installazione manuale (fallback per iOS/HTTP)
function showManualInstallBanner() {
  const installBanner = document.getElementById('pwa-install-banner');

  if (installBanner && !isInstalled) {
    // Controlla se banner è stato chiuso di recente
    const bannerDismissed = localStorage.getItem('wkf-install-banner-dismissed');
    const dismissedTime = bannerDismissed ? parseInt(bannerDismissed) : 0;
    const daysSinceDismiss = (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24);

    console.log('[PWA] Mostro banner manuale - Check dismiss:', {
      dismissed: !!bannerDismissed,
      daysSince: daysSinceDismiss.toFixed(1),
      protocol: window.location.protocol
    });

    // Mostra banner solo se non dismisso di recente
    if (!bannerDismissed || daysSinceDismiss > 7) {
      installBanner.style.display = 'block';

      // Se su HTTP, mostra suggerimento HTTPS
      const httpsHint = document.getElementById('pwa-https-hint');
      if (window.location.protocol === 'http:' && httpsHint) {
        httpsHint.style.display = 'block';
        console.log('[PWA] ⚠️ Su HTTP - mostro suggerimento HTTPS');
      }

      console.log('[PWA] ✅ Banner installazione manuale mostrato');
    } else {
      console.log('[PWA] ⏸️ Banner non mostrato (dismissed recentemente)');
    }
  }
}

// Esporta funzioni globali
window.dismissInstallBanner = dismissInstallBanner;
window.updateServiceWorker = updateServiceWorker;

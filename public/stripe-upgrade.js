// Sistema di upgrade WKF Suite PRO
// Mostra bottone che reindirizza alla pagina di upgrade sicura

class StripeUpgrade {
  constructor() {
    // Nessuna inizializzazione Stripe qui - tutto gestito da upgrade.html
  }

  // Verifica se l'upgrade è disponibile
  static isUpgradeNeeded() {
    // Controlla se l'app è in modalità FREE
    const titleElement = document.querySelector('title');
    const licenseStatus = document.getElementById('licenseStatus');

    // Verifica sia dal title che dal badge di licenza
    const isFree = (titleElement && titleElement.textContent.includes('FREE')) ||
                   (licenseStatus && licenseStatus.textContent.includes('FREE'));

    return isFree;
  }

  // Aggiungi bottone upgrade alla UI esistente
  static addUpgradeButton() {
    if (!this.isUpgradeNeeded()) return;

    // Verifica se il bottone esiste già
    if (document.getElementById('upgrade-to-pro-btn')) return;

    const upgradeBtn = document.createElement('button');
    upgradeBtn.id = 'upgrade-to-pro-btn';
    upgradeBtn.innerHTML = '🚀 Upgrade a PRO - €20';
    upgradeBtn.className = 'upgrade-btn';
    upgradeBtn.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%);
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 25px;
      font-weight: bold;
      cursor: pointer;
      z-index: 1000;
      box-shadow: 0 4px 15px rgba(255, 107, 107, 0.3);
      transition: all 0.3s;
      font-size: 14px;
    `;

    upgradeBtn.addEventListener('mouseover', () => {
      upgradeBtn.style.transform = 'translateY(-2px)';
      upgradeBtn.style.boxShadow = '0 8px 25px rgba(255, 107, 107, 0.4)';
    });

    upgradeBtn.addEventListener('mouseout', () => {
      upgradeBtn.style.transform = 'translateY(0)';
      upgradeBtn.style.boxShadow = '0 4px 15px rgba(255, 107, 107, 0.3)';
    });

    // Redirect alla pagina di upgrade
    upgradeBtn.addEventListener('click', () => {
      window.location.href = '/upgrade.html';
    });

    document.body.appendChild(upgradeBtn);
  }

  // Mostra notifica upgrade (opzionale - per dashboard)
  static showUpgradeNotification() {
    if (!this.isUpgradeNeeded()) return;

    // Cerca un container per notifiche
    const notificationContainer = document.querySelector('.notifications-container');
    if (!notificationContainer) return;

    const notification = document.createElement('div');
    notification.className = 'upgrade-notification';
    notification.style.cssText = `
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 15px 20px;
      border-radius: 8px;
      margin-bottom: 15px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
    `;

    notification.innerHTML = `
      <div>
        <strong>🚀 Passa a WKF Suite PRO</strong>
        <p style="margin: 5px 0 0 0; font-size: 13px; opacity: 0.9;">
          Sblocca grafici avanzati, notifiche email e molto altro!
        </p>
      </div>
      <button onclick="window.location.href='/upgrade.html'"
              style="background: white; color: #667eea; border: none; padding: 8px 16px;
                     border-radius: 6px; font-weight: bold; cursor: pointer;">
        Scopri di più
      </button>
    `;

    notificationContainer.prepend(notification);
  }
}

// Auto-inizializzazione quando la pagina è caricata
document.addEventListener('DOMContentLoaded', () => {
  // Aggiungi bottone upgrade se necessario (dopo un piccolo delay per evitare flicker)
  setTimeout(() => {
    StripeUpgrade.addUpgradeButton();
  }, 500);
});

// Esporta per uso globale
window.StripeUpgrade = StripeUpgrade;

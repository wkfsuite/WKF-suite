// license-manager.js
// Sistema di gestione licenze per WKF Suite

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class LicenseManager {
  constructor() {
    this.licenseFilePath = path.join(__dirname, 'license.key');
    this.currentLicense = null;
    this.licenseStatus = 'FREE';

    // Controlla la licenza all'inizializzazione
    this.checkLicense();
  }

  /**
   * Verifica la presenza e validità della license key
   * @returns {Object} Status della licenza
   */
  checkLicense() {
    try {
      if (!fs.existsSync(this.licenseFilePath)) {
        this.licenseStatus = 'FREE';
        console.log('📋 WKF Suite - Modalità FREE (nessun file license.key trovato)');
        return {
          status: 'FREE',
          reason: 'No license file found',
          features: this.getFreeFeatures()
        };
      }

      const licenseKey = fs.readFileSync(this.licenseFilePath, 'utf8').trim();

      if (this.validateLicenseKey(licenseKey)) {
        this.licenseStatus = 'PRO';
        this.currentLicense = licenseKey;
        console.log('✅ WKF Suite PRO - Licenza valida attivata');
        return {
          status: 'PRO',
          key: licenseKey,
          features: this.getProFeatures()
        };
      } else {
        this.licenseStatus = 'FREE';
        console.log('❌ WKF Suite - License key non valida, modalità FREE attivata');
        return {
          status: 'FREE',
          reason: 'Invalid license key',
          features: this.getFreeFeatures()
        };
      }
    } catch (error) {
      this.licenseStatus = 'FREE';
      console.error('⚠️  Errore controllo licenza:', error.message);
      return {
        status: 'FREE',
        reason: 'License validation error',
        features: this.getFreeFeatures()
      };
    }
  }

  /**
   * Valida una license key usando algoritmo di checksum
   * @param {string} licenseKey - La license key da validare
   * @returns {boolean} True se valida
   */
  validateLicenseKey(licenseKey) {
    if (!licenseKey || typeof licenseKey !== 'string') {
      return false;
    }

    // Format: XXXXXXXX-XXXXXXXX-XXXXXXXX-CHECKSUM
    const keyPattern = /^[A-F0-9]{8}-[A-F0-9]{8}-[A-F0-9]{8}-[A-F0-9]{8}$/;

    if (!keyPattern.test(licenseKey)) {
      return false;
    }

    const parts = licenseKey.split('-');
    const keyPart = parts.slice(0, 3).join('-');
    const providedChecksum = parts[3];

    const calculatedChecksum = this.calculateChecksum(keyPart);

    return calculatedChecksum === providedChecksum;
  }

  /**
   * Calcola il checksum per una license key
   * @param {string} keyPart - Parte della key senza checksum
   * @returns {string} Checksum calcolato
   */
  calculateChecksum(keyPart) {
    const hash = crypto.createHash('sha256').update(keyPart + 'WKF_SUITE_SALT_2024').digest('hex');
    return hash.substring(0, 8).toUpperCase();
  }

  /**
   * Genera una nuova license key (per uso server-side)
   * @param {string} customerEmail - Email del cliente
   * @returns {string} License key generata
   */
  static generateLicenseKey(customerEmail) {
    const timestamp = Date.now().toString();
    const emailHash = crypto.createHash('md5').update(customerEmail).digest('hex');
    const randomSalt = crypto.randomBytes(4).toString('hex');

    // Combina timestamp, email hash e salt per creare la key base
    const baseData = timestamp + emailHash + randomSalt;
    const keyHash = crypto.createHash('sha256').update(baseData).digest('hex');

    // Estrae 24 caratteri hex e formatta come XXX-XXX-XXX
    const keyPart1 = keyHash.substring(0, 8).toUpperCase();
    const keyPart2 = keyHash.substring(8, 16).toUpperCase();
    const keyPart3 = keyHash.substring(16, 24).toUpperCase();

    const keyWithoutChecksum = `${keyPart1}-${keyPart2}-${keyPart3}`;

    // Calcola checksum
    const manager = new LicenseManager();
    const checksum = manager.calculateChecksum(keyWithoutChecksum);

    return `${keyWithoutChecksum}-${checksum}`;
  }

  /**
   * Salva una license key nel file
   * @param {string} licenseKey - License key da salvare
   * @returns {boolean} True se salvata con successo
   */
  saveLicenseKey(licenseKey) {
    try {
      if (!this.validateLicenseKey(licenseKey)) {
        throw new Error('License key non valida');
      }

      // Crea backup della licenza precedente se esiste
      if (fs.existsSync(this.licenseFilePath)) {
        this.createLicenseBackup();
      }

      // Salva la nuova licenza
      fs.writeFileSync(this.licenseFilePath, licenseKey.trim(), 'utf8');

      // Ricontrolla la licenza dopo il salvataggio
      this.checkLicense();

      // Se tutto ok, crea nuovo backup della licenza attiva
      this.createLicenseBackup();

      return true;
    } catch (error) {
      console.error('Errore salvataggio license key:', error.message);

      // Tenta di ripristinare da backup se il salvataggio fallisce
      if (error.message.includes('permission') || error.message.includes('access')) {
        console.log('🔄 Tentativo ripristino da backup...');
        this.restoreFromBackup();
      }

      return false;
    }
  }

  /**
   * Rimuove il file di licenza
   * @returns {boolean} True se rimosso con successo
   */
  removeLicenseKey() {
    try {
      if (fs.existsSync(this.licenseFilePath)) {
        fs.unlinkSync(this.licenseFilePath);
      }

      this.licenseStatus = 'FREE';
      this.currentLicense = null;

      return true;
    } catch (error) {
      console.error('Errore rimozione license key:', error.message);
      return false;
    }
  }

  /**
   * Controlla se una feature specifica è disponibile
   * @param {string} feature - Nome della feature da controllare
   * @returns {boolean} True se la feature è disponibile
   */
  hasFeature(feature) {
    if (this.licenseStatus === 'PRO') {
      return this.getProFeatures().includes(feature);
    } else {
      return this.getFreeFeatures().includes(feature);
    }
  }

  /**
   * Lista delle funzionalità disponibili nella versione FREE
   * @returns {Array} Array delle funzionalità FREE
   */
  getFreeFeatures() {
    return [
      'user_management',
      'permission_requests',
      'basic_reports',
      'wifi_qr_codes',
      'basic_dashboard',
      'sqlite_database',
      'offline_mode'
    ];
  }

  /**
   * Lista delle funzionalità disponibili nella versione PRO
   * @returns {Array} Array delle funzionalità PRO
   */
  getProFeatures() {
    return [
      ...this.getFreeFeatures(),
      'email_notifications',
      'advanced_analytics',
      'pdf_reports',
      'email_templates',
      'advanced_dashboard',
      'priority_support',
      'auto_backups',
      'custom_branding'
    ];
  }

  /**
   * Ottiene lo status corrente della licenza
   * @returns {Object} Informazioni sullo status della licenza
   */
  getLicenseInfo() {
    return {
      status: this.licenseStatus,
      isPro: this.licenseStatus === 'PRO',
      hasLicenseFile: fs.existsSync(this.licenseFilePath),
      features: this.licenseStatus === 'PRO' ? this.getProFeatures() : this.getFreeFeatures(),
      licenseKey: this.currentLicense ? `${this.currentLicense.substring(0, 12)}...` : null
    };
  }

  /**
   * Ottiene il titolo dell'applicazione con status licenza
   * @returns {string} Titolo formattato
   */
  getAppTitle() {
    return `WKF Suite ${this.licenseStatus}`;
  }

  /**
   * Controlla se è necessario mostrare l'upgrade prompt
   * @param {string} attemptedFeature - Feature che l'utente sta tentando di usare
   * @returns {Object} Info sull'upgrade prompt
   */
  checkUpgradePrompt(attemptedFeature) {
    if (this.licenseStatus === 'PRO') {
      return { showPrompt: false };
    }

    const proOnlyFeatures = this.getProFeatures().filter(f => !this.getFreeFeatures().includes(f));

    if (proOnlyFeatures.includes(attemptedFeature)) {
      return {
        showPrompt: true,
        feature: attemptedFeature,
        message: `La funzione "${attemptedFeature}" è disponibile solo in WKF Suite PRO.`,
        upgradeUrl: 'https://wkfsuite.com/upgrade'
      };
    }

    return { showPrompt: false };
  }

  /**
   * Verifica l'integrità del file di licenza e tenta il ripristino
   * @returns {Object} Risultato del controllo integrità
   */
  verifyLicenseIntegrity() {
    try {
      if (!fs.existsSync(this.licenseFilePath)) {
        return {
          valid: false,
          reason: 'LICENSE_FILE_MISSING',
          message: 'File di licenza non trovato'
        };
      }

      const licenseContent = fs.readFileSync(this.licenseFilePath, 'utf8').trim();

      // Controllo lunghezza minima
      if (licenseContent.length < 35) {
        return {
          valid: false,
          reason: 'LICENSE_FILE_CORRUPTED',
          message: 'File di licenza troppo corto o corrotto'
        };
      }

      // Controllo formato
      if (!this.validateLicenseKey(licenseContent)) {
        // Tenta recupero dal backup se esiste
        const backupPath = this.licenseFilePath + '.backup';
        if (fs.existsSync(backupPath)) {
          console.log('🔄 Tentativo recupero da backup...');
          const backupContent = fs.readFileSync(backupPath, 'utf8').trim();

          if (this.validateLicenseKey(backupContent)) {
            fs.writeFileSync(this.licenseFilePath, backupContent, 'utf8');
            console.log('✅ Licenza recuperata da backup');
            return {
              valid: true,
              recovered: true,
              message: 'Licenza recuperata da backup'
            };
          }
        }

        return {
          valid: false,
          reason: 'LICENSE_INVALID_FORMAT',
          message: 'Formato license key non valido'
        };
      }

      return {
        valid: true,
        message: 'Licenza valida'
      };

    } catch (error) {
      console.error('❌ Errore verifica integrità licenza:', error.message);
      return {
        valid: false,
        reason: 'LICENSE_VERIFICATION_ERROR',
        message: `Errore verifica licenza: ${error.message}`
      };
    }
  }

  /**
   * Crea backup della licenza corrente
   * @returns {boolean} True se backup creato con successo
   */
  createLicenseBackup() {
    try {
      if (fs.existsSync(this.licenseFilePath) && this.currentLicense) {
        const backupPath = this.licenseFilePath + '.backup';
        fs.writeFileSync(backupPath, this.currentLicense, 'utf8');
        console.log('💾 Backup licenza creato');
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Errore creazione backup licenza:', error.message);
      return false;
    }
  }

  /**
   * Ripristina licenza da backup
   * @returns {boolean} True se ripristino riuscito
   */
  restoreFromBackup() {
    try {
      const backupPath = this.licenseFilePath + '.backup';
      if (fs.existsSync(backupPath)) {
        const backupContent = fs.readFileSync(backupPath, 'utf8').trim();

        if (this.validateLicenseKey(backupContent)) {
          fs.writeFileSync(this.licenseFilePath, backupContent, 'utf8');
          this.checkLicense(); // Ricontrolla dopo il ripristino
          console.log('🔄 Licenza ripristinata da backup');
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('❌ Errore ripristino da backup:', error.message);
      return false;
    }
  }
}

module.exports = LicenseManager;
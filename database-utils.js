// database-utils.js
// Utilità per gestione database con error handling robusto

const sqlite3 = require('sqlite3').verbose();

/**
 * Wrapper per operazioni database con retry logic e error handling
 */
class DatabaseUtils {
  constructor(db) {
    this.db = db;
    this.maxRetries = 3;
    this.retryDelay = 1000; // 1 secondo
  }

  /**
   * Esegue query con retry automatico
   * @param {string} sql - Query SQL
   * @param {Array} params - Parametri query
   * @param {number} retryCount - Numero di tentativi correnti
   * @returns {Promise} Risultato query
   */
  async runWithRetry(sql, params = [], retryCount = 0) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          console.error(`❌ Database error (tentativo ${retryCount + 1}):`, err.message);

          // Errori che possono essere risolti con retry
          const retryableErrors = [
            'SQLITE_BUSY',
            'SQLITE_LOCKED',
            'database is locked'
          ];

          const isRetryable = retryableErrors.some(errType =>
            err.message.includes(errType) || err.code === errType
          );

          if (isRetryable && retryCount < this.maxRetries) {
            console.log(`🔄 Retry in ${this.retryDelay}ms...`);
            setTimeout(() => {
              this.runWithRetry(sql, params, retryCount + 1)
                .then(resolve)
                .catch(reject);
            }, this.retryDelay * (retryCount + 1)); // Backoff progressivo
          } else {
            reject(err);
          }
        } else {
          resolve({ changes: this.changes, lastID: this.lastID });
        }
      });
    });
  }

  /**
   * Esegue SELECT con retry
   * @param {string} sql - Query SQL
   * @param {Array} params - Parametri query
   * @param {number} retryCount - Numero tentativi correnti
   * @returns {Promise} Row risultato
   */
  async getWithRetry(sql, params = [], retryCount = 0) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          console.error(`❌ Database get error (tentativo ${retryCount + 1}):`, err.message);

          const retryableErrors = [
            'SQLITE_BUSY',
            'SQLITE_LOCKED',
            'database is locked'
          ];

          const isRetryable = retryableErrors.some(errType =>
            err.message.includes(errType) || err.code === errType
          );

          if (isRetryable && retryCount < this.maxRetries) {
            console.log(`🔄 Retry get in ${this.retryDelay}ms...`);
            setTimeout(() => {
              this.getWithRetry(sql, params, retryCount + 1)
                .then(resolve)
                .catch(reject);
            }, this.retryDelay * (retryCount + 1));
          } else {
            reject(err);
          }
        } else {
          resolve(row);
        }
      });
    });
  }

  /**
   * Valida parametri prima di INSERT/UPDATE
   * @param {Object} data - Dati da validare
   * @param {Array} requiredFields - Campi obbligatori
   * @returns {Object} Risultato validazione
   */
  validateData(data, requiredFields) {
    const errors = [];

    // Controlla campi obbligatori
    for (const field of requiredFields) {
      if (!data[field] || data[field] === '') {
        errors.push(`Campo obbligatorio mancante: ${field}`);
      }
    }

    // Validazioni specifiche
    if (data.session_id && typeof data.session_id !== 'string') {
      errors.push('session_id deve essere una stringa');
    }

    if (data.license_key && !this.validateLicenseKeyFormat(data.license_key)) {
      errors.push('license_key formato non valido');
    }

    if (data.email && !this.validateEmail(data.email)) {
      errors.push('email formato non valido');
    }

    if (data.amount && (isNaN(data.amount) || data.amount < 0)) {
      errors.push('amount deve essere un numero positivo');
    }

    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }

  /**
   * Valida formato license key
   * @param {string} licenseKey - License key da validare
   * @returns {boolean} True se valida
   */
  validateLicenseKeyFormat(licenseKey) {
    const pattern = /^[A-F0-9]{8}-[A-F0-9]{8}-[A-F0-9]{8}-[A-F0-9]{8}$/;
    return pattern.test(licenseKey);
  }

  /**
   * Valida formato email
   * @param {string} email - Email da validare
   * @returns {boolean} True se valida
   */
  validateEmail(email) {
    const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return pattern.test(email);
  }

  /**
   * Escape string per prevenire SQL injection
   * @param {string} str - Stringa da escape
   * @returns {string} Stringa escaped
   */
  escapeString(str) {
    if (typeof str !== 'string') return str;
    return str.replace(/'/g, "''");
  }

  /**
   * Salva pagamento Stripe con validazione e retry
   * @param {Object} paymentData - Dati pagamento
   * @returns {Promise} Risultato inserimento
   */
  async saveStripePayment(paymentData) {
    const requiredFields = [
      'session_id', 'license_key', 'customer_email',
      'amount', 'currency', 'product_type', 'payment_status'
    ];

    // Valida dati
    const validation = this.validateData(paymentData, requiredFields);
    if (!validation.isValid) {
      throw new Error(`Dati non validi: ${validation.errors.join(', ')}`);
    }

    const now = new Date().toISOString();

    try {
      const result = await this.runWithRetry(`
        INSERT OR REPLACE INTO stripe_payments (
          session_id, payment_intent_id, license_key, customer_email,
          amount, currency, product_type, payment_status, payment_method,
          created_at, updated_at, stripe_created, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        paymentData.session_id,
        paymentData.payment_intent_id || null,
        paymentData.license_key,
        paymentData.customer_email,
        paymentData.amount,
        paymentData.currency,
        paymentData.product_type,
        paymentData.payment_status,
        paymentData.payment_method || 'card',
        now,
        now,
        paymentData.stripe_created || now,
        paymentData.metadata || '{}'
      ]);

      console.log(`✅ Pagamento Stripe salvato - ID: ${paymentData.session_id}`);
      return result;

    } catch (error) {
      console.error('❌ Errore salvataggio pagamento Stripe:', error.message);
      throw error;
    }
  }

  /**
   * Salva attivazione licenza con validazione e retry
   * @param {Object} licenseData - Dati licenza
   * @returns {Promise} Risultato inserimento
   */
  async saveLicenseActivation(licenseData) {
    const requiredFields = ['license_key'];

    // Valida dati
    const validation = this.validateData(licenseData, requiredFields);
    if (!validation.isValid) {
      throw new Error(`Dati licenza non validi: ${validation.errors.join(', ')}`);
    }

    const now = new Date().toISOString();

    try {
      const result = await this.runWithRetry(`
        INSERT OR REPLACE INTO license_activations (
          license_key, email, session_id, stripe_session_id,
          product_type, created_at, payment_status, is_active,
          features_enabled
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        licenseData.license_key,
        licenseData.email || 'unknown',
        licenseData.session_id || null,
        licenseData.stripe_session_id || null,
        licenseData.product_type || 'wkf-suite-pro',
        now,
        licenseData.payment_status || 'paid',
        licenseData.is_active !== undefined ? licenseData.is_active : 1,
        licenseData.features_enabled || 'email_notifications,advanced_analytics,pdf_reports'
      ]);

      console.log(`✅ Attivazione licenza salvata - Key: ${licenseData.license_key.substring(0, 12)}...`);
      return result;

    } catch (error) {
      console.error('❌ Errore salvataggio attivazione licenza:', error.message);
      throw error;
    }
  }

  /**
   * Controlla se un pagamento esiste già
   * @param {string} sessionId - ID sessione Stripe
   * @returns {Promise} Record esistente o null
   */
  async checkExistingPayment(sessionId) {
    if (!sessionId) {
      throw new Error('session_id richiesto');
    }

    try {
      const result = await this.getWithRetry(
        `SELECT license_key, created_at, payment_status FROM stripe_payments WHERE session_id = ?`,
        [sessionId]
      );

      return result || null;

    } catch (error) {
      console.error('❌ Errore controllo pagamento esistente:', error.message);
      throw error;
    }
  }

  /**
   * Transazione sicura per operazioni multiple
   * @param {Function} operations - Funzioni da eseguire in transazione
   * @returns {Promise} Risultato transazione
   */
  async transaction(operations) {
    return new Promise(async (resolve, reject) => {
      try {
        await this.runWithRetry('BEGIN TRANSACTION');

        const result = await operations(this);

        await this.runWithRetry('COMMIT');
        resolve(result);

      } catch (error) {
        try {
          await this.runWithRetry('ROLLBACK');
          console.log('🔄 Transazione rollback completato');
        } catch (rollbackError) {
          console.error('❌ Errore rollback:', rollbackError.message);
        }
        reject(error);
      }
    });
  }
}

module.exports = DatabaseUtils;
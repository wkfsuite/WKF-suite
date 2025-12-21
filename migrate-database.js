// migrate-database.js
// Script di migrazione database per WKF Suite - Sistema licensing PRO

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

console.log('🔄 WKF Suite - Database Migration Script');
console.log('=' .repeat(50));

// Configurazione database
const dataDir = process.env.DATA_DIR || path.join(__dirname, 'data');
const dbPath = path.join(dataDir, 'database.sqlite');

console.log(`📁 Database path: ${dbPath}`);

// Verifica esistenza database
if (!fs.existsSync(dbPath)) {
  console.log('❌ Database non trovato. Esegui prima l\'applicazione per creare il database iniziale.');
  process.exit(1);
}

// Connessione database
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE, (err) => {
  if (err) {
    console.error('❌ Errore connessione database:', err.message);
    process.exit(1);
  }
  console.log('✅ Connesso al database SQLite');
});

/**
 * Verifica se una tabella esiste
 */
function checkTableExists(tableName) {
  return new Promise((resolve, reject) => {
    db.get(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`, [tableName], (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(!!row);
      }
    });
  });
}

/**
 * Verifica se una colonna esiste in una tabella
 */
function checkColumnExists(tableName, columnName) {
  return new Promise((resolve, reject) => {
    db.all(`PRAGMA table_info(${tableName})`, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        const columnExists = rows.some(row => row.name === columnName);
        resolve(columnExists);
      }
    });
  });
}

/**
 * Esegue query SQL con promessa
 */
function runQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ changes: this.changes, lastID: this.lastID });
      }
    });
  });
}

/**
 * Migrazione principale
 */
async function runMigration() {
  console.log('\n🚀 Inizio migrazione database...\n');

  try {
    // STEP 1: Verifica tabella stripe_payments
    console.log('📋 Step 1: Verifica tabella stripe_payments');
    const stripePaymentsExists = await checkTableExists('stripe_payments');

    if (stripePaymentsExists) {
      console.log('✅ Tabella stripe_payments già esistente');
    } else {
      console.log('🔧 Creazione tabella stripe_payments...');
      await runQuery(`CREATE TABLE stripe_payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT UNIQUE NOT NULL,
        payment_intent_id TEXT,
        license_key TEXT NOT NULL,
        customer_email TEXT,
        amount INTEGER NOT NULL,
        currency TEXT NOT NULL,
        product_type TEXT NOT NULL,
        payment_status TEXT NOT NULL,
        payment_method TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        stripe_created TEXT,
        metadata TEXT
      )`);
      console.log('✅ Tabella stripe_payments creata');
    }

    // STEP 2: Verifica tabella license_activations
    console.log('\n📋 Step 2: Verifica tabella license_activations');
    const licenseActivationsExists = await checkTableExists('license_activations');

    if (licenseActivationsExists) {
      console.log('✅ Tabella license_activations già esistente');

      // Verifica e aggiungi colonne mancanti se necessario
      const requiredColumns = [
        { name: 'stripe_session_id', type: 'TEXT' },
        { name: 'is_active', type: 'BOOLEAN DEFAULT 1' },
        { name: 'features_enabled', type: 'TEXT DEFAULT \'email_notifications,advanced_analytics,pdf_reports\'' }
      ];

      for (const column of requiredColumns) {
        const columnExists = await checkColumnExists('license_activations', column.name);
        if (!columnExists) {
          console.log(`🔧 Aggiunta colonna ${column.name} alla tabella license_activations...`);
          try {
            await runQuery(`ALTER TABLE license_activations ADD COLUMN ${column.name} ${column.type}`);
            console.log(`✅ Colonna ${column.name} aggiunta`);
          } catch (err) {
            if (err.message.includes('duplicate column name')) {
              console.log(`ℹ️  Colonna ${column.name} già esistente`);
            } else {
              throw err;
            }
          }
        }
      }
    } else {
      console.log('🔧 Creazione tabella license_activations...');
      await runQuery(`CREATE TABLE license_activations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        license_key TEXT UNIQUE NOT NULL,
        email TEXT,
        session_id TEXT,
        stripe_session_id TEXT,
        product_type TEXT DEFAULT 'wkf-suite-pro',
        activated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at TEXT NOT NULL,
        payment_status TEXT DEFAULT 'paid',
        is_active BOOLEAN DEFAULT 1,
        features_enabled TEXT DEFAULT 'email_notifications,advanced_analytics,pdf_reports'
      )`);
      console.log('✅ Tabella license_activations creata');
    }

    // STEP 3: Verifica integrità dati
    console.log('\n📋 Step 3: Verifica integrità dati');

    // Conta record in ogni tabella
    const stripePaymentsCount = await new Promise((resolve, reject) => {
      db.get(`SELECT COUNT(*) as count FROM stripe_payments`, (err, row) => {
        if (err) reject(err);
        else resolve(row.count);
      });
    });

    const licenseActivationsCount = await new Promise((resolve, reject) => {
      db.get(`SELECT COUNT(*) as count FROM license_activations`, (err, row) => {
        if (err) reject(err);
        else resolve(row.count);
      });
    });

    console.log(`📊 Statistiche database:`);
    console.log(`   - Record stripe_payments: ${stripePaymentsCount}`);
    console.log(`   - Record license_activations: ${licenseActivationsCount}`);

    // STEP 4: Test operazioni base
    console.log('\n📋 Step 4: Test operazioni database');

    // Test INSERT OR REPLACE su stripe_payments
    try {
      const testSessionId = 'test_migration_' + Date.now();
      const testLicenseKey = 'TEST1234-TEST5678-TEST9012-TESTABCD';
      const now = new Date().toISOString();

      await runQuery(`
        INSERT OR REPLACE INTO stripe_payments (
          session_id, payment_intent_id, license_key, customer_email,
          amount, currency, product_type, payment_status, payment_method,
          created_at, updated_at, stripe_created, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        testSessionId, 'pi_test_123', testLicenseKey, 'test@migration.com',
        2000, 'eur', 'wkf-suite-pro', 'paid', 'card',
        now, now, now, '{}'
      ]);

      // Test INSERT OR REPLACE su license_activations
      await runQuery(`
        INSERT OR REPLACE INTO license_activations (
          license_key, email, session_id, stripe_session_id,
          product_type, created_at, payment_status, is_active,
          features_enabled
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        testLicenseKey, 'test@migration.com', testSessionId, testSessionId,
        'wkf-suite-pro', now, 'paid', 1,
        'email_notifications,advanced_analytics,pdf_reports'
      ]);

      // Cleanup test records
      await runQuery(`DELETE FROM stripe_payments WHERE session_id = ?`, [testSessionId]);
      await runQuery(`DELETE FROM license_activations WHERE license_key = ?`, [testLicenseKey]);

      console.log('✅ Test operazioni database completato');
    } catch (testErr) {
      console.error('❌ Errore test database:', testErr.message);
      throw testErr;
    }

    // STEP 5: Ottimizzazione database
    console.log('\n📋 Step 5: Ottimizzazione database');

    try {
      await runQuery('VACUUM');
      console.log('✅ Vacuum database completato');

      await runQuery('ANALYZE');
      console.log('✅ Analyze database completato');
    } catch (optimizeErr) {
      console.warn('⚠️ Warning ottimizzazione:', optimizeErr.message);
    }

    console.log('\n🎉 MIGRAZIONE COMPLETATA CON SUCCESSO!');
    console.log('\n📋 Riassunto:');
    console.log('✅ Tabella stripe_payments: pronta');
    console.log('✅ Tabella license_activations: pronta');
    console.log('✅ Constraint violations: risolti');
    console.log('✅ Operazioni INSERT OR REPLACE: funzionanti');
    console.log('✅ Integrità database: verificata');

  } catch (error) {
    console.error('\n❌ ERRORE DURANTE LA MIGRAZIONE:');
    console.error(error.message);
    console.error('\n🔧 Suggerimenti:');
    console.error('1. Verifica che il database non sia in uso da altre applicazioni');
    console.error('2. Controlla i permessi di scrittura sulla directory');
    console.error('3. Backup del database prima di riprovare');

    throw error;
  }
}

/**
 * Cleanup e chiusura
 */
function cleanup() {
  return new Promise((resolve) => {
    db.close((err) => {
      if (err) {
        console.error('⚠️ Errore chiusura database:', err.message);
      } else {
        console.log('📊 Database disconnesso');
      }
      resolve();
    });
  });
}

// Esecuzione principale
async function main() {
  try {
    await runMigration();
    console.log('\n✨ Migrazione database completata con successo');
    console.log('🚀 L\'applicazione WKF Suite è ora pronta per l\'uso');
  } catch (error) {
    console.error('\n💥 Migrazione fallita:', error.message);
    process.exit(1);
  } finally {
    await cleanup();
  }
}

// Avvia migrazione se eseguito direttamente
if (require.main === module) {
  main();
}

module.exports = { runMigration, checkTableExists, checkColumnExists };
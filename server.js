// server.js
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const cors = require('cors');
// Tornando a sqlite3 con asset inclusione manuale
const sqlite3 = require('sqlite3').verbose();
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const QRCode = require('qrcode');
const bcrypt = require('bcryptjs');
const https = require('https');
const http = require('http');
const nodemailer = require('nodemailer');
const multer = require('multer');
// ical-generator - DISABILITATO temporaneamente per problemi di compatibilità
// const ical = require('ical-generator');
const ServerMonitor = require('./monitor');
const LicenseManager = require('./license-manager');
const DatabaseUtils = require('./database-utils');

// Initialize license manager
const licenseManager = new LicenseManager();
console.log(`🔐 ${licenseManager.getAppTitle()} - License status initialized`);

const app = express();
const BASE_PORT = process.env.PORT || 3000;
const BASE_HTTPS_PORT = process.env.HTTPS_PORT || 8443;
// Forza IPv4 per evitare problemi con ::1 vs 127.0.0.1
const HOST = process.env.HOST || '0.0.0.0';
console.log('🌐 Server HOST binding:', HOST);

// Verifica se siamo in modalità PKG
if (process.pkg) {
  console.log('📦 Modalità PKG rilevata');
  console.log('📁 Directory exe:', path.dirname(process.execPath));
  console.log('📁 Working directory:', process.cwd());
}

// Verifica accesso rete mobile
function checkMobileAccess() {
  const localIP = getLocalIP();
  console.log('📱 CONTROLLO ACCESSO MOBILE:');
  console.log(`   - IP locale rilevato: ${localIP}`);
  console.log(`   - Server binding: ${HOST}`);
  
  if (HOST === '0.0.0.0') {
    console.log('✅ Server configurato per accesso esterno');
  } else {
    console.log('⚠️  Server potrebbe non essere accessibile da mobile');
  }
  
  // Controllo se siamo su Windows per suggerimenti specifici
  const isWindows = process.platform === 'win32';
  if (isWindows) {
    console.log('🪟 Sistema Windows rilevato');
    console.log('📋 SUGGERIMENTI PER MOBILE SU WINDOWS:');
    console.log('   1. Assicurati che PC e mobile siano sulla stessa rete Wi-Fi');
    console.log('   2. Aggiungi eccezione firewall Windows per questo programma');
    console.log('   3. Se non funziona, disabilita temporaneamente Windows Defender Firewall');
    console.log('   4. Su mobile usa HTTPS se disponibile per evitare errori di sicurezza');
    console.log('   5. Se continua a non funzionare, prova a disabilitare antivirus');
  } else {
    console.log('📋 SUGGERIMENTI PER MOBILE:');
    console.log('   1. Assicurati che PC e mobile siano sulla stessa rete Wi-Fi');
    console.log('   2. Disabilita temporaneamente firewall se necessario');
    console.log('   3. Su mobile usa HTTPS se disponibile per evitare errori di sicurezza');
  }
  
  console.log(`📱 URL da usare su mobile: http://${localIP}:${BASE_PORT}`);
}

// Inizializza il monitor
const monitor = new ServerMonitor();

// Funzione per trovare una porta disponibile
function findAvailablePort(startPort, maxAttempts = 10) {
  return new Promise((resolve, reject) => {
    let currentPort = startPort;
    let attempts = 0;
    
    function tryPort() {
      if (attempts >= maxAttempts) {
        reject(new Error(`Impossibile trovare porta disponibile dopo ${maxAttempts} tentativi`));
        return;
      }
      
      const server = require('net').createServer();
      server.listen(currentPort, HOST, () => {
        server.close(() => {
          resolve(currentPort);
        });
      });
      
      server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          attempts++;
          currentPort++;
          console.log(`⚠️  Porta ${currentPort - 1} occupata, provo ${currentPort}...`);
          tryPort();
        } else {
          reject(err);
        }
      });
    }
    
    tryPort();
  });
}

// === Middleware ===
// Configurazione CORS migliorata per mobile
app.use(cors({
  origin: function(origin, callback) {
    // Permette tutti i domini per sviluppo e mobile
    callback(null, true);
  },
  credentials: true, // Importante per le sessioni
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Cache-Control',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers'
  ],
  exposedHeaders: ['Content-Length', 'Content-Type', 'Set-Cookie'],
  optionsSuccessStatus: 200, // Per supporto browser mobile legacy
  preflightContinue: false,
  maxAge: 86400 // Cache preflight per 24 ore
}));

// Middleware aggiuntivo per gestire richieste preflight mobile
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS,HEAD');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With, Accept, Origin');
    res.header('Access-Control-Allow-Credentials', 'true');
    return res.sendStatus(200);
  }
  next();
});

app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Configurazione multer per upload file
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, 'public', 'assets');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Salva sempre come company-logo con estensione originale
    const ext = path.extname(file.originalname);
    cb(null, `company-logo${ext}`);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Solo file immagine sono consentiti'), false);
    }
  }
});

// Middleware di monitoring (deve essere prima degli altri route)
app.use(monitor.logRequest.bind(monitor));

// Middleware per migliorare connettività mobile
app.use((req, res, next) => {
  // Headers aggiuntivi per mobile
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('X-Content-Type-Options', 'nosniff');
  res.header('X-Frame-Options', 'SAMEORIGIN');

  // Cache control per risorse statiche mobile-friendly
  if (req.url.match(/\.(css|js|png|jpg|jpeg|gif|ico|svg)$/)) {
    res.header('Cache-Control', 'public, max-age=3600');
  } else {
    res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
  }

  // Gestione OPTIONS per CORS preflight mobile
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  next();
});

app.use(session({
  secret: 'permessi_super_secret',
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: false, // Importante: false per HTTP su rete locale
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 ore (default per admin, supervisore, segreteria)
  }
}));

// Middleware per timeout dipendenti (5 minuti)
app.use((req, res, next) => {
  if (req.session.user && req.session.user.ruolo === 'dipendente') {
    const now = Date.now();
    const fiveMinutesInMs = 5 * 60 * 1000; // 5 minuti in millisecondi

    // Se è la prima volta che viene impostata la sessione dipendente
    if (!req.session.dipendenteStartTime) {
      req.session.dipendenteStartTime = now;
    }

    // Controlla se sono passati più di 5 minuti
    const sessionDuration = now - req.session.dipendenteStartTime;
    if (sessionDuration > fiveMinutesInMs) {
      console.log(`🕐 Sessione dipendente ${req.session.user.username} scaduta dopo 5 minuti`);

      // Distruggi la sessione
      req.session.destroy((err) => {
        if (err) {
          console.error('Errore durante la distruzione della sessione dipendente:', err);
        }
      });

      res.clearCookie('connect.sid');

      // Se è una richiesta API, restituisce un errore JSON
      if (req.path.startsWith('/api/')) {
        return res.status(401).json({
          error: 'Sessione scaduta. I dipendenti possono rimanere connessi solo per 5 minuti.',
          timeout: true
        });
      }

      // Altrimenti reindirizza al login
      return res.redirect('/login.html?timeout=dipendente');
    }
  }
  next();
});
// Serve file statici con supporto PKG - RILEVAMENTO CORRETTO
let publicDir;
const isPKGForPublic = (process.pkg !== undefined) || (__dirname.includes('snapshot'));

if (isPKGForPublic) {
  // In modalità PKG, usa file esterni accanto all'exe
  publicDir = path.join(path.dirname(process.execPath), 'public');
  console.log('📦 Modalità PKG - usando file esterni accanto all\'exe');
  console.log(`   - Exe path: ${process.execPath}`);
  console.log(`   - Exe dir: ${path.dirname(process.execPath)}`);
} else {
  // Modalità normale di sviluppo
  publicDir = path.join(__dirname, 'public');
  console.log('🔧 Modalità sviluppo - usando file interni');
}
console.log('📁 Directory public finale:', publicDir);

// [FIX v1.1.1] Imposta MIME types corretti per file statici (fix PWA)
app.use(express.static(publicDir, {
  setHeaders: (res, path) => {
    if (path.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    }
    if (path.endsWith('.json')) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
    }
    if (path.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css; charset=utf-8');
    }
    if (path.endsWith('.html')) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
    }
    if (path.endsWith('.svg')) {
      res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
    }
  }
}));

// === DB INIT ===
// Determina la cartella per il database con gestione ROBUSTA dei percorsi
function getDataDirectory() {
  let dataDir;
  
  // RILEVAMENTO AMBIENTE: PKG, Electron o sviluppo
  const isPKG = process.env.PKG_MODE === 'true' || process.pkg || __dirname.includes('snapshot');
  const isElectron = process.env.ELECTRON_MODE === 'true' || process.versions?.electron;
  
  console.log('🔍 DETERMINAZIONE DIRECTORY DATABASE...');
  console.log(`   - process.pkg: ${process.pkg ? 'SI (object presente)' : 'NO'}`);
  console.log(`   - __dirname: ${__dirname}`);
  console.log(`   - __dirname contiene snapshot: ${__dirname.includes('snapshot')}`);
  console.log(`   - process.execPath: ${process.execPath}`);
  console.log(`   - Modalità PKG rilevata: ${isPKG ? 'SI' : 'NO'}`);
  console.log(`   - Modalità Electron rilevata: ${isElectron ? 'SI' : 'NO'}`);

  if (isElectron) {
    // In modalità Electron, usa cartella fissa per evitare problemi con nomi package
    const os = require('os');
    const userDataPath = path.join(os.homedir(), 'AppData', 'Roaming', 'Gestione Permessi');
    dataDir = path.join(userDataPath, 'data');
    console.log('⚡ Modalità Electron, database in:', dataDir);
  } else if (isPKG) {
    // In modalità PKG (exe nativo), usa SEMPRE la directory dell'exe
    const exeDir = path.dirname(process.execPath);
    dataDir = path.join(exeDir, 'data');
    console.log('📦 Modalità PKG rilevata');
    console.log(`   - Directory EXE: ${exeDir}`);
    console.log(`   - Database sarà in: ${dataDir}`);
  } else {
    // In sviluppo o esecuzione diretta
    dataDir = path.join(__dirname, 'data');
    console.log('🔧 Modalità sviluppo, database in:', dataDir);
  }
  
  // CONTROLLI PRELIMINARI FONDAMENTALI
  console.log('🔍 CONTROLLI PRELIMINARI...');
  
  // 1. Verifica che la directory pubblic esista
  if (!fs.existsSync(publicDir)) {
    console.error(`❌ ERRORE CRITICO: Directory public non trovata: ${publicDir}`);
    console.error('🔧 SOLUZIONE: Assicurati che la cartella public sia presente accanto all\'exe');
    process.exit(1);
  } else {
    console.log('✅ Directory public verificata:', publicDir);
  }
  
  // 2. SEMPRE verifica e crea la directory database se non esiste
  try {
    if (!fs.existsSync(dataDir)) {
      console.log('📁 Directory database non esiste, creazione in corso...');
      fs.mkdirSync(dataDir, { recursive: true });
      console.log('✅ Directory database creata con successo:', dataDir);
    } else {
      console.log('✅ Directory database esiste già:', dataDir);
    }
    
    // 3. Test scrittura per verificare i permessi
    const testFile = path.join(dataDir, '.test-write');
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);
    console.log('✅ Test scrittura nella directory database: OK');
    
  } catch (error) {
    console.error(`❌ ERRORE CRITICO creazione/accesso directory database (${dataDir}):`, error.message);
    console.error('📋 Stack trace:', error.stack);
    
    // FALLBACK: usa temp directory come ultima risorsa
    const os = require('os');
    const fallbackDir = path.join(os.tmpdir(), 'gestione-permessi-fallback-' + Date.now());
    console.log(`🆘 Tentativo FALLBACK con directory temporanea: ${fallbackDir}`);
    
    try {
      fs.mkdirSync(fallbackDir, { recursive: true });
      dataDir = fallbackDir;
      console.log('✅ Directory fallback creata con successo:', fallbackDir);
    } catch (fallbackError) {
      console.error('❌ ERRORE FATALE: Impossibile creare anche directory fallback:', fallbackError.message);
      throw new Error(`ERRORE CRITICO: Impossibile creare directory per database. Ultimo tentativo fallito: ${fallbackError.message}`);
    }
  }
  
  return dataDir;
}

const dataDir = getDataDirectory();

console.log('');
console.log('=' .repeat(60));
console.log('🗄️  CONFIGURAZIONE DATABASE FINALE');
console.log('=' .repeat(60));
console.log(`📂 Directory: ${dataDir}`);
const dbPath = path.join(dataDir, 'database.sqlite');
console.log(`📄 File DB: ${dbPath}`);
console.log(`💾 Dimensione: ${fs.existsSync(dbPath) ? (fs.statSync(dbPath).size / 1024).toFixed(1) + ' KB' : 'Nuovo database'}`);
console.log('=' .repeat(60));
console.log('');

// Verifica se il database esiste, altrimenti lo crea vuoto
let needsInitialization = false;
if (!fs.existsSync(dbPath)) {
  console.log('🆕 Database non esistente, verrà creato e inizializzato');
  needsInitialization = true;
}

// Connessione sqlite3 standard con gestione errori migliorata
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ ERRORE CRITICO: Impossibile aprire/creare database:', err.message);
    process.exit(1);
  }
  console.log('✅ Database connesso correttamente:', dbPath);
});

// Inizializzazione database sqlite3 standard
db.serialize(async () => {
  console.log('🔧 Inizializzazione database in corso...');
  
  try {
    // 1. Tabella utenti
    await new Promise((resolve, reject) => {
      db.run(`CREATE TABLE IF NOT EXISTS utenti (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT,
        ruolo TEXT,
        matricola TEXT UNIQUE,
        password_reset_required INTEGER DEFAULT 0
      )`, (err) => {
        if (err) {
          console.error('❌ Errore creazione tabella utenti:', err.message);
          reject(err);
        } else {
          console.log('✅ Tabella utenti creata/verificata');
          resolve();
        }
      });
    });

    // 2. Verifica utenti esistenti
    const userCount = await new Promise((resolve, reject) => {
      db.get("SELECT COUNT(*) as count FROM utenti", (err, row) => {
        if (err) {
          console.error('❌ Errore verifica utenti esistenti:', err.message);
          reject(err);
        } else {
          resolve(row.count);
        }
      });
    });

    console.log(`👥 Utenti esistenti nel database: ${userCount}`);

    // DATABASE VUOTO PER TEST - NON CREARE UTENTI AUTOMATICAMENTE
    if (userCount === 0) {
      console.log('📋 Database vuoto rilevato');
      console.log('🔧 MODALITÀ TEST: Nessun utente predefinito creato');
      console.log('');
      console.log('🔑 Per creare il primo utente admin:');
      console.log('   1. Vai su http://localhost:3000/register.html'); 
      console.log('   2. Oppure usa l\'API: POST /api/register');
      console.log('');
    } else {
      console.log('ℹ️  Utenti esistenti trovati nel database');

      // Migration: Add password_reset_required column if it doesn't exist
      await new Promise((resolve, reject) => {
        db.run(`ALTER TABLE utenti ADD COLUMN password_reset_required INTEGER DEFAULT 0`, (err) => {
          if (err && !err.message.includes('duplicate column name')) {
            console.error('❌ Errore aggiornamento tabella utenti:', err.message);
            reject(err);
          } else {
            if (!err) {
              console.log('✅ Colonna password_reset_required aggiunta alla tabella utenti');
            }
            resolve();
          }
        });
      });
    }

    // 3. Tabella WiFi
    await new Promise((resolve, reject) => {
      db.run(`CREATE TABLE IF NOT EXISTS wifi (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        ssid TEXT,
        password TEXT
      )`, (err) => {
        if (err) {
          console.error('❌ Errore creazione tabella wifi:', err.message);
          reject(err);
        } else {
          console.log('✅ Tabella wifi creata/verificata');
          resolve();
        }
      });
    });

    // 4. Tabella richieste
    await new Promise((resolve, reject) => {
      db.run(`CREATE TABLE IF NOT EXISTS richieste (
        id TEXT PRIMARY KEY,
        nome TEXT,
        cognome TEXT,
        matricola TEXT,
        tipo TEXT,
        dal TEXT,
        al TEXT,
        data TEXT,
        dataInserimento TEXT,
        oraInizio TEXT,
        oraFine TEXT,
        ore TEXT,
        note TEXT,
        stato TEXT,
        retribuito INTEGER DEFAULT 0,
        daRecuperare INTEGER DEFAULT 0,
        nonRetribuito INTEGER DEFAULT 0,
        permessoSindacale INTEGER DEFAULT 0,
        inCFerie INTEGER DEFAULT 0,
        createdAt TEXT,
        updatedAt TEXT
      )`, (err) => {
        if (err) {
          console.error('❌ Errore creazione tabella richieste:', err.message);
          reject(err);
        } else {
          console.log('✅ Tabella richieste creata/verificata');
          resolve();
        }
      });
    });

    // 5. Aggiungi nuove colonne per tipi di permesso se non esistono
    const alterTableQueries = [
      'ALTER TABLE richieste ADD COLUMN retribuito INTEGER DEFAULT 0',
      'ALTER TABLE richieste ADD COLUMN daRecuperare INTEGER DEFAULT 0',
      'ALTER TABLE richieste ADD COLUMN nonRetribuito INTEGER DEFAULT 0',
      'ALTER TABLE richieste ADD COLUMN permessoSindacale INTEGER DEFAULT 0',
      'ALTER TABLE richieste ADD COLUMN inCFerie INTEGER DEFAULT 0',
      'ALTER TABLE utenti ADD COLUMN email TEXT'
    ];

    // 6. Crea tabella per reset password
    await new Promise((resolve, reject) => {
      db.run(`CREATE TABLE IF NOT EXISTS password_resets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        email TEXT NOT NULL,
        token TEXT UNIQUE NOT NULL,
        created_at TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        sent BOOLEAN DEFAULT FALSE,
        FOREIGN KEY(user_id) REFERENCES utenti(id)
      )`, (err) => {
        if (err) {
          console.error('❌ Errore creazione tabella password_resets:', err.message);
          reject(err);
        } else {
          console.log('✅ Tabella password_resets creata/verificata');
          resolve();
        }
      });
    });

    // 7. Crea tabella per coda email
    await new Promise((resolve, reject) => {
      db.run(`CREATE TABLE IF NOT EXISTS email_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        to_email TEXT NOT NULL,
        subject TEXT NOT NULL,
        body TEXT NOT NULL,
        type TEXT NOT NULL,
        created_at TEXT NOT NULL,
        sent BOOLEAN DEFAULT FALSE,
        sent_at TEXT,
        error TEXT
      )`, (err) => {
        if (err) {
          console.error('❌ Errore creazione tabella email_queue:', err.message);
          reject(err);
        } else {
          console.log('✅ Tabella email_queue creata/verificata');
          resolve();
        }
      });
    });

    // 8. Crea tabella per configurazioni email SMTP
    await new Promise((resolve, reject) => {
      db.run(`CREATE TABLE IF NOT EXISTS email_config (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        smtp_host TEXT,
        smtp_port INTEGER DEFAULT 587,
        smtp_secure BOOLEAN DEFAULT FALSE,
        smtp_user TEXT,
        smtp_password TEXT,
        from_email TEXT,
        from_name TEXT DEFAULT 'Sistema Gestione Permessi',
        enabled BOOLEAN DEFAULT FALSE
      )`, (err) => {
        if (err) {
          console.error('❌ Errore creazione tabella email_config:', err.message);
          reject(err);
        } else {
          console.log('✅ Tabella email_config creata/verificata');
          resolve();
        }
      });
    });

    // 9. Crea tabella per impostazioni azienda
    await new Promise((resolve, reject) => {
      db.run(`CREATE TABLE IF NOT EXISTS company_settings (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        company_name TEXT DEFAULT 'WKF Suite',
        logo_path TEXT,
        notification_email TEXT,
        standard_vacation_days INTEGER DEFAULT 22
      )`, (err) => {
        if (err) {
          console.error('❌ Errore creazione tabella company_settings:', err.message);
          reject(err);
        } else {
          console.log('✅ Tabella company_settings creata/verificata');
          resolve();
        }
      });
    });

    // 10. Crea tabella per pagamenti Stripe
    await new Promise((resolve, reject) => {
      db.run(`CREATE TABLE IF NOT EXISTS stripe_payments (
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
      )`, (err) => {
        if (err) {
          console.error('❌ Errore creazione tabella stripe_payments:', err.message);
          reject(err);
        } else {
          console.log('✅ Tabella stripe_payments creata/verificata');
          resolve();
        }
      });
    });

    // 11. Crea tabella per attivazioni licenze (compatibilità)
    await new Promise((resolve, reject) => {
      db.run(`CREATE TABLE IF NOT EXISTS license_activations (
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
      )`, (err) => {
        if (err) {
          console.error('❌ Errore creazione tabella license_activations:', err.message);
          reject(err);
        } else {
          console.log('✅ Tabella license_activations creata/verificata');
          resolve();
        }
      });
    });

    for (const query of alterTableQueries) {
      try {
        await new Promise((resolve, reject) => {
          db.run(query, (err) => {
            if (err && !err.message.includes('duplicate column name')) {
              console.error(`⚠️  Errore ALTER TABLE: ${err.message}`);
            } else if (!err) {
              console.log('✅ Colonna aggiunta alla tabella richieste');
            }
            resolve();
          });
        });
      } catch (err) {
        // Ignora errori se la colonna esiste già
        console.log('ℹ️  Colonna probabilmente già esistente');
      }
    }

    console.log('🎉 Inizializzazione database completata con successo!');

    // Inizializza database utilities
    global.dbUtils = new DatabaseUtils(db);
    console.log('🔧 Database utilities inizializzate');

    schedulePeriodicCleanup();

  } catch (err) {
    console.error('❌ ERRORE CRITICO nella inizializzazione database:', err.message);
    console.error('📋 Stack trace:', err.stack);
    process.exit(1);
  }
});

// === MIDDLEWARE DI SICUREZZA ===
const requireAuth = (req, res, next) => {
  if (!req.session.user) {
    return res.status(401).json({ error: "Sessione scaduta - effettua il login" });
  }
  next();
};

const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.session.user) {
      return res.status(401).json({ error: "Sessione scaduta - effettua il login" });
    }
    if (!roles.includes(req.session.user.ruolo)) {
      return res.status(403).json({ error: "Non autorizzato per questo ruolo" });
    }
    next();
  };
};

// [FIX v1.1.1] Middleware per richiedere accesso Analytics e Mail (SOLO PRO)
const requirePro = (req, res, next) => {
  if (!req.session.user) {
    return res.status(401).json({ error: "Sessione scaduta - effettua il login" });
  }

  const isProActive = licenseManager.licenseStatus === 'PRO';

  // Solo utenti con licenza PRO attiva hanno accesso
  if (isProActive) {
    return next();
  }

  // Tutti gli altri (inclusi Admin FREE) non hanno accesso
  return res.status(403).json({
    error: "Funzionalità disponibile solo con licenza PRO",
    feature: "Analytics e Mail",
    upgradeUrl: "/upgrade.html"
  });
};

// === HTTPS REDIRECT MIDDLEWARE === (TEMPORANEAMENTE DISABILITATO PER TEST)
/*
app.use((req, res, next) => {
  // Rileva se è un dispositivo mobile
  const userAgent = req.headers['user-agent'] || '';
  const isMobile = /Mobile|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  
  // Se è mobile e usa HTTP, suggerisci HTTPS
  if (isMobile && req.headers['x-forwarded-proto'] !== 'https' && !req.secure) {
    const httpsUrl = `https://${req.headers.host.replace(':3000', ':8443')}${req.url}`;
    
    // Per richieste API, restituisci un messaggio
    if (req.path.startsWith('/api/')) {
      return res.status(426).json({
        error: 'HTTPS Richiesto per Mobile',
        message: 'I dispositivi mobili richiedono HTTPS per motivi di sicurezza',
        httpsUrl: httpsUrl,
        instructions: 'Usa https://192.168.1.51:8443 invece di http://192.168.1.51:3000'
      });
    }
    
    // Per le pagine, mostra un redirect page
    return res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Redirect HTTPS Richiesto</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; background: #1a1a2e; color: white; text-align: center; }
          .container { max-width: 500px; margin: 50px auto; padding: 20px; background: #2d2d44; border-radius: 10px; }
          .warning { color: #f1c40f; font-size: 24px; margin-bottom: 20px; }
          .btn { background: #4f7cff; color: white; padding: 15px 30px; border: none; border-radius: 8px; font-size: 18px; text-decoration: none; display: inline-block; margin: 10px; }
          .btn:hover { background: #3d63cc; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="warning">⚠️</div>
          <h2>HTTPS Richiesto</h2>
          <p>I dispositivi mobili richiedono una connessione sicura (HTTPS) per accedere al sistema.</p>
          <p>Clicca il pulsante qui sotto per accedere alla versione sicura:</p>
          <a href="${httpsUrl}" class="btn">🔒 Vai a HTTPS</a>
          <p style="margin-top: 30px; font-size: 12px; color: #9aa1b3;">
            Il browser mostrerà un avviso di sicurezza. Clicca "Avanzate" e poi "Procedi" per continuare.
          </p>
        </div>
        <script>
          // Redirect automatico dopo 3 secondi
          setTimeout(() => {
            window.location.href = '${httpsUrl}';
          }, 3000);
        </script>
      </body>
      </html>
    `);
  }
  
  next();
});
*/

// === API ===

// --- TEST ENDPOINT per connettività mobile ---
app.get('/api/test', (req, res) => {
  const clientIP = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'];
  const userAgent = req.headers['user-agent'] || 'Unknown';

  res.json({
    success: true,
    message: 'Connessione OK',
    timestamp: new Date().toISOString(),
    clientIP: clientIP,
    userAgent: userAgent,
    mobile: /Mobile|Android|iPhone|iPad/.test(userAgent)
  });
});

// Endpoint di salute per mobile con timeout ridotto
app.get('/api/mobile/health', (req, res) => {
  const clientIP = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'];
  const userAgent = req.headers['user-agent'] || 'Unknown';
  const isMobile = /Mobile|Android|iPhone|iPad|BlackBerry|Opera Mini|Windows Phone/.test(userAgent);
  const serverIP = getLocalIP();

  res.json({
    success: true,
    message: 'Mobile connectivity OK',
    timestamp: new Date().toISOString(),
    serverInfo: {
      ip: serverIP,
      port: BASE_PORT,
      httpsPort: BASE_HTTPS_PORT,
      host: HOST
    },
    clientInfo: {
      ip: clientIP,
      userAgent: userAgent,
      mobile: isMobile
    },
    connectivity: {
      corsEnabled: true,
      sessionSupported: true,
      httpsAvailable: !!httpsOptions
    }
  });
});

// Endpoint di ping veloce per test connessione mobile
app.get('/api/ping', (req, res) => {
  res.json({
    pong: true,
    timestamp: Date.now(),
    mobile: /Mobile|Android|iPhone|iPad/.test(req.headers['user-agent'] || '')
  });
});

// === STRIPE PAYMENT ENDPOINTS ===

// 🔑 CONFIGURAZIONE STRIPE CENTRALIZZATA
// ⚠️ SICUREZZA: Chiavi caricate SOLO da variabili d'ambiente (.env)
// ❌ NON inserire MAI chiavi hardcoded in questo file!
const STRIPE_CONFIG = {
  secretKey: process.env.STRIPE_SECRET_KEY,
  publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  priceId: process.env.STRIPE_PRICE_ID,
  proPrice: parseInt(process.env.WKF_PRO_PRICE) || 2000, // 20 EUR in centesimi
  proCurrency: process.env.WKF_PRO_CURRENCY || 'eur'
};

// Inizializza Stripe globalmente
let stripe = null;
if (STRIPE_CONFIG.secretKey && !STRIPE_CONFIG.secretKey.includes('...')) {
  try {
    stripe = require('stripe')(STRIPE_CONFIG.secretKey);
    console.log('✅ Stripe inizializzato con successo');
  } catch (error) {
    console.error('❌ Errore inizializzazione Stripe:', error.message);
  }
} else {
  console.log('⚠️ Stripe non configurato - aggiorna le chiavi nel file .env');
}

// Endpoint per creare sessione di checkout Stripe
app.post('/api/create-checkout-session', async (req, res) => {
  try {
    const { productType, returnUrl } = req.body;

    // Verifica che Stripe sia inizializzato
    if (!stripe) {
      console.error('❌ Stripe non inizializzato - controlla le variabili d\'ambiente');
      return res.status(500).json({
        error: 'Stripe non configurato. Verifica le chiavi API nel file .env'
      });
    }

    // Configurazione prodotti
    const products = {
      'wkf-suite-pro': {
        name: 'WKF Suite PRO',
        description: 'Upgrade a WKF Suite PRO - Funzionalità avanzate',
        amount: STRIPE_CONFIG.proPrice,
        currency: STRIPE_CONFIG.proCurrency
      }
    };

    const product = products[productType];
    if (!product) {
      return res.status(400).json({ error: 'Prodotto non valido' });
    }

    // Crea sessione Stripe Checkout
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: product.currency,
            product_data: {
              name: product.name,
              description: product.description,
            },
            unit_amount: product.amount,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${returnUrl}?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${returnUrl}?payment=cancelled`,
      metadata: {
        product_type: productType,
        app_version: '1.0.0'
      },
      customer_email: req.session.user?.email, // Se l'utente è loggato
    });

    res.json({
      sessionId: session.id,
      url: session.url
    });

  } catch (error) {
    console.error('❌ Errore creazione sessione Stripe:', error);
    res.status(500).json({
      error: 'Errore interno del server',
      details: error.message
    });
  }
});

// Endpoint per verificare stato pagamento
app.get('/api/verify-payment/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;

    // Verifica che Stripe sia inizializzato
    if (!stripe) {
      return res.status(500).json({ error: 'Stripe non configurato' });
    }

    // Recupera sessione
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status === 'paid') {
      // Dichiara licenseKey fuori dal try block per renderla accessibile nella response
      let licenseKey;

      try {
        // Usa database utilities per gestione robusta
        const existingPayment = await global.dbUtils.checkExistingPayment(sessionId);

        if (existingPayment) {
          // Pagamento già processato, usa la license key esistente
          licenseKey = existingPayment.license_key;
          console.log(`♻️ Pagamento già processato, riutilizzo license key: ${licenseKey.substring(0, 12)}...`);
        } else {
          // Nuovo pagamento, esegui in transazione per consistenza
          const customerEmail = session.customer_details?.email || 'unknown';
          licenseKey = generateLicenseKey(customerEmail);
          console.log(`🆕 Nuovo pagamento, genera license key: ${licenseKey.substring(0, 12)}...`);

          await global.dbUtils.transaction(async (dbUtils) => {
            // Salva pagamento Stripe
            await dbUtils.saveStripePayment({
              session_id: sessionId,
              payment_intent_id: session.payment_intent || null,
              license_key: licenseKey,
              customer_email: session.customer_details?.email || 'unknown',
              amount: session.amount_total || 0,
              currency: session.currency || 'eur',
              product_type: session.metadata?.product_type || 'wkf-suite-pro',
              payment_status: session.payment_status,
              payment_method: session.payment_method_types?.[0] || 'card',
              stripe_created: session.created ? new Date(session.created * 1000).toISOString() : null,
              metadata: JSON.stringify(session.metadata || {})
            });

            // Salva attivazione licenza
            await dbUtils.saveLicenseActivation({
              license_key: licenseKey,
              email: session.customer_details?.email || 'unknown',
              session_id: sessionId,
              stripe_session_id: sessionId,
              product_type: session.metadata?.product_type || 'wkf-suite-pro',
              payment_status: 'paid',
              is_active: 1,
              features_enabled: 'email_notifications,advanced_analytics,pdf_reports'
            });
          });

          console.log('✅ Pagamento e licenza salvati con successo in transazione');
        }
      } catch (dbError) {
        console.error('❌ Errore critico database:', dbError);
        return res.status(500).json({
          error: 'Errore salvataggio pagamento',
          details: dbError.message,
          suggestion: 'Riprova tra qualche secondo. Se il problema persiste, contatta il supporto.'
        });
      }

      res.json({
        success: true,
        licenseKey: licenseKey,
        email: session.customer_details?.email,
        amount: session.amount_total,
        currency: session.currency
      });
    } else {
      res.json({
        success: false,
        status: session.payment_status
      });
    }

  } catch (error) {
    console.error('❌ Errore verifica pagamento:', error);
    res.status(500).json({ error: 'Errore verifica pagamento' });
  }
});

// Endpoint webhook per Stripe (per ricevere eventi dal server Stripe)
app.post('/api/stripe-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];

  try {
    if (!stripe || !STRIPE_CONFIG.webhookSecret) {
      console.log('⚠️ Webhook Stripe chiamato ma non configurato');
      return res.status(400).send('Webhook non configurato');
    }

    // Verifica signature del webhook
    const event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_CONFIG.webhookSecret);

    console.log('📨 Webhook Stripe ricevuto:', event.type);

    // Gestisci eventi Stripe
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;
      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object);
        break;
      default:
        console.log(`Evento webhook non gestito: ${event.type}`);
    }

    res.json({ received: true });
  } catch (err) {
    console.error('❌ Errore webhook Stripe:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
});

// Handler per pagamento riuscito
async function handlePaymentSucceeded(paymentIntent) {
  console.log('✅ Pagamento riuscito:', paymentIntent.id);
  // Qui puoi aggiungere logica per inviare email, aggiornare database, etc.
}

// Handler per pagamento fallito
async function handlePaymentFailed(paymentIntent) {
  console.log('❌ Pagamento fallito:', paymentIntent.id);
  console.log('Motivo:', paymentIntent.last_payment_error?.message);
}

// Handler per checkout session completata
async function handleCheckoutSessionCompleted(session) {
  console.log('🎉 Webhook - Checkout completato:', session.id);

  if (session.payment_status === 'paid') {
    const customerEmail = session.customer_details?.email;

    try {
      // Usa database utilities per gestione robusta
      const existingPayment = await global.dbUtils.checkExistingPayment(session.id);

      let licenseKey;

      if (existingPayment) {
        // Pagamento già processato dal webhook o dall'endpoint verify-payment
        licenseKey = existingPayment.license_key;
        console.log(`♻️ Webhook - Pagamento già processato, license key: ${licenseKey.substring(0, 12)}...`);
      } else {
        // Nuovo pagamento, esegui in transazione per consistenza
        licenseKey = generateLicenseKey(customerEmail);
        console.log(`🆕 Webhook - Generazione license key ${licenseKey.substring(0, 12)}... per ${customerEmail}`);

        await global.dbUtils.transaction(async (dbUtils) => {
          // Salva pagamento Stripe
          await dbUtils.saveStripePayment({
            session_id: session.id,
            payment_intent_id: session.payment_intent || null,
            license_key: licenseKey,
            customer_email: customerEmail || 'unknown',
            amount: session.amount_total || 0,
            currency: session.currency || 'eur',
            product_type: session.metadata?.product_type || 'wkf-suite-pro',
            payment_status: session.payment_status,
            payment_method: session.payment_method_types?.[0] || 'card',
            stripe_created: session.created ? new Date(session.created * 1000).toISOString() : null,
            metadata: JSON.stringify(session.metadata || {})
          });

          // Salva attivazione licenza
          await dbUtils.saveLicenseActivation({
            license_key: licenseKey,
            email: customerEmail || 'unknown',
            session_id: session.id,
            stripe_session_id: session.id,
            product_type: session.metadata?.product_type || 'wkf-suite-pro',
            payment_status: 'paid',
            is_active: 1,
            features_enabled: 'email_notifications,advanced_analytics,pdf_reports'
          });
        });

        console.log('✅ Webhook - Pagamento e licenza salvati con successo in transazione');
      }

      // Qui potresti inviare email con la license key
      // await sendLicenseEmail(customerEmail, licenseKey);
      console.log(`📧 Webhook completato per ${customerEmail} - License: ${licenseKey.substring(0, 12)}...`);

    } catch (dbError) {
      console.error('❌ Webhook - Errore critico database:', dbError);
      // Non bloccare il webhook, ma logga l'errore
    }
  }
}

// Funzione per generare license key (usa il metodo corretto del LicenseManager)
function generateLicenseKey(customerEmail = 'unknown') {
  return LicenseManager.generateLicenseKey(customerEmail);
}

// Endpoint per ottenere la chiave pubblica Stripe
app.get('/api/stripe/public-key', (req, res) => {
  res.json({
    publicKey: STRIPE_CONFIG.publishableKey
  });
});

// Endpoint per visualizzare i pagamenti (solo admin)
app.get('/api/stripe/payments', requireRole(['admin']), (req, res) => {
  db.all(`
    SELECT
      id, session_id, license_key, customer_email,
      amount, currency, product_type, payment_status,
      payment_method, created_at, updated_at
    FROM stripe_payments
    ORDER BY created_at DESC
    LIMIT 100
  `, [], (err, rows) => {
    if (err) {
      console.error('❌ Errore recupero pagamenti:', err);
      return res.status(500).json({ error: 'Errore recupero pagamenti' });
    }

    // Formatta l'importo per la visualizzazione
    const payments = rows.map(row => ({
      ...row,
      amount_formatted: `${(row.amount / 100).toFixed(2)} ${row.currency.toUpperCase()}`,
      created_at_formatted: new Date(row.created_at).toLocaleString('it-IT')
    }));

    res.json({
      success: true,
      payments,
      total: payments.length
    });
  });
});

// Endpoint per statistiche pagamenti (solo admin)
app.get('/api/stripe/stats', requireRole(['admin']), (req, res) => {
  const queries = [
    'SELECT COUNT(*) as total_payments FROM stripe_payments WHERE payment_status = "paid"',
    'SELECT SUM(amount) as total_revenue FROM stripe_payments WHERE payment_status = "paid"',
    'SELECT COUNT(*) as pending_payments FROM stripe_payments WHERE payment_status != "paid"'
  ];

  Promise.all(queries.map(query =>
    new Promise((resolve, reject) => {
      db.get(query, [], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    })
  )).then(results => {
    res.json({
      success: true,
      stats: {
        totalPayments: results[0].total_payments || 0,
        totalRevenue: (results[1].total_revenue || 0) / 100, // Convert from cents
        pendingPayments: results[2].pending_payments || 0
      }
    });
  }).catch(err => {
    console.error('❌ Errore statistiche pagamenti:', err);
    res.status(500).json({ error: 'Errore recupero statistiche' });
  });
});

// --- REGISTER ---
// === MONITORING ENDPOINTS ===
// Endpoint per statistiche di monitoring
app.get('/api/monitor/stats', requireRole(['admin']), (req, res) => {
  res.json(monitor.getStats());
});

// Endpoint per log del monitor
app.get('/api/monitor/logs', requireRole(['admin']), (req, res) => {
  try {
    // Log path detection - Stesso logic del monitor.js
    let logFile;
    const isPKG = process.env.PKG_MODE === 'true' || process.pkg || __dirname.includes('snapshot');
    const isElectron = process.env.ELECTRON_MODE === 'true' || process.versions?.electron;

    if (isPKG) {
      // PKG standalone: log nella directory dell'exe
      const exeDir = path.dirname(process.execPath);
      logFile = path.join(exeDir, 'monitor.log');

      // Se non esiste, prova anche in temp directory
      if (!fs.existsSync(logFile)) {
        const os = require('os');
        const tempLogFile = path.join(os.tmpdir(), 'gestione-permessi', 'monitor.log');
        if (fs.existsSync(tempLogFile)) {
          logFile = tempLogFile;
        }
      }
    } else if (isElectron) {
      // Electron: directory utente
      const os = require('os');
      const userDataPath = path.join(os.homedir(), 'AppData', 'Roaming', 'Gestione Permessi');
      logFile = path.join(userDataPath, 'monitor.log');
    } else {
      // Modalità sviluppo: subdirectory logs
      logFile = path.join(__dirname, 'logs', 'monitor.log');
    }
    if (fs.existsSync(logFile)) {
      const logs = fs.readFileSync(logFile, 'utf8').split('\n').slice(-100); // Ultimi 100 log
      res.json({ logs });
    } else {
      res.json({ logs: [] });
    }
  } catch (error) {
    monitor.logError(error);
    res.status(500).json({ error: 'Errore lettura logs' });
  }
});

// === API ENDPOINTS ===
app.post("/api/register", async (req, res) => {
  try {
    const { username, password, ruolo, matricola, email } = req.body;
    
    // Validazioni base
    if (!username || !password || !ruolo || !matricola) {
      return res.status(400).json({ 
        error: "Tutti i campi sono obbligatori",
        details: "Username, password, ruolo e matricola sono richiesti"
      });
    }

    // Validazione tipi
    if (typeof username !== 'string' || typeof password !== 'string' || 
        typeof ruolo !== 'string' || typeof matricola !== 'string') {
      return res.status(400).json({ 
        error: "Formato dati non valido",
        details: "Tutti i campi devono essere stringhe"
      });
    }

    // Validazione lunghezze e formati
    if (username.trim().length < 3) {
      return res.status(400).json({ 
        error: "Username troppo corto",
        details: "Username deve essere almeno 3 caratteri"
      });
    }

    if (password.length < 8) {
      return res.status(400).json({ 
        error: "Password non sicura",
        details: "Password deve essere almeno 8 caratteri"
      });
    }

    if (!/^[A-Za-z0-9]+$/.test(matricola.trim())) {
      return res.status(400).json({ 
        error: "Matricola non valida",
        details: "Matricola può contenere solo lettere e numeri"
      });
    }

    const validRoles = ['admin', 'segreteria', 'supervisore', 'dipendente'];
    if (!validRoles.includes(ruolo)) {
      return res.status(400).json({
        error: "Ruolo non valido",
        details: `Ruoli permessi: ${validRoles.join(', ')}`
      });
    }

    // Validazione email opzionale
    if (email && email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        return res.status(400).json({
          error: "Email non valida",
          details: "Inserisci un indirizzo email valido"
        });
      }
    }

    // Controllo unicità admin
    if (ruolo === 'admin') {
      // Prima verifica se esiste già un admin
      db.get("SELECT id FROM utenti WHERE ruolo = 'admin'", (err, existingAdmin) => {
        if (err) {
          console.error('Errore controllo admin esistente:', err);
          return res.status(500).json({ 
            error: "Errore interno del server",
            details: "Riprova più tardi"
          });
        }
        
        if (existingAdmin) {
          return res.status(409).json({ 
            error: "Admin già esistente",
            details: "Può esistere solo un admin nel sistema"
          });
        }
        
        // Se non esiste admin, procedi con la registrazione
        registraUtente();
      });
    } else {
      // Per altri ruoli, procedi direttamente
      registraUtente();
    }

    // Funzione interna per registrare l'utente
    async function registraUtente() {
      try {
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        const emailValue = email && email.trim() ? email.trim().toLowerCase() : null;
        const sql = `INSERT INTO utenti (username, password, ruolo, matricola, email) VALUES (?,?,?,?,?)`;
        db.run(sql, [username.trim(), hashedPassword, ruolo, matricola.trim().toUpperCase(), emailValue], function (err) {
          if (err) {
            if (err.message.includes("UNIQUE constraint failed: utenti.username")) {
              return res.status(409).json({ 
                error: "Username già esistente",
                details: "Scegli un username diverso"
              });
            }
            if (err.message.includes("UNIQUE constraint failed: utenti.matricola")) {
              return res.status(409).json({ 
                error: "Matricola già esistente",
                details: "Questa matricola è già registrata"
              });
            }
            console.error('Errore registrazione:', err);
            return res.status(500).json({ 
              error: "Errore interno del server",
              details: "Riprova più tardi"
            });
          }
          
          res.status(201).json({ 
            success: true,
            message: "Registrazione completata con successo", 
            user: { username: username.trim(), ruolo, matricola: matricola.trim().toUpperCase() }
          });
        });
        
      } catch (error) {
        console.error('Errore hash password:', error);
        res.status(500).json({ 
          error: "Errore interno del server",
          details: "Impossibile completare la registrazione"
        });
      }
    }
    
  } catch (error) {
    console.error('Errore generale registrazione:', error);
    res.status(500).json({ 
      error: "Errore interno del server",
      details: "Impossibile completare la registrazione"
    });
  }
});

// --- LOGIN ---
app.post("/api/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Validazioni input
    if (!username || !password) {
      return res.status(400).json({ 
        error: "Credenziali mancanti",
        details: "Username e password sono richiesti"
      });
    }

    if (typeof username !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ 
        error: "Formato credenziali non valido",
        details: "Username e password devono essere stringhe"
      });
    }

    if (username.trim().length === 0 || password.trim().length === 0) {
      return res.status(400).json({ 
        error: "Credenziali vuote",
        details: "Username e password non possono essere vuoti"
      });
    }

    // Cerca utente nel database
    db.get("SELECT * FROM utenti WHERE username = ?", [username.trim()], async (err, row) => {
      if (err) {
        console.error('Errore DB durante login:', err);
        return res.status(500).json({ 
          error: "Errore interno del server",
          details: "Riprova più tardi"
        });
      }
      
      if (!row) {
        return res.status(401).json({ 
          error: "Credenziali non valide",
          details: "Username o password errati"
        });
      }

      try {
        // Verifica password hashata
        const passwordMatch = await bcrypt.compare(password, row.password);
        
        if (!passwordMatch) {
          return res.status(401).json({ 
            error: "Credenziali non valide",
            details: "Username o password errati"
          });
        }

        // Crea sessione
        req.session.user = {
          id: row.id,
          username: row.username,
          ruolo: row.ruolo,
          matricola: row.matricola
        };

        // Salva esplicitamente la sessione prima di rispondere
        req.session.save((saveErr) => {
          if (saveErr) {
            console.error('Errore salvataggio sessione:', saveErr);
            return res.status(500).json({
              error: "Errore interno del server",
              details: "Impossibile salvare la sessione"
            });
          }

          // Verifica se l'utente deve cambiare password
          if (row.password_reset_required === 1) {
            return res.json({
              success: true,
              message: "Cambio password richiesto",
              ruolo: row.ruolo,
              userId: row.id,
              redirectTo: "/change-password.html",
              passwordResetRequired: true,
              username: row.username
            });
          }

          // Determina dashboard corretta
          let dashboardUrl = "/dashboardDipendente.html";
          if (['admin', 'supervisore', 'segreteria'].includes(row.ruolo)) {
            dashboardUrl = "/dashboard.html";
          }

          res.json({
            success: true,
            message: "Login effettuato con successo",
            ruolo: row.ruolo,
            userId: row.id,
            redirectTo: dashboardUrl,
            username: row.username
          });
        });
        
      } catch (bcryptErr) {
        console.error('Errore verifica password:', bcryptErr);
        return res.status(500).json({ 
          error: "Errore interno del server",
          details: "Impossibile verificare le credenziali"
        });
      }
    });
    
  } catch (error) {
    console.error('Errore generale login:', error);
    res.status(500).json({ 
      error: "Errore interno del server",
      details: "Impossibile completare il login"
    });
  }
});

// --- SESSION CHECK ---
app.get('/api/session-check', requireAuth, (req, res) => {
  res.json({
    authenticated: true,
    user: {
      id: req.session.user.id,
      username: req.session.user.username,
      ruolo: req.session.user.ruolo
    }
  });
});

// --- LOGOUT ---
app.post('/api/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Errore durante la distruzione della sessione:', err);
      return res.status(500).json({ error: "Errore durante il logout" });
    }
    res.clearCookie('connect.sid'); // Pulisce il cookie di sessione
    res.json({ message: "Logout effettuato" });
  });
});

// --- SESSIONE ---
app.get('/api/session', (req, res) => {
  res.json({ user: req.session.user || null });
});

// === WIFI (solo admin) ===
app.get('/api/wifi', requireRole(['admin']), (req, res) => {
  db.get("SELECT * FROM wifi WHERE id = 1", (err,row)=>{
    if(err) return res.status(500).json({error:"Errore DB"});
    res.json(row||{});
  });
});

app.post('/api/wifi', requireRole(['admin']), (req, res) => {
  const { ssid, password } = req.body;
  
  // Server-side validation
  if (!ssid || !password) {
    return res.status(400).json({ error: "SSID e password sono obbligatori" });
  }
  
  if (typeof ssid !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: "SSID e password devono essere stringhe" });
  }
  
  if (ssid.trim().length === 0) {
    return res.status(400).json({ error: "SSID non può essere vuoto" });
  }
  
  if (password.length < 8) {
    return res.status(400).json({ error: "Password WiFi deve essere almeno 8 caratteri" });
  }
  db.run(
    "INSERT INTO wifi (id, ssid, password) VALUES (1, ?, ?) ON CONFLICT(id) DO UPDATE SET ssid=excluded.ssid, password=excluded.password",
    [ssid, password],
    (err) => {
      if (err) return res.status(500).json({ error: "Errore salvataggio WiFi" });
      res.json({ success: true });
    }
  );
});

// === RICHIESTE ===
// Inserisci nuova richiesta
app.post('/api/richieste', requireAuth, (req, res) => {
  const payload = req.body || {};
  const userSession = req.session.user;

  const { tipo, dal, al, data, dataInserimento, oraInizio, oraFine, note, tipologia, retribuito, daRecuperare, nonRetribuito, permessoSindacale, inCFerie } = payload;
  const matricola = userSession.matricola;

  // Converti la tipologia in flag booleani
  let retribuitoFlag = 0, daRecuperareFlag = 0, nonRetribuitoFlag = 0, permessoSindacaleFlag = 0, inCFerieFlag = 0;

  if (tipologia) {
    switch (tipologia) {
      case 'retribuito':
        retribuitoFlag = 1;
        break;
      case 'da_recuperare':
        daRecuperareFlag = 1;
        break;
      case 'non_retribuito':
        nonRetribuitoFlag = 1;
        break;
      case 'permesso_sindacale':
        permessoSindacaleFlag = 1;
        break;
      case 'c_ferie':
        inCFerieFlag = 1;
        break;
      default:
        retribuitoFlag = 1; // Default a retribuito
    }
  } else {
    // Backward compatibility con i vecchi flag
    retribuitoFlag = retribuito ? 1 : 0;
    daRecuperareFlag = daRecuperare ? 1 : 0;
    nonRetribuitoFlag = nonRetribuito ? 1 : 0;
    permessoSindacaleFlag = permessoSindacale ? 1 : 0;
    inCFerieFlag = inCFerie ? 1 : 0;
  }
  if (!matricola) return res.status(400).json({ error: "Matricola mancante in sessione" });

  // Validazioni
  if (!tipo) return res.status(400).json({ error: "Tipo di permesso mancante" });
  if (tipo === 'piu_giorni' && !(dal && al)) {
    return res.status(400).json({ error: "Intervallo dal/al mancante" });
  }
  if (tipo === 'giornaliero' && !data) {
    return res.status(400).json({ error: "Data mancante per permesso giornaliero" });
  }
  if (tipo === 'ore' && !(data && oraInizio && oraFine)) {
    return res.status(400).json({ error: "Data e orari mancanti per permesso a ore" });
  }

  // Recupera nome e cognome (per ora usiamo username come nome)
  db.get("SELECT username AS nome, username AS cognome FROM utenti WHERE matricola = ?", [matricola], (err, userRow) => {
    if (err || !userRow) return res.status(500).json({ error: "Utente non trovato" });

    const nome = userRow.nome;
    const cognome = userRow.cognome;
    const oreCombined = oraInizio && oraFine ? `${oraInizio}-${oraFine}` : null;
    const createdAt = new Date().toISOString();

    const newId = uuidv4();
    db.run(
      `INSERT INTO richieste (id,nome,cognome,matricola,tipo,dal,al,data,oraInizio,oraFine,ore,note,stato,retribuito,daRecuperare,nonRetribuito,permessoSindacale,inCFerie,createdAt,updatedAt)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [newId,nome,cognome,matricola,tipo,dal,al,data,oraInizio,oraFine,oreCombined,note,"in attesa",retribuitoFlag,daRecuperareFlag,nonRetribuitoFlag,permessoSindacaleFlag,inCFerieFlag,createdAt,createdAt],
      async (err)=>{
        if(err) return res.status(500).json({error:"Errore DB"});

        // Notifica admin e supervisore della nuova richiesta (solo se WiFi connesso)
        try {
          await sendNotificationEmail(
            ['admin', 'supervisore'],
            'Nuova richiesta di permesso',
            `È stata inserita una nuova richiesta di permesso:\n\nDipendente: ${nome} ${cognome} (${matricola})\nTipo: ${tipo}\nPeriodo: ${dal} - ${al}\n\nAccedi al sistema per approvarla o rifiutarla.`,
            'new_request'
          );
        } catch (notifErr) {
          console.error('❌ Errore invio notifica nuova richiesta:', notifErr);
        }

        res.json({ success:true, id:newId });
      }
    );
  });
});

// Lista richieste mie
app.get('/api/richieste/mie', requireAuth, (req,res)=>{
  const { matricola } = req.session.user;
  db.all("SELECT * FROM richieste WHERE matricola=? ORDER BY createdAt DESC",[matricola],(err,rows)=>{
    if(err) return res.status(500).json({error:"Errore DB"});
    res.json(rows);
  });
});

// Lista tutte le richieste (per admin/supervisore) - SOLO DIPENDENTI
app.get('/api/richieste', requireRole(['admin', 'supervisore']), (req,res)=>{
  // Filtra solo richieste dei dipendenti
  const query = `
    SELECT r.*
    FROM richieste r
    INNER JOIN utenti u ON r.matricola = u.matricola
    WHERE u.ruolo = 'dipendente'
    ORDER BY r.createdAt DESC
  `;

  db.all(query, (err,rows)=>{
    if(err) {
      console.error('Errore caricamento richieste:', err);
      return res.status(500).json({error:"Errore DB"});
    }
    res.json(rows);
  });
});

// Aggiorna stato richiesta
app.patch('/api/richieste/:id', requireRole(['admin', 'supervisore']), (req,res)=>{
  const { stato } = req.body;
  db.run("UPDATE richieste SET stato=?, updatedAt=? WHERE id=?",[stato,new Date().toISOString(),req.params.id],(err)=>{
    if(err) return res.status(500).json({error:"Errore aggiornamento"});
    res.json({success:true});
  });
});

// Stampa richiesta (legacy)
app.get('/stampa/:id', requireAuth, (req,res)=>{
  db.get("SELECT * FROM richieste WHERE id=?",[req.params.id],(err,row)=>{
    if(err || !row) return res.status(404).send("Richiesta non trovata");
    // Verifica che il dipendente possa vedere solo le sue richieste
    if (req.session.user.ruolo === 'dipendente' && row.matricola !== req.session.user.matricola) {
      return res.status(403).send("Non autorizzato");
    }
    res.send(`
      <html>
      <head><title>Stampa Permesso</title></head>
      <body>
        <h2>Richiesta Permesso</h2>
        <p><b>Nome:</b> ${row.nome} ${row.cognome}</p>
        <p><b>Matricola:</b> ${row.matricola}</p>
        <p><b>Tipo:</b> ${row.tipo}</p>
        <p><b>Dal:</b> ${row.dal || '-'}</p>
        <p><b>Al:</b> ${row.al || '-'}</p>
        <p><b>Ore:</b> ${row.ore || '-'}</p>
        <p><b>Note:</b> ${row.note || '-'}</p>
        <p><b>Stato:</b> ${row.stato}</p>
        <p><b>Inserita il:</b> ${row.createdAt}</p>
        <div style="margin-top: 30px; text-align: center;">
          <p style="color: #999; font-size: 14px; margin-bottom: 10px;">💡 Usa Ctrl+P per stampare o salvare come PDF</p>
          <button onclick="window.close()" style="padding: 10px 20px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;">✖️ Chiudi</button>
        </div>
      </body>
      </html>
    `);
  });
});

// Endpoint per segreteria per inserire richieste per dipendenti
app.post('/api/richieste/segreteria', requireRole(['segreteria']), (req, res) => {
  const userSession = req.session.user;

  const { tipo, dal, al, data, dataInserimento, oraInizio, oraFine, note, matricolaDipendente, retribuito, daRecuperare, nonRetribuito, permessoSindacale, inCFerie } = req.body;
  
  if (!matricolaDipendente) {
    return res.status(400).json({ error: "Matricola dipendente mancante" });
  }

  // Validazioni
  if (!tipo) return res.status(400).json({ error: "Tipo di permesso mancante" });
  if (tipo === 'piu_giorni' && !(dal && al)) {
    return res.status(400).json({ error: "Intervallo dal/al mancante" });
  }
  if (tipo === 'giornaliero' && !data) {
    return res.status(400).json({ error: "Data mancante per permesso giornaliero" });
  }
  if (tipo === 'ore' && !(data && oraInizio && oraFine)) {
    return res.status(400).json({ error: "Data e orari mancanti per permesso a ore" });
  }

  // Verifica che il dipendente esista
  db.get("SELECT username FROM utenti WHERE matricola = ?", [matricolaDipendente], (err, userRow) => {
    if (err) return res.status(500).json({ error: "Errore DB" });
    if (!userRow) return res.status(404).json({ error: "Dipendente con questa matricola non trovato" });

    const nome = userRow.username;
    const cognome = userRow.username; // Per ora usiamo username come nome e cognome
    const oreCombined = oraInizio && oraFine ? `${oraInizio}-${oraFine}` : null;
    const createdAt = new Date().toISOString();
    const noteFinali = note + ` (Inserita da segreteria: ${userSession.username})`;

    const newId = uuidv4();
    db.run(
      `INSERT INTO richieste (id,nome,cognome,matricola,tipo,dal,al,data,oraInizio,oraFine,ore,note,stato,retribuito,daRecuperare,nonRetribuito,permessoSindacale,inCFerie,createdAt,updatedAt)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,'in attesa',?,?,?,?,?,?,?)`,
      [newId, nome, cognome, matricolaDipendente, tipo, dal, al, data, oraInizio, oraFine, oreCombined, noteFinali, retribuito?1:0, daRecuperare?1:0, nonRetribuito?1:0, permessoSindacale?1:0, inCFerie?1:0, createdAt, createdAt],
      async function(err) {
        if (err) {
          console.error("Errore inserimento richiesta segreteria:", err);
          return res.status(500).json({ error: "Errore inserimento richiesta" });
        }

        // Notifica admin e supervisore della nuova richiesta (solo se WiFi connesso)
        try {
          await sendNotificationEmail(
            ['admin', 'supervisore'],
            'Nuova richiesta di permesso (da segreteria)',
            `È stata inserita una nuova richiesta di permesso dalla segreteria:\n\nDipendente: ${nome} ${cognome} (${matricolaDipendente})\nTipo: ${tipo}\nPeriodo: ${dal} - ${al}\nInserita da: ${userSession.username}\n\nAccedi al sistema per approvarla o rifiutarla.`,
            'new_request_secretary'
          );
        } catch (notifErr) {
          console.error('❌ Errore invio notifica nuova richiesta segreteria:', notifErr);
        }

        res.json({ success: true, id: newId, message: "Richiesta inserita per il dipendente" });
      }
    );
  });
});

// Endpoint per ottenere tutte le richieste (admin/supervisore/segreteria)
// === NOTIFICATION ENDPOINTS ===

// API per ottenere notifiche non lette
app.get('/api/notifications', requireAuth, (req, res) => {
  const userSession = req.session.user;
  const { ruolo, matricola } = userSession;
  const lastCheck = req.query.lastCheck || '1970-01-01T00:00:00.000Z';

  if (ruolo === 'admin' || ruolo === 'supervisore') {
    // Notifiche per admin/supervisori: nuove richieste
    const query = `
      SELECT id, nome, cognome, tipo, stato, createdAt, updatedAt
      FROM richieste
      WHERE createdAt > ? AND stato = 'in attesa'
      ORDER BY createdAt DESC
    `;

    db.all(query, [lastCheck], (err, rows) => {
      if (err) {
        console.error('Errore fetch notifiche admin:', err);
        return res.status(500).json({ error: 'Errore database' });
      }

      const notifications = rows.map(row => ({
        id: row.id,
        type: 'new_request',
        title: 'Nuova Richiesta',
        message: `${row.nome} ${row.cognome} - ${row.tipo}`,
        timestamp: row.createdAt,
        data: { requestId: row.id }
      }));

      res.json({ notifications, lastCheck: new Date().toISOString() });
    });

  } else {
    // Notifiche per dipendenti: stato richieste cambiate
    const query = `
      SELECT id, tipo, stato, updatedAt
      FROM richieste
      WHERE matricola = ? AND updatedAt > ? AND stato != 'in attesa'
      ORDER BY updatedAt DESC
    `;

    db.all(query, [matricola, lastCheck], (err, rows) => {
      if (err) {
        console.error('Errore fetch notifiche dipendente:', err);
        return res.status(500).json({ error: 'Errore database' });
      }

      const notifications = rows.map(row => ({
        id: row.id,
        type: row.stato === 'approvata' ? 'approved' : 'rejected',
        title: row.stato === 'approvata' ? 'Permesso Approvato' : 'Permesso Rifiutato',
        message: `La tua richiesta ${row.tipo} è stata ${row.stato}`,
        timestamp: row.updatedAt,
        data: { requestId: row.id, status: row.stato }
      }));

      res.json({ notifications, lastCheck: new Date().toISOString() });
    });
  }
});

app.get('/api/richieste/tutte', requireRole(['admin', 'supervisore', 'segreteria']), (req, res) => {
  const userSession = req.session.user;

  // Query per ottenere solo richieste dei dipendenti (esclude admin/supervisore/segreteria)
  const query = `
    SELECT r.*
    FROM richieste r
    INNER JOIN utenti u ON r.matricola = u.matricola
    WHERE u.ruolo = 'dipendente'
    ORDER BY r.createdAt DESC
  `;

  db.all(query, (err, rows) => {
    if (err) {
      console.error('Errore caricamento richieste:', err);
      return res.status(500).json({ error: "Errore DB" });
    }
    res.json(rows || []);
  });
});

// Endpoint per approvare richiesta
app.put('/api/richieste/:id/approva', requireRole(['admin', 'supervisore']), (req, res) => {
  const userSession = req.session.user;

  const richiestaId = req.params.id;
  const now = new Date().toISOString();

  // Prima ottieni i dettagli della richiesta
  db.get("SELECT * FROM richieste WHERE id = ?", [richiestaId], (err, richiesta) => {
    if (err) return res.status(500).json({ error: "Errore DB" });
    if (!richiesta) return res.status(404).json({ error: "Richiesta non trovata" });

    db.run(
      "UPDATE richieste SET stato = ?, updatedAt = ? WHERE id = ?",
      ['approvata', now, richiestaId],
      async function(err) {
        if (err) return res.status(500).json({ error: "Errore DB" });
        if (this.changes === 0) return res.status(404).json({ error: "Richiesta non trovata" });

        // Notifica segreteria e dipendente dell'approvazione (solo se WiFi connesso)
        try {
          // Notifica dipendente tramite la sua email se l'ha
          db.get("SELECT email, username FROM utenti WHERE matricola = ?", [richiesta.matricola], async (err, employee) => {
            if (!err && employee && employee.email) {
              await addToEmailQueue(
                employee.email,
                'Permesso approvato',
                `La tua richiesta di permesso è stata approvata:\n\nTipo: ${richiesta.tipo}\nPeriodo: ${richiesta.dal} - ${richiesta.al}\nApprovata da: ${userSession.username}`,
                'request_approved'
              );
            }
          });

          // Notifica segreteria
          await sendNotificationEmail(
            ['segreteria'],
            'Permesso approvato',
            `È stato approvato un permesso:\n\nDipendente: ${richiesta.nome} ${richiesta.cognome} (${richiesta.matricola})\nTipo: ${richiesta.tipo}\nPeriodo: ${richiesta.dal} - ${richiesta.al}\nApprovato da: ${userSession.username}`,
            'request_approved_secretary'
          );
        } catch (notifErr) {
          console.error('❌ Errore invio notifica approvazione:', notifErr);
        }

        res.json({ message: "Richiesta approvata" });
      }
    );
  });
});

// Endpoint per rifiutare richiesta
app.put('/api/richieste/:id/rifiuta', requireRole(['admin', 'supervisore']), (req, res) => {
  const userSession = req.session.user;

  const richiestaId = req.params.id;
  const { motivo } = req.body;
  const now = new Date().toISOString();

  // Prima ottieni i dettagli della richiesta
  db.get("SELECT * FROM richieste WHERE id = ?", [richiestaId], (err, richiesta) => {
    if (err) return res.status(500).json({ error: "Errore DB" });
    if (!richiesta) return res.status(404).json({ error: "Richiesta non trovata" });

    // Aggiorna lo stato e opzionalmente il motivo del rifiuto nelle note
    const noteFinali = motivo ? `RIFIUTATA - Motivo: ${motivo}` : 'RIFIUTATA';

    db.run(
      "UPDATE richieste SET stato = ?, updatedAt = ?, note = ? WHERE id = ?",
      ['rifiutata', now, noteFinali, richiestaId],
      async function(err) {
        if (err) return res.status(500).json({ error: "Errore DB" });
        if (this.changes === 0) return res.status(404).json({ error: "Richiesta non trovata" });

        // Notifica segreteria e dipendente del rifiuto (solo se WiFi connesso)
        try {
          // Notifica dipendente tramite la sua email se l'ha
          db.get("SELECT email, username FROM utenti WHERE matricola = ?", [richiesta.matricola], async (err, employee) => {
            if (!err && employee && employee.email) {
              await addToEmailQueue(
                employee.email,
                'Permesso rifiutato',
                `La tua richiesta di permesso è stata rifiutata:\n\nTipo: ${richiesta.tipo}\nPeriodo: ${richiesta.dal} - ${richiesta.al}\nRifiutata da: ${userSession.username}${motivo ? `\nMotivo: ${motivo}` : ''}`,
                'request_rejected'
              );
            }
          });

          // Notifica segreteria
          await sendNotificationEmail(
            ['segreteria'],
            'Permesso rifiutato',
            `È stato rifiutato un permesso:\n\nDipendente: ${richiesta.nome} ${richiesta.cognome} (${richiesta.matricola})\nTipo: ${richiesta.tipo}\nPeriodo: ${richiesta.dal} - ${richiesta.al}\nRifiutato da: ${userSession.username}${motivo ? `\nMotivo: ${motivo}` : ''}`,
            'request_rejected_secretary'
          );
        } catch (notifErr) {
          console.error('❌ Errore invio notifica rifiuto:', notifErr);
        }

        res.json({ message: "Richiesta rifiutata" });
      }
    );
  });
});

// Endpoint per generare QR code WiFi
app.get('/api/wifi/qrcode', requireRole(['admin', 'supervisore', 'segreteria']), (req, res) => {
  const userSession = req.session.user;

  // Recupera credenziali WiFi dal database
  db.get("SELECT * FROM wifi WHERE id = 1", async (err, row) => {
    if (err) return res.status(500).json({ error: "Errore DB" });
    if (!row || !row.ssid || !row.password) {
      return res.status(404).json({ error: "Credenziali WiFi non configurate. Vai su Configurazione WiFi prima." });
    }

    try {
      // Formato standard WiFi QR Code
      // WIFI:T:WPA;S:SSID;P:password;H:false;;
      const wifiString = `WIFI:T:WPA;S:${row.ssid};P:${row.password};H:false;;`;
      
      // Genera QR code
      const qrCodeDataURL = await QRCode.toDataURL(wifiString, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      res.json({
        success: true,
        qrcode: qrCodeDataURL,
        ssid: row.ssid,
        message: "QR code generato con successo"
      });

    } catch (error) {
      console.error('Errore generazione QR code:', error);
      res.status(500).json({ error: "Errore generazione QR code" });
    }
  });
});

// Endpoint per generare QR code connessione browser
app.get('/api/browser/qrcode', requireRole(['admin', 'supervisore', 'segreteria']), async (req, res) => {
  try {
    const localIP = getLocalIP();
    const httpsPort = BASE_HTTPS_PORT;
    const httpPort = BASE_PORT;

    // Preferisci HTTPS se disponibile, altrimenti HTTP con percorso completo
    const browserUrl = `https://${localIP}:${httpsPort}/index.html`;
    const fallbackUrl = `http://${localIP}:${httpPort}/index.html`;

    // Genera QR code per l'URL principale
    const qrCodeDataURL = await QRCode.toDataURL(browserUrl, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    res.json({
      success: true,
      qrcode: qrCodeDataURL,
      primaryUrl: browserUrl,
      fallbackUrl: fallbackUrl,
      message: "QR code per connessione browser generato con successo"
    });

  } catch (error) {
    console.error('Errore generazione QR code browser:', error);
    res.status(500).json({ error: "Errore generazione QR code browser" });
  }
});

// Endpoint per ottenere info WiFi (senza password per sicurezza)
app.get('/api/wifi/info', requireRole(['admin', 'supervisore', 'segreteria']), (req, res) => {
  const userSession = req.session.user;

  db.get("SELECT ssid FROM wifi WHERE id = 1", (err, row) => {
    if (err) return res.status(500).json({ error: "Errore DB" });
    res.json({
      configured: !!row,
      ssid: row ? row.ssid : null
    });
  });
});

// === EMAIL CONFIG (admin e supervisore) ===
// [FIX v1.1.1] Email config disponibile SOLO con PRO
app.get('/api/email-config', requirePro, (req, res) => {
  db.get("SELECT * FROM email_config WHERE id = 1", (err, config) => {
    if (err) return res.status(500).json({ error: "Errore DB" });

    // Non inviare la password per sicurezza
    if (config) {
      delete config.smtp_password;
    }

    res.json(config || {});
  });
});

// [FIX v1.1.1] Salva email config disponibile SOLO con PRO
app.post('/api/email-config', requirePro, (req, res) => {
  const { smtp_host, smtp_port, smtp_secure, smtp_user, smtp_password, from_email, from_name, enabled } = req.body;

  // Check if email notifications are available in current license
  if (enabled && !licenseManager.hasFeature('email_notifications')) {
    return res.status(403).json({
      error: "Funzione PRO richiesta",
      message: "L'invio di email è disponibile solo in WKF Suite PRO. È possibile configurare le impostazioni ma non abilitare l'invio.",
      upgradeUrl: "https://wkfsuite.com/upgrade"
    });
  }

  // Validazioni server-side
  if (enabled && (!smtp_host || !smtp_user || !smtp_password || !from_email)) {
    return res.status(400).json({ error: "Tutti i campi SMTP sono obbligatori quando abilitato" });
  }

  if (enabled && smtp_port && (isNaN(smtp_port) || smtp_port < 1 || smtp_port > 65535)) {
    return res.status(400).json({ error: "Porta SMTP non valida" });
  }

  if (enabled && from_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(from_email)) {
    return res.status(400).json({ error: "Email mittente non valida" });
  }

  const sql = `INSERT INTO email_config (id, smtp_host, smtp_port, smtp_secure, smtp_user, smtp_password, from_email, from_name, enabled)
               VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?)
               ON CONFLICT(id) DO UPDATE SET
               smtp_host=excluded.smtp_host,
               smtp_port=excluded.smtp_port,
               smtp_secure=excluded.smtp_secure,
               smtp_user=excluded.smtp_user,
               smtp_password=excluded.smtp_password,
               from_email=excluded.from_email,
               from_name=excluded.from_name,
               enabled=excluded.enabled`;

  db.run(sql, [
    smtp_host,
    smtp_port || 587,
    smtp_secure ? 1 : 0,
    smtp_user,
    smtp_password,
    from_email,
    from_name || 'Sistema Gestione Permessi',
    enabled ? 1 : 0
  ], (err) => {
    if (err) return res.status(500).json({ error: "Errore salvataggio configurazione email" });
    res.json({ success: true });
  });
});

// [FIX v1.1.1] Test email disponibile SOLO con PRO
app.post('/api/email-config/test', requirePro, async (req, res) => {
  try {
    // Check if email notifications are available in current license
    if (!licenseManager.hasFeature('email_notifications')) {
      return res.status(403).json({
        error: "Funzione PRO richiesta",
        message: "L'invio di email è disponibile solo in WKF Suite PRO.",
        upgradeUrl: "https://wkfsuite.com/upgrade"
      });
    }

    const { test_email } = req.body;

    if (!test_email) {
      return res.status(400).json({ error: "Email di test richiesta" });
    }

    const transporter = await createEmailTransporter();
    if (!transporter) {
      return res.status(400).json({ error: "Configurazione email non valida o disabilitata" });
    }

    const config = await getEmailConfig();

    const mailOptions = {
      from: `"${config.from_name}" <${config.from_email}>`,
      to: test_email,
      subject: 'Test Email - Sistema Gestione Permessi',
      text: 'Questa è una email di test per verificare la configurazione SMTP.\n\nSe ricevi questo messaggio, la configurazione è corretta.\n\nSaluti,\nSistema Gestione Permessi'
    };

    await transporter.sendMail(mailOptions);

    res.json({ success: true, message: "Email di test inviata con successo" });
  } catch (error) {
    console.error('❌ Errore test email:', error);
    res.status(500).json({
      error: "Errore invio email di test",
      details: error.message
    });
  }
});

// === COMPANY SETTINGS ===
// GET accessibile a tutti per logo e nome (POST solo admin)
app.get('/api/company-settings', requireAuth, (req, res) => {
  db.get("SELECT * FROM company_settings WHERE id = 1", (err, settings) => {
    if (err) return res.status(500).json({ error: "Errore DB" });

    res.json(settings || {
      company_name: 'WKF Suite',
      logo_path: null,
      notification_email: null,
      standard_vacation_days: 22
    });
  });
});

app.post('/api/company-settings', requireRole(['admin']), upload.single('logo'), (req, res) => {
  const { company_name, notification_email, standard_vacation_days } = req.body;
  const logoFile = req.file;

  // Validazioni server-side
  if (!company_name || company_name.trim().length === 0) {
    return res.status(400).json({ error: "Nome azienda è obbligatorio" });
  }

  if (notification_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(notification_email)) {
    return res.status(400).json({ error: "Email per notifiche non valida" });
  }

  if (standard_vacation_days && (standard_vacation_days < 0 || standard_vacation_days > 365)) {
    return res.status(400).json({ error: "Giorni ferie standard deve essere tra 0 e 365" });
  }

  // Gestisci il logo se caricato
  let logoPath = null;
  if (logoFile) {
    logoPath = `/assets/${logoFile.filename}`;
    console.log('📸 Logo aziendale caricato:', logoPath);
  }

  // Prima leggi le impostazioni esistenti per mantenere il logo se non viene caricato uno nuovo
  db.get("SELECT logo_path FROM company_settings WHERE id = 1", (errGet, existingSettings) => {
    if (errGet) {
      console.error('❌ Errore lettura impostazioni esistenti:', errGet);
    }

    console.log('📋 Impostazioni esistenti:', existingSettings);
    console.log('📷 logoFile presente:', !!logoFile);
    console.log('📷 logoPath nuovo:', logoPath);

    // Se c'è un logo caricato, usa quello nuovo, altrimenti mantieni quello esistente
    const finalLogoPath = logoFile ? logoPath : (existingSettings?.logo_path || null);
    console.log('✅ finalLogoPath da salvare:', finalLogoPath);

    const sql = `INSERT INTO company_settings (id, company_name, logo_path, notification_email, standard_vacation_days)
           VALUES (1, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
           company_name=excluded.company_name,
           logo_path=excluded.logo_path,
           notification_email=excluded.notification_email,
           standard_vacation_days=excluded.standard_vacation_days`;

    const params = [
      company_name?.trim(),
      finalLogoPath,
      notification_email?.trim() || null,
      parseInt(standard_vacation_days) || 22
    ];

    console.log('💾 Parametri da salvare:', params);

    db.run(sql, params, function(err) {
      if (err) {
        console.error('❌ Errore salvataggio impostazioni azienda:', err);
        return res.status(500).json({ error: "Errore salvataggio impostazioni azienda" });
      }

      console.log('✅ Impostazioni azienda salvate con successo');
      res.json({
        success: true,
        logo_path: finalLogoPath,
        message: logoFile ? 'Impostazioni e logo salvati con successo!' : 'Impostazioni salvate con successo!'
      });
    });
  });
});

// === DATABASE TOOLS ===
// Endpoint per trovare/aprire il percorso del database
app.get('/api/database/location', requireRole(['admin']), (req, res) => {
  try {
    const dbPath = path.resolve(__dirname, 'data', 'database.sqlite');
    const dbDir = path.dirname(dbPath);

    // Verifica che il database esista
    if (!fs.existsSync(dbPath)) {
      return res.status(404).json({ error: 'Database non trovato' });
    }

    // Prova ad aprire la cartella in Esplora File (solo Windows)
    let opened = false;
    if (process.platform === 'win32') {
      try {
        require('child_process').exec(`explorer "${dbDir}"`);
        opened = true;
      } catch (err) {
        console.log('⚠️ Impossibile aprire Esplora File:', err.message);
      }
    }

    res.json({
      success: true,
      path: dbPath,
      directory: dbDir,
      opened
    });
  } catch (err) {
    console.error('❌ Errore localizzazione database:', err);
    res.status(500).json({ error: 'Errore nel trovare il database' });
  }
});

// Endpoint per informazioni sul database
app.get('/api/database/info', requireRole(['admin']), (req, res) => {
  try {
    const dbPath = path.resolve(__dirname, 'data', 'database.sqlite');

    if (!fs.existsSync(dbPath)) {
      return res.status(404).json({ error: 'Database non trovato' });
    }

    // Ottieni info sul file
    const stats = fs.statSync(dbPath);
    const sizeInBytes = stats.size;
    const sizeFormatted = sizeInBytes < 1024 * 1024
      ? `${(sizeInBytes / 1024).toFixed(2)} KB`
      : `${(sizeInBytes / (1024 * 1024)).toFixed(2)} MB`;

    const lastModified = new Date(stats.mtime).toLocaleString('it-IT');

    // Conta record nelle tabelle principali
    const tables = [];

    db.get("SELECT COUNT(*) as count FROM utenti", (err, result) => {
      if (!err) tables.push({ name: 'utenti', count: result.count });

      db.get("SELECT COUNT(*) as count FROM richieste", (err, result) => {
        if (!err) tables.push({ name: 'richieste', count: result.count });

        db.get("SELECT COUNT(*) as count FROM wifi", (err, result) => {
          if (!err) tables.push({ name: 'wifi', count: result.count });

          db.get("SELECT COUNT(*) as count FROM email_config", (err, result) => {
            if (!err) tables.push({ name: 'email_config', count: result.count });

            db.get("SELECT COUNT(*) as count FROM company_settings", (err, result) => {
              if (!err) tables.push({ name: 'company_settings', count: result.count });

              // Spazio disco disponibile (opzionale)
              let diskSpace = 'N/A';
              try {
                const disk = require('child_process').execSync('wmic logicaldisk get size,freespace,caption').toString();
                diskSpace = 'Vedi sistema';
              } catch (e) {
                // Ignora se non disponibile
              }

              res.json({
                success: true,
                path: dbPath,
                size: sizeFormatted,
                sizeBytes: sizeInBytes,
                lastModified,
                tables,
                diskSpace
              });
            });
          });
        });
      });
    });

  } catch (err) {
    console.error('❌ Errore info database:', err);
    res.status(500).json({ error: 'Errore nel recuperare informazioni database' });
  }
});

// Endpoint per creare backup del database
app.post('/api/database/backup', requireRole(['admin']), (req, res) => {
  try {
    const dbPath = path.resolve(__dirname, 'data', 'database.sqlite');
    const backupDir = path.resolve(__dirname, 'data', 'backups');

    // Crea cartella backups se non esiste
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // Nome backup con timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const backupFileName = `database-backup-${timestamp}.sqlite`;
    const backupPath = path.join(backupDir, backupFileName);

    // Copia il database
    fs.copyFileSync(dbPath, backupPath);

    // Ottieni dimensione backup
    const stats = fs.statSync(backupPath);
    const sizeFormatted = stats.size < 1024 * 1024
      ? `${(stats.size / 1024).toFixed(2)} KB`
      : `${(stats.size / (1024 * 1024)).toFixed(2)} MB`;

    console.log(`✅ Backup database creato: ${backupPath}`);

    res.json({
      success: true,
      backupPath,
      size: sizeFormatted,
      timestamp
    });

  } catch (err) {
    console.error('❌ Errore backup database:', err);
    res.status(500).json({ error: 'Errore nella creazione del backup' });
  }
});

// === LICENSE MANAGEMENT ===
app.get('/api/license/status', (req, res) => {
  const licenseInfo = licenseManager.getLicenseInfo();
  res.json(licenseInfo);
});

app.post('/api/license/activate', requireRole(['admin']), (req, res) => {
  const { licenseKey } = req.body;

  if (!licenseKey || !licenseKey.trim()) {
    return res.status(400).json({ error: "License key richiesta" });
  }

  const success = licenseManager.saveLicenseKey(licenseKey.trim());

  if (success) {
    const licenseInfo = licenseManager.getLicenseInfo();
    res.json({
      success: true,
      message: "License key attivata con successo! WKF Suite PRO è ora attivo.",
      status: licenseInfo.status,
      features: licenseInfo.features
    });
  } else {
    res.status(400).json({ error: "License key non valida" });
  }
});

app.post('/api/license/deactivate', requireRole(['admin']), (req, res) => {
  const success = licenseManager.removeLicenseKey();

  if (success) {
    const licenseInfo = licenseManager.getLicenseInfo();
    res.json({
      success: true,
      message: "License key rimossa. WKF Suite è ora in modalità FREE.",
      status: licenseInfo.status,
      features: licenseInfo.features
    });
  } else {
    res.status(500).json({ error: "Errore rimozione license key" });
  }
});

app.get('/api/license/features/:feature', (req, res) => {
  const { feature } = req.params;
  const hasFeature = licenseManager.hasFeature(feature);
  const upgradePrompt = licenseManager.checkUpgradePrompt(feature);

  res.json({
    hasFeature,
    licenseStatus: licenseManager.licenseStatus,
    upgradePrompt
  });
});

// === PASSWORD RECOVERY ===
app.post('/api/password/forgot', async (req, res) => {
  try {
    const { username } = req.body;

    if (!username || !username.trim()) {
      return res.status(400).json({
        error: "Username richiesto",
        details: "Inserisci il tuo username"
      });
    }

    db.get("SELECT id, email, username FROM utenti WHERE username = ?", [username.trim()], async (err, user) => {
      if (err) {
        console.error('Errore ricerca utente:', err);
        return res.status(500).json({ error: "Errore interno del server" });
      }

      if (!user) {
        return res.status(404).json({
          error: "Utente non trovato",
          details: "Username non esistente nel sistema"
        });
      }

      if (!user.email) {
        return res.status(400).json({
          error: "Email mancante",
          details: "Questo utente non ha un indirizzo email configurato. Contatta l'amministratore."
        });
      }

      try {
        const token = generateResetToken();
        const createdAt = new Date().toISOString();
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 ora

        db.run("DELETE FROM password_resets WHERE user_id = ?", [user.id]);

        db.run(
          "INSERT INTO password_resets (user_id, email, token, created_at, expires_at) VALUES (?, ?, ?, ?, ?)",
          [user.id, user.email, token, createdAt, expiresAt],
          async function(err) {
            if (err) {
              console.error('Errore salvataggio token reset:', err);
              return res.status(500).json({ error: "Errore interno del server" });
            }

            const resetUrl = `http://${req.get('host')}/reset-password.html?token=${token}`;
            const emailBody = `
Ciao ${user.username},

Hai richiesto il reset della password per il sistema di gestione permessi.

Clicca sul seguente link per reimpostare la password:
${resetUrl}

Il link scadrà tra 1 ora.

Se non hai richiesto questo reset, ignora questa email.

Saluti,
Sistema Gestione Permessi
            `;

            try {
              const isConnected = await isWiFiConnected();

              if (isConnected) {
                await addToEmailQueue(
                  user.email,
                  'Reset Password - Gestione Permessi',
                  emailBody,
                  'password_reset'
                );
                res.json({
                  success: true,
                  message: "Email di reset inviata con successo"
                });
              } else {
                await addToEmailQueue(
                  user.email,
                  'Reset Password - Gestione Permessi',
                  emailBody,
                  'password_reset'
                );
                res.json({
                  success: true,
                  queued: true,
                  message: "Richiesta in coda. Email sarà inviata quando la WiFi sarà disponibile."
                });
              }
            } catch (emailErr) {
              console.error('Errore gestione email:', emailErr);
              res.json({
                success: true,
                message: "Token generato ma possibili problemi con l'invio email"
              });
            }
          }
        );
      } catch (tokenErr) {
        console.error('Errore generazione token:', tokenErr);
        return res.status(500).json({ error: "Errore generazione token" });
      }
    });
  } catch (err) {
    console.error('Errore password recovery:', err);
    res.status(500).json({ error: "Errore interno del server" });
  }
});

app.post('/api/password/reset', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        error: "Token e nuova password richiesti"
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        error: "Password troppo corta",
        details: "La password deve essere almeno 8 caratteri"
      });
    }

    db.get(
      "SELECT pr.*, u.id as user_id, u.username FROM password_resets pr JOIN utenti u ON pr.user_id = u.id WHERE pr.token = ? AND pr.expires_at > ?",
      [token, new Date().toISOString()],
      async (err, resetData) => {
        if (err) {
          console.error('Errore verifica token:', err);
          return res.status(500).json({ error: "Errore interno del server" });
        }

        if (!resetData) {
          return res.status(400).json({
            error: "Token non valido o scaduto",
            details: "Il link di reset è scaduto o non è valido"
          });
        }

        try {
          const hashedPassword = await bcrypt.hash(newPassword, 12);

          db.run(
            "UPDATE utenti SET password = ? WHERE id = ?",
            [hashedPassword, resetData.user_id],
            function(err) {
              if (err) {
                console.error('Errore aggiornamento password:', err);
                return res.status(500).json({ error: "Errore aggiornamento password" });
              }

              db.run("DELETE FROM password_resets WHERE user_id = ?", [resetData.user_id]);

              res.json({
                success: true,
                message: "Password aggiornata con successo"
              });
            }
          );
        } catch (hashErr) {
          console.error('Errore hash password:', hashErr);
          return res.status(500).json({ error: "Errore elaborazione password" });
        }
      }
    );
  } catch (err) {
    console.error('Errore reset password:', err);
    res.status(500).json({ error: "Errore interno del server" });
  }
});

// PDF richiesta per dipendenti
app.get('/api/richieste/:id/pdf', requireAuth, (req, res) => {
  const userSession = req.session.user;

  db.get("SELECT * FROM richieste WHERE id=?", [req.params.id], (err, row) => {
    if (err || !row) return res.status(404).send("Richiesta non trovata");

    // Verifica che il dipendente possa vedere solo le sue richieste
    if (userSession.ruolo === 'dipendente' && row.matricola !== userSession.matricola) {
      return res.status(403).send("Non autorizzato");
    }

    // Leggi le impostazioni aziendali per logo e nome
    db.get("SELECT * FROM company_settings WHERE id = 1", (errSettings, settings) => {
      const companyName = settings?.company_name || 'WKF Suite';
      const logoPath = settings?.logo_path || '/logo.png';

      const dataDisplay = row.data || (row.dal && row.al ? `${row.dal} al ${row.al}` : "-");
      const oreDisplay = row.oraInizio && row.oraFine ? `${row.oraInizio} - ${row.oraFine}` : "-";

      // Determina la tipologia dal record
      let tipologiaDisplay = "💰 Retribuito"; // Default
      if (row.daRecuperare) tipologiaDisplay = "⏰ Da Recuperare";
      else if (row.nonRetribuito) tipologiaDisplay = "❌ Non Retribuito";
      else if (row.permessoSindacale) tipologiaDisplay = "🏛️ Permesso Sindacale";
      else if (row.inCFerie) tipologiaDisplay = "🏖️ C/Ferie";

    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Permesso - ${row.matricola}</title>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.4; }
          .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #ddd;
            padding-bottom: 20px;
          }
          .logo {
            width: 80px;
            height: 80px;
            margin: 0 auto 15px;
            display: block;
          }
          .company-name {
            font-size: 18px;
            font-weight: bold;
            color: #333;
            margin-bottom: 5px;
          }
          .document-title {
            font-size: 24px;
            font-weight: bold;
            color: #2c3e50;
            margin-top: 15px;
          }
          .info {
            margin: 12px 0;
            padding: 8px;
            background: #f9f9f9;
            border-left: 4px solid #4f7cff;
            font-size: 14px;
          }
          .info strong { color: #2c3e50; }
          .stato {
            font-weight: bold;
            padding: 4px 8px;
            border-radius: 4px;
            color: white;
            background-color: ${row.stato === 'approvata' ? '#2ecc71' : row.stato === 'rifiutata' ? '#e74c3c' : '#f39c12'};
          }
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            font-size: 12px;
            color: #666;
            text-align: center;
          }
          @media print {
            .no-print { display: none; }
            body { margin: 0; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <img src="${logoPath}" alt="Logo Azienda" class="logo" onerror="this.style.display='none'">
          <div class="company-name">${companyName}</div>
          <div class="document-title">RICHIESTA PERMESSO</div>
        </div>
        <div class="info"><strong>Nome:</strong> ${row.nome || '-'} ${row.cognome || ''}</div>
        <div class="info"><strong>Matricola:</strong> ${row.matricola}</div>
        <div class="info"><strong>Tipo Permesso:</strong> ${row.tipo}</div>
        <div class="info"><strong>Tipologia:</strong> ${tipologiaDisplay}</div>
        <div class="info"><strong>Data/Periodo:</strong> ${dataDisplay}</div>
        <div class="info"><strong>Orario:</strong> ${oreDisplay}</div>
        <div class="info"><strong>Note:</strong> ${row.note || '-'}</div>
        <div class="info"><strong>Stato:</strong> <span class="stato">${row.stato || 'in attesa'}</span></div>
        <div class="info"><strong>Data Richiesta:</strong> ${new Date(row.createdAt).toLocaleString('it-IT')}</div>

        <div class="footer">
          <p>Generato dal Sistema di Gestione Permessi - ${new Date().toLocaleString('it-IT')}</p>
        </div>

        <div class="ecological-message no-print" style="
          margin-top: 30px;
          padding: 15px;
          background-color: #f0fff0;
          border: 1px solid #228b22;
          border-radius: 8px;
          text-align: center;
          color: #228b22;
          font-size: 12px;
        ">
          <div style="font-weight: bold; margin-bottom: 8px;">🌱 NON STAMPARE - SALVA IL PIANETA</div>
          <div style="margin-bottom: 5px;">Rispetta l'ambiente. Hai davvero bisogno di stampare questo documento?</div>
          <div style="color: #666; margin: 8px 0;">• • •</div>
          <div style="font-weight: bold; margin-bottom: 5px;">🌍 DON'T PRINT - SAVE THE PLANET</div>
          <div style="color: #666; font-size: 11px;">Please consider the environment – Do you really need to print this document?</div>
        </div>

        <div class="no-print" style="margin-top: 30px; text-align: center;">
          <p style="color: #999; font-size: 14px; margin-bottom: 10px;">💡 Usa Ctrl+P per stampare o salvare come PDF</p>
          <button onclick="window.close()" style="padding: 10px 20px; font-size: 16px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;">✖️ Chiudi</button>
        </div>
      </body>
      </html>
      `);
    });
  });
});

// === REPORT ENDPOINTS ===

// Endpoint per ottenere dati report
app.get('/api/report/permessi', requireAuth, (req, res) => {
  const { dataInizio, dataFine, matricola } = req.query;
  const userSession = req.session.user;

  // Query con JOIN per filtrare solo dipendenti
  let query = `
    SELECT r.*
    FROM richieste r
    INNER JOIN utenti u ON r.matricola = u.matricola
    WHERE u.ruolo = 'dipendente'
  `;
  let params = [];

  // Filtro date
  if (dataInizio) {
    query += " AND date(r.createdAt) >= ?";
    params.push(dataInizio);
  }

  if (dataFine) {
    query += " AND date(r.createdAt) <= ?";
    params.push(dataFine);
  }

  // Filtro matricola dipendente
  if (matricola) {
    query += " AND r.matricola = ?";
    params.push(matricola);
  }

  // Se è un dipendente normale, può vedere solo le sue richieste
  if (userSession.ruolo === 'dipendente') {
    query += " AND r.matricola = ?";
    params.push(userSession.matricola);
  }

  query += " ORDER BY r.createdAt DESC";
  
  db.all(query, params, (err, richieste) => {
    if (err) {
      console.error('Errore query report:', err);
      return res.status(500).json({ error: "Errore caricamento report" });
    }
    
    // Calcola statistiche
    const statistiche = {
      totale: richieste.length,
      approvate: richieste.filter(r => r.stato === 'approvata').length,
      rifiutate: richieste.filter(r => r.stato === 'rifiutata').length,
      inAttesa: richieste.filter(r => r.stato === 'in attesa').length
    };
    
    res.json({
      richieste,
      statistiche
    });
  });
});

// === EXPORT CALENDARIO iCAL ===
// [DISABILITATO] Endpoint per esportare calendario permessi in formato iCal (.ics)
// Temporaneamente disabilitato per problemi di compatibilità ical-generator
/*
app.get('/api/export-calendar/:matricola', requireAuth, (req, res) => {
  const userSession = req.session.user;
  const { matricola } = req.params;

  console.log(`📅 Richiesta export calendario per matricola: ${matricola} da utente: ${userSession.username} (${userSession.ruolo})`);

  // Verifica permessi: solo admin/supervisore possono esportare altri calendari
  if (userSession.ruolo === 'dipendente' && matricola !== userSession.matricola) {
    console.warn(`⚠️ Utente ${userSession.username} non autorizzato a esportare calendario di ${matricola}`);
    return res.status(403).json({ error: 'Non autorizzato' });
  }

  // Query per ottenere tutti i permessi APPROVATI dell'utente
  const query = `
    SELECT r.*, u.username
    FROM richieste r
    LEFT JOIN utenti u ON r.matricola = u.matricola
    WHERE r.matricola = ? AND r.stato = 'approvata'
    ORDER BY r.createdAt DESC
  `;

  db.all(query, [matricola], (err, richieste) => {
    if (err) {
      console.error('❌ Errore query calendario:', err);
      return res.status(500).json({ error: 'Errore durante l\'export del calendario' });
    }

    console.log(`📊 Trovate ${richieste.length} richieste approvate per matricola ${matricola}`);

    // Ottieni info dipendente per il nome del file
    db.get("SELECT username, matricola FROM utenti WHERE matricola = ?", [matricola], (err, dipendente) => {
      if (err) {
        console.error('❌ Errore query dipendente:', err);
        return res.status(500).json({ error: 'Errore database' });
      }

      if (!dipendente) {
        console.warn(`⚠️ Dipendente con matricola ${matricola} non trovato`);
        return res.status(404).json({ error: 'Dipendente non trovato' });
      }

      console.log(`👤 Dipendente trovato: ${dipendente.username} (${dipendente.matricola})`);

      try {
        // Crea calendario iCal (sintassi v7.2.0)
        console.log('🔧 Creazione calendario iCal...');
        const calendar = ical({
          domain: 'wkf-suite.local',
          prodId: '//WKF Suite//Gestione Permessi//IT',
          name: `Permessi ${dipendente.username}`,
          timezone: 'Europe/Rome',
          description: 'Calendario permessi approvati - WKF Suite'
        });

        console.log('✅ Calendario creato, aggiunta eventi...');

        // Aggiungi ogni permesso approvato come evento
        richieste.forEach((richiesta, index) => {
          console.log(`  ➕ Aggiunta evento ${index + 1}/${richieste.length}: ${richiesta.tipo || 'N/A'}`);

          // Determina il tipo di permesso
          let tipoPermesso = 'Permesso Retribuito';
          if (richiesta.daRecuperare) tipoPermesso = 'Permesso da Recuperare';
          else if (richiesta.nonRetribuito) tipoPermesso = 'Permesso Non Retribuito';
          else if (richiesta.permessoSindacale) tipoPermesso = 'Permesso Sindacale';
          else if (richiesta.inCFerie) tipoPermesso = 'C/Ferie';

          // Parse date per eventi
          let startDate, endDate;

          if (richiesta.dal && richiesta.al) {
            // Permesso con date dal-al
            startDate = new Date(richiesta.dal + 'T00:00:00');
            endDate = new Date(richiesta.al + 'T23:59:59');
          } else if (richiesta.data) {
            // Permesso orario singolo
            startDate = new Date(richiesta.data + 'T' + (richiesta.oraInizio || '00:00'));
            endDate = new Date(richiesta.data + 'T' + (richiesta.oraFine || '23:59'));
          } else {
            // Fallback
            console.warn(`⚠️ Richiesta ${richiesta.id} senza date valide, uso data corrente come fallback`);
            startDate = new Date();
            endDate = new Date();
          }

          // Descrizione dettagliata
          let description = `Tipo: ${tipoPermesso}\n`;
          description += `Dipendente: ${dipendente.username} (${matricola})\n`;
          if (richiesta.note) {
            description += `Note: ${richiesta.note}\n`;
          }
          description += `\nApprovato il: ${new Date(richiesta.createdAt).toLocaleDateString('it-IT')}`;

          // Crea evento con sintassi semplificata per ical-generator v9
          try {
            calendar.createEvent({
              start: startDate,
              end: endDate,
              summary: `${tipoPermesso} - ${dipendente.username}`,
              description: description,
              location: 'WKF Suite',
              uid: `permesso-${richiesta.id}@wkf-suite`,
              status: 'CONFIRMED'
            });
          } catch (eventError) {
            console.error(`❌ Errore creazione evento ${richiesta.id}:`, eventError.message);
            throw eventError;
          }
        });

        console.log('✅ Tutti gli eventi aggiunti, generazione file...');

        // Imposta headers per download file
        const filename = `permessi_${dipendente.username}_${matricola}.ics`
          .toLowerCase()
          .replace(/\s+/g, '_');

        res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(calendar.toString());

        console.log(`✅ 📅 Calendario esportato con successo per ${dipendente.username} (${richieste.length} eventi)`);

      } catch (error) {
        console.error('❌ Errore durante creazione calendario iCal:', error);
        return res.status(500).json({
          error: 'Errore durante la generazione del calendario',
          details: error.message
        });
      }
    });
  });
});
*/

// Endpoint per ottenere tutti gli utenti (admin, supervisore, segreteria per gestione dipendenti)
app.get('/api/utenti', requireRole(['admin', 'supervisore', 'segreteria']), (req, res) => {
  const userSession = req.session.user;

  // Solo admin può vedere tutti gli utenti, supervisore e segreteria vedono solo i dipendenti
  let query = "SELECT id, username, ruolo, matricola FROM utenti";

  if (userSession.ruolo !== 'admin') {
    query += " WHERE ruolo = 'dipendente'";
  }

  query += " ORDER BY username";

  db.all(query, (err, utenti) => {
    if (err) {
      console.error('Errore caricamento utenti:', err);
      return res.status(500).json({ error: "Errore caricamento utenti" });
    }
    res.json(utenti || []);
  });
});

// Endpoint per ottenere lista dipendenti (per filtro)
app.get('/api/utenti/dipendenti', requireRole(['admin', 'supervisore', 'segreteria']), (req, res) => {
  db.all("SELECT id, username, matricola, ruolo FROM utenti WHERE ruolo = 'dipendente' ORDER BY username", (err, dipendenti) => {
    if (err) {
      console.error('Errore caricamento dipendenti:', err);
      return res.status(500).json({ error: "Errore caricamento dipendenti" });
    }
    res.json(dipendenti || []);
  });
});

// Endpoint per rimuovere utenti dipendenti
app.delete('/api/utenti/:id', requireRole(['admin', 'supervisore', 'segreteria']), (req, res) => {
  const userId = req.params.id;
  const userSession = req.session.user;

  // Prima verifica che l'utente esista e sia un dipendente
  db.get("SELECT id, username, ruolo FROM utenti WHERE id = ?", [userId], (err, user) => {
    if (err) {
      console.error('Errore verifica utente:', err);
      return res.status(500).json({ error: "Errore verifica utente" });
    }

    if (!user) {
      return res.status(404).json({ error: "Utente non trovato" });
    }

    // Verifica che sia un dipendente (non può eliminare admin, supervisore, segreteria)
    if (user.ruolo !== 'dipendente') {
      return res.status(403).json({ error: "Non è possibile eliminare utenti con ruolo amministrativo" });
    }

    // Elimina l'utente
    db.run("DELETE FROM utenti WHERE id = ?", [userId], function(err) {
      if (err) {
        console.error('Errore eliminazione utente:', err);
        return res.status(500).json({ error: "Errore eliminazione utente" });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: "Utente non trovato" });
      }

      console.log(`👤 Utente dipendente '${user.username}' eliminato da ${userSession.username} (${userSession.ruolo})`);
      res.json({
        message: "Dipendente eliminato con successo",
        deletedUser: {
          id: user.id,
          username: user.username,
          ruolo: user.ruolo
        }
      });
    });
  });
});

// Funzione per generare password temporanea
function generateTempPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

// Endpoint per reset password utente (solo admin)
app.post('/api/utenti/:id/reset-password', requireRole(['admin']), async (req, res) => {
  const userId = req.params.id;
  const userSession = req.session.user;

  try {
    // Verifica che l'utente esista
    const user = await new Promise((resolve, reject) => {
      db.get("SELECT id, username, ruolo FROM utenti WHERE id = ?", [userId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!user) {
      return res.status(404).json({ error: "Utente non trovato" });
    }

    // Genera password temporanea
    const tempPassword = generateTempPassword();
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    // Aggiorna password e imposta flag per cambio obbligatorio
    await new Promise((resolve, reject) => {
      db.run(
        "UPDATE utenti SET password = ?, password_reset_required = 1 WHERE id = ?",
        [hashedPassword, userId],
        function(err) {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    console.log(`🔐 Password resettata per utente '${user.username}' da admin ${userSession.username}`);

    res.json({
      success: true,
      message: `Password resettata per utente ${user.username}`,
      tempPassword: tempPassword,
      username: user.username
    });

  } catch (error) {
    console.error('Errore reset password:', error);
    res.status(500).json({ error: "Errore interno durante il reset della password" });
  }
});

// Endpoint per cambio password obbligatorio
app.post('/api/change-required-password', requireAuth, async (req, res) => {
  const { newPassword, confirmPassword } = req.body;
  const userId = req.session.user.id;

  try {
    // Validazioni
    if (!newPassword || !confirmPassword) {
      return res.status(400).json({ error: "Password e conferma sono obbligatorie" });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: "Le password non coincidono" });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: "La password deve essere di almeno 8 caratteri" });
    }

    // Controlla che contenga almeno una lettera e un numero
    if (!/[a-zA-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      return res.status(400).json({
        error: "La password deve contenere almeno una lettera e un numero"
      });
    }

    // Verifica che l'utente abbia password_reset_required = 1
    const user = await new Promise((resolve, reject) => {
      db.get("SELECT password_reset_required FROM utenti WHERE id = ?", [userId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!user || !user.password_reset_required) {
      return res.status(400).json({ error: "Cambio password non richiesto" });
    }

    // Hash della nuova password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Aggiorna password e rimuovi flag
    await new Promise((resolve, reject) => {
      db.run(
        "UPDATE utenti SET password = ?, password_reset_required = 0 WHERE id = ?",
        [hashedPassword, userId],
        function(err) {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    console.log(`🔐 Password cambiata con successo per utente ID ${userId}`);

    res.json({
      success: true,
      message: "Password aggiornata con successo"
    });

  } catch (error) {
    console.error('Errore cambio password obbligatorio:', error);
    res.status(500).json({ error: "Errore interno durante il cambio password" });
  }
});

// Endpoint per statistiche dashboard
app.get('/api/dashboard/stats', requireAuth, (req, res) => {
  const userSession = req.session.user;

  let query, params = [];

  // Se è un dipendente, solo le sue richieste
  if (userSession.ruolo === 'dipendente') {
    query = "SELECT stato, COUNT(*) as count FROM richieste WHERE matricola = ? GROUP BY stato";
    params.push(userSession.matricola);
  } else {
    // Admin/supervisore/segreteria vedono solo statistiche dei dipendenti
    query = `
      SELECT r.stato, COUNT(*) as count
      FROM richieste r
      INNER JOIN utenti u ON r.matricola = u.matricola
      WHERE u.ruolo = 'dipendente'
      GROUP BY r.stato
    `;
  }
  
  db.all(query, params, (err, results) => {
    if (err) {
      console.error('Errore statistiche dashboard:', err);
      return res.status(500).json({ error: "Errore caricamento statistiche" });
    }
    
    const stats = {
      totale: 0,
      approvate: 0,
      rifiutate: 0,
      inAttesa: 0
    };
    
    results.forEach(row => {
      stats.totale += row.count;
      if (row.stato === 'approvata') stats.approvate = row.count;
      if (row.stato === 'rifiutata') stats.rifiutate = row.count;
      if (row.stato === 'in attesa') stats.inAttesa = row.count;
    });
    
    res.json(stats);
  });
});

// === ANALYTICS ENDPOINTS ===

// [FIX v1.1.1] Endpoint per grafici - Richieste per mese (SOLO PRO)
app.get('/api/analytics/monthly', requirePro, (req, res) => {
  const query = `
    SELECT
      strftime('%Y-%m', data) as month,
      COUNT(*) as total,
      SUM(CASE WHEN stato = 'approvata' THEN 1 ELSE 0 END) as approvate,
      SUM(CASE WHEN stato = 'rifiutata' THEN 1 ELSE 0 END) as rifiutate,
      SUM(CASE WHEN stato = 'in attesa' THEN 1 ELSE 0 END) as in_attesa
    FROM richieste
    WHERE data IS NOT NULL
      AND date(data) >= date('now', '-12 months')
    GROUP BY strftime('%Y-%m', data)
    ORDER BY month
  `;

  db.all(query, [], (err, results) => {
    if (err) {
      console.error('Errore analytics monthly:', err);
      return res.status(500).json({ error: "Errore caricamento dati mensili" });
    }
    res.json(results || []);
  });
});

// [FIX v1.1.1] Endpoint per grafici - Richieste per tipo (SOLO PRO)
app.get('/api/analytics/by-type', requirePro, (req, res) => {
  const query = `
    SELECT
      tipo,
      COUNT(*) as count,
      SUM(CASE WHEN stato = 'approvata' THEN 1 ELSE 0 END) as approvate
    FROM richieste
    GROUP BY tipo
    ORDER BY count DESC
  `;

  db.all(query, [], (err, results) => {
    if (err) {
      console.error('Errore analytics by-type:', err);
      return res.status(500).json({ error: "Errore caricamento dati per tipo" });
    }
    res.json(results || []);
  });
});

// [FIX v1.1.1] Endpoint per grafici - Top dipendenti per richieste (SOLO PRO)
app.get('/api/analytics/top-employees', requirePro, (req, res) => {
  const query = `
    SELECT
      u.username,
      u.matricola,
      COUNT(r.id) as total_richieste,
      SUM(CASE WHEN r.stato = 'approvata' THEN 1 ELSE 0 END) as approvate,
      SUM(CASE WHEN r.stato = 'rifiutata' THEN 1 ELSE 0 END) as rifiutate
    FROM utenti u
    LEFT JOIN richieste r ON u.matricola = r.matricola
    WHERE u.ruolo = 'dipendente'
    GROUP BY u.username, u.matricola
    HAVING total_richieste > 0
    ORDER BY total_richieste DESC
    LIMIT 10
  `;

  db.all(query, [], (err, results) => {
    if (err) {
      console.error('Errore analytics top-employees:', err);
      return res.status(500).json({ error: "Errore caricamento top dipendenti" });
    }
    res.json(results || []);
  });
});

// [FIX v1.1.1] Endpoint per grafici - Statistiche per ore (SOLO PRO)
app.get('/api/analytics/hours-distribution', requirePro, (req, res) => {
  const query = `
    SELECT
      CASE
        WHEN oraInizio IS NOT NULL THEN 'Per Ore'
        WHEN dal IS NOT NULL AND al IS NOT NULL THEN 'Più Giorni'
        WHEN data IS NOT NULL THEN 'Giornaliero'
        ELSE 'Non Specificato'
      END as categoria,
      COUNT(*) as count,
      SUM(CASE WHEN stato = 'approvata' THEN 1 ELSE 0 END) as approvate
    FROM richieste
    GROUP BY categoria
    ORDER BY count DESC
  `;

  db.all(query, [], (err, results) => {
    if (err) {
      console.error('Errore analytics hours-distribution:', err);
      return res.status(500).json({ error: "Errore caricamento distribuzione ore" });
    }
    res.json(results || []);
  });
});

// === HTTPS CONFIGURATION ===
let httpsOptions = null;

// Prova a caricare certificati SSL con percorsi multipli per produzione
try {
  let keyPath, certPath;
  
  // In modalità PKG, i certificati devono stare accanto all'exe
  let possibleSslDirs;
  
  if (process.env.PKG_MODE === 'true' || process.pkg) {
    // PKG: solo directory dell'exe
    const exeDir = path.dirname(process.execPath);
    possibleSslDirs = [
      exeDir,                        // Direttamente accanto all'exe
      path.join(exeDir, 'ssl')       // Subdirectory ssl (se esiste già)
    ];
  } else {
    // Modalità normale/Electron
    possibleSslDirs = [
      path.join(__dirname, 'ssl'),                                    // Development
      path.join(process.resourcesPath || __dirname, 'ssl'),          // Electron resources
      path.join(process.resourcesPath || __dirname, 'app', 'ssl'),   // Electron app.asar
      path.join(__dirname, '..', 'ssl'),                             // Parent directory
      path.join(process.cwd(), 'ssl')                                // Current working directory
    ];
  }
  
  let sslDir = null;
  for (const dir of possibleSslDirs) {
    const testKeyPath = path.join(dir, 'key.pem');
    const testCertPath = path.join(dir, 'cert.pem');
    
    if (fs.existsSync(testKeyPath) && fs.existsSync(testCertPath)) {
      keyPath = testKeyPath;
      certPath = testCertPath;
      sslDir = dir;
      break;
    }
  }
  
  if (keyPath && certPath && sslDir) {
    httpsOptions = {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath)
    };
    console.log('✅ Certificati SSL caricati correttamente da:', sslDir);
  } else {
    console.log('⚠️  Certificati SSL non trovati, HTTPS disabilitato');
    console.log('   Percorsi cercati:', possibleSslDirs);
    httpsOptions = null;
  }
} catch (error) {
  console.error('⚠️  Errore caricamento certificati SSL:', error.message);
  console.log('   HTTPS disabilitato');
  httpsOptions = null;
}

// Route catch-all per servire index.html per le richieste non API
app.get('/', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

// Route catch-all per le pagine HTML
app.get('/:page', (req, res, next) => {
  // Se è una richiesta API, passa al prossimo handler
  if (req.path.startsWith('/api/')) {
    return next();
  }
  
  const page = req.params.page;
  const htmlFile = path.join(publicDir, `${page}.html`);
  
  // Verifica se il file HTML esiste
  if (fs.existsSync(htmlFile)) {
    res.sendFile(htmlFile);
  } else {
    // Fallback a index.html
    res.sendFile(path.join(publicDir, 'index.html'));
  }
});

// === EMAIL AND WiFi UTILITY FUNCTIONS ===
function isWiFiConnected() {
  return new Promise((resolve) => {
    db.get("SELECT ssid FROM wifi WHERE id = 1 AND ssid IS NOT NULL AND ssid != ''", (err, row) => {
      if (err || !row) {
        resolve(false);
      } else {
        const ssid = row.ssid;
        const os = require('os');
        const interfaces = os.networkInterfaces();

        for (let ifname in interfaces) {
          const iface = interfaces[ifname];
          for (let alias of iface) {
            if (alias.family === 'IPv4' && !alias.internal && alias.address.startsWith('192.168.')) {
              resolve(true);
              return;
            }
          }
        }
        resolve(false);
      }
    });
  });
}

function addToEmailQueue(toEmail, subject, body, type) {
  return new Promise((resolve, reject) => {
    const createdAt = new Date().toISOString();
    const sql = `INSERT INTO email_queue (to_email, subject, body, type, created_at) VALUES (?, ?, ?, ?, ?)`;

    db.run(sql, [toEmail, subject, body, type, createdAt], function(err) {
      if (err) {
        reject(err);
      } else {
        resolve(this.lastID);
      }
    });
  });
}

function generateResetToken() {
  const crypto = require('crypto');
  return crypto.randomBytes(32).toString('hex');
}

async function getEmailConfig() {
  return new Promise((resolve, reject) => {
    db.get("SELECT * FROM email_config WHERE id = 1", (err, config) => {
      if (err) {
        reject(err);
      } else {
        resolve(config);
      }
    });
  });
}

async function createEmailTransporter() {
  try {
    const config = await getEmailConfig();

    if (!config || !config.enabled || !config.smtp_host) {
      console.log('⚠️ Configurazione email non trovata o disabilitata');
      return null;
    }

    const transporter = nodemailer.createTransport({
      host: config.smtp_host,
      port: config.smtp_port || 587,
      secure: config.smtp_secure || false,
      auth: {
        user: config.smtp_user,
        pass: config.smtp_password
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    return transporter;
  } catch (error) {
    console.error('❌ Errore creazione transporter email:', error);
    return null;
  }
}

async function processEmailQueue() {
  const isConnected = await isWiFiConnected();
  if (!isConnected) {
    console.log('📴 WiFi non connesso, email in coda');
    return;
  }

  const transporter = await createEmailTransporter();
  if (!transporter) {
    console.log('⚠️ Transporter email non disponibile, email in coda');
    return;
  }

  const config = await getEmailConfig();

  db.all("SELECT * FROM email_queue WHERE sent = FALSE ORDER BY created_at ASC", async (err, rows) => {
    if (err || !rows.length) return;

    for (const row of rows) {
      try {
        console.log(`📧 Invio email a ${row.to_email}: ${row.subject}`);

        const mailOptions = {
          from: `"${config.from_name}" <${config.from_email}>`,
          to: row.to_email,
          subject: row.subject,
          text: row.body
        };

        await transporter.sendMail(mailOptions);

        console.log(`✅ Email inviata con successo a ${row.to_email}`);

        db.run("UPDATE email_queue SET sent = TRUE, sent_at = ? WHERE id = ?",
          [new Date().toISOString(), row.id]);

      } catch (error) {
        console.error(`❌ Errore invio email a ${row.to_email}:`, error.message);
        db.run("UPDATE email_queue SET error = ? WHERE id = ?", [error.message, row.id]);
      }
    }
  });
}

async function sendNotificationEmail(userRoles, subject, messageBody, type) {
  const isConnected = await isWiFiConnected();
  if (!isConnected) {
    console.log('📴 WiFi non connesso, notifiche in coda');
    return;
  }

  const roleConditions = userRoles.map(() => 'ruolo = ?').join(' OR ');
  const sql = `SELECT email, username FROM utenti WHERE email IS NOT NULL AND email != '' AND (${roleConditions})`;

  db.all(sql, userRoles, async (err, users) => {
    if (err || !users.length) {
      console.log('❌ Nessun utente con email trovato per i ruoli:', userRoles);
      return;
    }

    for (const user of users) {
      try {
        await addToEmailQueue(
          user.email,
          subject,
          `Ciao ${user.username},\n\n${messageBody}\n\nSaluti,\nSistema Gestione Permessi`,
          type
        );
        console.log(`📧 Notifica accodata per ${user.username} (${user.email})`);
      } catch (err) {
        console.error(`❌ Errore accodamento notifica per ${user.username}:`, err);
      }
    }
  });
}

// === AUTOMATIC CLEANUP OF OLD PERMISSIONS ===
function cleanupOldPermissions() {
  console.log('🧹 Avvio pulizia automatica permessi vecchi di 3+ mesi...');

  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  const threeMonthsAgoISO = threeMonthsAgo.toISOString();

  const query = `
    DELETE FROM richieste
    WHERE (stato = 'approvata' OR stato = 'rifiutata')
    AND updatedAt < ?
  `;

  db.run(query, [threeMonthsAgoISO], function(err) {
    if (err) {
      console.error('❌ Errore durante pulizia permessi vecchi:', err);
      return;
    }
    if (this.changes > 0) {
      console.log(`✅ Rimossi ${this.changes} permessi approvati/rifiutati da più di 3 mesi`);
    } else {
      console.log('✅ Nessun permesso vecchio da rimuovere');
    }
  });
}

function schedulePeriodicCleanup() {
  cleanupOldPermissions();
  processEmailQueue();

  setInterval(() => {
    cleanupOldPermissions();
  }, 24 * 60 * 60 * 1000);

  setInterval(() => {
    processEmailQueue();
  }, 5 * 60 * 1000);
}

// === START SERVERS CON AUTO-DISCOVERY ===
async function startServers() {
  try {
    // Trova porte disponibili
    console.log('🔍 Ricerca porte disponibili...');
    const PORT = await findAvailablePort(BASE_PORT);
    const HTTPS_PORT = await findAvailablePort(BASE_HTTPS_PORT);
    
    console.log(`✅ Porte trovate: HTTP=${PORT}${httpsOptions ? `, HTTPS=${HTTPS_PORT}` : ' (HTTPS disabilitato)'}`);
    
    // Server HTTPS (solo se certificati disponibili)
    let httpsServer = null;
    if (httpsOptions) {
      try {
        httpsServer = https.createServer(httpsOptions, app);
        
        await new Promise((resolve, reject) => {
          httpsServer.listen(HTTPS_PORT, HOST, () => {
            console.log(`🔒 Server HTTPS avviato su https://localhost:${HTTPS_PORT}`);
            console.log(`🔒 Accessibile in rete aziendale su https://${getLocalIP()}:${HTTPS_PORT}`);
            resolve();
          });
          httpsServer.on('error', (err) => {
            console.warn('⚠️  Errore avvio HTTPS server:', err.message);
            httpsServer = null;
            resolve(); // Continua anche se HTTPS fallisce
          });
        });
      } catch (httpsErr) {
        console.warn('⚠️  HTTPS server non disponibile:', httpsErr.message);
        httpsServer = null;
      }
    }
    
    // Server HTTP (fallback e redirect)  
    const httpServer = http.createServer(app);
    
    await new Promise((resolve, reject) => {
      httpServer.listen(PORT, HOST, () => {
        console.log(`📄 Server HTTP avviato su http://localhost:${PORT}`);
        console.log(`📄 Accessibile in rete aziendale su http://${getLocalIP()}:${PORT}`);
        resolve();
      });
      httpServer.on('error', reject);
    });
    
    // Mostra configurazione finale
    console.log('='.repeat(60));
    console.log('CONFIGURAZIONE RETE AZIENDALE:');
    if (httpsServer) {
      console.log(`📱 MOBILE (raccomandato): https://${getLocalIP()}:${HTTPS_PORT}`);
    }
    console.log(`💻 DESKTOP: http://${getLocalIP()}:${PORT}`);
    console.log('='.repeat(60));
    
    // Verifica accesso mobile
    checkMobileAccess();
    if (httpsServer) {
      console.log('⚠️  IMPORTANTE PER MOBILE:');
      console.log('   - Usa HTTPS per evitare errori di sicurezza');
      console.log('   - Accetta il certificato self-signed quando richiesto');
      console.log('   - Su Chrome: clicca "Avanzate" → "Procedi verso sito non sicuro"');
      console.log('   - Su Safari: clicca "Avanzate" → "Visita questo sito web"');
      console.log('   - Su Firefox: clicca "Avanzate" → "Aggiungi eccezione"');
    } else {
      console.log('ℹ️  MOBILE:');
      console.log('   - Usa HTTP per ora (HTTPS non disponibile)');
      console.log('   - Per HTTPS: installa certificati SSL in cartella ssl/');
    }
    console.log('='.repeat(60));
    
    // Setup graceful shutdown
    setupGracefulShutdown(httpsServer, httpServer);
    
  } catch (error) {
    console.error('❌ Errore avvio server:', error.message);
    process.exit(1);
  }
}

// Avvia i server
startServers();

// === GRACEFUL SHUTDOWN HANDLING ===
function setupGracefulShutdown(httpsServer, httpServer) {
  process.on('SIGTERM', () => {
    console.log('📴 Ricevuto SIGTERM, chiusura graceful del server...');
    gracefulShutdown(httpsServer, httpServer);
  });

  process.on('SIGINT', () => {
    console.log('📴 Ricevuto SIGINT (Ctrl+C), chiusura graceful del server...');
    gracefulShutdown(httpsServer, httpServer);
  });

  process.on('uncaughtException', (err) => {
    console.error('❌ Errore non gestito:', err);
    console.log('📴 Chiusura forcata del server...');
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Promise rifiutata non gestita:', reason);
    console.log('📴 Chiusura forcata del server...');
    process.exit(1);
  });
}

function gracefulShutdown(httpsServer, httpServer) {
  monitor.stop();
  
  const closeHttps = () => {
    return new Promise((resolve) => {
      if (httpsServer) {
        httpsServer.close(() => {
          console.log('🔒 Server HTTPS chiuso');
          resolve();
        });
      } else {
        resolve();
      }
    });
  };
  
  const closeHttp = () => {
    return new Promise((resolve) => {
      httpServer.close(() => {
        console.log('📄 Server HTTP chiuso');
        resolve();
      });
    });
  };
  
  const closeDb = () => {
    return new Promise((resolve) => {
      db.close(() => {
        console.log('💾 Database chiuso');
        resolve();
      });
    });
  };
  
  // Chiudi servizi in sequenza
  closeHttps()
    .then(() => closeHttp())
    .then(() => closeDb())
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Errore durante shutdown:', err);
      process.exit(1);
    });
}

// Funzione per ottenere l'IP locale
function getLocalIP() {
  const os = require('os');
  const interfaces = os.networkInterfaces();
  
  console.log('🔍 Interfacce di rete disponibili:');
  for (const [name, ifaces] of Object.entries(interfaces)) {
    for (const iface of ifaces) {
      if (iface.family === 'IPv4') {
        console.log(`   ${name}: ${iface.address} (${iface.internal ? 'interno' : 'esterno'})`);
      }
    }
  }
  
  // Priorita le interfacce di rete più comuni per connessioni mobili su Windows
  const priorityInterfaces = [
    'Wi-Fi', 'WiFi', 'Wireless LAN adapter Wi-Fi',
    'Ethernet', 'Local Area Connection', 'Ethernet adapter Ethernet',
    'eth0', 'wlan0'
  ];
  
  // Prima cerca nelle interfacce prioritarie
  for (const priority of priorityInterfaces) {
    if (interfaces[priority]) {
      for (const interface of interfaces[priority]) {
        if (interface.family === 'IPv4' && !interface.internal) {
          console.log(`🌐 IP trovato su interfaccia prioritaria ${priority}: ${interface.address}`);
          return interface.address;
        }
      }
    }
  }
  
  // Fallback: cerca in tutte le interfacce esterne
  for (const name of Object.keys(interfaces)) {
    for (const interface of interfaces[name]) {
      if (interface.family === 'IPv4' && !interface.internal && interface.address !== '127.0.0.1') {
        console.log(`🌐 IP fallback su interfaccia ${name}: ${interface.address}`);
        return interface.address;
      }
    }
  }
  
  console.log('⚠️  Nessun IP esterno trovato, usando localhost');
  return 'localhost';
}

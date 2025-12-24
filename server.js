// server.js
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const cors = require('cors');
// Reverting to sqlite3 with manual asset inclusion
const sqlite3 = require('sqlite3').verbose();
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const QRCode = require('qrcode');
const bcrypt = require('bcryptjs');
const https = require('https');
const http = require('http');
const nodemailer = require('nodemailer');
const multer = require('multer'); // ical-generator - DISABLED temporarily due to compatibility issues
// const ical = require('ical-generator'); 
const ServerMonitor = require('./monitor');
// nosemgrep: javascript.lang.security.audit.module-imports
// Safe: Custom modules for license and database management in LAN environment
const LicenseManager = require('./license-manager');
const DatabaseUtils = require('./database-utils');

// Initialize license manager
const licenseManager = new LicenseManager();
console.log(`🔐 ${licenseManager.getAppTitle()} - License status initialized`);

const app = express();
const BASE_PORT = process.env.PORT || 3000;
const BASE_HTTPS_PORT = process.env.HTTPS_PORT || 8443; // Force IPv4 to avoid issues with ::1 vs 127.0.0.1
const HOST = process.env.HOST || '0.0.0.0';
console.log('🌐 Server HOST binding:', HOST);

// Check if we are in PKG mode
if (process.pkg) {
  console.log('📦 PKG mode detected');
  console.log('📁 exe directory:', path.dirname(process.execPath));
  console.log('📁 Working directory:', process.cwd());
}

// Check mobile network access
function checkMobileAccess() {
  const localIP = getLocalIP();
  console.log('📱 CHECKING MOBILE ACCESS:');
  console.log(`   - Detected local IP: ${localIP}`);
  console.log(`   - Server binding: ${HOST}`);
  
  if (HOST === '0.0.0.0') {
    console.log('✅ Server configured for external access');
  } else {
    console.log('⚠️  Server might not be accessible from mobile');
  }
  
  // Check if on Windows for specific suggestions
  const isWindows = process.platform === 'win32';
  if (isWindows) {
    console.log('🪟 Windows system detected');
    console.log('📋 SUGGESTIONS FOR MOBILE ON WINDOWS:');
    console.log('   1. Make sure PC and mobile are on the same Wi-Fi network');
    console.log('   2. Add a Windows firewall exception for this program');
    console.log('   3. If it doesn\'t work, temporarily disable Windows Defender Firewall');
    console.log('   4. On mobile, use HTTPS if available to avoid security errors');
    console.log('   5. If it still doesn\'t work, try disabling antivirus');
  } else {
    console.log('📋 SUGGESTIONS FOR MOBILE:');
    console.log('   1. Make sure PC and mobile are on the same Wi-Fi network');
    console.log('   2. Temporarily disable firewall if necessary');
    console.log('   3. On mobile, use HTTPS if available to avoid security errors');
  }
  
  console.log(`📱 URL da usare su mobile: http://${localIP}:${BASE_PORT}`);
}

// Initialize the monitor
const monitor = new ServerMonitor();

// Function to find an available port
function findAvailablePort(startPort, maxAttempts = 10) {
  return new Promise((resolve, reject) => {
    let currentPort = startPort;
    let attempts = 0;
    
    function tryPort() {
      if (attempts >= maxAttempts) {
        reject(new Error(`Could not find an available port after ${maxAttempts} attempts`));
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
          console.log(`⚠️  Port ${currentPort - 1} is in use, trying ${currentPort}...`);
          tryPort();
        } else {
          reject(err);
        }
      });
    }
    
    tryPort();
  });
}

// === Middleware === // Improved CORS configuration for mobile
app.use(cors({
  origin: function(origin, callback) {
    // Allow all domains for development and mobile
    callback(null, true);
  },
  credentials: true, // Important for sessions
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
  optionsSuccessStatus: 200, // For legacy mobile browser support
  preflightContinue: false,
  maxAge: 86400 // Cache preflight for 24 hours
}));

// Additional middleware to handle mobile preflight requests
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    // nosemgrep: cors-misconfiguration-for-credentials
    // Safe: LAN-only deployment, CORS required for Capacitor mobile app and internal testing
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

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, 'public', 'assets');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Always save as company-logo with original extension
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
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Monitoring middleware (must be before other routes)
app.use(monitor.logRequest.bind(monitor));

// Middleware to improve mobile connectivity
app.use((req, res, next) => {
  // Additional headers for mobile
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('X-Content-Type-Options', 'nosniff');
  res.header('X-Frame-Options', 'SAMEORIGIN');

  // Cache control for mobile-friendly static resources
  if (req.url.match(/\.(css|js|png|jpg|jpeg|gif|ico|svg)$/)) {
    res.header('Cache-Control', 'public, max-age=3600');
  } else {
    res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
  }

  // Handle OPTIONS for mobile CORS preflight
  // Safe: Standard preflight handling for mobile app in LAN environment
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
    secure: false, // Important: false for HTTP on local network
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours (default for admin, supervisor, secretary)
  }
}));

// Middleware for employee timeout (5 minutes)
app.use((req, res, next) => {
  if (req.session.user && req.session.user.ruolo === 'dipendente') {
    const now = Date.now();
    const fiveMinutesInMs = 5 * 60 * 1000; // 5 minutes in milliseconds

    // If it's the first time the employee session is set
    if (!req.session.dipendenteStartTime) {
      req.session.dipendenteStartTime = now;
    }

    // Check if more than 5 minutes have passed
    const sessionDuration = now - req.session.dipendenteStartTime;
    if (sessionDuration > fiveMinutesInMs) {
      console.log(`🕐 Employee session ${req.session.user.username} expired after 5 minutes`);

      // Destroy the session
      req.session.destroy((err) => {
        if (err) {
          console.error('Error destroying employee session:', err);
        }
      });

      res.clearCookie('connect.sid'); // If it's an API request, return a JSON error
      if (req.path.startsWith('/api/')) {
        return res.status(401).json({
          error: 'Session expired. Employees can only stay connected for 5 minutes.',
          timeout: true
        });
      }

      // Otherwise, redirect to login
      return res.redirect('/login.html?timeout=dipendente');
    }
  }
  next();
}); // Serve static files with PKG support - CORRECT DETECTION
let publicDir;
const isPKGForPublic = (process.pkg !== undefined) || (__dirname.includes('snapshot'));

if (isPKGForPublic) {
  // In PKG mode, use external files next to the exe
  publicDir = path.join(path.dirname(process.execPath), 'public');
  console.log('📦 PKG mode - using external files next to the exe');
  console.log(`   - Exe path: ${process.execPath}`);
  console.log(`   - Exe dir: ${path.dirname(process.execPath)}`);
} else {
  // Normal development mode
  publicDir = path.join(__dirname, 'public');
  console.log('🔧 Development mode - using internal files');
}
console.log('📁 Final public directory:', publicDir);

// [FIX v1.1.1] Set correct MIME types for static files (PWA fix)
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

// === DB INIT === // Determine the database folder with ROBUST path management
function getDataDirectory() {
  let dataDir;
  
  // ENVIRONMENT DETECTION: PKG, Electron or development
  const isPKG = process.env.PKG_MODE === 'true' || process.pkg || __dirname.includes('snapshot');
  const isElectron = process.env.ELECTRON_MODE === 'true' || process.versions?.electron;
  
  console.log('🔍 DETERMINING DATABASE DIRECTORY...');
  console.log(`   - process.pkg: ${process.pkg ? 'YES (object present)' : 'NO'}`);
  console.log(`   - __dirname: ${__dirname}`);
  console.log(`   - __dirname contains snapshot: ${__dirname.includes('snapshot')}`);
  console.log(`   - process.execPath: ${process.execPath}`);
  console.log(`   - PKG mode detected: ${isPKG ? 'YES' : 'NO'}`);
  console.log(`   - Electron mode detected: ${isElectron ? 'YES' : 'NO'}`);

  if (isElectron) {
    // In Electron mode, use a fixed folder to avoid problems with package names
    const os = require('os');
    const userDataPath = path.join(os.homedir(), 'AppData', 'Roaming', 'Gestione Permessi');
    dataDir = path.join(userDataPath, 'data');
    console.log('⚡ Electron mode, database in:', dataDir);
  } else if (isPKG) {
    // In PKG mode (native exe), ALWAYS use the exe directory
    const exeDir = path.dirname(process.execPath);
    dataDir = path.join(exeDir, 'data');
    console.log('📦 PKG mode detected');
    console.log(`   - EXE Directory: ${exeDir}`);
    console.log(`   - Database will be in: ${dataDir}`);
  } else {
    // In development or direct execution
    dataDir = path.join(__dirname, 'data');
    console.log('🔧 Development mode, database in:', dataDir);
  }
  
  // FUNDAMENTAL PRELIMINARY CHECKS
  console.log('🔍 PRELIMINARY CHECKS...');
  
  // 1. Verify that the public directory exists
  if (!fs.existsSync(publicDir)) {
    console.error(`❌ CRITICAL ERROR: Public directory not found: ${publicDir}`);
    console.error('🔧 SOLUTION: Make sure the public folder is present next to the exe');
    process.exit(1);
  } else {
    console.log('✅ Public directory verified:', publicDir);
  }
  
  // 2. ALWAYS check and create the database directory if it does not exist
  try {
    if (!fs.existsSync(dataDir)) {
      console.log('📁 Database directory does not exist, creating...');
      fs.mkdirSync(dataDir, { recursive: true });
      console.log('✅ Database directory created successfully:', dataDir);
    } else {
      console.log('✅ Database directory already exists:', dataDir);
    }
    
    // 3. Write test to verify permissions
    const testFile = path.join(dataDir, '.test-write');
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);
    console.log('✅ Write test in database directory: OK');
    
  } catch (error) {
    console.error(`❌ CRITICAL ERROR creating/accessing database directory (${dataDir}):`, error.message);
    console.error('📋 Stack trace:', error.stack); // FALLBACK: use temp directory as a last resort
    const os = require('os');
    const fallbackDir = path.join(os.tmpdir(), 'gestione-permessi-fallback-' + Date.now());
    console.log(`🆘 FALLBACK attempt with temporary directory: ${fallbackDir}`);
    
    try {
      fs.mkdirSync(fallbackDir, { recursive: true });
      dataDir = fallbackDir;
      console.log('✅ Fallback directory created successfully:', fallbackDir);
    } catch (fallbackError) {
      console.error('❌ FATAL ERROR: Unable to create fallback directory either:', fallbackError.message);
      throw new Error(`CRITICAL ERROR: Unable to create directory for database. Last attempt failed: ${fallbackError.message}`);
    }
  }
  
  return dataDir;
}

const dataDir = getDataDirectory();

console.log('');
console.log('=' .repeat(60));
console.log('🗄️  FINAL DATABASE CONFIGURATION');
console.log('=' .repeat(60));
console.log(`📂 Directory: ${dataDir}`);
const dbPath = path.join(dataDir, 'database.sqlite');
console.log(`📄 DB File: ${dbPath}`);
console.log(`💾 Size: ${fs.existsSync(dbPath) ? (fs.statSync(dbPath).size / 1024).toFixed(1) + ' KB' : 'New database'}`);
console.log('=' .repeat(60));
console.log('');

// Check if the database exists, otherwise create it empty
let needsInitialization = false;
if (!fs.existsSync(dbPath)) {
  console.log('🆕 Database does not exist, it will be created and initialized');
  needsInitialization = true;
}

// Standard sqlite3 connection with improved error handling
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ CRITICAL ERROR: Could not open/create database:', err.message);
    process.exit(1);
  }
  console.log('✅ Database connected successfully:', dbPath);
});

// Standard sqlite3 database initialization
db.serialize(async () => {
  console.log('🔧 Initializing database...');
  
  try {
    // 1. Users table
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
          console.error('❌ Error creating users table:', err.message);
          reject(err);
        } else {
          console.log('✅ Users table created/verified');
          // Safe: Database initialization in controlled environment
          resolve();
        }
      });
    });

    // 2. Check for existing users
    const userCount = await new Promise((resolve, reject) => {
      db.get("SELECT COUNT(*) as count FROM utenti", (err, row) => {
        if (err) {
          console.error('❌ Error checking for existing users:', err.message);
          reject(err);
        } else {
          resolve(row.count);
        }
      });
    });

    console.log(`👥 Existing users in the database: ${userCount}`);

    // EMPTY DATABASE FOR TESTING - DO NOT CREATE USERS AUTOMATICALLY
    if (userCount === 0) {
      console.log('📋 Empty database detected');
      console.log('🔧 TEST MODE: No default users created');
      console.log('');
      console.log('🔑 To create the first admin user:');
      console.log('   1. Vai su http://localhost:3000/register.html'); 
      console.log('   2. Or use the API: POST /api/register');
      console.log('');
    } else {
      console.log('ℹ️  Existing users found in the database');

      // Migration: Add password_reset_required column if it doesn't exist
      await new Promise((resolve, reject) => {
        db.run(`ALTER TABLE utenti ADD COLUMN password_reset_required INTEGER DEFAULT 0`, (err) => {
          if (err && !err.message.includes('duplicate column name')) {
            console.error('❌ Error updating users table:', err.message);
            reject(err);
          } else {
            if (!err) {
              console.log('✅ password_reset_required column added to users table');
            }
            resolve();
          }
        });
      });
    }

    // 3. WiFi table
    await new Promise((resolve, reject) => {
      db.run(`CREATE TABLE IF NOT EXISTS wifi (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        ssid TEXT,
        password TEXT
      )`, (err) => {
        if (err) {
          console.error('❌ Error creating wifi table:', err.message);
          reject(err);
        } else {
          console.log('✅ wifi table created/verified');
          resolve();
        }
      });
    }); // 4. Requests table
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
          console.error('❌ Error creating requests table:', err.message);
          reject(err);
        } else {
          console.log('✅ requests table created/verified');
          resolve();
        }
      });
    });

    // 5. Add new columns for leave types if they don't exist
    const alterTableQueries = [
      'ALTER TABLE richieste ADD COLUMN retribuito INTEGER DEFAULT 0',
      'ALTER TABLE richieste ADD COLUMN daRecuperare INTEGER DEFAULT 0',
      'ALTER TABLE richieste ADD COLUMN nonRetribuito INTEGER DEFAULT 0',
      'ALTER TABLE richieste ADD COLUMN permessoSindacale INTEGER DEFAULT 0',
      'ALTER TABLE richieste ADD COLUMN inCFerie INTEGER DEFAULT 0',
      'ALTER TABLE utenti ADD COLUMN email TEXT'
    ];

    // 6. Create table for password resets
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
          console.error('❌ Error creating password_resets table:', err.message);
          reject(err);
        } else {
          console.log('✅ password_resets table created/verified');
          resolve();
        }
      });
    });

    // 7. Create table for email queue
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
          console.error('❌ Error creating email_queue table:', err.message);
          reject(err);
        } else {
          console.log('✅ email_queue table created/verified');
          resolve();
        }
      });
    });

    // 8. Create table for SMTP email configurations
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
          console.error('❌ Error creating email_config table:', err.message);
          reject(err);
        } else {
          console.log('✅ email_config table created/verified');
          resolve();
        }
      });
    });

    // 9. Create table for company settings
    await new Promise((resolve, reject) => {
      db.run(`CREATE TABLE IF NOT EXISTS company_settings (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        company_name TEXT DEFAULT 'WKF Suite',
        logo_path TEXT,
        notification_email TEXT,
        standard_vacation_days INTEGER DEFAULT 22
      )`, (err) => {
        if (err) {
          console.error('❌ Error creating company_settings table:', err.message);
          reject(err);
        } else {
          console.log('✅ company_settings table created/verified');
          resolve();
        }
      });
    });

    // 10. Create table for Stripe payments
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
          console.error('❌ Error creating stripe_payments table:', err.message);
          reject(err);
        } else {
          console.log('✅ stripe_payments table created/verified');
          resolve();
        }
      });
    });

    // 11. Create table for license activations (compatibility)
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
          console.error('❌ Error creating license_activations table:', err.message);
          reject(err);
        } else {
          console.log('✅ license_activations table created/verified');
          resolve();
        }
      });
    });

    for (const query of alterTableQueries) {
      try {
        await new Promise((resolve, reject) => {
          db.run(query, (err) => {
            if (err && !err.message.includes('duplicate column name')) {
              console.error(`⚠️  ALTER TABLE error: ${err.message}`);
            } else if (!err) {
              console.log('✅ Column added to requests table');
            }
            resolve();
          });
        });
      } catch (err) {
        // Ignore errors if the column already exists
        console.log('ℹ️  Column probably already exists');
      }
    }

    console.log('🎉 Database initialization completed successfully!');

    // Initialize database utilities
    global.dbUtils = new DatabaseUtils(db);
    console.log('🔧 Database utilities initialized');

    schedulePeriodicCleanup();

  } catch (err) {
    console.error('❌ CRITICAL ERROR in database initialization:', err.message);
    console.error('📋 Stack trace:', err.stack);
    process.exit(1);
  }
});

// === MIDDLEWARE DI SICUREZZA ===
const requireAuth = (req, res, next) => {
  if (!req.session.user) {
    return res.status(401).json({ error: "Session expired - please log in" });
  }
  next();
};

const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.session.user) {
      return res.status(401).json({ error: "Session expired - please login" });
    }
    if (!roles.includes(req.session.user.ruolo)) {
      return res.status(403).json({ error: "Not authorized for this role" });
    }
    next();
  };
};

// [FIX v1.1.1] Middleware to require Analytics and Mail access (PRO ONLY)
const requirePro = (req, res, next) => {
  if (!req.session.user) {
    return res.status(401).json({ error: "Session expired - please log in" });
  }

  const isProActive = licenseManager.licenseStatus === 'PRO';

  // Only users with an active PRO license have access
  if (isProActive) {
    return next();
  }

  // All others (including FREE Admins) do not have access
  return res.status(403).json({
    error: "Feature available only with a PRO license",
    feature: "Analytics and Mail",
    upgradeUrl: "/upgrade.html"
  });
};
// === HTTPS REDIRECT MIDDLEWARE === (TEMPORARILY DISABLED FOR TESTING)
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
// --- TEST ENDPOINT for mobile connectivity ---
app.get('/api/test', (req, res) => {
  const clientIP = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'];
  const userAgent = req.headers['user-agent'] || 'Unknown';

  res.json({
    success: true,
    message: 'Connection OK',
    timestamp: new Date().toISOString(),
    clientIP: clientIP,
    userAgent: userAgent,
    mobile: /Mobile|Android|iPhone|iPad/.test(userAgent)
  });
});

// Health endpoint for mobile with reduced timeout
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

// Fast ping endpoint for mobile connection test
app.get('/api/ping', (req, res) => {
  res.json({
    pong: true,
    timestamp: Date.now(),
    mobile: /Mobile|Android|iPhone|iPad/.test(req.headers['user-agent'] || '')
  });
});

// === STRIPE PAYMENT ENDPOINTS ===

// 🔑 CENTRALIZED STRIPE CONFIGURATION // ⚠️ SECURITY: Keys loaded ONLY from environment variables (.env)
// ❌ NEVER hardcode keys in this file!
const STRIPE_CONFIG = {
  secretKey: process.env.STRIPE_SECRET_KEY,
  publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  priceId: process.env.STRIPE_PRICE_ID,
  proPrice: parseInt(process.env.WKF_PRO_PRICE) || 2000, // 20 EUR in centesimi
  proCurrency: process.env.WKF_PRO_CURRENCY || 'eur'
};

// Initialize Stripe globally
let stripe = null;
if (STRIPE_CONFIG.secretKey && !STRIPE_CONFIG.secretKey.includes('...')) {
  try {
    stripe = require('stripe')(STRIPE_CONFIG.secretKey);
    console.log('✅ Stripe initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing Stripe:', error.message);
  }
} else {
  console.log('⚠️ Stripe not configured - update the keys in the .env file');
}

// Endpoint to create Stripe checkout session
app.post('/api/create-checkout-session', async (req, res) => {
  try {
    const { productType, returnUrl } = req.body;

    // Verify that Stripe is initialized
    if (!stripe) {
      console.error('❌ Stripe not initialized - check environment variables');
      return res.status(500).json({
        error: 'Stripe not configured. Check the API keys in the .env file'
      });
    }

    // Product configuration
    const products = {
      'wkf-suite-pro': {
        name: 'WKF Suite PRO',
        description: 'Upgrade to WKF Suite PRO - Advanced features',
        amount: STRIPE_CONFIG.proPrice,
        currency: STRIPE_CONFIG.proCurrency
      }
    };

    const product = products[productType];
    if (!product) {
      return res.status(400).json({ error: 'Invalid product' });
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
      customer_email: req.session.user?.email, // If the user is logged in
    });

    res.json({
      sessionId: session.id,
      url: session.url
    });

  } catch (error) {
    console.error('❌ Error creating Stripe session:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
});

// Endpoint to verify payment status
app.get('/api/verify-payment/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;

    // Verify that Stripe is initialized
    if (!stripe) {
      return res.status(500).json({ error: 'Stripe not configured' });
    }

    // Retrieve session
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status === 'paid') {
      // Declare licenseKey outside the try block to make it accessible in the response
      let licenseKey;

      try {
        // Use database utilities for robust management
        const existingPayment = await global.dbUtils.checkExistingPayment(sessionId);

        if (existingPayment) {
          // Payment already processed, use the existing license key
          licenseKey = existingPayment.license_key;
          console.log(`♻️ Payment already processed, reusing license key: ${licenseKey.substring(0, 12)}...`);
        } else {
          // New payment, execute in transaction for consistency
          const customerEmail = session.customer_details?.email || 'unknown';
          licenseKey = generateLicenseKey(customerEmail);
          console.log(`🆕 New payment, generating license key: ${licenseKey.substring(0, 12)}...`);

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

          console.log('✅ Payment and license saved successfully in transaction');
        }
      } catch (dbError) {
        console.error('❌ Critical database error:', dbError);
        return res.status(500).json({
          error: 'Error saving payment',
          details: dbError.message,
          suggestion: 'Try again in a few seconds. If the problem persists, contact support.'
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
    console.error('❌ Error verifying payment:', error);
    res.status(500).json({ error: 'Error verifying payment' });
  }
});

// Webhook endpoint for Stripe (to receive events from the Stripe server)
app.post('/api/stripe-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];

  try {
    if (!stripe || !STRIPE_CONFIG.webhookSecret) {
      console.log('⚠️ Stripe webhook called but not configured');
      return res.status(400).send('Webhook not configured');
    }

    // Verify webhook signature
    const event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_CONFIG.webhookSecret);

    console.log('📨 Stripe webhook received:', event.type);

    // Gestisci eventi Stripe
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;
      case 'payment_intent.payment_failed':
        // Safe: Stripe webhook event handling in secure LAN environment
        await handlePaymentFailed(event.data.object);
        break;
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object);
        break;
      default: // Unhandled event type
        console.log(`Unhandled webhook event: ${event.type}`);
    }

    res.json({ received: true });
  } catch (err) {
    console.error('❌ Stripe webhook error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
});

// Handler for successful payment
async function handlePaymentSucceeded(paymentIntent) {
  console.log('✅ Payment succeeded:', paymentIntent.id);
  // Here you can add logic to send emails, update the database, etc.
}

// Handler for failed payment
async function handlePaymentFailed(paymentIntent) {
  console.log('❌ Payment failed:', paymentIntent.id);
  console.log('Reason:', paymentIntent.last_payment_error?.message);
}

// Handler for completed checkout session
async function handleCheckoutSessionCompleted(session) {
  console.log('🎉 Webhook - Checkout completed:', session.id);

  if (session.payment_status === 'paid') {
    const customerEmail = session.customer_details?.email;

    try {
      // Use database utilities for robust management
      const existingPayment = await global.dbUtils.checkExistingPayment(session.id);

      let licenseKey;

      if (existingPayment) {
        // Payment already processed by the webhook or the verify-payment endpoint
        licenseKey = existingPayment.license_key;
        console.log(`♻️ Webhook - Payment already processed, license key: ${licenseKey.substring(0, 12)}...`);
      } else {
        // New payment, execute in transaction for consistency
        licenseKey = generateLicenseKey(customerEmail);
        console.log(`🆕 Webhook - Generazione license key ${licenseKey.substring(0, 12)}... per ${customerEmail}`);

        await global.dbUtils.transaction(async (dbUtils) => {
          // Salva pagamento Stripe
          await dbUtils.saveStripePayment({
            session_id: session.id,
            payment_intent_id: session.payment_intent || null,
            license_key: licenseKey,
            customer_email: customerEmail || 'unknown',
            // Safe: Stripe SDK guarantees valid session object, fallback to 0 for safety
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

        console.log('✅ Webhook - Payment and license saved successfully in transaction');
      }

      // Here you could send an email with the license key
      // await sendLicenseEmail(customerEmail, licenseKey);
      console.log(`📧 Webhook completato per ${customerEmail} - License: ${licenseKey.substring(0, 12)}...`);

    } catch (dbError) {
      console.error('❌ Webhook - Critical database error:', dbError);
      // Don't block the webhook, but log the error
    }
  }
}

// Function to generate license key (uses the correct method from LicenseManager)
function generateLicenseKey(customerEmail = 'unknown') {
  return LicenseManager.generateLicenseKey(customerEmail);
}

// Endpoint to get the Stripe public key
app.get('/api/stripe/public-key', (req, res) => {
  res.json({
    publicKey: STRIPE_CONFIG.publishableKey
  });
});

// Endpoint per visualizzare i pagamenti (solo admin)
// Endpoint to view payments (admin only)
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
      console.error('❌ Error fetching payments:', err);
      return res.status(500).json({ error: 'Error fetching payments' });
    }

    // Format the amount for display
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

// Endpoint for payment statistics (admin only)
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
    console.error('❌ Error fetching payment statistics:', err);
    res.status(500).json({ error: 'Error fetching statistics' });
  });
});

// --- REGISTER ---
// === MONITORING ENDPOINTS === // Endpoint for monitoring statistics
app.get('/api/monitor/stats', requireRole(['admin']), (req, res) => {
  res.json(monitor.getStats());
});

// Endpoint for monitor logs
app.get('/api/monitor/logs', requireRole(['admin']), (req, res) => {
  try {
    // Log path detection - Same logic as monitor.js
    let logFile;
    const isPKG = process.env.PKG_MODE === 'true' || process.pkg || __dirname.includes('snapshot');
    const isElectron = process.env.ELECTRON_MODE === 'true' || process.versions?.electron;

    if (isPKG) {
      // PKG standalone: log in the exe's directory
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
    } else if (isElectron) { // Electron: user directory
      const os = require('os');
      const userDataPath = path.join(os.homedir(), 'AppData', 'Roaming', 'Gestione Permessi');
      logFile = path.join(userDataPath, 'monitor.log');
    } else {
      // Development mode: logs subdirectory
      logFile = path.join(__dirname, 'logs', 'monitor.log');
    }
    if (fs.existsSync(logFile)) {
      const logs = fs.readFileSync(logFile, 'utf8').split('\n').slice(-100); // Last 100 logs
      res.json({ logs });
    } else {
      res.json({ logs: [] });
    }
  } catch (error) {
    monitor.logError(error);
    res.status(500).json({ error: 'Error reading logs' });
  }
});

// === API ENDPOINTS ===
app.post("/api/register", async (req, res) => {
  try {
    const { username, password, ruolo, matricola, email } = req.body;
    
    // Basic validations
    if (!username || !password || !ruolo || !matricola) {
      return res.status(400).json({ 
        error: "All fields are required",
        details: "Username, password, role, and employee ID are required"
      });
    }

    // Type validation
    if (typeof username !== 'string' || typeof password !== 'string' || 
        typeof ruolo !== 'string' || typeof matricola !== 'string') {
      return res.status(400).json({ 
        error: "Invalid data format",
        details: "All fields must be strings"
      });
    }

    // Length and format validation
    if (username.trim().length < 3) {
      return res.status(400).json({ 
        error: "Username too short",
        details: "Username must be at least 3 characters"
      });
    }

    if (password.length < 8) {
      return res.status(400).json({ 
        error: "Insecure password",
        details: "Password must be at least 8 characters"
      });
    }

    if (!/^[A-Za-z0-9]+$/.test(matricola.trim())) {
      return res.status(400).json({ 
        error: "Invalid employee ID",
        details: "Employee ID can only contain letters and numbers"
      });
    }

    const validRoles = ['admin', 'segreteria', 'supervisore', 'dipendente'];
    if (!validRoles.includes(ruolo)) {
      return res.status(400).json({
        error: "Invalid role",
        details: `Allowed roles: ${validRoles.join(', ')}`
      });
    }

    // Optional email validation
    if (email && email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        return res.status(400).json({
          error: "Invalid email",
          details: "Enter a valid email address"
        });
      }
    }

    // Admin uniqueness check
    if (ruolo === 'admin') {
      // First, check if an admin already exists
      db.get("SELECT id FROM utenti WHERE ruolo = 'admin'", (err, existingAdmin) => {
        if (err) {
          console.error('Error checking for existing admin:', err);
          return res.status(500).json({ 
            error: "Internal server error",
            details: "Try again later"
          });
        }
        
        if (existingAdmin) {
          return res.status(409).json({ 
            error: "Admin already exists",
            details: "Only one admin can exist in the system"
          });
        }
        
        // If no admin exists, proceed with registration
        registraUtente();
      });
    } else {
      // For other roles, proceed directly
      registraUtente();
    }

    // Internal function to register the user
    async function registraUtente() {
      try {
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        const emailValue = email && email.trim() ? email.trim().toLowerCase() : null;
        const sql = `INSERT INTO utenti (username, password, ruolo, matricola, email) VALUES (?,?,?,?,?)`; // username, password, role, employee ID, email
        db.run(sql, [username.trim(), hashedPassword, ruolo, matricola.trim().toUpperCase(), emailValue], function (err) {
          if (err) {
            if (err.message.includes("UNIQUE constraint failed: utenti.username")) {
              return res.status(409).json({ error: "Username already exists",
                details: "Choose a different username" });
            }
            if (err.message.includes("UNIQUE constraint failed: utenti.matricola")) {
              return res.status(409).json({ 
                error: "Employee ID already exists",
                details: "This employee ID is already registered"
              });
            }
            console.error('Registration error:', err);
            return res.status(500).json({ 
              error: "Internal server error",
              details: "Try again later"
            });
          }
          
          res.status(201).json({ 
            success: true,
            message: "Registration completed successfully", 
            user: { username: username.trim(), ruolo, matricola: matricola.trim().toUpperCase() }
          });
        });
        
      } catch (error) {
        console.error('Password hashing error:', error);
        res.status(500).json({ 
          error: "Internal server error",
          details: "Unable to complete registration"
        });
      }
    }
    
  } catch (error) {
    console.error('General registration error:', error);
    res.status(500).json({ 
      error: "Internal server error",
      details: "Unable to complete registration"
    });
  }
});

// --- LOGIN ---
app.post("/api/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Input validations
    if (!username || !password) {
      return res.status(400).json({ 
        error: "Missing credentials",
        details: "Username and password are required"
      });
    }

    if (typeof username !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ 
        error: "Invalid credential format",
        details: "Username and password must be strings"
      });
    }

    if (username.trim().length === 0 || password.trim().length === 0) {
      return res.status(400).json({ 
        error: "Empty credentials",
        details: "Username and password cannot be empty"
      });
    }

    // Search for user in the database
    db.get("SELECT * FROM utenti WHERE username = ?", [username.trim()], async (err, row) => {
      if (err) {
        console.error('DB error during login:', err);
        return res.status(500).json({ 
          error: "Internal server error",
          details: "Try again later"
        });
      }
      
      if (!row) {
        return res.status(401).json({ 
          error: "Invalid credentials",
          details: "Incorrect username or password"
        });
      }

      try {
        // Verifica password hashata
        const passwordMatch = await bcrypt.compare(password, row.password);
        
        if (!passwordMatch) {
          return res.status(401).json({ 
            error: "Invalid credentials",
            details: "Incorrect username or password"
          });
        }

        // Crea sessione
        req.session.user = {
          id: row.id,
          username: row.username,
          ruolo: row.ruolo,
          matricola: row.matricola
        };

        // Explicitly save the session before responding
        req.session.save((saveErr) => {
          if (saveErr) {
            console.error('Error saving session:', saveErr);
            return res.status(500).json({
              error: "Internal server error",
              details: "Could not save session"
            });
          }

          // Check if the user needs to change their password
          if (row.password_reset_required === 1) {
            return res.json({
              success: true,
              message: "Password change required",
              ruolo: row.ruolo,
              userId: row.id,
              redirectTo: "/change-password.html",
              passwordResetRequired: true,
              username: row.username // role
            });
          }

          // Determine the correct dashboard
          let dashboardUrl = "/dashboardDipendente.html";
          if (['admin', 'supervisore', 'segreteria'].includes(row.ruolo)) {
            dashboardUrl = "/dashboard.html";
          }

          res.json({
            success: true,
            message: "Login successful",
            ruolo: row.ruolo,
            userId: row.id,
            redirectTo: dashboardUrl,
            username: row.username
          });
        });
        
      } catch (bcryptErr) {
        console.error('Password verification error:', bcryptErr);
        return res.status(500).json({ 
          error: "Internal server error",
          details: "Could not verify credentials"
        });
      }
    });
    
  } catch (error) {
    console.error('General login error:', error);
    res.status(500).json({ 
      error: "Internal server error",
      details: "Could not complete login"
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
    if (err) { // Error destroying session
      console.error('Error during session destruction:', err);
      return res.status(500).json({ error: "Error during logout" });
    } // Clear the session cookie
    res.clearCookie('connect.sid'); 
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
    if(err) return res.status(500).json({error:"Database error"});
    res.json(row||{});
  });
});

app.post('/api/wifi', requireRole(['admin']), (req, res) => {
  const { ssid, password } = req.body;
  
  // Server-side validation
  if (!ssid || !password) { // SSID and password are required
    return res.status(400).json({ error: "SSID and password are required" });
  }
  
  if (typeof ssid !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: "SSID and password must be strings" });
  }
  
  if (ssid.trim().length === 0) {
    return res.status(400).json({ error: "SSID cannot be empty" });
  }
  
  if (password.length < 8) {
    return res.status(400).json({ error: "WiFi password must be at least 8 characters" });
  } // Insert or update WiFi credentials
  db.run(
    "INSERT INTO wifi (id, ssid, password) VALUES (1, ?, ?) ON CONFLICT(id) DO UPDATE SET ssid=excluded.ssid, password=excluded.password",
    [ssid, password],
    (err) => {
      if (err) return res.status(500).json({ error: "Error saving WiFi" });
      res.json({ success: true });
    }
  );
});

// === RICHIESTE ===
// Insert new request
app.post('/api/richieste', requireAuth, (req, res) => {
  const payload = req.body || {};
  const userSession = req.session.user;

  const { tipo, dal, al, data, dataInserimento, oraInizio, oraFine, note, tipologia, retribuito, daRecuperare, nonRetribuito, permessoSindacale, inCFerie } = payload;
  const matricola = userSession.matricola;

  // Convert the type into boolean flags
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
        retribuitoFlag = 1; // Default to paid
    }
  } else {
    // Backward compatibility with old flags
    retribuitoFlag = retribuito ? 1 : 0;
    daRecuperareFlag = daRecuperare ? 1 : 0;
    nonRetribuitoFlag = nonRetribuito ? 1 : 0;
    permessoSindacaleFlag = permessoSindacale ? 1 : 0;
    inCFerieFlag = inCFerie ? 1 : 0;
  }
  if (!matricola) return res.status(400).json({ error: "Employee ID missing in session" });

  // Validations
  if (!tipo) return res.status(400).json({ error: "Leave type missing" });
  if (tipo === 'piu_giorni' && !(dal && al)) {
    return res.status(400).json({ error: "Date range (from/to) missing" });
  }
  if (tipo === 'giornaliero' && !data) {
    return res.status(400).json({ error: "Date missing for daily leave" });
  }
  if (tipo === 'ore' && !(data && oraInizio && oraFine)) {
    return res.status(400).json({ error: "Date and times missing for hourly leave" });
  }

  // Retrieve name and surname (for now we use username as name)
  db.get("SELECT username AS nome, username AS cognome FROM utenti WHERE matricola = ?", [matricola], (err, userRow) => {
    if (err || !userRow) return res.status(500).json({ error: "User not found" });

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
        if(err) return res.status(500).json({error:"Database error"});

        // Notify admin and supervisor of the new request (only if WiFi is connected)
        try {
          await sendNotificationEmail(
            ['admin', 'supervisore'],
            'New leave request',
            `A new leave request has been submitted:\n\nEmployee: ${nome} ${cognome} (${matricola})\nType: ${tipo}\nPeriod: ${dal} - ${al}\n\nLogin to the system to approve or reject it.`,
            'new_request'
          );
        } catch (notifErr) {
          console.error('❌ Error sending new request notification:', notifErr);
        }

        res.json({ success:true, id:newId });
      }
    );
  });
});

// List my requests
app.get('/api/richieste/mie', requireAuth, (req,res)=>{
  const { matricola } = req.session.user;
  db.all("SELECT * FROM richieste WHERE matricola=? ORDER BY createdAt DESC",[matricola],(err,rows)=>{
    if(err) return res.status(500).json({error:"Database error"});
    res.json(rows);
  });
});

// List all requests (for admin/supervisor) - EMPLOYEES ONLY
app.get('/api/richieste', requireRole(['admin', 'supervisore']), (req,res)=>{
  // Filter only employee requests
  const query = `
    SELECT r.*
    FROM richieste r
    INNER JOIN utenti u ON r.matricola = u.matricola
    WHERE u.ruolo = 'dipendente'
    ORDER BY r.createdAt DESC
  `;

  db.all(query, (err,rows)=>{
    if(err) { // Error loading requests
      console.error('Error loading requests:', err);
      return res.status(500).json({error:"Database error"});
    }
    res.json(rows);
  });
});

// Update request status
app.patch('/api/richieste/:id', requireRole(['admin', 'supervisore']), (req,res)=>{
  const { stato } = req.body;
  db.run("UPDATE richieste SET stato=?, updatedAt=? WHERE id=?",[stato,new Date().toISOString(),req.params.id],(err)=>{
    if(err) return res.status(500).json({error:"Update error"});
    res.json({success:true});
  });
}); // Print request (legacy)
app.get('/stampa/:id', requireAuth, (req,res)=>{
  db.get("SELECT * FROM richieste WHERE id=?",[req.params.id],(err,row)=>{
    if(err || !row) return res.status(404).send("Request not found");
    // Verify that the employee can only see their own requests
    if (req.session.user.ruolo === 'dipendente' && row.matricola !== req.session.user.matricola) {
      return res.status(403).send("Not authorized");
    }
    res.send(`
      <html>
      <head><title>Stampa Permesso</title></head>
      <body>
        <h2>Leave Request</h2>
        <p><b>Nome:</b> ${row.nome} ${row.cognome}</p>
        <p><b>Matricola:</b> ${row.matricola}</p>
        <p><b>Tipo:</b> ${row.tipo}</p>
        <p><b>Dal:</b> ${row.dal || '-'}</p>
        <p><b>Al:</b> ${row.al || '-'}</p>
        <p><b>Ore:</b> ${row.ore || '-'}</p>
        <p><b>Note:</b> ${row.note || '-'}</p>
        <p><b>Status:</b> ${row.stato}</p>
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

// Endpoint for secretariat to insert requests for employees
app.post('/api/richieste/segreteria', requireRole(['segreteria']), (req, res) => {
  const userSession = req.session.user;

  const { tipo, dal, al, data, dataInserimento, oraInizio, oraFine, note, matricolaDipendente, retribuito, daRecuperare, nonRetribuito, permessoSindacale, inCFerie } = req.body;
  
  if (!matricolaDipendente) {
    return res.status(400).json({ error: "Employee ID missing" });
  }

  // Validations
  if (!tipo) return res.status(400).json({ error: "Leave type missing" });
  if (tipo === 'piu_giorni' && !(dal && al)) {
    return res.status(400).json({ error: "Date range (from/to) missing" });
  }
  if (tipo === 'giornaliero' && !data) {
    return res.status(400).json({ error: "Date missing for daily leave" });
  }
  if (tipo === 'ore' && !(data && oraInizio && oraFine)) {
    return res.status(400).json({ error: "Date and times missing for hourly leave" });
  }

  // Verify that the employee exists
  db.get("SELECT username FROM utenti WHERE matricola = ?", [matricolaDipendente], (err, userRow) => {
    if (err) return res.status(500).json({ error: "DB Error" });
    if (!userRow) return res.status(404).json({ error: "Employee with this ID not found" });

    const nome = userRow.username;
    const cognome = userRow.username; // For now, we use username as first and last name
    const oreCombined = oraInizio && oraFine ? `${oraInizio}-${oraFine}` : null;
    const createdAt = new Date().toISOString();
    const noteFinali = note + ` (Inserita da segreteria: ${userSession.username})`;

    const newId = uuidv4();
    db.run(
      `INSERT INTO richieste (id,nome,cognome,matricola,tipo,dal,al,data,oraInizio,oraFine,ore,note,stato,retribuito,daRecuperare,nonRetribuito,permessoSindacale,inCFerie,createdAt,updatedAt)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,'in attesa',?,?,?,?,?,?,?)`,
      [newId, nome, cognome, matricolaDipendente, tipo, dal, al, data, oraInizio, oraFine, oreCombined, noteFinali, retribuito?1:0, daRecuperare?1:0, nonRetribuito?1:0, permessoSindacale?1:0, inCFerie?1:0, createdAt, createdAt],
      async function(err) {
        if (err) { // Error inserting secretariat request
          console.error("Error inserting secretariat request:", err);
          return res.status(500).json({ error: "Error inserting request" });
        }

        // Notify admin and supervisor of the new request (only if WiFi is connected)
        try {
          await sendNotificationEmail(
            ['admin', 'supervisore'],
            'New leave request (from secretariat)',
            `A new leave request has been submitted by the secretariat:\n\nEmployee: ${nome} ${cognome} (${matricolaDipendente})\nType: ${tipo}\nPeriod: ${dal} - ${al}\nSubmitted by: ${userSession.username}\n\nLogin to the system to approve or reject it.`,
            'new_request_secretary'
          );
        } catch (notifErr) {
          console.error('❌ Error sending new secretariat request notification:', notifErr);
        }

        res.json({ success: true, id: newId, message: "Request submitted for employee" });
      }
    );
  });
}); // Endpoint to get all requests (admin/supervisor/secretariat)
// === NOTIFICATION ENDPOINTS ===

// API to get unread notifications
app.get('/api/notifications', requireAuth, (req, res) => {
  const userSession = req.session.user;
  const { ruolo, matricola } = userSession;
  const lastCheck = req.query.lastCheck || '1970-01-01T00:00:00.000Z';

  if (ruolo === 'admin' || ruolo === 'supervisore') {
    // Notifications for admins/supervisors: new requests
    const query = `
      SELECT id, nome, cognome, tipo, stato, createdAt, updatedAt
      FROM richieste
      WHERE createdAt > ? AND stato = 'in attesa'
      ORDER BY createdAt DESC
    `;

    db.all(query, [lastCheck], (err, rows) => {
      if (err) { // Error fetching admin notifications
        console.error('Error fetching admin notifications:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      const notifications = rows.map(row => ({
        id: row.id,
        type: 'new_request',
        title: 'New Request',
        message: `${row.nome} ${row.cognome} - ${row.tipo}`,
        timestamp: row.createdAt,
        data: { requestId: row.id }
      }));

      res.json({ notifications, lastCheck: new Date().toISOString() });
    });

  } else { // Notifications for employees: request status changed
    const query = `
      SELECT id, tipo, stato, updatedAt
      FROM richieste
      WHERE matricola = ? AND updatedAt > ? AND stato != 'in attesa'
      ORDER BY updatedAt DESC
    `;

    db.all(query, [matricola, lastCheck], (err, rows) => {
      if (err) { // Error fetching employee notifications
        console.error('Error fetching employee notifications:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      const notifications = rows.map(row => ({
        id: row.id,
        type: row.stato === 'approvata' ? 'approved' : 'rejected',
        title: row.stato === 'approvata' ? 'Leave Approved' : 'Leave Rejected',
        message: `Your request ${row.tipo} has been ${row.stato === 'approvata' ? 'approved' : 'rejected'}`,
        timestamp: row.updatedAt,
        data: { requestId: row.id, status: row.stato }
      }));

      res.json({ notifications, lastCheck: new Date().toISOString() });
    });
  }
});

app.get('/api/richieste/tutte', requireRole(['admin', 'supervisore', 'segreteria']), (req, res) => {
  const userSession = req.session.user;

  // Query to get only employee requests (excludes admin/supervisor/secretariat)
  const query = `
    SELECT r.*
    FROM richieste r
    INNER JOIN utenti u ON r.matricola = u.matricola
    WHERE u.ruolo = 'dipendente'
    ORDER BY r.createdAt DESC
  `;

  db.all(query, (err, rows) => {
    if (err) { // Error loading requests
      console.error('Error loading requests:', err);
      return res.status(500).json({ error: "Database error" });
    }
    res.json(rows || []);
  });
});

// Endpoint to approve a request
app.put('/api/richieste/:id/approva', requireRole(['admin', 'supervisore']), (req, res) => {
  const userSession = req.session.user;

  const richiestaId = req.params.id;
  const now = new Date().toISOString();

  // First, get the request details
  db.get("SELECT * FROM richieste WHERE id = ?", [richiestaId], (err, richiesta) => {
    if (err) return res.status(500).json({ error: "DB Error" });
    if (!richiesta) return res.status(404).json({ error: "Request not found" });

    db.run(
      "UPDATE richieste SET stato = ?, updatedAt = ? WHERE id = ?",
      ['approvata', now, richiestaId],
      async function(err) {
        if (err) return res.status(500).json({ error: "DB Error" });
        if (this.changes === 0) return res.status(404).json({ error: "Request not found" });

        // Notifica segreteria e dipendente dell'approvazione (solo se WiFi connesso)
        try {
          // Notifica dipendente tramite la sua email se l'ha
          db.get("SELECT email, username FROM utenti WHERE matricola = ?", [richiesta.matricola], async (err, employee) => {
            if (!err && employee && employee.email) {
              await addToEmailQueue(
                employee.email,
                'Leave approved',
                `Your leave request has been approved:\n\nType: ${richiesta.tipo}\nPeriod: ${richiesta.dal} - ${richiesta.al}\nApproved by: ${userSession.username}`,
                'request_approved'
              );
            }
          });

          // Notifica segreteria
          await sendNotificationEmail(
            ['segreteria'],
            'Leave approved',
            `A leave request has been approved:\n\nEmployee: ${richiesta.nome} ${richiesta.cognome} (${richiesta.matricola})\nType: ${richiesta.tipo}\nPeriod: ${richiesta.dal} - ${richiesta.al}\nApproved by: ${userSession.username}`,
            'request_approved_secretary'
          );
        } catch (notifErr) {
          console.error('❌ Error sending approval notification:', notifErr);
        }

        res.json({ message: "Request approved" });
      }
    );
  });
});

// Endpoint to reject a request
app.put('/api/richieste/:id/rifiuta', requireRole(['admin', 'supervisore']), (req, res) => {
  const userSession = req.session.user;

  const richiestaId = req.params.id;
  const { motivo } = req.body;
  const now = new Date().toISOString();

  // First, get the request details
  db.get("SELECT * FROM richieste WHERE id = ?", [richiestaId], (err, richiesta) => {
    if (err) return res.status(500).json({ error: "DB Error" });
    if (!richiesta) return res.status(404).json({ error: "Request not found" });

    // Update the status and optionally the reason for rejection in the notes
    const noteFinali = motivo ? `RIFIUTATA - Motivo: ${motivo}` : 'RIFIUTATA';

    db.run(
      "UPDATE richieste SET stato = ?, updatedAt = ?, note = ? WHERE id = ?",
      ['rifiutata', now, noteFinali, richiestaId],
      async function(err) {
        if (err) return res.status(500).json({ error: "DB Error" });
        if (this.changes === 0) return res.status(404).json({ error: "Request not found" });

        // Notifica segreteria e dipendente del rifiuto (solo se WiFi connesso)
        try {
          // Notifica dipendente tramite la sua email se l'ha
          db.get("SELECT email, username FROM utenti WHERE matricola = ?", [richiesta.matricola], async (err, employee) => {
            if (!err && employee && employee.email) {
              await addToEmailQueue(
                employee.email,
                'Leave rejected',
                `Your leave request has been rejected:\n\nType: ${richiesta.tipo}\nPeriod: ${richiesta.dal} - ${richiesta.al}\nRejected by: ${userSession.username}${motivo ? `\nReason: ${motivo}` : ''}`,
                'request_rejected'
              );
            }
          });

          // Notifica segreteria
          await sendNotificationEmail(
            ['segreteria'],
            'Leave rejected',
            `A leave request has been rejected:\n\nEmployee: ${richiesta.nome} ${richiesta.cognome} (${richiesta.matricola})\nType: ${richiesta.tipo}\nPeriod: ${richiesta.dal} - ${richiesta.al}\nRejected by: ${userSession.username}${motivo ? `\nReason: ${motivo}` : ''}`,
            'request_rejected_secretary'
          );
        } catch (notifErr) {
          console.error('❌ Error sending rejection notification:', notifErr);
        }

        res.json({ message: "Request rejected" });
      }
    );
  });
});

// Endpoint to generate WiFi QR code
app.get('/api/wifi/qrcode', requireRole(['admin', 'supervisore', 'segreteria']), (req, res) => {
  const userSession = req.session.user;

  // Retrieve WiFi credentials from the database
  db.get("SELECT * FROM wifi WHERE id = 1", async (err, row) => {
    if (err) return res.status(500).json({ error: "DB Error" });
    if (!row || !row.ssid || !row.password) {
      return res.status(404).json({ error: "WiFi credentials not configured. Go to WiFi Configuration first." });
    }

    try {
      // Standard WiFi QR Code format
      // WIFI:T:WPA;S:SSID;P:password;H:false;;
      const wifiString = `WIFI:T:WPA;S:${row.ssid};P:${row.password};H:false;;`;
      
      // Generate QR code
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
        message: "QR code generated successfully"
      });

    } catch (error) {
      console.error('Error generating QR code:', error);
      res.status(500).json({ error: "Error generating QR code" });
    }
  });
});

// Endpoint to generate browser connection QR code
app.get('/api/browser/qrcode', requireRole(['admin', 'supervisore', 'segreteria']), async (req, res) => {
  try {
    const localIP = getLocalIP();
    const httpsPort = BASE_HTTPS_PORT;
    const httpPort = BASE_PORT;

    // Prefer HTTPS if available, otherwise HTTP with full path
    const browserUrl = `https://${localIP}:${httpsPort}/index.html`;
    const fallbackUrl = `http://${localIP}:${httpPort}/index.html`;

    // Generate QR code for the main URL
    const qrCodeDataURL = await QRCode.toDataURL(browserUrl, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000', // QR code color
        light: '#FFFFFF'
      }
    });

    res.json({
      success: true,
      qrcode: qrCodeDataURL, // QR code data URL
      primaryUrl: browserUrl,
      fallbackUrl: fallbackUrl,
      message: "Browser connection QR code generated successfully"
    });

  } catch (error) {
    console.error('Errore generazione QR code browser:', error);
    res.status(500).json({ error: "Error generating browser QR code" });
  }
});

// Endpoint to get WiFi info (without password for security)
app.get('/api/wifi/info', requireRole(['admin', 'supervisore', 'segreteria']), (req, res) => {
  const userSession = req.session.user;

  db.get("SELECT ssid FROM wifi WHERE id = 1", (err, row) => {
    if (err) return res.status(500).json({ error: "DB Error" });
    res.json({
      configured: !!row,
      ssid: row ? row.ssid : null
    });
  });
});

// === EMAIL CONFIG (admin and supervisor) === // [FIX v1.1.1] Email config available ONLY with PRO
app.get('/api/email-config', requirePro, (req, res) => {
  db.get("SELECT * FROM email_config WHERE id = 1", (err, config) => {
    if (err) return res.status(500).json({ error: "DB Error" });

    // Do not send the password for security
    if (config) {
      delete config.smtp_password;
    }

    res.json(config || {});
  });
});

// [FIX v1.1.1] Save email config available ONLY with PRO
app.post('/api/email-config', requirePro, (req, res) => {
  const { smtp_host, smtp_port, smtp_secure, smtp_user, smtp_password, from_email, from_name, enabled } = req.body;

  // Check if email notifications are available in current license
  if (enabled && !licenseManager.hasFeature('email_notifications')) {
    return res.status(403).json({
      error: "PRO feature required",
      message: "Email sending is only available in WKF Suite PRO. You can configure the settings but not enable sending.",
      upgradeUrl: "https://wkfsuite.com/upgrade"
    });
  }

  // Server-side validations
  if (enabled && (!smtp_host || !smtp_user || !smtp_password || !from_email)) {
    return res.status(400).json({ error: "All SMTP fields are required when enabled" });
  }

  if (enabled && smtp_port && (isNaN(smtp_port) || smtp_port < 1 || smtp_port > 65535)) {
    return res.status(400).json({ error: "Invalid SMTP port" });
  }

  if (enabled && from_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(from_email)) {
    return res.status(400).json({ error: "Invalid sender email" });
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
    if (err) return res.status(500).json({ error: "Error saving email configuration" });
    res.json({ success: true });
  });
});

// [FIX v1.1.1] Test email available ONLY with PRO
app.post('/api/email-config/test', requirePro, async (req, res) => {
  try {
    // Check if email notifications are available in current license
    if (!licenseManager.hasFeature('email_notifications')) {
      return res.status(403).json({
        error: "PRO feature required",
        message: "Email sending is only available in WKF Suite PRO.",
        upgradeUrl: "https://wkfsuite.com/upgrade"
      });
    }

    const { test_email } = req.body;

    if (!test_email) {
      return res.status(400).json({ error: "Test email required" });
    }

    const transporter = await createEmailTransporter();
    if (!transporter) {
      return res.status(400).json({ error: "Invalid or disabled email configuration" });
    }

    const config = await getEmailConfig();

    const mailOptions = {
      from: `"${config.from_name}" <${config.from_email}>`,
      to: test_email,
      subject: 'Test Email - Sistema Gestione Permessi',
      text: 'This is a test email to verify the SMTP configuration.\n\nIf you receive this message, the configuration is correct.\n\nRegards,\nLeave Management System'
    };

    await transporter.sendMail(mailOptions);

    res.json({ success: true, message: "Test email sent successfully" });
  } catch (error) {
    console.error('❌ Test email error:', error);
    res.status(500).json({
      error: "Error sending test email",
      details: error.message
    });
  }
});

// === COMPANY SETTINGS ===
// GET accessibile a tutti per logo e nome (POST solo admin)
app.get('/api/company-settings', requireAuth, (req, res) => {
  db.get("SELECT * FROM company_settings WHERE id = 1", (err, settings) => {
    if (err) return res.status(500).json({ error: "DB Error" });

    res.json(settings || {
      company_name: 'WKF Suite',
      logo_path: null,
      notification_email: null,
      standard_vacation_days: 22
    });
  });
});

app.post('/api/company-settings', requirePro, requireRole(['admin']), upload.single('logo'), (req, res) => {
  const { company_name, notification_email, standard_vacation_days } = req.body;
  const logoFile = req.file;

  // Server-side validations
  if (!company_name || company_name.trim().length === 0) {
    return res.status(400).json({ error: "Company name is required" });
  }

  if (notification_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(notification_email)) {
    return res.status(400).json({ error: "Invalid notification email" });
  }

  if (standard_vacation_days && (standard_vacation_days < 0 || standard_vacation_days > 365)) {
    return res.status(400).json({ error: "Standard vacation days must be between 0 and 365" });
  }

  // Handle the logo if uploaded
  let logoPath = null;
  if (logoFile) {
    logoPath = `/assets/${logoFile.filename}`;
    console.log('📸 Company logo uploaded:', logoPath);
  }

  // First, read existing settings to keep the logo if a new one is not uploaded
  db.get("SELECT logo_path FROM company_settings WHERE id = 1", (errGet, existingSettings) => {
    if (errGet) {
      console.error('❌ Error reading existing settings:', errGet);
    }

    console.log('📋 Existing settings:', existingSettings);
    console.log('📷 logoFile present:', !!logoFile);
    console.log('📷 new logoPath:', logoPath);

    // If a logo is uploaded, use the new one, otherwise keep the existing one
    const finalLogoPath = logoFile ? logoPath : (existingSettings?.logo_path || null);
    console.log('✅ finalLogoPath to save:', finalLogoPath);

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

    console.log('💾 Parameters to save:', params);

    db.run(sql, params, function(err) {
      if (err) {
        console.error('❌ Error saving company settings:', err);
        return res.status(500).json({ error: "Error saving company settings" });
      }

      console.log('✅ Company settings saved successfully');
      res.json({
        success: true,
        logo_path: finalLogoPath,
        message: logoFile ? 'Settings and logo saved successfully!' : 'Settings saved successfully!'
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

    // Verify that the database exists
    if (!fs.existsSync(dbPath)) {
      return res.status(404).json({ error: 'Database not found' });
    }

    // Try to open the folder in File Explorer (Windows only)
    let opened = false;
    if (process.platform === 'win32') {
      try {
        require('child_process').exec(`explorer "${dbDir}"`);
        opened = true;
      } catch (err) {
        console.log('⚠️ Could not open File Explorer:', err.message);
      }
    }

    res.json({
      success: true,
      path: dbPath,
      directory: dbDir,
      opened
    });
  } catch (err) {
    console.error('❌ Error locating database:', err);
    res.status(500).json({ error: 'Error finding database' });
  }
});

// Endpoint per informazioni sul database
app.get('/api/database/info', requireRole(['admin']), (req, res) => {
  try {
    const dbPath = path.resolve(__dirname, 'data', 'database.sqlite');

    if (!fs.existsSync(dbPath)) {
      return res.status(404).json({ error: 'Database not found' });
    }

    // Get file info
    const stats = fs.statSync(dbPath);
    const sizeInBytes = stats.size;
    const sizeFormatted = sizeInBytes < 1024 * 1024
      ? `${(sizeInBytes / 1024).toFixed(2)} KB`
      : `${(sizeInBytes / (1024 * 1024)).toFixed(2)} MB`;

    const lastModified = new Date(stats.mtime).toLocaleString('it-IT');

    // Count records in main tables
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

              // Available disk space (optional)
              let diskSpace = 'N/A';
              try {
                const disk = require('child_process').execSync('wmic logicaldisk get size,freespace,caption').toString();
                diskSpace = 'See system';
              } catch (e) {
                // Ignore if not available
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
    console.error('❌ Database info error:', err);
    res.status(500).json({ error: 'Error retrieving database information' });
  }
});

// Endpoint per creare backup del database
app.post('/api/database/backup', requireRole(['admin']), (req, res) => {
  try {
    const dbPath = path.resolve(__dirname, 'data', 'database.sqlite');
    const backupDir = path.resolve(__dirname, 'data', 'backups');

    // Create backups folder if it doesn't exist
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // Backup name with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const backupFileName = `database-backup-${timestamp}.sqlite`;
    const backupPath = path.join(backupDir, backupFileName);

    // Copy the database
    fs.copyFileSync(dbPath, backupPath);

    // Get backup size
    const stats = fs.statSync(backupPath);
    const sizeFormatted = stats.size < 1024 * 1024
      ? `${(stats.size / 1024).toFixed(2)} KB`
      : `${(stats.size / (1024 * 1024)).toFixed(2)} MB`;

    console.log(`✅ Database backup created: ${backupPath}`);

    // Respond with backup details
    res.json({
      success: true,
      backupPath,
      size: sizeFormatted,
      timestamp
    });

  } catch (err) {
    console.error('❌ Database backup error:', err);
    res.status(500).json({ error: 'Error creating backup' });
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
    return res.status(400).json({ error: "License key required" });
  }

  const success = licenseManager.saveLicenseKey(licenseKey.trim());

  if (success) {
    const licenseInfo = licenseManager.getLicenseInfo();
    res.json({
      success: true,
      message: "License key activated successfully! WKF Suite PRO is now active.",
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
      message: "License key removed. WKF Suite is now in FREE mode.",
      status: licenseInfo.status,
      features: licenseInfo.features
    });
  } else {
    res.status(500).json({ error: "Error removing license key" });
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
        error: "Username required",
        details: "Please enter your username"
      });
    }

    db.get("SELECT id, email, username FROM utenti WHERE username = ?", [username.trim()], async (err, user) => {
      if (err) {
        console.error('Error searching for user:', err);
        return res.status(500).json({ error: "Internal server error" });
      }

      if (!user) {
        return res.status(404).json({
          error: "User not found",
          details: "Username does not exist in the system"
        });
      }

      if (!user.email) {
        return res.status(400).json({
          error: "Email missing",
          details: "This user does not have a configured email address. Please contact the administrator."
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
            if (err) { // Error saving reset token
              console.error('Error saving reset token:', err);
              return res.status(500).json({ error: "Internal server error" });
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
                  message: "Reset email sent successfully"
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
                  message: "Request queued. Email will be sent when WiFi is available."
                });
              }
            } catch (emailErr) {
              console.error('Email handling error:', emailErr);
              res.json({
                success: true,
                message: "Token generated but possible issues with email sending"
              });
            }
          }
        );
      } catch (tokenErr) {
        console.error('Token generation error:', tokenErr);
        return res.status(500).json({ error: "Error generating token" });
      }
    });
  } catch (err) {
    console.error('Password recovery error:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post('/api/password/reset', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        error: "Token and new password required"
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        error: "Password too short",
        details: "Password must be at least 8 characters"
      });
    }

    db.get(
      "SELECT pr.*, u.id as user_id, u.username FROM password_resets pr JOIN utenti u ON pr.user_id = u.id WHERE pr.token = ? AND pr.expires_at > ?",
      [token, new Date().toISOString()],
      async (err, resetData) => {
        if (err) { // Error verifying token
          console.error('Error verifying token:', err);
          return res.status(500).json({ error: "Internal server error" });
        }

        if (!resetData) {
          return res.status(400).json({
            error: "Invalid or expired token",
            details: "The reset link has expired or is invalid"
          });
        }

        try {
          const hashedPassword = await bcrypt.hash(newPassword, 12);

          db.run(
            "UPDATE utenti SET password = ? WHERE id = ?",
            [hashedPassword, resetData.user_id],
            function(err) {
              if (err) { // Error updating password
                console.error('Error updating password:', err);
                return res.status(500).json({ error: "Error updating password" });
              }

              db.run("DELETE FROM password_resets WHERE user_id = ?", [resetData.user_id]);

              res.json({
                success: true,
                message: "Password updated successfully"
              });
            }
          );
        } catch (hashErr) {
          console.error('Password hashing error:', hashErr);
          return res.status(500).json({ error: "Error processing password" });
        }
      }
    );
  } catch (err) {
    console.error('Password reset error:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PDF richiesta per dipendenti
app.get('/api/richieste/:id/pdf', requireAuth, (req, res) => {
  const userSession = req.session.user;

  db.get("SELECT * FROM richieste WHERE id=?", [req.params.id], (err, row) => {
    if (err || !row) return res.status(404).send("Request not found");

    // Verify that the employee can only see their own requests
    if (userSession.ruolo === 'dipendente' && row.matricola !== userSession.matricola) {
      return res.status(403).send("Not authorized");
    }

    // Read company settings for logo and name
    db.get("SELECT * FROM company_settings WHERE id = 1", (errSettings, settings) => {
      const companyName = settings?.company_name || 'WKF Suite';
      const logoPath = settings?.logo_path || '/logo.png';

      const dataDisplay = row.data || (row.dal && row.al ? `${row.dal} al ${row.al}` : "-");
      const oreDisplay = row.oraInizio && row.oraFine ? `${row.oraInizio} - ${row.oraFine}` : "-";

      // Determine the type from the record
      let tipologiaDisplay = "💰 Retribuito"; // Default
      if (row.daRecuperare) tipologiaDisplay = "⏰ Da Recuperare";
      else if (row.nonRetribuito) tipologiaDisplay = "❌ Non Retribuito";
      else if (row.permessoSindacale) tipologiaDisplay = "🏛️ Permesso Sindacale";
      else if (row.inCFerie) tipologiaDisplay = "🏖️ C/Ferie";

    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Leave - ${row.matricola}</title>
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
        <div class="info"><strong>Leave Type:</strong> ${row.tipo}</div>
        <div class="info"><strong>Tipologia:</strong> ${tipologiaDisplay}</div>
        <div class="info"><strong>Data/Periodo:</strong> ${dataDisplay}</div>
        <div class="info"><strong>Orario:</strong> ${oreDisplay}</div>
        <div class="info"><strong>Note:</strong> ${row.note || '-'}</div>
        <div class="info"><strong>Status:</strong> <span class="stato">${row.stato || 'pending'}</span></div>
        <div class="info"><strong>Request Date:</strong> ${new Date(row.createdAt).toLocaleString('en-US')}</div>

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

  // Query with JOIN to filter only employees
  let query = `
    SELECT r.*
    FROM richieste r
    INNER JOIN utenti u ON r.matricola = u.matricola
    WHERE u.ruolo = 'dipendente'
  `;
  let params = [];

  // Date filter
  if (dataInizio) {
    query += " AND date(r.createdAt) >= ?";
    params.push(dataInizio);
  }

  if (dataFine) {
    query += " AND date(r.createdAt) <= ?"; // and date(r.createdAt) <= ?
    params.push(dataFine);
  }

  // Employee ID filter
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
    if (err) { // Error in report query
      console.error('Error in report query:', err);
      return res.status(500).json({ error: "Error loading report" });
    }
    
    // Calculate statistics
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
    return res.status(403).json({ error: 'Not authorized' });
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
      return res.status(500).json({ error: 'Error exporting calendar' });
    }

    console.log(`📊 Trovate ${richieste.length} richieste approvate per matricola ${matricola}`);

    // Ottieni info dipendente per il nome del file
    db.get("SELECT username, matricola FROM utenti WHERE matricola = ?", [matricola], (err, dipendente) => {
      if (err) {
        console.error('❌ Errore query dipendente:', err);
        return res.status(500).json({ error: 'Database error' });
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
          error: 'Error generating calendar',
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
  let query = "SELECT id, username, ruolo, matricola FROM utenti"; // id, username, role, employee ID

  if (userSession.ruolo !== 'admin') {
    query += " WHERE ruolo = 'dipendente'";
  }

  query += " ORDER BY username";

  db.all(query, (err, utenti) => {
    if (err) {
      console.error('Error loading users:', err);
      return res.status(500).json({ error: "Error loading users" });
    }
    res.json(utenti || []);
  });
});

// Endpoint per ottenere lista dipendenti (per filtro)
app.get('/api/utenti/dipendenti', requireRole(['admin', 'supervisore', 'segreteria']), (req, res) => {
  db.all("SELECT id, username, matricola, ruolo FROM utenti WHERE ruolo = 'dipendente' ORDER BY username", (err, dipendenti) => {
    if (err) { // Error loading employees
      console.error('Error loading employees:', err);
      return res.status(500).json({ error: "Error loading employees" });
    }
    res.json(dipendenti || []);
  });
});

// Endpoint per rimuovere utenti dipendenti
app.delete('/api/utenti/:id', requireRole(['admin', 'supervisore', 'segreteria']), (req, res) => {
  const userId = req.params.id;
  const userSession = req.session.user;

  // First, verify that the user exists and is an employee
  db.get("SELECT id, username, ruolo FROM utenti WHERE id = ?", [userId], (err, user) => {
    if (err) { // Error verifying user
      console.error('Error verifying user:', err);
      return res.status(500).json({ error: "Error verifying user" });
    }

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Verify that it is an employee (cannot delete admin, supervisor, secretariat)
    if (user.ruolo !== 'dipendente') {
      return res.status(403).json({ error: "Cannot delete users with administrative roles" });
    }

    // Delete the user
    db.run("DELETE FROM utenti WHERE id = ?", [userId], function(err) {
      if (err) { // Error deleting user
        console.error('Error deleting user:', err);
        return res.status(500).json({ error: "Error deleting user" });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: "User not found" });
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

// Function to generate a temporary password
function generateTempPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

// Endpoint to reset user password (admin only)
app.post('/api/utenti/:id/reset-password', requireRole(['admin']), async (req, res) => {
  const userId = req.params.id;
  const userSession = req.session.user;

  try {
    // Verify that the user exists
    const user = await new Promise((resolve, reject) => {
      db.get("SELECT id, username, ruolo FROM utenti WHERE id = ?", [userId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Generate temporary password
    const tempPassword = generateTempPassword();
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    // Update password and set flag for mandatory change
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

    console.log(`🔐 Password reset for user '${user.username}' by admin ${userSession.username}`);

    res.json({
      success: true,
      message: `Password reset for user ${user.username}`,
      tempPassword: tempPassword,
      username: user.username
    });

  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ error: "Internal server error during password reset" });
  }
});

// Endpoint for mandatory password change
app.post('/api/change-required-password', requireAuth, async (req, res) => {
  const { newPassword, confirmPassword } = req.body;
  const userId = req.session.user.id;

  try {
    // Validazioni
    if (!newPassword || !confirmPassword) {
      return res.status(400).json({ error: "Password and confirmation are required" });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: "Passwords do not match" });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters long" });
    }

    // Check that it contains at least one letter and one number
    if (!/[a-zA-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      return res.status(400).json({
        error: "Password must contain at least one letter and one number"
      });
    }

    // Verify that the user has password_reset_required = 1
    const user = await new Promise((resolve, reject) => {
      db.get("SELECT password_reset_required FROM utenti WHERE id = ?", [userId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!user || !user.password_reset_required) {
      return res.status(400).json({ error: "Password change not required" });
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
      console.error('Dashboard statistics error:', err);
      return res.status(500).json({ error: "Error loading statistics" });
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

// [FIX v1.1.1] Endpoint for charts - Requests per month (PRO ONLY)
app.get('/api/analytics/monthly', requirePro, (req, res) => {
  // Safe: Parameterized SQL query with hardcoded column values for aggregation
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
      console.error('Analytics monthly error:', err);
      return res.status(500).json({ error: "Error loading monthly data" });
    }
    res.json(results || []);
  });
});

// [FIX v1.1.1] Endpoint for charts - Requests by type (PRO ONLY)
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
      console.error('Analytics by-type error:', err);
      return res.status(500).json({ error: "Error loading data by type" });
    }
    res.json(results || []);
  });
});

// [FIX v1.1.1] Endpoint for charts - Top employees by requests (PRO ONLY)
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
      console.error('Analytics top-employees error:', err);
      return res.status(500).json({ error: "Error loading top employees" });
    }
    res.json(results || []);
  });
});

// [FIX v1.1.1] Endpoint for charts - Statistics by hours (PRO ONLY)
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
      console.error('Analytics hours-distribution error:', err);
      return res.status(500).json({ error: "Error loading hours distribution" });
    }
    res.json(results || []);
  });
});

// === HTTPS CONFIGURATION ===
let httpsOptions = null;

// Try to load SSL certificates with multiple paths for production
try {
  let keyPath, certPath;
  
  // In modalità PKG, i certificati devono stare accanto all'exe
  let possibleSslDirs;
  
  if (process.env.PKG_MODE === 'true' || process.pkg) {
    // PKG: only exe directory
    const exeDir = path.dirname(process.execPath);
    possibleSslDirs = [
      exeDir,                        // Directly next to the exe
      path.join(exeDir, 'ssl')       // ssl subdirectory (if it already exists)
    ];
  } else {
    // Normal/Electron mode
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
    console.log('✅ SSL certificates loaded correctly from:', sslDir);
  } else {
    console.log('⚠️  SSL certificates not found, HTTPS disabled');
    console.log('   Searched paths:', possibleSslDirs);
    // Safe: Intentional null assignment to disable HTTPS when certificates not found
    httpsOptions = null;
  }
} catch (error) {
  console.error('⚠️  Error loading SSL certificates:', error.message);
  console.log('   HTTPS disabled');
  httpsOptions = null;
}

// Catch-all route to serve index.html for non-API requests
app.get('/', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

// Catch-all route for HTML pages
app.get('/:page', (req, res, next) => {
  // Se è una richiesta API, passa al prossimo handler
  if (req.path.startsWith('/api/')) {
    return next();
  }
  
  const page = req.params.page;
  const htmlFile = path.join(publicDir, `${page}.html`);
  
  // Check if the HTML file exists
  if (fs.existsSync(htmlFile)) {
    res.sendFile(htmlFile);
  } else {
    // Fallback to index.html
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
      console.log('⚠️ Email configuration not found or disabled');
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
    console.error('❌ Error creating email transporter:', error);
    return null;
  }
}

async function processEmailQueue() {
  const isConnected = await isWiFiConnected();
  if (!isConnected) {
    console.log('📴 WiFi not connected, emails queued');
    return;
  }

  const transporter = await createEmailTransporter();
  if (!transporter) {
    console.log('⚠️ Email transporter not available, emails queued');
    return;
  }

  const config = await getEmailConfig();

  db.all("SELECT * FROM email_queue WHERE sent = FALSE ORDER BY created_at ASC", async (err, rows) => {
    if (err || !rows.length) return;

    for (const row of rows) {
      try {
        console.log(`📧 Sending email to ${row.to_email}: ${row.subject}`);

        const mailOptions = {
          from: `"${config.from_name}" <${config.from_email}>`,
          to: row.to_email,
          subject: row.subject,
          text: row.body
        };

        await transporter.sendMail(mailOptions);

        console.log(`✅ Email sent successfully to ${row.to_email}`);

        db.run("UPDATE email_queue SET sent = TRUE, sent_at = ? WHERE id = ?",
          [new Date().toISOString(), row.id]);

      } catch (error) {
        console.error(`❌ Error sending email to ${row.to_email}:`, error.message);
        db.run("UPDATE email_queue SET error = ? WHERE id = ?", [error.message, row.id]);
      }
    }
  });
}

async function sendNotificationEmail(userRoles, subject, messageBody, type) {
  const isConnected = await isWiFiConnected();
  if (!isConnected) {
    console.log('📴 WiFi not connected, notifications queued');
    return;
  }

  const roleConditions = userRoles.map(() => 'ruolo = ?').join(' OR ');
  const sql = `SELECT email, username FROM utenti WHERE email IS NOT NULL AND email != '' AND (${roleConditions})`;

  db.all(sql, userRoles, async (err, users) => {
    if (err || !users.length) {
      console.log('❌ No users with email found for roles:', userRoles);
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
        console.log(`📧 Notification queued for ${user.username} (${user.email})`);
      } catch (err) {
        console.error(`❌ Error queuing notification for ${user.username}:`, err);
      }
    }
  });
}

// === AUTOMATIC CLEANUP OF OLD PERMISSIONS ===
function cleanupOldPermissions() { // Start automatic cleanup of permissions older than 3 months...
  console.log('🧹 Starting automatic cleanup of permissions older than 3+ months...');

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
      console.error('❌ Error during cleanup of old permissions:', err);
      return;
    }
    if (this.changes > 0) {
      console.log(`✅ Removed ${this.changes} approved/rejected permissions older than 3 months`);
    } else {
      console.log('✅ No old permissions to remove');
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
    // Find available ports
    console.log('🔍 Searching for available ports...');
    const PORT = await findAvailablePort(BASE_PORT);
    const HTTPS_PORT = await findAvailablePort(BASE_HTTPS_PORT);
    
    console.log(`✅ Ports found: HTTP=${PORT}${httpsOptions ? `, HTTPS=${HTTPS_PORT}` : ' (HTTPS disabled)'}`);
    
    // HTTPS Server (only if certificates are available)
    let httpsServer = null;
    if (httpsOptions) {
      try {
        httpsServer = https.createServer(httpsOptions, app);
        
        await new Promise((resolve, reject) => {
          httpsServer.listen(HTTPS_PORT, HOST, () => { // HTTPS server started on...
            console.log(`🔒 HTTPS server started on https://localhost:${HTTPS_PORT}`);
            console.log(`🔒 Accessible on the corporate network at https://${getLocalIP()}:${HTTPS_PORT}`);
            resolve();
          });
          httpsServer.on('error', (err) => { // Error starting HTTPS server
            console.warn('⚠️  Error starting HTTPS server:', err.message);
            httpsServer = null;
            resolve(); // Continua anche se HTTPS fallisce
          });
        });
      } catch (httpsErr) {
        console.warn('⚠️  HTTPS server non disponibile:', httpsErr.message);
        httpsServer = null;
      }
    }
    
    // HTTP Server (fallback and redirect)  
    const httpServer = http.createServer(app);
    
    await new Promise((resolve, reject) => {
      httpServer.listen(PORT, HOST, () => {
        console.log(`📄 HTTP server started on http://localhost:${PORT}`);
        console.log(`📄 Accessible on the corporate network at http://${getLocalIP()}:${PORT}`);
        resolve();
      });
      httpServer.on('error', reject);
    });
    
    // Show final configuration
    console.log('='.repeat(60));
    console.log('CORPORATE NETWORK CONFIGURATION:');
    if (httpsServer) {
      console.log(`📱 MOBILE (recommended): https://${getLocalIP()}:${HTTPS_PORT}`);
    }
    console.log(`💻 DESKTOP: http://${getLocalIP()}:${PORT}`);
    console.log('='.repeat(60));
    
    // Check mobile access
    checkMobileAccess();
    if (httpsServer) {
      console.log('⚠️  IMPORTANT FOR MOBILE:');
      console.log('   - Use HTTPS to avoid security errors');
      console.log('   - Accept the self-signed certificate when prompted');
      console.log('   - On Chrome: click "Advanced" → "Proceed to unsafe site"');
      console.log('   - On Safari: click "Advanced" → "Visit this website"');
      console.log('   - On Firefox: click "Advanced" → "Add Exception"');
    } else {
      console.log('ℹ️  MOBILE:');
      console.log('   - Use HTTP for now (HTTPS not available)');
      console.log('   - For HTTPS: install SSL certificates in the ssl/ folder');
    }
    console.log('='.repeat(60));
    
    // Setup graceful shutdown
    setupGracefulShutdown(httpsServer, httpServer);
    
  } catch (error) {
    console.error('❌ Error starting server:', error.message);
    process.exit(1);
  }
}

// Avvia i server
startServers();

// === GRACEFUL SHUTDOWN HANDLING ===
function setupGracefulShutdown(httpsServer, httpServer) {
  process.on('SIGTERM', () => {
    console.log('📴 Received SIGTERM, gracefully shutting down server...');
    gracefulShutdown(httpsServer, httpServer);
  });

  process.on('SIGINT', () => {
    console.log('📴 Received SIGINT (Ctrl+C), gracefully shutting down server...');
    gracefulShutdown(httpsServer, httpServer);
  });

  process.on('uncaughtException', (err) => {
    console.error('❌ Uncaught exception:', err);
    console.log('📴 Forcing server shutdown...');
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled promise rejection:', reason);
    console.log('📴 Forcing server shutdown...');
    process.exit(1);
  });
}

function gracefulShutdown(httpsServer, httpServer) {
  monitor.stop();
  
  const closeHttps = () => {
    return new Promise((resolve) => {
      if (httpsServer) {
        httpsServer.close(() => {
          console.log('🔒 HTTPS Server closed');
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
        console.log('📄 HTTP Server closed');
        resolve();
      });
    });
  };
  
  const closeDb = () => {
    return new Promise((resolve) => {
      db.close(() => {
        console.log('💾 Database closed');
        resolve();
      });
    });
  };
  
  // Close services in sequence
  closeHttps()
    .then(() => closeHttp())
    .then(() => closeDb())
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Error during shutdown:', err);
      process.exit(1);
    });
}

// Function to get the local IP
function getLocalIP() {
  const os = require('os');
  const interfaces = os.networkInterfaces();
  
  console.log('🔍 Available network interfaces:');
  for (const [name, ifaces] of Object.entries(interfaces)) {
    for (const iface of ifaces) {
      if (iface.family === 'IPv4') {
        console.log(`   ${name}: ${iface.address} (${iface.internal ? 'interno' : 'esterno'})`);
      }
    }
  }
  
  // Prioritize the most common network interfaces for mobile connections on Windows
  const priorityInterfaces = [
    'Wi-Fi', 'WiFi', 'Wireless LAN adapter Wi-Fi',
    'Ethernet', 'Local Area Connection', 'Ethernet adapter Ethernet',
    'eth0', 'wlan0'
  ];
  
  // First, search in priority interfaces
  for (const priority of priorityInterfaces) {
    if (interfaces[priority]) {
      for (const interface of interfaces[priority]) {
        if (interface.family === 'IPv4' && !interface.internal) {
          console.log(`🌐 IP found on priority interface ${priority}: ${interface.address}`);
          return interface.address;
        }
      }
    }
  }
  
  // Fallback: search in all external interfaces
  for (const name of Object.keys(interfaces)) {
    for (const interface of interfaces[name]) {
      if (interface.family === 'IPv4' && !interface.internal && interface.address !== '127.0.0.1') {
        console.log(`🌐 Fallback IP on interface ${name}: ${interface.address}`);
        return interface.address;
      }
    }
  }
  
  console.log('⚠️  No external IP found, using localhost');
  return 'localhost';
}

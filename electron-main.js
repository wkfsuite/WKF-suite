const { app, BrowserWindow, Menu, shell, dialog, Tray, nativeImage } = require('electron');
const path = require('path');
const os = require('os');
const fs = require('fs');
const LicenseManager = require('./license-manager');

let mainWindow;
let tray = null;
let licenseManager = null;
const isDev = process.env.NODE_ENV === 'development';

// Setup logging per diagnostica - Solo in development
let logFile = null;
let logDir = null;

// Abilita logging dettagliato solo in development
if (isDev) {
  try {
    // Usa temp directory per log di sviluppo
    logDir = os.tmpdir();
    logFile = path.join(logDir, 'wkf-suite-debug.log');
    fs.writeFileSync(logFile, `=== WKF Suite Debug Log - ${new Date().toISOString()} ===\n`);
  } catch (err) {
    console.warn('Debug logging non disponibile:', err.message);
    logFile = null;
  }
}

function debugLog(message, data = null) {
  // In production, log solo messaggi critici
  if (!isDev && !message.includes('ERROR')) {
    return;
  }

  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${message}${data ? `: ${JSON.stringify(data, null, 2)}` : ''}\n`;

  // Console log solo in development
  if (isDev) {
    console.log(`[DEBUG] ${message}`, data || '');
  }

  // File log solo in development
  if (logFile && isDev) {
    try {
      fs.appendFileSync(logFile, logEntry);
    } catch (err) {
      console.error('Errore scrittura log:', err);
      logFile = null;
    }
  }
}

// Log iniziale solo in development
if (isDev) {
  console.log('🚀 WKF Suite Development Mode - PID:', process.pid);
  console.log('📁 LOG FILE:', logFile || 'DISABLED');
  debugLog('=== ELECTRON STARTUP INIZIATO ===');
  debugLog('Percorso app', __dirname);
  debugLog('Variabili ambiente', {
    NODE_ENV: process.env.NODE_ENV,
    ELECTRON_MODE: process.env.ELECTRON_MODE,
    platform: process.platform,
    arch: process.arch
  });
}

// Avvia server Node.js integrato in Electron
async function startServer() {
  debugLog('CHECKPOINT 1: Iniziando startServer()');
  
  return new Promise((resolve, reject) => {
    try {
      debugLog('CHECKPOINT 2: Inside Promise try block');
      
      // Imposta variabili di ambiente per produzione
      process.env.NODE_ENV = 'production';
      process.env.ELECTRON_MODE = 'true';
      
      debugLog('CHECKPOINT 3: Variabili ambiente impostate', {
        NODE_ENV: process.env.NODE_ENV,
        ELECTRON_MODE: process.env.ELECTRON_MODE
      });
      
      // In modalità produzione (app impacchettata), i file sono in resource/app.asar
      let serverPath;
      if (process.env.NODE_ENV === 'production') {
        // Prova diversi percorsi possibili in produzione
        const possiblePaths = [
          path.join(__dirname, 'server.js'),                    // Path diretto
          path.join(process.resourcesPath, 'app', 'server.js'), // Electron asar
          path.join(process.resourcesPath, 'server.js'),        // Root resources
          path.join(__dirname, '..', 'server.js'),              // Parent dir
          path.join(__dirname, 'resources', 'app', 'server.js') // Nested resources
        ];
        
        serverPath = possiblePaths.find(p => fs.existsSync(p));
        debugLog('CHECKPOINT 4: Server path search in production', { 
          possiblePaths,
          found: serverPath,
          __dirname,
          resourcesPath: process.resourcesPath
        });
      } else {
        serverPath = path.join(__dirname, 'server.js');
        debugLog('CHECKPOINT 4: Server path development mode', { serverPath });
      }
      
      // Verifica che il file server.js esista
      const serverExists = serverPath && fs.existsSync(serverPath);
      debugLog('CHECKPOINT 5: Controllo esistenza server.js', { 
        serverPath,
        serverExists,
        cwd: process.cwd()
      });
      
      if (!serverExists) {
        const error = new Error(`File server.js non trovato: ${serverPath || 'NESSUN PATH TROVATO'}`);
        debugLog('ERROR CHECKPOINT 5a: File server.js non trovato', { 
          serverPath,
          __dirname,
          cwd: process.cwd(),
          resourcesPath: process.resourcesPath,
          nodeEnv: process.env.NODE_ENV
        });
        
        console.error('File server.js non trovato:', serverPath);
        
        // Lista tutti i file nella directory per debug
        try {
          const dirContents = fs.readdirSync(__dirname);
          debugLog('Directory contents (__dirname)', { __dirname, contents: dirContents });
        } catch (dirErr) {
          debugLog('Error reading __dirname', { error: dirErr.message });
        }
        
        dialog.showErrorBox('File Server mancante', 
          `Il file server.js non è stato trovato.\n\n` +
          `Percorso cercato: ${serverPath || 'NESSUN PATH'}\n` +
          `Directory app: ${__dirname}\n` +
          `Working dir: ${process.cwd()}\n\n` +
          'L\'installazione potrebbe essere incompleta.');
        reject(error);
        return;
      }
      
      // Avvia il server direttamente importando il modulo
      debugLog('CHECKPOINT 6: Iniziando caricamento server.js');
      console.log('Caricamento server da:', serverPath);

      // IMPORTANTE: Imposta modalità Electron per path corretti
      process.env.ELECTRON_MODE = 'true';
      process.env.PKG_MODE = 'false'; // Electron usa logica diversa da PKG

      delete require.cache[serverPath]; // Pulisci cache per ricaricamento
      
      // Avvia il server e attendi che sia pronto
      try {
        debugLog('CHECKPOINT 7: Chiamando require(server.js)');
        require(serverPath);
        debugLog('CHECKPOINT 8: require(server.js) completato');
        
        // Attendi che il server sia pronto (polling su porta)
        debugLog('CHECKPOINT 9: Iniziando polling server');
        let attempts = 0;
        const maxAttempts = 30; // 30 secondi max
        
        const checkServer = () => {
          debugLog('CHECKPOINT 10: Tentativo polling server', { attempts, maxAttempts });
          const http = require('http');
          const request = http.get('http://localhost:3000/api/test', (res) => {
            debugLog('CHECKPOINT 11: Risposta server ricevuta', { statusCode: res.statusCode });
            if (res.statusCode === 200) {
              debugLog('CHECKPOINT 12: Server pronto - SUCCESS!');
              console.log('✅ Server Node.js avviato e pronto');
              resolve();
            } else {
              throw new Error(`Server risposta: ${res.statusCode}`);
            }
          });
          
          request.on('error', (err) => {
            attempts++;
            debugLog('CHECKPOINT 13: Errore polling server', { 
              attempts, 
              maxAttempts, 
              error: err.message,
              code: err.code 
            });
            
            if (attempts < maxAttempts) {
              console.log(`⏳ Attendo server... (tentativo ${attempts}/${maxAttempts})`);
              setTimeout(checkServer, 1000);
            } else {
              debugLog('ERROR CHECKPOINT 14: Server non risponde - TIMEOUT');
              reject(new Error(`Server non risponde dopo ${maxAttempts} secondi: ${err.message}`));
            }
          });
          
          request.setTimeout(2000, () => {
            request.destroy();
            attempts++;
            if (attempts < maxAttempts) {
              setTimeout(checkServer, 1000);
            } else {
              reject(new Error(`Server timeout dopo ${maxAttempts} tentativi`));
            }
          });
        };
        
        // Inizia il controllo dopo 2 secondi
        setTimeout(checkServer, 2000);
        
      } catch (requireError) {
        reject(new Error(`Errore caricamento server: ${requireError.message}`));
      }
      
    } catch (error) {
      console.error('Errore avvio server integrato:', error);
      
      let errorMessage = 'Impossibile avviare il server integrato.\n\n';
      
      if (error.code === 'EADDRINUSE') {
        errorMessage += 'La porta 3000 è già in uso.\nChiudi altre istanze dell\'applicazione.';
      } else if (error.message.includes('Cannot find module')) {
        errorMessage += 'Dipendenze mancanti.\nL\'applicazione potrebbe non essere stata installata correttamente.';
      } else if (error.message.includes('SQLITE')) {
        errorMessage += 'Errore database SQLite.\nIl database potrebbe essere corrotto.';
      } else {
        errorMessage += `Errore: ${error.message}`;
      }
      
      dialog.showErrorBox('Errore Server', errorMessage);
      reject(error);
    }
  });
}

// Ferma server
function stopServer() {
  console.log('Chiusura server integrato...');
  debugLog('stopServer chiamata');
  // Il server integrato si chiude automaticamente quando l'app si chiude
  // Non c'è bisogno di gestire un processo separato
  // Evita operazioni che potrebbero causare crash con taskkill
}

// Crea finestra principale
function createWindow() {
  debugLog('CHECKPOINT 15: Iniziando createWindow()');

  // Initialize license manager
  try {
    licenseManager = new LicenseManager();
    const licenseInfo = licenseManager.getLicenseInfo();
    debugLog('License status:', licenseInfo);
  } catch (licenseError) {
    debugLog('License manager initialization failed:', licenseError);
    // Continue with FREE version if license check fails
  }

  try {
    debugLog('CHECKPOINT 16: Creando BrowserWindow');
    // Configura icona della finestra - usa logo WKF Suite ufficiale
    let windowIcon;
    const iconPaths = [
      path.join(__dirname, 'icon-wkf.ico'),
      path.join(__dirname, 'icon.ico'),
      path.join(__dirname, 'logo-512x512.png'),
      path.join(__dirname, 'logo.png'),
      path.join(__dirname, 'public', 'android-chrome-512x512.png'),
      path.join(__dirname, 'public', 'android-chrome-192x192.png'),
      path.join(__dirname, 'public', 'favicon.ico')
    ];

    for (const iconPath of iconPaths) {
      if (fs.existsSync(iconPath)) {
        windowIcon = iconPath;
        debugLog(`Icona finestra WKF Suite trovata: ${iconPath}`);
        break;
      }
    }

    mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      minWidth: 800,
      minHeight: 600,
      icon: windowIcon, // Aggiunge l'icona alla finestra
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        enableRemoteModule: false,
        webSecurity: true
      },
      show: false,
      titleBarStyle: 'default',
      title: licenseManager ? licenseManager.getAppTitle() : 'WKF Suite FREE'
    });
    
    debugLog('CHECKPOINT 17: BrowserWindow creata, caricando URL');
    // Carica URL solo dopo che il server è pronto
    mainWindow.loadURL('http://localhost:3000');
    debugLog('CHECKPOINT 18: loadURL chiamata');

    mainWindow.once('ready-to-show', () => {
      debugLog('CHECKPOINT 19: Window ready-to-show triggered');
      mainWindow.show();
      debugLog('CHECKPOINT 20: Window shown');

      // DevTools solo in development
      if (isDev) {
        mainWindow.webContents.openDevTools();
        console.log('🔧 DevTools abilitati (development mode)');
      }
    });

    mainWindow.webContents.on('new-window', (event, navigationUrl) => {
      event.preventDefault();
      shell.openExternal(navigationUrl);
    });

    mainWindow.on('closed', () => {
      debugLog('CHECKPOINT 21: Window closed');
      mainWindow = null;
    });
    
  } catch (windowError) {
    debugLog('ERROR CHECKPOINT 22: Errore createWindow', {
      error: windowError.message,
      stack: windowError.stack
    });
    
    dialog.showErrorBox('Errore Finestra', 
      `Impossibile creare la finestra dell'applicazione:\n\n${windowError.message}`
    );
  }
}

// Crea system tray
function createTray() {
  debugLog('CHECKPOINT 23: Iniziando createTray()');
  
  // Crea un'icona di base per il tray (16x16 bitmap)
  let trayIcon;
  
  try {
    debugLog('CHECKPOINT 24: Creando tray icon');
    // Prova a creare un'icona semplice usando un buffer
    const iconBuffer = Buffer.from([
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x7E, 0x00, 0x81, 0x00, 0x81, 0x00, 0x81,
      0x00, 0x81, 0x00, 0x81, 0x00, 0x81, 0x00, 0x7E,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
    ]);
    
    trayIcon = nativeImage.createFromBuffer(iconBuffer, { width: 16, height: 16 });
    
    // Se fallisce, usa le icone del progetto
    if (trayIcon.isEmpty()) {
      // Prova le icone caricate dall'utente
      const iconPaths = [
        path.join(__dirname, 'icon-wkf.ico'),
        path.join(__dirname, 'icon.ico'),
        path.join(__dirname, 'icon.png'),
        path.join(__dirname, 'public', 'favicon.ico'),
        path.join(__dirname, 'public', 'favicon-16x16.png'),
        path.join(__dirname, 'public', 'favicon-32x32.png')
      ];

      for (const iconPath of iconPaths) {
        if (fs.existsSync(iconPath)) {
          trayIcon = nativeImage.createFromPath(iconPath);
          if (!trayIcon.isEmpty()) {
            debugLog(`Icona tray caricata: ${iconPath}`);
            // Ridimensiona per Windows tray
            if (process.platform === 'win32') {
              trayIcon = trayIcon.resize({ width: 16, height: 16 });
            }
            break;
          }
        }
      }
    }
    
    // Ultimo fallback: crea un'icona dal template
    if (trayIcon.isEmpty()) {
      trayIcon = nativeImage.createFromDataURL('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAdgAAAHYBTnsmCAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAFYSURBVDiNpZM9SwNBEIafgwQLwcJCG1sLG0uxsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQ==');
    }
    
  } catch (error) {
    console.warn('Errore creazione icona tray, uso fallback:', error);
    // Fallback: usa template con icona molto semplice
    trayIcon = nativeImage.createFromDataURL('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAdgAAAHYBTnsmCAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAFYSURBVDiNpZM9SwNBEIafgwQLwcJCG1sLG0uxsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQ==');
  }

  try {
    tray = new Tray(trayIcon);
    
    const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Mostra Applicazione',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        } else {
          createWindow();
        }
      }
    },
    {
      label: 'Server Status',
      enabled: false
    },
    {
      label: '🟢 Server Integrato Attivo',
      enabled: false
    },
    { type: 'separator' },
    {
      label: 'Apri nel Browser',
      click: () => {
        shell.openExternal('http://localhost:3000');
      }
    },
    {
      label: 'Riavvia Server',
      click: () => {
        debugLog('Riavvio server dal tray - restart app');
        // Invece di stopServer/startServer che può causare crash,
        // riavvia l'intera applicazione
        app.relaunch();
        app.quit();
      }
    },
    { type: 'separator' },
    {
      label: 'Informazioni',
      click: () => {
        const networkInfo = getNetworkInfo();
        dialog.showMessageBox(mainWindow, {
          type: 'info',
          title: 'Gestione Permessi - Info Server',
          message: 'Server Informazioni',
          detail: `Server attivo su:
• PC locale: http://localhost:3000
• Rete aziendale: http://${networkInfo}:3000

Versione: 1.0.0
Status: Integrato - Sempre Attivo`,
          buttons: ['OK', 'Apri nel Browser'],
          defaultId: 0
        }).then((result) => {
          if (result.response === 1) {
            shell.openExternal('http://localhost:3000');
          }
        });
      }
    },
    {
      label: 'Esci',
      click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);
  tray.setToolTip('Gestione Permessi Aziendali - Server Attivo');
  
  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    } else {
      createWindow();
    }
  });
  
  } catch (trayError) {
    console.error('Errore creazione system tray:', trayError);
    // Continua senza tray se non riesce
    tray = null;
  }
}

// Ottieni IP locale
function getNetworkInfo() {
  const interfaces = os.networkInterfaces();
  
  for (const name of Object.keys(interfaces)) {
    for (const interface of interfaces[name]) {
      if (interface.family === 'IPv4' && !interface.internal) {
        return interface.address;
      }
    }
  }
  return 'localhost';
}

// Crea menu applicazione
function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Apri nel Browser',
          accelerator: 'CmdOrCtrl+O',
          click: () => {
            shell.openExternal('http://localhost:3000');
          }
        },
        { type: 'separator' },
        {
          label: 'Nascondi',
          accelerator: 'CmdOrCtrl+H',
          click: () => {
            if (mainWindow) mainWindow.hide();
          }
        },
        {
          label: 'Esci',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.isQuitting = true;
            app.quit();
          }
        }
      ]
    },
    {
      label: 'Server',
      submenu: [
        {
          label: 'Riavvia Server',
          accelerator: 'CmdOrCtrl+R',
          click: () => {
            debugLog('Riavvio server richiesto - restart app');
            // Invece di stopServer/startServer che può causare crash,
            // riavvia l'intera applicazione
            app.relaunch();
            app.quit();
          }
        },
        {
          label: 'Info Server',
          click: () => {
            const networkInfo = getNetworkInfo();
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'Informazioni Server',
              message: 'Server Gestione Permessi',
              detail: `Indirizzo locale: http://localhost:3000
Indirizzo rete: http://${networkInfo}:3000
Status: Integrato - Sempre Attivo ✅

Per accedere da altri PC della rete:
${networkInfo}:3000`,
              buttons: ['OK']
            });
          }
        }
      ]
    },
    {
      label: 'Licenza',
      submenu: [
        {
          label: 'Status Licenza',
          click: () => {
            const licenseInfo = licenseManager ? licenseManager.getLicenseInfo() : { status: 'FREE' };
            const statusIcon = licenseInfo.status === 'PRO' ? '⭐' : '🆓';

            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: `${statusIcon} WKF Suite ${licenseInfo.status}`,
              message: `Licenza attuale: ${licenseInfo.status}`,
              detail: licenseInfo.status === 'PRO' ?
                `✅ WKF Suite PRO attivo!

Funzioni PRO disponibili:
• 📧 Email notifiche automatiche
• 📊 Analytics avanzate
• 📄 Report PDF personalizzati
• 🛟 Supporto prioritario
• 💾 Backup automatici

Grazie per aver scelto WKF Suite PRO!` :
                `🆓 WKF Suite FREE

Funzioni disponibili:
• Gestione utenti illimitati
• Richieste permessi base
• Dashboard semplice
• QR Code WiFi
• Database locale

💡 Upgrade a PRO per sbloccare:
• Email automatiche
• Analytics avanzate
• Report PDF personalizzati
• E molto altro!

Visita: https://wkfsuite.com/upgrade`,
              buttons: ['OK']
            });
          }
        },
        {
          label: 'Attiva License Key',
          click: () => {
            // Navigate to license activation page in the web interface
            mainWindow.webContents.executeJavaScript(`
              // Try to trigger the license key modal if on dashboard
              if (typeof mostraLicenseKeyModal === 'function') {
                mostraLicenseKeyModal();
              } else {
                // Navigate to dashboard if not there
                window.location.href = 'dashboard.html';
              }
            `);

            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: '🔑 Attivazione License Key',
              message: 'Usa l\'interfaccia web per attivare la license key',
              detail: `Per attivare una license key:

1. Accedi come admin nel dashboard
2. Clicca "Ho già una License Key"
3. Incolla la tua license key
4. Clicca "Attiva"

La license key verrà salvata e WKF Suite sarà aggiornato automaticamente.`,
              buttons: ['OK']
            });
          }
        },
        {
          type: 'separator'
        },
        {
          label: 'Upgrade a PRO',
          click: () => {
            shell.openExternal('https://wkfsuite.com/upgrade');
          }
        }
      ]
    },
    {
      label: 'Aiuto',
      submenu: [
        {
          label: 'Informazioni',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'Gestione Permessi Aziendali',
              message: 'Gestione Permessi Aziendali v1.0.0',
              detail: `Sistema completo per la gestione dei permessi dipendenti.

Funzionalità:
• Richieste permessi online
• Approvazione/rifiuto da supervisori
• Report e statistiche
• QR Code WiFi aziendale
• Notifiche in tempo reale
• PDF scaricabili

Accesso: http://localhost:3000`,
              buttons: ['OK']
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// Eventi app
app.whenReady().then(async () => {
  debugLog('CHECKPOINT 25: app.whenReady() triggered');
  console.log('Electron app avviata');
  
  try {
    debugLog('CHECKPOINT 26: Iniziando avvio server');
    // Avvia server prima della finestra e attendi che sia pronto
    await startServer();
    debugLog('CHECKPOINT 27: Server avviato, creando UI');
    
    // Crea finestra e tray solo quando il server è pronto
    createWindow();
    debugLog('CHECKPOINT 28: Window creata, creando tray');
    createTray();
    debugLog('CHECKPOINT 29: Tray creato, creando menu');
    createMenu();
    debugLog('CHECKPOINT 30: Setup completo - SUCCESS!');
    
  } catch (error) {
    debugLog('ERROR CHECKPOINT 31: Errore avvio applicazione', {
      error: error.message,
      stack: error.stack
    });
    console.error('Errore avvio applicazione:', error);
    
    // Mostra errore e chiudi app
    dialog.showErrorBox(
      'Errore Avvio',
      `Impossibile avviare l'applicazione:\n\n${error.message}\n\nL'applicazione verrà chiusa.`
    );
    
    app.quit();
    return;
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else {
      mainWindow.show();
    }
  });
});

app.on('window-all-closed', () => {
  // Su macOS mantieni app attiva anche se finestre chiuse
  if (process.platform !== 'darwin') {
    // Su Windows/Linux continua in background con tray
    console.log('Finestre chiuse, continuo in background...');
  }
});

app.on('before-quit', (event) => {
  console.log('Chiusura app...');
  debugLog('before-quit event triggered');
  app.isQuitting = true;
  // Rimuovi chiamata stopServer() per evitare crash con taskkill
});

app.on('will-quit', (event) => {
  debugLog('will-quit event triggered');
  // Rimuovi chiamata stopServer() per evitare crash con taskkill
});

// Gestione errori
process.on('uncaughtException', (error) => {
  debugLog('CRITICAL ERROR: Uncaught Exception', {
    error: error.message,
    stack: error.stack,
    name: error.name
  });
  console.error('Uncaught Exception:', error);
  
  dialog.showErrorBox(
    'Errore Critico',
    `Si è verificato un errore critico:\n\n${error.message}\n\nL'applicazione verrà chiusa.`
  );
  
  app.quit();
});

process.on('unhandledRejection', (reason, promise) => {
  debugLog('CRITICAL ERROR: Unhandled Rejection', {
    reason: reason.toString(),
    promise: promise.toString()
  });
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
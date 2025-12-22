// dashboard.js
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // CONTROLLA PAGAMENTO STRIPE AL RITORNO
    await checkStripePaymentReturn();

    // Prendo la sessione dell'utente
    const resp = await fetch('/api/session', {
      credentials: 'same-origin'
    });
    const data = await resp.json();

    if (!data.user) {
      // Se non loggato, torno al login
      window.location.href = 'login.html';
      return;
    }

    const { username, ruolo, matricola } = data.user;

    // Mostro informazioni utente in un badge unico elegante
    const userInfoElement = document.getElementById('userInfoDisplay');

    // Icone per ruolo
    const roleIcons = {
      'admin': '🔧',
      'supervisore': '👨‍💼',
      'segreteria': '📋',
      'dipendente': '👤'
    };

    // Nomi ruoli user-friendly
    const roleNames = {
      'admin': 'Admin',
      'supervisore': 'Supervisore',
      'segreteria': 'Segreteria',
      'dipendente': 'Dipendente'
    };

    userInfoElement.innerHTML = `
      <span class="user-name">${username}</span>
      <span class="role-badge ${ruolo}">${roleIcons[ruolo] || ''} ${roleNames[ruolo] || ruolo}</span>
    `;
    userInfoElement.className = 'user-info-badge';

    // Carica status licenza
    await caricaStatusLicenza();

    // Mostra bottone upgrade se versione FREE e collega alla funzione Stripe
    const licenseStatus = document.getElementById('licenseStatus');
    const upgradeLink = document.getElementById('upgradeLink');
    if (licenseStatus && upgradeLink && licenseStatus.textContent.includes('FREE')) {
      upgradeLink.style.display = 'inline-block';
      upgradeLink.addEventListener('click', apriUpgrade);
    }

    // Carica logo aziendale nell'header
    await loadCompanyLogo();

    // Funzione per mostrare solo la sezione giusta
    function mostraSezione(sezioneId) {
      const sezioni = document.querySelectorAll('.roleSection');
      sezioni.forEach(s => s.style.display = 'none');
      const sel = document.getElementById(sezioneId);
      if (sel) sel.style.display = 'block';
    }

    // Gestione dashboard per ruolo
    if (ruolo === 'admin') {
      mostraSezione('adminSection');
      caricaTutteLeRichieste('admin');
    } else if (ruolo === 'supervisore') {
      mostraSezione('supervisoreSection');
      caricaTutteLeRichieste('supervisore');
    } else if (ruolo === 'segreteria') {
      mostraSezione('segreteriaSection');
      caricaTutteLeRichieste('segreteria');
    } else {
      // Ruolo dipendente normale
      mostraSezione('dipendenteSection');
    }

  } catch (err) {
    console.error('Errore dashboard:', err);
    window.location.href = 'login.html';
  }
});

// Carica tutte le richieste per admin/supervisore/segreteria
async function caricaTutteLeRichieste(ruolo) {
  // Determina il container corretto in base al ruolo
  const containerIds = {
    'admin': 'richiesteContainerAdmin',
    'supervisore': 'richiesteContainerSuper',
    'segreteria': 'richiesteContainerSegr'
  };
  
  const container = document.getElementById(containerIds[ruolo]);
  if (!container) {
    console.error(`Container not found for role: ${ruolo}`);
    return;
  }

  const soloLettura = ruolo === 'segreteria';
  
  try {
    const res = await fetch('/api/richieste/tutte', { credentials: 'same-origin' });
    const richieste = await res.json();

    container.innerHTML = '';

    if (!Array.isArray(richieste) || richieste.length === 0) {
      container.innerHTML = '<p class="notice">No requests found.</p>';
      return;
    }

    richieste.forEach(r => {
      const div = document.createElement('div');
      div.classList.add('card');
      div.style.marginBottom = '15px';
      div.style.padding = '15px';

      const statoClass = r.stato === 'approvata' ? 'ok' : (r.stato === 'rifiutata' ? 'no' : 'pending');
      const dataDisplay = r.data || (r.dal && r.al ? `${r.dal} - ${r.al}` : '-');
      const oreDisplay = r.oraInizio && r.oraFine ? `${r.oraInizio} - ${r.oraFine}` : '-';

      const pulsantiAzioni = soloLettura || r.stato !== 'in attesa' ? '' : `
        <div class="actions" style="margin-top: 10px;">
          <button class="btn" style="background: #2ecc71; color: white;" onclick="approvaRichiesta('${r.id}')">
            ✓ Approva
          </button>
          <button class="btn" style="background: #e74c3c; color: white;" onclick="rifiutaRichiesta('${r.id}')">
            ✗ Rifiuta
          </button>
        </div>
      `;

      div.innerHTML = `
        <div style="display: grid; grid-template-columns: 1fr auto; gap: 15px; align-items: start;">
          <div>
            <strong>Employee:</strong> ${r.nome || r.matricola}<br>
            <strong>Matricola:</strong> ${r.matricola}<br>
            <strong>Tipo:</strong> ${r.tipo}<br>
            <strong>Data/Periodo:</strong> ${dataDisplay}<br>
            <strong>Orario:</strong> ${oreDisplay}<br>
            <strong>Note:</strong> ${r.note || '-'}<br>
            <strong>Requested on:</strong> ${new Date(r.createdAt).toLocaleDateString('en-US')}<br>
            <strong>Status:</strong> <span class="status ${statoClass}">${r.stato || 'pending'}</span>
            ${pulsantiAzioni}
          </div>
          <div class="actions" style="display: flex; flex-direction: column; gap: 5px;">
            <button class="btn secondary" onclick="scaricaPDF('${r.id}')">PDF</button>
            <!-- DISABILITATO: Calendario export temporaneamente non disponibile -->
            <!-- <button class="btn" style="background: #9b59b6; font-size: 0.85rem;" onclick="exportCalendario('${r.matricola}', '${r.nome || r.matricola}')">📅 Calendario</button> -->
          </div>
        </div>
      `;

      container.appendChild(div);
    });

  } catch (err) {
    console.error(err);
    container.innerHTML = '<p class="notice" style="color: red;">Error loading requests</p>';
  }
}

// Funzione per approvare richiesta
async function approvaRichiesta(richiestaId) {
  if (!confirm('Confirm approval of this request?')) return;
  
  try {
    const res = await fetch(`/api/richieste/${richiestaId}/approva`, {
      method: 'PUT',
      credentials: 'same-origin'
    });
    
    if (res.ok) {
      alert('Request approved successfully!');
      // Determina il ruolo dall'URL della sessione
      const sessionRes = await fetch('/api/session', {
        credentials: 'same-origin'
      });
      const sessionData = await sessionRes.json();
      if (sessionData.user) {
        caricaTutteLeRichieste(sessionData.user.ruolo); // Ricarica la lista
      }
    } else {
      const error = await res.json();
      alert('Error: ' + (error.error || 'Unable to approve request'));
    }
  } catch (err) {
    console.error(err);
    alert('Connection error');
  }
}

// Funzione per rifiutare richiesta
async function rifiutaRichiesta(richiestaId) {
  const motivo = prompt('Enter rejection reason (optional):');
  if (motivo === null) return; // Cancelto
  
  try {
    const res = await fetch(`/api/richieste/${richiestaId}/rifiuta`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ motivo }),
      credentials: 'same-origin'
    });
    
    if (res.ok) {
      alert('Request rejected');
      // Determina il ruolo dall'URL della sessione
      const sessionRes = await fetch('/api/session', {
        credentials: 'same-origin'
      });
      const sessionData = await sessionRes.json();
      if (sessionData.user) {
        caricaTutteLeRichieste(sessionData.user.ruolo); // Ricarica la lista
      }
    } else {
      const error = await res.json();
      alert('Error: ' + (error.error || 'Unable to reject request'));
    }
  } catch (err) {
    console.error(err);
    alert('Connection error');
  }
}

// Funzione per scaricare PDF
function scaricaPDF(richiestaId) {
  window.open(`/api/richieste/${richiestaId}/pdf`, '_blank');
}

// Funzione per mostrare/nascondere campi permesso segreteria
function togglePermessoSegreteria() {
  const tipo = document.getElementById("tipoSegreteria").value;
  document.querySelectorAll('.permesso-box').forEach(div => {
    if (div.id.includes('Segreteria')) {
      div.style.display = "none";
    }
  });

  if (tipo === "giornaliero") {
    document.getElementById("giornalieroSegreteria").style.display = "block";
  } else if (tipo === "piu_giorni") {
    document.getElementById("piu_giorniSegreteria").style.display = "block";
  } else if (tipo === "ore") {
    document.getElementById("oreSegreteria").style.display = "block";
  }
}

// Gestione form segreteria per inserire richieste
document.addEventListener('DOMContentLoaded', () => {
  const segreteriaForm = document.getElementById("segreteriaForm");
  if (segreteriaForm) {
    segreteriaForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const matricolaDipendente = document.getElementById("matricolaDipendente").value.trim();
      const tipo = document.getElementById("tipoSegreteria").value;
      const note = document.getElementById("noteSegreteria").value.trim();
      const msg = document.getElementById("segreteriaMsg");

      function showMsg(text, color = "red") {
        msg.textContent = text;
        msg.style.color = color;
      }

      // Validazione
      if (!matricolaDipendente || !tipo) {
        showMsg("Employee ID and leave type are required");
        return;
      }

      // Get checkbox values
      const retribuito = document.getElementById("retribuitoSegreteria").checked;
      const daRecuperare = document.getElementById("daRecuperareSegreteria").checked;
      const nonRetribuito = document.getElementById("nonRetribuitoSegreteria").checked;
      const permessoSindacale = document.getElementById("permessoSindacaleSegreteria").checked;
      const inCFerie = document.getElementById("inCFerieSegreteria").checked;

      const payload = { tipo, note, matricolaDipendente, retribuito, daRecuperare, nonRetribuito, permessoSindacale, inCFerie };

      if (tipo === "giornaliero") {
        const data = document.getElementById("dataGiornoSegreteria").value;
        if (!data) {
          showMsg("Enter leave date");
          return;
        }
        payload.data = data;
      } else if (tipo === "piu_giorni") {
        const dal = document.getElementById("dataDalSegreteria").value;
        const al = document.getElementById("dataAlSegreteria").value;
        if (!dal || !al) {
          showMsg("Enter date range (from/to)");
          return;
        }
        payload.dal = dal;
        payload.al = al;
      } else if (tipo === "ore") {
        const data = document.getElementById("dataHoursSegreteria").value;
        const oraInizio = document.getElementById("oraInizioSegreteria").value;
        const oraFine = document.getElementById("oraFineSegreteria").value;
        if (!data || !oraInizio || !oraFine) {
          showMsg("Enter date and times for hourly leave");
          return;
        }
        payload.data = data;
        payload.oraInizio = oraInizio;
        payload.oraFine = oraFine;
      }

      try {
        const res = await fetch("/api/richieste/segreteria", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          credentials: "same-origin"
        });

        const result = await res.json();
        if (res.ok) {
          showMsg("Request submitted successfully for employee!", "green");
          segreteriaForm.reset();
          document.querySelectorAll('.permesso-box').forEach(div => {
            if (div.id.includes('Segreteria')) div.style.display = "none";
          });
          caricaTutteLeRichieste('segreteria'); // Ricarica la lista
        } else {
          showMsg(result.error || "Error submitting request");
        }
      } catch (err) {
        console.error(err);
        showMsg("Server connection error");
      }
    });
  }
});

// =========================
// GESTIONE MONITOR ERRORI
// =========================

// Funzione per configurare il monitor errori
function setupErrorMonitor() {
  const errorMonitorBtn = document.getElementById('errorMonitorBtn');
  const errorMonitorSection = document.getElementById('errorMonitorSection');
  const closeMonitorBtn = document.getElementById('closeMonitorBtn');
  const refreshMonitorBtn = document.getElementById('refreshMonitorBtn');

  if (errorMonitorBtn) {
    errorMonitorBtn.addEventListener('click', async () => {
      errorMonitorSection.style.display = 'block';
      await loadMonitorStats();
    });
  }

  if (closeMonitorBtn) {
    closeMonitorBtn.addEventListener('click', () => {
      errorMonitorSection.style.display = 'none';
    });
  }

  if (refreshMonitorBtn) {
    refreshMonitorBtn.addEventListener('click', loadMonitorStats);
  }
}

// Funzione per caricare le statistiche del monitor
async function loadMonitorStats() {
  try {
    const response = await fetch('/api/monitor/stats', {
      credentials: 'same-origin'
    });
    const stats = await response.json();

    // Aggiorna i dati numerici
    document.getElementById('totalRequests').textContent = stats.requests;
    document.getElementById('totalErrors').textContent = stats.errors;
    
    const errorRate = stats.errorRate.toFixed(2) + '%';
    document.getElementById('errorPercentage').textContent = errorRate;

    // Cambia colore della percentuale errori basandosi sul valore
    const errorElement = document.getElementById('errorPercentage');
    if (stats.errorRate > 10) {
      errorElement.style.color = '#e74c3c'; // Rosso per errori alti
    } else if (stats.errorRate > 5) {
      errorElement.style.color = '#f39c12'; // Arancione per errori medi
    } else {
      errorElement.style.color = '#2ecc71'; // Verde per errori bassi
    }

    // Converti uptime da secondi a formato leggibile
    const uptimeMinutes = Math.floor(stats.uptime / 60);
    const uptimeHours = Math.floor(uptimeMinutes / 60);
    const remainingMinutes = uptimeMinutes % 60;
    let uptimeText = '';
    if (uptimeHours > 0) {
      uptimeText = `${uptimeHours}h ${remainingMinutes}m`;
    } else {
      uptimeText = `${remainingMinutes}m`;
    }

    // Converti memoria in MB
    const memoryUsed = Math.round(stats.memory.heapUsed / 1024 / 1024);
    const memoryTotal = Math.round(stats.memory.heapTotal / 1024 / 1024);

    // Aggiorna i dati del server
    document.getElementById('uptime').textContent = uptimeText;
    document.getElementById('memoryUsage').textContent = `${memoryUsed}MB / ${memoryTotal}MB`;
    document.getElementById('processPid').textContent = stats.pid;
    document.getElementById('lastUpdate').textContent = new Date().toLocaleTimeString();

  } catch (error) {
    console.error('Errore caricamento statistiche monitor:', error);
    // Mostra errori di default in caso di problemi
    document.getElementById('totalRequests').textContent = 'N/A';
    document.getElementById('totalErrors').textContent = 'N/A';
    document.getElementById('errorPercentage').textContent = 'N/A';
    document.getElementById('uptime').textContent = 'N/A';
    document.getElementById('memoryUsage').textContent = 'N/A';
    document.getElementById('processPid').textContent = 'N/A';
    document.getElementById('lastUpdate').textContent = 'Errore';
  }
}

// =========================
// GESTIONE QR CODE WIFI
// =========================

// Funzioni per gestire QR code per tutti i ruoli
function setupQRCodeHandlers() {
  // Admin QR handlers
  const generateQRBtn = document.getElementById('generateQRBtn');
  if (generateQRBtn) {
    generateQRBtn.addEventListener('click', () => generateWiFiQR('admin'));
  }
  
  const closeQRBtn = document.getElementById('closeQRBtn');
  if (closeQRBtn) {
    closeQRBtn.addEventListener('click', () => closeWiFiQR('admin'));
  }
  
  const printQRBtn = document.getElementById('printQRBtn');
  if (printQRBtn) {
    printQRBtn.addEventListener('click', () => printWiFiQR('admin'));
  }

  // Supervisore QR handlers  
  const generateQRBtnSuper = document.getElementById('generateQRBtnSuper');
  if (generateQRBtnSuper) {
    generateQRBtnSuper.addEventListener('click', () => generateWiFiQR('super'));
  }
  
  const closeQRBtnSuper = document.getElementById('closeQRBtnSuper');
  if (closeQRBtnSuper) {
    closeQRBtnSuper.addEventListener('click', () => closeWiFiQR('super'));
  }
  
  const printQRBtnSuper = document.getElementById('printQRBtnSuper');
  if (printQRBtnSuper) {
    printQRBtnSuper.addEventListener('click', () => printWiFiQR('super'));
  }

  // Segreteria QR handlers
  const generateQRBtnSegr = document.getElementById('generateQRBtnSegr');
  if (generateQRBtnSegr) {
    generateQRBtnSegr.addEventListener('click', () => generateWiFiQR('segr'));
  }
  
  const closeQRBtnSegr = document.getElementById('closeQRBtnSegr');
  if (closeQRBtnSegr) {
    closeQRBtnSegr.addEventListener('click', () => closeWiFiQR('segr'));
  }
  
  const printQRBtnSegr = document.getElementById('printQRBtnSegr');
  if (printQRBtnSegr) {
    printQRBtnSegr.addEventListener('click', () => printWiFiQR('segr'));
  }

  // Browser QR handlers - Admin
  const generateBrowserQRBtn = document.getElementById('generateBrowserQRBtn');
  if (generateBrowserQRBtn) {
    generateBrowserQRBtn.addEventListener('click', () => generateBrowserQR('admin'));
  }

  const closeBrowserQRBtn = document.getElementById('closeBrowserQRBtn');
  if (closeBrowserQRBtn) {
    closeBrowserQRBtn.addEventListener('click', () => closeBrowserQR('admin'));
  }

  const printBrowserQRBtn = document.getElementById('printBrowserQRBtn');
  if (printBrowserQRBtn) {
    printBrowserQRBtn.addEventListener('click', () => printBrowserQR('admin'));
  }

  // Browser QR handlers - Supervisore
  const generateBrowserQRBtnSuper = document.getElementById('generateBrowserQRBtnSuper');
  if (generateBrowserQRBtnSuper) {
    generateBrowserQRBtnSuper.addEventListener('click', () => generateBrowserQR('super'));
  }

  const closeBrowserQRBtnSuper = document.getElementById('closeBrowserQRBtnSuper');
  if (closeBrowserQRBtnSuper) {
    closeBrowserQRBtnSuper.addEventListener('click', () => closeBrowserQR('super'));
  }

  const printBrowserQRBtnSuper = document.getElementById('printBrowserQRBtnSuper');
  if (printBrowserQRBtnSuper) {
    printBrowserQRBtnSuper.addEventListener('click', () => printBrowserQR('super'));
  }

  // Browser QR handlers - Segreteria
  const generateBrowserQRBtnSegr = document.getElementById('generateBrowserQRBtnSegr');
  if (generateBrowserQRBtnSegr) {
    generateBrowserQRBtnSegr.addEventListener('click', () => generateBrowserQR('segr'));
  }

  const closeBrowserQRBtnSegr = document.getElementById('closeBrowserQRBtnSegr');
  if (closeBrowserQRBtnSegr) {
    closeBrowserQRBtnSegr.addEventListener('click', () => closeBrowserQR('segr'));
  }

  const printBrowserQRBtnSegr = document.getElementById('printBrowserQRBtnSegr');
  if (printBrowserQRBtnSegr) {
    printBrowserQRBtnSegr.addEventListener('click', () => printBrowserQR('segr'));
  }
}

// Genera QR Code WiFi
async function generateWiFiQR(role) {
  const containers = {
    'admin': 'wifiQRSection',
    'super': 'wifiQRSectionSuper', 
    'segr': 'wifiQRSectionSegr'
  };
  
  const qrContainers = {
    'admin': 'qrCodeContainer',
    'super': 'qrCodeContainerSuper',
    'segr': 'qrCodeContainerSegr'
  };
  
  const messages = {
    'admin': 'qrMessage',
    'super': 'qrMessageSuper',
    'segr': 'qrMessageSegr'
  };

  const container = document.getElementById(containers[role]);
  const qrContainer = document.getElementById(qrContainers[role]);
  const messageDiv = document.getElementById(messages[role]);

  try {
    messageDiv.textContent = 'Generazione QR code in corso...';
    messageDiv.style.color = '#f1c40f';
    
    const res = await fetch('/api/wifi/qrcode', {
      credentials: 'same-origin'
    });
    
    const data = await res.json();
    
    if (res.ok) {
      // Mostra il QR code
      qrContainer.innerHTML = `
        <img src="${data.qrcode}" alt="QR Code WiFi" style="max-width: 300px; border: 2px solid #ddd; border-radius: 10px;">
        <div style="margin-top: 10px; font-size: 0.9rem; color: var(--muted);">
          <strong>WiFi:</strong> ${data.ssid}
        </div>
      `;
      
      messageDiv.textContent = '✅ QR Code generato! I dipendenti possono scansionarlo per connettersi automaticamente al WiFi aziendale.';
      messageDiv.style.color = 'var(--ok)';
      
      container.style.display = 'block';
      container.scrollIntoView({ behavior: 'smooth' });
      
    } else {
      messageDiv.textContent = '❌ ' + (data.error || 'Errore generazione QR code');
      messageDiv.style.color = 'var(--no)';
    }
    
  } catch (err) {
    console.error('Errore generazione QR:', err);
    messageDiv.textContent = '❌ Errore di connessione al server';
    messageDiv.style.color = 'var(--no)';
  }
}

// Close QR Code
function closeWiFiQR(role) {
  const containers = {
    'admin': 'wifiQRSection',
    'super': 'wifiQRSectionSuper',
    'segr': 'wifiQRSectionSegr'
  };
  
  document.getElementById(containers[role]).style.display = 'none';
}

// Stampa QR Code
function printWiFiQR(role) {
  const qrContainers = {
    'admin': 'qrCodeContainer',
    'super': 'qrCodeContainerSuper', 
    'segr': 'qrCodeContainerSegr'
  };
  
  const qrContainer = document.getElementById(qrContainers[role]);
  const img = qrContainer.querySelector('img');
  
  if (img) {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>QR Code WiFi Aziendale</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              text-align: center; 
              margin: 20px; 
            }
            .qr-print { 
              margin: 20px 0; 
            }
            .instructions {
              font-size: 14px;
              margin: 20px 0;
              border: 1px solid #ddd;
              padding: 15px;
              background: #f9f9f9;
            }
          </style>
        </head>
        <body>
          <h2>🔗 WiFi Aziendale - QR Code</h2>
          <div class="qr-print">
            <img src="${img.src}" alt="QR Code WiFi" style="width: 300px;">
          </div>
          <div class="instructions">
            <strong>Istruzioni per i dipendenti:</strong><br>
            1. Apri l'app Fotocamera del telefono<br>
            2. Inquadra questo QR code<br>  
            3. Tap sulla notifica "WiFi Network"<br>
            4. Conferma connessione<br><br>
            <em>Il telefono si connetterà automaticamente al WiFi aziendale</em>
          </div>
          <script>window.onload = () => window.print();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }
}

// Genera QR Code Browser Connection
async function generateBrowserQR(role) {
  const containers = {
    'admin': 'browserQRSection',
    'super': 'browserQRSectionSuper',
    'segr': 'browserQRSectionSegr'
  };

  const qrContainers = {
    'admin': 'browserQRContainer',
    'super': 'browserQRContainerSuper',
    'segr': 'browserQRContainerSegr'
  };

  const messages = {
    'admin': 'browserQRMessage',
    'super': 'browserQRMessageSuper',
    'segr': 'browserQRMessageSegr'
  };

  const container = document.getElementById(containers[role]);
  const qrContainer = document.getElementById(qrContainers[role]);
  const messageDiv = document.getElementById(messages[role]);

  try {
    messageDiv.textContent = 'Generazione QR code connessione browser in corso...';
    messageDiv.style.color = '#f1c40f';

    const res = await fetch('/api/browser/qrcode', {
      credentials: 'same-origin'
    });

    const data = await res.json();

    if (res.ok) {
      // Mostra il QR code
      qrContainer.innerHTML = `
        <img src="${data.qrcode}" alt="QR Code Connessione Browser" style="max-width: 300px; border: 2px solid #ddd; border-radius: 10px;">
        <div style="margin-top: 10px; font-size: 0.9rem; color: var(--muted);">
          <strong>URL Principale:</strong> ${data.primaryUrl}<br>
          <strong>URL Alternativo:</strong> ${data.fallbackUrl}
        </div>
      `;

      messageDiv.textContent = '✅ QR Code generato! Scansiona con il cellulare per accedere al sistema di gestione permessi dal browser.';
      messageDiv.style.color = 'var(--ok)';

      container.style.display = 'block';

    } else {
      messageDiv.textContent = '❌ ' + (data.error || 'Errore generazione QR code');
      messageDiv.style.color = 'var(--error)';
    }

  } catch (err) {
    console.error('Errore generazione QR browser:', err);
    messageDiv.textContent = '❌ Errore di rete durante generazione QR code';
    messageDiv.style.color = 'var(--error)';
  }
}

// Close Browser QR Code
function closeBrowserQR(role) {
  const containers = {
    'admin': 'browserQRSection',
    'super': 'browserQRSectionSuper',
    'segr': 'browserQRSectionSegr'
  };

  const container = document.getElementById(containers[role]);
  container.style.display = 'none';
}

// Stampa Browser QR Code
function printBrowserQR(role) {
  const qrContainers = {
    'admin': 'browserQRContainer',
    'super': 'browserQRContainerSuper',
    'segr': 'browserQRContainerSegr'
  };

  const qrContainer = document.getElementById(qrContainers[role]);
  const img = qrContainer.querySelector('img');

  if (img) {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>QR Code Connessione Browser</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              text-align: center;
              margin: 20px;
            }
            .qr-print {
              margin: 20px 0;
            }
            .instructions {
              font-size: 14px;
              margin: 20px 0;
              border: 1px solid #ddd;
              padding: 15px;
              background: #f9f9f9;
            }
          </style>
        </head>
        <body>
          <h2>🌐 Sistema Leave Management - QR Code</h2>
          <div class="qr-print">
            <img src="${img.src}" alt="QR Code Connessione Browser" style="width: 300px;">
          </div>
          <div class="instructions">
            <strong>Istruzioni:</strong><br>
            1. Apri l'app fotocamera del tuo smartphone<br>
            2. Inquadra questo QR code<br>
            3. Tocca il link che appare per aprire il browser<br>
            4. Accedi con le tue credenziali
          </div>
        </body>
        <script>window.onload = () => window.print();</script>
      </html>
    `);
    printWindow.document.close();
  }
}

// Setup handlers quando DOM è pronto
document.addEventListener('DOMContentLoaded', setupQRCodeHandlers);
document.addEventListener('DOMContentLoaded', setupErrorMonitor);

// Gestione logout
document.getElementById('logoutBtn').addEventListener('click', async () => {
  try {
    const res = await fetch('/api/logout', {
      method: 'POST',
      credentials: 'same-origin'
    });
    
    if (res.ok) {
      // Pulisci sessionStorage
      sessionStorage.clear();
      // Reindirizza alla pagina di benvenuto
      window.location.href = 'index.html';
    } else {
      alert('Error during logout');
    }
  } catch (err) {
    console.error('Errore logout:', err);
    alert('Errore di connessione durante il logout');
  }
});

// === LICENSE MANAGEMENT ===

// Carica status licenza e aggiorna UI
async function caricaStatusLicenza() {
  try {
    const res = await fetch('/api/license/status', {
      credentials: 'same-origin'
    });
    const licenseInfo = await res.json();

    const statusBadge = document.getElementById('licenseStatus');
    const appTitle = document.getElementById('appTitle');

    // Aggiorna badge licenza
    statusBadge.textContent = licenseInfo.status;
    statusBadge.className = `license-badge ${licenseInfo.status.toLowerCase()}`;

    // Aggiorna titolo app nell'header
    if (appTitle) {
      appTitle.textContent = licenseInfo.status === 'PRO' ? 'WKF Suite PRO' : 'WKF Suite';
      appTitle.className = licenseInfo.status === 'PRO' ? 'app-title pro' : 'app-title';
    }

    // Gestisci UI in base al status licenza
    if (licenseInfo.status === 'FREE') {
      // Modalità FREE - aggiungi indicatori PRO alle funzioni che lo richiedono
      markProFeatures();
    } else {
      // Modalità PRO - rimuovi indicatori PRO e abilita tutte le funzioni
      removeProFeatureMarkers();
      enableProFeatures();
    }

    // Aggiorna titolo pagina
    document.title = `Dashboard - WKF Suite ${licenseInfo.status}`;

  } catch (error) {
    console.error('Errore caricamento status licenza:', error);
  }
}

// Marca le funzioni PRO-only nell'interfaccia
function markProFeatures() {
  // Analytics avanzate
  const analyticsBtn = document.querySelector('a[href="analytics.html"]');
  if (analyticsBtn && !analyticsBtn.classList.contains('pro-only')) {
    analyticsBtn.classList.add('pro-only');
    analyticsBtn.addEventListener('click', handleProFeatureClick);
  }

  // Email sections nell'admin
  setTimeout(() => {
    const emailSections = document.querySelectorAll('#emailForm, .email-config');
    emailSections.forEach(section => {
      if (!section.classList.contains('pro-only')) {
        section.classList.add('pro-only');
      }
    });
  }, 1000);
}

// Rimuove i marker delle funzioni PRO
function removeProFeatureMarkers() {
  const proElements = document.querySelectorAll('.pro-only');
  proElements.forEach(element => {
    element.classList.remove('pro-only');
    element.removeEventListener('click', handleProFeatureClick);
  });
}

// Abilita completamente le funzioni PRO per utenti con licenza
function enableProFeatures() {
  // Rimuovi tutti i blocchi PRO
  removeProFeatureMarkers();

  // Abilita analytics senza restrizioni
  const analyticsButtons = document.querySelectorAll('button[onclick*="checkAnalyticsAccess"], .analytics-btn');
  analyticsButtons.forEach(btn => {
    btn.onclick = () => window.location.href = 'analytics.html';
  });

  // Abilita tutte le funzioni email automaticamente
  setTimeout(() => {
    const emailElements = document.querySelectorAll('#emailForm, .email-config, .email-section');
    emailElements.forEach(element => {
      element.style.display = 'block';
      element.classList.remove('disabled', 'pro-only');
    });
  }, 500);

  console.log('✅ Tutte le funzioni PRO abilitate');
}

// Gestisce click su funzioni PRO (FREE users)
function handleProFeatureClick(e) {
  e.preventDefault();
  mostraUpgradeModal();
}

// Modal per upgrade PRO
function mostraUpgradeModal() {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h3>⭐ Funzione PRO Richiesta</h3>
        <button class="close-btn" onclick="this.closest('.modal-overlay').remove()">&times;</button>
      </div>
      <div class="modal-body">
        <div style="text-align: center; margin: 20px 0;">
          <div class="upgrade-icon">🚀</div>
          <p>Questa funzione è disponibile solo in <strong>WKF Suite PRO</strong>.</p>
          <p>Sblocca tutte le funzionalità avanzate con un pagamento unico di €20!</p>

          <div style="margin: 25px 0;">
            <strong>🎁 Cosa include PRO:</strong>
            <ul style="text-align: left; margin: 15px 0; display: inline-block;">
              <li>📧 Email notifiche automatiche</li>
              <li>📊 Analytics e grafici avanzati</li>
              <li>📄 Report PDF personalizzati</li>
              <li>🛟 Supporto prioritario</li>
            </ul>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn upgrade-btn" onclick="apriUpgrade()">🚀 Upgrade - €20</button>
        <button class="btn secondary" onclick="mostraLicenseKeyModal()">🔑 Ho già una License Key</button>
        <button class="btn secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
}

// Apri sistema upgrade Stripe integrato
function apriUpgrade() {
  // Usa il sistema Stripe integrato invece del sito esterno
  if (window.StripeUpgrade) {
    const upgradeSystem = new window.StripeUpgrade();
    upgradeSystem.showUpgradeDialog();
  } else {
    console.warn('Sistema Stripe non disponibile');
    showToast('❌ Sistema upgrade non disponibile. Riprova tra poco.', 'error');
  }
}

// Event listeners per license key (upgrade viene gestito sopra nel DOMContentLoaded principale)
document.addEventListener('DOMContentLoaded', () => {
  // License key button
  const licenseKeyBtn = document.getElementById('licenseKeyBtn');
  if (licenseKeyBtn) {
    licenseKeyBtn.addEventListener('click', mostraLicenseKeyModal);
  }
});

// Modal per inserire license key
function mostraLicenseKeyModal() {
  // Close eventuali modal aperti
  const existingModals = document.querySelectorAll('.modal-overlay');
  existingModals.forEach(modal => modal.remove());

  const licenseModal = document.getElementById('licenseModal');
  licenseModal.style.display = 'flex';

  // Event listeners
  const closeModal = () => {
    licenseModal.style.display = 'none';
    document.getElementById('licenseKeyInput').value = '';
    document.getElementById('licenseMsg').innerHTML = '';
  };

  document.getElementById('closeLicenseModal').onclick = closeModal;
  document.getElementById('cancelLicenseBtn').onclick = closeModal;

  // Attiva license key
  document.getElementById('activateLicenseBtn').onclick = async () => {
    const licenseKey = document.getElementById('licenseKeyInput').value.trim();
    const msgDiv = document.getElementById('licenseMsg');

    if (!licenseKey) {
      msgDiv.innerHTML = '<div class="message error">Submit una license key valida</div>';
      return;
    }

    try {
      const res = await fetch('/api/license/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ licenseKey })
      });

      const result = await res.json();

      if (result.success) {
        msgDiv.innerHTML = '<div class="message success">✅ License key attivata con successo!</div>';

        setTimeout(() => {
          closeModal();
          // Ricarica status licenza
          caricaStatusLicenza();
          // Mostra conferma
          alert('🎉 WKF Suite PRO attivato! Tutte le funzionalità avanzate sono ora disponibili.');
        }, 2000);
      } else {
        msgDiv.innerHTML = `<div class="message error">❌ ${result.error}</div>`;
      }

    } catch (error) {
      console.error('Errore attivazione license:', error);
      msgDiv.innerHTML = '<div class="message error">❌ Errore di connessione</div>';
    }
  };
}

// Carica logo aziendale nell'header se disponibile
async function loadCompanyLogo() {
  try {
    const response = await fetch('/api/company-settings', {
      credentials: 'same-origin'
    });
    const settings = await response.json();

    if (settings && settings.logo_path) {
      const logoImg = document.querySelector('.logo img');
      if (logoImg) {
        logoImg.src = settings.logo_path;
        logoImg.alt = settings.company_name || 'Logo Aziendale';
      }

      // Aggiorna anche il titolo se disponibile
      if (settings.company_name) {
        const logoSpan = document.querySelector('.logo span');
        if (logoSpan && !logoSpan.id) { // Assicurati che non sia il license badge
          logoSpan.textContent = settings.company_name;
        }
      }
    }
  } catch (error) {
    console.log('Logo aziendale non disponibile o errore caricamento:', error);
  }
}

// Controllo accesso Analytics
// [FIX v1.1.1] Controllo accesso Analytics (SOLO PRO)
async function checkAnalyticsAccess() {
  try {
    const response = await fetch('/api/license/status', {
      credentials: 'same-origin'
    });
    const licenseData = await response.json();

    if (licenseData.isPro) {
      // Utente PRO - consenti accesso
      window.location.href = 'analytics.html';
    } else {
      // Utente FREE (incluso Admin) - mostra modal upgrade
      showToast('📊 Advanced Analytics disponibili solo con licenza PRO!', 'warning');
      mostraUpgradeModal();
    }
  } catch (error) {
    console.error('Errore controllo licenza:', error);
    showToast('❌ Errore controllo licenza. Analytics non disponibili.', 'error');
  }
}

// ===============================================
// SISTEMA ATTIVAZIONE AUTOMATICA PRO DOPO PAGAMENTO STRIPE
// ===============================================

/**
 * Controlla se l'utente è appena tornato da un pagamento Stripe completato
 * Se trova parametri di successo, attiva automaticamente la modalità PRO
 */
async function checkStripePaymentReturn() {
  const urlParams = new URLSearchParams(window.location.search);
  const paymentStatus = urlParams.get('payment');
  const sessionId = urlParams.get('session_id');

  // Controlla se l'utente è tornato da un pagamento Stripe
  if (paymentStatus === 'success' && sessionId) {
    console.log('🔍 Rilevato ritorno da pagamento Stripe:', sessionId);

    try {
      // Mostra loading
      showToast('⏳ Attivazione WKF Suite PRO in corso...', 'info');

      // Verifica il pagamento con Stripe e attiva PRO
      await activateProFromStripePayment(sessionId);

      // Pulisci URL dai parametri di pagamento
      const cleanUrl = window.location.origin + window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);

    } catch (error) {
      console.error('❌ Errore attivazione PRO automatica:', error);
      showToast('❌ Errore attivazione PRO. Controlla la connessione.', 'error');
    }
  }

  // Controlla anche pagamenti cancellati
  if (paymentStatus === 'cancelled') {
    console.log('⚠️ Pagamento Stripe cancellato dall\'utente');
    showToast('❌ Pagamento cancellato. WKF Suite rimane in modalità FREE.', 'warning');

    // Pulisci URL
    const cleanUrl = window.location.origin + window.location.pathname;
    window.history.replaceState({}, document.title, cleanUrl);
  }
}

/**
 * Attiva automaticamente la modalità PRO dopo pagamento Stripe confermato
 * @param {string} sessionId - ID della sessione Stripe
 */
async function activateProFromStripePayment(sessionId) {
  const maxRetries = 3;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      console.log(`🔄 Verifica pagamento Stripe (tentativo ${attempt + 1}/${maxRetries}):`, sessionId);

      // Chiama l'endpoint server per verificare il pagamento
      const response = await fetch(`/api/verify-payment/${sessionId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        // Errori server 5xx sono temporanei, riprova
        if (response.status >= 500 && attempt < maxRetries - 1) {
          console.warn(`⚠️ Errore server temporaneo ${response.status}, riprovo...`);
          attempt++;
          await new Promise(resolve => setTimeout(resolve, 2000 * attempt)); // Backoff progressivo
          continue;
        }

        throw new Error(`Errore server: ${response.status}`);
      }

      const paymentData = await response.json();
      console.log('📊 Dati pagamento ricevuti:', paymentData);

      if (paymentData.success && paymentData.licenseKey) {
        // Pagamento confermato - attiva license key automaticamente
        await activateLicenseKeyAutomatically(paymentData.licenseKey);

        // Mostra messaggio di successo PRO
        showProActivationSuccess(paymentData);

        // Forza ricarico della pagina per applicare lo stato PRO
        setTimeout(() => {
          window.location.reload();
        }, 3000);

        return; // Successo, esci dalla funzione

      } else {
        // Se il pagamento non è ancora confermato, riprova (potrebbe essere in elaborazione)
        if (attempt < maxRetries - 1) {
          console.warn(`⚠️ Pagamento non ancora confermato (tentativo ${attempt + 1}), riprovo...`);
          attempt++;
          await new Promise(resolve => setTimeout(resolve, 3000 * attempt));
          continue;
        }

        console.warn('⚠️ Pagamento non confermato dopo tutti i tentativi:', paymentData);
        showToast('⚠️ Pagamento in elaborazione. Riprova tra qualche minuto.', 'warning');
        return;
      }

    } catch (error) {
      console.error(`❌ Errore verifica pagamento (tentativo ${attempt + 1}):`, error);

      // Se è l'ultimo tentativo, mostra errore
      if (attempt === maxRetries - 1) {
        // Errori di rete - suggerisci di controllare connessione
        if (error.name === 'TypeError' || error.message.includes('fetch')) {
          showToast('❌ Errore di rete. Controlla la connessione e ricarica la pagina.', 'error');
        } else {
          showToast('❌ Errore attivazione PRO. Ricarica la pagina per riprovare.', 'error');
        }
        throw error;
      }

      // Riprova dopo pausa
      attempt++;
      await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
    }
  }
}

/**
 * Attiva automaticamente una license key senza input utente
 * @param {string} licenseKey - License key da attivare
 */
async function activateLicenseKeyAutomatically(licenseKey) {
  try {
    console.log('🔑 Attivazione automatica license key...');

    const response = await fetch('/api/license/activate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ licenseKey: licenseKey })
    });

    if (!response.ok) {
      throw new Error(`Errore attivazione: ${response.status}`);
    }

    const result = await response.json();

    if (result.success) {
      console.log('✅ License key attivata automaticamente!');

      // Log attivazione per debug
      console.log('🎉 WKF Suite PRO attivato:', {
        licenseKey: licenseKey.substring(0, 12) + '...',
        timestamp: new Date().toISOString(),
        features: result.features
      });

      return true;
    } else {
      throw new Error(result.error || 'Attivazione fallita');
    }

  } catch (error) {
    console.error('❌ Errore attivazione automatica license:', error);
    throw error;
  }
}

/**
 * Mostra messaggio di benvenuto per nuovo utente PRO
 * @param {Object} paymentData - Dati del pagamento
 */
function showProActivationSuccess(paymentData) {
  // Nascondi toast di caricamento
  const existingToasts = document.querySelectorAll('.toast');
  existingToasts.forEach(toast => toast.remove());

  // Crea modal di successo PRO
  const modal = document.createElement('div');
  modal.className = 'modal-overlay success-modal';
  modal.innerHTML = `
    <div class="modal-content pro-activation-modal">
      <div class="modal-header pro-header">
        <h3>🎉 WKF Suite PRO Attivato!</h3>
      </div>
      <div class="modal-body">
        <div class="success-content">
          <div class="success-icon">✅</div>
          <h4>Benvenuto in WKF Suite PRO!</h4>
          <p>Il tuo pagamento di <strong>€${(paymentData.amount / 100).toFixed(2)}</strong> è stato elaborato con successo.</p>
          <p>Ora hai accesso a tutte le funzionalità PRO:</p>

          <div class="pro-features-list">
            <div class="feature-item">📧 Notifiche email automatiche</div>
            <div class="feature-item">📊 Analytics avanzate</div>
            <div class="feature-item">🖨️ Report PDF personalizzati</div>
            <div class="feature-item">🎨 Branding aziendale</div>
            <div class="feature-item">💾 Backup automatici</div>
            <div class="feature-item">🔧 Supporto prioritario</div>
          </div>

          <p><small>License Key: <code>${paymentData.licenseKey.substring(0, 12)}...</code></small></p>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn pro-btn" onclick="this.closest('.modal-overlay').remove()">
          🚀 Inizia ad usare PRO!
        </button>
      </div>
    </div>
  `;

  // Aggiungi stili per il modal PRO
  const styles = document.createElement('style');
  styles.textContent = `
    .pro-activation-modal {
      max-width: 500px;
      text-align: center;
    }
    .pro-header {
      background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
      color: white;
    }
    .success-content {
      padding: 20px;
    }
    .success-icon {
      font-size: 48px;
      margin-bottom: 20px;
    }
    .pro-features-list {
      text-align: left;
      margin: 20px 0;
      padding: 15px;
      background: #f8f9fa;
      border-radius: 8px;
      border-left: 4px solid #28a745;
    }
    .feature-item {
      margin: 8px 0;
      padding: 5px 0;
    }
    .pro-btn {
      background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 6px;
      font-weight: bold;
      cursor: pointer;
    }
    .pro-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 15px rgba(40, 167, 69, 0.3);
    }
  `;

  document.head.appendChild(styles);
  document.body.appendChild(modal);

  // Auto-remove dopo 10 secondi se l'utente non clicca
  setTimeout(() => {
    if (modal && modal.parentNode) {
      modal.remove();
    }
  }, 10000);
}

// === EXPORT CALENDARIO iCAL ===
// [DISABILITATO] Funzione per esportare calendario permessi dipendente
// Temporaneamente disabilitata per problemi di compatibilità
/*
async function exportCalendario(matricola, nomeDipendente) {
  try {
    console.log(`📅 Export calendario per matricola: ${matricola}`);

    // Effettua la richiesta per scaricare il file .ics
    const response = await fetch(`/api/export-calendar/${matricola}`, {
      method: 'GET',
      credentials: 'same-origin'
    });

    console.log(`Response status: ${response.status}, content-type: ${response.headers.get('content-type')}`);

    if (!response.ok) {
      let errorMessage = 'Errore durante l\'export del calendario';
      try {
        const error = await response.json();
        errorMessage = error.error || errorMessage;
      } catch (e) {
        // Se non è JSON, prova a leggere come testo
        try {
          const errorText = await response.text();
          errorMessage = errorText || errorMessage;
        } catch (e2) {
          errorMessage = `Errore HTTP ${response.status}: ${response.statusText}`;
        }
      }
      throw new Error(errorMessage);
    }

    // Scarica il file
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;

    // Ottieni il nome file dagli headers o usa un default
    const contentDisposition = response.headers.get('Content-Disposition');
    let filename = `permessi_${nomeDipendente}_${matricola}.ics`.toLowerCase().replace(/\s+/g, '_');
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="(.+)"/);
      if (filenameMatch) {
        filename = filenameMatch[1];
      }
    }

    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    // Mostra messaggio di successo
    if (typeof showToast === 'function') {
      showToast(`✅ Calendario di ${nomeDipendente} esportato con successo!`, 'success');
    } else {
      alert(`✅ Calendario di ${nomeDipendente} esportato! Puoi importarlo in Google Calendar, Outlook o iPhone.`);
    }

    console.log(`✅ Calendario esportato: ${filename}`);

  } catch (error) {
    console.error('Errore export calendario:', error);

    if (typeof showToast === 'function') {
      showToast('❌ ' + error.message, 'error');
    } else {
      alert('Errore: ' + error.message);
    }
  }
}
*/

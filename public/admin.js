const wifiForm = document.getElementById('wifiForm');
const wifiMsg = document.getElementById('wifiMsg');
const utentiTableBody = document.querySelector('#utentiTable tbody');

// Company settings form elements
const companyForm = document.getElementById('companyForm');
const companyMsg = document.getElementById('companyMsg');

// Email form elements
const emailForm = document.getElementById('emailForm');
const emailMsg = document.getElementById('emailMsg');
const emailEnabled = document.getElementById('emailEnabled');
const emailFields = document.getElementById('emailFields');
const testEmailBtn = document.getElementById('testEmailBtn');

// Controllo ruolo all'apertura della pagina
window.addEventListener('DOMContentLoaded', () => {
  const ruolo = sessionStorage.getItem('ruolo'); // salvato al login
  if(ruolo !== 'admin' && ruolo !== 'supervisore' && ruolo !== 'segreteria'){
    alert('Accesso negato, solo admin, supervisore e segreteria possono vedere questa pagina');
    window.location.href = 'dashboard.html';
    return;
  }

  // Aggiorna titolo pagina in base al ruolo
  const pageTitle = document.getElementById('pageTitle');
  if(ruolo === 'admin') {
    pageTitle.textContent = '🔧 Admin - Configurazione WiFi, Email & Gestione Utenti';
    caricaUtenti();
    // Mostra sezione strumenti database solo per admin
    const dbToolsSection = document.getElementById('dbToolsSection');
    if(dbToolsSection) dbToolsSection.style.display = 'block';
  } else if(ruolo === 'supervisore') {
    pageTitle.textContent = '👨‍💼 Supervisore - Gestione Utenti & Configurazione Email';
    // Mostra sezione utenti per supervisore ma nascondi wifi
    caricaUtenti();
    const wifiSection = document.querySelector('#wifiForm').parentElement;
    if(wifiSection) wifiSection.style.display = 'none';
  } else if(ruolo === 'segreteria') {
    pageTitle.textContent = '📋 Segreteria - Gestione Utenti & Configurazione Email';
    // Mostra sezione utenti per segreteria ma nascondi wifi
    caricaUtenti();
    const wifiSection = document.querySelector('#wifiForm').parentElement;
    if(wifiSection) wifiSection.style.display = 'none';
  }

  caricaConfigEmail(); // carica configurazione email esistente per admin, supervisore e segreteria
  caricaImpostazioniAzienda(); // carica impostazioni azienda per admin
});

// Salvataggio Wi-Fi
wifiForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  wifiMsg.textContent = '';

  const ssid = document.getElementById('ssid').value.trim();
  const password = document.getElementById('wifiPassword').value.trim();

  // Validation
  if (!ssid || !password) {
    wifiMsg.textContent = 'SSID e password sono obbligatori';
    wifiMsg.style.color = 'red';
    return;
  }

  if (ssid.length < 1) {
    wifiMsg.textContent = 'SSID non può essere vuoto';
    wifiMsg.style.color = 'red';
    return;
  }

  if (password.length < 8) {
    wifiMsg.textContent = 'Password WiFi deve essere almeno 8 caratteri';
    wifiMsg.style.color = 'red';
    return;
  }

  try {
    const res = await fetch('/api/wifi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ssid, password })
    });

    const data = await res.json();

    if(res.ok){
      wifiMsg.textContent = 'Wi-Fi salvato correttamente!';
      wifiMsg.style.color = 'green';
      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 1000);
    } else {
      wifiMsg.textContent = data.error || 'Errore salvataggio Wi-Fi';
      wifiMsg.style.color = 'red';
    }

  } catch(err){
    wifiMsg.textContent = 'Errore di connessione';
    wifiMsg.style.color = 'red';
    console.error(err);
  }
});

// Salvataggio Impostazioni Azienda
companyForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  companyMsg.textContent = '';

  const companyName = document.getElementById('companyName').value.trim();
  const logoFile = document.getElementById('companyLogo').files[0];

  // Validation
  if (!companyName) {
    companyMsg.textContent = 'Nome azienda è obbligatorio';
    companyMsg.style.color = 'red';
    return;
  }

  try {
    console.log('📤 Invio richiesta salvataggio company settings...');

    // Usa FormData per gestire file upload
    const formData = new FormData();
    formData.append('company_name', companyName);
    formData.append('notification_email', ''); // Vuoto per versione free
    formData.append('standard_vacation_days', 22); // Default

    if (logoFile) {
      console.log('📷 Logo selezionato:', logoFile.name, logoFile.size, 'bytes');
      formData.append('logo', logoFile);
    } else {
      console.log('📷 Nessun logo selezionato');
    }

    const res = await fetch('/api/company-settings', {
      method: 'POST',
      body: formData // Non impostare Content-Type, il browser lo farà automaticamente
    });

    console.log('📥 Risposta ricevuta, status:', res.status);

    const data = await res.json();
    console.log('📋 Dati risposta:', data);

    if(data.success) {
      console.log('✅ Salvataggio riuscito!');
      companyMsg.textContent = data.message || '✅ Impostazioni azienda salvate con successo';
      companyMsg.style.color = 'green';

      // Aggiorna il preview del logo se caricato
      if (data.logo_path) {
        const currentLogoDiv = document.getElementById('currentLogo');
        currentLogoDiv.innerHTML = `
          <div style="margin-top: 10px;">
            <p style="margin: 5px 0; color: #59be83;">✅ Logo caricato con successo!</p>
            <img src="${data.logo_path}" alt="Logo aziendale" style="max-height: 80px; max-width: 200px; border: 1px solid rgba(255,255,255,0.2); border-radius: 8px;">
            <p style="font-size: 12px; color: #999; margin-top: 5px;">Logo aziendale aggiornato</p>
          </div>
        `;

        // Reset input file
        document.getElementById('companyLogo').value = '';
      }
    } else {
      console.log('❌ Salvataggio fallito:', data.error);
      companyMsg.textContent = data.error || 'Errore salvataggio impostazioni azienda';
      companyMsg.style.color = 'red';
    }

  } catch(err){
    console.error('❌ Errore catch:', err);
    companyMsg.textContent = 'Errore di connessione: ' + err.message;
    companyMsg.style.color = 'red';
  }
});

// Caricamento impostazioni azienda
async function caricaImpostazioniAzienda() {
  const ruolo = sessionStorage.getItem('ruolo');
  console.log('🔍 Ruolo utente per company settings:', ruolo);

  // Solo admin può modificare le impostazioni azienda
  if (ruolo !== 'admin') {
    console.log('⚠️ Utente non admin, nascondo sezione company settings');
    const companySection = document.querySelector('#companyForm').parentElement;
    if (companySection) {
      companySection.style.display = 'none';
      console.log('✅ Sezione company settings nascosta');
    }
    return;
  }

  console.log('✅ Utente è admin, carico impostazioni azienda');

  try {
    const res = await fetch('/api/company-settings');
    const settings = await res.json();

    document.getElementById('companyName').value = settings.company_name || 'WKF Suite';

    // TODO: Handle logo display if implemented in the future
    const currentLogoDiv = document.getElementById('currentLogo');
    if (settings.logo_path) {
      currentLogoDiv.innerHTML = `<img src="${settings.logo_path}" alt="Logo aziendale" style="max-height: 50px;">`;
    } else {
      currentLogoDiv.innerHTML = '<small style="color: #999;">Nessun logo caricato</small>';
    }

  } catch(err) {
    console.error('Errore caricamento impostazioni azienda:', err);
  }
}

// Caricamento utenti
async function caricaUtenti(){
  try {
    const res = await fetch('/api/utenti');
    const utenti = await res.json();
    utentiTableBody.innerHTML = '';

    utenti.forEach(u => {
      const tr = document.createElement('tr');

      // Bottone reset password per tutti gli utenti (tranne l'admin corrente)
      const currentUserId = sessionStorage.getItem('userId');
      const pulsanteReset = u.id.toString() !== currentUserId ?
        `<button class="btn" style="background: #f39c12; color: white; font-size: 11px; padding: 3px 8px; border-radius: 4px; margin-right: 5px;"
                onclick="resetPassword('${u.id}', '${u.username}')">🔑 Reset Password</button>` : '';

      // Solo i dipendenti possono essere rimossi
      const pulsanteRimozione = u.ruolo === 'dipendente' ?
        `<button class="btn" style="background: #e74c3c; color: white; font-size: 11px; padding: 3px 8px; border-radius: 4px;"
                onclick="rimuoviUtente('${u.id}', '${u.username}')">🗑️ Rimuovi</button>` :
        '<span style="color: #999;">-</span>';

      tr.innerHTML = `<td>${u.id}</td><td>${u.username}</td><td>${u.ruolo}</td><td style="text-align: center;">${pulsanteReset}${pulsanteRimozione}</td>`;
      utentiTableBody.appendChild(tr);
    });

  } catch(err){
    console.error('Errore caricamento utenti', err);
  }
}

// Toggle visibilità campi email
emailEnabled.addEventListener('change', () => {
  emailFields.style.display = emailEnabled.checked ? 'block' : 'none';
});

// Caricamento configurazione email
async function caricaConfigEmail() {
  try {
    const res = await fetch('/api/email-config');
    const config = await res.json();

    if (config.enabled) {
      emailEnabled.checked = true;
      emailFields.style.display = 'block';

      document.getElementById('smtpHost').value = config.smtp_host || '';
      document.getElementById('smtpPort').value = config.smtp_port || 587;
      document.getElementById('smtpSecure').checked = config.smtp_secure || false;
      document.getElementById('smtpUser').value = config.smtp_user || '';
      document.getElementById('fromEmail').value = config.from_email || '';
      document.getElementById('fromName').value = config.from_name || 'Sistema Gestione Permessi';
    }
  } catch(err) {
    console.error('Errore caricamento configurazione email:', err);
  }
}

// Salvataggio configurazione email
emailForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  emailMsg.textContent = '';

  const enabled = emailEnabled.checked;

  const formData = {
    enabled,
    smtp_host: enabled ? document.getElementById('smtpHost').value.trim() : '',
    smtp_port: enabled ? parseInt(document.getElementById('smtpPort').value) : 587,
    smtp_secure: enabled ? document.getElementById('smtpSecure').checked : false,
    smtp_user: enabled ? document.getElementById('smtpUser').value.trim() : '',
    smtp_password: enabled ? document.getElementById('smtpPassword').value : '',
    from_email: enabled ? document.getElementById('fromEmail').value.trim() : '',
    from_name: enabled ? document.getElementById('fromName').value.trim() : 'Sistema Gestione Permessi'
  };

  // Validazione client-side
  if (enabled) {
    if (!formData.smtp_host || !formData.smtp_user || !formData.smtp_password || !formData.from_email) {
      emailMsg.textContent = 'Tutti i campi SMTP sono obbligatori quando abilitato';
      emailMsg.style.color = 'red';
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.from_email)) {
      emailMsg.textContent = 'Email mittente non valida';
      emailMsg.style.color = 'red';
      return;
    }
  }

  try {
    const res = await fetch('/api/email-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });

    const data = await res.json();

    if (res.ok) {
      emailMsg.textContent = enabled ? 'Configurazione email salvata!' : 'Email disabilitata';
      emailMsg.style.color = 'green';
    } else {
      emailMsg.textContent = data.error || 'Errore salvataggio configurazione';
      emailMsg.style.color = 'red';
    }
  } catch(err) {
    emailMsg.textContent = 'Errore di connessione';
    emailMsg.style.color = 'red';
    console.error('Errore salvataggio email config:', err);
  }
});

// Test email
testEmailBtn.addEventListener('click', async () => {
  const testEmail = document.getElementById('testEmail').value.trim();

  if (!testEmail) {
    emailMsg.textContent = 'Inserisci un\'email per il test';
    emailMsg.style.color = 'red';
    return;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testEmail)) {
    emailMsg.textContent = 'Email per test non valida';
    emailMsg.style.color = 'red';
    return;
  }

  testEmailBtn.disabled = true;
  testEmailBtn.textContent = 'Invio...';

  try {
    const res = await fetch('/api/email-config/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ test_email: testEmail })
    });

    const data = await res.json();

    if (res.ok) {
      emailMsg.textContent = 'Email di test inviata con successo!';
      emailMsg.style.color = 'green';
    } else {
      emailMsg.textContent = `Errore test: ${data.error}`;
      emailMsg.style.color = 'red';
    }
  } catch(err) {
    emailMsg.textContent = 'Errore di connessione durante il test';
    emailMsg.style.color = 'red';
    console.error('Errore test email:', err);
  }

  testEmailBtn.disabled = false;
  testEmailBtn.textContent = 'Invia Test';
});

// Funzione per rimuovere un utente
async function rimuoviUtente(userId, username) {
  if (!confirm(`Sei sicuro di voler eliminare il dipendente "${username}"?\n\nQuesta azione è irreversibile e eliminerà anche tutte le sue richieste di permesso.`)) {
    return;
  }

  try {
    // Elimina l'utente usando l'ID
    const res = await fetch(`/api/utenti/${userId}`, {
      method: 'DELETE',
      credentials: 'same-origin'
    });

    if (res.ok) {
      const result = await res.json();
      alert(`Dipendente "${username}" eliminato con successo`);

      // Ricarica la lista degli utenti
      caricaUtenti();
    } else {
      const error = await res.json();
      alert('Errore: ' + (error.error || 'Impossibile eliminare il dipendente'));
    }
  } catch (err) {
    console.error('Errore eliminazione dipendente:', err);
    alert('Errore di connessione');
  }
}

// Funzione per resettare password utente
async function resetPassword(userId, username) {
  if (!confirm(`Resettare la password per "${username}"?\n\nVerrà generata una password temporanea che l'utente dovrà cambiare al primo login.`)) {
    return;
  }

  try {
    const res = await fetch(`/api/utenti/${userId}/reset-password`, {
      method: 'POST',
      credentials: 'same-origin'
    });

    if (res.ok) {
      const result = await res.json();

      // Mostra la password temporanea in un alert
      alert(`✅ Password resettata per "${username}"\n\n🔑 Password temporanea: ${result.tempPassword}\n\n⚠️ IMPORTANTE: Copia questa password e comunicala all'utente.\nL'utente dovrà cambiarla al primo login.\n\nQuesta password non verrà più mostrata!`);
    } else {
      const error = await res.json();
      alert('Errore: ' + (error.error || 'Impossibile resettare la password'));
    }
  } catch (err) {
    console.error('Errore reset password:', err);
    alert('Errore di connessione');
  }
}

// Preview del logo in tempo reale
document.getElementById('companyLogo').addEventListener('change', function(e) {
  const file = e.target.files[0];
  const currentLogoDiv = document.getElementById('currentLogo');

  if (file) {
    // Verifica che sia un'immagine
    if (!file.type.startsWith('image/')) {
      currentLogoDiv.innerHTML = '<small style="color: #e74c3c;">⚠️ Seleziona un file immagine valido</small>';
      return;
    }

    // Verifica dimensione (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      currentLogoDiv.innerHTML = '<small style="color: #e74c3c;">⚠️ File troppo grande. Massimo 5MB</small>';
      return;
    }

    // Crea preview
    const reader = new FileReader();
    reader.onload = function(e) {
      currentLogoDiv.innerHTML = `
        <div style="margin-top: 10px;">
          <p style="margin: 5px 0; color: #59be83;">✅ Nuovo logo selezionato:</p>
          <img src="${e.target.result}" alt="Preview logo" style="max-height: 80px; max-width: 200px; border: 1px solid rgba(255,255,255,0.2); border-radius: 8px;">
          <p style="font-size: 12px; color: #999; margin-top: 5px;">File: ${file.name} (${(file.size / 1024).toFixed(1)} KB)</p>
        </div>
      `;
    };
    reader.readAsDataURL(file);
  } else {
    // Ricarica logo attuale se disponibile
    caricaImpostazioniAzienda();
  }
});

// ========================================
// FUNZIONI GESTIONE DATABASE
// ========================================

// Apri percorso database in Esplora File
async function trovaDatabase() {
  const dbMsg = document.getElementById('dbMsg');
  dbMsg.textContent = '⏳ Apertura percorso database...';
  dbMsg.style.color = '#3498db';

  try {
    const res = await fetch('/api/database/location');
    const data = await res.json();

    if (res.ok) {
      dbMsg.innerHTML = `
        ✅ <strong>Database trovato:</strong><br>
        📂 <code style="background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 3px;">${data.path}</code><br>
        <small style="color: #999;">La cartella verrà aperta in Esplora File</small>
      `;
      dbMsg.style.color = '#27ae60';

      // Apri la cartella (funziona solo su Electron o desktop app)
      if (data.opened) {
        setTimeout(() => {
          dbMsg.innerHTML += '<br><small style="color: #3498db;">✅ Cartella aperta in Esplora File</small>';
        }, 500);
      }
    } else {
      dbMsg.textContent = '❌ ' + (data.error || 'Errore nel trovare il database');
      dbMsg.style.color = '#e74c3c';
    }
  } catch(err) {
    dbMsg.textContent = '❌ Errore di connessione';
    dbMsg.style.color = '#e74c3c';
    console.error('Errore:', err);
  }
}

// Mostra informazioni database
async function infoDatabase() {
  const dbMsg = document.getElementById('dbMsg');
  const dbInfo = document.getElementById('dbInfo');
  const dbInfoContent = document.getElementById('dbInfoContent');

  dbMsg.textContent = '⏳ Caricamento informazioni database...';
  dbMsg.style.color = '#3498db';

  try {
    const res = await fetch('/api/database/info');
    const data = await res.json();

    if (res.ok) {
      dbInfoContent.textContent = `📊 Informazioni Database SQLite

📂 Percorso: ${data.path}
📏 Dimensione: ${data.size}
📅 Ultima modifica: ${data.lastModified}

📋 Tabelle e Record:
${data.tables.map(t => `  • ${t.name}: ${t.count} record`).join('\n')}

💾 Spazio disco disponibile: ${data.diskSpace || 'N/A'}`;

      dbInfo.style.display = 'block';
      dbMsg.textContent = '✅ Informazioni database caricate';
      dbMsg.style.color = '#27ae60';
    } else {
      dbMsg.textContent = '❌ ' + (data.error || 'Errore nel recuperare informazioni');
      dbMsg.style.color = '#e74c3c';
      dbInfo.style.display = 'none';
    }
  } catch(err) {
    dbMsg.textContent = '❌ Errore di connessione';
    dbMsg.style.color = '#e74c3c';
    dbInfo.style.display = 'none';
    console.error('Errore:', err);
  }
}

// Crea backup database
async function backupDatabase() {
  const dbMsg = document.getElementById('dbMsg');

  if (!confirm('Creare un backup del database?\n\nIl backup verrà salvato nella cartella data/backups/')) {
    return;
  }

  dbMsg.textContent = '⏳ Creazione backup in corso...';
  dbMsg.style.color = '#3498db';

  try {
    const res = await fetch('/api/database/backup', { method: 'POST' });
    const data = await res.json();

    if (res.ok) {
      dbMsg.innerHTML = `
        ✅ <strong>Backup creato con successo!</strong><br>
        📂 <code style="background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 3px;">${data.backupPath}</code><br>
        💾 Dimensione: ${data.size}
      `;
      dbMsg.style.color = '#27ae60';
    } else {
      dbMsg.textContent = '❌ ' + (data.error || 'Errore nella creazione del backup');
      dbMsg.style.color = '#e74c3c';
    }
  } catch(err) {
    dbMsg.textContent = '❌ Errore di connessione';
    dbMsg.style.color = '#e74c3c';
    console.error('Errore:', err);
  }
}

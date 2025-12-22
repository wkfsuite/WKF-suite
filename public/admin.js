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

// Role check on page load
window.addEventListener('DOMContentLoaded', () => {
  const ruolo = sessionStorage.getItem('ruolo'); // saved on login
  if(ruolo !== 'admin' && ruolo !== 'supervisore' && ruolo !== 'segreteria'){
    alert('Access denied, only admin, supervisor and secretariat can view this page');
    window.location.href = 'dashboard.html';
    return;
  }

  // Update page title based on role
  const pageTitle = document.getElementById('pageTitle');
  if(ruolo === 'admin') {
    pageTitle.textContent = '🔧 Admin - WiFi, Email & User Management';
    loadUsers();
    // Show database tools section only for admin
    const dbToolsSection = document.getElementById('dbToolsSection');
    if(dbToolsSection) dbToolsSection.style.display = 'block';
  } else if(ruolo === 'supervisore') {
    pageTitle.textContent = '👨‍💼 Supervisor - User Management & Email Configuration';
    // Show user section for supervisor but hide wifi
    loadUsers();
    const wifiSection = document.querySelector('#wifiForm').parentElement;
    if(wifiSection) wifiSection.style.display = 'none';
  } else if(ruolo === 'segreteria') {
    pageTitle.textContent = '📋 Secretary - User Management & Email Configuration';
    // Show user section for secretary but hide wifi
    loadUsers();
    const wifiSection = document.querySelector('#wifiForm').parentElement;
    if(wifiSection) wifiSection.style.display = 'none';
  }

  loadEmailConfig(); // load existing email configuration for admin, supervisor and secretary
  loadCompanySettings(); // load company settings for admin
});

// Salvataggio Wi-Fi
wifiForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  wifiMsg.textContent = '';

  const ssid = document.getElementById('ssid').value.trim();
  const password = document.getElementById('wifiPassword').value.trim();

  // Validation
  if (!ssid || !password) {
    wifiMsg.textContent = 'SSID and password are required';
    wifiMsg.style.color = 'red';
    return;
  }

  if (ssid.length < 1) {
    wifiMsg.textContent = 'SSID cannot be empty';
    wifiMsg.style.color = 'red';
    return;
  }

  if (password.length < 8) {
    wifiMsg.textContent = 'WiFi password must be at least 8 characters';
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
      wifiMsg.textContent = 'Wi-Fi saved successfully!';
      wifiMsg.style.color = 'green';
      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 1000);
    } else {
      wifiMsg.textContent = data.error || 'Error saving WiFi';
      wifiMsg.style.color = 'red';
    }

  } catch(err){
    wifiMsg.textContent = 'Connection error';
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
    companyMsg.textContent = 'Company name is required';
    companyMsg.style.color = 'red';
    return;
  }

  try {
    console.log('📤 Sending request to save company settings...');

    // Usa FormData per gestire file upload
    const formData = new FormData();
    formData.append('company_name', companyName);
    formData.append('notification_email', ''); // Empty for free version
    formData.append('standard_vacation_days', 22); // Default

    if (logoFile) {
      console.log('📷 Logo selezionato:', logoFile.name, logoFile.size, 'bytes');
      formData.append('logo', logoFile);
    } else {
      console.log('📷 Nessun logo selezionato');
    }

    const res = await fetch('/api/company-settings', {
      method: 'POST',
      body: formData // Do not set Content-Type, the browser will do it automatically
    });

    console.log('📥 Response received, status:', res.status);

    const data = await res.json();
    console.log('📋 Response data:', data);

    if(data.success) {
      console.log('✅ Save successful!');
      companyMsg.textContent = data.message || '✅ Company settings saved successfully';
      companyMsg.style.color = 'green';

      // Aggiorna il preview del logo se caricato
      if (data.logo_path) {
        const currentLogoDiv = document.getElementById('currentLogo');
        currentLogoDiv.innerHTML = `
          <div style="margin-top: 10px;">
            <p style="margin: 5px 0; color: #59be83;">✅ Logo uploaded successfully!</p>
            <img src="${data.logo_path}" alt="Company logo" style="max-height: 80px; max-width: 200px; border: 1px solid rgba(255,255,255,0.2); border-radius: 8px;">
            <p style="font-size: 12px; color: #999; margin-top: 5px;">Company logo updated</p>
          </div>
        `;

        // Reset input file
        document.getElementById('companyLogo').value = '';
      }
    } else {
      console.log('❌ Save failed:', data.error);
      companyMsg.textContent = data.error || 'Error saving company settings';
      companyMsg.style.color = 'red';
    }

  } catch(err){
    console.error('❌ Catch error:', err);
    companyMsg.textContent = 'Connection error: ' + err.message;
    companyMsg.style.color = 'red';
  }
});

// Load company settings
async function loadCompanySettings() {
  const ruolo = sessionStorage.getItem('ruolo');
  console.log('🔍 Ruolo utente per company settings:', ruolo);

  // Solo admin può modificare le impostazioni azienda
  if (ruolo !== 'admin') {
    console.log('⚠️ Utente non admin, nascondo sezione company settings');
    const companySection = document.querySelector('#companyForm').parentElement;
    if (companySection) {
      companySection.style.display = 'none';
      console.log('✅ Company settings section hidden');
    }
    return;
  }

  console.log('✅ User is admin, loading company settings');

  try {
    const res = await fetch('/api/company-settings');
    const settings = await res.json();

    document.getElementById('companyName').value = settings.company_name || 'WKF Suite';

    // TODO: Handle logo display if implemented in the future
    const currentLogoDiv = document.getElementById('currentLogo');
    if (settings.logo_path) {
      currentLogoDiv.innerHTML = `<img src="${settings.logo_path}" alt="Company logo" style="max-height: 50px;">`;
    } else {
      currentLogoDiv.innerHTML = '<small style="color: #999;">No logo uploaded</small>';
    }

  } catch(err) {
    console.error('Error loading company settings:', err);
  }
}

// Load users
async function loadUsers(){
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
                onclick="removeUser('${u.id}', '${u.username}')">🗑️ Remove</button>` :
        '<span style="color: #999;">-</span>';

      tr.innerHTML = `<td>${u.id}</td><td>${u.username}</td><td>${u.ruolo}</td><td style="text-align: center;">${pulsanteReset}${pulsanteRimozione}</td>`;
      utentiTableBody.appendChild(tr);
    });

  } catch(err){
    console.error('Error loading users', err);
  }
}

// Toggle visibilità campi email
emailEnabled.addEventListener('change', () => {
  emailFields.style.display = emailEnabled.checked ? 'block' : 'none';
});

// Load email configuration
async function loadEmailConfig() {
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
      document.getElementById('fromName').value = config.from_name || 'Leave Management System';
    }
  } catch(err) {
    console.error('Error loading email configuration:', err);
  }
}

// Save email configuration
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
    from_name: enabled ? document.getElementById('fromName').value.trim() : 'Leave Management System'
  };

  // Validazione client-side
  if (enabled) {
    if (!formData.smtp_host || !formData.smtp_user || !formData.smtp_password || !formData.from_email) {
      emailMsg.textContent = 'All SMTP fields are required when enabled';
      emailMsg.style.color = 'red';
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.from_email)) {
      emailMsg.textContent = 'Invalid sender email';
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
      emailMsg.textContent = enabled ? 'Email configuration saved!' : 'Email disabled';
      emailMsg.style.color = 'green';
    } else {
      emailMsg.textContent = data.error || 'Error saving configuration';
      emailMsg.style.color = 'red';
    }
  } catch(err) {
    emailMsg.textContent = 'Connection error';
    emailMsg.style.color = 'red';
    console.error('Error saving email config:', err);
  }
});

// Test email
testEmailBtn.addEventListener('click', async () => {
  const testEmail = document.getElementById('testEmail').value.trim();

  if (!testEmail) {
    emailMsg.textContent = 'Enter an email for the test';
    emailMsg.style.color = 'red';
    return;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testEmail)) {
    emailMsg.textContent = 'Invalid email for test';
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
      emailMsg.textContent = 'Test email sent successfully!';
      emailMsg.style.color = 'green';
    } else {
      emailMsg.textContent = `Test error: ${data.error}`;
      emailMsg.style.color = 'red';
    }
  } catch(err) {
    emailMsg.textContent = 'Connection error during test';
    emailMsg.style.color = 'red';
    console.error('Email test error:', err);
  }

  testEmailBtn.disabled = false;
  testEmailBtn.textContent = 'Send Test';
});

// Function to remove a user
async function removeUser(userId, username) {
  if (!confirm(`Are you sure you want to remove user "${username}"?\n\nThis action is irreversible and will also delete all their leave requests.`)) {
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
      alert(`User "${username}" removed successfully`);

      // Ricarica la lista degli utenti
      loadUsers();
    } else {
      const error = await res.json();
      alert('Error: ' + (error.error || 'Unable to delete employee'));
    }
  } catch (err) {
    console.error('Error deleting employee:', err);
    alert('Connection error');
  }
}

// Function to reset a user's password
async function resetPassword(userId, username) {
  if (!confirm(`Reset password for "${username}"?\n\nA temporary password will be generated that the user must change on first login.`)) {
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
      alert(`✅ Password reset for "${username}"\n\n🔑 Temporary password: ${result.tempPassword}\n\n⚠️ IMPORTANT: Copy this password and give it to the user.\nThe user will have to change it on first login.\n\nThis password will not be shown again!`);
    } else {
      const error = await res.json();
      alert('Error: ' + (error.error || 'Unable to reset password'));
    }
  } catch (err) {
    console.error('Error resetting password:', err);
    alert('Connection error');
  }
}

// Preview del logo in tempo reale
document.getElementById('companyLogo').addEventListener('change', function(e) {
  const file = e.target.files[0];
  const currentLogoDiv = document.getElementById('currentLogo');

  if (file) {
    // Verifica che sia un'immagine
    if (!file.type.startsWith('image/')) {
      currentLogoDiv.innerHTML = '<small style="color: #e74c3c;">⚠️ Please select a valid image file</small>';
      return;
    }

    // Verifica dimensione (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      currentLogoDiv.innerHTML = '<small style="color: #e74c3c;">⚠️ File too large. Maximum 5MB</small>';
      return;
    }

    // Crea preview
    const reader = new FileReader();
    reader.onload = function(e) {
      currentLogoDiv.innerHTML = `
        <div style="margin-top: 10px;">
          <p style="margin: 5px 0; color: #59be83;">✅ New logo selected:</p>
          <img src="${e.target.result}" alt="Preview logo" style="max-height: 80px; max-width: 200px; border: 1px solid rgba(255,255,255,0.2); border-radius: 8px;">
          <p style="font-size: 12px; color: #999; margin-top: 5px;">File: ${file.name} (${(file.size / 1024).toFixed(1)} KB)</p>
        </div>
      `;
    };
    reader.readAsDataURL(file);
  } else {
    // Ricarica logo attuale se disponibile
    loadCompanySettings();
  }
});

// ========================================
// FUNZIONI GESTIONE DATABASE
// ========================================

// Apri percorso database in Esplora File
async function findDatabase() {
  const dbMsg = document.getElementById('dbMsg');
  dbMsg.textContent = '⏳ Opening database path...';
  dbMsg.style.color = '#3498db';

  try {
    const res = await fetch('/api/database/location');
    const data = await res.json();

    if (res.ok) {
      dbMsg.innerHTML = `
        ✅ <strong>Database found:</strong><br>
        📂 <code style="background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 3px;">${data.path}</code><br>
        <small style="color: #999;">The folder will be opened in File Explorer</small>
      `;
      dbMsg.style.color = '#27ae60';

      // Apri la cartella (funziona solo su Electron o desktop app)
      if (data.opened) {
        setTimeout(() => {
          dbMsg.innerHTML += '<br><small style="color: #3498db;">✅ Folder opened in File Explorer</small>';
        }, 500);
      }
    } else {
      dbMsg.textContent = '❌ ' + (data.error || 'Error finding database');
      dbMsg.style.color = '#e74c3c';
    }
  } catch(err) {
    dbMsg.textContent = '❌ Connection error';
    dbMsg.style.color = '#e74c3c';
    console.error('Error:', err);
  }
}

// Mostra informazioni database
async function databaseInfo() {
  const dbMsg = document.getElementById('dbMsg');
  const dbInfo = document.getElementById('dbInfo');
  const dbInfoContent = document.getElementById('dbInfoContent');

  dbMsg.textContent = '⏳ Loading database information...';
  dbMsg.style.color = '#3498db';

  try {
    const res = await fetch('/api/database/info');
    const data = await res.json();

    if (res.ok) {
      dbInfoContent.textContent = `📊 Informazioni Database SQLite
📂 Path: ${data.path}
📏 Size: ${data.size}
📅 Last modified: ${data.lastModified}

📋 Tables and Records:
${data.tables.map(t => `  • ${t.name}: ${t.count} records`).join('\n')}

 Available disk space: ${data.diskSpace || 'N/A'}`;

      dbInfo.style.display = 'block';
      dbMsg.textContent = '✅ Database information loaded';
      dbMsg.style.color = '#27ae60';
    } else {
      dbMsg.textContent = '❌ ' + (data.error || 'Error retrieving information');
      dbMsg.style.color = '#e74c3c';
      dbInfo.style.display = 'none';
    }
  } catch(err) {
    dbMsg.textContent = '❌ Connection error';
    dbMsg.style.color = '#e74c3c';
    dbInfo.style.display = 'none';
    console.error('Error:', err);
  }
}

// Crea backup database
async function createDatabaseBackup() {
  const dbMsg = document.getElementById('dbMsg');

  if (!confirm('Create a database backup?\n\nThe backup will be saved in the data/backups/ folder.')) {
    return;
  }

  dbMsg.textContent = '⏳ Creating backup...';
  dbMsg.style.color = '#3498db';

  try {
    const res = await fetch('/api/database/backup', { method: 'POST' });
    const data = await res.json();

    if (res.ok) {
      dbMsg.innerHTML = `
        ✅ <strong>Backup created successfully!</strong><br>
        📂 <code style="background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 3px;">${data.backupPath}</code><br>
        💾 Size: ${data.size}
      `;
      dbMsg.style.color = '#27ae60';
    } else {
      dbMsg.textContent = '❌ ' + (data.error || 'Error creating backup');
      dbMsg.style.color = '#e74c3c';
    }
  } catch(err) {
    dbMsg.textContent = '❌ Connection error';
    dbMsg.style.color = '#e74c3c';
    console.error('Error:', err);
  }
}

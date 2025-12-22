document.addEventListener("DOMContentLoaded", async () => {
  try {
    // Verifica sessione utente
    const sessionRes = await fetch("/api/session", {
      credentials: "same-origin"
    });
    const sessionData = await sessionRes.json();

    if (!sessionData.user) {
      window.location.href = "login.html";
      return;
    }

    const { username, matricola } = sessionData.user;

    // Show user information
    document.getElementById("usernameDisplay").textContent = username;
    document.getElementById("matricolaDisplay").textContent = matricola;

    // Load employee requests
    caricaRichieste();

    // Start timeout timer for employees (5 minutes)
    startSessionTimer();

  } catch (err) {
    console.error("Error loading dashboard:", err);
    window.location.href = "login.html";
  }
});

// Function to show/hide fields based on leave type
function togglePermesso() {
  const tipo = document.getElementById("tipo").value;
  document.querySelectorAll('.permesso-box').forEach(div => div.style.display = "none");

  if (tipo === "giornaliero") {
    document.getElementById("giornaliero").style.display = "block";
  } else if (tipo === "piu_giorni") {
    document.getElementById("piu_giorni").style.display = "block";
  } else if (tipo === "ore") {
    document.getElementById("ore").style.display = "block";
  }
}

// Handle leave form submission
document.getElementById("permessoForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const tipo = document.getElementById("tipo").value;
  const note = document.getElementById("note").value.trim();
  const msg = document.getElementById("permessoMsg");

  function showMsg(text, color = "red") {
    msg.textContent = text;
    msg.style.color = color;
  }

  // Validazione
  if (!tipo) {
    showMsg("Seleziona il tipo di permesso");
    return;
  }

  // Ottieni la tipologia selezionata
  const tipologia = document.querySelector('input[name="tipologia"]:checked')?.value || 'retribuito';

  const payload = { tipo, note, tipologia };

  if (tipo === "giornaliero") {
    const data = document.getElementById("dataGiorno").value;
    if (!data) {
      showMsg("Enter the leave date");
      return;
    }
    payload.data = data;
  } else if (tipo === "piu_giorni") {
    const dal = document.getElementById("dataDal").value;
    const al = document.getElementById("dataAl").value;
    if (!dal || !al) {
      showMsg("Enter date range from/to");
      return;
    }
    payload.dal = dal;
    payload.al = al;
  } else if (tipo === "ore") {
    const data = document.getElementById("dataHours").value;
    const oraInizio = document.getElementById("oraInizio").value;
    const oraFine = document.getElementById("oraFine").value;
    if (!data || !oraInizio || !oraFine) {
      showMsg("Enter date and times for hourly leave");
      return;
    }
    payload.data = data;
    payload.oraInizio = oraInizio;
    payload.oraFine = oraFine;
  }

  try {
    const res = await fetch("/api/richieste", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      credentials: "same-origin"
    });

    const result = await res.json();
    if (res.ok) {
      showMsg("Request submitted successfully!", "green");
      document.getElementById("permessoForm").reset();
      document.querySelectorAll('.permesso-box').forEach(div => div.style.display = "none");
      caricaRichieste(); // Ricarica la lista
    } else {
      showMsg(result.error || "Error submitting request");
    }
  } catch (err) {
    console.error(err);
    showMsg("Server connection error");
  }
});

// Load and display employee requests
async function caricaRichieste() {
  const container = document.getElementById("richiesteContainer");
  
  try {
    const res = await fetch("/api/richieste/mie", { credentials: "same-origin" });
    const richieste = await res.json();

    container.innerHTML = "";

    if (!Array.isArray(richieste) || richieste.length === 0) {
      container.innerHTML = "<p class='notice'>No requests found.</p>";
      return;
    }

    richieste.forEach(r => {
      const div = document.createElement("div");
      div.classList.add("card");
      div.style.marginBottom = "10px";
      div.style.padding = "15px";

      const statoClass = r.stato === 'approvata' ? 'ok' : (r.stato === 'rifiutata' ? 'no' : 'pending');
      const dataDisplay = r.data || (r.dal && r.al ? `${r.dal} - ${r.al}` : "-");
      const oreDisplay = r.oraInizio && r.oraFine ? `${r.oraInizio} - ${r.oraFine}` : "-";

      // Determina la tipologia dall'object r
      let tipologiaDisplay = "Retribuito"; // Default
      if (r.daRecuperare) tipologiaDisplay = "⏰ Da Recuperare";
      else if (r.nonRetribuito) tipologiaDisplay = "❌ Non Retribuito";
      else if (r.permessoSindacale) tipologiaDisplay = "🏛️ Permesso Sindacale";
      else if (r.inCFerie) tipologiaDisplay = "🏖️ C/Ferie";
      else if (r.retribuito) tipologiaDisplay = "💰 Retribuito";

      div.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: start;">
          <div>
            <strong>Tipo:</strong> ${r.tipo}<br>
            <strong>Date:</strong> ${dataDisplay}<br>
            <strong>Hours:</strong> ${oreDisplay}<br>
            <strong>Tipologia:</strong> ${tipologiaDisplay}<br>
            <strong>Note:</strong> ${r.note || "-"}<br>
            <strong>Stato:</strong> <span class="status ${statoClass}">${r.stato || "in attesa"}</span>
          </div>
          <div class="actions">
            <button class="btn secondary" onclick="scaricaPDF('${r.id}')">PDF</button>
          </div>
        </div>
      `;

      container.appendChild(div);
    });

  } catch (err) {
    console.error(err);
    container.innerHTML = "<p class='notice' style='color: red;'>Error loading requests</p>";
  }
}

// Function to download PDF
function scaricaPDF(richiestaId) {
  window.open(`/api/richieste/${richiestaId}/pdf`, '_blank');
}

// Handle logout
document.getElementById('logoutBtn').addEventListener('click', async () => {
  try {
    const res = await fetch('/api/logout', {
      method: 'POST',
      credentials: 'same-origin'
    });
    
    if (res.ok) {
      sessionStorage.clear();
      window.location.href = 'index.html';
    } else {
      alert('Error during logout');
    }
  } catch (err) {
    console.error('Logout error:', err);
    alert('Connection error during logout');
  }
});

// Handle employee session timeout (5 minutes)
function startSessionTimer() {
  const TIMEOUT_MINUTES = 5;
  const WARNING_MINUTES = 4; // Warning at 4 minutes (1 minute before expiry)
  const TIMEOUT_MS = TIMEOUT_MINUTES * 60 * 1000;
  const WARNING_MS = WARNING_MINUTES * 60 * 1000;

  console.log(`🕐 Employee session timer started: ${TIMEOUT_MINUTES} minutes`);

  // Warning timer (1 minute before expiry)
  setTimeout(() => {
    if (document.visibilityState !== 'hidden') {
      showTimeoutWarning();
    }
  }, WARNING_MS);

  // Final timeout timer
  setTimeout(() => {
    console.log('🕐 Employee session expired after 5 minutes - redirecting to login');
    sessionStorage.clear();
    alert('Your session has expired. Employees can only stay connected for 5 minutes.');
    window.location.href = 'login.html?timeout=dipendente';
  }, TIMEOUT_MS);
}

// Show imminent timeout warning
function showTimeoutWarning() {
  const warningDiv = document.createElement('div');
  warningDiv.id = 'timeout-warning';
  warningDiv.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #f39c12;
    color: white;
    padding: 15px;
    border-radius: 8px;
    z-index: 1000;
    box-shadow: 0 4px 8px rgba(0,0,0,0.2);
    max-width: 300px;
    font-weight: bold;
  `;
  warningDiv.innerHTML = `
    <div style="margin-bottom: 10px;">⚠️ Session expiring!</div>
    <div style="font-size: 14px; font-weight: normal;">
      Session will expire in 1 minute. Save your work.
    </div>
  `;

  document.body.appendChild(warningDiv);

  // Remove the warning after 30 seconds
  setTimeout(() => {
    if (document.getElementById('timeout-warning')) {
      document.getElementById('timeout-warning').remove();
    }
  }, 30000);
}


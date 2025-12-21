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

    // Mostra informazioni utente
    document.getElementById("usernameDisplay").textContent = username;
    document.getElementById("matricolaDisplay").textContent = matricola;

    // Carica le richieste del dipendente
    caricaRichieste();

    // Avvia il timer di timeout per dipendenti (5 minuti)
    startSessionTimer();

  } catch (err) {
    console.error("Errore caricamento dashboard:", err);
    window.location.href = "login.html";
  }
});

// Funzione per mostrare/nascondere campi in base al tipo permesso
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

// Gestione invio form permesso
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
      showMsg("Inserisci la data del permesso");
      return;
    }
    payload.data = data;
  } else if (tipo === "piu_giorni") {
    const dal = document.getElementById("dataDal").value;
    const al = document.getElementById("dataAl").value;
    if (!dal || !al) {
      showMsg("Inserisci l'intervallo dal/al");
      return;
    }
    payload.dal = dal;
    payload.al = al;
  } else if (tipo === "ore") {
    const data = document.getElementById("dataOre").value;
    const oraInizio = document.getElementById("oraInizio").value;
    const oraFine = document.getElementById("oraFine").value;
    if (!data || !oraInizio || !oraFine) {
      showMsg("Inserisci data e orari per il permesso a ore");
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
      showMsg("Richiesta inviata correttamente!", "green");
      document.getElementById("permessoForm").reset();
      document.querySelectorAll('.permesso-box').forEach(div => div.style.display = "none");
      caricaRichieste(); // Ricarica la lista
    } else {
      showMsg(result.error || "Errore invio richiesta");
    }
  } catch (err) {
    console.error(err);
    showMsg("Errore connessione server");
  }
});

// Carica e mostra le richieste del dipendente
async function caricaRichieste() {
  const container = document.getElementById("richiesteContainer");
  
  try {
    const res = await fetch("/api/richieste/mie", { credentials: "same-origin" });
    const richieste = await res.json();

    container.innerHTML = "";

    if (!Array.isArray(richieste) || richieste.length === 0) {
      container.innerHTML = "<p class='notice'>Nessuna richiesta presente.</p>";
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
            <strong>Data:</strong> ${dataDisplay}<br>
            <strong>Ore:</strong> ${oreDisplay}<br>
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
    container.innerHTML = "<p class='notice' style='color: red;'>Errore caricamento richieste</p>";
  }
}

// Funzione per scaricare PDF
function scaricaPDF(richiestaId) {
  window.open(`/api/richieste/${richiestaId}/pdf`, '_blank');
}

// Gestione logout
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
      alert('Errore durante il logout');
    }
  } catch (err) {
    console.error('Errore logout:', err);
    alert('Errore di connessione durante il logout');
  }
});

// Gestione timeout sessione per dipendenti (5 minuti)
function startSessionTimer() {
  const TIMEOUT_MINUTES = 5;
  const WARNING_MINUTES = 4; // Avviso a 4 minuti (1 minuto prima della scadenza)
  const TIMEOUT_MS = TIMEOUT_MINUTES * 60 * 1000;
  const WARNING_MS = WARNING_MINUTES * 60 * 1000;

  console.log(`🕐 Timer sessione dipendente avviato: ${TIMEOUT_MINUTES} minuti`);

  // Timer di avviso (1 minuto prima della scadenza)
  setTimeout(() => {
    if (document.visibilityState !== 'hidden') {
      showTimeoutWarning();
    }
  }, WARNING_MS);

  // Timer di timeout finale
  setTimeout(() => {
    console.log('🕐 Sessione dipendente scaduta dopo 5 minuti - reindirizzamento al login');
    sessionStorage.clear();
    alert('La tua sessione è scaduta. I dipendenti possono rimanere connessi solo per 5 minuti.');
    window.location.href = 'login.html?timeout=dipendente';
  }, TIMEOUT_MS);
}

// Mostra avviso di timeout imminente
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
    <div style="margin-bottom: 10px;">⚠️ Sessione in scadenza!</div>
    <div style="font-size: 14px; font-weight: normal;">
      La sessione scadrà tra 1 minuto. Salva il tuo lavoro.
    </div>
  `;

  document.body.appendChild(warningDiv);

  // Rimuovi l'avviso dopo 30 secondi
  setTimeout(() => {
    if (document.getElementById('timeout-warning')) {
      document.getElementById('timeout-warning').remove();
    }
  }, 30000);
}


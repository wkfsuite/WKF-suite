// public/script.js
const form = document.getElementById('permessoForm');
const tipoSelect = document.getElementById('tipoSelect');
const oreWrap = document.getElementById('oreWrap');
const dalWrap = document.getElementById('dalWrap');
const alWrap = document.getElementById('alWrap');
const msg = document.getElementById('msg');

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

// Invio form
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

// Invio form
document.getElementById('permessoForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const tipo = document.getElementById('tipo').value;
  const note = document.getElementById('note').value.trim();
  const matricola = sessionStorage.getItem('matricola');

  // Validation
  if (!tipo) {
    alert("Seleziona il tipo di permesso");
    return;
  }

  const richiesta = { tipo, note, matricola };

  if (tipo === "giornaliero") {
    const data = document.getElementById('dataGiorno').value;
    if (!data) {
      alert("Inserisci la data del permesso");
      return;
    }
    richiesta.data = data;
  } else if (tipo === "piu_giorni") {
    const dataDal = document.getElementById('dataDal').value;
    const dataAl = document.getElementById('dataAl').value;
    if (!dataDal || !dataAl) {
      alert("Inserisci l'intervallo dal/al");
      return;
    }
    richiesta.dataDal = dataDal;
    richiesta.dataAl = dataAl;
  } else if (tipo === "ore") {
    const data = document.getElementById('dataOre').value;
    const oraInizio = document.getElementById('oraInizio').value;
    const oraFine = document.getElementById('oraFine').value;
    if (!data || !oraInizio || !oraFine) {
      alert("Inserisci data e orari per il permesso a ore");
      return;
    }
    richiesta.data = data;
    richiesta.oraInizio = oraInizio;
    richiesta.oraFine = oraFine;
  }

  try {
    const res = await fetch('/api/richieste', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(richiesta)
    });

    if (res.ok) {
      alert("Richiesta inviata con successo!");
      e.target.reset();
      document.querySelectorAll('.permesso-box').forEach(div => div.style.display = "none");
    } else {
      const err = await res.json();
      alert("Errore: " + (err.error || "Impossibile inviare richiesta"));
    }
  } catch (error) {
    console.error("Errore fetch:", error);
    alert("Errore di connessione al server");
  }
});




const btnCaricaMie = document.getElementById('btnCaricaMie');
const matricolaLookup = document.getElementById('matricolaLookup');
const mieTableBody = document.querySelector('#mieTable tbody');

async function caricaMie() {
  const m = (matricolaLookup.value || '').trim();
  if (!m) return;
  const res = await fetch(`/api/richieste/mie?matricola=${encodeURIComponent(m)}`);
  const data = await res.json();
  mieTableBody.innerHTML = '';
  (data || []).forEach(r => {
    const tr = document.createElement('tr');
    const statoClass = r.stato === 'approvata' ? 'ok' : (r.stato === 'rifiutata' ? 'no' : 'pending');
    tr.innerHTML = `
      <td>${new Date(r.createdAt).toLocaleString()}</td>
      <td>${r.tipo}</td>
      <td>${r.dal || '-'}</td>
      <td>${r.al || '-'}</td>
      <td>${r.ore || '-'}</td>
      <td><span class="status ${statoClass}">${r.stato}</span></td>
      <td><a class="btn secondary" href="/stampa/${r.id}" target="_blank">Stampa</a></td>
    `;
    mieTableBody.appendChild(tr);
  });
}
if (btnCaricaMie) btnCaricaMie.addEventListener('click', caricaMie);

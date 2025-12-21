document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("permessoForm");
  const msg = document.getElementById("permessoMsg");
  const richiesteContainer = document.getElementById("richiesteContainer");
  const matricola = sessionStorage.getItem('matricola');

  if (!form || !msg || !richiesteContainer) return;

  function showMsg(text, color="red"){
    msg.textContent = text;
    msg.style.color = color;
  }

  // Invia nuovo permesso
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const tipo = form.tipo.value;
    const dal = form.dal.value || null;
    const al = form.al.value || null;
    const data = form.data.value || null;
    const oraInizio = form.oraInizio.value || null;
    const oraFine = form.oraFine.value || null;
    const dataInserimento = form.dataInserimento.value || null;
    const note = form.note.value || '';

    // Checkbox values
    const retribuito = form.retribuito.checked;
    const daRecuperare = form.daRecuperare.checked;
    const nonRetribuito = form.nonRetribuito.checked;
    const permessoSindacale = form.permessoSindacale.checked;
    const inCFerie = form.inCFerie.checked;

    if (!tipo) return showMsg("Seleziona il tipo di permesso");
    if (tipo === 'piu_giorni' && (!dal || !al)) return showMsg("Inserisci intervallo dal/al");
    if (tipo === 'giornaliero' && !data) return showMsg("Inserisci la data del permesso");
    if (tipo === 'ore' && (!data || !oraInizio || !oraFine)) return showMsg("Inserisci data e orari per il permesso a ore");

    const payload = { tipo, dal, al, data, dataInserimento, oraInizio, oraFine, note, matricola, retribuito, daRecuperare, nonRetribuito, permessoSindacale, inCFerie };

    try {
      const res = await fetch("/api/richieste", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const dataRes = await res.json();
      if (res.ok) {
        toastManager.permessoInviato(tipo);
        form.reset();
        caricaMie();
      } else {
        showError(dataRes.error || "Errore invio richiesta");
      }
    } catch(err) {
      console.error(err);
      showMsg("Errore connessione server");
    }
  });

  // Carica richieste del dipendente
  async function caricaMie() {
    try {
      const res = await fetch("/api/richieste");
      let richieste = await res.json();
      if (!Array.isArray(richieste)) richieste = [richieste];

      // Filtra solo le richieste dell'utente
      richieste = richieste.filter(r => r.matricola === matricola);

      richiesteContainer.innerHTML = "";
      if (richieste.length === 0) {
        richiesteContainer.textContent = "Nessuna richiesta presente.";
        return;
      }

      richieste.forEach(r => {
        const div = document.createElement("div");
        div.classList.add("richiesta");

        div.innerHTML = `
          Tipo: ${r.tipo}<br>
          Data: ${r.data || (r.dal + " - " + r.al) || "-"}<br>
          Ore: ${r.oraInizio || "-"} - ${r.oraFine || "-"}<br>
          Note: ${r.note || "-"}<br>
          Stato: ${r.stato || "in attesa"}<br>
          <button onclick="generaPDFAsync(${JSON.stringify(r).replace(/"/g,'&quot;')})">PDF</button>
        `;

        richiesteContainer.appendChild(div);
      });
    } catch(err) {
      console.error(err);
      showMsg("Errore caricamento richieste");
    }
  }

  caricaMie();
});

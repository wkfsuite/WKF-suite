// report_simple.js - Report semplice con paginazione
let datiReport = [];
let paginaCorrente = 1;
const elementiPerPagina = 10;

document.addEventListener('DOMContentLoaded', () => {
  inizializzaFiltri();
  caricaDatiReport();
});

function inizializzaFiltri() {
  const oggi = new Date();
  const unMeseFa = new Date(oggi.getFullYear(), oggi.getMonth() - 1, oggi.getDate());
  
  document.getElementById('filtroDataDal').value = unMeseFa.toISOString().split('T')[0];
  document.getElementById('filtroDataAl').value = oggi.toISOString().split('T')[0];
  
  caricaDipendenti();
}

async function caricaDipendenti() {
  try {
    const response = await fetch('/api/utenti/dipendenti');
    if (response.ok) {
      const dipendenti = await response.json();
      const select = document.getElementById('filtroDipendente');
      
      dipendenti.forEach(dip => {
        const option = document.createElement('option');
        option.value = dip.matricola;
        option.textContent = `${dip.username} (${dip.matricola})`;
        select.appendChild(option);
      });
    }
  } catch (error) {
    console.error('Errore caricamento dipendenti:', error);
  }
}

async function caricaDatiReport() {
  try {
    const filtri = {
      dataInizio: document.getElementById('filtroDataDal').value,
      dataFine: document.getElementById('filtroDataAl').value,
      matricola: document.getElementById('filtroDipendente').value
    };

    const params = new URLSearchParams();
    if (filtri.dataInizio) params.append('dataInizio', filtri.dataInizio);
    if (filtri.dataFine) params.append('dataFine', filtri.dataFine);
    if (filtri.matricola) params.append('matricola', filtri.matricola);

    const response = await fetch(`/api/report/permessi?${params}`);
    
    if (!response.ok) {
      throw new Error('Errore caricamento dati report');
    }

    const data = await response.json();
    datiReport = data.richieste || [];
    
    aggiornaStatistiche(data.statistiche);
    paginaCorrente = 1; // Reset alla prima pagina
    aggiornaTabellaConPaginazione();
    
    toastManager.success('Report caricato con successo');
    
  } catch (error) {
    console.error('Errore caricamento report:', error);
    toastManager.error('Errore nel caricamento del report');
  }
}

function aggiornaStatistiche(stats) {
  document.getElementById('totaleRichieste').textContent = stats.totale || 0;
  document.getElementById('richiesteApprovate').textContent = stats.approvate || 0;
  document.getElementById('richiesteRifiutate').textContent = stats.rifiutate || 0;
  document.getElementById('richiesteInAttesa').textContent = stats.inAttesa || 0;
}

function aggiornaTabellaConPaginazione() {
  const tbody = document.querySelector('#tabellaDettaglio tbody');
  tbody.innerHTML = '';
  
  // Calcola elementi per la pagina corrente
  const inizioIndice = (paginaCorrente - 1) * elementiPerPagina;
  const fineIndice = inizioIndice + elementiPerPagina;
  const elementiPagina = datiReport.slice(inizioIndice, fineIndice);
  
  // Popola tabella
  elementiPagina.forEach(r => {
    const row = document.createElement('tr');
    
    const dataDisplay = r.data || (r.dal && r.al ? `${r.dal} - ${r.al}` : '-');
    const statoClass = r.stato === 'approvata' ? 'status ok' : 
                      r.stato === 'rifiutata' ? 'status no' : 'status pending';

    row.innerHTML = `
      <td>${new Date(r.createdAt).toLocaleDateString('it-IT')}</td>
      <td>${r.nome} ${r.cognome} (${r.matricola})</td>
      <td>${r.tipo}</td>
      <td>${dataDisplay}</td>
      <td><span class="${statoClass}">${r.stato}</span></td>
      <td>${r.note || '-'}</td>
    `;
    
    tbody.appendChild(row);
  });
  
  // Aggiorna controlli paginazione
  aggiornaPaginazione();
}

function aggiornaPaginazione() {
  const totalePagine = Math.ceil(datiReport.length / elementiPerPagina);
  const containerPaginazione = document.getElementById('paginazione');
  
  if (!containerPaginazione) {
    // Crea container paginazione se non esiste
    const container = document.createElement('div');
    container.id = 'paginazione';
    container.className = 'pagination';
    container.style.textAlign = 'center';
    container.style.marginTop = '20px';
    
    const table = document.getElementById('tabellaDettaglio');
    table.parentNode.insertBefore(container, table.nextSibling);
  }
  
  let paginazioneHTML = `
    <div class="pagination-info">
      Pagina ${paginaCorrente} di ${totalePagine} - 
      Elementi ${(paginaCorrente - 1) * elementiPerPagina + 1}-${Math.min(paginaCorrente * elementiPerPagina, datiReport.length)} 
      di ${datiReport.length}
    </div>
    <div class="pagination-controls" style="margin-top: 10px;">
  `;
  
  // Pulsante Prima Pagina
  if (paginaCorrente > 1) {
    paginazioneHTML += `<button class="btn secondary" onclick="vaiAPagina(1)">⏮️ Prima</button>`;
    paginazioneHTML += `<button class="btn secondary" onclick="vaiAPagina(${paginaCorrente - 1})">⬅️ Precedente</button>`;
  }
  
  // Numeri pagina (mostra max 5 pagine intorno a quella corrente)
  const inizioPagine = Math.max(1, paginaCorrente - 2);
  const finePagine = Math.min(totalePagine, paginaCorrente + 2);
  
  for (let i = inizioPagine; i <= finePagine; i++) {
    const classe = i === paginaCorrente ? 'btn' : 'btn secondary';
    paginazioneHTML += `<button class="${classe}" onclick="vaiAPagina(${i})">${i}</button>`;
  }
  
  // Pulsante Ultima Pagina
  if (paginaCorrente < totalePagine) {
    paginazioneHTML += `<button class="btn secondary" onclick="vaiAPagina(${paginaCorrente + 1})">Successiva ➡️</button>`;
    paginazioneHTML += `<button class="btn secondary" onclick="vaiAPagina(${totalePagine})">Ultima ⏭️</button>`;
  }
  
  paginazioneHTML += '</div>';
  
  document.getElementById('paginazione').innerHTML = paginazioneHTML;
}

function vaiAPagina(numeroPagina) {
  const totalePagine = Math.ceil(datiReport.length / elementiPerPagina);
  
  if (numeroPagina >= 1 && numeroPagina <= totalePagine) {
    paginaCorrente = numeroPagina;
    aggiornaTabellaConPaginazione();
  }
}

function aggiornaReport() {
  console.log('Aggiornamento report...');
  caricaDatiReport();
}

async function generatePDF() {
  try {
    toastManager.info('Preparazione PDF in corso...');
    
    if (datiReport.length === 0) {
      toastManager.warning('Nessun dato da esportare. Carica prima i dati del report.');
      return;
    }
    
    console.log('Inizio generazione PDF con', datiReport.length, 'elementi');
    
    const dataGenerazione = new Date().toLocaleDateString('it-IT');
    
    let htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Report Permessi - ${dataGenerazione}</title>
  <style>
    body { 
      font-family: Arial, sans-serif; 
      margin: 20px; 
      color: #333;
    }
    h1 { 
      text-align: center; 
      color: #333; 
      margin-bottom: 10px;
    }
    .subtitle { 
      text-align: center; 
      color: #666; 
      margin-bottom: 30px;
    }
    .stats { 
      display: flex; 
      justify-content: space-around; 
      margin: 30px 0; 
      background: #f8f9fa; 
      padding: 20px; 
      border-radius: 8px; 
      border: 2px solid #ddd;
    }
    .stat { text-align: center; }
    .stat h3 { margin: 0; color: #333; font-size: 14px; }
    .stat p { font-size: 24px; font-weight: bold; margin: 5px 0; }
    .success { color: #27ae60; }
    .error { color: #e74c3c; }
    .warning { color: #f39c12; }
    .primary { color: #3498db; }
    table { 
      width: 100%; 
      border-collapse: collapse; 
      margin: 20px 0; 
      font-size: 12px;
    }
    th, td { 
      padding: 8px 6px; 
      border: 1px solid #ddd; 
      text-align: left; 
      vertical-align: top;
    }
    th { 
      background: #3498db; 
      color: white; 
      font-weight: bold;
    }
    .status-ok { color: #27ae60; font-weight: bold; }
    .status-error { color: #e74c3c; font-weight: bold; }
    .status-warning { color: #f39c12; font-weight: bold; }
    .footer { 
      margin-top: 30px; 
      text-align: center; 
      color: #666; 
      font-size: 10px;
      border-top: 1px solid #ddd;
      padding-top: 10px;
    }
    @media print { 
      .page-break { page-break-before: always; }
      body { margin: 10px; }
    }
  </style>
</head>
<body>
  <h1>REPORT PERMESSI DIPENDENTI</h1>
  <p class="subtitle">Generato il ${dataGenerazione}</p>
  
  <div class="stats">
    <div class="stat">
      <h3>Totale Richieste</h3>
      <p class="primary">${document.getElementById('totaleRichieste').textContent}</p>
    </div>
    <div class="stat">
      <h3>Approvate</h3>
      <p class="success">${document.getElementById('richiesteApprovate').textContent}</p>
    </div>
    <div class="stat">
      <h3>Rifiutate</h3>
      <p class="error">${document.getElementById('richiesteRifiutate').textContent}</p>
    </div>
    <div class="stat">
      <h3>In Attesa</h3>
      <p class="warning">${document.getElementById('richiesteInAttesa').textContent}</p>
    </div>
  </div>
  
  <table>
    <thead>
      <tr>
        <th>Data</th>
        <th>Dipendente</th>
        <th>Tipo</th>
        <th>Periodo</th>
        <th>Stato</th>
        <th>Note</th>
      </tr>
    </thead>
    <tbody>`;
    
    // Aggiungi tutte le righe
    datiReport.forEach((r, index) => {
      const dataDisplay = r.data || (r.dal && r.al ? `${r.dal} - ${r.al}` : '-');
      const statoClass = r.stato === 'approvata' ? 'status-ok' : 
                        r.stato === 'rifiutata' ? 'status-error' : 'status-warning';
      
      // Interruzione pagina ogni 20 elementi
      const pageBreak = (index > 0 && index % 20 === 0) ? 'class="page-break"' : '';
      
      htmlContent += `
      <tr ${pageBreak}>
        <td>${new Date(r.createdAt).toLocaleDateString('it-IT')}</td>
        <td>${r.nome} ${r.cognome}<br><small>(${r.matricola})</small></td>
        <td>${r.tipo}</td>
        <td>${dataDisplay}</td>
        <td><span class="${statoClass}">${r.stato.toUpperCase()}</span></td>
        <td>${(r.note || '-').substring(0, 50)}${r.note && r.note.length > 50 ? '...' : ''}</td>
      </tr>`;
    });
    
    htmlContent += `
    </tbody>
  </table>
  
  <div class="footer">
    Report generato automaticamente dal Sistema Gestione Permessi - ${new Date().toLocaleString('it-IT')}
  </div>
  
  <script>
    // Auto-stampa quando la pagina è caricata
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 500);
    }
  </script>
</body>
</html>`;

    console.log('HTML generato, apertura finestra...');
    
    // Prova diverse strategie per aprire la finestra
    let nuovaFinestra;
    
    try {
      // Strategia 1: window.open normale
      nuovaFinestra = window.open('', '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes');
      
      if (!nuovaFinestra) {
        throw new Error('Popup bloccato');
      }
      
      nuovaFinestra.document.write(htmlContent);
      nuovaFinestra.document.close();
      
      toastManager.success('PDF aperto in nuova finestra. La stampa si avvierà automaticamente.');
      
    } catch (error) {
      console.log('Popup bloccato, uso strategia alternativa:', error);
      
      // Strategia 2: Crea blob e download
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `report-permessi-${new Date().toISOString().split('T')[0]}.html`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
      
      toastManager.success('Report scaricato come file HTML. Aprilo e usa Ctrl+P per stampare.');
    }
    
  } catch (error) {
    console.error('Errore completo generazione PDF:', error);
    toastManager.error('Errore nella generazione del PDF: ' + error.message);
  }
}

// Funzione alternativa per stampa diretta della pagina corrente
function stampaDirectly() {
  try {
    if (datiReport.length === 0) {
      toastManager.warning('Nessun dato da stampare. Carica prima i dati del report.');
      return;
    }
    
    // Nasconde elementi non necessari per la stampa
    const elementiDaNascondere = document.querySelectorAll('.header, .card h3, #paginazione, .actions');
    const stiliOriginali = [];
    
    elementiDaNascondere.forEach((el, index) => {
      stiliOriginali[index] = el.style.display;
      el.style.display = 'none';
    });
    
    // Mostra tutti i dati nella tabella (rimuove paginazione)
    const tbody = document.querySelector('#tabellaDettaglio tbody');
    tbody.innerHTML = '';
    
    datiReport.forEach(r => {
      const row = document.createElement('tr');
      const dataDisplay = r.data || (r.dal && r.al ? `${r.dal} - ${r.al}` : '-');
      const statoClass = r.stato === 'approvata' ? 'status ok' : 
                        r.stato === 'rifiutata' ? 'status no' : 'status pending';

      row.innerHTML = `
        <td>${new Date(r.createdAt).toLocaleDateString('it-IT')}</td>
        <td>${r.nome} ${r.cognome} (${r.matricola})</td>
        <td>${r.tipo}</td>
        <td>${dataDisplay}</td>
        <td><span class="${statoClass}">${r.stato}</span></td>
        <td>${r.note || '-'}</td>
      `;
      
      tbody.appendChild(row);
    });
    
    // Aggiungi titolo per la stampa
    const titolo = document.createElement('h1');
    titolo.innerHTML = 'REPORT PERMESSI DIPENDENTI - ' + new Date().toLocaleDateString('it-IT');
    titolo.style.textAlign = 'center';
    titolo.style.marginBottom = '20px';
    document.body.insertBefore(titolo, document.body.firstChild);
    
    // Avvia stampa
    window.print();
    
    // Ripristina la pagina dopo la stampa
    setTimeout(() => {
      document.body.removeChild(titolo);
      elementiDaNascondere.forEach((el, index) => {
        el.style.display = stiliOriginali[index];
      });
      aggiornaTabellaConPaginazione(); // Ripristina paginazione
    }, 1000);
    
    toastManager.info('Finestra di stampa aperta. Seleziona "Salva come PDF" per creare un file PDF.');
    
  } catch (error) {
    console.error('Errore stampa diretta:', error);
    toastManager.error('Errore nella stampa diretta: ' + error.message);
  }
}
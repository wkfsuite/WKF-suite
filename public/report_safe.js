// report_safe.js - Versione sicura senza loop infiniti
let datiReport = [];
let grafici = {};
let isLoading = false;

// Flag per prevenire inizializzazioni multiple
let isInitialized = false;

document.addEventListener('DOMContentLoaded', () => {
  if (isInitialized) {
    console.log('Report già inizializzato, ignoro');
    return;
  }
  
  isInitialized = true;
  console.log('Inizializzazione report sicura...');
  
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
  if (isLoading) {
    console.log('Caricamento già in corso');
    return;
  }
  
  isLoading = true;
  
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
    creaGraficiSafe(); // Una sola chiamata
    aggiornaTabellaDettaglio();
    
    toastManager.success('Report aggiornato con successo');
    
  } catch (error) {
    console.error('Errore caricamento report:', error);
    toastManager.error('Errore nel caricamento del report');
  } finally {
    isLoading = false;
  }
}

function aggiornaStatistiche(stats) {
  document.getElementById('totaleRichieste').textContent = stats.totale || 0;
  document.getElementById('richiesteApprovate').textContent = stats.approvate || 0;
  document.getElementById('richiesteRifiutate').textContent = stats.rifiutate || 0;
  document.getElementById('richiesteInAttesa').textContent = stats.inAttesa || 0;
}

// Funzione unificata per creare tutti i grafici UNA SOLA VOLTA
function creaGraficiSafe() {
  console.log('=== CREAZIONE GRAFICI SAFE ===');
  
  // Distruggi tutti i grafici esistenti
  Object.keys(grafici).forEach(key => {
    if (grafici[key]) {
      grafici[key].destroy();
      grafici[key] = null;
    }
  });
  
  // Prepara dati per tutti i grafici
  const stati = {};
  const mesi = {};
  const tipi = {};
  
  datiReport.forEach(r => {
    // Conta stati
    const stato = r.stato || 'in attesa';
    stati[stato] = (stati[stato] || 0) + 1;
    
    // Conta mesi
    if (r.createdAt) {
      const data = new Date(r.createdAt);
      const mese = `${data.getFullYear()}-${(data.getMonth() + 1).toString().padStart(2, '0')}`;
      mesi[mese] = (mesi[mese] || 0) + 1;
    }
    
    // Conta tipi
    const tipo = r.tipo || 'non specificato';
    tipi[tipo] = (tipi[tipo] || 0) + 1;
  });
  
  // Crea grafico stati
  try {
    const ctxStati = document.getElementById('graficoStati').getContext('2d');
    grafici.stati = new Chart(ctxStati, {
      type: 'doughnut',
      data: {
        labels: Object.keys(stati),
        datasets: [{
          data: Object.values(stati),
          backgroundColor: [
            'rgba(46, 204, 113, 0.8)',
            'rgba(231, 76, 60, 0.8)',
            'rgba(241, 196, 15, 0.8)'
          ],
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: '#e6e7ee' }
          }
        }
      }
    });
  } catch (error) {
    console.error('Errore grafico stati:', error);
  }
  
  // Crea grafico mensile
  try {
    const ctxMensile = document.getElementById('graficoMensile').getContext('2d');
    const mesiOrdinati = Object.keys(mesi).sort();
    
    grafici.mensile = new Chart(ctxMensile, {
      type: 'line',
      data: {
        labels: mesiOrdinati.map(m => {
          const [anno, mese] = m.split('-');
          const nomi = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 
                        'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
          return `${nomi[parseInt(mese) - 1]} ${anno}`;
        }),
        datasets: [{
          label: 'Richieste per Mese',
          data: mesiOrdinati.map(m => mesi[m]),
          backgroundColor: 'rgba(79, 124, 255, 0.2)',
          borderColor: 'rgba(79, 124, 255, 1)',
          borderWidth: 3,
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: '#e6e7ee' } }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { color: '#9aa1b3' },
            grid: { color: 'rgba(255,255,255,0.1)' }
          },
          x: {
            ticks: { color: '#9aa1b3' },
            grid: { color: 'rgba(255,255,255,0.1)' }
          }
        }
      }
    });
  } catch (error) {
    console.error('Errore grafico mensile:', error);
  }
  
  // Crea grafico tipi
  try {
    const ctxTipi = document.getElementById('graficoTipi').getContext('2d');
    
    grafici.tipi = new Chart(ctxTipi, {
      type: 'bar',
      data: {
        labels: Object.keys(tipi),
        datasets: [{
          label: 'Numero Richieste',
          data: Object.values(tipi),
          backgroundColor: [
            'rgba(52, 152, 219, 0.8)',
            'rgba(155, 89, 182, 0.8)',
            'rgba(230, 126, 34, 0.8)',
            'rgba(26, 188, 156, 0.8)'
          ],
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: '#e6e7ee' } }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { color: '#9aa1b3' },
            grid: { color: 'rgba(255,255,255,0.1)' }
          },
          x: {
            ticks: { color: '#9aa1b3' },
            grid: { color: 'rgba(255,255,255,0.1)' }
          }
        }
      }
    });
  } catch (error) {
    console.error('Errore grafico tipi:', error);
  }
  
  console.log('=== GRAFICI CREATI ===');
}

function aggiornaTabellaDettaglio() {
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
}

function aggiornaReport() {
  console.log('Aggiornamento report richiesto');
  caricaDatiReport();
}

// Funzione PDF semplificata (copia la precedente senza modifiche)
async function generatePDF() {
  // ... (mantieni la funzione PDF precedente)
}
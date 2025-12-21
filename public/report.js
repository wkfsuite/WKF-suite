// report.js - Sistema report con grafici e PDF
let datiReport = [];
let grafici = {};
let isLoading = false;
let graficiCreati = false;

document.addEventListener('DOMContentLoaded', () => {
  console.log('DOMContentLoaded - inizializzazione report');
  inizializzaFiltri();
  caricaDatiReport();
});

function inizializzaFiltri() {
  // Imposta date filtro (ultimo mese)
  const oggi = new Date();
  const unMeseFa = new Date(oggi.getFullYear(), oggi.getMonth() - 1, oggi.getDate());
  
  document.getElementById('filtroDataDal').value = unMeseFa.toISOString().split('T')[0];
  document.getElementById('filtroDataAl').value = oggi.toISOString().split('T')[0];
  
  // Carica lista dipendenti
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
    console.log('Caricamento già in corso, ignorando richiesta duplicata');
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
    aggiornaGrafici();
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

function aggiornaGrafici() {
  console.log('aggiornaGrafici chiamata, graficiCreati:', graficiCreati);
  
  // Evita ricreazione multipla
  if (graficiCreati) {
    console.log('Grafici già creati, aggiornamento dati solamente');
    aggiornaDataGrafici();
    return;
  }
  
  graficiCreati = true;
  
  creaGraficoStati();
  creaGraficoMensile();
  creaGraficoTipi();
}

function aggiornaDataGrafici() {
  // Aggiorna solo i dati dei grafici esistenti senza ricrearli
  if (grafici.stati) {
    const stati = {};
    datiReport.forEach(r => {
      const stato = r.stato || 'in attesa';
      stati[stato] = (stati[stato] || 0) + 1;
    });
    grafici.stati.data.labels = Object.keys(stati);
    grafici.stati.data.datasets[0].data = Object.values(stati);
    grafici.stati.update();
  }
  
  // Aggiorna grafico mensile
  if (grafici.mensile) {
    const mesi = {};
    datiReport.forEach(r => {
      if (r.createdAt) {
        const data = new Date(r.createdAt);
        const mese = `${data.getFullYear()}-${(data.getMonth() + 1).toString().padStart(2, '0')}`;
        mesi[mese] = (mesi[mese] || 0) + 1;
      }
    });
    const mesiOrdinati = Object.keys(mesi).sort();
    grafici.mensile.data.labels = mesiOrdinati.map(m => {
      const [anno, mese] = m.split('-');
      const nomi = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 
                    'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
      return `${nomi[parseInt(mese) - 1]} ${anno}`;
    });
    grafici.mensile.data.datasets[0].data = mesiOrdinati.map(m => mesi[m]);
    grafici.mensile.update();
  }
  
  // Aggiorna grafico tipi
  if (grafici.tipi) {
    const tipi = {};
    datiReport.forEach(r => {
      const tipo = r.tipo || 'non specificato';
      tipi[tipo] = (tipi[tipo] || 0) + 1;
    });
    grafici.tipi.data.labels = Object.keys(tipi);
    grafici.tipi.data.datasets[0].data = Object.values(tipi);
    grafici.tipi.update();
  }
}

function creaGraficoStati() {
  console.log('=== creaGraficoStati START ===');
  
  try {
    const canvas = document.getElementById('graficoStati');
    if (!canvas) {
      console.error('Canvas graficoStati non trovato');
      return;
    }
    
    const ctx = canvas.getContext('2d');
    
    // Distruggi grafico esistente se presente
    if (grafici.stati) {
      console.log('Distruzione grafico stati esistente');
      grafici.stati.destroy();
      grafici.stati = null;
    }

  const stati = {};
  datiReport.forEach(r => {
    const stato = r.stato || 'in attesa';
    stati[stato] = (stati[stato] || 0) + 1;
  });

  grafici.stati = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: Object.keys(stati),
      datasets: [{
        data: Object.values(stati),
        backgroundColor: [
          'rgba(46, 204, 113, 0.8)',  // approvata - verde
          'rgba(231, 76, 60, 0.8)',   // rifiutata - rosso
          'rgba(241, 196, 15, 0.8)'   // in attesa - giallo
        ],
        borderColor: [
          'rgba(46, 204, 113, 1)',
          'rgba(231, 76, 60, 1)',
          'rgba(241, 196, 15, 1)'
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
  
  console.log('=== creaGraficoStati END ===');
  } catch (error) {
    console.error('Errore creazione grafico stati:', error);
  }
}

function creaGraficoMensile() {
  try {
    const canvas = document.getElementById('graficoMensile');
    if (!canvas) {
      console.error('Canvas graficoMensile non trovato');
      return;
    }
    
    const ctx = canvas.getContext('2d');
    
    if (grafici.mensile) {
      grafici.mensile.destroy();
      grafici.mensile = null;
    }

  const mesi = {};
  datiReport.forEach(r => {
    if (r.createdAt) {
      const data = new Date(r.createdAt);
      const mese = `${data.getFullYear()}-${(data.getMonth() + 1).toString().padStart(2, '0')}`;
      mesi[mese] = (mesi[mese] || 0) + 1;
    }
  });

  // Ordina i mesi
  const mesiOrdinati = Object.keys(mesi).sort();

  grafici.mensile = new Chart(ctx, {
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
    console.error('Errore creazione grafico mensile:', error);
  }
}

function creaGraficoTipi() {
  try {
    const canvas = document.getElementById('graficoTipi');
    if (!canvas) {
      console.error('Canvas graficoTipi non trovato');
      return;
    }
    
    const ctx = canvas.getContext('2d');
    
    if (grafici.tipi) {
      grafici.tipi.destroy();
      grafici.tipi = null;
    }

  const tipi = {};
  datiReport.forEach(r => {
    const tipo = r.tipo || 'non specificato';
    tipi[tipo] = (tipi[tipo] || 0) + 1;
  });

  grafici.tipi = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: Object.keys(tipi),
      datasets: [{
        label: 'Numero Richieste',
        data: Object.values(tipi),
        backgroundColor: [
          'rgba(52, 152, 219, 0.8)',  // blu
          'rgba(155, 89, 182, 0.8)',  // viola
          'rgba(230, 126, 34, 0.8)',  // arancione
          'rgba(26, 188, 156, 0.8)'   // turchese
        ],
        borderColor: [
          'rgba(52, 152, 219, 1)',
          'rgba(155, 89, 182, 1)',
          'rgba(230, 126, 34, 1)',
          'rgba(26, 188, 156, 1)'
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
    console.error('Errore creazione grafico tipi:', error);
  }
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
  console.log('aggiornaReport chiamata');
  toastManager.info('Aggiornamento report in corso...');
  graficiCreati = false; // Reset per permettere ricaricamento completo se necessario
  caricaDatiReport();
}

async function generatePDF() {
  try {
    toastManager.info('Generazione PDF in corso...', null, 0);

    // Carica logo aziendale per PDF se disponibile
    try {
      const companyResponse = await fetch('/api/company-settings');
      const companySettings = await companyResponse.json();

      if (companySettings && companySettings.logo_path) {
        const pdfLogo = document.getElementById('pdfLogo');
        if (pdfLogo) {
          pdfLogo.src = companySettings.logo_path;
          pdfLogo.alt = companySettings.company_name || 'Logo Aziendale';
        }
      }
    } catch (logoError) {
      console.log('Logo aziendale non disponibile per PDF:', logoError);
    }

    // Popola contenuto PDF
    document.getElementById('dataGenerazione').textContent = new Date().toLocaleDateString('it-IT');
    
    // Crea statistiche per PDF
    const statsHtml = `
      <div style="display: flex; justify-content: space-around; margin: 20px 0; background: #f8f9fa; padding: 20px; border-radius: 8px;">
        <div style="text-align: center;">
          <h3 style="margin: 0; color: #333;">Totale</h3>
          <p style="font-size: 24px; font-weight: bold; margin: 5px 0; color: #4f7cff;">${document.getElementById('totaleRichieste').textContent}</p>
        </div>
        <div style="text-align: center;">
          <h3 style="margin: 0; color: #333;">Approvate</h3>
          <p style="font-size: 24px; font-weight: bold; margin: 5px 0; color: #2ecc71;">${document.getElementById('richiesteApprovate').textContent}</p>
        </div>
        <div style="text-align: center;">
          <h3 style="margin: 0; color: #333;">Rifiutate</h3>
          <p style="font-size: 24px; font-weight: bold; margin: 5px 0; color: #e74c3c;">${document.getElementById('richiesteRifiutate').textContent}</p>
        </div>
        <div style="text-align: center;">
          <h3 style="margin: 0; color: #333;">In Attesa</h3>
          <p style="font-size: 24px; font-weight: bold; margin: 5px 0; color: #f1c40f;">${document.getElementById('richiesteInAttesa').textContent}</p>
        </div>
      </div>
    `;
    document.getElementById('pdfStats').innerHTML = statsHtml;
    
    // Crea tabella per PDF
    let tableHtml = `
      <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
        <thead>
          <tr style="background: #4f7cff; color: white;">
            <th style="padding: 10px; border: 1px solid #ddd;">Data</th>
            <th style="padding: 10px; border: 1px solid #ddd;">Dipendente</th>
            <th style="padding: 10px; border: 1px solid #ddd;">Tipo</th>
            <th style="padding: 10px; border: 1px solid #ddd;">Periodo</th>
            <th style="padding: 10px; border: 1px solid #ddd;">Stato</th>
          </tr>
        </thead>
        <tbody>
    `;
    
    datiReport.forEach(r => {
      const dataDisplay = r.data || (r.dal && r.al ? `${r.dal} - ${r.al}` : '-');
      const statoColor = r.stato === 'approvata' ? '#2ecc71' : 
                        r.stato === 'rifiutata' ? '#e74c3c' : '#f1c40f';
      
      tableHtml += `
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;">${new Date(r.createdAt).toLocaleDateString('it-IT')}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${r.nome} ${r.cognome}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${r.tipo}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${dataDisplay}</td>
          <td style="padding: 8px; border: 1px solid #ddd; color: ${statoColor}; font-weight: bold;">${r.stato}</td>
        </tr>
      `;
    });
    
    tableHtml += '</tbody></table>';
    document.getElementById('pdfTable').innerHTML = tableHtml;
    
    // Mostra contenuto per screenshot
    const pdfContent = document.getElementById('pdfContent');
    pdfContent.style.display = 'block';
    pdfContent.style.background = 'white';
    pdfContent.style.padding = '40px';
    pdfContent.style.color = '#333';
    
    // Genera PDF usando html2canvas + jsPDF
    const canvas = await html2canvas(pdfContent, {
      scale: 2,
      backgroundColor: 'white',
      width: 800,
      height: pdfContent.scrollHeight
    });
    
    // Nascondi di nuovo il contenuto
    pdfContent.style.display = 'none';
    
    const imgData = canvas.toDataURL('image/png');
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF('p', 'mm', 'a4');
    
    const imgWidth = 210; // A4 width in mm
    const pageHeight = 295; // A4 height in mm (297 - margini)
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    // Calcola numero di pagine necessarie
    const totalPages = Math.ceil(imgHeight / pageHeight);
    const maxPages = Math.min(totalPages, 20); // Limite di sicurezza
    
    // Aggiungi prima pagina
    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
    
    // Aggiungi pagine aggiuntive solo se necessario
    for (let i = 1; i < maxPages; i++) {
      pdf.addPage();
      const yOffset = -(pageHeight * i);
      pdf.addImage(imgData, 'PNG', 0, yOffset, imgWidth, imgHeight);
    }
    
    // Scarica il PDF
    const oggi = new Date().toISOString().split('T')[0];
    pdf.save(`report-permessi-${oggi}.pdf`);
    
    toastManager.success('PDF scaricato con successo!', 'Report Generato');
    
  } catch (error) {
    console.error('Errore generazione PDF:', error);
    toastManager.error('Errore nella generazione del PDF', 'Errore');
  }
}
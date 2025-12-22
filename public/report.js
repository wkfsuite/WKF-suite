1// report.js - Report system with charts and PDF
let reportData = [];
let charts = {};
let isLoading = false;
let chartsCreated = false;

document.addEventListener('DOMContentLoaded', () => {
  console.log('DOMContentLoaded - initializing report');
  initializeFilters();
  loadReportData();
});

function initializeFilters() {
  // Set filter dates (last month)
  const today = new Date();
  const oneMonthAgo = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
  
  document.getElementById('filtroDataDal').value = oneMonthAgo.toISOString().split('T')[0];
  document.getElementById('filtroDataAl').value = today.toISOString().split('T')[0];
  
  // Load employee list
  loadEmployees();
}

async function loadEmployees() {
  try {
    const response = await fetch('/api/utenti/dipendenti');
    if (response.ok) {
      const employees = await response.json();
      const select = document.getElementById('filtroDipendente');
      
      employees.forEach(emp => {
        const option = document.createElement('option');
        option.value = emp.matricola;
        option.textContent = `${emp.username} (${emp.matricola})`;
        select.appendChild(option);
      });
    }
  } catch (error) {
    console.error('Error loading employees:', error);
  }
}

async function loadReportData() {
  if (isLoading) {
    console.log('Load already in progress, ignoring duplicate request');
    return;
  }
  
  isLoading = true;
  
  try {
    const filtri = {
      startDate: document.getElementById('filtroDataDal').value,
      dataFine: document.getElementById('filtroDataAl').value,
      matricola: document.getElementById('filtroDipendente').value
    };

    const params = new URLSearchParams();
    if (filtri.dataInizio) params.append('dataInizio', filtri.dataInizio);
    if (filtri.dataFine) params.append('dataFine', filtri.dataFine);
    if (filtri.matricola) params.append('matricola', filtri.matricola);

    const response = await fetch(`/api/report/permessi?${params}`);
    
    if (!response.ok) {
      throw new Error('Error loading report data');
    }

    const data = await response.json();
    reportData = data.richieste || [];
    
    updateStatistics(data.statistiche);
    updateCharts();
    updateDetailTable();
    
    toastManager.success('Report updated successfully');
    
  } catch (error) {
    console.error('Error loading report:', error);
    toastManager.error('Error loading the report');
  } finally {
    isLoading = false;
  }
}

function updateStatistics(stats) {
  document.getElementById('totaleRichieste').textContent = stats.totale || 0;
  document.getElementById('richiesteApprovate').textContent = stats.approvate || 0;
  document.getElementById('richiesteRifiutate').textContent = stats.rifiutate || 0;
  document.getElementById('richiesteInAttesa').textContent = stats.inAttesa || 0;
}

function updateCharts() {
  console.log('updateCharts called, chartsCreated:', chartsCreated);
  
  // Evita ricreazione multipla
  if (chartsCreated) {
    console.log('Charts already created, updating data only');
    updateChartData();
    return;
  }
  
  chartsCreated = true;
  
  createStatusChart();
  createMonthlyChart();
  createTypeChart();
}

function updateChartData() {
  // Aggiorna solo i dati dei grafici esistenti senza ricrearli
  if (charts.stati) {
    const stati = {};
    datiReport.forEach(r => {
      const stato = r.stato || 'in attesa';
      stati[stato] = (stati[stato] || 0) + 1;
    });
    grafici.stati.data.labels = Object.keys(stati);
    grafici.stati.data.datasets[0].data = Object.values(stati);
    charts.stati.update();
  }
  
  // Aggiorna grafico mensile
  if (charts.mensile) {
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
    charts.mensile.data.datasets[0].data = mesiOrdinati.map(m => mesi[m]);
    charts.mensile.update();
  }
  
  // Aggiorna grafico tipi
  if (charts.tipi) {
    const tipi = {};
    datiReport.forEach(r => {
      const tipo = r.tipo || 'non specificato';
      tipi[tipo] = (tipi[tipo] || 0) + 1;
    });
    grafici.tipi.data.labels = Object.keys(tipi);
    grafici.tipi.data.datasets[0].data = Object.values(tipi);
    charts.tipi.update();
  }
}

function createStatusChart() {
  console.log('=== createStatusChart START ===');
  
  try {
    const canvas = document.getElementById('graficoStati');
    if (!canvas) {
      console.error('Canvas graficoStati not found');
      return;
    }
    
    const ctx = canvas.getContext('2d');
    
    // Distruggi grafico esistente se presente
    if (charts.stati) {
      console.log('Destroying existing status chart');
      charts.stati.destroy();
      charts.stati = null;
    }

  const stati = {};
  reportData.forEach(r => {
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
  
  console.log('=== createStatusChart END ===');
  } catch (error) {
    console.error('Error creating status chart:', error);
  }
}

function creaGraficoMensile() {
  try {
    const canvas = document.getElementById('graficoMensile');
    if (!canvas) {
      console.error('Canvas graficoMensile not found');
      return;
    }
    
    const ctx = canvas.getContext('2d');
    
    if (charts.mensile) {
      charts.mensile.destroy();
      charts.mensile = null;
    }

  const mesi = {};
  datiReport.forEach(r => {
    if (r.createdAt) {
      const data = new Date(r.createdAt);
      const mese = `${data.getFullYear()}-${(data.getMonth() + 1).toString().padStart(2, '0')}`;
      mesi[mese] = (mesi[mese] || 0) + 1;
    }
  });

  // Sort months
  const mesiOrdinati = Object.keys(mesi).sort();

  charts.mensile = new Chart(ctx, {
    type: 'line',
    data: {
      labels: mesiOrdinati.map(m => {
        const [anno, mese] = m.split('-');
        const nomi = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 
                      'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
        return `${nomi[parseInt(mese) - 1]} ${anno}`;
      }),
      datasets: [{
        label: 'Number of Requests',
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
    console.error('Error creating monthly chart:', error);
  }
}

function creaGraficoTipi() {
  try {
    const canvas = document.getElementById('graficoTipi');
    if (!canvas) {
      console.error('Canvas graficoTipi not found');
      return;
    }
    
    const ctx = canvas.getContext('2d');
    
    if (charts.tipi) {
      charts.tipi.destroy();
      charts.tipi = null;
    }

  const tipi = {};
  datiReport.forEach(r => {
    const tipo = r.tipo || 'non specificato';
    tipi[tipo] = (tipi[tipo] || 0) + 1;
  });

  charts.tipi = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: Object.keys(tipi),
      datasets: [{
        label: 'Number of Requests',
        data: Object.values(tipi),
        backgroundColor: [
          'rgba(52, 152, 219, 0.8)',  // blue
          'rgba(155, 89, 182, 0.8)',  // purple
          'rgba(230, 126, 34, 0.8)',  // orange
          'rgba(26, 188, 156, 0.8)'   // turquoise
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
    console.error('Error creating type chart:', error);
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

function applicaFiltri() {
  console.log('Applying filters');
  toastManager.info('Aggiornamento report...');
  caricaDatiReport();
}

async function generaPDF() {
  try {
    toastManager.info('Generating PDF...', null, 0);

    // Load company logo for PDF if available
    try {
      const companyResponse = await fetch('/api/company-settings');
      const companySettings = await companyResponse.json();

      if (companySettings && companySettings.logo_path) {
        const pdfLogo = document.getElementById('pdfLogo');
        if (pdfLogo) {
          pdfLogo.src = companySettings.logo_path;
          pdfLogo.alt = companySettings.company_name || 'Company Logo';
        }
      }
    } catch (logoError) {
      console.log('Company logo not available for PDF:', logoError);
    }

    // Populate PDF content
    document.getElementById('pdfGenerationDate').textContent = new Date().toLocaleDateString('en-US');
    
    // Create statistics for PDF
    const statsHtml = `
      <div style="display: flex; justify-content: space-around; margin: 20px 0; background: #f8f9fa; padding: 20px; border-radius: 8px;">
        <div style="text-align: center;">
          <h3 style="margin: 0; color: #333;">Total</h3>
          <p style="font-size: 24px; font-weight: bold; margin: 5px 0; color: #4f7cff;">${document.getElementById('totalRequests').textContent}</p>
        </div>
        <div style="text-align: center;">
          <h3 style="margin: 0; color: #333;">Approved</h3>
          <p style="font-size: 24px; font-weight: bold; margin: 5px 0; color: #2ecc71;">${document.getElementById('approvedRequests').textContent}</p>
        </div>
        <div style="text-align: center;">
          <h3 style="margin: 0; color: #333;">Rejected</h3>
          <p style="font-size: 24px; font-weight: bold; margin: 5px 0; color: #e74c3c;">${document.getElementById('rejectedRequests').textContent}</p>
        </div>
        <div style="text-align: center;">
          <h3 style="margin: 0; color: #333;">In Attesa</h3>
          <p style="font-size: 24px; font-weight: bold; margin: 5px 0; color: #f1c40f;">${document.getElementById('richiesteInAttesa').textContent}</p>
        </div>
      </div>
    `;
    document.getElementById('pdfStats').innerHTML = statsHtml;
    
    // Create table for PDF
    let tableHtml = `
      <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
        <thead>
          <tr style="background: #4f7cff; color: white;">
            <th style="padding: 10px; border: 1px solid #ddd;">Date</th>
            <th style="padding: 10px; border: 1px solid #ddd;">Employee</th>
            <th style="padding: 10px; border: 1px solid #ddd;">Type</th>
            <th style="padding: 10px; border: 1px solid #ddd;">Period</th>
            <th style="padding: 10px; border: 1px solid #ddd;">Status</th>
          </tr>
        </thead>
        <tbody>
    `;
    
    datiReport.forEach(r => {
      const dataDisplay = r.data || (r.dal && r.al ? `${r.dal} - ${r.al}` : '-');
      const statoColor = r.stato === 'approved' ? '#2ecc71' : 
                        r.stato === 'rejected' ? '#e74c3c' : '#f1c40f';
      
      tableHtml += `
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;">${new Date(r.createdAt).toLocaleDateString('en-US')}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${r.nome} ${r.cognome}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${r.tipo}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${dataDisplay}</td>
          <td style="padding: 8px; border: 1px solid #ddd; color: ${statoColor}; font-weight: bold;">${r.stato}</td>
        </tr>
      `;
    });
    
    tableHtml += '</tbody></table>';
    document.getElementById('pdfTable').innerHTML = tableHtml;
    
    // Show content for screenshot
    const pdfContent = document.getElementById('pdfContent');
    pdfContent.style.display = 'block';
    pdfContent.style.background = 'white';
    pdfContent.style.padding = '40px';
    pdfContent.style.color = '#333';
    
    // Generate PDF using html2canvas + jsPDF
    const canvas = await html2canvas(pdfContent, {
      scale: 2,
      backgroundColor: 'white',
      width: 800,
      height: pdfContent.scrollHeight
    });
    
    // Hide the content again
    pdfContent.style.display = 'none';
    
    const imgData = canvas.toDataURL('image/png');
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF('p', 'mm', 'a4');
    
    const imgWidth = 210; // A4 width in mm
    const pageHeight = 295; // A4 height in mm (297 - margins)
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    // Calculate number of pages needed
    const totalPages = Math.ceil(imgHeight / pageHeight);
    const maxPages = Math.min(totalPages, 20); // Safety limit
    
    // Add first page
    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
    
    // Add additional pages only if necessary
    for (let i = 1; i < maxPages; i++) {
      pdf.addPage();
      const yOffset = -(pageHeight * i);
      pdf.addImage(imgData, 'PNG', 0, yOffset, imgWidth, imgHeight);
    }
    
    // Download the PDF
    const oggi = new Date().toISOString().split('T')[0];
    pdf.save(`leave-report-${oggi}.pdf`);
    
    toastManager.success('PDF downloaded successfully!', 'Report Generated');
    
  } catch (error) {
    console.error('Error generating PDF:', error);
    toastManager.error('Error generating the PDF', 'Error');
  }
}
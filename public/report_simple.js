// report_simple.js - Simple report with pagination
let reportData = [];
let currentPage = 1;
const elementsPerPage = 10;

document.addEventListener('DOMContentLoaded', () => {
  initializeFilters();
  loadReportData();
});

function initializeFilters() {
  const today = new Date();
  const oneMonthAgo = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
  
  document.getElementById('filtroDataDal').value = oneMonthAgo.toISOString().split('T')[0];
  document.getElementById('filtroDataAl').value = today.toISOString().split('T')[0];
  
  loadEmployees(); // This function was already in English
}

async function loadEmployees() {
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
    console.error('Error loading employees:', error);
  }
}

async function loadReportData() {
  try {
    const filtri = {
      startDate: document.getElementById('filtroDataDal').value,
      endDate: document.getElementById('filtroDataAl').value,
      employeeId: document.getElementById('filtroDipendente').value
    };

    const params = new URLSearchParams();
    if (filtri.startDate) params.append('dataInizio', filtri.startDate);
    if (filtri.endDate) params.append('dataFine', filtri.endDate);
    if (filtri.employeeId) params.append('matricola', filtri.employeeId);

    const response = await fetch(`/api/report/permessi?${params}`);
    
    if (!response.ok) {
      throw new Error('Error loading report data');
    }

    const responseData = await response.json();
    reportData = responseData.richieste || [];
    
    updateStatistics(responseData.statistiche);
    currentPage = 1; // Reset to the first page
    updateTableWithPagination();
    
    toastManager.success('Report loaded successfully');
    
  } catch (error) {
    console.error('Error loading report:', error);
    toastManager.error('Error loading the report');
  }
}

function updateStatistics(stats) {
  document.getElementById('totalRequests').textContent = stats.totale || 0;
  document.getElementById('approvedRequests').textContent = stats.approvate || 0;
  document.getElementById('rejectedRequests').textContent = stats.rifiutate || 0;
  document.getElementById('pendingRequests').textContent = stats.inAttesa || 0;
}

function updateTableWithPagination() {
  const tbody = document.querySelector('#tabellaDettaglio tbody');
  tbody.innerHTML = '';
  
  // Calculate elements for the current page
  const startIndex = (currentPage - 1) * elementsPerPage;
  const endIndex = startIndex + elementsPerPage;
  const pageElements = reportData.slice(startIndex, endIndex);
  
  // Populate table
  pageElements.forEach(r => {
    const row = document.createElement('tr');
    
    const dataDisplay = r.data || (r.dal && r.al ? `${r.dal} - ${r.al}` : '-');
    const statoClass = r.stato === 'approvata' ? 'status ok' : 
                      r.stato === 'rifiutata' ? 'status no' : 'status pending';

    row.innerHTML = `
      <td>${new Date(r.createdAt).toLocaleDateString('en-US')}</td>
      <td>${r.nome} ${r.cognome} (${r.matricola})</td>
      <td>${r.tipo}</td>
      <td>${dataDisplay}</td>
      <td><span class="${statoClass}">${r.stato}</span></td>
      <td>${r.note || '-'}</td>
    `;
    
    tbody.appendChild(row);
  });
  
  // Aggiorna controlli paginazione
  updatePaginationControls();
}

function updatePaginationControls() {
  const totalPages = Math.ceil(reportData.length / elementsPerPage);
  let paginationContainer = document.getElementById('pagination');
  
  if (!paginationContainer) {
    // Create pagination container if it doesn't exist
    const container = document.createElement('div');
    container.id = 'pagination';
    container.className = 'pagination';
    container.style.textAlign = 'center';
    container.style.marginTop = '20px';
    
    const table = document.getElementById('tabellaDettaglio');
    table.parentNode.insertBefore(container, table.nextSibling);
    paginationContainer = container;
  }
  
  let paginationHTML = `
    <div class="pagination-info">
      Page ${currentPage} of ${totalPages} - 
      Elements ${(currentPage - 1) * elementsPerPage + 1}-${Math.min(currentPage * elementsPerPage, reportData.length)} 
      of ${reportData.length}
    </div>
    <div class="pagination-controls" style="margin-top: 10px;">
  `;
  
  // First Page Button
  if (currentPage > 1) {
    paginationHTML += `<button class="btn secondary" onclick="goToPage(1)">⏮️ First</button>`;
    paginationHTML += `<button class="btn secondary" onclick="goToPage(${currentPage - 1})">⬅️ Previous</button>`;
  }
  
  // Page Numbers (show max 5 pages around the current one)
  const startPage = Math.max(1, currentPage - 2);
  const endPage = Math.min(totalPages, currentPage + 2);
  
  for (let i = startPage; i <= endPage; i++) {
    const className = i === currentPage ? 'btn' : 'btn secondary';
    paginationHTML += `<button class="${className}" onclick="goToPage(${i})">${i}</button>`;
  }
  
  // Last Page Button
  if (currentPage < totalPages) {
    paginationHTML += `<button class="btn secondary" onclick="goToPage(${currentPage + 1})">Next ➡️</button>`;
    paginationHTML += `<button class="btn secondary" onclick="goToPage(${totalPages})">Last ⏭️</button>`;
  }
  
  paginationHTML += '</div>';
  
  paginationContainer.innerHTML = paginationHTML;
}

function goToPage(pageNumber) {
  const totalPages = Math.ceil(reportData.length / elementsPerPage);
  
  if (pageNumber >= 1 && pageNumber <= totalPages) {
    currentPage = pageNumber;
    updateTableWithPagination();
  }
}

function updateReport() {
  console.log('Updating report...');
  loadReportData();
}

async function generatePDF() {
  try {
    toastManager.info('Preparing PDF...');
    console.log('Preparing PDF...');
    if (reportData.length === 0) {
      toastManager.warning('No data to export. Please load report data first.');
      return;
    }
    
    console.log('Starting PDF generation with', reportData.length, 'elements');
    
    const generationDate = new Date().toLocaleDateString('en-US');
    
    let htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Leave Report - ${generationDate}</title>
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
    .success { color: #27ae60; } /* Approved */
    .error { color: #e74c3c; } /* Rejected */
    .warning { color: #f39c12; } /* Pending */
    .primary { color: #3498db; } /* Total */
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
  <h1>EMPLOYEE LEAVE REPORT</h1>
  <p class="subtitle">Generated on ${generationDate}</p>
  
  <div class="stats">
    <div class="stat">
      <h3>Total Requests</h3>
      <p class="primary">${document.getElementById('totalRequests').textContent}</p>
    </div>
    <div class="stat">
      <h3>Approved</h3>
      <p class="success">${document.getElementById('approvedRequests').textContent}</p>
    </div>
    <div class="stat">
      <h3>Rejected</h3>
      <p class="error">${document.getElementById('rejectedRequests').textContent}</p>
    </div>
    <div class="stat">
      <h3>Pending</h3>
      <p class="warning">${document.getElementById('pendingRequests').textContent}</p>
    </div>
  </div>
  
  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Employee</th>
        <th>Type</th>
        <th>Period</th>
        <th>Status</th>
        <th>Notes</th>
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
    Report automatically generated by the Leave Management System - ${new Date().toLocaleString('en-US')}
  </div>
  
  <script>
    // Auto-stampa quando la pagina è caricata
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 500); // Small delay to ensure content is rendered
    }
  </script>
</body>
</html>`;

    console.log('HTML generato, apertura finestra...');
    
    // Try different strategies to open the window
    let newWindow;
    
    try {
      // Strategy 1: Normal window.open
      newWindow = window.open('', '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes');
      
      if (!newWindow) {
        throw new Error('Popup blocked');
      }
      
      newWindow.document.write(htmlContent);
      newWindow.document.close();
      
      toastManager.success('PDF opened in a new window. Printing will start automatically.');
      
    } catch (error) {
      console.log('Popup blocked, using alternative strategy:', error);
      
      // Strategy 2: Create blob and download
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `leave-report-${new Date().toISOString().split('T')[0]}.html`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
      toastManager.success('Report downloaded as HTML file. Open it and use Ctrl+P to print.');
    }
    
  } catch (error) {
    console.error('Complete PDF generation error:', error);
    toastManager.error('Error in PDF generation: ' + error.message);
  }
}

// Funzione alternativa per stampa diretta della pagina corrente
function printDirectly() {
  try {
    if (reportData.length === 0) {
      toastManager.warning('No data to print. Please load report data first.');
      return;
    }
    
    // Hide elements not necessary for printing
    const elementsToHide = document.querySelectorAll('.header, .card h3, #pagination, .actions');
    const originalStyles = [];
    
    elementsToHide.forEach((el, index) => {
      originalStyles[index] = el.style.display;
      el.style.display = 'none';
    });
    
    // Show all data in the table (removes pagination)
    const tbody = document.querySelector('#tabellaDettaglio tbody');
    tbody.innerHTML = '';
    
    reportData.forEach(r => {
      const row = document.createElement('tr');
      const dataDisplay = r.data || (r.dal && r.al ? `${r.dal} - ${r.al}` : '-');
      const statoClass = r.stato === 'approvata' ? 'status ok' : 
                        r.stato === 'rifiutata' ? 'status no' : 'status pending';
      row.innerHTML = `
        <td>${new Date(r.createdAt).toLocaleDateString('en-US')}</td>
        <td>${r.nome} ${r.cognome} (${r.matricola})</td>
        <td>${r.tipo}</td>
        <td>${dataDisplay}</td>
        <td><span class="${statoClass}">${r.stato.charAt(0).toUpperCase() + r.stato.slice(1)}</span></td>
        <td>${r.note || '-'}</td>
      `;
      
      tbody.appendChild(row);
    });
    
    // Aggiungi titolo per la stampa
    const titolo = document.createElement('h1');
    titolo.innerHTML = 'EMPLOYEE LEAVE REPORT - ' + new Date().toLocaleDateString('en-US');
    titolo.style.textAlign = 'center';
    titolo.style.marginBottom = '20px';
    document.body.insertBefore(titolo, document.body.firstChild);
    
    // Avvia stampa
    window.print();
    
    // Restore the page after printing
    setTimeout(() => {
      document.body.removeChild(titolo);
      elementsToHide.forEach((el, index) => {
        el.style.display = originalStyles[index];
      });
      updateTableWithPagination(); // Restore pagination
    }, 1000);
    
    toastManager.info('Print window opened. Select "Save as PDF" to create a PDF file.');
    
  } catch (error) {
    console.error('Direct print error:', error);
    toastManager.error('Error in direct printing: ' + error.message);
  }
}
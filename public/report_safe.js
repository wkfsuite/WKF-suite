// report_safe.js - Safe version without infinite loops
let reportData = [];
let charts = {};
let isLoading = false;

// Flag to prevent multiple initializations
let isInitialized = false;

document.addEventListener('DOMContentLoaded', () => {
  if (isInitialized) {
    console.log('Report already initialized, ignoring');
    return;
  }
  
  isInitialized = true;
  console.log('Safe report initialization...');
  
  initializeFilters();
  loadReportData();
});

function initializeFilters() {
  const today = new Date();
  const oneMonthAgo = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
  
  document.getElementById('filtroDataDal').value = oneMonthAgo.toISOString().split('T')[0];
  document.getElementById('filtroDataAl').value = today.toISOString().split('T')[0];
  
  loadEmployees();
}

async function loadEmployees() {
  try {
    const response = await fetch('/api/utenti/dipendenti');
    if (response.ok) {
      const employees = await response.json();
      const select = document.getElementById('filtroDipendente');
      
      employees.forEach(dip => {
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
  if (isLoading) {
    console.log('Load already in progress');
    return;
  }
  
  isLoading = true;
  
  try {
    const filters = {
      startDate: document.getElementById('filtroDataDal').value,
      endDate: document.getElementById('filtroDataAl').value,
      employeeId: document.getElementById('filtroDipendente').value
    };

    const params = new URLSearchParams();
    if (filters.startDate) params.append('dataInizio', filters.startDate);
    if (filters.endDate) params.append('dataFine', filters.endDate);
    if (filters.employeeId) params.append('matricola', filters.employeeId);

    const response = await fetch(`/api/report/permessi?${params}`);
    
    if (!response.ok) {
      throw new Error('Error loading report data');
    }

    const data = await response.json();
    reportData = data.richieste || [];
    
    updateStatistics(data.statistiche);
    createChartsSafe(); // Single call
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
  document.getElementById('totalRequests').textContent = stats.totale || 0;
  document.getElementById('approvedRequests').textContent = stats.approvate || 0;
  document.getElementById('rejectedRequests').textContent = stats.rifiutate || 0;
  document.getElementById('pendingRequests').textContent = stats.inAttesa || 0;
}

// Unified function to create all charts ONLY ONCE
function createChartsSafe() {
  console.log('=== SAFE CHART CREATION ===');
  
  // Destroy all existing charts
  Object.keys(charts).forEach(key => {
    if (charts[key]) {
      charts[key].destroy();
      charts[key] = null;
    }
  });
  
  // Prepare data for all charts
  const statuses = {};
  const months = {};
  const types = {};
  
  reportData.forEach(r => {
    // Count statuses
    const status = r.stato || 'pending';
    statuses[status] = (statuses[status] || 0) + 1;
    
    // Count months
    if (r.createdAt) {
      const data = new Date(r.createdAt);
      const month = `${data.getFullYear()}-${(data.getMonth() + 1).toString().padStart(2, '0')}`;
      months[month] = (months[month] || 0) + 1;
    }
    
    // Count types
    const type = r.tipo || 'unspecified';
    types[type] = (types[type] || 0) + 1;
  });
  
  // Create status chart
  try {
    const ctxStatuses = document.getElementById('graficoStati').getContext('2d');
    charts.statuses = new Chart(ctxStatuses, {
      type: 'doughnut',
      data: {
        labels: Object.keys(statuses),
        datasets: [{
          data: Object.values(statuses),
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
    console.error('Error in status chart:', error);
  }
  
  // Create monthly chart
  try {
    const ctxMonthly = document.getElementById('graficoMensile').getContext('2d');
    const sortedMonths = Object.keys(months).sort();
    
    charts.monthly = new Chart(ctxMonthly, {
      type: 'line',
      data: {
        labels: sortedMonths.map(m => {
          const [year, month] = m.split('-');
          const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          return `${names[parseInt(month) - 1]} ${year}`;
        }),
        datasets: [{
          label: 'Requests per Month',
          data: sortedMonths.map(m => months[m]),
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
    console.error('Error in monthly chart:', error);
  }
  
  // Create types chart
  try {
    const ctxTypes = document.getElementById('graficoTipi').getContext('2d');
    
    charts.types = new Chart(ctxTypes, {
      type: 'bar',
      data: {
        labels: Object.keys(types),
        datasets: [{
          label: 'Number of Requests',
          data: Object.values(types),
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
    console.error('Error in types chart:', error);
  }
  
  console.log('=== CHARTS CREATED ===');
}

function updateDetailTable() {
  const tbody = document.querySelector('#tabellaDettaglio tbody');
  tbody.innerHTML = '';

  reportData.forEach(r => {
    const row = document.createElement('tr');
    
    const displayDate = r.data || (r.dal && r.al ? `${r.dal} - ${r.al}` : '-');
    const statusClass = r.stato === 'approved' ? 'status ok' : 
                      r.stato === 'rejected' ? 'status no' : 'status pending';

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
}

function updateReport() {
  console.log('Report update requested');
  loadReportData();
}

// Simplified PDF function (copy the previous one without changes)
async function generatePDF() {
  // ... (keep the previous PDF function)
}
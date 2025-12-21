// dashboard-simple.js
let chartInstance = null;

document.addEventListener('DOMContentLoaded', async () => {
  // Verifica autenticazione
  try {
    const resp = await fetch('/api/session', {
      credentials: 'same-origin'
    });
    const data = await resp.json();

    if (!data.user) {
      window.location.href = 'login.html';
      return;
    }

    const { ruolo } = data.user;

    // Permetti accesso a tutti i ruoli autenticati
    if (!['admin', 'supervisore', 'segreteria', 'dipendente'].includes(ruolo)) {
      alert('Accesso negato');
      window.location.href = 'dashboard.html';
      return;
    }

    // Carica dati
    await loadSimpleDashboard();

    // Event listener per aggiornamento
    document.getElementById('refreshBtn').addEventListener('click', loadSimpleDashboard);

  } catch (err) {
    console.error('Errore inizializzazione dashboard:', err);
    window.location.href = 'login.html';
  }
});

// Carica dashboard semplice
async function loadSimpleDashboard() {
  const refreshBtn = document.getElementById('refreshBtn');
  const loadingMessage = document.getElementById('loadingMessage');

  refreshBtn.disabled = true;
  refreshBtn.innerHTML = '⏳ Aggiornamento...';
  loadingMessage.style.display = 'block';

  try {
    // Carica statistiche base
    await loadBasicStats();

    // Carica solo grafico mensile
    await loadMonthlyChart();

    // Nascondi loading
    loadingMessage.style.display = 'none';
    document.getElementById('monthlyChart').style.display = 'block';

    showToast('Dashboard aggiornata!', 'success');

  } catch (error) {
    console.error('Errore caricamento dashboard:', error);
    loadingMessage.innerHTML = '<div class="error">Errore caricamento dati. Riprova.</div>';
    showToast('Errore caricamento dati', 'error');
  } finally {
    refreshBtn.disabled = false;
    refreshBtn.innerHTML = '🔄 Aggiorna';
  }
}

// Carica statistiche base
async function loadBasicStats() {
  try {
    const response = await fetch('/api/dashboard/stats', {
      credentials: 'same-origin'
    });

    if (!response.ok) {
      throw new Error('Errore risposta server');
    }

    const stats = await response.json();

    document.getElementById('totalRequests').textContent = stats.totale || 0;
    document.getElementById('approvedRequests').textContent = stats.approvate || 0;
    document.getElementById('pendingRequests').textContent = stats.inAttesa || 0;

  } catch (error) {
    console.error('Errore statistiche:', error);
    // Valori di fallback
    document.getElementById('totalRequests').textContent = '0';
    document.getElementById('approvedRequests').textContent = '0';
    document.getElementById('pendingRequests').textContent = '0';
  }
}

// Grafico mensile semplificato
async function loadMonthlyChart() {
  try {
    const response = await fetch('/api/analytics/monthly', {
      credentials: 'same-origin'
    });

    if (!response.ok) {
      throw new Error('Errore API mensile');
    }

    const data = await response.json();

    // Prendi solo ultimi 6 mesi per performance
    const recentData = data.slice(-6);

    const ctx = document.getElementById('monthlyChart').getContext('2d');

    // Distruggi grafico esistente
    if (chartInstance) {
      chartInstance.destroy();
      chartInstance = null;
    }

    // Formatta etichette mesi
    const labels = recentData.map(item => {
      const [year, month] = item.month.split('-');
      const date = new Date(year, month - 1);
      return date.toLocaleDateString('it-IT', {
        month: 'short',
        year: 'numeric'
      });
    });

    // Crea grafico semplice
    chartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Richieste Totali',
          data: recentData.map(item => item.total || 0),
          borderColor: '#3498db',
          backgroundColor: 'rgba(52, 152, 219, 0.2)',
          fill: true,
          tension: 0.3,
          borderWidth: 3,
          pointRadius: 6,
          pointHoverRadius: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          intersect: false,
          mode: 'index'
        },
        plugins: {
          legend: {
            display: true,
            position: 'top'
          },
          tooltip: {
            backgroundColor: 'rgba(0,0,0,0.8)',
            titleColor: 'white',
            bodyColor: 'white',
            borderColor: '#3498db',
            borderWidth: 1
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1,
              color: '#666',
              font: {
                size: 12
              }
            },
            grid: {
              color: 'rgba(0,0,0,0.1)'
            }
          },
          x: {
            ticks: {
              color: '#666',
              font: {
                size: 12
              }
            },
            grid: {
              color: 'rgba(0,0,0,0.1)'
            }
          }
        }
      }
    });

  } catch (error) {
    console.error('Errore grafico mensile:', error);
    document.getElementById('loadingMessage').innerHTML =
      '<div class="error">Impossibile caricare il grafico mensile</div>';
  }
}

// Funzione toast semplice (fallback)
function showToast(message, type = 'info') {
  if (typeof window.showToast === 'function') {
    window.showToast(message, type);
  } else {
    // Fallback semplice
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'success' ? '#2ecc71' : type === 'error' ? '#e74c3c' : '#3498db'};
      color: white;
      padding: 15px 20px;
      border-radius: 8px;
      z-index: 10000;
      font-size: 14px;
      box-shadow: 0 4px 8px rgba(0,0,0,0.2);
    `;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, 3000);
  }
}

// Cleanup al cambio pagina
window.addEventListener('beforeunload', () => {
  if (chartInstance) {
    chartInstance.destroy();
  }
});
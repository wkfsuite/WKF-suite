// analytics.js
// Verifica se Chart.js è caricato
if (typeof Chart === 'undefined') {
  document.body.innerHTML = '<div style="text-align:center;padding:50px;color:#e74c3c;">Errore: Chart.js non caricato. Controlla la connessione internet.</div>';
}

// Variabili globali per gestire i grafici
let chartInstances = {};

document.addEventListener('DOMContentLoaded', async () => {
  // PRIMO: Verifica licenza PRO
  try {
    const licenseResp = await fetch('/api/license/status');
    const licenseData = await licenseResp.json();

    if (!licenseData.isPro) {
      // Nascondi contenuto analytics e mostra blocco PRO
      document.getElementById('analyticsContent').style.display = 'none';
      document.getElementById('proOnlyBlock').style.display = 'block';

      // Setup upgrade buttons
      setupUpgradeButtons();
      return;
    }
  } catch (error) {
    console.error('Errore controllo licenza:', error);
    // In caso di errore, assumiamo FREE
    document.getElementById('analyticsContent').style.display = 'none';
    document.getElementById('proOnlyBlock').style.display = 'block';
    setupUpgradeButtons();
    return;
  }

  // Se è PRO, procedi con verifica autenticazione e permessi
  try {
    const resp = await fetch('/api/session', {
      credentials: 'same-origin'
    });
    const data = await resp.json();

    console.log('Dati sessione:', data);

    if (!data.user) {
      console.log('Utente non autenticato, redirect al login');
      showToast('Sessione non valida, redirect al login...', 'warning');
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 2000);
      return;
    }

    console.log('Utente autenticato:', data.user);
    const { ruolo } = data.user;

    // Verifica permessi (solo admin, supervisore, segreteria)
    if (!['admin', 'supervisore', 'segreteria'].includes(ruolo)) {
      // Debug: mostra il ruolo attuale
      console.log('Ruolo attuale:', ruolo);
      showToast(`Accesso negato per ruolo: ${ruolo}. Analytics disponibile solo per Admin, Supervisore e Segreteria`, 'error');

      // Mostra il messaggio per più tempo per debug
      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 5000);
      return;
    }

    console.log('Accesso consentito per ruolo:', ruolo);

    // Carica tutti i dati con timeout
    await Promise.race([
      loadAllAnalytics(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout caricamento')), 30000)
      )
    ]);

    // Event listener per aggiornamento
    document.getElementById('refreshBtn').addEventListener('click', loadAllAnalytics);

  } catch (err) {
    console.error('Errore inizializzazione analytics:', err);
    showToast(`Errore: ${err.message}. Reindirizzamento...`, 'error');
    setTimeout(() => {
      window.location.href = 'login.html';
    }, 3000);
  }
});

// Carica tutte le analytics con gestione errori migliorata
async function loadAllAnalytics() {
  const refreshBtn = document.getElementById('refreshBtn');
  refreshBtn.disabled = true;
  refreshBtn.innerHTML = '⏳ Aggiornamento...';

  try {
    // Carica statistiche generali per prime
    await loadGeneralStats();

    // Carica grafici uno alla volta per evitare sovraccarico
    const chartPromises = [
      loadMonthlyChart().catch(err => console.error('Errore grafico mensile:', err)),
      loadTypeChart().catch(err => console.error('Errore grafico tipi:', err)),
      loadEmployeesChart().catch(err => console.error('Errore grafico dipendenti:', err)),
      loadHoursChart().catch(err => console.error('Errore grafico ore:', err))
    ];

    // Attendi tutti i grafici con timeout individuale
    await Promise.allSettled(chartPromises);

    showToast('Analytics caricate!', 'success');

  } catch (error) {
    console.error('Errore caricamento analytics:', error);
    showToast('Errore parziale nel caricamento', 'warning');
  } finally {
    refreshBtn.disabled = false;
    refreshBtn.innerHTML = '🔄 Aggiorna';
  }
}

// Carica statistiche generali
async function loadGeneralStats() {
  try {
    const response = await fetch('/api/dashboard/stats', { credentials: 'same-origin' });
    const stats = await response.json();

    document.getElementById('totalRequests').textContent = stats.totale || 0;
    document.getElementById('approvedRequests').textContent = stats.approvate || 0;
    document.getElementById('rejectedRequests').textContent = stats.rifiutate || 0;
    document.getElementById('pendingRequests').textContent = stats.inAttesa || 0;

  } catch (error) {
    console.error('Errore caricamento statistiche generali:', error);
  }
}

// Grafico Andamento Mensile
async function loadMonthlyChart() {
  try {
    const response = await fetch('/api/analytics/monthly', { credentials: 'same-origin' });
    const data = await response.json();

    const ctx = document.getElementById('monthlyChart').getContext('2d');

    // Distruggi grafico esistente se presente
    if (chartInstances.monthly) {
      chartInstances.monthly.destroy();
      chartInstances.monthly = null;
    }

    const labels = data.map(item => {
      const [year, month] = item.month.split('-');
      return new Intl.DateTimeFormat('it-IT', {
        month: 'short',
        year: 'numeric'
      }).format(new Date(year, month - 1));
    });

    chartInstances.monthly = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Totali',
            data: data.map(item => item.total),
            borderColor: '#3498db',
            backgroundColor: 'rgba(52, 152, 219, 0.1)',
            fill: true,
            tension: 0.4
          },
          {
            label: 'Approvate',
            data: data.map(item => item.approvate),
            borderColor: '#2ecc71',
            backgroundColor: 'rgba(46, 204, 113, 0.1)',
            fill: false,
            tension: 0.4
          },
          {
            label: 'Rifiutate',
            data: data.map(item => item.rifiutate),
            borderColor: '#e74c3c',
            backgroundColor: 'rgba(231, 76, 60, 0.1)',
            fill: false,
            tension: 0.4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1
            }
          }
        }
      }
    });

  } catch (error) {
    console.error('Errore caricamento grafico mensile:', error);
    document.getElementById('monthlyChart').parentNode.innerHTML =
      '<div class="error">Errore caricamento grafico mensile</div>';
  }
}

// Grafico Richieste per Tipo
async function loadTypeChart() {
  try {
    const response = await fetch('/api/analytics/by-type', { credentials: 'same-origin' });
    const data = await response.json();

    const ctx = document.getElementById('typeChart').getContext('2d');

    if (chartInstances.type) {
      chartInstances.type.destroy();
      chartInstances.type = null;
    }

    const colors = [
      '#3498db', '#2ecc71', '#f39c12', '#e74c3c', '#9b59b6',
      '#34495e', '#1abc9c', '#e67e22', '#95a5a6', '#f1c40f'
    ];

    chartInstances.type = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: data.map(item => item.tipo || 'Non specificato'),
        datasets: [{
          data: data.map(item => item.count),
          backgroundColor: colors.slice(0, data.length),
          borderWidth: 2,
          borderColor: '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
          }
        }
      }
    });

  } catch (error) {
    console.error('Errore caricamento grafico tipi:', error);
    document.getElementById('typeChart').parentNode.innerHTML =
      '<div class="error">Errore caricamento grafico tipi</div>';
  }
}

// Grafico Top Dipendenti
async function loadEmployeesChart() {
  try {
    const response = await fetch('/api/analytics/top-employees', { credentials: 'same-origin' });
    const data = await response.json();

    const ctx = document.getElementById('employeesChart').getContext('2d');

    if (chartInstances.employees) {
      chartInstances.employees.destroy();
      chartInstances.employees = null;
    }

    chartInstances.employees = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: data.map(item => item.username),
        datasets: [
          {
            label: 'Totali',
            data: data.map(item => item.total_richieste),
            backgroundColor: '#3498db',
            borderColor: '#2980b9',
            borderWidth: 1
          },
          {
            label: 'Approvate',
            data: data.map(item => item.approvate),
            backgroundColor: '#2ecc71',
            borderColor: '#27ae60',
            borderWidth: 1
          }
        ]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
          },
          tooltip: {
            callbacks: {
              title: function(context) {
                return 'Dipendente: ' + context[0].label;
              }
            }
          }
        },
        scales: {
          x: {
            beginAtZero: true,
            ticks: {
              stepSize: 1
            }
          },
          y: {
            ticks: {
              font: {
                size: 11
              }
            }
          }
        }
      }
    });

  } catch (error) {
    console.error('Errore caricamento grafico dipendenti:', error);
    document.getElementById('employeesChart').parentNode.innerHTML =
      '<div class="error">Errore caricamento grafico dipendenti</div>';
  }
}

// Grafico Distribuzione Ore
async function loadHoursChart() {
  try {
    const response = await fetch('/api/analytics/hours-distribution', { credentials: 'same-origin' });
    const data = await response.json();

    const ctx = document.getElementById('hoursChart').getContext('2d');

    if (chartInstances.hours) {
      chartInstances.hours.destroy();
      chartInstances.hours = null;
    }

    const colors = ['#3498db', '#2ecc71', '#f39c12', '#e74c3c'];

    chartInstances.hours = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: data.map(item => item.categoria),
        datasets: [{
          data: data.map(item => item.count),
          backgroundColor: colors.slice(0, data.length),
          borderWidth: 2,
          borderColor: '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
          }
        }
      }
    });

  } catch (error) {
    console.error('Errore caricamento grafico ore:', error);
    document.getElementById('hoursChart').parentNode.innerHTML =
      '<div class="error">Errore caricamento grafico ore</div>';
  }
}

// Cleanup automatico quando si esce dalla pagina
window.addEventListener('beforeunload', () => {
  Object.values(chartInstances).forEach(chart => {
    if (chart && typeof chart.destroy === 'function') {
      chart.destroy();
    }
  });
});

// Funzione toast migliorata
function showToast(message, type = 'info') {
  if (typeof window.showToast === 'function') {
    window.showToast(message, type);
  } else {
    // Fallback toast visibile
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed; top: 20px; right: 20px; z-index: 10000;
      padding: 15px 20px; border-radius: 8px; color: white; font-size: 14px;
      background: ${type === 'success' ? '#2ecc71' : type === 'error' ? '#e74c3c' : type === 'warning' ? '#f39c12' : '#3498db'};
      box-shadow: 0 4px 8px rgba(0,0,0,0.2);
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
  }
}

// Setup dei pulsanti di upgrade per utenti FREE
function setupUpgradeButtons() {
  const upgradeBtn = document.getElementById('upgradeBtn');
  const licenseKeyBtn = document.getElementById('licenseKeyBtn');
  const licenseModal = document.getElementById('licenseModal');
  const closeLicenseModal = document.getElementById('closeLicenseModal');
  const activateLicenseBtn = document.getElementById('activateLicenseBtn');
  const cancelLicenseBtn = document.getElementById('cancelLicenseBtn');

  if (upgradeBtn) {
    upgradeBtn.addEventListener('click', () => {
      if (window.StripeUpgrade) {
        const upgradeSystem = new window.StripeUpgrade();
        upgradeSystem.showUpgradeDialog();
      } else {
        console.warn('Sistema Stripe non disponibile');
        showToast('❌ Sistema upgrade non disponibile. Riprova tra poco.', 'error');
      }
    });
  }

  if (licenseKeyBtn) {
    licenseKeyBtn.addEventListener('click', () => {
      licenseModal.style.display = 'flex';
    });
  }

  if (closeLicenseModal) {
    closeLicenseModal.addEventListener('click', () => {
      licenseModal.style.display = 'none';
    });
  }

  if (cancelLicenseBtn) {
    cancelLicenseBtn.addEventListener('click', () => {
      licenseModal.style.display = 'none';
    });
  }

  if (activateLicenseBtn) {
    activateLicenseBtn.addEventListener('click', async () => {
      const licenseKey = document.getElementById('licenseKeyInput').value.trim();
      const licenseMsg = document.getElementById('licenseMsg');

      if (!licenseKey) {
        licenseMsg.innerHTML = '<div class="message error">Inserisci una license key valida</div>';
        return;
      }

      try {
        const response = await fetch('/api/license/activate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ licenseKey })
        });

        const result = await response.json();

        if (result.success) {
          licenseMsg.innerHTML = '<div class="message success">License key attivata con successo!</div>';
          setTimeout(() => {
            licenseModal.style.display = 'none';
            window.location.reload();
          }, 2000);
        } else {
          licenseMsg.innerHTML = `<div class="message error">${result.message || 'License key non valida'}</div>`;
        }
      } catch (error) {
        console.error('Errore attivazione licenza:', error);
        licenseMsg.innerHTML = '<div class="message error">Errore durante l\'attivazione della licenza</div>';
      }
    });
  }

  // Chiudi modal cliccando fuori
  if (licenseModal) {
    licenseModal.addEventListener('click', (e) => {
      if (e.target === licenseModal) {
        licenseModal.style.display = 'none';
      }
    });
  }
}
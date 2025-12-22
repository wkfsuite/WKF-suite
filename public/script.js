// public/script.js
const form = document.getElementById('permessoForm');
const typeSelect = document.getElementById('tipoSelect');
const hoursWrap = document.getElementById('oreWrap');
const fromWrap = document.getElementById('dalWrap');
const toWrap = document.getElementById('alWrap');
const messageDiv = document.getElementById('msg');

function toggleLeaveType() {
  const type = document.getElementById("tipo").value;
  document.querySelectorAll('.permesso-box').forEach(div => div.style.display = "none");

  if (type === "giornaliero") {
    document.getElementById("giornaliero").style.display = "block";
  } else if (type === "piu_giorni") {
    document.getElementById("piu_giorni").style.display = "block";
  } else if (type === "ore") {
    document.getElementById("ore").style.display = "block";
  }
}

// Form submission
function toggleLeaveType() {
  const type = document.getElementById("tipo").value;
  document.querySelectorAll('.permesso-box').forEach(div => div.style.display = "none");

  if (type === "giornaliero") {
    document.getElementById("giornaliero").style.display = "block";
  } else if (type === "piu_giorni") {
    document.getElementById("piu_giorni").style.display = "block";
  } else if (type === "ore") {
    document.getElementById("ore").style.display = "block";
  }
}

// Form submission
document.getElementById('permessoForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const type = document.getElementById('tipo').value;
  const notes = document.getElementById('note').value.trim();
  const employeeId = sessionStorage.getItem('matricola');

  // Validation
  if (!type) {
    alert("Select the leave type");
    return;
  }

  const requestData = { type, notes, employeeId };

  if (type === "giornaliero") {
    const data = document.getElementById('dayDate').value;
    if (!data) {
      alert("Enter the leave date");
      return;
    }
    requestData.data = data;
  } else if (type === "piu_giorni") {
    const dateFrom = document.getElementById('dateFrom').value;
    const dateTo = document.getElementById('dateTo').value;
    if (!dateFrom || !dateTo) {
      alert("Enter the from/to date range");
      return;
    }
    requestData.dateFrom = dateFrom;
    requestData.dateTo = dateTo;
  } else if (type === "ore") {
    const data = document.getElementById('hoursDate').value;
    const startTime = document.getElementById('startTime').value;
    const endTime = document.getElementById('endTime').value;
    if (!data || !startTime || !endTime) {
      alert("Enter date and times for hourly leave");
      return;
    }
    requestData.data = data;
    requestData.startTime = startTime;
    requestData.endTime = endTime;
  }

  try {
    const res = await fetch('/api/richieste', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestData)
    });

    if (res.ok) {
       alert("Request submitted successfully!");
      e.target.reset();
      document.querySelectorAll('.permesso-box').forEach(div => div.style.display = "none");
    } else {
      const err = await res.json();
      alert("Error: " + (err.error || "Unable to send request"));
    }
  } catch (error) {
    console.error("Fetch error:", error);
    alert("Server connection error");
  }
});




const btnLoadMyRequests = document.getElementById('btnLoadMyRequests');
const employeeIdLookup = document.getElementById('employeeIdLookup');
const myRequestsTableBody = document.querySelector('#myRequestsTable tbody');

async function loadMyRequests() {
  const m = (employeeIdLookup.value || '').trim();
  if (!m) return;
  const res = await fetch(`/api/richieste/mie?matricola=${encodeURIComponent(m)}`);
  const data = await res.json();
  myRequestsTableBody.innerHTML = '';
  (data || []).forEach(r => {
    const tr = document.createElement('tr');
    const statusClass = r.stato === 'approvata' ? 'ok' : (r.stato === 'rifiutata' ? 'no' : 'pending');
    tr.innerHTML = `
      <td>${new Date(r.createdAt).toLocaleString()}</td>
      <td>${r.tipo}</td>
      <td>${r.dal || '-'}</td>
      <td>${r.al || '-'}</td>
      <td>${r.ore || '-'}</td>
      <td><span class="status ${statusClass}">${r.stato}</span></td>
      <td><a class="btn secondary" href="/stampa/${r.id}" target="_blank">Print</a></td>
    `;
    myRequestsTableBody.appendChild(tr);
  });
}
if (btnLoadMyRequests) btnLoadMyRequests.addEventListener('click', loadMyRequests);

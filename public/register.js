document.getElementById("registerForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();
  const ruolo = document.getElementById("ruolo").value;
  const matricola = document.getElementById("matricola").value.trim();
  const email = document.getElementById("email").value.trim();
  const registerMsg = document.getElementById("registerMsg");

  // Validazioni dettagliate
  if (!username || !password || !ruolo || !matricola) {
    showError("Tutti i campi sono obbligatori");
    return;
  }

  if (username.length < 3) {
    showError("Username deve essere almeno 3 caratteri");
    return;
  }

  if (!/^[a-zA-Z0-9._-]+$/.test(username)) {
    showError("Username può contenere solo lettere, numeri, punti, trattini e underscore");
    return;
  }

  if (password.length < 8) {
    showError("Password deve essere almeno 8 caratteri per sicurezza");
    return;
  }

  if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
    showError("Password deve contenere almeno: 1 minuscola, 1 maiuscola, 1 numero");
    return;
  }

  if (!/^[A-Za-z0-9]+$/.test(matricola)) {
    showError("Matricola può contenere solo lettere e numeri");
    return;
  }

  if (matricola.length < 2) {
    showError("Matricola deve essere almeno 2 caratteri");
    return;
  }

  // Validazione email opzionale
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showError("Inserisci un indirizzo email valido");
    return;
  }

  function showError(message) {
    registerMsg.style.color = "red";
    registerMsg.textContent = message;
  }

  function showSuccess(message) {
    registerMsg.style.color = "green";
    registerMsg.textContent = message;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 secondi timeout
    
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, ruolo, matricola, email: email || null }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      showSuccess("UTENTE REGISTRATO CORRETTAMENTE");
      document.getElementById("registerForm").reset();
      setTimeout(() => {
        window.location.href = "login.html";
      }, 2500);
    } else {
      const data = await res.json();
      const errorMessage = data.details ? `${data.error}: ${data.details}` : data.error;
      showError(errorMessage || "Errore registrazione");
    }
  } catch (err) {
    console.error("Errore:", err);
    if (err.name === 'AbortError') {
      showError("Timeout - richiesta troppo lenta");
    } else {
      showError("Errore di connessione al server");
    }
  }
});

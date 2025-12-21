document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");
  const loginMsg = document.getElementById("loginMsg");

  // Controlla se c'è un parametro timeout nell'URL
  const urlParams = new URLSearchParams(window.location.search);
  const timeoutType = urlParams.get('timeout');
  if (timeoutType === 'dipendente') {
    showError("Sessione scaduta. I dipendenti possono rimanere connessi solo per 5 minuti.");
  }

  function showError(message) {
    loginMsg.style.color = "red";
    loginMsg.textContent = message;
  }

  function showSuccess(message) {
    loginMsg.style.color = "green";
    loginMsg.textContent = message;
  }

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();

    if (!username || !password) {
      showError("Inserisci username e password");
      return;
    }

    if (username.length < 3) {
      showError("Username deve essere almeno 3 caratteri");
      return;
    }

    if (password.length < 8) {
      showError("Password deve essere almeno 8 caratteri");
      return;
    }

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
        credentials: "same-origin"  // << essenziale per cookie di sessione
      });
      const data = await res.json();

      if (!res.ok) {
        const errorMessage = data.details ? `${data.error}: ${data.details}` : data.error;
        showError(errorMessage || "Errore login");
        return;
      }

      // Salva ruolo, username e userId in sessionStorage per uso JS
      sessionStorage.setItem("ruolo", data.ruolo);
      sessionStorage.setItem("username", data.username || username);
      if (data.userId) {
        sessionStorage.setItem("userId", data.userId);
      }

      // Notifica toast di successo
      toastManager.loginSuccess(data.username || username, data.ruolo);

      // Redirect automatico dopo un breve delay per mostrare toast
      setTimeout(() => {
        window.location.href = data.redirectTo || "/dashboard.html";
      }, 1500);

    } catch (err) {
      loginMsg.textContent = "Errore server, riprova";
      console.error(err);
    }
  });
});

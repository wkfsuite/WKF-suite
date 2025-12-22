document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");
  const loginMsg = document.getElementById("loginMsg");

  // Check if there's a timeout parameter in the URL
  const urlParams = new URLSearchParams(window.location.search);
  const timeoutType = urlParams.get('timeout');
  if (timeoutType === 'dipendente') {
    showError("Session expired. Employees can stay logged in for only 5 minutes.");
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
      showError("Enter username and password");
      return;
    }

    if (username.length < 3) {
      showError("Username must be at least 3 characters");
      return;
    }

    if (password.length < 8) {
      showError("Password must be at least 8 characters");
      return;
    }

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
        credentials: "same-origin"  // Essential for session cookies
      });
      const data = await res.json();

      if (!res.ok) {
        const errorMessage = data.details ? `${data.error}: ${data.details}` : data.error;
        showError(errorMessage || "Login error");
        return;
      }

      // Save role, username and userId in sessionStorage for JS use
      sessionStorage.setItem("ruolo", data.ruolo);
      sessionStorage.setItem("username", data.username || username);
      if (data.userId) {
        sessionStorage.setItem("userId", data.userId);
      }

      // Success toast notification
      toastManager.loginSuccess(data.username || username, data.ruolo);

      // Automatic redirect after a short delay to show toast
      setTimeout(() => {
        window.location.href = data.redirectTo || "/dashboard.html";
      }, 1500);

    } catch (err) {
      showError("Server error, please try again.");
      console.error(err);
    }
  });
});

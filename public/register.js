document.getElementById("registerForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();
  const workRole = document.getElementById("ruolo").value;
  const workIdNumber = document.getElementById("matricola").value.trim();
  const email = document.getElementById("email").value.trim();
  const registerMsg = document.getElementById("registerMsg");

  // Detailed validations
  if (!username || !password || !workRole || !workIdNumber) {
    showError("All fields are required");
    return;
  }

  if (username.length < 3) {
    showError("Username must be at least 3 characters");
    return;
  }

  if (!/^[a-zA-Z0-9._-]+$/.test(username)) {
    showError("Username can only contain letters, numbers, dots, dashes, and underscores");
    return;
  }

  if (password.length < 8) {
    showError("Password must be at least 8 characters for security");
    return;
  }

  if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
    showError("Password must contain at least: 1 lowercase, 1 uppercase, 1 number");
    return;
  }

  if (!/^[A-Za-z0-9]+$/.test(workIdNumber)) {
    showError("Employee ID can only contain letters and numbers");
    return;
  }

  if (workIdNumber.length < 2) {
    showError("Employee ID must be at least 2 characters");
    return;
  }

  // Optional email validation
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showError("Please enter a valid email address");
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
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, ruolo: workRole, matricola: workIdNumber, email: email || null }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      showSuccess("USER REGISTERED SUCCESSFULLY");
      document.getElementById("registerForm").reset();
      setTimeout(() => {
        window.location.href = "login.html";
      }, 2500);
    } else {
      const data = await res.json();
      const errorMessage = data.details ? `${data.error}: ${data.details}` : data.error;
      showError(errorMessage || "Registration error");
    }
  } catch (err) {
    console.error("Error:", err);
    if (err.name === 'AbortError') {
      showError("Timeout - request is too slow");
    } else {
      showError("Server connection error");
    }
  }
});

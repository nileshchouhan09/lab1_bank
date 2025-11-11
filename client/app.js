// app.js - frontend wiring (registration + login + transfer + minimal auth storage)
const API_BASE = "http://bank.local:4000"; // change to http://<vm-ip>:4000 if needed

// ---------- Helpers ----------
function showMsg(el, txt, isError = false) {
  if(!el) return;
  el.textContent = txt;
  el.style.color = isError ? "#b91c1c" : "#0b8043";
}
function setLoading(button, isLoading) {
  if(!button) return;
  button.disabled = isLoading;
  button.style.opacity = isLoading ? "0.7" : "1";
}

// ---------- REGISTER ----------
document.getElementById("registerForm")?.addEventListener("submit", async (e)=>{
  e.preventDefault();

  const registerMsg = document.getElementById("register-msg");
  const submitBtn = document.getElementById("regSubmit");

  // basic client-side checks
  const pwd = document.getElementById("regPassword").value;
  const pwd2 = document.getElementById("regPasswordConfirm").value;
  if(pwd !== pwd2) {
    showMsg(registerMsg, "Passwords do not match", true);
    return;
  }

  // build form data
  const formData = new FormData();
  formData.append("fullName", document.getElementById("regName").value.trim());
  formData.append("dob", document.getElementById("regDob").value);
  formData.append("email", document.getElementById("regEmail").value.trim());
  formData.append("phone", document.getElementById("regPhone").value.trim());
  formData.append("address", document.getElementById("regAddress").value.trim());
  formData.append("idNumber", document.getElementById("regIdNumber").value.trim());
  formData.append("password", pwd);
  const fileInput = document.getElementById("regIdFile");
  if(fileInput.files && fileInput.files[0]) formData.append("idFile", fileInput.files[0]);

  try {
    setLoading(submitBtn, true);
    showMsg(registerMsg, "Registering...");

    const res = await fetch(`${API_BASE}/api/register`, {
      method: "POST",
      body: formData
    });

    const text = await res.text();
    if(!res.ok) {
      showMsg(registerMsg, text || "Registration failed", true);
      setLoading(submitBtn, false);
      return;
    }

    // Registration succeeded. Try auto-login to obtain user id (server /api/login returns id on success)
    showMsg(registerMsg, "Registered. Logging in...");
    const loginPayload = { identifier: document.getElementById("regEmail").value.trim(), password: pwd };

    const loginRes = await fetch(`${API_BASE}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(loginPayload)
    });

    if(!loginRes.ok) {
      // registration successful but login failed
      showMsg(registerMsg, "Registered but auto-login failed. Please login manually.", true);
      setLoading(submitBtn, false);
      return;
    }

    const loginJson = await loginRes.json();
    // store a minimal session: userId
    if(loginJson && loginJson.id) {
      localStorage.setItem("userId", String(loginJson.id));
      localStorage.setItem("loggedIn", "1");
      showMsg(registerMsg, "Registration & login successful! Redirecting...");
      setTimeout(()=> { location.href = "dashboard.html"; }, 800);
    } else {
      showMsg(registerMsg, "Registered but server did not return user id. Please login.", true);
    }
  } catch (err) {
    console.error("Register error:", err);
    showMsg(registerMsg, "Network or server error: " + err.message, true);
  } finally {
    setLoading(submitBtn, false);
  }
});

// ---------- LOGIN ----------
document.getElementById("loginForm")?.addEventListener("submit", async (e)=>{
  e.preventDefault();
  const loginMsg = document.getElementById("login-msg");
  const id = document.getElementById("loginIdentifier").value.trim();
  const pwd = document.getElementById("loginPassword").value;

  if(!id || !pwd) { showMsg(loginMsg, "Fill identifier and password", true); return; }
  showMsg(loginMsg, "Logging in...");

  try {
    const res = await fetch(`${API_BASE}/api/login`, {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ identifier: id, password: pwd })
    });

    if(!res.ok) {
      const txt = await res.text();
      showMsg(loginMsg, txt || "Invalid login details ❌", true);
      return;
    }

    const data = await res.json();
    if(data && data.id) {
      localStorage.setItem("userId", String(data.id));
      localStorage.setItem("loggedIn", "1");
      showMsg(loginMsg, "Login successful. Redirecting...");
      setTimeout(()=> location.href = "dashboard.html", 600);
    } else {
      showMsg(loginMsg, "Login succeeded but no user id returned", true);
    }
  } catch(err) {
    console.error("Login error", err);
    showMsg(loginMsg, "Network error: " + err.message, true);
  }
});

// ---------- DASHBOARD (client fetch user profile when page loads) ----------
async function loadDashboard() {
  try {
    const uid = localStorage.getItem("userId");
    if(!uid) return;

    // fetch user profile
    const res = await fetch(`${API_BASE}/api/user/${encodeURIComponent(uid)}`);
    if(!res.ok) return;
    const user = await res.json();
    if(!user) return;

    // populate DOM elements if present
    const userNameEl = document.getElementById("userName");
    if(userNameEl) userNameEl.textContent = user.fullName || user.email || "User";

    const balanceEl = document.getElementById("balance");
    if(balanceEl) {
      // we don't have balance in DB — show placeholder or compute from transactions API in future
      balanceEl.textContent = (user.balance !== undefined) ? user.balance : "0.00";
    }
  } catch (err) {
    console.warn("loadDashboard error", err);
  }
}

// call loadDashboard on dashboard page
if(location.pathname.endsWith("dashboard.html")) {
  document.addEventListener("DOMContentLoaded", loadDashboard);
}

// ---------- TRANSFER ----------
document.getElementById("transferForm")?.addEventListener("submit", async (e)=>{
  e.preventDefault();
  const transferMsg = document.getElementById("transfer-msg");
  const acc = document.getElementById("receiverAcc").value.trim();
  const name = document.getElementById("receiverName").value.trim();
  const amount = Number(document.getElementById("amount").value);
  const uid = localStorage.getItem("userId");

  if(!uid) { showMsg(transferMsg, "Not logged in", true); return; }
  if(!acc || !name || !amount || amount <= 0) { showMsg(transferMsg, "Fill valid details", true); return; }

  showMsg(transferMsg, "Processing...");
  try {
    const res = await fetch(`${API_BASE}/api/transfer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: uid, receiver: acc, amount })
    });

    const txt = await res.text();
    if(!res.ok) {
      showMsg(transferMsg, txt || "Transfer failed", true);
    } else {
      showMsg(transferMsg, "Transaction Successful ✅");
      // optionally reload dashboard or transactions
    }
  } catch(err) {
    console.error("transfer error", err);
    showMsg(transferMsg, "Network error: " + err.message, true);
  }
});

// ---------- LOGOUT ----------
function logout() {
  localStorage.removeItem("userId");
  localStorage.removeItem("loggedIn");
  location.href = "login.html";
}

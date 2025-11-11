const API_BASE = "http://bank.local:4000";

// REGISTER
document.getElementById("registerForm")?.addEventListener("submit", async (e)=>{
  e.preventDefault();

  if (regPassword.value !== regPasswordConfirm.value) {
    registerMsg.textContent = "Passwords do not match";
    return;
  }

  const formData = new FormData();
  formData.append("fullName", regName.value);
  formData.append("dob", regDob.value);
  formData.append("email", regEmail.value);
  formData.append("phone", regPhone.value);
  formData.append("address", regAddress.value);
  formData.append("idNumber", regIdNumber.value);
  formData.append("password", regPassword.value);
  formData.append("idFile", regIdFile.files[0]);

  const res = await fetch(`${API_BASE}/api/register`, { method:"POST", body: formData });
  registerMsg.textContent = res.ok ? "Account created successfully ✅" : "Failed to register";
});

// LOGIN
document.getElementById("loginForm")?.addEventListener("submit", async (e)=>{
  e.preventDefault();

  const payload = {
    identifier: loginIdentifier.value,
    password: loginPassword.value,
  };

  const res = await fetch(`${API_BASE}/api/login`, {
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify(payload)
  });

  if(res.ok){
    location.href = "dashboard.html";
  } else {
    loginMsg.textContent = "Invalid login details ❌";
  }
});

// TRANSFER
document.getElementById("transferForm")?.addEventListener("submit", (e)=>{
  e.preventDefault();
  transferMsg.textContent = "Transaction Successful ✅";
});

// LOGOUT
function logout() {
  localStorage.clear();
  location.href = "login.html";
}

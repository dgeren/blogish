const loginForm = document.getElementById("signin-form");
const loginLink = document.getElementById("toggle-login-form");
loginLink.addEventListener("click", event => {
  event.preventDefault();
  loginForm.style.display = loginForm.style.display === "none" ? "block" : "none";
});
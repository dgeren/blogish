"use strict";

const form = document.querySelector('form');

form.addEventListener('submit', async e => {
  e.preventDefault();

  const email = form.email.value;
  const password = form.password.value;
  // const errorMessage = form.loginError;

  try {
    loginError.style = "display: none;";
    const res = await fetch('/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
      headers: { 'Content-Type': 'application/json' }
    });
    const data = await res.json();
    if (data.user) location.assign('/');
    if (res.status == 400) {
      console.log("login.js > loginError", loginError);
      loginError.style = "display: block;";
    }
  }
  catch (err){
    console.log(err);
  }
});
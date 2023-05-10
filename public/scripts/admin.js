const toolbar = document.getElementById('toolbar');
const elements = document.querySelectorAll('.form-el');
const passwordFields = document.getElementById('passwordFields');
const errorField = document.getElementById('error-password');

let countFocusChange = 0;

// * COFIRM PASSWORD
const comparePasswordFields = () => {

  if(password.value !== password2.value) {
    password.focus;
    errorField.innerHTML = "The passwords do not match.";
    return false;
  } else {
    errorField.innerHTML = "";
    return true;
  }
}

const isEmailConfirmed = () => {
  const confirmField = document.getElementById('confirm-email');
  if(confirmField.checked) return true;

  document.getElementById('error-confirm-email').innerHTML = "If you did not reveive an email, check the email address. If you did, check this box.";
  return false;
}

// * IF PASSWORD FIELDS EXIST ADD EVENT LISTENERS
if(passwordFields.children.length !== 0) {

  document.getElementById('password').addEventListener('blur', function() {
    countFocusChange === 0 ? ++countFocusChange : comparePasswordFields();
  });

  document.getElementById('password2').addEventListener('blur', comparePasswordFields);
  
}


// * PREPARE USER DATA 
const getData = () => {

  // validate password fields match & confirm emaail
  if(!comparePasswordFields || !isEmailConfirmed()) return false;
  
  // initialize variables
  const data = {};
  const list = [ "email", "password", "pseudonym", "byline", "shortText", "longText" ];

  // populate the easy items
  for(const item of elements.values()) {
    if(list.includes(item.name)) data[item.name] = item.value;
  };
  
  // populate the radio button selection
  const radios = document.querySelectorAll('input[type="radio"]');
  radios.forEach(radio => {
    if(radio.checked === true) data.role = radio.value;
  });

  return data;
}


// * CREATE USER
const save = async () => {
  try {
    const user = getData();
    if(!user) throw error();

    const res = await fetch('/createAccount', {
      method: 'POST',
      body: JSON.stringify({ user }),
      headers: { 'Content-Type': 'application/json' }
    });

    const data = await res.json();
    if (data.error) {
      console.log("🔸 error in save function"); // 🔴
    }
  } catch (err) {
    console.log(err);
  }
}


// * PREIVEW CHANGES TO USER DATA
const preview = async () => {
  console.log("🔸 preview"); // 🔴
}


// * REMOVE USER DATA
const del = async () => {
  console.log("🔸 del"); // 🔴
}


toolbar.addEventListener('click', async e => {
  e.preventDefault();
  const target = e.target.name;

  if(target === "save")    save();
  if(target === "preview") preview();
  if(target === "del")     del();

});
const toolbar = document.getElementById('toolbar');
const elements = document.querySelectorAll('.form-el');

let countFocusChange = 0;

// * COFIRM PASSWORD
const comparePasswordFields = () => {
  const password = document.getElementById('password');
  const password2 = document.getElementById('password2');
  const errorField = document.getElementById('error-password');

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


// * OPERATIONS
password.addEventListener('blur', () => {
  // ! password may return an error when the page does not render it
  countFocusChange === 0 ? ++countFocusChange : comparePasswordFields();
});

password2.addEventListener('blur', comparePasswordFields);

toolbar.addEventListener('click', async e => {
  e.preventDefault();
  const target = e.target.name;

  if(target === "save")    save();
  if(target === "preview") preview();
  if(target === "del")     del();

});
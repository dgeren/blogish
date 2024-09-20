"use strict";

const toolbar = document.getElementById('toolbar');

// * VALIDATION SUPPORT

const fields = {
  role: {
    field: document.getElementById('role'),
    error: document.getElementById('error-select-role'),
  },
  email: {
    field: document.getElementById('email'),
    error: document.getElementById('error-email'),
  },
  password: {
    field: document.getElementById('password'),
    error: document.getElementById('error-password'),
    min: 8,
    max: 64
  },
  confirm: {
    field: document.getElementById('confirm'),
    error: document.getElementById('error-confirm'),
  },
  pseudonym: {
    field: document.getElementById('pseudonym'),
    error: document.getElementById('error-pseudonym'),
    label: 'pseudonym',
    min: 4,
    max: 64
  },
  byline: {
    field: document.getElementById('byline'),
    error: document.getElementById('error-byline'),
    label: 'byline',
    min: 8,
    max: 512
  },
  shortText: {
    field: document.getElementById('shortText'),
    error: document.getElementById('error-shortText'),
    label: 'short description',
    min: 8,
    max: 1024
  },
  longText: {
    field: document.getElementById('longText'),
    error: document.getElementById('error-longText'),
    label: 'long description',
    min: 8,
    max: 12000
  }
}

const areFieldsFilled = function(){
  let count = 0;
  for(key in fields){
    if(fields[key].field.value === "") count++;
  }
  return count = 0 ? true : false;
}


// * DOES THE PASSWORD MEET REQUIREMENTS
const validatePasswordContent = function(content) {
  const len = content.length;
  const regex = new RegExp(
    /^(?!.*([\,\.\[\]\(\)\{\}\$\/\\]))(?=.*([a-z]))(?=.*([A-Z]))(?=.*([0-1]))(?=.*([%\!@#-\+\?¡]))/
  );
  if(len === 0) return `Password field blank. Field required.`;
  if(len < 8 || len > 64) return `Your password length: ${len}. See requirements.`;
  if(content.includes(' ')) return 'Spaces in passwords not allowed.';
  if(!regex.test(content)) return `Invalid password. See requirements.`;
  return "";
}


// * VALIDATE EMAIL
const validateEmail = function(){
  const email = fields.email.field.value;
  const regex = new RegExp(/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/);
  fields.email.error.innerHTML = (regex).test(email) ? "Invalid email address." : "";
  if(isSaveReady) contentValid();
}


// * VALIDATE PASSWORD
const validatePassword = function(){
  const password = fields.password.field.value;
  const result = validatePasswordContent(password);
  fields.password.error.innerHTML = result;
  if(isSaveReady) contentValid();
}


// * VALIDATE CONFIRM
const validateConfirm = function(){
  const password = fields.password.field.value;
  const confirm = fields.confirm.field.value;

  const message = confirm !== password ?
    `Passwords do not match.` :
    validatePasswordContent(confirm);
  
  fields.confirm.error.innerHTML = message;
  if(isSaveReady) contentValid();
}


// * VALIDATE PSEUDONYM, BYLINE, SHORT TEXT, AND LONG TEXT
const validateContents = function(ev, ...more){

  let message = "";
  const id =      ev.target.id ?? more[0]; // 🟢 stopped here
  /*
  trying to get the the id to work with either the event variable ev or 
  with the first entry in the more which should be supplied as it was before:
  as text with the id value from the HTML. IE, if ev.target.id === null || undefined
  then use the first entry in the more array
  */
  const obj =     fields[id];
  const content = obj.field.value;
  const len =     content.length;

  if(len === 0) message = `A ${obj.label} required.`;
  else if(len < obj.min || len > obj.max) message = `Your ${obj.label} length: ${len}. See requirements.`;
  obj.error.innerHTML = message;
  if(id === 'longText') isSaveReady = true;
  if(isSaveReady) contentValid();
}


// * IS THE FORM READY FOR SUBMISSION
const validateAll = function(){
  let ready = true;
  for(const key in fields) if(fields[key].error.value !== "") ready = false;
  document.getElementById('tools_save').disalbed = ready;

}


// * PREPARE USER DATA 
const getData = function(){

  // validate password fields match & confirm emaail
  if(!comparePasswordFields || !isEmailConfirmed()) return false;
  
  // initialize variables
  const data = {};
  const list = [ "email", "password", "pseudonym", "byline", "shortText", "longText" ];

  // populate the easy items
  for(const item of elements.values()) { // 🔴 this is likely broken after deletions at the top
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
const save = async function(){
  
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
const preview = async function(){
  console.log("🔸 preview"); // 🔴
}


// * REMOVE USER DATA
const del = async function(){
  console.log("🔸 del"); // 🔴
}


// * EVENT LISTENERS
toolbar.addEventListener('click', async function(e){
  e.preventDefault();
  const target = e.target.name;
  if(target === "save")    save();
  if(target === "preview") preview();
  if(target === "del")     del();
});

fields.email.field.addEventListener(    'blur', validateEmail);
fields.password.field.addEventListener( 'blur', validatePassword);
fields.confirm.field.addEventListener(  'blur', validateConfirm);
fields.pseudonym.field.addEventListener('blur', validateContents);
fields.byline.field.addEventListener(   'blur', validateContents);
fields.shortText.field.addEventListener('blur', validateContents);
fields.longText.field.addEventListener( 'blur', validateContents);


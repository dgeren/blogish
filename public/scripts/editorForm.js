const form = document.querySelector('form');
const formElements = document.querySelectorAll('.form-el');

const save_server = async () => {
  let postData = {};
  // const formElements = document.querySelectorAll('.form-el');
  formElements.forEach(el => {
    const name = el.attributes.getNamedItem('name').value;
    postData[name] =
      name === 'published' ? el.checked :
      name === 'content' ? el.value :
      el.value;
  });

  try {
    const res = await fetch('/editor', {
      method: 'POST',
      body: JSON.stringify(postData),
      headers: { 'Content-Type': 'application/json' }
    });
    // const response = res.json();
    // the response will indicate if the save failed or succeeded

  } catch(err) {
    console.log('save post error', err);
  }
}

const save_local  = async () => { console.log('save_local was clicked'); }
const toggleView  =       () => { console.log('toggleView was clicked'); }
const reader      =       () => { console.log('reader was clicked'); }
const revert      = async () => { console.log('revert was clicked'); }
const del         = async () => { console.log('del was clicked'); }

form.addEventListener('click', async e => {
  e.preventDefault();
  const targetName = e.target.name;

  if(targetName === "save_server") save_server();
  if(targetName === "save_local")  save_local();
  if(targetName === "toggleView")  toggleView();
  if(targetName === "revert")      revert();
  if(targetName === "del")         del();

});
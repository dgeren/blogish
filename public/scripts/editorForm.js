const form = document.querySelector('form');
const formElements = document.querySelectorAll('.form-el');
const message = document.querySelector('#message');


const save_server = async () => {
  let postData = {};
  formElements.forEach(el => {
    const name = el.attributes.getNamedItem('name').value;
    postData[name] =
      name === 'published' ? el.checked :
      name === 'content' ? el.value :
      el.value;
  });


  await fetch('/editor', {
    method: "POST",
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(postData)
  })
  .then(res => res.json())
  .then(res => {
    console.log(res.post);
    if(res.message) message.innerHTML = res.message;
  })
  .catch(() => {
    console.log('error - error');
  });

  // try {
  //   const res = await fetch('/editor', {
  //     method: 'POST',
  //     body: JSON.stringify(postData),
  //     headers: { 'Content-Type': 'application/json' }
  //   });
  //   console.log(res);

  // } catch(err) {
  //   console.log('save post error', err);
  // }
}

const reader = () => {
  const postID = form.postID.value;
  location.assign("../reader/id/" + postID);
}


const save_local  = async () => { console.log('save_local was clicked'); }
const toggleView  =       () => { console.log('toggleView was clicked'); }
const revert      = async () => { console.log('revert was clicked'); }
const del         = async () => { console.log('del was clicked'); }

form.addEventListener('click', async e => {
  e.preventDefault();
  const targetName = e.target.name;

  if(targetName === "save_server") save_server();
  if(targetName === "save_local")  save_local();
  if(targetName === "toggleView")  toggleView();
  if(targetName === "reader")      reader();
  if(targetName === "revert")      revert();
  if(targetName === "del")         del();

});
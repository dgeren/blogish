const form = document.querySelectorAll('form');
const formElements = document.querySelectorAll('.form-el'); // used to upload changes
const tools = document.querySelectorAll('.tools'); // toolbar for editor
const message = document.querySelector('#message'); // used to populate any incoming messages
const preview = document.querySelector('#preview'); // used to toggle display
const editorElements = document.querySelectorAll('.editor'); // used in toggleView
const listElements = document.querySelectorAll('.list'); // used in toggleView
const readerElements = document.querySelectorAll('.reader'); // used in toggleView


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
  .then(res => { if(res.message) message.innerHTML = res.message; })
  .catch(() => { console.log('error - error'); });
}

const reader = () => {
  const postID = form.postID.value;
  location.assign("../reader/id/" + postID);
}

const toggleView  = () => {
  console.log('updatePreview clicked');

  // prep title
  const title = `<a>${editorElements[0].value}</a>`

  // prep content & shortened content
  const content = editorElements[2].value;
  const shortContent = content.split(" ").slice(0, 25).join(" ");

  // prep tags
  const tagHTML = [];
  let tags = editorElements[3].value;
  tags = tags.split(", ");
  tags.forEach(tag => {
    tagHTML.push(`<a href="/tag/${tag}">${tag}</a>`);
  });
  const tagString = tagHTML.join(', ');
  
  // populate data
  listElements[0].innerHTML = readerElements[0].innerHTML = title;
  listElements[1].innerHTML = readerElements[1].innerHTML = editorElements[1].value;
  listElements[2].value = shortContent;
  readerElements[2].innerHTML = content;
  listElements[3].innerHTML = readerElements[3].innerHTML = tagString;
}


const save_local  = async () => { console.log('save_local clicked'); }
const revert      = async () => { console.log('revert clicked'); }
const del         = async () => { console.log('del clicked'); }


form[0].addEventListener('click', async e => {
  e.preventDefault();
  const targetName = e.target.name;

  if(targetName === "save_server")    save_server();
  if(targetName === "save_local")     save_local();
  if(targetName === "updatePreview")  toggleView();
  if(targetName === "reader")         reader();
  if(targetName === "revert")         revert();
  if(targetName === "del")            del();

});
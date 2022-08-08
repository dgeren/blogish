// ! 🔸 THIS IS A NEW VERSION OF THE EDITORFORM SCRIPT NOT YET IMPLEMENTED 
// TODO this is the current working file 20220713

const allElements = document.querySelectorAll('*');
const toolbar = document.getElementById('toolbar');
const formElements = document.querySelectorAll('.form-el'); // * used to upload changes
const message = document.querySelector('#message'); // used to populate any incoming messages

const els = { preview: document.getElementById('preview' )};
allElements.forEach(el => {
  const _class = el.getAttribute('class');
  
  if(['form-el editor', 'form-el editor publish', 'list', 'reader'].includes(_class))
    Object.defineProperty(els, el.getAttribute('id'), { value: el });
});


const getDateString = date => {
  const fullMonth = [
    "January", "February", "March", "April", "May", "June", "July",
    "August", "September", "October", "November", "December"
  ];
  return `${fullMonth[date.getMonth()]} ${date.getDate() + 1}, ${date.getFullYear()}`;
}


// * NEW FUNCTION: USE-FETCH FUNCTION FOR DRY 🟢
const useFetch = async fetchReq => {
  const { entryData, method, url } = fetchReq;
  const body = JSON.stringify(entryData);

  return await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json'},
    body
  })
  .then(response => response.text())
  .then(data => data);
}


// * NEW FUNCTION: CREATES ENTRY BJECT TO UPLOAD AND/OR GET HTML VERSION FOR PREVIEW 🟢
const buildEntryObj = () => {
  const entryData = {};
  formElements.forEach(el => entryData[el.attributes.getNamedItem('name').value] = el.value);
  entryData.isPublished = formElements[4].checked;
  return entryData;
}


// * NEW VERSION OF UPLOAD   🟢
const upload = async () => {
  // get entry object from page containing data from the fields
  const entryData = buildEntryObj();

  // prep fetch object anm 
  const entryHtml = await useFetch({
    method: 'POST',
    url: '/editor',
    entryData
  });
  // update preview
  els.preview.innerHTML = entryHtml;

}


// * NEW VERSION: OF UPDATE PREVIEWS FUNCTION
const updatePreview = async () => {
  // get entry object from page containing data from the fields
  const entryData = buildEntryObj();

  // prep fetch object anm 
  const entryHtml = await useFetch({
    method: 'POST',
    url: '/editor_preview',
    entryData
  });
  // update preview
  els.preview.innerHTML = entryHtml;

}


// * OPENS CURRENT ENTRY IN A READER: WARNING: DOES NOT SAVE
const openReader = () => {
  location.assign(`/reader/id/${ els.editor_entryID.value }`);
}


// * REVERTS CURRREMT ENTRY TO THE DATABASE VERSION: WARNING DOES NOT SAVE
const revert = () => location.reload(true);


// * DELETE ENTRY: WARNNING PERMANENT
const del = () => {
  const _id = els.editor_postID.value;
  const httpRequest = new XMLHttpRequest();
  httpRequest.open('DELETE', `/${_id}`, false);
  httpRequest.send();
}


// * OPERATIONS
toolbar.addEventListener('click', async e => {
  e.preventDefault();
  const target = e.target.name;

  if(target === "upload")          upload();
  if(target === "updatePreview")   updatePreview();
  if(target === "openReader")      openReader();
  if(target === "revert")          revert();
  if(target === "del")             del();
});

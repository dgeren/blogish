const allElements = document.querySelectorAll('*');
const toolbar = document.getElementById('toolbar');
const formElements = document.querySelectorAll('.form-el'); // * used to upload changes

const els = {
  preview: document.getElementById('preview'),
  message: document.getElementById('message'),
};
els.message.innerHTML = "";

allElements.forEach(el => {
  const _class = el.getAttribute('class');
  
  if(['form-el editor', 'form-el editor publish', 'list', 'reader'].includes(_class))
    Object.defineProperty(els, el.getAttribute('id'), { value: el });
});

formElements.forEach(item => item.addEventListener('input',
  (e) => {
   document.getElementById('message').innerHTML = "Changes not saved.";
  }));

// ! is this still needed?
// * prepare date string for display
const getDateString = date => {
  const fullMonth = [
    "January", "February", "March", "April", "May", "June", "July",
    "August", "September", "October", "November", "December"
  ];
  return `${fullMonth[date.getMonth()]} ${date.getDate() + 1}, ${date.getFullYear()}`;
}


// * AJAX FETCH
const useFetch = async fetchReq => {
  if(!fetchReq) return "";
  message.innerHTML = "";
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


// * NEW FUNCTION: CREATES ENTRY OBJECT TO UPLOAD AND/OR GET HTML VERSION FOR PREVIEW
const buildEntryObj = () => {
  const entryData = {};
  formElements.forEach(el => entryData[el.attributes.getNamedItem('name').value] = el.value);
  entryData.publish = formElements[4].checked;
  return entryData;
}


// * UPDATE PREVIEW W/O SAVING TO THE DATABASE
const updatePreview = async (isPreviewOnly) => {
  // get entry object from page containing data from the fields
  const entryData = buildEntryObj();

  // update preview
  els.preview.innerHTML = await useFetch({
    method: 'POST',
    url: '/editor_preview',
    entryData
  });
  if(isPreviewOnly) updateMessage("Preview updated, but not saved to the database.");
}


// * UPDATE MESSAGE WITH CONTENT SENT FROM DATABASE
const updateMessage = (result) => {
  els.message.innerHTML = result;
}


// * NEW VERSION OF UPLOAD
const upload = async () => {
  // get entry object from page containing data from the fields
  const entryData = buildEntryObj();

  // upload changes to db
  const result = await useFetch({
    method: 'POST',
    url: `/editor/`,
    entryData
  });
  // render content and message from server
  updatePreview();
  updateMessage(result);
}


// * OPENS CURRENT ENTRY IN A READER: WARNING: DOES NOT SAVE
const openReader = () => {
  location.assign(`/reader/id/${ els.editor_entryID.value }`);
}


// * REVERTS CURRREMT ENTRY TO THE DATABASE VERSION: WARNING DOES NOT SAVE
const revert = () => location.reload(true);


// * DELETES CURRENT ENTRY FROM DATABASE
const del = async () => {
  // get entry object from page containing data from the fields
  const entryData = buildEntryObj();

  // prep fetch object anm 
  const result = await useFetch({
    method: 'DELETE',
    url: '/' + els.editor_entryID.value,
    header: { 'Content-Type': 'text/html'},
    entryData
  });
  updateMessage(result);
  
}


// * OPERATIONS
toolbar.addEventListener('click', async e => {
  e.preventDefault();
  const target = e.target.name;

  if(target === "upload")          upload();
  if(target === "updatePreview")   updatePreview(true);
  if(target === "openReader")      openReader();
  if(target === "revert")          revert();
  if(target === "del")             del();
});

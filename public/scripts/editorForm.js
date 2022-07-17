const allElements = document.querySelectorAll('*');
const toolbar = document.getElementById('toolbar');
const formElements = document.querySelectorAll('.form-el'); // * used to upload changes
const message = document.querySelector('#message'); // used to populate any incoming messages
const els = {};

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


// * OPENS CURRENT ENTRY IN A READER: WARNING: DOES NOT SAVE
const openReader = () => {
  location.assign(`/reader/id/${ els.editor_entryID.value }`);
}


// * REVERTS CURRREMT ENTRY TO THE DATABASE VERSION: WARNING DOES NOT SAVE
const revert = () => location.reload(true);


// * NEW: UPDATE PREVIEW SECTION TO CURRENT EDITOR FORM STATE
const updatePreview = async () => {
  const entryData = {};
  formElements.forEach(el => entryData[el.attributes.getNamedItem('name').value] = el.value);
  
  await fetch('/editor_preview', {
    method: "GET",
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entryData)
  })
  .then(res => res.json())
  .then(res => {
    if(res.message) message.innerHTML = res.message;
    updatePreviews();
  })
  .catch(e => { console.log('error - error', e); });

}


// ! ORIGINAL: REWORKING FOR DRY AND SERVER-SIDE MARKDOWN HANDLING
const updatePreviews = () => {

  // prep title
  const title = `<a>${els.editor_title.value}</a>`

  // prep content & shortened content :: ORIGINAL will be deprecated
  const content = els.editor_markdown.value;
  const shortContent = content
    .replace(/(<([^>]+)>)/gim, " ")
    .trim()
    .split(" ")
    .slice(0, 25)
    .join(" ");


  // prep tags
  const tagHTML = [];
  let tags = els.editor_tags.value;
  tags = tags.split(", ");
  tags.forEach(tag => {
    tagHTML.push(`<a href="/tag/${tag}">${tag}</a>`);
  });
  const tagString = tagHTML.join(', ');

  // prep date
  const datePicked = new Date(els.editor_datepicker.value);
  const date = datePicked.toString() === "Invalid Date" ? "" : getDateString(datePicked);


  // populate data
  // todo: try to loop instead
  els.list_title.innerHTML = els.reader_title.innerHTML = title;
  els.list_subtitle.innerHTML = els.reader_subtitle.innerHTML = els.editor_subtitle.value;
  els.list_content.innerHTML = shortContent;
  els.reader_content.innerHTML = content;
  els.list_tags.innerHTML = els.reader_tags.innerHTML = tagString;
  els.list_datePicked.innerHTML = els.reader_dateString.innerHTML = date;
}

// * SAVE CHANGES TO DB
const upload = async () => {
  const entryData = {};
  formElements.forEach(el => entryData[el.attributes.getNamedItem('name').value] = el.value);
  const { datePicker, timePicker } = entryData;
  
  entryData.isPublished = formElements[4].checked;

  if(entryData.isPublished && ( datePicker === "" || timePicker === "" )) {
    const publishError = document.querySelector('#publishError');
    publishError.style.display = "inline-block";
  }
  
  const html = await fetch('/editor', {
    method: "POST",
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entryData)
  })
  .then(res => res.json())
  .then(res => {
    if(res.message) message.innerHTML = res.message;
    updatePreviews();
  })
  .catch(e => { console.log('error - error', e); });


  // NEW ULOAD LOGIC
  const entryHtmlObj = await useFetch();
  updatePreview(entryHtmlObj);
}


const del = () => {
  const _id = els.editor_postID.value;
  const httpRequest = new XMLHttpRequest();
  httpRequest.open('DELETE', `/${_id}`, false);
  httpRequest.send();
}

// todo Post launch feature addition
const save  = async () => { console.log('save_local clicked'); }

// * OPERATIONS
toolbar.addEventListener('click', async e => {
  e.preventDefault();
  const target = e.target.name;

  if(target === "upload")          upload();
  if(target === "updatePreviews")  updatePreviews();
  if(target === "openReader")      openReader();
  if(target === "revert")          revert();
  if(target === "del")             del();
});
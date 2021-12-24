const form = document.querySelector('form');

form.addEventListener('submit', async e => {
  e.preventDefault();
  let postData = {};
  const formElements = document.querySelectorAll('.form-el');
  formElements.forEach(el => {
    const name = el.attributes.getNamedItem('name').value;
    postData[name] = name === 'published' ? el.checked : el.value;
  });

  try {
    const res = await fetch('/savePost', {
      method: 'POST',
      body: JSON.stringify(postData),
      headers: { 'Content-Type': 'application/json' }
    });
    // const response = res.json();
    // the response will indicate if the save failed or succeeded

  } catch(err) {
    console.log('save post error', err);
  }
});

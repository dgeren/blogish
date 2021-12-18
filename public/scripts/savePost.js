const form = document.querySelector('form');

form.addEventListener('submit', async e => {
  e.preventDefault();
  let postData = {};
  const formElements = document.querySelectorAll('.form-el');
  formElements.forEach(el => {
    const name = el.attributes.getNamedItem('name').value;
    postData[name] = name === 'published' ? el.checked : el.value;
  });
  console.log(postData); // 🔴

  try {
    const res = await fetch('/savePost', {
      method: 'POST',
      body: JSON.stringify(postData),
      headers: { 'Content-Type': 'application/json' }
    });
    console.log(res); // 🔴
    // const response = res.json();

  } catch(err) {
    console.log('save post error', err);
  }
});

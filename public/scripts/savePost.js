const form = document.querySelector('form');

form.addEventListener('submit', async e => {
  e.preventDefault();
  let postData = {};
  const formElements = document.querySelectorAll('.form-el');
  formElements.forEach(el => {
    const name = el.attributes.getNamedItem('name').value;
    postData[name] = name === 'publish' ? el.checked : el.value;    
  });
  console.log(postData);

  try {
    const res = await fetch('/savePost', {
      method: 'POST',
      body: JSON.stringify(postData),
      headers: { 'Content-Type': 'application/json' }
    });
    //* set up the save serverside
    //* then return the new/modified post data
    const response = res.json();
    //* enter the returned fields into the form's fields
    //* any errors should be written near the field with the original value
    //* from postData instead of the return error message. This way error
    //* messges don't replace the values. This would be especially important
    //* for content. or perhaps the data is simply not replaced at all...
  } catch(err) {}
});

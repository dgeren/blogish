module.exports.fixTags = (content, direction) => {
  const subs = {
    down: [
      [ /&lt;/gi, "<" ],
      [ /&gt;/gi, ">" ],
      [ /&amp;#34;/gi, "\"" ],
      [ /&amp;#39;/gi, "\'"]
    ],
    up: [
      [ /</gi, "&lt;" ],
      [ />/gi, "&gt;" ],
      [ /"/gi, "&#34" ],
      [ /'/gi, "&#39" ]
    ]
  };

  subs[direction].forEach(sub => {
    content = content.replace(sub[0], sub[1]);
  });
  return content;
}

module.exports.handleErrors = err => {
  let errors = { email: '', password: '' };
  if(err.message === 'incorrect email') errors.email = 'Email address or password is not registered.';
  if(err.message === 'incorrect password') errors.password = 'Email address or password is not registered.';
  if(err.code === 11000) errors.email = 'Email address already registered.'
  if(err.message.includes('user validation failed')){
    Object.values(err.errors).forEach( ({ properties }) => {
      errors[properties.path] = properties.message;
    });
  }
  return errors;
}
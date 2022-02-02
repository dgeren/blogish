module.exports.fixHtmlTags = (content, task) => {
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
    ],
    strip: [
      [/(<([^>]+)>)/gim, " "]
    ]
  };

  subs[task].forEach(sub => {
    content = content.replace(sub[0], sub[1]).trim();
  });
  return content;
}

module.exports.formatDate = date => {
  const fullMonth = [ "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  return date ? `${fullMonth[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}` : null;
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

module.exports.prepPreview = content => {
  return content
  .replace(/(<([^>]+)>)/gim, " ")
  .trim()
  .split(" ")
  .slice(0, 25)
  .join(" ");
}
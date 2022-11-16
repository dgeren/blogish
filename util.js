const showdown = require('showdown');
const converter = new showdown.Converter({ 'noHeaderId': true });

//! Re-enable for non-markdown HTML tags
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
  const dateObj = new Date(date);
  const fullMonth = [ "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  const dateString = dateObj.toISOString().substring(0, 10); //  -> "yyyy-mm-dd"
  const timeString = dateObj.toISOString().substring(11, 16); // "-> "hh:mm"
  const dateDisplay = `${fullMonth[dateObj.getMonth()]} ${dateObj.getDate()}, ${dateObj.getFullYear()}`;
  
  // dateString & timeString used in editor.ejs to fill publish date and time fields
  return { dateDisplay, dateString, timeString };
}


module.exports.formatDashedDate = date => {
  const year = date.getFullYear();
  const m = 1 + date.getMonth();
  const month = m < 10 ? '0' + m : m;
  const d = date.getDate();
  const day = d < 10 ? '0' + d : d;
  const string = `${year}-${month}-${day}`;
  return string;
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


module.exports.prepTags = tags => {
  const tagArray = tags.map(tag => `<a href="/listByTags/${tag}">${tag}</a>`);
  return tagArray.join(", ");
}


module.exports.prepPreview = entry => {

  const { title, description, markdown = "", tags = "", dateDisplay = "" } = entry;
  const tagArray = [];
  tags.forEach(tag => tagArray.push(`<a href="/listByTags/tag/${tag}">${tag}</a>`));
  const tagHTML = tagArray.join(', ');
  const content = converter.makeHtml(markdown);
  
  return `
    <h3 class="section-title">Preview</h3>
    <div class="listSection">
      <h4 id="list_title" class="list"><a>${title}</a></h4>
      <h5 id="list_subtitle" class="list">${description}</h5>
      <h5 id="list_dateDisplay" class="list">${dateDisplay}</h5>
      <div id="list_tags" class="list">${tagHTML}</div>
    </div>
    <hr class="spacer">
  
    <div class="readerSection">
      <h3 id="reader_title" class="reader"><a>${title}</a></h3>
      <h4 id="reader_subtitle" class="reader">${description}</h4>
      <h4 id="reader_dateDisplay" class="reader">${dateDisplay}</h4>
      <div id="reader_content" class="reader">${content}</div>
      <div id="reader_tags" class="reader">${tagHTML}</div>
    </div>
  `
}
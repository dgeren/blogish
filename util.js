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


module.exports.prepTags = tags => {
  const tagArray = tags.map(tag => `<a class="label smaller" href="/listByTags/${tag}">${tag}</a>`);
  return tagArray.join(" ");
}
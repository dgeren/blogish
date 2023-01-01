
module.exports.limit = 7; // how many entries appear in a limited list
module.exports.maxAge = 3600 * 24 * 3; // last number is number of days a user stays logged in

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

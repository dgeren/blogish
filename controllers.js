const slugify = require('slugify');
const jwt = require('jsonwebtoken');
const showdown = require('showdown');
const converter = new showdown.Converter({ 'noHeaderId': true });


const User = require('./models/User');
const Entry = require('./models/Post'); // 🟠 When the database is rebuilt, change to models/Entry

const {
  fixHtmlTags,      formatDate,     handleErrors,
  prepPreview,      prepTags
} = require('./util'); // 🟠 is formatDashedDate necessary?
const maxAge = 3600 * 72, limit = 7; // 🟠 add both to dashboard for admin users but nothing lower

/*
* LOCAL METHODS
*/
const createToken = id => { // 🟠 why can't this work from util.js?
  return jwt.sign({ id }, 'net ninja secret', { // 🟠 fix secret & make more secure
    expiresIn: maxAge
  });
}

// * GET ALL PUBLISHED DATES
const getSidebarDateHtml = async () => {

  const _now = new Date();
 
  let results = await Entry.find(
      { publish: true, pubDate: { $lt: _now } },
      { title: 1, slug: 1, pubDate: 1, _id: 0 })
  .sort({ pubDate: -1 })
  .lean();

  let output = `<div class="dates">\n<h3>Archive</h3>\n<ul>\n`, currentYear = 0, currentMonth = 0, currentDay = 0;
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  let first = true;

    for(item of results){
      
      const d = item.pubDate;
      const year = d.getUTCFullYear();
      const month = d.getUTCMonth();
      const day = d.getUTCDate() + 1;

      if(!first){
        if(currentYear !== year) {
          output += `</ul>\n</details>\n</details>\n</details>\n`;
        } else if(currentMonth !== month) {
          output += `</ul>\n</details>\n</details>\n`;
        } else if(currentDay !== day) {
          output += `</ul>\n</details>\n`;
        }
      }

      if(currentYear !== year) {
        currentYear = year, currentMonth = month, currentDay = day;
        output += `<details class="year">\n<summary>${year}</summary>\n`;
        output += `<details class="month">\n<summary>${months[month]}</summary>\n`;
        output += `<details class="day">\n<summary>${day}</summary>\n<ul class="titles">\n`;
      } else if(currentMonth !== month){
        currentMonth = month, currentDay = day;
        output += `<details class="month">\n<summary>${months[month]}</summary>\n`;
        output += `<details class="day">\n<summary>${day}</summary>\n<ul class="titles">\n`;
      } else if(currentDay !== day){
        currentDay = day;
        output += `<details class="day">\n<summary>${day}</summary>\n<ul class="titles">\n`;
      }

      output += `<li class="title"><a href="/reader/slug/${item.slug}">${item.title}</a></li>\n`;
      first = false;
    }
    
  output += `</ul>\n</details>\n</details>\n</details>\n</div>\n`;
  return output.trim();
}

// * GET CATEGORIES AND THE COUNT OF ENTRIES FOR EACH
const getSidebarCategoriesHtml = async () => {
  const _now = new Date();

  let data = {};
  const results = await Entry.find(
    { publish: true, pubDate: { $lt: _now } },
    { _id: 1, tags: 1 }).lean();
  results.forEach(item => {
    item.tags.forEach(category => {
      if(category != '' && category in data) data[category] += 1;
      else data[category] = 1;
    });
  });

  let html = `<div class="categories">\n<h3>Categories</h3>\n\t<ul>\n`;
  Object.keys(data).forEach(key => html += `\t\t<li><a href="/listByTags/${key}">${ key } (${ data[key] })</a></li>\n`);
  return html += `\t</ul>\n</section>\n</div>`;
}

// * GET ENTRIES FROM DATABASE
const getEntries = async parameters => {
  const {
    _id = null,  slug = null, tag = null, sortOrder = -1,
    skip = null, unpub = false, limit = null, pubDate
  } = parameters;

  const _now = new Date();
  
  return _id ? await Entry
    // if given an id, then the reader or editor was called
          .findOne({ _id })
          .lean() :
    // if given a slug, then the reader or editor was called
       slug ? await Entry
          .findOne({ slug })
          .lean() :
    // if given a tag, then the tag list was called
        tag ? await Entry
          .find({ tags: tag, publish: true , pubDate: { $lt: _now } }) 
          .lean()
          .sort({ pubDate: sortOrder })
          .skip(skip)
          .limit(limit) :
    // if unpublished is true
      unpub ? await Entry
          .find({ publish: false })
          .lean()
          .sort({ _id: sortOrder }) :
    // otherwise a list by pubdate was called
      await Entry
          .find({ $and: [
            { publish: true },
            { pubDate: {$lt: _now }}
          ] })
          .lean()
          .sort({ pubDate: sortOrder })
          .skip(skip)
          .limit(limit);
}

const getAdjacentEntries = async date => {
  const next = await Entry
                .find({ publish: true, pubDate: { $gt: date } })
                .lean()
                .sort({ pubDate:  1 })
                .limit(1);
  const prev = await Entry
                .find({ publish: true, pubDate: { $lt: date } })
                .lean()
                .sort({ pubDate: -1 })
                .limit(1);
  return { next: next[0], prev: prev[0] }; 
}

const countDocs = async (tag) => {
  const _now = new Date();
  const filterByTag = tag ? { tags: tag } : {};

  return await Entry.countDocuments({ $and: [
    { publish: true },
    { pubDate: { $lt: _now }},
    filterByTag
  ] });
}


/*
* EXPORTED METHODS
*/
// * GET LIST OF RECENT ARTICLES
module.exports.getListByPubDate = async (req, res) => {

  res.locals.message = null;
  res.locals.page = parseInt(req.params.page) || 1;
  const docs = await countDocs();
  const skip = (res.locals.page * limit) - limit;

  res.locals.pages = parseInt(Math.ceil(docs / limit));
  res.locals.entries = await getEntries({ skip, limit });
  res.locals.adjacentEntries = null;
  res.locals.publish = true;

  res.locals.entries.forEach(entry => {
    entry.dateDisplay = formatDate(entry.pubDate).dateDisplay;
    entry.tagHTML = prepTags(entry.tags);
  });

  res.locals.requestedTag = null;
  res.locals.sidebarDates = await getSidebarDateHtml();
  res.locals.sidebarCategories = await getSidebarCategoriesHtml();

  res.render('list');
}


// * GET LIST OF UNPUBLISHED ARTICLES 
module.exports.getListUnpublished = async (req, res) => {
  res.locals.message = null;
  res.locals.entries = await getEntries({ unpub: true });
  res.locals.pages = 0;
  res.locals.page = 0;
  res.locals.adjacentEntries = null;
  res.locals.publish = false;
  res.locals.requestedTag = null;
  res.locals.sidebarDates = await getSidebarDateHtml();
  res.locals.sidebarCategories = await getSidebarCategoriesHtml();

  res.locals.entries.forEach(entry => entry.tagHTML = prepTags(entry.tags));
  res.render('list');
}


// * GET ARTICLE LIST BASED ON A TAG
module.exports.getListByTag = async (req, res) => {

  // * INITIAL VALUES
  res.locals.message = null;
  const { tag } = req.params;

  // * PAGINATION
  res.locals.page = parseInt(req.params.page) || 1;
  const docs = await countDocs(tag);
  const skip = (res.locals.page * limit) - limit;

  // * PREP ENTRY DATA FOR EJS
  res.locals.pages = parseInt(Math.ceil(docs / limit));
  res.locals.entries = await getEntries({ tag, skip, limit });
  res.locals.adjacentEntries = null;
  res.locals.publish = true;
  res.locals.sidebarDates = await getSidebarDateHtml();
  res.locals.sidebarCategories = await getSidebarCategoriesHtml();

  // * SEND RESPONSE
  if(res.locals.entries.length > 0) {
    res.locals.entries.forEach(entry => {
      entry.dateDisplay = formatDate(entry.pubDate).dateDisplay;
      entry.tagHTML = prepTags(entry.tags);
    });
    res.locals.requestedTag = tag;
    res.render('list');
  } else {
    
    res.locals.message = `Sorry, but I did not find posts tagged &#34;${ tag }.&#34;`;
    res.redirect('/');
  }
}


// * OPEN ARTICLES IN READER
module.exports.getEntry = async (req, res) => {
  res.locals.message = null;
  const { slug = null, _id } = req.params;
  const entry = slug ? await getEntries({ slug }) : await getEntries({ _id });

  // * PREP ENTRY DATA FOR EJS
  if(entry){
    if(entry.pubDate) entry.dateDisplay = formatDate(entry.pubDate).dateDisplay;
    entry.tagHTML = prepTags(entry.tags);
    entry.HTML = converter.makeHtml(entry.markdown);
    
    res.locals.entry = entry;
    res.locals.page = null;
    res.locals.pages = null;
    res.locals.requestedTag = null
    res.locals.adjacentEntries = await getAdjacentEntries(entry.pubDate);
    res.locals.sidebarDates = await getSidebarDateHtml();
    res.locals.sidebarCategories = await getSidebarCategoriesHtml();
    res.locals.message = "";
    res.render('reader');
  // * OR ALERT VISITOR
  } else {
    res.locals.message = `Sorry, but I did not find a post at &#34;/${slug}&#34;`;
    res.locals.entries = await getEntries({ limit });
    res.redirect('/');
  }
}


// * OPEN ARTICLE IN EDITOR OR SERVE EMPTY EDITOR
module.exports.getEditor =  async (req, res) => {
  res.locals.message = null;
  res.locals.entry = new Entry();
  res.locals.pagination = { next: null, previous: null };
  res.locals.sidebarDates = await getSidebarDateHtml();
  res.locals.sidebarCategories = await getSidebarCategoriesHtml();
  
  const { slug } = req.params;
  let dates = {};
  if(slug){
    const entry = await getEntries({ slug });
    if(entry) {
      // * PREP FOR EJS
      if(entry.pubDate) dates = formatDate(entry.pubDate);

      entry.dateDisplay = dates.dateDisplay;
      entry.dateString = dates.dateString;
      entry.timeString = dates.timeString;
      entry.isPublishedChecked = entry.publish ? "checked" : "";
      entry.content = converter.makeHtml(entry.markdown);
      entry.tagHTML = prepTags(entry.tags);
      entry.previewHTML = prepPreview(entry);

      // * EJS
      res.locals.entry = entry;
    } else {
      res.locals.message = `I did not find anything at &#34;/${slug}&#34;. Would you like to write it now?`;
    }
  }
  res.render('editor');
}


// * SAVE NEW OR EXISTING ENTRIES
module.exports.postEntry = async (req, res) => { 
  res.locals.message = null;

  // * GET DATA FROM REQ
  const { title, description, authorID, publish, datePicker, timePicker, entryID } = req.body;
  let { markdown, tags } = req.body;
  
  // * PREP DATA
  const slug = slugify(title, { lower: true });
  const pubDate = datePicker === "" || timePicker === "" ? "" :
    new Date(`${datePicker}T${timePicker}`);
  tags = tags
    .split(",")
    .filter(tag => tag.trim() !== '')
    .map(element => element.trim());

  const attributes = { title, slug, description, markdown, tags, publish, pubDate, authorID };
  
  // * ATTEMPT TO UPDATE AN EXISTING ENTRY OR SAVE AS NEW ENTRY
  const entry = await Entry.findOneAndUpdate(
    entryID ? { _id: entryID } : {},
    attributes,
    { new: true, upsert: true }
  );

  entry.content = converter.makeHtml(entry.markdown);
  if(entry.pubDate) entry.dateDisplay = formatDate(entry.pubDate).dateDisplay;
  if(entry){
    res.status(200).send(prepPreview(entry));
  } else {
    res.locals.message = "Something went wrong, but I can't tell you what.";
    res.locals.entry = new Entry.updateOne({ _id: entryID }, { publish: false });
    res.render('editor');
  }
}


// * GET HTML FOR EDITOR PREVIEW
module.exports.getEditorPreview = async (req, res) => {
  res.locals.message = null;
  const dates = {};

  // * GET DATA FROM REQ
  const { tags } = req.body;

  const entry = req.body;
  
  // * PREP DATA
  entry.slug = slugify(entry.title, { lower: true });
  const dateUTC = entry.datePicker === "" || entry.timePicker === "" ? "" :
    new Date(`${entry.datePicker}T${entry.timePicker}`);
  entry.dateDisplay = formatDate(dateUTC).dateDisplay;
  entry.tags = tags.split(",").map(element => element.trim());

  entry.content = converter.makeHtml(entry.markdown);
  res.status(200).send(prepPreview(entry));
}


// * DELETE EXISTING ENTRIES
module.exports.deleteEntry = async (req, res) => {
  res.locals.message = "Entry deleted. Here are some recents entries.";
  const { _id } = req.params;
  const entry = await Entry.deleteOne({ _id }, err => {
    res.locals.message = "I failed to delete an entry. Are you sure this entry still exists?";
  });
  // 🟠 DRY: this is repeated in home_get; make into a support function
  res.redirect('/');
}


// * RENDER ADMIN PAGE
module.exports.getAdmin = (req, res) => {
  res.locals.message= null;
  res.render('admin');
}


// * CREATER NEW USERS
module.exports.signup = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.create({ email, password });
    const token = createToken(user._id);
    res.cookie('jwt', token, {
      httpOnly: true,
      maxAge: maxAge * 1000
    });
    res.status(200).json({ user: user._id });
  }
  catch(err) {
    const errors = handleErrors(err);
    res.status(400).json({ errors });
  }
}


// * ALLOW SIGN IN
module.exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.login(email, password);
    const token = createToken(user._id);
    res.cookie('jwt', token, {
      httpOnly: true,
      maxAge: maxAge * 1000
    });
    res.status(200).json({ user: user._id });
  }
  catch (err) {
    const errors = handleErrors(err);
    res.status(400).json({ errors });
  }
}


// * EXPIRE TOKEN TO SIGN USER OUT
module.exports.logout = async (req, res) => {
  res.cookie('jwt', '', { maxAge: 1 });
  res.redirect('/');
}
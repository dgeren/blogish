const slugify = require('slugify');
const jwt = require('jsonwebtoken');
const showdown = require('showdown');
const converter = new showdown.Converter({ 'noHeaderId': true });

const db = require('./db.js');

const User = require('./models/User');
const Entry = require('./models/Post'); // 🟠 When the database is rebuilt, change to models/Entry

const { fixHtmlTags, formatDate, prepTags } = require('./util');
const { ppid } = require('process');
const maxAge = 3600 * 72, limit = 7; // 🟠 add both to dashboard for admin users but nothing lower

/*
* LOCAL METHODS
*/
const createToken = id => { // 🟠 why can't this work from util.js?
  return jwt.sign({ id }, 'net ninja secret', { // 🟠 fix secret & make more secure
    expiresIn: maxAge
  });
}

/*
* EXPORTED METHODS
*/
// * GET LIST OF RECENT ARTICLES
module.exports.getListByPubDate = async (req, res) => {
  
  // data for sidebar
  res.locals.topics = await db.getCategories();
  res.locals.archive = await db.getArchive();
  
  // data for list pagination
  res.locals.page = parseInt(req.params.page) || 1;
  const docs = await db.getEntryCount();
  const skip = (res.locals.page * limit) - limit;
  res.locals.entries = await db.getListOfEntriesByDate( skip );

  res.locals.pages = parseInt(Math.ceil(docs / limit));

  // disabled items
  res.locals.adjacentEntries = null;
  res.locals.publish = true;
  res.locals.requestedTag = null;

  // prepping data for cards
  res.locals.entries.forEach(entry => {
    entry.dateDisplay = formatDate(entry.pubDate).dateDisplay;
    entry.tagHTML = prepTags(entry.tags);
  });

  res.render('list');
}


// * GET LIST OF UNPUBLISHED ARTICLES
module.exports.getListUnpublished = async (req, res) => {

  // data for sidebar
  res.locals.topics = await db.getCategories();
  res.locals.archive = await db.getArchive();

  // entry data
  res.locals.entries = await db.getListOfUnpublishedEntries();
  
  // prep topics
  res.locals.entries.forEach(entry => entry.tagHTML = prepTags(entry.tags));

  // disabled items
  res.locals.pages = 0;
  res.locals.page = 0;
  res.locals.adjacentEntries = null;
  res.locals.publish = false;
  res.locals.requestedTag = null;

  // render unpublished
  res.render('list');
}


// * GET ARTICLE LIST BASED ON A TAG
module.exports.getListByTag = async (req, res) => {

  // data for sidebar
  res.locals.topics = await db.getCategories();
  res.locals.archive = await db.getArchive();
  
  // chosen topic to list
  const { tag } = req.params;

  // pageination
  res.locals.page = parseInt(req.params.page) || 1;
  const docs = await db.getEntryCount(tag);
  const skip = (res.locals.page * limit) - limit;
  res.locals.pages = parseInt(Math.ceil(docs / limit));

  // entry data
  res.locals.entries = await db.getListOfEntriesByCategory(tag, skip);
  res.locals.entries.forEach(entry => {
    entry.dateDisplay = formatDate(entry.pubDate).dateDisplay;
    entry.tagHTML = prepTags(entry.tags);
  });

  // enabled items
  res.locals.publish = true;
  res.locals.requestedTag = tag;

  // disabled items
  res.locals.adjacentEntries = null;

  // render list by topic
  res.render('list');
}


// * OPEN ARTICLES IN READER
module.exports.getEntry = async (req, res) => {

  // retrieve chosen entry to read
  const { slug = null, _id } = req.params;
  const entry = await db.getOneEntry( slug, _id );
/*
entry = {
  id, authorid, pubDate, slug, tags, title, markøwn, publish, description
}


*/
  if(entry.pubDate) entry.dateDisplay = formatDate(entry.pubDate).dateDisplay;
  entry.HTML = converter.makeHtml(entry.markdown);
  res.locals.entry = entry;

  // prep topics
  entry.tagHTML = prepTags(entry.tags);

  // data for sidebar
  res.locals.topics = await db.getCategories();
  res.locals.archive = await db.getArchive();
  
  // pagination
  res.locals.adjacentEntries = await db.getAdjacents(entry.pubDate);

  // disabled items
  res.locals.page = null;
  res.locals.pages = null;
  res.locals.requestedTag = null
  res.locals.preview = false;

  // render entry in reader
  res.render('reader');
  
}


// * OPEN ARTICLE IN EDITOR OR SERVE EMPTY EDITOR
module.exports.getEditor =  async (req, res) => {

  // chosen entry to edit or new entry
  res.locals.entry = new Entry();
  const { slug } = req.params;
  
  // data for sidebar
  res.locals.topics = await db.getCategories();
  res.locals.archive = await db.getArchive();
  
  let dates = {};
  if(slug){
    const entry = await db.getOneEntry(slug);
    
    // prep dates
    if(entry.pubDate) dates = formatDate(entry.pubDate);

    // PREP DATA FOR FORM AND PREVIEW
    // publication state
    entry.dateDisplay = dates.dateDisplay;
    entry.dateString = dates.dateString;
    entry.timeString = dates.timeString;
    entry.isPublishedChecked = entry.publish ? "checked" : "";

    // body
    entry.HTML = converter.makeHtml(entry.markdown);

    // prep topics
    entry.tagHTML = prepTags(entry.tags);

    // entry reader to render
    res.locals.entry = entry;

    // disabled items
    res.locals.pagination = { next: null, previous: null };

  }
  res.render('editor'); 


}// * SAVE NEW OR EXISTING ENTRIES
module.exports.postEntry = async (req, res) => {

  const entry = req.body;
  const { tags } = req.body;


  entry.slug = slugify(entry.title, { lower: true });
  if(entry.entryID) {
    entry.id = entry.entryID;
    delete entry.entryID;
  }

  entry.pubDate = !entry.datePicker || !entry.timePicker ? "" :
    new Date(`${entry.datePicker}T${entry.timePicker}`);

  entry.tags = tags
    .split(",")
    .filter(tags => tags.trim() !== "")
    .map(tags => tags.trim());
  
  res.locals.entry = await db.addOrUpdateEntry(entry);
  res.locals.entry.pubDate = entry.pubDate || false;

  res.locals.entry.content = converter.makeHtml(res.locals.entry.markdown);
  if(res.locals.entry.pubDate) res.locals.entry.dateDisplay = formatDate(res.locals.entry.pubDate).dateDisplay;
  res.locals.preview = true;

  
  res.render('partials/content');
}

// * GET HTML FOR EDITOR PREVIEW
module.exports.getEditorPreview = async (req, res) => {

  // data from request
  const { tags, datePicker = "", timePicker = "" } = req.body;
  res.locals.entry = req.body;
  res.locals.preview = true;
  
  // * PREP DATA
  res.locals.entry.slug = slugify(res.locals.entry.title, { lower: true });

  res.locals.entry.dateDisplay = datePicker === "" || timePicker === "" ? "" :
    formatDate(new Date(`${res.locals.entry.datePicker}T${res.locals.entry.timePicker}`)).dateDisplay;

  res.locals.entry.tags = Array.isArray(tags) ? tags : tags.split(",").map(element => element.trim());
  res.locals.entry.HTML = converter.makeHtml(res.locals.entry.markdown);

  res.render('partials/content');
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
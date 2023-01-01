const slugify = require('slugify');
const jwt = require('jsonwebtoken');
const showdown = require('showdown');
const converter = new showdown.Converter({ 'noHeaderId': true });

const db = require('./db.js');

const User = require('./models/User');
const Entry = require('./models/Post'); // 🟠 When the database is rebuilt, change to models/Entry

const { fixHtmlTags, limit, maxAge } = require('./util');
const { ppid } = require('process'); // can't remove even though it appears to not be in

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

  // css
  res.locals.css = "list";
  
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

  res.render('list');
}


// * GET LIST OF UNPUBLISHED ARTICLES
module.exports.getListUnpublished = async (req, res) => {

  // data for sidebar
  res.locals.topics = await db.getCategories();
  res.locals.archive = await db.getArchive();

  // css
  res.locals.css = "list";

  // entry data
  res.locals.entries = await db.getListOfUnpublishedEntries();
  
  // disabled items
  res.locals.pages = 0;
  res.locals.page = 0;
  res.locals.adjacentEntries = null;
  res.locals.publish = false;
  res.locals.requestedTag = null;

  res.render('list');
}


// * GET ARTICLE LIST BASED ON A TAG
module.exports.getListByTag = async (req, res) => {

  // page elements
  res.locals.topics = await db.getCategories();
  res.locals.archive = await db.getArchive();
  res.locals.css = "list";
  res.locals.requestedTag = req.params.tag;

  // pageination
  res.locals.page = parseInt(req.params.page) || 1;
  const docs = await db.getEntryCount(req.params.tag);
  const skip = (res.locals.page * limit) - limit;
  res.locals.pages = parseInt(Math.ceil(docs / limit));

  // entry data
  res.locals.entries = await db.getListOfEntriesByCategory(req.params.tag, skip);

  // enabled items
  res.locals.publish = true;

  // disabled items
  res.locals.adjacentEntries = null;

  res.render('list');
}


// * OPEN ARTICLES IN READER
module.exports.getEntry = async (req, res) => {

  // page elements
  res.locals.topics = await db.getCategories();
  res.locals.archive = await db.getArchive();
  res.locals.css = "reader";

  // retrieve chosen entry to read
  const { slug = null, _id } = req.params;
  res.locals.entry = await db.getOneEntry( slug, _id );
  
  res.locals.entry.HTML = converter.makeHtml(res.locals.entry.markdown);
  
  // pagination
  res.locals.adjacentEntries = await db.getAdjacents(res.locals.entry.pubDate);

  // disabled items
  res.locals.page = null;
  res.locals.pages = null;
  res.locals.requestedTag = null
  res.locals.preview = false;

  res.render('reader');  
}


// * OPEN ARTICLE IN EDITOR OR SERVE EMPTY EDITOR
module.exports.getEditor =  async (req, res) => {
  
  // page elements
  res.locals.topics = await db.getCategories();
  res.locals.archive = await db.getArchive();
  res.locals.css = "editor";

  // chosen entry to edit or new entry
  res.locals.entry = new Entry();
  const { slug } = req.params;
  
  let dates = {};
  if(slug){
    const entry = await db.getOneEntry(slug);

    // body
    entry.HTML = converter.makeHtml(entry.markdown);

    // entry reader to render
    res.locals.entry = entry;

    // disabled items
    res.locals.pagination = { next: null, previous: null };

  }

  res.render('editor');
}


// * SAVE NEW OR EXISTING ENTRIES
module.exports.postEntry = async (req, res) => {

  // HANDLE ENTRY AND DB
  const entry = req.body;
  const { tags } = req.body;

  entry.slug = slugify(entry.title, { lower: true });
  if(entry.entryID) {
    entry.id = entry.entryID;
    delete entry.entryID;
  }

  // prep date format
  entry.pubDate = !entry.datePicker || !entry.timePicker ? "" :
    new Date(`${entry.datePicker}T${entry.timePicker}`);

  // prep 
  entry.tags = tags
    .split(",")
    .filter(tags => tags.trim() !== "")
    .map(tags => tags.trim());
  
  res.locals.entry = await db.addOrUpdateEntry(entry);
  res.locals.upload = true;

  // HANDLE PREVIEW AJAX

  res.locals.entry.pubDate = entry.pubDate || false;
  res.locals.preview = true;

  res.locals.entry.HTML = converter.makeHtml(res.locals.entry.markdown);

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
    const errors = console.log(err);
    res.status(400).json({ errors });
  }
}


// * EXPIRE TOKEN TO SIGN USER OUT
module.exports.logout = async (req, res) => {
  res.cookie('jwt', '', { maxAge: 1 });
  res.redirect('/');
}
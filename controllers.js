const slugify = require('slugify');
const jwt = require('jsonwebtoken');
const showdown = require('showdown');
const converter = new showdown.Converter({ 'noHeaderId': true });

const db = require('./db.js');

const User = require('./models/User');
const Entry = require('./models/Post'); // 🟠 When the database is rebuilt, change to models/Entry

const { fixHtmlTags, limit, maxAge } = require('./util');
const { ppid } = require('process'); // can't remove even though it appears to not be in
const e = require('express');

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
// * GET LIST OF RECENT ARTICLES 🔹
module.exports.getListByPubDate = async (req, res) => {

  // css
  res.locals.css = "list";
  
  // data for list pagination
  res.locals.page = parseInt(req.params.page) || 1;
  const docs = await db.getEntryCount();
  const skip = (res.locals.page * limit) - limit;
  res.locals.pages = parseInt(Math.ceil(docs / limit));

  // queries
  res.locals.entries = await db.getListOfEntriesByDate( skip );
  res.locals.topics = await db.getCategories();
  res.locals.archive = await db.getArchive();

  // disabled items
  res.locals.adjacentEntries = null;
  res.locals.publish = true;
  res.locals.requestedTag = null;
  res.locals.errMessage = null;

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
  console.log("🔸 ")
  
  // disabled items
  res.locals.pages = 0;
  res.locals.page = 0;
  res.locals.adjacentEntries = null;
  res.locals.publish = false;
  res.locals.requestedTag = null;

  res.render('list');
}


// * GET ARTICLE LIST BASED ON A TOPIC
module.exports.getListByTag = async (req, res) => {

  // css
  res.locals.css = "list";

  // page elements
  res.locals.topics = await db.getCategories();
  res.locals.archive = await db.getArchive();
  res.locals.requestedTag = req.params.tag;

  // pageination
  res.locals.page = parseInt(req.params.page) || 1;
  const docs = await db.getEntryCount(req.params.tag);
  const skip = (res.locals.page * limit) - limit;
  res.locals.pages = parseInt(Math.ceil(docs / limit));

  // entry data
  res.locals.entries = await db.getListOfEntriesByCategory(req.params.tag, skip);
  res.locals.errMessage = res.locals.entries.length === 0 ?
    "The requested topic is invalid. Check the list of topics." :
    null;

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
  res.locals.errMessage = null;

  // retrieve chosen entry to read
  const { slug = null, _id } = req.params;
  res.locals.entry = await db.getOneEntry( slug, _id );
  res.locals.entry.HTML = converter.makeHtml(res.locals.entry.markdown);
  
  // pagination
  res.locals.pagination = await db.getAdjacents(res.locals.entry.pubDate);

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
  res.locals.errMessage = null;

  // chosen entry to edit or new entry
  res.locals.entry = new Entry();
  const { slug } = req.params;
  
  let dates = {};
  if(slug){
    const entry = await db.getOneEntry(slug);

    // body
    entry.HTML = converter.makeHtml(entry.markdown); // 🔸 move to add to scrubbing HTML

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

  res.locals.entry = req.body;
  res.locals.preview = true;
  
  // * PREP DATA
  res.locals.entry.slug = slugify(res.locals.entry.title, { lower: true });
  const tags = res.locals.entry.tags;

  // prep date format
  res.locals.entry.pubDate = !res.locals.entry.datePicker || !res.locals.entry.timePicker ? "" :
    new Date(`${res.locals.entry.datePicker}T${res.locals.entry.timePicker}`);

  res.locals.entry.tags = Array.isArray(tags) ? tags : tags.split(",").map(element => element.trim());
  res.locals.entry.HTML = converter.makeHtml(res.locals.entry.markdown);

  res.render('partials/content');
}


// * DELETE EXISTING ENTRIES 🔹
module.exports.deleteEntry = async (req, res) => {
  const { _id } = req.params;
  const result = await db.deleteOneEntry({_id});
  // todo: change to return a message using AJAX instead of going to the home page;
  // this would leave the content of the entry in the editor so the user could save the entry again, if needed
  // warn the user that this might break SEO for an entry since it now relies on ID instead of just the slug
  res.redirect('editor');
}


// * RENDER LIST BY DATE WITH ERROR MESSAGE
module.exports.getError = async (req, res) => {

  // css
  res.locals.css = "list";
  res.locals.errMessage = `The requested URL is invalid.`;

  // data for list pagination
  res.locals.page = parseInt(req.params.page) || 1;
  const docs = await db.getEntryCount();
  const skip = (res.locals.page * limit) - limit;
  res.locals.pages = parseInt(Math.ceil(docs / limit));

  // queries
  res.locals.entries = await db.getListOfEntriesByDate( skip );
  res.locals.topics = await db.getCategories();
  res.locals.archive = await db.getArchive();

  // disabled items
  res.locals.adjacentEntries = null;
  res.locals.publish = true;
  res.locals.requestedTag = null;

  res.render('list');

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
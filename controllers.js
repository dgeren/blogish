const slugify = require('slugify');
const jwt = require('jsonwebtoken');
const showdown = require('showdown');
const converter = new showdown.Converter({ 'noHeaderId': true });
// const functions = require('./views/functions.js');

const db = require('./db.js');

const User = require('./models/User');
const Entry = require('./models/Post'); // 🟠 When the database is rebuilt, change to models/Entry

const { fixHtmlTags, limit, maxAge } = require('./util');
const { ppid } = require('process'); // can't remove even though it appears to not be in use
const e = require('express'); // is this still needed?


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

  // css
  res.locals.css = 'list';
  res.locals.type = 'list';
  
  // data for list pagination
  res.locals.page = parseInt(req.params.page) || 1;
  const docs = await db.getEntryCount(null, res.locals.user);
  const skip = (res.locals.page * limit) - limit;
  res.locals.pages = parseInt(Math.ceil(docs / limit));

  // queries
  res.locals.entries = await db.getListOfEntriesByDate( skip );
  res.locals.topics = await db.getCategories(res.locals.user);
  res.locals.archive = await db.getArchive(res.locals.user);

  // disabled items
  res.locals.adjacentEntries = null;
  res.locals.publish = true;
  res.locals.requestedTag = null;

  res.render('page');
} 


// * GET LIST OF UNPUBLISHED ARTICLES
module.exports.getListUnpublished = async (req, res) => {

  // data for sidebar
  res.locals.topics = await db.getCategories(res.locals.user);
  res.locals.archive = await db.getArchive(res.locals.user);

  // css
  res.locals.css = 'list';
  res.locals.type = 'list';

  // entry data
  res.locals.entries = await db.getListOfUnpublishedEntries();
  
  // disabled items
  res.locals.pages = 0;
  res.locals.page = 0;
  res.locals.adjacentEntries = null;
  res.locals.publish = false;
  res.locals.requestedTag = null;

  res.render('page');
}


// * GET ARTICLE LIST BASED ON A TOPIC
module.exports.getListByTag = async (req, res) => {

  // 
  res.locals.css = 'list';
  res.locals.type = 'list';

  // page elements
  res.locals.topics = await db.getCategories(res.locals.user);
  res.locals.archive = await db.getArchive(res.locals.user);
  res.locals.requestedTag = req.params.tag;

  // pageination
  res.locals.page = parseInt(req.params.page) || 1;
  const docs = await db.getEntryCount(req.params.tag, res.locals.user);
  const skip = (res.locals.page * limit) - limit;
  res.locals.pages = parseInt(Math.ceil(docs / limit));

  // entry data
  res.locals.entries = await db.getListOfEntriesByCategory(req.params.tag, res.locals.user);

  // enabled items
  res.locals.publish = true;

  // disabled items
  res.locals.adjacentEntries = null;

  res.render('page');
}


// * OPEN ARTICLES IN READER
module.exports.getEntry = async (req, res) => {

  // page elements
  res.locals.topics = await db.getCategories(res.locals.user);
  res.locals.archive = await db.getArchive(res.locals.user);

  // rendering variables
  res.locals.css = 'reader';
  res.locals.type = 'reader';

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
  
  console.log("🔸 res.locals.pagination:\n", res.locals.pagination); //🔴

  res.render('page');
}


// * OPEN ARTICLE IN EDITOR OR SERVE EMPTY EDITOR
module.exports.getEditor =  async (req, res) => {
  
  // page elements
  res.locals.topics = await db.getCategories(res.locals.user);
  res.locals.archive = await db.getArchive(res.locals.user);

  // rendering variavles
  res.locals.css = 'editor';
  res.locals.type = 'editor';

  // chosen entry to edit or new entry
  res.locals.entry = {};
  const { slug } = req.params;
  
  if(slug){
    const entry = await db.getOneEntry(slug);

    // body
    entry.HTML = converter.makeHtml(entry.markdown); // 🔸 move to util and add to scrubbing HTML

    // entry reader to render 🔸 is the seaparate entry variable still needed?
    res.locals.entry = entry;

    // disabled items
    res.locals.pagination = { next: null, previous: null };
  }

  res.render('page');
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
  
  const result = await db.addOrUpdateEntry(entry);
  res.send((result.message));
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


// * DELETE EXISTING ENTRIES
module.exports.deleteEntry = async (req, res) => {
  const { _id } = req.params;
  const result = await db.deleteOneEntry({_id});
  
  res.send(result.message);
}


// * RENDER LIST BY DATE WITH ERROR MESSAGE
// ! IS THIS STILL NEEDED?
module.exports.getError = async (req, res) => {

  // css
  res.locals.css = "list";
  res.locals.errMessage = `The requested URL is invalid.`;

  // data for list pagination
  res.locals.page = parseInt(req.params.page) || 1;
  const docs = await db.getEntryCount(null, res.locals.user);
  const skip = (res.locals.page * limit) - limit;
  res.locals.pages = parseInt(Math.ceil(docs / limit));

  // queries
  res.locals.entries = await db.getListOfEntriesByDate( skip );
  res.locals.topics = await db.getCategories(res.locals.user);
  res.locals.archive = await db.getArchive(res.locals.user);

  // disabled items
  res.locals.adjacentEntries = null;
  res.locals.publish = true;
  res.locals.requestedTag = null;

  res.render('list');

}



// * RENDER ADMIN PAGE
module.exports.getAdmin = async (req, res) => {
  // rendering variables
  res.locals.css = "editor";
  res.locals.type = 'admin';

  // queries
  res.locals.topics = await db.getCategories(res.locals.user);
  res.locals.archive = await db.getArchive(res.locals.user);
  
  res.render('page');
}


// * CREATER NEW USERS
module.exports.createAccount = async (req, res) => {
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
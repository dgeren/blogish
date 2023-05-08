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
const { insertMany } = require('./models/Post');
const { runInNewContext } = require('vm');
const { isFloat32Array } = require('util/types');


/*
* INTERNAL METHODS
*/
const createToken = id => { // 🟠 why can't this work from util.js?
  return jwt.sign({ id }, 'net ninja secret', { // 🟠 fix secret & make more secure
    expiresIn: maxAge
  });
}

// get user data for attribution and contributor lists 
const getAttributionData = async entries => {
  let userIDs = [];
  entries.forEach(entry => {
    if(!userIDs.includes(entry.authorID)) userIDs.push(entry.authorID);
  });
  
  let users = {};
  for(const id of userIDs){
    const result = await db.getUser(id);
    users[id] = result[0];
  }

  return users;
}


/*
* EXPORTED METHODS
*/
// * GET LIST OF ARTICLES SORTED BY DESCENDING DATE AND LIMITED
module.exports.getListByPubDate = async (req, res) => {
  if(!res.locals.user) res.locals.user = {};

  // sidebar data
  res.locals.topics = await db.getCategories(res.locals.user);
  res.locals.archive = await db.getArchive(res.locals.user);
  res.locals.contributors = await db.getUsers(res.locals.user);

  // start page parameters
  res.locals.pageDetails = {
    css: 'list',
    type: 'partials_entry/list'
  };
  
  // pagination data
  const pageNum = parseInt(req.params.page) || 1;
  const docs = await db.getEntryCount(null, res.locals.user);
  const skip = (pageNum * limit) - limit;

  res.locals.pageDetails.pages = pages = parseInt(Math.ceil(docs / limit));
  res.locals.pageDetails.page = pageNum;

  // get entry and attribution data
  res.locals.entries = await db.getListOfEntriesByDate( skip );
  res.locals.users = await getAttributionData(res.locals.entries);

  res.render('page');
} 


// * GET LIST OF UNPUBLISHED ARTICLES
module.exports.getListUnpublished = async (req, res) => {

  // get sidebar data
  res.locals.topics = await db.getCategories(res.locals.user);
  res.locals.archive = await db.getArchive(res.locals.user);
  res.locals.contributors = await db.getUsers(res.locals.user);

  // start page parameters
  res.locals.pageDetails = {
    css: 'list',
    type: 'partials_entry/list',
    publish: false
  }

  // entry and attribution data
  res.locals.entries = await db.getListOfUnpublishedEntries();
  res.locals.users = await getAttributionData(res.locals.entries);

  res.render('page');
}


// * GET ARTICLE LIST BASED ON A TOPIC
module.exports.getListByTag = async (req, res) => {
  if(!res.locals.user) res.locals.user = {};

  // get sidebar data
  res.locals.topics = await db.getCategories(res.locals.user);
  res.locals.archive = await db.getArchive(res.locals.user);
  res.locals.contributors = await db.getUsers(res.locals.user);

  // start page parameters
  res.locals.pageDetails = {
    css: 'list',
    type: 'partials_entry/list',
    publish: true,
    requestedTag: req.params.tag
  };

  // entry and attribution data
  res.locals.entries = await db.getListOfEntriesByCategory(req.params.tag, res.locals.user);
  res.locals.users = await getAttributionData(res.locals.entries);

  res.render('page');
}


// * OPEN ARTICLES IN READER
module.exports.getEntry = async (req, res) => {
  if(!res.locals.user) res.locals.user = {};

  // page elements
  res.locals.topics = await db.getCategories(res.locals.user);
  res.locals.archive = await db.getArchive(res.locals.user);
  res.locals.contributors = await db.getUsers(res.locals.user);

  // start page parameters
  res.locals.pageDetails = {
    css: 'reader',
    type: 'partials_entry/reader'
  };

  // retrieve chosen entry to read
  const { slug = null, _id } = req.params;
  res.locals.entry = await db.getOneEntry( slug, _id );
  res.locals.entry.HTML = converter.makeHtml(res.locals.entry.markdown);
  
  // get entry and attribution data
  res.locals.attribution = await getAttributionData([res.locals.entry]);
  res.locals.pagination = await db.getAdjacents(res.locals.entry.pubDate);

  res.render('page');
}


// * OPEN ARTICLE IN EDITOR OR SERVE EMPTY EDITOR
module.exports.getEditor =  async (req, res) => {

  if(!res.locals.user) {
    res.redirect('/');
  } else {

    // page elements
    res.locals.topics = await db.getCategories(res.locals.user);
    res.locals.archive = await db.getArchive(res.locals.user);
    res.locals.contributors = await db.getUsers(res.locals.user);

    // set default values
    res.locals.errorMsg = null;
    res.locals.entry = {};
    res.locals.preview = false;
    res.locals.attribution = null;

    res.locals.pageDetails = {
      css: 'editor',
      type: 'partials_entry/editor',
      script: 'editor'
    };
  
    // chosen entry to edit or new entry
    res.locals.entry = {};
    const { slug = null } = req.params;

    if(slug){
      res.locals.entry = await db.getOneEntry(slug);
      res.locals.attribution = await getAttributionData([res.locals.entry]);
      const key = Object.keys(res.locals.attribution)[0];

      if(res.locals.attribution.role === "admin" || res.locals.entry.authorID === key){
        // 🔸 move to util and add to scrubbing HTML
        res.locals.entry.HTML = converter.makeHtml(res.locals.entry.markdown);
        
      } else {
        res.locals.errorMsg = "Unauthorized request.";
      }
    }
    res.render('page');
  }
}


// * SAVE NEW OR EXISTING ENTRIES
module.exports.postEntry = async (req, res) => {
  let result = {};
  // todo: add a role test to prevent unauthorized edits from saving

  // HANDLE ENTRY AND DB
  const entry = req.body;
  const { tags } = req.body;

  // prep date format
  entry.pubDate = !entry.datePicker || !entry.timePicker ? "" :
    new Date(`${entry.datePicker}T${entry.timePicker}`);
  delete entry.datePicker;
  delete entry.timePicker;

  // prep topics
  entry.tags = tags
    .split(",")
    .filter(tags => tags.trim() !== "")
    .map(tags => tags.trim());
  
  entry.slug = slugify(entry.title, { lower: true });

  if(entry.entryID) {
    entry.id = entry.entryID;
    delete entry.entryID;
    result = await db.updateEntry(entry);
  } else {
    result = await db.saveEntry(entry);
  }
  
  res.send((result.message));
}


// * GET HTML FOR EDITOR PREVIEW
module.exports.getEditorPreview = async (req, res) => {

  res.locals.entry = req.body;
  res.locals.preview = true;
  
  // get attribution data
  res.locals.attribution = await getAttributionData([res.locals.entry]);
  
  // * PREP DATA
  res.locals.entry.slug = slugify(res.locals.entry.title, { lower: true });
  const tags = res.locals.entry.tags;

  // prep date format
  res.locals.entry.pubDate = !res.locals.entry.datePicker || !res.locals.entry.timePicker ? "" :
    new Date(`${res.locals.entry.datePicker}T${res.locals.entry.timePicker}`);

  res.locals.entry.tags = Array.isArray(tags) ? tags : tags.split(",").map(element => element.trim());
  res.locals.entry.HTML = converter.makeHtml(res.locals.entry.markdown);

  res.render('partials_entry/content');
}


// * DELETE EXISTING ENTRIES
module.exports.deleteEntry = async (req, res) => {
  const { _id } = req.params;
  const result = await db.deleteOneEntry({_id});
  
  res.send(result.message);
}


// * NEW ADMIN CONTROLLER
module.exports.getAdmin = async (req, res) => {
  // initialize variables
  const userID = res.locals.user._id.toString() || "";
  const userRole = res.locals.user.role || "";
  const requestID = req.params._id || null;
  const url = req.url;
  const isBlank = userRole === 'admin' && url === '/admin';
  
  res.locals.pageDetails = {
    css: 'editor',
    type: 'partials_user/admin',
    script: 'admin',
    blank: isBlank
  };

  // if criteria are not met, send user to home page
  if(!res.locals.user || (userRole !== 'admin' && userID !== requestID )) {
    res.locals.message = 'Unauthorized request.';
    res.redirect('/');
  // but if criteria for a blank for are met, send an empty contributor object
  } else if(isBlank) {
    // page elements
    res.locals.topics = await db.getCategories(res.locals.user);
    res.locals.archive = await db.getArchive(res.locals.user);
    res.locals.contributors = await db.getUsers(res.locals.user);
    res.locals.contributor = [];
    res.locals.contributor[0] = {
      _id: "",
      email: "",
      role: "",
      pseudonym: "",
      byline: "",
      shortText: "",
      longText: ""
    }

    res.render('page');

  //  otherwise get the user info and send a filled form
  } else {
    res.locals.contributor = await db.getUser(requestID, true);
    
    // page elements
    res.locals.topics = await db.getCategories(res.locals.user);
    res.locals.archive = await db.getArchive(res.locals.user);
    res.locals.contributors = await db.getUsers(res.locals.user);
    
    res.render('page');
  }
}


// * ADMIN PREVIEW
module.exports.getAdminPreview = (req, res) => {

}


// * LIST CONTRIBUTORS
module.exports.getContributors = async (req, res) => {
  if(!res.locals.user) res.locals.user = {};

  // queries
  res.locals.topics = await db.getCategories(res.locals.user);
  res.locals.archive = await db.getArchive(res.locals.user);
  res.locals.contributors = await db.getUsers(res.locals.user);

  // page details
  res.locals.pageDetails = {
    css: 'list',
    type: 'partials_user/contributors'
  }

  res.render('page');
}


module.exports.getContributor = async (req, res) => {
  if(!res.locals.user) res.locals.user = {};

  // queries
  res.locals.topics = await db.getCategories(res.locals.user);
  res.locals.archive = await db.getArchive(res.locals.user);
  res.locals.contributors = await db.getUsers(res.locals.user);

  // page details
  res.locals.pageDetails =  {
    css: 'list',
    css2: 'reader',
    type: 'partials_user/contributor'
  }

  // get the i(ndex) of the requested user
  res.locals.i = res.locals.contributors.findIndex(obj => obj._id.toString() === req.params._id);

  res.render('page');
}


// * CREATER NEW USERS
module.exports.createUser = async (req, res) => {
  try {
    if(!res.locals.user && res.locals.user.role !== "admin") {
      res.redirect('/');
    } else {
      if(!res.locals.user) res.locals.user = {};
      db.createUser(req.body.user);
      return true;
    }
  }
  catch(err) {
    console.log(err);
    return false;
  }
}

// * SAVE USER CHANGES
module.exports.updateUser = async (req, res) => {
  try {
    
  } catch { 
    
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
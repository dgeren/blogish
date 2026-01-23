const slugify = require('slugify');
const jwt = require('jsonwebtoken');
const showdown = require('showdown');
const converter = new showdown.Converter({ 'noHeaderId': true });
const db = require('./db.js');
// const functions = require('./views/functions.js'); // ? why is this commented out; delete?

const User = require('./models/User');
const Entry = require('./models/Post');

const { fixHtmlTags, limit, maxAge } = require('./util');
const { ppid } = require('process'); // can't remove even though it appears to not be in use
const e = require('express'); // is this still needed?
const { insertMany } = require('./models/Post');
const { runInNewContext } = require('vm');
const { isFloat32Array } = require('util/types');


/*
* INTERNAL METHODS
*/
const createToken = id => { // 🔸 why can't this work from util.js?
  return jwt.sign({ id }, 'net ninja secret', { // 🔸 fix secret & make more secure
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

const setPageRainment = async (res, req, { css, type, paginate = true }) => {
  
  // SIDEBAR
  // ad hoc links
  res.locals.adhocPages = await db.getAdhoc();

  // tags/categories/topics
  res.locals.topics = await db.getCategories(res.locals.user);

  // entry titles, pub dates, and url
  res.locals.archive = await db.getArchive(res.locals.user);

  // user names and IDs
  res.locals.contributors = await db.getUsers(res.locals.user);

  res.locals.pageDetails = {};
  // PAGINATION
  if(paginate){
    // number of entries in the db based on login status
    const numberOfEntries = await db.getEntryCount(null, res.locals.user);

    // get || set page number
    const pageNum = parseInt(req.params.page) || 1;
    
    // set the number of total pages
    res.locals.pageDetails.pages = parseInt(Math.ceil(numberOfEntries / limit));

    // set the page number
    res.locals.pageDetails.page = pageNum;

    // set the number of entries to skip
    res.locals.pageDetails.skip = (pageNum * limit) - limit;
  }

  // RENDERING data
  // define page for rendering engine
  res.locals.pageDetails.css = css;                                                                                 
  res.locals.pageDetails.type = type;
}


/*
* EXPORTED METHODS
*/

// * GET ADHOC PAGES
module.exports.getAdhoc = async (req, res) => {

  // set sidebar data and pagination details
  await setPageRainment(res, req, {css: 'reader', type: 'partials_entry/reader', paginate: false});

  // get page 
  // res.local.page = await db.getListOfEntriesByDate( res.locals.pageDetails, res.locals.user );

  // res.render('page');

  // test error block
  res.redirect('/');
}



// * GET LIST OF ARTICLES SORTED BY DESCENDING DATE AND LIMITED
module.exports.getListByPubDate = async (req, res) => {
  if(!res.locals.user) res.locals.user = null;
  

  // set sidebar data and pagination details
  await setPageRainment(res, req, { css: 'list', type: 'partials_entry/list' });

  // get entry and attribution data
  res.locals.entries = await db.getListOfEntriesByDate( res.locals.pageDetails, res.locals.user );
  res.render('page');
} 


// * GET LIST OF UNPUBLISHED ARTICLES
module.exports.getListUnpublished = async (req, res) => {

  if(!res.locals.user) {
    res.locals.user = null;
    res.locals.message = "Unauthorized request.";
    res.redirect('/');
  } else {

    // set sidebar data and pagination details
    await setPageRainment(res, req, { css: 'list', type: 'partials_entry/list', paginate: false });

    // enable unpublished only
    res.locals.pageDetails.publish = false;

    // entry and attribution data
    res.locals.entries = await db.getListOfUnpublishedEntries();
    res.locals.users = await getAttributionData(res.locals.entries);

    res.render('page');
  }
}


// * GET ARTICLE LIST BASED ON A TOPIC
module.exports.getListByTag = async (req, res) => {
  if(!res.locals.user) res.locals.user = null;

  // set sidebar data and pagination details
  await setPageRainment(res, req, { css: 'list', type: 'partials_entry/list', paginate: false });

  // start page parameters
  res.locals.pageDetails.requestedTag = req.params.tag;


  // entry and attribution data
  res.locals.entries = await db.getListOfEntriesByCategory(req.params.tag, res.locals.user);
  res.locals.users = await getAttributionData(res.locals.entries);

  res.render('page');
}


// * OPEN ARTICLES IN READER
module.exports.getEntry = async (req, res) => {
  if(!res.locals.user) res.locals.user = null;
  
  // set sidebar data and pagination details
  await setPageRainment(res, req, { css: 'reader', type: 'partials_entry/reader', paginate: false });

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
    res.locals.user = null;
    res.locals.message = "Unauthorized request.";
    res.redirect('/');
  } else {
  
    // set sidebar data and pagination details
    await setPageRainment(res, req, { css: 'editor', type: 'partials_entry/editor', paginate: false });
    res.locals.pageDetails.script = 'editor';

    // set default values
    res.locals.errorMsg = null;
    res.locals.entry = {};
    res.locals.preview = false;
    res.locals.attribution = null;
  
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

  if(!res.locals.user) {
    res.locals.user = null;
    res.locals.message = "Unauthorized request.";
    res.redirect('/');
  } else {
    let result = {};
    // todo: add a role test to prevent unauthorized edits from savingppppnpm startnpm start    

    // HANDLE ENTRY AND DB
    const entry = req.body;
    const { tags } = req.body;

    // 🔴 Move the functions to modify the data to db.js
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
      entry.id = entry.entryID; // 🔴 why these two lines? 
      delete entry.entryID;
      result = await db.updateEntry(entry);
    } else {
      result = await db.saveEntry(entry);
    }
    
    res.send((result.message));
  }
}


// * GET HTML FOR EDITOR PREVIEW
module.exports.getEditorPreview = async (req, res) => {

  if(!res.locals.user) {
    res.locals.user = null;
    res.locals.message = "Unauthorized request.";
    res.redirect('/');
  } else {

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
}


// * DELETE EXISTING ENTRIES
module.exports.deleteEntry = async (req, res) => {

  if(!res.locals.user) {
    res.locals.user = null;
    res.locals.message = "Unauthorized request.";
    res.redirect('/');
  } else {
    const { _id } = req.params;
    const result = await db.deleteOneEntry({_id});
    
    res.send(result.message);
  }
}


// * NEW ADMIN CONTROLLER
module.exports.getAdmin = async (req, res) => {

  const notLoggedIn = !res.locals.user;
  const requestID = req.params._id || null;
  const userID    = notLoggedIn ? "" : res.locals.user._id.toString();
  const isAdmin   = notLoggedIn ? false : res.locals.user.role === 'admin';
  const isOwner   = requestID === userID;

  if(notLoggedIn || !(isOwner || isAdmin)) {

    res.locals.user = null;
    res.locals.message = "Unauthorized request.";
    res.redirect('/');

  } else {

    const isBlank = isAdmin && req.url === '/admin';
    
    // set sidebar data and pagination details
    await setPageRainment(res, req, { css: 'editor', type: 'partials_user/admin', paginate: false });

    res.locals.isOwner = isOwner;
    res.locals.isAdmin = isAdmin;
    res.locals.i = 0;
  
    if(isBlank){
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
    } else {
      res.locals.contributor = await db.getUser(requestID, true);
      res.locals.contributor[0].html = converter.makeHtml(res.locals.contributor[0].longText);
    }
  }
  res.render('page');
}


// * LIST CONTRIBUTORS
module.exports.getContributors = async (req, res) => {
  if(!res.locals.user) res.locals.user = null;
  
  // ad hoc links
  res.locals.adhocPages = await db.getAdhoc();

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
  if(!res.locals.user) res.locals.user = null;
  
  // ad hoc links
  res.locals.adhocPages = await db.getAdhoc();

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
  res.locals.contributors[res.locals.i].html =
    converter.makeHtml(res.locals.contributors[res.locals.i].longText);

  res.render('page');
}


// * CREATER NEW USERS
module.exports.createUser = async (req, res) => {
  try {
    if(!res.locals.user && res.locals.user.role !== "admin") {
      res.locals.user = null;
      res.locals.message = "Unauthorized request.";
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
    if(!res.locals.user && res.locals.user.role !== "admin") {
      res.locals.message = "Unauthorized request.";
      res.redirect('/');
    } else {
      res.locals.message = "Path incomplete";

      db.createUser(req.body.user);
      return true;
    }
    
  } catch(err) { 
    
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
const slugify = require('slugify');
const jwt = require('jsonwebtoken');

const User = require('./models/User');
const Entry = require('./models/Post'); // 🟠 When the database is rebuilt, change to models/Entry
const {
  fixHtmlTags,      formatDateString,
  formatDashedDate, handleErrors,
  prepPreview,      prepTags
} = require('./util');
const maxAge = 3600 * 72, limit = 3;


/*
* LOCAL METHODS
*/
const createToken = id => { // 🟠 why can't this work from util.js?
  return jwt.sign({ id }, 'net ninja secret', { // 🟠 fix secret & make more secure
    expiresIn: maxAge
  });
}

const getEntries = async parameters => {
  const {
    id = null,  slug = null,
    tag = null, sortOrder = -1,
    skip = null
  } = parameters;
  
  return id   ? await Entry.findOne({ _id: id }).lean() :
         slug ? await Entry.findOne({ slug }).lean() :
         tag  ? await Entry.find({ tags: tag, dateString: { $ne: "yyyy-mm-dd" } }).lean().sort({ dateString: sortOrder }).skip(skip).limit(limit) :
                await Entry.find({ dateString: { $ne: "yyyy-mm-dd" } }).lean().sort({ dateString: sortOrder}).skip(skip).limit(limit);
}

const getAdjacentSlugs = async dateString => {
  const next = await Entry.find({ dateString: { $gt: dateString } }).lean().sort({ dateString:  1 }).limit(1);
  const prev = await Entry.find({ dateString: { $lt: dateString } }).lean().sort({ dateString: -1 }).limit(1);


  return { next: next[0], prev: prev[0] }; 
}


/*
* EXPORTED METHODS
*/
// * GET LIST OF RECENT ARTICLES FOR HOME PAGE
module.exports.getListByPubDate = async (req, res) => {
  res.locals.message = null;
  const page = parseInt(req.params.page) || 1;
  const docs = await Entry.countDocuments({ dateString: { $ne: "yyyy-mm-dd" } });
  const skip = (page * limit) - limit;

  res.locals.pages = parseInt(Math.ceil(docs / limit));
  res.locals.entries = await getEntries({ skip, limit });
  res.locals.adjacentEntries = null;
  res.locals.entries.forEach(entry => {
    entry.content = fixHtmlTags(entry.content, "down");
    entry.preview = fixHtmlTags(prepPreview(entry.content), "down");
    entry.dateDisplay = formatDateString(entry.dateString);
    entry.tagHTML = prepTags(entry.tags);
  });
  res.locals.page = page;
  res.render('home');
}

// * GET ARTICLE LIST BASED ON A TAG
module.exports.getListByTag = async (req, res) => {
  res.locals.message = null;
  const { tag } = req.params;
  res.locals.page = parseInt(req.params.page) || 1;
  const docs = await Entry.countDocuments({ tag, dateString: { $ne: "yyyy-mm-dd" } });
  const skip = (res.locals.page * limit) - limit;

  res.locals.pages = parseInt(Math.ceil(docs / limit));
  res.locals.adjacentEntries = null;
  res.locals.entries = await getEntries({ tag, skip, limit });

  if(res.locals.entries.length > 0) {
    res.locals.entries.forEach(entry => {
      entry.content = fixHtmlTags(entry.content, "down");
      entry.preview = fixHtmlTags(prepPreview(entry.content), "down");
      entry.dateDisplay = formatDateString(entry.dateString);
      entry.tagHTML = prepTags(entry.tags);
    });
    res.locals.requestedTag = tag;
    res.render('tag');
  } else {
    
    res.locals.message = `Sorry, but I did not find posts tagged &#34;${ tag }.&#34;`;
    res.redirect('/');
  }
}

// * OPEN ARTICLES IN READER
module.exports.getEntry = async(req, res) => {
  res.locals.message = null;
  const { slug, id } = req.params;
  const entry = slug ? await getEntries({ slug }) : await getEntries({ id });

  if(entry){
    entry.content = fixHtmlTags(entry.content, "down");
    entry.tagHTML = prepTags(entry.tags);

    res.locals.entry = entry;
    res.locals.page = null;
    res.locals.pages = null;
    res.locals.adjacentEntries = await getAdjacentSlugs(entry.dateString);
    res.locals.message = "Save successful.";
    res.render('reader');
  } else { 
    res.locals.entries = await getEntries({ limit: 5 });
    res.locals.message = `Sorry, but I did not find a post at &#34;/${slug}&#34;`;
    res.render('home');
  }
}

// * OPEN ARTICLE IN EDITOR OR EMPTY EDITOR
module.exports.getEditor =  async (req, res) => {
  res.locals.message = null;
  res.locals.entry = new Entry();
  res.locals.pagination = { next: null, previous: null };
  const { slug } = req.params;
  if(slug){
    const entry = await getEntries({ slug });
    if(entry) {
      entry.content = fixHtmlTags(entry.content, "down");
      entry.preview = fixHtmlTags(prepPreview(entry.content), "down");
      entry.dateDisplay = formatDateString(entry.dateString);
      entry.tagHTML = prepTags(entry.tags);
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
  const { title, subtitle, dateString, authorID, _id } = req.body;
  let { content, tags } = req.body;

  
  // condition data
  const slug = slugify(title, { lower: true });
  content = fixHtmlTags(content, "up");
  tags = tags.split(",").map(element => element.trim());
  
  const entry = await Entry.findOneAndUpdate(
    { _id },
    { title, slug, subtitle, content, tags, dateString, authorID },
    { new: true, upsert: true }
  );

  // not sure we even need the entry to be returned. But maybe this could be used for the revert button to work.
  if(entry){
    entry.content = fixHtmlTags(entry.content, "up");
    
    res.status(200).send({ message: "Save successful.", entry });
  } else {
    res.locals.message = "Something went wrong, but I can't tell you what.";
    res.locals.entry = new Entry();
    res.render('editor');
  }
}

module.exports.deleteEntry = async (req, res) => {
  res.locals.message = "Entry deleted. Here are some recents entries.";
  const { _id } = req.params;
  const entry = await Entry.deleteOne({ _id }, err => {
    res.locals.message = "I failed to delete an entry. Are you sure this entry still exists?";
  });
  // 🟠 DRY: this is repeated in home_get; make into a support function
  res.locals.message = null;
  const entries = await getEntries({ limit: 5 });
  entries.forEach(element => {
    element.content = fixHtmlTags(element.content, "down");
    element.preview = fixHtmlTags(element.content.split(" ").slice(0, 25).join(" "), "strip"); // 🟠 add a preview function to fixHtmlTags
  });
  res.locals.entries = entries;
  res.render('home');
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

//* CREATE LIST ARRAY CONSISTING OF 

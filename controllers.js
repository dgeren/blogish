const slugify = require('slugify');
const jwt = require('jsonwebtoken');

const User = require('./models/User');
const Post = require('./models/Post');
const {
  fixHtmlTags,      formatDateString,
  formatDashedDate, handleErrors,
  prepPreview,      prepTags
} = require('./util');


/*
* GLOBALS
*/
const maxAge = 3600 * 72;


/*
* LOCAL METHODS
*/
const createToken = id => { // 🟠 why can't this work from util.js?
  return jwt.sign({ id }, 'net ninja secret', { // 🟠 fix secret & make more secure
    expiresIn: maxAge
  });
}

const getPosts = async (parameters) => {
  const {
    id = null,  slug = null,
    tag = null, sortOrder = -1,
    limit = 1
  } = parameters;
  
  return id   ? await Post.findOne({ _id: id }).lean() :
         slug ? await Post.findOne({ slug }).lean() :
         tag  ? await Post.find({ tags: tag, dateString: { $ne: "yyyy-mm-dd" } }).lean().sort({ dateString: sortOrder }).limit(limit) :
                await Post.find({ dateString: { $ne: "yyyy-mm-dd" } }).lean().sort({ dateString: sortOrder}).limit(limit);
}


/*
* EXPORTED METHODS
*/

// * GET LIST OF RECENT ARTICLES FOR HOME PAGE
module.exports.getHome = async (req, res) => {
  res.locals.message = null;
  let entries = await getPosts({ limit: 3 });
  entries.forEach(entry => {
    entry.content = fixHtmlTags(entry.content, "down");
    entry.preview = fixHtmlTags(prepPreview(entry.content), "down");
    entry.dateDisplay = formatDateString(entry.dateString);
    entry.tagHTML = prepTags(entry.tags);
  });
  res.locals.entries = entries;
  res.render('home');
}

// * GET ARTICLE LIST BASED ON A TAG
module.exports.getEntriesByTag = async (req, res) => {
  res.locals.message = null;
  const { tag } = req.params;
  const entries = await getPosts({ tag, limit: 5 });

  if(entries) {
    entries.forEach(entry => {
      entry.content = fixHtmlTags(entry.content, "down");
      entry.preview = fixHtmlTags(prepPreview(entry.content), "down");
      entry.dateDisplay = formatDateString(entry.dateString);
      entry.tagHTML = prepTags(entry.tags);
    });
    res.locals.entries = entries;
    res.locals.requestedTag = tag;
    res.render('tag');
  } else {
    res.locals.message = `Sorry, but I did not find posts tagged &#34;${ tag }.&#34;`;
    res.render('home');
  }
}

// * OPEN ARTICLES IN READER
module.exports.getOneEntry = async(req, res) => {
  res.locals.message = null;
  const { slug, id } = req.params;
  const entry = slug ? await getPosts({ slug }) : await getPosts({ id });

  if(entry){
    entry.content = fixHtmlTags(entry.content, "down");
    entry.tagHTML = prepTags(entry.tags);

    res.locals.entry = entry;
    res.locals.message = "Save successful.";
    res.render('reader');
  } else { 
    res.locals.entries = await getPosts({ limit: 5 });
    res.locals.message = `Sorry, but I did not find a post at &#34;/${slug}&#34;`;
    res.render('home');
  }
}

// * OPEN ARTICLES IN EDITOR
module.exports.getEditor =  async (req, res) => {
  res.locals.message = null;
  res.locals.entry = new Post();
  const { slug } = req.params;
  if(slug){
    const entry = await getPosts({ slug });
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

// * SAVE NEW OR EXISTING POSTS
module.exports.postEntry = async (req, res) => {
  res.locals.message = null;
  const { title, subtitle, dateString, authorID, _id } = req.body;
  let { content, tags } = req.body;

  
  // condition data
  const slug = slugify(title, { lower: true });
  content = fixHtmlTags(content, "up");
  tags = tags.split(",").map(element => element.trim());
  
  const entry = await Post.findOneAndUpdate(
    { _id },
    { title, slug, subtitle, content, tags, dateString, authorID },
    { new: true, upsert: true }
  );

  // not sure we even need the post to be returned. But maybe this could be used for the revert button to work.
  if(entry){
    entry.content = fixHtmlTags(entry.content, "up");
    
    res.status(200).send({ message: "Save successful.", entry });
  } else {
    res.locals.message = "Something went wrong, but I can't tell you what.";
    res.locals.entry = new Post();
    res.render('editor');
  }
}

module.exports.deleteEntry = async (req, res) => {
  res.locals.message = "Post deleted. Here are some recents posts.";
  const { _id } = req.params;
  const post = await Post.deleteOne({ _id }, err => {
    res.locals.message = "I failed to delete a post. Are you sure this post is not already deleted?";
  });
  // 🟠 DRY: this is repeated in home_get; make into a support function
  res.locals.message = null;
  const entries = await getPosts({ limit: 5 });
  entries.forEach(entry => {
    entry.content = fixHtmlTags(entry.content, "down");
    entry.preview = fixHtmlTags(entry.content.split(" ").slice(0, 25).join(" "), "strip"); // 🟠 add a preview function to fixHtmlTags
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

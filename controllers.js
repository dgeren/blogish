const slugify = require('slugify');
const jwt = require('jsonwebtoken');

const User = require('./models/User');
const Post = require('./models/Post');
const { fixHtmlTags, handleErrors, prepPreview } = require('./util');


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
  
  return id   ? await Post.findOne({ _id: id }) :
         slug ? await Post.findOne({ slug }) :
         tag  ? await Post.find({ tags: tag }).sort({ _id: sortOrder }).limit(limit) :
                await Post.find().sort({ _id: sortOrder}).limit(limit);
}


/*
* EXPORTED METHODS
*/

// * GET LIST OF RECENT ARTICLES FOR HOME PAGE
module.exports.home_get = async (req, res) => {
  res.locals.message = null;
  const posts = await getPosts({ limit: 5 });
  posts.forEach(post => {
    post.content = fixHtmlTags(post.content, "down");
    post.preview = fixHtmlTags(post.content.split(" ").slice(0, 25).join(" "), "strip"); // 🟠 add a preview function to fixHtmlTags
  });
  res.locals.posts = posts;
  res.render('home');
}

// * GET ARTICLE LIST BASED ON A TAG
module.exports.tag_get = async (req, res) => {
  res.locals.message= null;
  const { tag } = req.params;
  const posts = await getPosts({ tag, limit: 5 });

  if(posts) {
    posts.forEach(post => {
      post.content = fixHtmlTags(post.content, "down");
      post.preview = fixHtmlTags(post.content.split(" ").slice(0, 25).join(" "), "strip");
    });
    res.locals.posts = posts;
    res.locals.requestedTag = tag;
    res.render('tag');
  } else {
    res.locals.message = `Sorry, but I did not find posts tagged &#34;${ tag }.&#34;`;
    res.render('home');
  }
}

// * OPEN ARTICLES IN READER
module.exports.post_get = async(req, res) => {
  res.locals.message= null;
  const { slug, id } = req.params;
  const post = slug ? await getPosts({ slug }) : await getPosts({ id });

  if(post){
    post.content = fixHtmlTags(post.content, "down");
    res.locals.post = post;
    res.locals.message = "Save successful.";
    res.render('post');
  } else { 
    res.locals.posts = await getPosts({ limit: 5 });
    res.locals.message = `Sorry, but I did not find a post at &#34;/${slug}&#34;`;
    res.render('home');
  }
}

// * OPEN ARTICLES IN EDITOR
module.exports.editor_get =  async (req, res) => {
  res.locals.message= null;
  res.locals.post = new Post();
  const { slug } = req.params;
  if(slug){
    const post = await getPosts({ slug });
    if(post) {
      post.content = fixHtmlTags(post.content, "down");
      post.preview = prepPreview(post.content);
      res.locals.post = post;
    } else {
      res.locals.message = `I did not find anything at &#34;/${slug}&#34;. Would you like to write it now?`;
    }
  }
  res.render('editor');
}

// * SAVE NEW OR EXISTING POSTS
module.exports.editor_post = async (req, res) => {
  res.locals.message = null;
  const postData = { title, subtitle, content, tags, published, author, postID } = req.body;
  // condition data
  const slug = slugify(title, { lower: true });
  content = fixHtmlTags(content, "up");
  tags = tags.split(",").map(element => element.trim());
  
  const post = await Post.findOneAndUpdate(
    { _id: postID },
    { title, slug, subtitle, content, tags, published, author },
    { new: true, upsert: true }
  );

  // not sure we even need the post to be returned. But maybe this could be used for the revert button to work.
  if(post){
    post.content = fixHtmlTags(post.content, "down");
    post.preview = fixHtmlTags(post.content.split(" ").slice(0, 25).join(" "), "strip");
    res.status(200).send({ message: "Save successful.", post });
  } else {
    res.locals.message = "Something went wrong, but I can't tell you what.";
    res.locals.post = new Post();
    res.render('editor');
  }
}

module.exports.editor_delete = async (req, res) => {
  res.locals.message = "Post deleted. Here are some recents posts.";
  const { _id } = req.params;
  const post = await Post.deleteOne({ _id }, err => {
    res.locals.message = "I failed to delete a post. Are you sure this post is not alreayd deleted?";
  });
  // 🟠 DRY: this is repeated in home_get; make into a support function
  res.locals.message = null;
  const posts = await getPosts({ limit: 5 });
  posts.forEach(post => {
    post.content = fixHtmlTags(post.content, "down");
    post.preview = fixHtmlTags(post.content.split(" ").slice(0, 25).join(" "), "strip"); // 🟠 add a preview function to fixHtmlTags
  });
  res.locals.posts = posts;
  res.render('home');
}

// * RENDER ADMIN PAGE
module.exports.admin_get = (req, res) => {
  res.locals.message= null;
  res.render('admin');
}

// * CREATER NEW USERS
module.exports.signup_post = async (req, res) => {
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
module.exports.login_post = async (req, res) => {
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
module.exports.logout_get = async (req, res) => {
  res.cookie('jwt', '', { maxAge: 1 });
  res.redirect('/');
}

const slugify = require('slugify');
const jwt = require('jsonwebtoken');

const User = require('./models/User');
const Post = require('./models/Post');
const { fixHtmlTags, handleErrors } = require('./util');


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
module.exports.home_get = async (req, res) => {
  res.locals.message = null;
  const posts = await getPosts({ limit: 5 });
  posts.forEach(post => {
    post.content = fixHtmlTags(post.content, "down");
    post.preview = fixHtmlTags(post.content.split(" ").slice(0, 25).join(" "), "strip");
  });
  res.locals.posts = posts;
  res.render('home');
}

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

module.exports.post_get = async(req, res) => {
  res.locals.message= null;
  const { slug, id } = req.params;
  const post = slug ? await getPosts({ slug }) : await getPosts({ id });

  if(post){
    post.content = fixHtmlTags(post.content, "down");
    res.locals.post = post;
    res.render('post');
  } else { 
    res.locals.posts = await getPosts({ limit: 5 });
    res.locals.message = `Sorry, but I did not find a post at &#34;/${slug}&#34;`;
    res.render('home');
  }
}

module.exports.editor_get =  async (req, res) => {
  res.locals.message= null;
  const { slug } = req.params;
  const post = await getPosts({ slug });

  if(post) {
    post.content = fixHtmlTags(post.content, "down");
    res.locals.post = post;
  } else {
    res.locals.message = `I did not find anything at &#34;/${slug}&#34;. Would you like to write it now?`;
    res.locals.post = new Post();
  }

  res.render('editor');
}

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

  if(post){
    res.locals.message = "Saved to database successful.";
    res.locals.post = post;
  } else {
    res.locals.message = "Something went wrong, but I can't tell you what.";
    res.locals.post = new Post();
  }
  res.render('editor');
}

module.exports.admin_get = (req, res) => {
  res.locals.message= null;
  res.render('admin');
}

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

module.exports.logout_get = async (req, res) => {
  res.cookie('jwt', '', { maxAge: 1 });
  res.redirect('/');
}

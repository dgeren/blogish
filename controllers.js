const jwt = require('jsonwebtoken');
const slugify = require('slugify');

const User = require('./models/User');
const Post = require('./models/Post.js');

/*
* GLOBALS
*/
const maxAge = 3600 * 72;

/*
* LOCAL METHODS
*/
const handleErrors = err => {
  let errors = { email: '', password: '' };
  if(err.message === 'incorrect email') errors.email = 'Email address is not registered.';
  if(err.message === 'incorrect password') errors.password = 'Password is incorrect.';
  if(err.code === 11000) errors.email = 'Email address already registered.'
  if(err.message.includes('user validation failed')){
    Object.values(err.errors).forEach( ({ properties }) => {
      errors[properties.path] = properties.message;
    });
  }
  return errors;
}

const createToken = id => {
  return jwt.sign({ id }, 'net ninja secret', {
    expiresIn: maxAge
  });
}

const getPosts = async (parameters) => {
  const {
    id = null,  slug = null,
    tag = null, sortOrder = -1,
    limit = 1
  } = parameters;
  
  return id ?   await Post.find({ _id: id }) :
         slug ? await Post.findOne({ slug }) :
         tag ?  await Post.find({ tag }).sort({ _id: sortOrder }).limit(limit) :
                await Post.find().sort({ _id: sortOrder}).limit(limit);
}


/*
* EXPORTED METHODS
*/
module.exports.home_get = async (req, res) => {
  res.locals.errorMessage = false;
  res.locals.posts = await getPosts({ limit: 5 });
  res.render('home');
}

module.exports.tags_get = async (req, res) => {
  res.locals.errorMessage = false;
  res.locals.posts = await getPosts({ tag, limit: 5 });
  res.render('tags');
}

module.exports.post_get = async(req, res) => {
  const { slug } = req.params;
  res.locals.errorMessage = null;
  const subs = [
    [ /&lt;/gi, "<" ],
    [ /&gt;/gi, ">" ],
    [ /&amp;#34;/gi, "\"" ],
    [ /&amp;#39;/gi, "\'"]
  ]

  const post = await getPosts({ slug });
  subs.forEach(sub => {
    post.content = post.content.replace(sub[0], sub[1]);
  });
  
  res.locals.post = post;
  if(res.locals.post){
    res.render('post');
  } else { 
    res.locals.posts = await getPosts({ limit: 5 });
    res.locals.errorMessage = `Sorry, but I could not find a post at "/${slug}"`;
    res.render('home');
  }
}

module.exports.editor_get =  async (req, res) => {
  const { slug } = req.params;
  res.locals.post = slug ? await getPosts({ slug }) : new Post();
  //TODO: else return 404 🟠
  res.render('editor');
}

// 🟢
module.exports.editor_post = async (req, res) => {
  const postData = { title, subtitle, content, tags, published, author, postID } = req.body;
  const slug = slugify(title, { lower: true });

  res.locals.post = await Post.findOneAndUpdate(
    { _id: postID },
    { title, subtitle, content, tags, published, author },
    { new: true, upsert: true }
  );

  res.render('editor');
}

module.exports.admin_get = (req, res) => {
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

// module.exports.handle_error = (req, res) => {
//   res.render('error');
// }

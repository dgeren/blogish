const jwt = require('jsonwebtoken');

const User = require('./models/User');
const Post = require('./models/Post.js');

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

const getRecentPosts = async () => {
  return await Post.find({}).sort({ date: -1 }).limit(5);
}


/*
* EXPORTED METHODS
*/
module.exports.home_get = async (req, res) => {
  res.locals.errorMessage = false;
  res.locals.posts = await getRecentPosts();
  res.render('home');
}

module.exports.tags_get = async (req, res) => {
  //* get logic for getting tags from a previous version of blogish
  res.render('tags');
}

module.exports.post_get = async(req, res) => {
  const { slug } = req.params;
  res.locals.errorMessage = null;
  res.locals.post = await Post.findOne({ slug });
  console.log(res.locals.post);
  if(res.locals.post){
    res.render('post');
  } else {
    res.locals.posts = await getRecentPosts();
    res.locals.errorMessage = `Sorry, but I could not find a post at "/${slug}"`;
    res.render('home');
  }
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

// 🟢
module.exports.editor_get =  async(req, res) => {
  const { slug } = req.params;
  res.locals.post = slug ? await Post.findOne({ slug }): new Post();
  //TODO: else return 404 🟠
  res.render('editor');
}

module.exports.editor_post = async (req, res) => {
  const { title, subtitle, preview, content, tags, published, author, slug } = req.body;
  let post = {}; //TODO: change to terniary structure similar to editor_get 🟠
  if(slug) {
    post = await Post.findOneAndUpdate({ slug });
  } else {
    post = await Post.create({ title, subtitle, content, tags, published, author });
  }
  res.render('editor');
}

// module.exports.handle_error = (req, res) => {
//   res.render('error');
// }

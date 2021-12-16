const jwt = require('jsonwebtoken');

const User = require('./models/User');
const Post = require('./models/Post.js');

const maxAge = 3600 * 72;

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

module.exports.home_get = (req, res) => {
  res.render('home');
}

module.exports.tags_get = async (req, res) => {
  // get logic for getting tags from a previous version of blogish
  res.render('tags');
}

module.exports.post_get = async(req, res) => {
  /* 🟢 
    
    if slug exists, find post in db else return error page
    if post exists, send post object to views
   */
  res.render('post');
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

module.exports.editor_get = (req, res) => {
  res.render('editor');
}

module.exports.editor_post = async (req, res) => {
  const { title, subtitle, body, tags, publish, author } = req.body;
  const post = await Post.create({ title, subtitle, body, tags, publish, author });
  console.log('editor_post, req.body parsed', title, subtitle, body, tags, publish, author); // 🔴


  res.render('editor');
}

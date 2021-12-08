const jwt = require('jsonwebtoken');
const User = require('../models/User');

const requireAuth = (req, res, next) => {
  const token = req.cookies.jwt;
  if(token){
    jwt.verify(token, 'net ninja secret', (err, decodedToken) => {
      if(err) {
        console.log('🟧 authMiddleware > requireAuth() > login error:', err);
        res.redirect('/login');
      } else {
        console.log('🟩 authMiddleware > requireAuth() > token:', decodedToken);
        next();
      }
    });
  } else {
    res.redirect('/');
  }
}

const checkUser = (req, res, next) => {
  const token = req.cookies.jwt;
  if(token){
    jwt.verify(token, 'net ninja secret', async (err, decodedToken) => {
      if(err) {
        console.log('🟧 authMiddleware > checkUser() > login error:', err);
        res.locals.user = null;
        next();
      } else {
        console.log('🟩 authMiddleware > checkUser() > token:', decodedToken);
        let user = await User.findById(decodedToken.id);
        res.locals.user = user;
        next();
      }
    });
  } else {
    res.locals.user = null;
    next();
  }
}

module.exports =  { requireAuth, checkUser };
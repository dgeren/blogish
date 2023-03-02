const jwt = require('jsonwebtoken');
const User = require('./models/User');

const checkUser = (req, res, next) => {
  const token = req.cookies.jwt;
  if(token){
    jwt.verify(token, 'net ninja secret', async (err, decodedToken) => {
      if(err) { // ! change to match other error handling
        console.log('🟧 authMiddleware > checkUser() > login error:', err);
        res.locals.user = null;
        next();
      } else {
        let user = await User
          .findById(decodedToken.id)
          .select( '-password -creator' );
        res.locals.user = user;
        next();
      }
    });
  } else {
    res.locals.user = null;
    next();
  }
}

module.exports =  { checkUser };
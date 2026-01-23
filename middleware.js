const jwt = require('jsonwebtoken');
const User = require('./models/User');
// const { getUser } = require('./db.js');

const checkUser = async (req, res, next) => {
  const token = req.cookies.jwt;
  if(token){
    jwt.verify(token, 'net ninja secret', async (err, decodedToken) => {
      if(err) { // ! change to match other error handling
        console.log('🟧 authMiddleware > checkUser() > login error:', err);
        res.locals.user = null;
        next();
      } else {
        res.locals.user = await User
          .findById(decodedToken.id)
          .select( '-password -creator' )
          .lean();
        console.log(res.locals);
        next();
      }
    });
  } else {
    res.locals.user = null;
    next();
  }
}

// const requireAuth = (req, res, next) => {
//   const token = req.cookies.jwt;
//   if(token){
//     jwt.verify(token, 'net ninja secret', (err, decodedToken) => {
//       if(err) {
//         console.log('🟧 authMiddleware > requireAuth() > login error:', err);
//         res.redirect('/login');
//       } else {
//         next();
//       }
//     });
//   } else {
//     res.redirect('/');
//   }
// }

module.exports =  { checkUser };
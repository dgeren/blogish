require('dotenv').config();
const express = require('express');
const https = require('https');
const fs = require('fs');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');

const routes = require('./routes');
const { requireAuth, checkUser } = require('./middleware');

const app = express();

/*
* VIEWS AND MIDDLEWARE
*/
app.use(express.static('public'));
app.use(express.json());
app.use(cookieParser());
app.set('view engine', 'ejs');


/*
* MONGODB: blogishAdminCredentials 🔴
* HTTPS SERVER
*/

mongoose.connect(process.env.DB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(result => https.createServer({
    key:  fs.readFileSync('blogish4key.pem'),
    cert: fs.readFileSync('blogish4.pem')
  }, app).listen(3000, () => console.log('https: p3000')))
  .catch((err) => console.log(err));


/*
* ROUTES
*/
app.get('*', checkUser);
app.post('*', checkUser);
app.delete('*', checkUser);
app.use(routes);
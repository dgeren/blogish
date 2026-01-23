require('dotenv').config();
const express = require('express');
const https = require('https');
const fs = require('fs');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const routes = require('./routes');
const app = express();


// FIRMWARE AND EXTENSIONS
app.use(express.static('public'));
app.use(express.json());
app.use(cookieParser());
app.set('view engine', 'ejs');


// HTTPS SERVER & MONGOOSE
try {
mongoose.connect("mongodb://localhost:27017/blogish")
  .then(result => https.createServer({
    key:  fs.readFileSync('blogish4key.pem'),
    cert: fs.readFileSync('blogish4.pem')
  }, app)
  .listen(3000, () => console.log('https: p3000')))
  .catch((err) => console.log(err));
} catch (err) {
  console.log("Mongose error: ", result, err);
}

// ROUTES
app.use(routes);
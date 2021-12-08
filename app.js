const express = require('express');
const https = require('https');
const fs = require('fs');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');

const authRoutes = require('./routes/authRoutes');
const { requireAuth, checkUser } = require('./middleware/authMiddleware');

const app = express();

// middleware
app.use(express.static('public'));
app.use(express.json());
app.use(cookieParser());

// view engine
app.set('view engine', 'ejs');

// database connection
const dbURI = 'mongodb+srv://dgeren:nodeauth@cluster0.ajdyi.mongodb.net/node-jwt_auth-tute?retryWrites=true&w=majority';
mongoose.connect(dbURI, { useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex:true })
  .then(result => https.createServer({
    key:  fs.readFileSync('blogish4key.pem'),
    cert: fs.readFileSync('blogish4.pem')
  }, app).listen(3000, () => console.log('https: p3000')))
  .catch((err) => console.log(err));

// routes
app.get('*', checkUser);
app.get('/about', (req, res) => res.render('about'));
app.get('/tags', (req, res) => res.render('tags'));
app.use(authRoutes);
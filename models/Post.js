const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const postSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, "Titles for posts are required."],
  },
  subtitle: String,
  body: {
    type: String,
    required: [true, "What's a post without content? Content required."]
  },
  tags: [String],
  author: {
    type: String,
    required: [true, "admin error message: user id required"]
  },
  publish: Boolean,
  pubDate: Date
});

userSchema.pre('save', async function(next){
  const salt = await bcrypt.genSalt();
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

const Post = mongoose.model('user', postSchema);

module.exports = User;
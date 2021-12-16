const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const slugify = require('slugify');

const postSchema = new mongoose.Schema({
  title: {
    type: String,
    unique: [true, "This title already exists. Change the title."],
    required: [true, "Titles for posts are required."],
  },
  slug: String,
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

postSchema.pre('save', async function (next){
  this.slug = slugify(this.title,{ lower: true });
});

const Post = mongoose.model('post', postSchema);

module.exports = Post;
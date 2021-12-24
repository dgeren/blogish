const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const slugify = require('slugify');

const postSchema = new mongoose.Schema({
  title: {
    type: String,
    unique: [true, "This title already exists. Change the title."],
    required: [true, "Titles for posts are required."],
    defualt: null
  },
  slug: {
    type: String,
    default: null
  },
  subtitle: {
    type: String,
    default: null
  },
  body: {
    type: String,
    required: [true, "What's a post without content? Content required."],
    default: null
  },
  preview: {
    type: String,
    default: null
  },
  tags: {
    type: [String],
    default: []
  },
  author: {
    type: String,
    required: [true, "admin error message: user id required"],
    default: null
  },
  published: {
    type: Boolean,
    default: null
  },
  pubDate:  {
    type: Date,
    default: null
  }
});

postSchema.pre('save', async function (next){
  this.slug = slugify(this.title,{ lower: true });
  this.preview = this.body.split(" ").slice(0, 50).join(" ");
  if(this.published && !this.pubDate) this.pubDate = Date.now;
  let tags = this.tags[0];
  tags.replace(', ', ',');
  tags = tags.split(',');
  this.tags = tags;
});

const Post = mongoose.model('post', postSchema);

module.exports = Post;
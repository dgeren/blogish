const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  title: {
    type: String,
    unique: [true, "This title already exists. Change the title."],
    required: [true, "Titles for posts are required."]
  },
  slug: {
    type: String
  },
  subtitle: {
    type: String,
    default: null
  },
  content: {
    type: String,
    required: [true, "What's a post without content? Content required."]
  },
  markdown: {
    type: String,
    required: [true, "What's an entry without content? Content required."]
  },
  tags: {
    type: [String],
    default: []
  },
  authorID: {
    type: String,
    required: [true, "admin error message: user id required"]
  },
  isPublished: Boolean,
  pubDate: Date
});

const Post = mongoose.model('post', postSchema);

module.exports = Post;
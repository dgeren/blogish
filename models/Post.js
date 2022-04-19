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
  tags: {
    type: [String],
    default: []
  },
  authorID: {
    type: String,
    required: [true, "admin error message: user id required"]
  },
  dateString:  {
    type: String,
    default: null
  },
  timeString: {
    type: String,
    default: null
  },
  pubDate: {
    type: Date,
    default: null
  }
});

const Post = mongoose.model('post', postSchema);

module.exports = Post;
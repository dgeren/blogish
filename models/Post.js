const mongoose = require('mongoose');

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
  content: {
    type: String,
    required: [true, "What's a post without content? Content required."],
    default: null
  },
  tags: {
    type: [String],
    default: []
  },
  authorID: {
    type: String,
    required: [true, "admin error message: user id required"],
    default: null
  },
  dateString:  {
    type: String,
    default: null
  }
});

// postSchema.pre('save', async function (next){
//   next();
// });

const Post = mongoose.model('post', postSchema);

module.exports = Post;
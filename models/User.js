const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { isEmail } = require('validator');

const userSchema = new mongoose.Schema({
  isEditor: Boolean,
  isAdmin: Boolean,
  email: {
    type: String,
    unique: [true, "Email address already registered."],
    required: [true, "Email address required."],
    lowercase: true,
    validate: [isEmail, "Invalid email address."]
  },
  password: {
    type: String,
    required: [true, "Password required."],
    minlength: [8, "Minimum length is six characters."],
    maxlength: [64, "Maximum length is sixty-four characters."]
  },
  pseudonym: {
    type: String,
    required: [true, "Pseudonym required."],
    minlength: [4, "Mimimum length is four characters,"],
    maxlength: [64, "Maximum length is sixty-four characters."]
  },
  byline: {
    type: String,
    required: [true, "Byline required."],
    minlength: [12, "Minimum length is twelve characters."],
    maxlength: [64, "Maximum length is sixty-four characters."]
  },
  shortText: {
    type: String,
    required: [true, "Short description required."],
    minlength: [12, "Minimum length is twelve characters."],
    maxlength: [128, "Maximum length is 128 characters."]
  },
  longText: {
    type: String,
    required: [true, "Long description required."],
    minlength: [true, "Minimum length is twelved characters."]
  },
});

userSchema.pre('save', async function (next) {
  const salt = await bcrypt.genSalt();
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.statics.login = async function (email, password) {
  const user = await this.findOne({ email });
  if(user){
    const auth = await bcrypt.compare(password, user.password);
    if(auth) { return user; }
    throw Error('incorrect password');
  }
  throw Error('incorrect email');
}

const User = mongoose.model('user', userSchema);

module.exports = User;
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { isEmail } = require('validator');

const userSchema = new mongoose.Schema({
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
    minlength: [6, "Minimum length is six characters"]
  }
});

userSchema.pre('save', async function (next){
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
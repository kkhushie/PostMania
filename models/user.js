const mongoose = require('../config/db'); // Use shared connection

const userSchema = mongoose.Schema({
  username: String,
  name: String,
  age: Number,
  email: String,
  password: String,
  profilepic: {
    type: String,
    default: "./images/uploads/default.jpg"
  },
  posts: [
    { type: mongoose.Schema.Types.ObjectId, ref: "post" }
  ]
});

module.exports = mongoose.model('user', userSchema);

const mongoose = require('../config/db'); // Use shared connection

const postSchema = mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user"
  },
  date: {
    type: Date,
    default: Date.now
  },
  content: String,
  likes: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user"
    }
  ]
});

module.exports = mongoose.model('post', postSchema);

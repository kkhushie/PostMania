const mongoose = require('mongoose');
require('dotenv').config(); // Load environment variables

const dbUrl = process.env.DATABASE_URL || "mongodb://127.0.0.1:27017/miniproject"; // Use environment variable or fallback to default

mongoose.connect(dbUrl, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('Database connected');
}).catch((err) => {
  console.error('Database connection error', err);
});

module.exports = mongoose;

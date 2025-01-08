// models/Image.js
const mongoose = require('mongoose');

const ImageSchema = new mongoose.Schema({
  filename: { type: String, required: true },
  path: { type: String, required: true },
  imagePath: { type: String, required: true }, // Field to store image path
});

module.exports = mongoose.model('Image', ImageSchema);

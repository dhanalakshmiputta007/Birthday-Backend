const mongoose = require('mongoose');

// Define the person schema
const personSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  date:{
    type: date,
    required: true
  },
  age: {
    type: Number,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  address: {
    type: String,
    required: false
  },  imagePath: { type: String,required:'', default: '' }, // Field to store image path

});

// Create a model based on the schema
const Person = mongoose.model('Person', personSchema);

module.exports = Person;

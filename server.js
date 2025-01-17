// backend/server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { type } = require('express/lib/response');
require('dotenv').config();
const app = express();

const port = process.env.PORT || 5000;
const uploadsDir = process.env.FILE_UPLOAD_DIR || 'uploads/';
// Set up uploads directory
// const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Allow all origins (for development/testing)
// app.use(cors());

// OR restrict to specific frontend URL (for production)
// app.use(
//   cors({
//     origin: "https://birthday-reminder-app-s0yd.onrender.com", // Replace with your frontend's deployed URL
//   })
// );
app.use(cors({
  origin: "https://birthday-reminder-app-s0yd.onrender.com", // Frontend origin
  methods: "GET,POST,PUT,DELETE", // Allowed methods
  allowedHeaders: "Content-Type,Authorization", // Allowed headers
}));
app.use(express.json());

// MongoDB URI (Replace with your own MongoDB URI from MongoDB Atlas or localhost)
const mongoURI = 'mongodb+srv://dhanalakshmiputta007:dhana123@cluster0.eixxf.mongodb.net/people?retryWrites=true&w=majority&appName=Cluster0';
mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.log(err));

// Image Schema (Stores file path and other metadata about the image)
const imageSchema = new mongoose.Schema({
  path: String, // The path to the uploaded image
  filename: String, // The original filename of the uploaded image
  uploadedAt: { type: Date, default: Date.now }, // Timestamp for the upload
});

const Image = mongoose.model('Image', imageSchema);

// Person Schema (Stores person data and references the image document)
const personSchema = new mongoose.Schema({
    name: { type: String, required: true },
    date: { type: Date, required: true },
    // age: { type: Number, required: true },
    // email: { type: String, required: true },
    // address: { type: String, required: true },
    photo: { type: String, required: true },  // Store the photo path as a string
    createdAt: { type: Date, default: Date.now }, // Timestamp for person entry
  });

const Person = mongoose.model('Person', personSchema);

// Set up Multer to handle file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Save files in the 'uploads' folder
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Use timestamp as filename to avoid name conflicts
  },
});

const upload = multer({ storage: storage });

// API endpoint to upload an image and store image metadata in MongoDB
app.post('/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send('No file uploaded.');
    }

    // Create a new Image document and save it to MongoDB
    const newImage = new Image({
      path: req.file.path,
      filename: req.file.filename,
    });

    await newImage.save(); // Save the image document

    res.status(200).json({
      message: 'File uploaded successfully',
      image: newImage,
      imagePath: req.file.path,
    });
  } catch (error) {
    res.status(500).send('Error uploading file: ' + error.message);
  }
});

// API endpoint to add a person and associate them with an image
app.post('/api/people', async (req, res) => {
    const { name, age, date, email, address, photo } = req.body;


  // Create a new Person instance and associate it with the image
  const newPerson = new Person({
    name,
    age,
    date: new Date(date), // Ensure the date is converted to a Date object
    email,
    address,
    photo,
  });

  try {
    // Save the new person to the database
    await newPerson.save();
    res.status(201).send({ message: 'Person added successfully', person: newPerson });
  } catch (err) {
    res.status(400).send({ message: 'Error adding person', error: err.message });
  }
});

// API endpoint to fetch all people and their image information
app.get('/api/people', async (req, res) => {
    try {
      // Fetch all persons from the MongoDB collection (no need to populate image as it's a string)
      const people = await Person.find(); // This retrieves all documents from the Person collection
      res.status(200).json(people); // Send the people data as JSON
    } catch (err) {
      res.status(400).send({ message: 'Error retrieving people', error: err.message });
    }
  });
  // API endpoint to get a person by ID
app.get('/api/people/:id', async (req, res) => {
    const { id } = req.params;  // Extract the person ID from the request params
  
    try {
      const person = await Person.findById(id);  // Find the person by ID in the database
  
      if (!person) {
        return res.status(404).json({ message: 'Person not found' });  // If no person is found
      }
  
      res.status(200).json(person);  // If found, return the person's data
    } catch (error) {
      res.status(500).json({ message: 'Error retrieving person', error: error.message });
    }
  });
  
// API endpoint to update a person based on ID
app.put('/api/people/:id', async (req, res) => {
    const { id } = req.params;
    const { name, photo, date } = req.body;
  
    try {
      const updatedPerson = await Person.findByIdAndUpdate(id, { name, photo, date }, { new: true });
  
      if (!updatedPerson) {
        return res.status(404).json({ message: 'Person not found' });
      }
  
      res.status(200).json({ message: 'Person updated successfully', person: updatedPerson });
    } catch (error) {
      res.status(500).json({ message: 'Error updating person', error: error.message });
    }
  });
  
  // API endpoint to delete a person by ID
  app.delete('/api/people/:id', async (req, res) => {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: 'Invalid ID format' });
      }
    try {
      const deletedPerson = await Person.findByIdAndDelete(id);
  
      if (!deletedPerson) {
        return res.status(404).json({ message: 'Person not found' });
      }
  
      res.status(200).json({ message: 'Person deleted successfully', person: deletedPerson });
    } catch (error) {
      res.status(500).json({ message: 'Error deleting person', error: error.message });
    }
  });
  
  
  
  

// Serve static files from the 'uploads' directory
app.use('/uploads', express.static('uploads'));

// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

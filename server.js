// backend/server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { type } = require('express/lib/response');
require('dotenv').config();
const cloudinary = require('cloudinary').v2;
const cron = require('node-cron');
const nodemailer = require('nodemailer');
const twilio = require('twilio');
const app = express();

const port = process.env.PORT || 5000;
// const uploadsDir = process.env.FILE_UPLOAD_DIR || 'uploads';
// Set up uploads directory
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});
// Allow all origins (for development/testing)
// Debug the configuration (only for debugging, do not log secrets in production)
// app.use(cors());
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER, // Replace with your email
    pass: process.env.EMAIL_PASS, // Replace with your email password or app-specific password
  },
});
const twilioClient = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);
// Function to send email reminder
const sendEmailReminder = (email, name, date) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: `Reminder: Event Scheduled on ${date}`,
    text: `Hello ${name},\n\nThis is a reminder for the event scheduled on ${date}.`,
  };

  transporter.sendMail(mailOptions, (err, info) => {
    if (err) {
      console.log('Error sending email:', err);
    } else {
      console.log('Email sent:', info.response);
    }
  });
};

// Function to send SMS reminder
const sendSmsReminder = (phoneNumber, name, date) => {
  console.log("dhana",phoneNumber)
  if (phoneNumber === process.env.TWILIO_PHONE_NUMBER) {
    console.error(`Skipping reminder for ${to}: Cannot send message to the same number as "From".`);
   
    return;
  }
  twilioClient.messages.create({
    body: `Hello ${name}, Reminder: You have an event scheduled on ${date}`,
    from: process.env.TWILIO_PHONE_NUMBER, // Replace with your Twilio phone number
    to: phoneNumber,
  }).then((message) => console.log('SMS sent:', message.sid));
};
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Cron job to send reminders to all people every minute
cron.schedule('0 0 * * *', async () => {
  try {
    const allPeople = await Person.find(); // Fetch all people

    for (const person of allPeople) {
      // Send email and SMS reminders to each person
      sendEmailReminder(person.email, person.name, person.date);
      await delay(1000); // Add a 1-second delay between SMS to avoid rate limits
      sendSmsReminder(person.phoneNumber, person.name, person.date);
      await delay(1000); // Add a 1-second delay between SMS to avoid rate limits
      console.log(`Reminder sent to ${person.name} for ${person.date}`);
    }
  } catch (error) {
    console.log('Error checking reminders:', error.message);
  }
});
app.use(cors({
  origin: "https://birthday-reminder-app-s0yd.onrender.com", // Frontend origin
  methods: "GET,POST,PUT,DELETE", // Allowed methods
  allowedHeaders: "Content-Type,Authorization", // Allowed headers
}));
app.use(express.json());

// // MongoDB URI (Replace with your own MongoDB URI from MongoDB Atlas or localhost)
// const mongoURI = 'mongodb+srv://dhanalakshmiputta007:dhana123@cluster0.eixxf.mongodb.net?retryWrites=true&w=majority&appName=Cluster0';
const mongoURI = 'mongodb+srv://dhanalakshmiputta007:dhana123@cluster0.eixxf.mongodb.net/test?retryWrites=true&w=majority&appName=Cluster0';
mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
// mongoose.connect(mongoURI);


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
    email: { type: String, required: true },
     phoneNumber: { type: String, required: true },
    photo: { type: String, required: true },  // Store the photo path as a string
    createdAt: { type: Date, default: Date.now }, // Timestamp for person entry
  });

const Person = mongoose.model('Person', personSchema);


const storage = multer.diskStorage({});

const upload = multer({ storage: storage });
app.post('/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send('No file uploaded.');
    }

    // Upload file to Cloudinary
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: 'uploads', // Optional: Organize files in a folder
    });

    // Return the uploaded image URL
    res.status(200).json({
      message: 'File uploaded successfully',
      imageUrl: result.secure_url,
    });
  } catch (error) {
    // console.error('Error uploading file:', error.message);
    res.status(500).send('Error uploading file: ' + error.message);
  }
});
// API endpoint to add a person and associate them with an image
app.post('/api/people', async (req, res) => {
    const { name, age, date, email, phoneNumber, photo } = req.body;

  // Create a new Person instance and associate it with the image
  const newPerson = new Person({
    name,
    age,
    date: new Date(date), // Ensure the date is converted to a Date object
    email,
    phoneNumber,
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
app.get('/', async (req, res) => {
  try {
    res.json({status:"Api is working",code:200})
  } catch (err) {
    res.status(400).send({ message: 'Error retrieving people', error: err.message });
  }
});
// API endpoint to fetch all people and their image information
app.get('/api/people', async (req, res) => {
    try {
      // Fetch all persons from the MongoDB collection (no need to populate image as it's a string)
      const people = await Person.find(); 
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
    const { name, photo, date,email } = req.body;
  
    try {
      const updatedPerson = await Person.findByIdAndUpdate(id, { name, photo, date,email }, { new: true });
  
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
// app.use('/uploads', express.static('uploads'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

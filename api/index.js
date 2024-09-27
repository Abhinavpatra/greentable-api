require('dotenv').config();

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParse = require('cookie-parser');
const mongoose = require("mongoose");

const User = require('../modals/user');
const NGO = require('../modals/ngo');

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(cookieParse());

// Database Connection
const dbUrl = process.env.MONGO_URL;

async function connectToDatabase() {
    try {
        await mongoose.connect(dbUrl);
        console.log("Connected to MongoDB");
    } catch (error) {
        console.error("Error connecting to MongoDB:", error);
        process.exit(1); // Exit the process if unable to connect to the database
    }
}

connectToDatabase();

// Root route
app.get('/', (req, res) => {
    res.send('Hello from Vercel');
});

// Sign-up endpoint
app.post('/signup', async (req, res) => {
    try {
        const { name, email, password, restaurantId } = req.body;
        if (!name || !email || !password || !restaurantId) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password.trim(), salt);

        const newEmail = email.toLowerCase();

        const newUser = new User({ name, email: newEmail, password: hashedPassword, restaurantId });
        const registeredUser = await newUser.save();
        console.log(registeredUser);
        return res.status(200).json({ message: 'Signup successful' });
    } catch (error) {
        console.error('Error handling signup request:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// Login endpoint
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(403).json({ error: 'Incorrect Password' });
        }

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET_KEY, { expiresIn: '12h' });
        console.log(token);
        return res.status(200).json({ token, loggedInRestaurantId: user.restaurantId });
    } catch (err) {
        console.error('Error handling login request:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// Get restaurant by ID endpoint
app.get('/api/restaurants/:restaurantId', async (req, res) => {
    try {
        const { restaurantId } = req.params;
        if (!restaurantId) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const user = await User.findOne({ restaurantId });
        if (!user) {
            return res.status(404).json({ error: 'Restaurant not found' });
        }

        return res.status(200).json({ user });
    } catch (err) {
        console.error('Error handling restaurant request:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// Get all restaurants endpoint
app.get('/api/restaurants', async (req, res) => {
    try {
        const users = await User.find({});
        return res.status(200).json({ users });
    } catch (err) {
        console.error('Error handling database request:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// Add NGO portal submission route
app.post('/api/ngo', async (req, res) => {
    try {
        const { name, address, food } = req.body;

        if (!name || !address || !food) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const ngo = new NGO({ name, address, food });
        const registeredUser = await ngo.save();
        console.log(registeredUser);
        return res.status(200).json({ message: 'Food donation received successfully' });
    } catch (err) {
        console.error('Error handling NGO portal submission:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// Update restaurant endpoint
app.put('/api/restaurants/:loggedInRestaurantId', async (req, res) => {
    let { loggedInRestaurantId } = req.params;
    let { name, address, food } = req.body;

    try {
        const user = await User.findOne({ restaurantId: loggedInRestaurantId });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        user.name = name;
        user.address = address;
        user.food = food;
        console.log(user);
        await user.save();
        return res.status(200).json({ message: 'Document updated successfully' });
    } catch (err) {
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// Export the app for serverless deployment
module.exports = app;

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
require('dotenv').config();
const router = express.Router();

//pick JWT_SECRET from .env file
const JWT_SECRET = process.env.JWT_SECRET;

// Login Route
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        // find if user exists
        let user = await User.findOne({ email });
        // if user doesn't exists
        if (!user) {
            return res.status(400).json({ error: 'Invalid Credentials' });
        }

        //check if password is valid
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            // if password is not valid
            return res.status(400).json({ error: 'Invalid Credentials' });
        }
        // if user is found and password is valid then create a token
        const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '1d' });
        // send token in cookie
        res.cookie('authToken', token, {
            httpOnly: true, // Prevent client-side access
            secure: process.env.NODE_ENV === 'production', // Use secure flag in production
            sameSite: 'Strict', // Prevent CSRF
          });
        // send response
          res.status(200).json({ message: 'Login successful', role: user.role, email: user.email });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Login Server Error' });
    }
});

// Search Users by Name or Email
router.get('/search', async (req, res) => {
    try {
      const { query } = req.query;
      if (!query) {
        return res.status(400).json({ error: 'Query parameter is required' });
      }
  
      const users = await User.find({
        role: 'user', // Only search for users with user role
        $or: [
          { name: new RegExp(query, 'i') },
          { email: new RegExp(query, 'i') }
        ]
      }).select('name email');
  
      res.json(users);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Server Error While searching users' });
    }
  });

// Logout Route
router.post('/logout', (req, res) => {
    res.clearCookie('authToken');
    res.status(200).json({ message: 'Logged out' });
  });

module.exports = router;
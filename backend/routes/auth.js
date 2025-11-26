const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const db = require('../db');

const router = express.Router();
const upload = multer({ dest: 'frontend/uploads/' });
const SECRET_KEY = 'chat_secret_key_2025';

// Sign up
router.post('/signup', upload.single('profilePicture'), (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);
  let profilePicture = null;

  if (req.file) {
    const ext = path.extname(req.file.originalname);
    const newPath = `uploads/${Date.now()}${ext}`;
    fs.renameSync(req.file.path, path.join(__dirname, '../../frontend', newPath));
    profilePicture = `/${newPath}`;
  }

  db.run(
    `INSERT INTO users (username, password, profile_picture) VALUES (?, ?, ?)`,
    [username, hashedPassword, profilePicture],
    function(err) {
      if (err) {
        return res.status(400).json({ error: 'Username already exists' });
      }

      const token = jwt.sign({ userId: this.lastID, username }, SECRET_KEY);
      res.json({ 
        success: true, 
        userId: this.lastID, 
        username, 
        profilePicture,
        token 
      });
    }
  );
});

// Login
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    if (!bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user.id, username: user.username, role: user.role }, SECRET_KEY);
    res.json({ 
      success: true, 
      userId: user.id, 
      username: user.username, 
      profilePicture: user.profile_picture,
      role: user.role,
      token 
    });
  });
});

// Update profile picture
router.post('/update-picture', upload.single('profilePicture'), (req, res) => {
  const { userId } = req.body;

  if (!req.file) {
    return res.status(400).json({ error: 'No file provided' });
  }

  const ext = path.extname(req.file.originalname);
  const newPath = `uploads/${Date.now()}${ext}`;
  fs.renameSync(req.file.path, path.join(__dirname, '../../frontend', newPath));
  const profilePicture = `/${newPath}`;

  db.run('UPDATE users SET profile_picture = ? WHERE id = ?', [profilePicture, userId], (err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to update profile' });
    }
    res.json({ success: true, profilePicture });
  });
});

// Get user
router.get('/user/:id', (req, res) => {
  db.get('SELECT id, username, profile_picture, role, is_online FROM users WHERE id = ?', 
    [req.params.id], (err, user) => {
      if (user) {
        res.json(user);
      } else {
        res.status(404).json({ error: 'User not found' });
      }
    });
});

// Get all online users
router.get('/users/online', (req, res) => {
  db.all('SELECT id, username, profile_picture, is_online FROM users WHERE is_online = 1', 
    (err, users) => {
      res.json(users || []);
    });
});

module.exports = router;

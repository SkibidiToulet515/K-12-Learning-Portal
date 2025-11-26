const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const db = require('../db');

const router = express.Router();
const upload = multer({ dest: 'frontend/uploads/' });
const SECRET_KEY = 'real_user_auth_secret_2025';

// REAL USER SIGNUP (NOT connected to cover login)
router.post('/signup', upload.single('profilePicture'), (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  if (username === 'admin') {
    return res.status(400).json({ error: 'Username not available' });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);
  let profilePicture = null;

  if (req.file) {
    const ext = path.extname(req.file.originalname);
    const newPath = `uploads/${Date.now()}${ext}`;
    fs.renameSync(req.file.path, path.join(__dirname, '../../frontend', newPath));
    profilePicture = `/${newPath}`;
  }

  const stmt = db.prepare(`
    INSERT INTO users (username, password, profile_picture)
    VALUES (?, ?, ?)
  `);

  stmt.run([username, hashedPassword, profilePicture], function(err) {
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
    stmt.finalize();
  });
});

// REAL USER LOGIN (NOT connected to cover login)
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  // Prevent using cover credentials
  if (username === 'admin') {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  db.get('SELECT * FROM users WHERE username = ? AND role = ?', [username, 'user'], (err, user) => {
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user.id, username: user.username }, SECRET_KEY);
    res.json({
      success: true,
      userId: user.id,
      username: user.username,
      profilePicture: user.profile_picture,
      token
    });
  });
});

// Get user profile
router.get('/:userId', (req, res) => {
  db.get('SELECT id, username, profile_picture, created_at FROM users WHERE id = ?', [req.params.userId], (err, user) => {
    if (user) {
      res.json(user);
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  });
});

// Update profile picture
router.post('/:userId/avatar', upload.single('profilePicture'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file provided' });
  }

  const ext = path.extname(req.file.originalname);
  const newPath = `uploads/${Date.now()}${ext}`;
  fs.renameSync(req.file.path, path.join(__dirname, '../../frontend', newPath));
  const profilePicture = `/${newPath}`;

  const stmt = db.prepare('UPDATE users SET profile_picture = ? WHERE id = ?');
  stmt.run([profilePicture, req.params.userId], () => {
    res.json({ success: true, profilePicture });
    stmt.finalize();
  });
});

module.exports = router;

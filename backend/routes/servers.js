const express = require('express');
const db = require('../db');

const router = express.Router();

// Get all public servers
router.get('/', (req, res) => {
  db.all(`
    SELECT s.*, u.username as owner_name, 
           (SELECT COUNT(*) FROM server_members WHERE server_id = s.id) as member_count
    FROM servers s
    JOIN users u ON s.owner_id = u.id
    WHERE s.status = 'active'
  `, (err, servers) => {
    res.json(servers || []);
  });
});

// Get server details
router.get('/:id', (req, res) => {
  db.get(`
    SELECT s.*, u.username as owner_name 
    FROM servers s
    JOIN users u ON s.owner_id = u.id
    WHERE s.id = ?
  `, [req.params.id], (err, server) => {
    if (server) {
      db.all('SELECT * FROM channels WHERE server_id = ?', [req.params.id], (err, channels) => {
        res.json({ ...server, channels });
      });
    } else {
      res.status(404).json({ error: 'Server not found' });
    }
  });
});

// Get server channels
router.get('/:id/channels', (req, res) => {
  db.all('SELECT * FROM channels WHERE server_id = ?', [req.params.id], (err, channels) => {
    res.json(channels || []);
  });
});

// Join server
router.post('/:id/join', (req, res) => {
  const { userId } = req.body;
  
  db.run(`
    INSERT OR IGNORE INTO server_members (server_id, user_id) 
    VALUES (?, ?)
  `, [req.params.id, userId], (err) => {
    if (err) {
      return res.status(400).json({ error: 'Failed to join server' });
    }
    res.json({ success: true });
  });
});

// Request to create server
router.post('/request', (req, res) => {
  const { userId, serverName, description } = req.body;

  db.run(`
    INSERT INTO server_requests (user_id, server_name, description) 
    VALUES (?, ?, ?)
  `, [userId, serverName, description], (err) => {
    if (err) {
      return res.status(400).json({ error: 'Failed to submit request' });
    }
    res.json({ success: true, message: 'Server creation request submitted. Awaiting admin approval.' });
  });
});

// Get user's servers
router.get('/user/:userId', (req, res) => {
  db.all(`
    SELECT DISTINCT s.*, u.username as owner_name
    FROM servers s
    JOIN users u ON s.owner_id = u.id
    LEFT JOIN server_members sm ON s.id = sm.server_id
    WHERE sm.user_id = ? OR s.owner_id = ?
    ORDER BY s.created_at DESC
  `, [req.params.userId, req.params.userId], (err, servers) => {
    res.json(servers || []);
  });
});

module.exports = router;

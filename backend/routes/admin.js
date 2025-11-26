const express = require('express');
const db = require('../db');

const router = express.Router();

// Middleware to check if user is admin
const isAdmin = (req, res, next) => {
  const { role } = req.body;
  if (role !== 'admin') {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  next();
};

// Get pending server requests
router.get('/server-requests', isAdmin, (req, res) => {
  db.all(`
    SELECT sr.*, u.username FROM server_requests sr
    JOIN users u ON sr.user_id = u.id
    WHERE sr.status = 'pending'
  `, (err, requests) => {
    res.json(requests || []);
  });
});

// Approve server request
router.post('/approve-server/:requestId', isAdmin, (req, res) => {
  const { requestId } = req.params;

  db.get('SELECT * FROM server_requests WHERE id = ?', [requestId], (err, request) => {
    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    // Create server
    db.run(`
      INSERT INTO servers (name, owner_id, description)
      VALUES (?, ?, ?)
    `, [request.server_name, request.user_id, request.description], function(err) {
      if (err) {
        return res.status(400).json({ error: 'Failed to create server' });
      }

      const serverId = this.lastID;
      
      // Create default #general channel
      db.run('INSERT INTO channels (server_id, name) VALUES (?, ?)', [serverId, 'general'], (err) => {
        if (err) {
          return res.status(400).json({ error: 'Failed to create channel' });
        }

        // Update request status
        db.run('UPDATE server_requests SET status = ? WHERE id = ?', ['approved', requestId], (err) => {
          if (err) {
            return res.status(400).json({ error: 'Failed to update request' });
          }
          res.json({ success: true, serverId });
        });
      });
    });
  });
});

// Deny server request
router.post('/deny-server/:requestId', isAdmin, (req, res) => {
  db.run('UPDATE server_requests SET status = ? WHERE id = ?', ['denied', req.params.requestId], () => {
    res.json({ success: true });
  });
});

// Get all users
router.get('/users', isAdmin, (req, res) => {
  db.all('SELECT id, username, profile_picture, role, is_online, created_at FROM users', 
    (err, users) => {
      res.json(users || []);
    });
});

// Remove user
router.delete('/users/:userId', isAdmin, (req, res) => {
  db.run('DELETE FROM users WHERE id = ?', [req.params.userId], () => {
    res.json({ success: true });
  });
});

// Delete message (admin only)
router.delete('/messages/:messageId', isAdmin, (req, res) => {
  db.run('DELETE FROM messages WHERE id = ?', [req.params.messageId], () => {
    res.json({ success: true });
  });
});

module.exports = router;

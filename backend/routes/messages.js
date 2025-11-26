const express = require('express');
const db = require('../db');

const router = express.Router();

// Get channel messages
router.get('/channel/:channelId', (req, res) => {
  db.all(`
    SELECT m.*, u.username, u.profile_picture
    FROM messages m
    JOIN users u ON m.user_id = u.id
    WHERE m.channel_id = ?
    ORDER BY m.created_at ASC
    LIMIT 100
  `, [req.params.channelId], (err, messages) => {
    res.json(messages || []);
  });
});

// Get group chat messages
router.get('/group/:groupChatId', (req, res) => {
  db.all(`
    SELECT m.*, u.username, u.profile_picture
    FROM messages m
    JOIN users u ON m.user_id = u.id
    WHERE m.group_chat_id = ?
    ORDER BY m.created_at ASC
    LIMIT 100
  `, [req.params.groupChatId], (err, messages) => {
    res.json(messages || []);
  });
});

// Create group chat
router.post('/group-chat', (req, res) => {
  const { name, memberIds } = req.body;

  db.run(
    'INSERT INTO group_chats (name) VALUES (?)',
    [name],
    function(err) {
      if (err) {
        return res.status(400).json({ error: 'Failed to create group chat' });
      }

      const groupChatId = this.lastID;
      let completed = 0;

      memberIds.forEach(memberId => {
        db.run('INSERT INTO group_chat_members (group_chat_id, user_id) VALUES (?, ?)', [groupChatId, memberId], (err) => {
          completed++;
          if (completed === memberIds.length) {
            res.json({ success: true, groupChatId });
          }
        });
      });
    }
  );
});

// Get user's group chats
router.get('/user/:userId/group-chats', (req, res) => {
  db.all(`
    SELECT gc.* FROM group_chats gc
    JOIN group_chat_members gcm ON gc.id = gcm.group_chat_id
    WHERE gcm.user_id = ?
  `, [req.params.userId], (err, groupChats) => {
    res.json(groupChats || []);
  });
});

module.exports = router;

const express = require('express');
const router = express.Router();
const db = require('../db');

// ========== 1. ROLES & PERMISSIONS ==========

router.get('/roles', (req, res) => {
  db.all('SELECT * FROM roles', (err, roles) => {
    res.json(roles || []);
  });
});

router.get('/user/:userId/role', (req, res) => {
  db.get('SELECT role FROM users WHERE id = ?', [req.params.userId], (err, user) => {
    res.json({ role: user?.role || 'member' });
  });
});

// ========== 2. USER REPORTING & MODERATION ==========

router.post('/report', (req, res) => {
  const { reportType, reportedUserId, messageId, serverId, reporterId, reason } = req.body;
  db.run(`
    INSERT INTO reports (report_type, reported_user_id, message_id, server_id, reporter_id, reason)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [reportType, reportedUserId, messageId, serverId, reporterId, reason], function(err) {
    if (err) return res.status(400).json({ error: err.message });
    res.json({ success: true, reportId: this.lastID });
  });
});

router.get('/reports', (req, res) => {
  db.all(`
    SELECT r.*, u.username as reporter_name, r.reported_user_id
    FROM reports r
    LEFT JOIN users u ON r.reporter_id = u.id
    WHERE r.status = 'pending'
    ORDER BY r.created_at DESC
  `, (err, reports) => {
    res.json(reports || []);
  });
});

router.post('/report/:reportId/resolve', (req, res) => {
  const { actionTaken, resolvedBy } = req.body;
  db.run(`
    UPDATE reports 
    SET status = 'resolved', action_taken = ?, resolved_by = ?, resolved_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `, [actionTaken, resolvedBy, req.params.reportId], (err) => {
    if (err) {
      return res.status(400).json({ error: 'Failed to resolve report' });
    }
    res.json({ success: true });
  });
});

// ========== 3. MESSAGE FILTERS ==========

router.get('/filters', (req, res) => {
  db.all('SELECT * FROM message_filters', (err, filters) => {
    res.json(filters || []);
  });
});

router.post('/filter/:filterId/toggle', (req, res) => {
  const { enabled } = req.body;
  db.run('UPDATE message_filters SET enabled = ? WHERE id = ?', [enabled ? 1 : 0, req.params.filterId], (err) => {
    if (err) {
      return res.status(400).json({ error: 'Failed to toggle filter' });
    }
    res.json({ success: true });
  });
});

router.get('/blocked-words', (req, res) => {
  db.all('SELECT word FROM blocked_words', (err, rows) => {
    const words = rows?.map(r => r.word) || [];
    res.json({ words });
  });
});

router.post('/blocked-words/add', (req, res) => {
  const { word } = req.body;
  db.run('INSERT INTO blocked_words (word) VALUES (?)', [word], function(err) {
    if (err) return res.status(400).json({ error: 'Word already blocked' });
    res.json({ success: true });
  });
});

router.post('/blocked-words/remove', (req, res) => {
  const { word } = req.body;
  db.run('DELETE FROM blocked_words WHERE word = ?', [word], (err) => {
    if (err) {
      return res.status(400).json({ error: 'Failed to remove word' });
    }
    res.json({ success: true });
  });
});

// Filter message content
function filterMessage(content, blockedWords = []) {
  let filtered = content;
  blockedWords.forEach(word => {
    const regex = new RegExp(word, 'gi');
    filtered = filtered.replace(regex, '*'.repeat(word.length));
  });
  return filtered;
}

// ========== 4. GAME CATEGORIES & GAMES ==========

router.get('/game-categories', (req, res) => {
  db.all('SELECT * FROM game_categories', (err, categories) => {
    res.json(categories || []);
  });
});

router.get('/games', (req, res) => {
  const { categoryId, sort } = req.query;
  let query = 'SELECT * FROM games WHERE 1=1';
  const params = [];

  if (categoryId) {
    query += ' AND category_id = ?';
    params.push(categoryId);
  }

  if (sort === 'popular') {
    query += ' ORDER BY play_count DESC';
  } else if (sort === 'newest') {
    query += ' ORDER BY created_at DESC';
  } else if (sort === 'favorited') {
    query = `
      SELECT g.* FROM games g
      LEFT JOIN favorites f ON g.id = f.game_id
      ${categoryId ? 'WHERE g.category_id = ?' : ''}
      GROUP BY g.id
      ORDER BY COUNT(f.id) DESC
    `;
  }

  db.all(query, params, (err, games) => {
    res.json(games || []);
  });
});

// ========== 5. FAVORITES ==========

router.post('/favorites/:gameId', (req, res) => {
  const { userId } = req.body;
  const stmt = db.prepare(`
    INSERT INTO favorites (user_id, game_id)
    VALUES (?, ?)
  `);
  stmt.run([userId, req.params.gameId], function(err) {
    if (err) return res.json({ success: false, error: 'Already favorited' });
    res.json({ success: true });
    stmt.finalize();
  });
});

router.delete('/favorites/:gameId', (req, res) => {
  const { userId } = req.body;
  const stmt = db.prepare('DELETE FROM favorites WHERE user_id = ? AND game_id = ?');
  stmt.run([userId, req.params.gameId], () => {
    res.json({ success: true });
    stmt.finalize();
  });
});

router.get('/favorites/:userId', (req, res) => {
  db.all(`
    SELECT g.* FROM games g
    JOIN favorites f ON g.id = f.game_id
    WHERE f.user_id = ?
  `, [req.params.userId], (err, games) => {
    res.json(games || []);
  });
});

// ========== 6. STATUS SYSTEM ==========

router.post('/status/:userId', (req, res) => {
  const { status, customStatus, expiry } = req.body;
  const stmt = db.prepare(`
    UPDATE users 
    SET status = ?, custom_status = ?, custom_status_expiry = ?
    WHERE id = ?
  `);
  stmt.run([status, customStatus || null, expiry || null, req.params.userId], () => {
    res.json({ success: true });
    stmt.finalize();
  });
});

router.get('/status/:userId', (req, res) => {
  db.get('SELECT status, custom_status, custom_status_expiry FROM users WHERE id = ?', 
    [req.params.userId], (err, user) => {
      res.json(user || { status: 'offline' });
    });
});

// ========== 7. BADGES & ACHIEVEMENTS ==========

router.get('/badges', (req, res) => {
  db.all('SELECT * FROM badges', (err, badges) => {
    res.json(badges || []);
  });
});

router.get('/user-badges/:userId', (req, res) => {
  db.all(`
    SELECT b.* FROM badges b
    JOIN user_badges ub ON b.id = ub.badge_id
    WHERE ub.user_id = ?
  `, [req.params.userId], (err, badges) => {
    res.json(badges || []);
  });
});

router.post('/award-badge', (req, res) => {
  const { userId, badgeId } = req.body;
  const stmt = db.prepare(`
    INSERT INTO user_badges (user_id, badge_id)
    VALUES (?, ?)
  `);
  stmt.run([userId, badgeId], function(err) {
    if (err) return res.json({ success: false });
    res.json({ success: true });
    stmt.finalize();
  });
});

// ========== 8. EMOJI REACTIONS ==========

router.post('/reactions', (req, res) => {
  const { messageId, userId, emoji } = req.body;
  const stmt = db.prepare(`
    INSERT INTO message_reactions (message_id, user_id, emoji)
    VALUES (?, ?, ?)
  `);
  stmt.run([messageId, userId, emoji], function(err) {
    if (err) return res.json({ success: false });
    res.json({ success: true });
    stmt.finalize();
  });
});

router.delete('/reactions/:messageId/:userId/:emoji', (req, res) => {
  const stmt = db.prepare(`
    DELETE FROM message_reactions 
    WHERE message_id = ? AND user_id = ? AND emoji = ?
  `);
  stmt.run([req.params.messageId, req.params.userId, req.params.emoji], () => {
    res.json({ success: true });
    stmt.finalize();
  });
});

router.get('/reactions/:messageId', (req, res) => {
  db.all(`
    SELECT emoji, COUNT(*) as count, GROUP_CONCAT(user_id) as users
    FROM message_reactions
    WHERE message_id = ?
    GROUP BY emoji
  `, [req.params.messageId], (err, reactions) => {
    res.json(reactions || []);
  });
});

module.exports = router;

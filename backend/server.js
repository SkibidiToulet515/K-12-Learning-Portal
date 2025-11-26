// ==== CORE ====
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');

// ==== DATABASE ====
const db = require('./db');

// ==== ROUTES ====
const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const serverRoutes = require('./routes/servers');
const messageRoutes = require('./routes/messages');
const adminRoutes = require('./routes/admin');
const featuresRoutes = require('./routes/features');

// ==== UPLOADS FOLDER (Railway Safe) ====
const uploadsPath = path.join(__dirname, './uploads');

// ==== APP & SERVER ====
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  pingInterval: 25000,
  pingTimeout: 60000
});

// ==== STATIC FILES ====

// Avatar uploads storage
app.use('/uploads', express.static(uploadsPath));

// Public fake school site
app.use('/', express.static(path.join(__dirname, '../frontend/public')));

// Private portal (must stay hidden without login)
app.use('/private', express.static(path.join(__dirname, '../frontend/private')));

// If user directly types a private URL, force secret login page
app.get('/private/*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/private/login.html'));
});

// Serve public homepage at root if needed
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/public/index.html'));
});

// ==== MIDDLEWARE ====
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// ==== NO TOKEN REQUIRED: Signup/Login ====
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);

// ==== TOKEN REQUIRED: Protected Routes ====
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  next();
};

app.use('/api/servers', authMiddleware, serverRoutes);
app.use('/api/messages', authMiddleware, messageRoutes);
app.use('/api/admin', authMiddleware, adminRoutes);
app.use('/api/features', authMiddleware, featuresRoutes);

// ==== SOCKET.IO (REAL-TIME CHAT) ====
const userSockets = {};

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // User joins system
  socket.on('user_join', (data) => {
    userSockets[data.userId] = socket.id;
    db.run('UPDATE users SET is_online = 1 WHERE id = ?', [data.userId], () => {
      io.emit('user_online', { userId: data.userId });
    });
  });

  // Typing indicators
  socket.on('user_typing', (d) => socket.to(`channel-${d.channelId}`).emit('user_typing', d));
  socket.on('user_stop_typing', (d) => socket.to(`channel-${d.channelId}`).emit('user_stop_typing', d));

  // Join/Leave Rooms
  socket.on('join_channel', (d) => socket.join(`channel-${d.channelId}`));
  socket.on('leave_channel', (d) => socket.leave(`channel-${d.channelId}`));

  // Sending messages
  socket.on('send_message', (data) => {
    const { channelId, groupChatId, userId, content } = data;
    const insertStmt = db.prepare(`
      INSERT INTO messages (channel_id, group_chat_id, user_id, content)
      VALUES (?, ?, ?, ?)
    `);

    insertStmt.run([channelId, groupChatId, userId, content], function () {
      const getStmt = db.prepare(`
        SELECT m.*, u.username, u.profile_picture 
        FROM messages m 
        JOIN users u ON m.user_id = u.id 
        WHERE m.id = ?
      `);

      getStmt.get(this.lastID, (err, message) => {
        if (channelId) io.to(`channel-${channelId}`).emit('new_message', message);
        if (groupChatId) io.to(`group-${groupChatId}`).emit('new_message', message);
      });

      getStmt.finalize();
    });

    insertStmt.finalize();
  });

  // Deleting messages
  socket.on('delete_message', (data) => {
    const { messageId, userId, isAdmin } = data;
    db.get('SELECT user_id FROM messages WHERE id = ?', [messageId], (err, msg) => {
      if (msg && (msg.user_id === userId || isAdmin)) {
        db.run('DELETE FROM messages WHERE id = ?', [messageId], () => {
          io.emit('message_deleted', { messageId });
        });
      }
    });
  });

  // Disconnect
  socket.on('disconnect', () => {
    for (let userId in userSockets) {
      if (userSockets[userId] === socket.id) {
        db.run('UPDATE users SET is_online = 0 WHERE id = ?', [userId], () => {
          io.emit('user_offline', { userId });
        });
        delete userSockets[userId];
        break;
      }
    }
  });
});

// ==== SERVER LISTEN ====
const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Chat server running on port ${PORT}`);
});

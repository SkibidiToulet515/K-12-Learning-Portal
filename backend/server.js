const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const db = require('./db');
const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const serverRoutes = require('./routes/servers');
const messageRoutes = require('./routes/messages');
const adminRoutes = require('./routes/admin');
const featuresRoutes = require('./routes/features');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  pingInterval: 25000,
  pingTimeout: 60000
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve all frontend files (CSS, JS, uploads)
app.use(express.static(path.join(__dirname, '../frontend')));

// Routes - REAL user system (no token needed for signup/login)
app.use('/api/users', usersRoutes);

// Auth middleware for protected API routes
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  next();
};

// Protected routes
app.use('/api/servers', authMiddleware, serverRoutes);
app.use('/api/messages', authMiddleware, messageRoutes);
app.use('/api/admin', authMiddleware, adminRoutes);
app.use('/api/features', authMiddleware, featuresRoutes);

// Serve public index as root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/public/index.html'));
});

// Socket.io events for real-time communication
const userSockets = {};
const typingUsers = {};

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // User joins
  socket.on('user_join', (data) => {
    userSockets[data.userId] = socket.id;
    db.run('UPDATE users SET is_online = 1 WHERE id = ?', [data.userId], (err) => {
      if (!err) {
        io.emit('user_online', { userId: data.userId });
      }
    });
  });

  // User typing in channel
  socket.on('user_typing', (data) => {
    const { channelId, userId, username } = data;
    socket.to(`channel-${channelId}`).emit('user_typing', { userId, username });
  });

  // User stops typing
  socket.on('user_stop_typing', (data) => {
    const { channelId, userId } = data;
    socket.to(`channel-${channelId}`).emit('user_stop_typing', { userId });
  });

  // Join channel room
  socket.on('join_channel', (data) => {
    socket.join(`channel-${data.channelId}`);
  });

  // Leave channel room
  socket.on('leave_channel', (data) => {
    socket.leave(`channel-${data.channelId}`);
  });

  // Send message
  socket.on('send_message', (data) => {
    const { channelId, groupChatId, userId, content } = data;
    
    const insertStmt = db.prepare(`
      INSERT INTO messages (channel_id, group_chat_id, user_id, content)
      VALUES (?, ?, ?, ?)
    `);
    
    insertStmt.run([channelId, groupChatId, userId, content], function(err) {
      if (!err) {
        const getStmt = db.prepare(`
          SELECT m.*, u.username, u.profile_picture 
          FROM messages m 
          JOIN users u ON m.user_id = u.id 
          WHERE m.id = ?
        `);
        
        getStmt.get(this.lastID, (err, message) => {
          if (!err) {
            if (channelId) {
              io.to(`channel-${channelId}`).emit('new_message', message);
            } else if (groupChatId) {
              io.to(`group-${groupChatId}`).emit('new_message', message);
            }
          }
          getStmt.finalize();
        });
      }
      insertStmt.finalize();
    });
  });

  // Delete message
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

  // User disconnect
  socket.on('disconnect', () => {
    for (let userId in userSockets) {
      if (userSockets[userId] === socket.id) {
        db.run('UPDATE users SET is_online = 0 WHERE id = ?', [userId], (err) => {
          if (!err) {
            io.emit('user_offline', { userId });
          }
        });
        delete userSockets[userId];
        break;
      }
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Chat server running on http://0.0.0.0:${PORT}`);
});

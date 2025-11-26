const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const db = new sqlite3.Database(path.join(__dirname, 'database.db'));

// Initialize database tables
db.serialize(() => {
  // Users table - with role, status, custom status
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    profile_picture TEXT,
    role TEXT DEFAULT 'member',
    status TEXT DEFAULT 'offline',
    custom_status TEXT,
    custom_status_expiry DATETIME,
    is_online BOOLEAN DEFAULT 0,
    last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Servers table
  db.run(`CREATE TABLE IF NOT EXISTS servers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    owner_id INTEGER NOT NULL,
    icon TEXT,
    description TEXT,
    status TEXT DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(owner_id) REFERENCES users(id)
  )`);

  // Server members
  db.run(`CREATE TABLE IF NOT EXISTS server_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    server_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(server_id, user_id),
    FOREIGN KEY(server_id) REFERENCES servers(id),
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`);

  // Channels table
  db.run(`CREATE TABLE IF NOT EXISTS channels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    server_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(server_id) REFERENCES servers(id)
  )`);

  // Messages table
  db.run(`CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    channel_id INTEGER,
    group_chat_id INTEGER,
    user_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(channel_id) REFERENCES channels(id),
    FOREIGN KEY(group_chat_id) REFERENCES group_chats(id),
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`);

  // Friends/Friend requests table
  db.run(`CREATE TABLE IF NOT EXISTS friends (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    friend_id INTEGER NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, friend_id),
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(friend_id) REFERENCES users(id)
  )`);

  // Group chats table
  db.run(`CREATE TABLE IF NOT EXISTS group_chats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Group chat members
  db.run(`CREATE TABLE IF NOT EXISTS group_chat_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_chat_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    UNIQUE(group_chat_id, user_id),
    FOREIGN KEY(group_chat_id) REFERENCES group_chats(id),
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`);

  // Server creation requests
  db.run(`CREATE TABLE IF NOT EXISTS server_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    server_name TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`);

  // ========== NEW TABLES FOR 8 FEATURES ==========

  // 1. ROLES & PERMISSIONS (already in users, but add roles table for management)
  db.run(`CREATE TABLE IF NOT EXISTS roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    permissions TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // 2. USER REPORTS & MODERATION
  db.run(`CREATE TABLE IF NOT EXISTS reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_type TEXT NOT NULL,
    reported_user_id INTEGER,
    message_id INTEGER,
    server_id INTEGER,
    reporter_id INTEGER NOT NULL,
    reason TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    resolved_by INTEGER,
    action_taken TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    resolved_at DATETIME,
    FOREIGN KEY(reported_user_id) REFERENCES users(id),
    FOREIGN KEY(message_id) REFERENCES messages(id),
    FOREIGN KEY(server_id) REFERENCES servers(id),
    FOREIGN KEY(reporter_id) REFERENCES users(id),
    FOREIGN KEY(resolved_by) REFERENCES users(id)
  )`);

  // 3. MESSAGE FILTERS & SAFETY
  db.run(`CREATE TABLE IF NOT EXISTS message_filters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filter_type TEXT NOT NULL,
    enabled BOOLEAN DEFAULT 1,
    filter_data TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Blocked words list
  db.run(`CREATE TABLE IF NOT EXISTS blocked_words (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    word TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // 4. GAME CATEGORIES & GAMES
  db.run(`CREATE TABLE IF NOT EXISTS game_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    icon TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS games (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    category_id INTEGER,
    url TEXT,
    thumbnail TEXT,
    play_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(category_id) REFERENCES game_categories(id)
  )`);

  // 5. FAVORITES
  db.run(`CREATE TABLE IF NOT EXISTS favorites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    game_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, game_id),
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(game_id) REFERENCES games(id)
  )`);

  // 6. USER STATUS & CUSTOM STATUS (already in users table)

  // 7. BADGES & ACHIEVEMENTS
  db.run(`CREATE TABLE IF NOT EXISTS badges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    icon TEXT,
    description TEXT,
    requirement_type TEXT,
    requirement_value INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS user_badges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    badge_id INTEGER NOT NULL,
    earned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, badge_id),
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(badge_id) REFERENCES badges(id)
  )`);

  // 8. EMOJI REACTIONS
  db.run(`CREATE TABLE IF NOT EXISTS message_reactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    message_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    emoji TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(message_id, user_id, emoji),
    FOREIGN KEY(message_id) REFERENCES messages(id),
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`);

  // Create default roles
  db.run(`INSERT OR IGNORE INTO roles (name, permissions) 
          VALUES 
          ('admin', 'full_control'),
          ('moderator', 'delete_message,mute_user,warn_user'),
          ('member', 'normal_user'),
          ('guest', 'read_only')`);

  // Create default filters
  db.run(`INSERT OR IGNORE INTO message_filters (filter_type, enabled, filter_data)
          VALUES
          ('profanity', 1, '{}'),
          ('spam', 1, '{}'),
          ('dangerous_links', 1, '{}'),
          ('caps_spam', 1, '{}')`);

  // Create game categories
  db.run(`INSERT OR IGNORE INTO game_categories (name, icon)
          VALUES
          ('Action', '⚔️'),
          ('Racing', '🏎️'),
          ('Puzzle', '🧩'),
          ('Retro', '👾'),
          ('Sports', '⚽'),
          ('Brain Games', '🧠'),
          ('Sandbox', '🏗️'),
          ('School-Safe', '📚'),
          ('Horror', '👻'),
          ('Featured', '⭐')`);

  // Create default badges
  db.run(`INSERT OR IGNORE INTO badges (name, icon, description, requirement_type, requirement_value)
          VALUES
          ('Founder', '⭐', 'Early user of the platform', 'early_user', 0),
          ('Gamer', '🎮', 'Played 50+ games', 'game_plays', 50),
          ('Chatterbox', '💬', 'Sent 1000+ messages', 'messages_sent', 1000),
          ('Admin', '👑', 'Administrator role', 'role', 0),
          ('Smartie', '🧠', 'Completed 20 Brain Games', 'brain_games', 20),
          ('Helper', '🧑‍🏫', 'Moderator or helpful reports', 'helper', 0)`);

  // Create admin user if doesn't exist
  const adminPassword = bcrypt.hashSync('0000P', 10);
  db.run(`INSERT OR IGNORE INTO users (id, username, password, role) 
          VALUES (1, 'admin', ?, 'admin')`, [adminPassword]);

  // Create default public servers
  db.run(`INSERT OR IGNORE INTO servers (id, name, owner_id, description) 
          VALUES (1, 'Welcome', 1, 'Public welcome server')`);
  
  db.run(`INSERT OR IGNORE INTO channels (id, server_id, name) 
          VALUES (1, 1, 'general'), (2, 1, 'announcements')`);
});

module.exports = db;

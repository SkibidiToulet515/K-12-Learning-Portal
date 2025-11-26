// Chat page
let socket;
let currentUser;
let currentChannel = null;
let currentFriend = null;

document.addEventListener('DOMContentLoaded', () => {
  currentUser = checkAuth();
  if (!currentUser) return;

  initSocket();
  loadServers();
  loadFriends();
  setupEventListeners();
});

function initSocket() {
  socket = io({ transports: ['websocket'] });

  socket.on('connect', () => {
    socket.emit('user_join', { userId: currentUser.id });
  });

  socket.on('new_message', (message) => {
    if (message.channelId === currentChannel || message.dmPartnerId === currentFriend) {
      displayMessage(message);
    }
  });

  socket.on('message_deleted', (messageId) => {
    document.querySelector(`[data-msg-id="${messageId}"]`)?.remove();
  });
}

function setupEventListeners() {
  document.getElementById('sendBtn').addEventListener('click', sendMessage);
  document.getElementById('messageInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
  });
  document.getElementById('addServerBtn').addEventListener('click', createServerRequest);
  document.getElementById('addFriendBtn').addEventListener('click', addFriend);
}

function loadServers() {
  fetch(`/api/servers/user/${currentUser.id}`, {
    headers: { 'Authorization': `Bearer ${getAuthToken()}` }
  })
    .then(r => r.json())
    .then(servers => {
      const list = document.getElementById('serversList');
      list.innerHTML = '';
      servers.forEach(server => {
        const btn = document.createElement('button');
        btn.className = 'server-btn';
        btn.textContent = server.name;
        btn.addEventListener('click', () => selectServer(server));
        list.appendChild(btn);
      });
    });
}

function loadFriends() {
  fetch(`/api/friends/${currentUser.id}`, {
    headers: { 'Authorization': `Bearer ${getAuthToken()}` }
  })
    .then(r => r.json())
    .then(friends => {
      const list = document.getElementById('friendsList');
      list.innerHTML = '';
      friends.forEach(friend => {
        const btn = document.createElement('button');
        btn.className = 'friend-btn';
        btn.innerHTML = `<img src="${friend.profilePicture || 'https://via.placeholder.com/24'}" style="width:20px;height:20px;border-radius:50%;">  ${friend.username}`;
        btn.addEventListener('click', () => selectFriend(friend));
        list.appendChild(btn);
      });
    });
}

function selectServer(server) {
  currentChannel = server.id;
  currentFriend = null;
  document.getElementById('chatTitle').textContent = server.name;
  loadMessages(`/api/servers/${server.id}/messages`);
}

function selectFriend(friend) {
  currentFriend = friend.id;
  currentChannel = null;
  document.getElementById('chatTitle').textContent = `Direct Message: ${friend.username}`;
  loadMessages(`/api/dms/${friend.id}/messages`);
}

function loadMessages(endpoint) {
  fetch(endpoint, {
    headers: { 'Authorization': `Bearer ${getAuthToken()}` }
  })
    .then(r => r.json())
    .then(messages => {
      const container = document.getElementById('messagesContainer');
      container.innerHTML = '';
      messages.forEach(displayMessage);
    });
}

function displayMessage(msg) {
  const container = document.getElementById('messagesContainer');
  const el = document.createElement('div');
  el.className = 'message';
  el.setAttribute('data-msg-id', msg.id);
  el.innerHTML = `
    <img src="${msg.profilePicture || 'https://via.placeholder.com/36'}" class="message-avatar">
    <div class="message-content">
      <div class="message-header">
        <span class="message-username">${msg.username}</span>
        <span class="message-timestamp">${new Date(msg.createdAt).toLocaleTimeString()}</span>
      </div>
      <div class="message-text">${escapeHtml(msg.content)}</div>
    </div>
  `;
  container.appendChild(el);
  container.scrollTop = container.scrollHeight;
}

function sendMessage() {
  const input = document.getElementById('messageInput');
  const content = input.value.trim();
  if (!content || (!currentChannel && !currentFriend)) return;

  socket.emit('send_message', {
    channelId: currentChannel,
    dmPartnerId: currentFriend,
    userId: currentUser.id,
    content
  });

  input.value = '';
}

function createServerRequest() {
  const name = prompt('Server name:');
  if (!name) return;

  fetch('/api/servers/request', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getAuthToken()}`
    },
    body: JSON.stringify({ name })
  })
    .then(r => r.json())
    .then(data => {
      alert('Server request submitted for admin approval!');
      loadServers();
    })
    .catch(() => alert('Failed to create request'));
}

function addFriend() {
  const username = prompt('Username to add:');
  if (!username) return;

  fetch('/api/friends/request', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getAuthToken()}`
    },
    body: JSON.stringify({ username })
  })
    .then(r => r.json())
    .then(() => alert('Friend request sent!'))
    .catch(() => alert('Failed to send request'));
}

function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

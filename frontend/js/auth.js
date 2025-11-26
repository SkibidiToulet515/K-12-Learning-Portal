// Authentication and authorization
function checkAuth() {
  const token = localStorage.getItem('authToken');
  const user = localStorage.getItem('user');

  if (!token || !user) {
    window.location.href = '/public/index.html';
    return null;
  }

  try {
    return JSON.parse(user);
  } catch (err) {
    window.location.href = '/public/index.html';
    return null;
  }
}

// Check auth on private pages
if (window.location.pathname.includes('/private/')) {
  document.addEventListener('DOMContentLoaded', checkAuth);
}

function logout() {
  localStorage.removeItem('authToken');
  localStorage.removeItem('user');
  window.location.href = '/public/index.html';
}

function getCurrentUser() {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
}

function getAuthToken() {
  return localStorage.getItem('authToken');
}

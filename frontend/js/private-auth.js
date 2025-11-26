// Real account system for private area
// Separate from the public cover login

function checkPrivateAuth() {
  if (!sessionStorage.getItem('userToken')) {
    window.location.href = '/private/auth.html';
    return false;
  }
  return true;
}

function getCurrentPrivateUser() {
  return {
    token: sessionStorage.getItem('userToken'),
    userId: sessionStorage.getItem('userId'),
    username: sessionStorage.getItem('username'),
    profilePicture: sessionStorage.getItem('profilePicture')
  };
}

function logoutPrivate() {
  sessionStorage.clear();
  window.location.href = '/public/index.html';
}

// Check auth on private pages
if (window.location.pathname.includes('/private/')) {
  if (window.location.pathname !== '/private/auth.html') {
    document.addEventListener('DOMContentLoaded', checkPrivateAuth);
  }
}

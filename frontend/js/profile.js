// Profile page
document.addEventListener('DOMContentLoaded', () => {
  const user = checkAuth();
  if (!user) return;

  document.getElementById('profileName').textContent = user.username;
  document.getElementById('usernameInfo').textContent = user.username;
  document.getElementById('joinedInfo').textContent = new Date(user.createdAt).toLocaleDateString();
  document.getElementById('profilePic').src = user.profilePicture || 'https://via.placeholder.com/100';

  const uploadBtn = document.getElementById('uploadBtn');
  const removeBtn = document.getElementById('removeBtn');
  const avatarInput = document.getElementById('avatarInput');

  uploadBtn.addEventListener('click', async () => {
    if (!avatarInput.files.length) return alert('Please select a file');

    const formData = new FormData();
    formData.append('profilePicture', avatarInput.files[0]);

    try {
      const response = await fetch('/api/auth/upload-avatar', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${getAuthToken()}` },
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        user.profilePicture = data.profilePicture;
        localStorage.setItem('user', JSON.stringify(user));
        document.getElementById('profilePic').src = data.profilePicture;
        alert('Avatar updated!');
      }
    } catch (err) {
      alert('Upload failed');
    }
  });

  removeBtn.addEventListener('click', async () => {
    try {
      const response = await fetch('/api/auth/remove-avatar', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${getAuthToken()}` }
      });

      if (response.ok) {
        user.profilePicture = null;
        localStorage.setItem('user', JSON.stringify(user));
        document.getElementById('profilePic').src = 'https://via.placeholder.com/100';
        alert('Avatar removed!');
      }
    } catch (err) {
      alert('Remove failed');
    }
  });
});

// Theme management
const THEMES = [
  'ocean',
  'arcade',
  'candy',
  'eclipse',
  'matrix',
  'notebook',
  'gaming',
  'pixel',
  'cloudy',
  'academia'
];

function initTheme() {
  const saved = localStorage.getItem('theme') || 'ocean';
  applyTheme(saved);
}

function applyTheme(theme) {
  if (!THEMES.includes(theme)) theme = 'ocean';
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
  
  const selector = document.getElementById('themeSelector');
  if (selector) selector.value = theme;
}

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  
  const selector = document.getElementById('themeSelector');
  if (selector) {
    selector.addEventListener('change', (e) => {
      applyTheme(e.target.value);
    });
  }
});

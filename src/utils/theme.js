export const THEMES = {
  LIGHT: 'light',
  DARK: 'dark'
};

export function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('trivia-theme', theme);
}

export function getSavedTheme() {
  return localStorage.getItem('trivia-theme') || 'light';
}

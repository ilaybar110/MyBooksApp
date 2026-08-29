import { getSettings, updateSettings } from './storage.js';

export const THEMES = ['light', 'dark', 'auto'];

const THEME_COLORS = { light: '#FAF6F1', dark: '#17130F' };

export function getTheme() {
  const theme = getSettings().theme;
  return THEMES.includes(theme) ? theme : 'auto';
}

function prefersDark() {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
}

export function resolveTheme(theme = getTheme()) {
  return theme === 'auto' ? (prefersDark() ? 'dark' : 'light') : theme;
}

/**
 * Paints the theme. "auto" leaves data-theme off so the CSS
 * prefers-color-scheme block takes over.
 */
export function applyTheme(theme = getTheme()) {
  const root = document.documentElement;
  if (theme === 'auto') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', theme);

  // Keep the browser/status bar chrome in step with the page.
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', THEME_COLORS[resolveTheme(theme)]);
}

export function setTheme(theme) {
  const next = THEMES.includes(theme) ? theme : 'auto';
  updateSettings({ theme: next });
  applyTheme(next);
  return next;
}

/**
 * Call once at startup. Also keeps "auto" live when the OS flips.
 */
export function initTheme() {
  applyTheme();
  window.matchMedia?.('(prefers-color-scheme: dark)')
    .addEventListener?.('change', () => {
      if (getTheme() === 'auto') applyTheme('auto');
    });
}

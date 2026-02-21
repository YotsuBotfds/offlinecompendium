/**
 * Theme Synchronization Script
 *
 * Syncs theme preference across all pages (guide pages and index).
 * Reads 'compendium-theme' from localStorage and applies it to the page.
 * Detects prefers-color-scheme on first visit (#13).
 * Works on any page that includes this script.
 */

(function initThemeSync() {
  // Get saved theme preference, default to 'dark'
  let savedTheme = 'dark';
  let hasExplicitPref = false;
  try {
    const stored = localStorage.getItem('compendium-theme');
    hasExplicitPref = stored !== null;
    savedTheme = stored || 'dark';
  } catch {
    // localStorage unavailable (private browsing, etc.)
  }

  // Detect system color scheme preference on first visit (#13)
  if (!hasExplicitPref && window.matchMedia) {
    try {
      if (window.matchMedia('(prefers-color-scheme: light)').matches) {
        savedTheme = 'light';
      }
    } catch {
      // matchMedia unavailable
    }
  }

  // Apply theme to document root
  document.documentElement.setAttribute('data-theme', savedTheme);

  // If a theme toggle button exists, update its appearance
  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    themeToggle.textContent = savedTheme === 'dark' ? '☀️' : '🌙';
    themeToggle.addEventListener('click', toggleTheme);
  }
})();

/**
 * Toggle theme between light and dark
 */
function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  const next = current === 'dark' ? 'light' : 'dark';

  // Update attribute
  document.documentElement.setAttribute('data-theme', next);

  // Save preference
  try {
    localStorage.setItem('compendium-theme', next);
  } catch {
    // localStorage unavailable
  }

  // Update toggle button text
  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    themeToggle.textContent = next === 'dark' ? '☀️' : '🌙';
  }
}

// Expose toggleTheme globally for onclick handlers
window.toggleTheme = toggleTheme;

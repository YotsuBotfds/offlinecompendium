/**
 * Immediate UI Initialization
 * Handles DOM interactions that need to work before module scripts load.
 * Loaded as a regular (non-module) script to run immediately.
 * All DOM queries are null-guarded to prevent cascading failures (#5).
 */

// Helper to safely add event listener
function _safeOn(id, event, handler) {
  const el = document.getElementById(id);
  if (el) el.addEventListener(event, handler);
  return el;
}

// Utils dropdown toggle
_safeOn('utils-toggle-btn', 'click', function(e) {
  e.stopPropagation();
  const d = document.getElementById('utils-dropdown');
  if (!d) return;
  const open = d.classList.toggle('open');
  this.setAttribute('aria-expanded', open);
});

function _closeUtilsDropdown() {
  const d = document.getElementById('utils-dropdown');
  if (d) d.classList.remove('open');
  const b = document.getElementById('utils-toggle-btn');
  if (b) b.setAttribute('aria-expanded', 'false');
}

document.addEventListener('click', _closeUtilsDropdown);
document.addEventListener('scroll', _closeUtilsDropdown, { capture: true, passive: true });

// More filters toggle removed — all filters in single scrollable row

// Random guide keyboard shortcut (r key)
document.addEventListener('keydown', function(e) {
  if (e.key === 'r' && !e.ctrlKey && !e.metaKey && document.activeElement.tagName !== 'INPUT') {
    const btn = document.getElementById('random-guide-btn');
    if (btn) btn.click();
  }
});

// Quick Reference keyboard shortcut (e key)
document.addEventListener('keydown', function(e) {
  if (e.key === 'e' && !e.ctrlKey && !e.metaKey && document.activeElement.tagName !== 'INPUT') {
    window.location.href = 'guides/quick-reference.html';
  }
});

// Utility button handlers (wired up here; window functions are set by app.js modules)
_safeOn('btn-export', 'click', function() {
  if (window.showExportModal) window.showExportModal();
});
_safeOn('btn-import', 'click', function() {
  if (window.importProgress) window.importProgress();
});
_safeOn('offline-manager-btn', 'click', function() {
  if (window.offlineManagerUI) window.offlineManagerUI.openModal();
});
_safeOn('btn-reset', 'click', function() {
  if (window.resetProgress) window.resetProgress();
});
_safeOn('keyboard-help-close-btn', 'click', function() {
  if (window.closeKeyboardHelpModal) window.closeKeyboardHelpModal();
});

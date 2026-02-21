/**
 * Survival App Entry Point
 * Initializes all modules and sets up the application
 *
 * Performance: Critical-path modules are loaded eagerly (static imports).
 * Non-critical modules are lazy-loaded via dynamic import() after cards render
 * or on first user interaction, reducing initial load time by ~45%.
 */

// Initialize error tracking FIRST to catch all subsequent errors
import * as errorTracking from './error-tracking.js';
import * as errorViewer from './error-viewer.js';
errorTracking.init();
errorViewer.init();

// Critical-path imports (needed for initial render)
import * as config from './config.js';
import * as storage from './storage.js';
import * as cards from './cards.js';

/**
 * Show a user-visible error banner for critical initialization failures
 * @param {string} message - The error message to display
 * @param {Error} error - The original error object for logging
 */
function showInitializationError(message, error) {
  config.log('error', message, error);

  // Create error banner
  const banner = document.createElement('div');
  banner.id = 'init-error-banner';
  banner.className = 'init-error-banner';
  banner.setAttribute('role', 'alert');
  banner.innerHTML = `
    <div class="init-error-content">
      <strong>Application Error</strong>
      <p>${escapeHtml(message)}</p>
      <button id="init-error-reload" class="init-error-reload-btn">Reload Page</button>
    </div>
  `;

  // Add styles if not already present
  if (!document.getElementById('init-error-styles')) {
    const style = document.createElement('style');
    style.id = 'init-error-styles';
    style.textContent = `
      .init-error-banner {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
      }
      .init-error-content {
        background: white;
        color: #333;
        padding: 2rem;
        border-radius: 8px;
        max-width: 400px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
        text-align: center;
      }
      .init-error-content strong {
        display: block;
        font-size: 1.2rem;
        margin-bottom: 1rem;
      }
      .init-error-content p {
        margin: 1rem 0;
        font-size: 0.95rem;
      }
      .init-error-reload-btn {
        background: #d4a574;
        color: #1a2e1a;
        border: none;
        padding: 0.75rem 1.5rem;
        border-radius: 4px;
        cursor: pointer;
        font-weight: bold;
        margin-top: 1rem;
      }
      .init-error-reload-btn:hover {
        background: #c4955f;
      }
    `;
    document.head.appendChild(style);
  }

  document.body.appendChild(banner);

  // Add reload handler
  const reloadBtn = document.getElementById('init-error-reload');
  if (reloadBtn) {
    reloadBtn.addEventListener('click', () => window.location.reload());
  }
}

/**
 * Escape HTML to prevent XSS in error messages
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, char => map[char]);
}

/**
 * Initialize the application
 * Critical-path modules are initialized synchronously.
 * Non-critical modules are deferred to after cards render.
 */
async function initializeApp() {
  // Prevent browser scroll restoration (sections collapse on load, stale positions are wrong)
  if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
  }

  // Initialize configuration first
  config.initialize();
  config.debug('Application initialization started', { environment: config.getEnvironment() });

  // Dynamically import early-needed modules while cards render in parallel
  let ui, keyboard, offlineIndicator, pwa, toc;
  try {
    [ui, keyboard, offlineIndicator, pwa, toc] = await Promise.all([
      import('./ui.js'),
      import('./keyboard.js'),
      import('./offline-indicator.js'),
      import('./pwa.js'),
      import('./toc.js'),
    ]);
  } catch (error) {
    showInitializationError(
      'Failed to load critical application modules. Your browser may be blocking JavaScript.',
      error
    );
    return;
  }

  // Initialize PWA features early (install prompts, update detection)
  try {
    pwa.init();
  } catch (error) {
    config.log('error', 'Failed to initialize PWA features:', error);
  }

  // Initialize offline indicator
  offlineIndicator.init();

  // Render cards from guides.json (critical path)
  try {
    await cards.initializeCards();
  } catch (error) {
    config.log('error', 'Failed to initialize cards:', error);
  }

  // Get DOM references for critical UI setup
  const cardElements = document.querySelectorAll('.card[data-guide]');

  // Migrate any progress stored by slug to use guide IDs (one-time fix)
  migrateSlugProgress();

  // Initialize auto dark mode (before theme toggle so manual override works)
  ui.initializeAutoDarkMode();

  // Initialize critical UI modules
  ui.initializeThemeToggle();
  ui.updateProgressDisplay(cardElements, cards.getGuidesData());
  ui.initializeFilters();
  ui.initializeBackToTop();

  // Add reading time remaining tooltip to progress bar (3.2)
  addReadingTimeTooltip();

  // Initialize table of contents navigation (handles lazy-loaded sections)
  toc.initializeTOC();

  // Reset scroll to top after sections collapse (prevents stale scroll restoration).
  // We scroll repeatedly to beat browser/WebView scroll restoration which can fire
  // at unpredictable times during page load.
  if (!location.hash) {
    window.scrollTo(0, 0);
    requestAnimationFrame(() => window.scrollTo(0, 0));
    // Catch late browser restoration and deferred module layout shifts
    const scrollToTop = () => window.scrollTo(0, 0);
    window.addEventListener('load', scrollToTop, { once: true });
    // Final fallback for WebView and Android which can restore scroll very late
    setTimeout(scrollToTop, 100);
    setTimeout(scrollToTop, 300);
    setTimeout(scrollToTop, 600);
  }

  // Initialize keyboard shortcuts with lazy search focus
  keyboard.initializeKeyboardShortcuts(() => {
    ensureSearchLoaded().then(search => search?.focusSearch());
  });

  // Lazy-load search on first focus
  setupLazySearch();

  // Register service worker
  registerServiceWorker();

  // Defer all non-critical modules until after cards are rendered
  loadDeferredModules(cardElements).catch(error => {
    config.log('error', 'Deferred modules failed to load (non-critical):', error);
    // This is non-critical, so we don't show a blocking error to the user
    // The app will continue to work with reduced functionality
  });
}

/**
 * Set up lazy-loading for search module (loads on first focus)
 * Uses Promise-based pattern instead of polling for better performance
 */
let _searchModule = null;
let _searchLoadPromise = null;

async function ensureSearchLoaded() {
  // Return cached module if already loaded
  if (_searchModule) return _searchModule;

  // Return existing load promise if already loading
  if (_searchLoadPromise) {
    return _searchLoadPromise;
  }

  // Create promise for this load attempt
  _searchLoadPromise = loadSearchModule();
  try {
    _searchModule = await _searchLoadPromise;
    return _searchModule;
  } finally {
    _searchLoadPromise = null;
  }
}

async function loadSearchModule() {
  try {
    const searchModule = await import('./search.js');
    const guidesData = cards.getGuidesData();
    if (guidesData) {
      searchModule.initializeSearch(guidesData);
      // If the user already typed while the module was loading, replay the query
      const input = document.getElementById('search') || document.getElementById('quick-search-input');
      if (input && input.value.length > 0) {
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }
    return searchModule;
  } catch (error) {
    config.log('error', 'Failed to load search module:', error);
    throw error;
  }
}

function setupLazySearch() {
  const searchInput = document.getElementById('search') || document.getElementById('quick-search-input');
  if (!searchInput) return;

  searchInput.addEventListener('focus', () => {
    ensureSearchLoaded();
  }, { once: true });

  // Also pre-load on hover for faster perceived performance
  searchInput.addEventListener('mouseenter', () => {
    ensureSearchLoaded();
  }, { once: true });
}

/**
 * Add reading time remaining tooltip to progress bar area (3.2)
 */
function addReadingTimeTooltip() {
  const progressSummary = document.querySelector('.progress-summary');
  if (!progressSummary) return;

  const guidesData = cards.getGuidesData();
  if (!guidesData) return;

  import('./storage.js').then(storage => {
    const timeStats = storage.getReadingTimeStats(guidesData);
    const hours = Math.floor(timeStats.remaining / 60);
    const mins = timeStats.remaining % 60;
    const timeText = hours > 0 ? `~${hours}h ${mins}m remaining` : `~${mins}m remaining`;

    const tooltip = document.createElement('div');
    tooltip.className = 'progress-tooltip';
    tooltip.textContent = timeText;
    progressSummary.appendChild(tooltip);
  });
}

/**
 * Load non-critical modules after initial render
 * Uses Promise.all for parallel loading
 */
async function loadDeferredModules(cardElements) {
  try {
    // Load all deferred modules in parallel
    const [
      analytics,
      textSizing,
      importExport,
      recentlyViewed,
      progressViz,
      randomGuide,
      toolsNav,
      notifications,
      offlineManager,
      offlineManagerUI,
      celebrations,
    ] = await Promise.all([
      import('./analytics.js'),
      import('./text-sizing.js'),
      import('./import-export.js'),
      import('./recently-viewed.js'),
      import('./progress-viz.js'),
      import('./random-guide.js'),
      import('./tools-nav.js'),
      import('./notifications.js'),
      import('./offline-manager.js'),
      import('./offline-manager-ui.js'),
      import('./celebrations.js'),
    ]);

    // Initialize analytics
    try {
      analytics.init();
    } catch (error) {
      config.log('error', 'Failed to initialize analytics:', error);
    }

    // Initialize text sizing
    textSizing.init();

    // Initialize notifications
    try {
      await notifications.init();
    } catch (error) {
      config.log('error', 'Failed to initialize notifications:', error);
    }

    // Initialize progression module (unified prerequisite/phase/progress system)
    try {
      const progression = await import('./progression.js');
      await progression.init();
      // Store under App namespace to avoid global pollution
      if (!window.App) window.App = {};
      window.App._progression = progression;
    } catch (error) {
      config.log('error', 'Failed to initialize progression module:', error);
    }

    // Category progress visualization moved to tools/progress.html
    // Kept module loaded but not initialized on main page

    // Initialize celebrations (milestone tracking)
    try {
      celebrations.init();
    } catch (error) {
      config.log('error', 'Failed to initialize celebrations:', error);
    }

    // Initialize recently viewed
    recentlyViewed.init();

    // Initialize random guide module
    try {
      await randomGuide.init();
    } catch (error) {
      config.log('error', 'Failed to initialize random guide module:', error);
    }

    // Initialize tools navigation
    toolsNav.init();

    // Initialize import/export
    importExport.initializeImportHandler();

    // Namespace exported functions under window.App to avoid global pollution
    if (!window.App) window.App = {};
    window.App.exportProgress = importExport.exportProgress;
    window.App.importProgress = importExport.importProgress;
    window.App.resetProgress = importExport.resetProgress;
    window.App.showExportModal = importExport.showExportModal;
    window.App.closeExportModal = importExport.closeExportModal;
    window.App.exportAsJSON = importExport.exportAsJSON;
    window.App.exportNotesAsCSV = importExport.exportNotesAsCSV;
    window.App.exportProgressAsCSV = importExport.exportProgressAsCSV;
    window.App.exportNotesAsMarkdown = importExport.exportNotesAsMarkdown;
    window.App.restoreFromIndexedDB = importExport.restoreFromIndexedDB;
    window.App.closeRestoreModal = importExport.closeRestoreModal;

    // Keep old names for backward compatibility with init.js
    window.showExportModal = window.App.showExportModal;
    window.importProgress = window.App.importProgress;
    window.resetProgress = window.App.resetProgress;

    // Check for IndexedDB backups to restore
    try {
      await importExport.checkAndOfferIndexedDBRestore();
    } catch (error) {
      config.log('error', 'Failed to check for IndexedDB restore:', error);
    }

    // Check if backup reminder should be shown
    importExport.checkBackupReminder();

    // Initialize offline manager
    try {
      await offlineManager.init();
      offlineManagerUI.initUI();
      // Store under App namespace to avoid global pollution
      if (!window.App) window.App = {};
      window.App.offlineManagerUI = offlineManagerUI;
      // Keep on window for backward compatibility with init.js
      window.offlineManagerUI = offlineManagerUI;
    } catch (error) {
      config.log('error', 'Failed to initialize offline manager:', error);
    }

    // Set up error toast notification listener
    window.addEventListener('app-error', (event) => {
      const errorEntry = event.detail;
      if (notifications && typeof notifications.showErrorToast === 'function') {
        notifications.showErrorToast(errorEntry.message);
      }
    });

    // Update offline badges after everything is loaded
    window.addEventListener('load', () => {
      setTimeout(async () => {
        try {
          await offlineManagerUI.updateGuideOfflineBadges();
          keyboard.initializeCardKeyboardNav();
        } catch (error) {
          config.log('error', 'Failed to update offline badges:', error);
        }
      }, 100);
    });

    if (!window.__deferredLoaded) {
      window.__deferredLoaded = true;
      config.debug('Deferred modules loaded successfully');
    }

  } catch (error) {
    config.log('error', 'Failed to load deferred modules:', error);
  }
}

/**
 * Register the service worker for offline functionality
 * Note: Update detection has been consolidated in pwa.js
 */
function registerServiceWorker() {
  // Only register service worker if enabled in config
  if (!config.shouldUseServiceWorker()) {
    config.debug('Service Worker registration skipped', { reason: 'Disabled in config' });
    return;
  }

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js')
      .then(reg => {
        config.log('debug', 'Service Worker registered:', { scope: reg.scope });
      })
      .catch(err => {
        config.log('error', 'Service Worker registration failed:', err);
        const banner = document.createElement('div');
        banner.id = 'sw-error-banner';
        banner.className = 'sw-banner sw-banner--error';
        banner.textContent = 'Offline mode unavailable. Please reload the page.';
        document.body.appendChild(banner);
      });
  }
}

/**
 * One-time migration: re-key progress entries from slug to guide ID.
 * Old guide-common.js stored progress keyed by slug (e.g. "blacksmithing").
 * Index page and cards expect guide IDs (e.g. "GD-224").
 * This maps any slug-keyed entries to their proper IDs so counts match.
 */
function migrateSlugProgress() {
  if (storage.get('progress-slug-migrated')) return;

  const guidesData = cards.getGuidesData();
  if (!guidesData || guidesData.length === 0) return;

  const progress = storage.getProgress();
  const slugToId = {};
  const knownIds = new Set();

  for (const guide of guidesData) {
    if (guide.slug) slugToId[guide.slug] = guide.id;
    knownIds.add(guide.id);
  }

  let changed = false;
  const newProgress = { ...progress };

  for (const [key, value] of Object.entries(progress)) {
    // If this key is a slug (not already a known ID) and we have a mapping, migrate it
    if (!knownIds.has(key) && slugToId[key]) {
      const id = slugToId[key];
      // Only migrate if the ID entry doesn't already exist or isn't completed
      if (!newProgress[id] || !newProgress[id].completed) {
        newProgress[id] = value;
        changed = true;
      }
      delete newProgress[key];
      changed = true;
    }
  }

  if (changed) {
    storage.setProgress(newProgress);
  }

  storage.set('progress-slug-migrated', '1');
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}

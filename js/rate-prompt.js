/**
 * Rate This App Prompt
 * Non-annoying review prompt for the Offline Knowledge Compendium app.
 *
 * Triggers when:
 * - User has marked 5+ guides as read
 * - At least 3 days since first open
 * - Prompt hasn't been shown before (or once per major version)
 *
 * Platform detection:
 * - Android (TWA): opens Play Store listing URL
 * - Web fallback: does nothing (no store to review on)
 *
 * No external dependencies. Self-contained CSS injected via JS.
 */

(function initRatePrompt() {
  'use strict';

  // ── Configuration ──────────────────────────────────────────────
  const FIRST_OPEN_KEY = 'compendium-first-open';
  const RATE_DISMISSED_KEY = 'compendium-rate-dismissed';
  const PROGRESS_KEY = 'compendium-progress';
  const APP_VERSION_KEY = 'compendium-app-version';

  const CURRENT_MAJOR_VERSION = '3'; // bump this on major releases to re-show
  const MIN_GUIDES_READ = 5;
  const MIN_DAYS_SINCE_INSTALL = 3;
  const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.zthsurvival.app';

  // ── Platform Detection ─────────────────────────────────────────
  function getPlatform() {
    // TWA detection: Android Chrome with display-mode standalone
    const isAndroid = /android/i.test(navigator.userAgent);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    if (isAndroid && isStandalone) return 'android-twa';
    return 'web';
  }

  // ── Eligibility Check ──────────────────────────────────────────
  function isEligible() {
    // Record first open if not set
    if (!localStorage.getItem(FIRST_OPEN_KEY)) {
      localStorage.setItem(FIRST_OPEN_KEY, Date.now().toString());
    }

    // Already dismissed for this major version?
    const dismissed = localStorage.getItem(RATE_DISMISSED_KEY);
    if (dismissed === CURRENT_MAJOR_VERSION) return false;

    // Enough guides read?
    let guidesRead = 0;
    try {
      const progress = JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}');
      guidesRead = Object.keys(progress).filter(k => progress[k] === true || progress[k] === 'read').length;
    } catch (e) {
      return false;
    }
    if (guidesRead < MIN_GUIDES_READ) return false;

    // Enough days since install?
    const firstOpen = parseInt(localStorage.getItem(FIRST_OPEN_KEY), 10);
    if (isNaN(firstOpen)) return false;
    const daysSinceInstall = (Date.now() - firstOpen) / (1000 * 60 * 60 * 24);
    if (daysSinceInstall < MIN_DAYS_SINCE_INSTALL) return false;

    // Must be a native platform (no point showing on web)
    const platform = getPlatform();
    if (platform === 'web') return false;

    return true;
  }

  // ── Trigger Review ─────────────────────────────────────────────
  function triggerReview() {
    window.open(PLAY_STORE_URL, '_blank');
  }

  // ── CSS Injection ──────────────────────────────────────────────
  function injectStyles() {
    if (document.getElementById('compendium-rate-styles')) return;

    const css = `
      .compendium-rate-overlay {
        position: fixed;
        inset: 0;
        z-index: 100000;
        display: flex;
        align-items: flex-end;
        justify-content: center;
        background: rgba(0, 0, 0, 0.5);
        opacity: 0;
        transition: opacity 0.3s ease;
        padding: 1rem;
      }
      .compendium-rate-overlay.visible {
        opacity: 1;
      }

      .compendium-rate-card {
        background: var(--surface, #2d2416);
        border: 1px solid var(--border, #4a6d4a);
        border-radius: 16px;
        padding: 1.75rem;
        max-width: 380px;
        width: 100%;
        text-align: center;
        transform: translateY(40px);
        transition: transform 0.3s ease;
        margin-bottom: env(safe-area-inset-bottom, 0);
      }
      .compendium-rate-overlay.visible .compendium-rate-card {
        transform: translateY(0);
      }

      .compendium-rate-emoji {
        font-size: 2.5rem;
        margin-bottom: 0.75rem;
        display: block;
      }

      .compendium-rate-title {
        font-family: Georgia, 'Times New Roman', serif;
        font-size: 1.25rem;
        color: var(--accent, #d4a574);
        margin: 0 0 0.5rem 0;
        font-weight: bold;
      }

      .compendium-rate-body {
        font-family: Georgia, 'Times New Roman', serif;
        font-size: 0.95rem;
        color: var(--text, #f5f0e8);
        line-height: 1.5;
        margin: 0 0 1.25rem 0;
      }

      .compendium-rate-actions {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .compendium-rate-btn {
        font-family: Georgia, 'Times New Roman', serif;
        font-size: 1rem;
        padding: 0.75rem 1.25rem;
        border-radius: 10px;
        border: none;
        cursor: pointer;
        transition: background-color 0.2s, transform 0.1s;
      }
      .compendium-rate-btn:active {
        transform: scale(0.97);
      }

      .compendium-rate-btn-primary {
        background: var(--accent, #d4a574);
        color: var(--bg, #1a2e1a);
        font-weight: bold;
      }
      .compendium-rate-btn-primary:hover {
        filter: brightness(1.1);
      }

      .compendium-rate-btn-secondary {
        background: transparent;
        color: var(--muted, #999);
        font-size: 0.9rem;
      }
      .compendium-rate-btn-secondary:hover {
        color: var(--text, #f5f0e8);
      }

      @media (prefers-reduced-motion: reduce) {
        .compendium-rate-overlay,
        .compendium-rate-card,
        .compendium-rate-btn {
          transition: none;
        }
      }
    `;

    const style = document.createElement('style');
    style.id = 'compendium-rate-styles';
    style.textContent = css;
    document.head.appendChild(style);
  }

  // ── Render Prompt ──────────────────────────────────────────────
  function showPrompt() {
    injectStyles();

    const overlay = document.createElement('div');
    overlay.className = 'compendium-rate-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Rate this app');

    overlay.innerHTML = `
      <div class="compendium-rate-card">
        <span class="compendium-rate-emoji" aria-hidden="true">⭐</span>
        <h2 class="compendium-rate-title">Enjoying the Compendium?</h2>
        <p class="compendium-rate-body">You've read ${getGuidesReadCount()} guides so far — nice work. A quick rating helps others find this resource.</p>
        <div class="compendium-rate-actions">
          <button class="compendium-rate-btn compendium-rate-btn-primary" id="compendium-rate-yes" aria-label="Rate the app">Rate It</button>
          <button class="compendium-rate-btn compendium-rate-btn-secondary" id="compendium-rate-later" aria-label="Maybe later">Not now</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // Animate in
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        overlay.classList.add('visible');
      });
    });

    // Focus the primary button
    const rateBtn = overlay.querySelector('#compendium-rate-yes');
    const laterBtn = overlay.querySelector('#compendium-rate-later');
    rateBtn.focus();

    // Rate button
    rateBtn.addEventListener('click', () => {
      dismiss(overlay);
      triggerReview();
    });

    // Not now button
    laterBtn.addEventListener('click', () => {
      dismiss(overlay);
    });

    // Close on overlay background click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        dismiss(overlay);
      }
    });

    // Keyboard: Escape to close
    function handleKey(e) {
      if (e.key === 'Escape') {
        dismiss(overlay);
        document.removeEventListener('keydown', handleKey);
      }
    }
    document.addEventListener('keydown', handleKey);
  }

  function getGuidesReadCount() {
    try {
      const progress = JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}');
      return Object.keys(progress).filter(k => progress[k] === true || progress[k] === 'read').length;
    } catch (e) {
      return 0;
    }
  }

  function dismiss(overlay) {
    localStorage.setItem(RATE_DISMISSED_KEY, CURRENT_MAJOR_VERSION);
    overlay.classList.remove('visible');
    setTimeout(() => {
      overlay.remove();
    }, 300);
  }

  // ── Init ───────────────────────────────────────────────────────
  function init() {
    // Delay check so it doesn't compete with page load or onboarding
    setTimeout(() => {
      if (isEligible()) {
        showPrompt();
      }
    }, 3000);
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

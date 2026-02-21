/**
 * Disclaimer Dismiss — Global one-time dismissal for all disclaimer banners
 *
 * Requires the user to click the "Full Disclaimer" link at least once.
 * Once dismissed on ANY page, banners are hidden on ALL pages (guides + tools).
 * Shares the same localStorage keys as guide-common.js so they stay in sync.
 *
 * Keys:
 *   compendium-disclaimer-read      — set when user clicks the disclaimer link
 *   compendium-disclaimer-dismissed  — set when user clicks dismiss; hides all banners
 */
(function() {
  'use strict';

  var GLOBAL_KEY = 'compendium-disclaimer-dismissed';
  var READ_KEY = 'compendium-disclaimer-read';

  var banner = document.querySelector('.tool-disclaimer-banner');
  if (!banner) return;

  // If globally dismissed, hide immediately
  if (localStorage.getItem(GLOBAL_KEY)) {
    banner.style.display = 'none';
    return;
  }

  var hasRead = localStorage.getItem(READ_KEY);
  var disclaimerLink = banner.querySelector('a[href*="disclaimer"]');

  // Create the dismiss button (hidden until they read the disclaimer)
  var dismissBtn = document.createElement('button');
  dismissBtn.style.cssText = 'display:none;margin-top:0.75rem;padding:6px 14px;'
    + 'background:rgba(255,255,255,0.1);color:#f5f0e8;border:1px solid #d4a574;'
    + 'border-radius:4px;cursor:pointer;font-size:0.85em;transition:background 0.2s;';
  dismissBtn.textContent = '\u2713 Got it, don\u2019t show again';

  dismissBtn.addEventListener('mouseenter', function() {
    dismissBtn.style.background = 'rgba(212,165,116,0.2)';
  });
  dismissBtn.addEventListener('mouseleave', function() {
    dismissBtn.style.background = 'rgba(255,255,255,0.1)';
  });

  dismissBtn.addEventListener('click', function() {
    localStorage.setItem(GLOBAL_KEY, new Date().toISOString());
    banner.style.display = 'none';
  });

  banner.appendChild(dismissBtn);

  if (hasRead) {
    dismissBtn.style.display = 'block';
  } else if (disclaimerLink) {
    var hint = document.createElement('div');
    hint.style.cssText = 'margin-top:0.5rem;font-size:0.8em;color:#8b7355;';
    hint.textContent = 'Please read the full disclaimer to dismiss this notice.';
    banner.appendChild(hint);

    disclaimerLink.addEventListener('click', function() {
      localStorage.setItem(READ_KEY, '1');
      hint.remove();
      dismissBtn.style.display = 'block';
    });
  }
})();

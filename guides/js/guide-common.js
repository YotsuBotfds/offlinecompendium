/**
 * Guide Common — Shared functionality for all guide pages
 *
 * Centralizes: progress tracking, bookmarks, notes, back-to-top.
 * Loaded AFTER theme-sync.js (which handles theme toggle).
 * Auto-initializes on DOMContentLoaded.
 */
(function() {
  'use strict';

  var guideId = document.body.getAttribute('data-guide-id')
    || location.pathname.split('/').pop().replace('.html', '');

  // Escape HTML special characters to prevent XSS
  function esc(text) {
    if (!text) return '';
    var map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return String(text).replace(/[&<>"']/g, function(m) { return map[m]; });
  }

  // ── Dismissible Liability Disclaimer ────────────────────────
  // Global dismiss: read the full disclaimer once, dismiss on any page,
  // and all banners across every guide and tools page are hidden.
  function initDisclaimer() {
    var banner = document.querySelector('.container > .danger, .container > .warning');
    if (!banner) return;

    var GLOBAL_KEY = 'compendium-disclaimer-dismissed';
    var READ_KEY = 'compendium-disclaimer-read';

    // If globally dismissed, hide immediately
    if (localStorage.getItem(GLOBAL_KEY)) {
      banner.style.display = 'none';
      return;
    }

    var hasRead = localStorage.getItem(READ_KEY);
    var disclaimerLink = banner.querySelector('a[href*="disclaimer"]');

    // Create dismiss button (hidden until they've read the disclaimer)
    var dismissBtn = document.createElement('button');
    dismissBtn.textContent = '\u2713 I understand, don\u2019t show again';
    dismissBtn.style.cssText = 'display:none;margin-top:0.75rem;padding:6px 14px;'
      + 'background:var(--card, #333);color:var(--text, #eee);border:1px solid var(--border, #555);'
      + 'border-radius:4px;cursor:pointer;font-size:0.85em;transition:background 0.2s;';

    dismissBtn.addEventListener('click', function() {
      localStorage.setItem(GLOBAL_KEY, new Date().toISOString());
      banner.style.display = 'none';
    });

    banner.appendChild(dismissBtn);

    if (hasRead || !disclaimerLink) {
      dismissBtn.style.display = 'block';
    } else {
      var hint = document.createElement('div');
      hint.style.cssText = 'margin-top:0.5rem;font-size:0.8em;color:var(--muted, #888);';
      hint.textContent = 'Please read the full disclaimer to dismiss this notice.';
      banner.appendChild(hint);

      disclaimerLink.addEventListener('click', function() {
        localStorage.setItem(READ_KEY, '1');
        hint.remove();
        dismissBtn.style.display = 'block';
      });
    }
  }

  // ── Progress / Mark-as-Read ──────────────────────────────────
  function initProgress() {
    var progress;
    try {
      progress = JSON.parse(localStorage.getItem('compendium-progress') || '{}');
    } catch (e) {
      progress = {};
    }
    var btn = document.getElementById('mark-read-btn');
    if (!btn) return;

    if (progress[guideId] && progress[guideId].completed) {
      btn.textContent = '✓ Completed';
      btn.classList.add('completed');
    }

    btn.addEventListener('click', function() {
      var p;
      try {
        p = JSON.parse(localStorage.getItem('compendium-progress') || '{}');
      } catch (e) {
        p = {};
      }
      p[guideId] = { completed: true, date: new Date().toISOString() };
      localStorage.setItem('compendium-progress', JSON.stringify(p));
      btn.textContent = '✓ Completed';
      btn.classList.add('completed');
    });
  }

  // ── Bookmarks ────────────────────────────────────────────────
  function initBookmarks() {
    var guideName = location.pathname.split('/').pop();
    var bookmarks;
    try {
      bookmarks = JSON.parse(localStorage.getItem('compendium-bookmarks') || '{}');
    } catch (e) {
      bookmarks = {};
    }

    document.querySelectorAll('h2[id]').forEach(function(h2) {
      var key = guideName + '#' + h2.id;
      var btn = document.createElement('button');
      btn.className = 'bookmark-star';
      btn.textContent = bookmarks[key] ? '★' : '☆';
      btn.style.cssText = 'background:transparent;border:none;font-size:1.3em;cursor:pointer;'
        + 'color:' + (bookmarks[key] ? 'var(--accent)' : 'var(--muted)') + ';margin-left:10px;vertical-align:middle;';
      btn.setAttribute('aria-label', bookmarks[key] ? 'Remove bookmark' : 'Bookmark this section');

      btn.addEventListener('click', function(e) {
        e.preventDefault();
        var bm;
        try {
          bm = JSON.parse(localStorage.getItem('compendium-bookmarks') || '{}');
        } catch (e) {
          bm = {};
        }
        if (bm[key]) {
          delete bm[key];
          btn.textContent = '☆';
          btn.style.color = 'var(--muted)';
          btn.setAttribute('aria-label', 'Bookmark this section');
        } else {
          bm[key] = { guide: guideName, section: h2.textContent.replace('★','').replace('☆','').trim(), timestamp: Date.now() };
          btn.textContent = '★';
          btn.style.color = 'var(--accent)';
          btn.setAttribute('aria-label', 'Remove bookmark');
        }
        localStorage.setItem('compendium-bookmarks', JSON.stringify(bm));
      });
      h2.appendChild(btn);
    });

    // Floating bookmarks panel button
    var panelBtn = document.createElement('button');
    panelBtn.textContent = '🔖';
    panelBtn.title = 'View Bookmarks';
    panelBtn.setAttribute('aria-label', 'View bookmarks panel');
    panelBtn.style.cssText = 'position:fixed;bottom:5rem;right:2rem;width:50px;height:50px;'
      + 'border-radius:50%;border:2px solid var(--accent);background:var(--surface);'
      + 'font-size:1.5em;cursor:pointer;z-index:98;box-shadow:0 4px 12px rgba(0,0,0,0.3);'
      + 'display:flex;align-items:center;justify-content:center;transition:transform 0.2s;';

    panelBtn.addEventListener('click', function() {
      var bm;
      try {
        bm = JSON.parse(localStorage.getItem('compendium-bookmarks') || '{}');
      } catch (e) {
        bm = {};
      }
      var guideBookmarks = Object.entries(bm).filter(function(entry) { return entry[0].startsWith(guideName); });

      var panel = document.getElementById('bookmark-panel');
      if (panel) { panel.remove(); return; }

      panel = document.createElement('div');
      panel.id = 'bookmark-panel';
      panel.style.cssText = 'position:fixed;bottom:9rem;right:2rem;width:300px;max-height:400px;'
        + 'overflow-y:auto;background:var(--surface);border:2px solid var(--accent);'
        + 'border-radius:8px;padding:15px;z-index:98;box-shadow:0 8px 25px rgba(0,0,0,0.3);';

      // Create header
      var h3 = document.createElement('h3');
      h3.style.cssText = 'margin:0 0 10px;color:var(--accent);font-size:1.1em;';
      h3.textContent = '🔖 Bookmarks';
      panel.appendChild(h3);

      if (guideBookmarks.length === 0) {
        var emptyMsg = document.createElement('p');
        emptyMsg.style.cssText = 'color:var(--muted);font-size:0.9em;';
        emptyMsg.textContent = 'No bookmarks yet. Click ☆ next to any section heading to bookmark it.';
        panel.appendChild(emptyMsg);
      } else {
        guideBookmarks.forEach(function(entry) {
          var sectionId = entry[0].split('#')[1];
          var data = entry[1];
          var link = document.createElement('a');
          link.href = '#' + esc(sectionId);
          link.style.cssText = 'display:block;padding:8px;margin:4px 0;'
            + 'background:var(--card);border-radius:4px;color:var(--accent2);text-decoration:none;'
            + 'font-size:0.9em;transition:background 0.2s;';
          link.textContent = '★ ' + data.section;

          // Add hover listeners
          link.addEventListener('mouseover', function() {
            link.style.background = 'var(--accent)';
            link.style.color = 'var(--bg)';
          });
          link.addEventListener('mouseout', function() {
            link.style.background = 'var(--card)';
            link.style.color = 'var(--accent2)';
          });

          // Add click listener to close panel
          link.addEventListener('click', function(e) {
            // Note: e.preventDefault() not needed here since we want default link behavior
            var p = document.getElementById('bookmark-panel');
            if (p) p.remove();
          });

          panel.appendChild(link);
        });
      }

      // Create close button
      var closeBtn = document.createElement('button');
      closeBtn.style.cssText = 'margin-top:10px;padding:6px 12px;'
        + 'background:var(--card);color:var(--text);border:1px solid var(--border);border-radius:4px;'
        + 'cursor:pointer;width:100%;';
      closeBtn.textContent = 'Close';
      closeBtn.addEventListener('click', function() {
        panel.remove();
      });
      panel.appendChild(closeBtn);

      document.body.appendChild(panel);
    });
    document.body.appendChild(panelBtn);
  }

  // ── Notes ────────────────────────────────────────────────────
  function initNotes() {
    var notesKey = 'compendium-notes-' + guideId;
    var notesArea = document.getElementById('guide-notes-text');
    var saveBtn = document.getElementById('save-notes-btn');
    var notesHeader = document.querySelector('.notes-header');
    var notesContent = document.querySelector('.notes-content');

    if (notesArea) {
      notesArea.value = localStorage.getItem(notesKey) || '';
    }

    if (saveBtn && notesArea) {
      saveBtn.addEventListener('click', function() {
        localStorage.setItem(notesKey, notesArea.value);
        var orig = saveBtn.textContent;
        saveBtn.textContent = '✓ Saved!';
        setTimeout(function() { saveBtn.textContent = orig; }, 1500);
      });
    }

    if (notesHeader && notesContent) {
      notesHeader.addEventListener('click', function() {
        notesContent.classList.toggle('open');
        var indicator = notesHeader.querySelector('.toggle-indicator');
        if (indicator) {
          indicator.textContent = notesContent.classList.contains('open') ? '▾' : '▸';
        }
      });
    }
  }

  // ── Back to Top ──────────────────────────────────────────────
  function initBackToTop() {
    var btn = document.getElementById('back-to-top');
    if (!btn) return;

    window.addEventListener('scroll', function() {
      btn.style.display = window.scrollY > 300 ? 'flex' : 'none';
    }, { passive: true });

    btn.addEventListener('click', function() {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // ── Print Button ──────────────────────────────────────────────
  function initPrintButton() {
    document.getElementById('print-btn')?.addEventListener('click', () => window.print());
  }

  // ── Auto-init ────────────────────────────────────────────────
  function init() {
    initDisclaimer();
    initProgress();
    initBookmarks();
    initNotes();
    initBackToTop();
    initPrintButton();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

/**
 * E-ink / low-capability display detection
 *
 * Shows a banner suggesting the lite version when it detects:
 * - Monochrome display (e-ink readers)
 * - Kindle/NetFront/Silk user agent
 * - Very narrow viewport + no color support
 *
 * Dismissal is persisted in localStorage so users only see it once.
 */
(function () {
  if (localStorage.getItem('eink-banner-dismissed')) return;

  const isMonochrome = window.matchMedia && window.matchMedia('(monochrome)').matches;
  const ua = navigator.userAgent || '';
  const isKindle = /Kindle|NetFront|Silk\/\d/i.test(ua);
  const isLowColor = window.matchMedia && window.matchMedia('(max-color: 1)').matches;
  const isNarrowMono = isMonochrome && window.innerWidth < 1100;

  if (!isMonochrome && !isKindle && !isLowColor) return;

  // Wait for DOM
  function show() {
    const banner = document.getElementById('eink-banner');
    if (!banner) return;
    banner.classList.add('visible');

    const btn = document.getElementById('eink-banner-dismiss');
    if (btn) {
      btn.addEventListener('click', function () {
        banner.classList.remove('visible');
        try { localStorage.setItem('eink-banner-dismissed', '1'); } catch (e) {}
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', show);
  } else {
    show();
  }
})();

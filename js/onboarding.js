/**
 * Onboarding Overlay
 * First-run experience for the Offline Knowledge Compendium PWA
 *
 * Features:
 * - 3-screen swipeable/clickable onboarding flow
 * - localStorage persistence (compendium-onboarding-seen)
 * - Dark/light theme support via CSS variables
 * - Full keyboard navigation and accessibility
 * - Mobile-friendly responsive design
 * - No external dependencies
 */

(function initOnboarding() {
  'use strict';

  // Configuration
  const STORAGE_KEY = 'compendium-onboarding-seen';
  const ANIMATION_DURATION = 300; // ms

  // Persona storage key
  const PERSONA_KEY = 'compendium-user-persona';

  // Screen definitions
  const screens = [
    {
      id: 'screen-1',
      title: '480 Survival Guides, Fully Offline',
      subtitle: 'From water purification to metalworking — everything you need to rebuild from zero.',
      emoji: '📚',
      index: 0,
    },
    {
      id: 'screen-2',
      title: 'Are You Preparing or Responding?',
      subtitle: 'This helps us show you the right guides first.',
      emoji: '🧭',
      index: 1,
      isPersonaScreen: true,
    },
    {
      id: 'screen-3',
      title: 'Works Without Internet',
      subtitle: 'Every guide is cached on your device. Read anywhere — no signal required.',
      emoji: '📡',
      index: 2,
      isLast: true,
    },
  ];

  // Check if onboarding has already been seen
  function hasSeenOnboarding() {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  }

  // Mark onboarding as seen
  function markOnboardingSeen() {
    localStorage.setItem(STORAGE_KEY, 'true');
  }

  // Create overlay DOM structure
  function createOverlay() {
    const overlay = document.createElement('div');
    overlay.className = 'compendium-onboarding-overlay';
    overlay.setAttribute('aria-label', 'Welcome to Offline Knowledge Compendium');
    overlay.setAttribute('role', 'dialog');

    const container = document.createElement('div');
    container.className = 'compendium-onboarding-container';
    overlay.appendChild(container);

    return { overlay, container };
  }

  // Selected persona (null until chosen)
  let selectedPersona = null;

  // Create a screen card
  function createCard(screen) {
    const card = document.createElement('div');
    card.className = 'compendium-onboarding-card';
    card.id = screen.id;
    card.setAttribute('role', 'article');

    const emoji = document.createElement('div');
    emoji.className = 'compendium-onboarding-emoji';
    emoji.textContent = screen.emoji;
    emoji.setAttribute('aria-hidden', 'true');

    const title = document.createElement('h2');
    title.className = 'compendium-onboarding-title';
    title.textContent = screen.title;

    const subtitle = document.createElement('p');
    subtitle.className = 'compendium-onboarding-subtitle';
    subtitle.textContent = screen.subtitle;

    const content = document.createElement('div');
    content.appendChild(emoji);
    content.appendChild(title);
    content.appendChild(subtitle);

    // Add persona selector for the persona screen
    if (screen.isPersonaScreen) {
      const choices = document.createElement('div');
      choices.className = 'compendium-persona-choices';

      const preparer = createPersonaButton(
        '🛡️',
        'I\'m Preparing',
        'I have time, power, and internet. Show me the full reading order.',
        'preparer'
      );

      const responder = createPersonaButton(
        '⚡',
        'I Need Power Now',
        'My battery is dying. Show me how to charge my device first.',
        'responder'
      );

      choices.appendChild(preparer);
      choices.appendChild(responder);
      content.appendChild(choices);
    }

    card.appendChild(content);

    return card;
  }

  // Create persona choice button
  function createPersonaButton(emoji, label, desc, persona) {
    const btn = document.createElement('button');
    btn.className = 'compendium-persona-btn';
    btn.dataset.persona = persona;
    btn.setAttribute('aria-label', label + ': ' + desc);

    btn.innerHTML = '<span class="compendium-persona-emoji">' + emoji + '</span>' +
      '<div><div class="compendium-persona-label">' + label + '</div>' +
      '<div class="compendium-persona-desc">' + desc + '</div></div>';

    btn.addEventListener('click', function() {
      selectedPersona = persona;
      localStorage.setItem(PERSONA_KEY, persona);
      // Highlight selected
      document.querySelectorAll('.compendium-persona-btn').forEach(function(b) {
        b.classList.remove('selected');
      });
      btn.classList.add('selected');
    });

    return btn;
  }

  // Create dot indicators
  function createDots(currentIndex) {
    const dotsContainer = document.createElement('div');
    dotsContainer.className = 'compendium-onboarding-dots';
    dotsContainer.setAttribute('role', 'tablist');
    dotsContainer.setAttribute('aria-label', 'Onboarding screens');

    screens.forEach((screen, idx) => {
      const dot = document.createElement('button');
      dot.className = `compendium-onboarding-dot ${idx === currentIndex ? 'active' : ''}`;
      dot.setAttribute('aria-label', `Screen ${idx + 1} of ${screens.length}`);
      dot.setAttribute('role', 'tab');
      dot.setAttribute('aria-selected', idx === currentIndex ? 'true' : 'false');
      dot.dataset.screenIndex = idx;
      dotsContainer.appendChild(dot);
    });

    return dotsContainer;
  }

  // Create control buttons
  function createControls(screen, onNext, onPrev, onSkip) {
    const controls = document.createElement('div');
    controls.className = 'compendium-onboarding-controls';

    const nextButton = document.createElement('button');
    nextButton.className = 'compendium-onboarding-button compendium-onboarding-button-primary';
    nextButton.textContent = screen.isLast ? 'Get Started' : 'Next';
    nextButton.setAttribute('aria-label', screen.isLast ? 'Get started and dismiss onboarding' : 'Go to next screen');
    nextButton.addEventListener('click', onNext);

    const skipButton = document.createElement('button');
    skipButton.className = 'compendium-onboarding-skip';
    skipButton.textContent = 'Skip';
    skipButton.setAttribute('aria-label', 'Skip onboarding');
    skipButton.addEventListener('click', onSkip);

    controls.appendChild(nextButton);
    controls.appendChild(skipButton);

    return controls;
  }

  // Initialize and show the onboarding
  function showOnboarding() {
    const { overlay, container } = createOverlay();
    let currentIndex = 0;
    let isAnimating = false;

    // Create all cards
    const cards = screens.map(screen => createCard(screen));
    cards.forEach((card, idx) => {
      if (idx !== 0) {
        card.classList.add('hidden');
      }
      container.appendChild(card);
    });

    // Add dots and initial controls
    const dotsContainer = createDots(currentIndex);
    container.appendChild(dotsContainer);

    const currentCard = cards[currentIndex];
    let controls = createControls(screens[currentIndex], goNext, goPrev, goSkip);
    container.appendChild(controls);

    // Navigation functions
    function goToScreen(targetIndex) {
      if (isAnimating || targetIndex === currentIndex) return;
      if (targetIndex < 0 || targetIndex >= screens.length) return;

      isAnimating = true;
      const direction = targetIndex > currentIndex ? 1 : -1;
      const currentCard = cards[currentIndex];
      const nextCard = cards[targetIndex];

      // Animate out current card
      currentCard.classList.add(direction > 0 ? 'slide-out-left' : 'slide-out-right');

      // Show and animate in next card
      nextCard.classList.remove('hidden');
      nextCard.classList.add(direction > 0 ? 'slide-in-right' : 'slide-in-left');

      setTimeout(() => {
        // Clean up previous card
        currentCard.classList.add('hidden');
        currentCard.classList.remove('slide-out-left', 'slide-out-right');
        nextCard.classList.remove('slide-in-left', 'slide-in-right');

        // Update dots
        document.querySelectorAll('.compendium-onboarding-dot').forEach((dot, idx) => {
          const isActive = idx === targetIndex;
          dot.classList.toggle('active', isActive);
          dot.setAttribute('aria-selected', isActive ? 'true' : 'false');
        });

        // Update controls
        container.removeChild(controls);
        controls = createControls(screens[targetIndex], goNext, goPrev, goSkip);
        container.appendChild(controls);

        currentIndex = targetIndex;
        isAnimating = false;

        // Focus the next button for accessibility
        controls.querySelector('.compendium-onboarding-button-primary').focus();
      }, ANIMATION_DURATION);
    }

    function goNext() {
      if (currentIndex === screens.length - 1) {
        dismiss();
      } else {
        goToScreen(currentIndex + 1);
      }
    }

    function goPrev() {
      goToScreen(currentIndex - 1);
    }

    function goSkip() {
      dismiss();
    }

    function dismiss() {
      if (isAnimating) return;

      overlay.classList.add('fade-out');
      setTimeout(() => {
        overlay.remove();
        markOnboardingSeen();
        // Show Power First banner for responders (or if no persona selected)
        if (selectedPersona === 'responder') {
          showPowerFirstBanner();
        }
      }, ANIMATION_DURATION);
    }

    // Handle dot clicks
    container.addEventListener('click', (e) => {
      if (e.target.classList.contains('compendium-onboarding-dot')) {
        const targetIndex = parseInt(e.target.dataset.screenIndex, 10);
        goToScreen(targetIndex);
      }
    });

    // Handle keyboard navigation
    document.addEventListener('keydown', (e) => {
      if (!document.body.contains(overlay)) return; // Exit if overlay removed

      switch (e.key) {
        case 'ArrowRight':
          e.preventDefault();
          goNext();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          goPrev();
          break;
        case 'Enter':
          e.preventDefault();
          const focusedButton = document.activeElement;
          if (focusedButton && focusedButton.classList.contains('compendium-onboarding-button-primary')) {
            goNext();
          }
          break;
        case 'Escape':
          e.preventDefault();
          dismiss();
          break;
      }
    });

    // Close on backdrop click (but not on card)
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        dismiss();
      }
    });

    // Append overlay to body
    document.body.appendChild(overlay);

    // Focus the primary button for accessibility
    setTimeout(() => {
      const primaryButton = overlay.querySelector('.compendium-onboarding-button-primary');
      if (primaryButton) primaryButton.focus();
    }, ANIMATION_DURATION);
  }

  // Show Power First banner for responders
  function showPowerFirstBanner() {
    const banner = document.createElement('div');
    banner.className = 'compendium-power-first-banner';
    banner.setAttribute('role', 'alert');
    banner.innerHTML =
      '<h3>⚡ Before You Lose Power</h3>' +
      '<p>Read the <strong>Emergency Power Bootstrap</strong> guide first — it covers the fastest ways to charge your device so you can access everything else.</p>' +
      '<div class="compendium-pf-actions">' +
        '<a href="guides/emergency-power-bootstrap.html" class="compendium-pf-btn compendium-pf-btn-primary">Read Power Guide</a>' +
        '<button class="compendium-pf-btn compendium-pf-btn-dismiss" aria-label="Dismiss">Later</button>' +
      '</div>';

    document.body.appendChild(banner);

    banner.querySelector('.compendium-pf-btn-dismiss').addEventListener('click', function() {
      banner.classList.add('dismissing');
      setTimeout(function() { banner.remove(); }, 300);
    });

    // Auto-dismiss after 15 seconds
    setTimeout(function() {
      if (document.body.contains(banner)) {
        banner.querySelector('.compendium-pf-btn-dismiss').click();
      }
    }, 15000);
  }

  // Initialize on DOM ready
  function init() {
    if (hasSeenOnboarding()) {
      return;
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        showOnboarding();
      });
    } else {
      showOnboarding();
    }
  }

  // Start initialization
  init();
})();

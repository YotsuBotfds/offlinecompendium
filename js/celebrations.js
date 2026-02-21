/**
 * Milestone Celebrations Module
 * Shows confetti + banner animation when user hits reading milestones
 */

import * as storage from './storage.js';

const MILESTONES = [1, 10, 25, 50, 100, 150, 200, 250, 284];

const MILESTONE_MESSAGES = {
  1: { icon: '\u{1F31F}', title: 'First Guide Complete!', subtitle: 'Your survival journey begins' },
  10: { icon: '\u{1F525}', title: '10 Guides Read!', subtitle: 'Building a solid foundation' },
  25: { icon: '\u26A1', title: '25 Guides Read!', subtitle: 'Quarter century of knowledge' },
  50: { icon: '\u{1F3AF}', title: '50 Guides Read!', subtitle: 'Halfway to mastery' },
  100: { icon: '\u{1F4AF}', title: '100 Guides Read!', subtitle: 'Triple-digit survivor' },
  150: { icon: '\u{1F680}', title: '150 Guides Read!', subtitle: 'Unstoppable learner' },
  200: { icon: '\u{1F451}', title: '200 Guides Read!', subtitle: 'Almost a master of all trades' },
  250: { icon: '\u{1F3C6}', title: '250 Guides Read!', subtitle: 'Legendary knowledge' },
  284: { icon: '\u{1F30D}', title: 'ALL GUIDES COMPLETE!', subtitle: 'You are truly Offline Knowledge Compendium' },
};

const CONFETTI_COLORS = ['#d4a574', '#e89f5d', '#53d8a8', '#7ec8e3', '#b19cd9', '#ff6b6b', '#ffd700'];

/**
 * Check if a milestone was just reached and celebrate
 * @param {number} readCount - Current number of completed guides
 */
export function checkMilestone(readCount) {
  if (!MILESTONES.includes(readCount)) return;

  // Check if we already celebrated this milestone
  const celebrated = storage.get('compendium-milestones', []);
  if (celebrated.includes(readCount)) return;

  // Mark as celebrated
  celebrated.push(readCount);
  storage.set('compendium-milestones', celebrated);

  // Show celebration after a short delay
  setTimeout(() => showCelebration(readCount), 500);
}

/**
 * Check if a category was just completed
 * @param {string} categoryName - Display name of the category
 */
export function checkCategoryComplete(categoryName) {
  const celebrated = storage.get('compendium-category-milestones', []);
  if (celebrated.includes(categoryName)) return;

  celebrated.push(categoryName);
  storage.set('compendium-category-milestones', celebrated);

  setTimeout(() => {
    showCelebration(null, {
      icon: '\u2B50',
      title: `${categoryName} Complete!`,
      subtitle: 'Category mastered'
    });
  }, 500);
}

/**
 * Show the celebration animation
 * @param {number|null} milestone - The milestone number, or null for custom
 * @param {Object} customMessage - Optional custom message override
 */
function showCelebration(milestone, customMessage = null) {
  const message = customMessage || MILESTONE_MESSAGES[milestone] || {
    icon: '\u{1F389}',
    title: `${milestone} Guides Read!`,
    subtitle: 'Keep going!'
  };

  // Create overlay
  const overlay = document.createElement('div');
  overlay.className = 'milestone-overlay';
  overlay.innerHTML = `
    <div class="milestone-banner">
      <div class="milestone-icon">${message.icon}</div>
      <div class="milestone-title">${message.title}</div>
      <div class="milestone-subtitle">${message.subtitle}</div>
    </div>
  `;

  document.body.appendChild(overlay);

  // Spawn confetti
  spawnConfetti();

  // Remove after animation
  setTimeout(() => {
    overlay.remove();
  }, 4500);

  // Allow clicking to dismiss
  overlay.addEventListener('click', () => overlay.remove());
}

/**
 * Spawn confetti particles
 */
function spawnConfetti() {
  const particleCount = 40;

  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('div');
    particle.className = 'confetti-particle';
    particle.style.backgroundColor = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
    particle.style.left = `${Math.random() * 100}vw`;
    particle.style.top = `${-10 - Math.random() * 20}px`;
    particle.style.setProperty('--fall-duration', `${2 + Math.random() * 2}s`);
    particle.style.setProperty('--rotation', `${360 + Math.random() * 720}deg`);
    particle.style.width = `${6 + Math.random() * 6}px`;
    particle.style.height = `${6 + Math.random() * 6}px`;
    particle.style.animationDelay = `${Math.random() * 0.5}s`;

    document.body.appendChild(particle);

    // Clean up particle after animation
    setTimeout(() => particle.remove(), 4500);
  }
}

/**
 * Initialize celebrations module
 * Listens for progress changes
 */
export function init() {
  // Listen for the custom event from guide pages when a guide is marked complete
  window.addEventListener('guideCompleted', (e) => {
    const completedGuides = storage.getCompletedGuides();
    checkMilestone(completedGuides.size);
  });
}

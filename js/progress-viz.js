/**
 * Category Progress Visualization Module
 * Displays progress bars showing completion percentage per category
 */

import * as storage from './storage.js';
import { categoryColors, categoryOrder, getCategoryName, getCategoryIcon } from './categories-generated.js';

/**
 * Motivational messages at different milestone percentages
 */
const milestoneMessages = {
  25: '🌱 Growing strong!',
  50: '⚡ Halfway there!',
  75: '🎯 Almost mastered!',
  100: '🏆 Category complete!'
};

/**
 * Get all guides data
 */
async function fetchGuidesData() {
  try {
    const response = await fetch('data/guides.json');
    if (!response.ok) {
      throw new Error(`Failed to fetch guides: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching guides.json:', error);
    throw error;
  }
}

/**
 * Group guides by category and count read/total
 * @param {Array} guides - All guides
 * @param {Object} progress - Progress data keyed by guide ID
 * @returns {Object} Category statistics
 */
function calculateCategoryStats(guides, progress) {
  const stats = {};

  for (const guide of guides) {
    const category = guide.category || 'uncategorized';

    if (!stats[category]) {
      stats[category] = {
        name: getCategoryName && typeof getCategoryName === 'function' ? getCategoryName(category) : category,
        icon: getCategoryIcon && typeof getCategoryIcon === 'function' ? getCategoryIcon(category) : '📄',
        total: 0,
        read: 0,
        percentage: 0
      };
    }

    stats[category].total++;

    // Check if guide is marked as completed in progress
    if (progress[guide.id]?.completed) {
      stats[category].read++;
    }
  }

  // Calculate percentages
  for (const category in stats) {
    const stat = stats[category];
    stat.percentage = stat.total > 0 ? Math.round((stat.read / stat.total) * 100) : 0;
  }

  return stats;
}


/**
 * Get milestone message for a percentage
 */
function getMilestoneMessage(percentage) {
  for (const milestone of [100, 75, 50, 25]) {
    if (percentage >= milestone) {
      return milestoneMessages[milestone];
    }
  }
  return '';
}

/**
 * Create a progress item element
 */
function createProgressItem(category, stats) {
  const item = document.createElement('div');
  item.className = 'progress-item';
  item.setAttribute('data-category', category);

  const color = categoryColors[category] || '#d4a574';
  const milestone = getMilestoneMessage(stats.percentage);

  item.innerHTML = `
    <div class="progress-header">
      <span class="progress-category-name">
        <span class="progress-icon">${stats.icon}</span>
        ${stats.name}
      </span>
      <span class="progress-count">${stats.read}/${stats.total}</span>
    </div>
    <div class="progress-bar-container">
      <div class="progress-bar">
        <div class="progress-fill" style="width: ${stats.percentage}%; background-color: ${color};"></div>
      </div>
      <div class="progress-text">${stats.percentage}%</div>
    </div>
    ${milestone ? `<div class="progress-milestone">${milestone}</div>` : ''}
  `;

  return item;
}

/**
 * Create and render the progress visualization section
 */
async function renderProgressVisualization() {
  try {
    // Fetch guides and progress data
    const guides = await fetchGuidesData();
    const progress = storage.getProgress();

    // Calculate stats
    const stats = calculateCategoryStats(guides, progress);

    // Create or get the progress section
    let progressSection = document.getElementById('category-progress');
    if (!progressSection) {
      progressSection = document.createElement('section');
      progressSection.id = 'category-progress';
      progressSection.className = 'category-progress';

      // Insert before guides-container
      const guidesContainer = document.getElementById('guides-container');
      if (guidesContainer) {
        guidesContainer.parentNode.insertBefore(progressSection, guidesContainer);
      } else {
        document.body.appendChild(progressSection);
      }
    }

    // Clear existing content
    progressSection.innerHTML = '';

    // Add title
    const title = document.createElement('h2');
    title.className = 'progress-section-title';
    title.textContent = '📈 Your Progress';
    progressSection.appendChild(title);

    // Get ordered categories (imported from categories-generated.js)
    const orderedCategories = [
      ...categoryOrder.filter((cat) => cat in stats),
      ...Object.keys(stats)
        .filter((cat) => !categoryOrder.includes(cat) && cat !== 'uncategorized')
        .sort(),
    ];

    // Render progress items in order
    for (const category of orderedCategories) {
      const progressItem = createProgressItem(category, stats[category]);
      progressSection.appendChild(progressItem);
    }

  } catch (error) {
    console.error('Error rendering progress visualization:', error);
  }
}

/**
 * Update progress visualization (called when progress changes)
 */
export async function updateProgressVisualization() {
  await renderProgressVisualization();
}

/**
 * Initialize the progress visualization module
 */
export async function init() {
  try {
    // Render initial visualization
    await renderProgressVisualization();

    // Update when progress is updated (listen for storage changes)
    window.addEventListener('storage', async (event) => {
      if (event.key === 'compendium-progress') {
        await updateProgressVisualization();
      }
    });

    // Also listen for custom progress update events
    window.addEventListener('progressUpdated', async () => {
      await updateProgressVisualization();
    });

  } catch (error) {
    console.error('Failed to initialize progress visualization:', error);
  }
}

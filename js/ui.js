/**
 * UI Module - Theme toggle, filters, and back-to-top button
 */

import * as storage from './storage.js';
import { decorativeEmoji } from './utils.js';
import { expandSection, collapseSection, collapseSections } from './toc.js';
import { forceRenderSection } from './cards.js';

/**
 * Initialize theme toggle
 */
export function initializeThemeToggle() {
  const toggle = document.getElementById('theme-toggle');
  if (!toggle) return;

  const savedTheme = storage.getTheme();
  document.documentElement.setAttribute('data-theme', savedTheme);
  // Use decorative emoji since theme toggle is a purely visual control
  toggle.innerHTML = decorativeEmoji(savedTheme === 'dark' ? '☀️' : '🌙');
  toggle.setAttribute('aria-label', `Switch to ${savedTheme === 'dark' ? 'light' : 'dark'} theme`);

  toggle.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    storage.setTheme(next);
    storage.set('compendium-theme-manual', true); // Mark as manual override for auto dark mode
    toggle.innerHTML = decorativeEmoji(next === 'dark' ? '☀️' : '🌙');
    toggle.setAttribute('aria-label', `Switch to ${next === 'dark' ? 'light' : 'dark'} theme`);
  });
}

/**
 * Test whether a single card matches a single filter.
 * @param {HTMLElement} card - Card element
 * @param {string} filter - Filter name
 * @param {Object} progress - Progress data from storage
 * @returns {boolean}
 */
export function cardMatchesFilter(card, filter, progress) {
  if (filter === 'all') return true;

  const tags = card.getAttribute('data-tags') || '';
  const guideId = card.getAttribute('data-guide');
  const category = card.getAttribute('data-category') || '';
  const difficulty = card.getAttribute('data-difficulty') || '';
  const isRead = progress[guideId]?.completed;

  if (filter === 'critical') return tags.includes('critical');
  if (filter === 'essential') return tags.includes('essential');
  if (filter === 'rebuild') return tags.includes('rebuild');
  if (filter === 'new') return tags.includes('new');
  if (filter === 'unread') return !isRead;
  if (filter === 'completed') return isRead;
  if (filter === 'beginner') return difficulty === 'beginner';
  if (filter === 'intermediate') return difficulty === 'intermediate';
  if (filter === 'advanced') return difficulty === 'advanced';
  if (filter === 'utility') return category === 'utility';

  return true;
}

/**
 * Get the list of currently active filter names from the DOM.
 * Returns ['all'] when no specific filters are selected.
 * @returns {string[]}
 */
export function getActiveFilters() {
  const activeBtns = document.querySelectorAll('.filter-btn.active');
  const filters = Array.from(activeBtns).map(b => b.getAttribute('data-filter'));
  return filters.length === 0 || filters.includes('all') ? ['all'] : filters;
}

/**
 * Test whether a card matches ALL currently active filters (AND logic).
 * @param {HTMLElement} card - Card element
 * @param {string[]} filters - Array of active filter names
 * @param {Object} progress - Progress data from storage
 * @returns {boolean}
 */
function cardMatchesAllFilters(card, filters, progress) {
  if (filters.length === 0 || filters.includes('all')) return true;
  return filters.every(f => cardMatchesFilter(card, f, progress));
}

/**
 * Initialize filter buttons with multi-select support.
 * Clicking a filter toggles it on/off. Multiple filters combine with AND logic.
 * "All" clears other filters; clicking the last active filter reverts to "All".
 */
export function initializeFilters() {
  const filterBtns = document.querySelectorAll('.filter-btn');
  const allBtn = document.querySelector('.filter-btn[data-filter="all"]');

  // Restore persisted filter state (#8)
  const savedFilters = storage.get('compendium-active-filters', ['all']);
  if (savedFilters && !savedFilters.includes('all')) {
    filterBtns.forEach(b => b.classList.remove('active'));
    savedFilters.forEach(f => {
      const btn = document.querySelector(`.filter-btn[data-filter="${f}"]`);
      if (btn) btn.classList.add('active');
    });
    // Trigger a synthetic filter update after cards render
    window.addEventListener('cardsRendered', () => {
      const firstActiveBtn = document.querySelector('.filter-btn.active:not([data-filter="all"])');
      if (firstActiveBtn) firstActiveBtn.click();
    }, { once: true });
  }

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const filter = btn.getAttribute('data-filter');

      const difficultyFilters = ['beginner', 'intermediate', 'advanced'];

      if (filter === 'all') {
        // "All" clears everything
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      } else {
        // Toggle this filter on/off
        btn.classList.toggle('active');

        // Difficulty filters are mutually exclusive — deselect others in the group
        if (difficultyFilters.includes(filter) && btn.classList.contains('active')) {
          filterBtns.forEach(b => {
            if (b !== btn && difficultyFilters.includes(b.getAttribute('data-filter'))) {
              b.classList.remove('active');
            }
          });
        }

        // Remove "All" when a specific filter is active
        if (allBtn) allBtn.classList.remove('active');

        // If nothing is active, revert to "All"
        const anyActive = document.querySelector('.filter-btn.active');
        if (!anyActive && allBtn) {
          allBtn.classList.add('active');
        }
      }

      const activeFilters = getActiveFilters();
      const isAllFilter = activeFilters.includes('all');

      // Persist filter state (#8)
      storage.set('compendium-active-filters', activeFilters);

      // Toggle sticky filter bar: pin to top when filters are active
      const filterBar = document.querySelector('.filter-bar');
      if (filterBar) {
        if (isAllFilter) {
          filterBar.classList.remove('filter-sticky');
          filterBar.style.removeProperty('top');
        } else {
          // Measure top bar height so filter bar sits directly below it
          const topBar = document.querySelector('.top-bar');
          const topBarHeight = topBar ? topBar.getBoundingClientRect().height : 0;
          filterBar.style.top = topBarHeight + 'px';
          filterBar.classList.add('filter-sticky');
        }
      }

      // Re-query cards fresh from the DOM each time (handles dynamic re-renders)
      const cards = document.querySelectorAll('.card[data-guide]');
      const progress = storage.getProgress();

      let visibleCount = 0;

      cards.forEach(card => {
        const show = cardMatchesAllFilters(card, activeFilters, progress);

        // Use class-based approach for animated transitions
        if (show) {
          card.classList.remove('card-hidden');
          card.classList.add('card-visible');
          visibleCount++;
        } else {
          card.classList.remove('card-visible');
          card.classList.add('card-hidden');
        }
      });

      // Hide/show section headings based on whether they have visible cards
      updateSectionHeadingVisibility();

      // Expand/collapse sections based on filter results and scroll to first match
      expandFilteredSections(activeFilters);

      // Inject empty state message if no cards are visible
      showEmptyStateIfNeeded(activeFilters);

      // Update filter result count display
      const countDiv = document.getElementById('search-result-count');
      if (countDiv && !isAllFilter) {
        countDiv.textContent = `Showing ${visibleCount} guide${visibleCount !== 1 ? 's' : ''}`;
        countDiv.classList.add('visible');
      } else if (countDiv) {
        countDiv.textContent = '';
        countDiv.classList.remove('visible');
      }

      // Announce filter change to screen readers
      const guidesContainer = document.getElementById('guides-container');
      if (guidesContainer) {
        const filterLabel = isAllFilter ? 'all' : activeFilters.join(' + ');
        guidesContainer.setAttribute('aria-live', 'polite');
        guidesContainer.setAttribute('aria-label', `Showing ${visibleCount} guides filtered by ${filterLabel}`);
      }
    });

    // Add keyboard support for filter buttons
    btn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        btn.click();
      }
    });
  });
}

/**
 * Show empty state message if no cards match the current filter(s)
 * @param {string|string[]} filters - The active filter name(s)
 */
function showEmptyStateIfNeeded(filters) {
  const guidesContainer = document.getElementById('guides-container');
  if (!guidesContainer) return;

  // Remove any existing empty state
  const existingEmpty = guidesContainer.querySelector('.empty-state');
  if (existingEmpty) {
    existingEmpty.remove();
  }

  // Check if any cards are visible
  const visibleCards = guidesContainer.querySelectorAll('.card-visible');
  if (visibleCards.length > 0) return; // Cards are visible, don't show empty state

  // Normalize to array
  const filterArr = Array.isArray(filters) ? filters : [filters];

  // Empty state messages for single filters
  const emptyMessages = {
    'completed': '📖 No completed guides yet — start with the Reading Order!',
    'unread': '🎉 You\'ve read everything! Amazing!',
    'new': '✨ No new guides since your last visit.',
    'critical': '✅ No critical guides match the current view.',
    'essential': '🎯 No essential guides in this view.',
    'beginner': '🌱 No beginner guides in this view.',
    'intermediate': '⚡ No intermediate guides in this view.',
    'advanced': '🏆 No advanced guides in this view.',
    'default': 'No guides match this filter.'
  };

  let message;
  if (filterArr.length === 1) {
    message = emptyMessages[filterArr[0]] || emptyMessages['default'];
  } else {
    // Multi-filter: build a descriptive message
    const labels = filterArr.map(f => f.charAt(0).toUpperCase() + f.slice(1));
    message = `No guides match all selected filters (${labels.join(' + ')}).`;
  }

  // Create and insert empty state element
  const emptyState = document.createElement('div');
  emptyState.className = 'empty-state';
  emptyState.setAttribute('role', 'status');
  emptyState.setAttribute('aria-live', 'polite');
  emptyState.setAttribute('aria-atomic', 'true');
  emptyState.textContent = message;

  guidesContainer.appendChild(emptyState);
}

/**
 * Update section heading visibility based on whether they have any visible cards.
 * Works with both flat card layout (legacy) and card-section containers (virtual scroll).
 */
function updateSectionHeadingVisibility() {
  const container = document.getElementById('guides-container');
  if (!container) return;

  const children = Array.from(container.children);
  let currentHeading = null;
  let currentSection = null;

  for (const child of children) {
    if (child.classList.contains('section-heading') || child.tagName === 'H2') {
      // Before moving to next section, update the previous heading
      if (currentHeading && currentSection) {
        const visibleCards = currentSection.querySelectorAll('.card:not([style*="display: none"])');
        currentHeading.style.display = visibleCards.length > 0 ? '' : 'none';
        currentSection.style.display = visibleCards.length > 0 ? '' : 'none';
      }
      currentHeading = child;
      currentSection = null;
    } else if (child.classList.contains('card-section')) {
      currentSection = child;
    } else if (child.classList.contains('card')) {
      // Legacy flat layout fallback
      if (!currentSection) {
        if (child.style.display !== 'none' && currentHeading) {
          currentHeading.style.display = '';
        }
      }
    }
  }

  // Handle the last section
  if (currentHeading && currentSection) {
    const visibleCards = currentSection.querySelectorAll('.card:not([style*="display: none"])');
    currentHeading.style.display = visibleCards.length > 0 ? '' : 'none';
    currentSection.style.display = visibleCards.length > 0 ? '' : 'none';
  }

  // Also hide special sections when any filter is active
  const currentFilters = getActiveFilters();
  const isShowingAll = currentFilters.includes('all');

  const whatsNewSection = container.querySelector('.whats-new-section');
  if (whatsNewSection) {
    whatsNewSection.style.display = isShowingAll ? '' : 'none';
  }

  const recommendedSection = container.querySelector('.recommended-section');
  if (recommendedSection) {
    recommendedSection.style.display = isShowingAll ? '' : 'none';
  }
}

/**
 * Expand sections that have visible cards after a filter is applied,
 * collapse those that don't, and scroll to the first matching section.
 * When "All" filter is selected, collapse everything back to default.
 * @param {string|string[]} filters - The active filter name(s)
 */
function expandFilteredSections(filters) {
  const container = document.getElementById('guides-container');
  if (!container) return;

  // Normalize to array
  const filterArr = Array.isArray(filters) ? filters : [filters];
  const isAll = filterArr.includes('all');

  // "All" filter: collapse all sections back to default state
  if (isAll) {
    collapseSections();
    // Also clear active state on category grid buttons
    const gridBtns = document.querySelectorAll('.category-grid-btn.active');
    gridBtns.forEach(b => b.classList.remove('active'));
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }

  // For non-"all" filters: force-render all sections, then expand those with matches
  const sections = container.querySelectorAll('.card-section');
  let firstVisibleCategory = null;

  const progress = storage.getProgress();

  sections.forEach(section => {
    const category = section.getAttribute('data-section');
    if (!category) return;

    // Force-render lazy sections so their cards are in the DOM
    forceRenderSection(category);

    // Apply multi-filter AND logic to any newly-rendered cards in this section
    const sectionCards = section.querySelectorAll('.card[data-guide]');
    let hasVisible = false;
    sectionCards.forEach(card => {
      const show = filterArr.every(f => cardMatchesFilter(card, f, progress));

      if (show) {
        card.classList.remove('card-hidden');
        card.classList.add('card-visible');
        hasVisible = true;
      } else {
        card.classList.remove('card-visible');
        card.classList.add('card-hidden');
      }
    });

    if (hasVisible) {
      expandSection(category);
      if (!firstVisibleCategory) {
        firstVisibleCategory = category;
      }
    } else {
      collapseSection(category);
    }
  });

  // Scroll to the first section with matching cards
  if (firstVisibleCategory) {
    requestAnimationFrame(() => {
      const target = document.getElementById(`sec-${firstVisibleCategory}`);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  }
}

/**
 * Initialize back-to-top button
 */
export function initializeBackToTop() {
  const backBtn = document.getElementById('back-to-top');
  if (!backBtn) return;

  window.addEventListener('scroll', () => {
    backBtn.style.display = window.scrollY > window.innerHeight ? 'block' : 'none';
  });

  backBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

/**
 * Update progress display
 * Uses guidesData (full list) for totals so lazy-loaded sections are counted.
 * Also marks visible DOM cards as done.
 * @param {NodeList} cards - Card elements currently in the DOM
 * @param {Array} [guidesData] - Full guides array from guides.json
 */
export function updateProgressDisplay(cards, guidesData) {
  const progress = storage.getProgress();

  // Mark visible DOM cards as completed
  cards.forEach(card => {
    const guideId = card.getAttribute('data-guide');
    const check = card.querySelector('.read-check');
    if (progress[guideId] && progress[guideId].completed) {
      if (check) check.classList.add('done');
    }
  });

  // Count from full guidesData if available, otherwise fall back to DOM cards
  let totalCount, readCount;
  if (guidesData && guidesData.length > 0) {
    totalCount = guidesData.length;
    readCount = guidesData.filter(g => progress[g.id] && progress[g.id].completed).length;
  } else {
    totalCount = cards.length;
    readCount = 0;
    cards.forEach(card => {
      const guideId = card.getAttribute('data-guide');
      if (progress[guideId] && progress[guideId].completed) readCount++;
    });
  }

  const progressCount = document.getElementById('progress-count');
  const totalGuides = document.getElementById('total-guides');
  const progressBarFill = document.getElementById('progress-bar-fill');

  if (progressCount) progressCount.textContent = readCount;
  if (totalGuides) totalGuides.textContent = totalCount;

  // Update progress bar width
  if (progressBarFill && totalCount > 0) {
    const percentage = (readCount / totalCount) * 100;
    progressBarFill.style.width = `${percentage}%`;
    const container = progressBarFill.parentElement;
    if (container) container.setAttribute('aria-valuenow', Math.round(percentage));
  }
}

/**
 * Initialize auto dark mode — dark is now the permanent default.
 * Users can still toggle manually; this just ensures dark on first visit.
 */
export function initializeAutoDarkMode() {
  // Dark is the default. If no theme has been saved yet, ensure dark is applied.
  const currentTheme = storage.getTheme();
  if (!currentTheme) {
    document.documentElement.setAttribute('data-theme', 'dark');
    storage.setTheme('dark');
    const toggle = document.getElementById('theme-toggle');
    if (toggle) {
      toggle.innerHTML = decorativeEmoji('☀\uFE0F');
      toggle.setAttribute('aria-label', 'Switch to light theme');
    }
  }
}

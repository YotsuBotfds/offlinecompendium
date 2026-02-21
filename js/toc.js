/**
 * Table of Contents Module - Category Button Grid
 * Renders a grid of titled category buttons. Clicking a button
 * expands the corresponding card section and scrolls to it.
 * Card sections are collapsed by default.
 */

import { forceRenderSection, getGuidesData } from './cards.js';

let _categoryGrid = null;

/**
 * Initialize TOC - converts static grid to titled button grid
 * Must be called after cards.initializeCards()
 */
export function initializeTOC() {
  const tocNav = document.getElementById('toc');
  if (!tocNav) return;

  // Build button grid from TOC items
  const tocItems = tocNav.querySelectorAll('.toc-item[href^="#sec-"]');
  if (!tocItems.length) return;

  // Replace the static grid with a dynamic button grid
  const titleEl = tocNav.querySelector('.toc-title');
  const gridEl = tocNav.querySelector('.toc-grid');
  if (gridEl) gridEl.remove();
  if (titleEl) titleEl.remove();

  // Count guides per category for the badge
  const guides = getGuidesData();
  const counts = {};
  if (guides) {
    guides.forEach(g => {
      counts[g.category] = (counts[g.category] || 0) + 1;
    });
  }

  const grid = document.createElement('div');
  grid.className = 'category-grid';
  grid.setAttribute('role', 'navigation');
  grid.setAttribute('aria-label', 'Category navigation');

  tocItems.forEach(link => {
    const href = link.getAttribute('href');
    const category = href.substring(5); // "#sec-foo" → "foo"
    const icon = link.querySelector('.toc-icon')?.textContent || '';
    const name = link.querySelector('span:last-child')?.textContent || category;
    const count = counts[category] || 0;

    const btn = document.createElement('button');
    btn.className = 'category-grid-btn';
    btn.setAttribute('data-category', category);
    btn.setAttribute('aria-label', `${name} — ${count} guides`);
    btn.innerHTML =
      `<span class="cg-icon">${icon}</span>` +
      `<span class="cg-name">${name}</span>` +
      (count ? `<span class="cg-count">${count}</span>` : '');

    btn.addEventListener('click', () => {
      // Toggle: if already expanded, collapse it
      const section = document.querySelector(`[data-section="${category}"]`);
      if (section && section.classList.contains('section-expanded')) {
        collapseSection(category);
        btn.classList.remove('active');
        return;
      }
      expandSection(category);
      scrollToSection(category);

      // Update active state
      grid.querySelectorAll('.category-grid-btn.active').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });

    grid.appendChild(btn);
  });

  tocNav.appendChild(grid);
  _categoryGrid = grid;

  // Make card sections collapsed by default
  collapseSections();

  // Add click-to-expand on section headings
  setupSectionToggles();
}

/**
 * Collapse all card sections by default
 */
export function collapseSections() {
  const sections = document.querySelectorAll('.card-section');
  sections.forEach(section => {
    section.classList.add('section-collapsed');
  });
}

/**
 * Expand a specific section
 */
export function expandSection(category) {
  forceRenderSection(category);
  const section = document.querySelector(`[data-section="${category}"]`);
  if (section) {
    section.classList.remove('section-collapsed');
    section.classList.add('section-expanded');
  }
  // Update heading chevron
  const heading = document.getElementById(`sec-${category}`);
  if (heading) {
    heading.setAttribute('aria-expanded', 'true');
    const chevron = heading.querySelector('.section-chevron');
    if (chevron) chevron.textContent = ' ▾';
  }
}

/**
 * Collapse a specific section
 */
export function collapseSection(category) {
  const section = document.querySelector(`[data-section="${category}"]`);
  if (section) {
    section.classList.add('section-collapsed');
    section.classList.remove('section-expanded');
  }
  const heading = document.getElementById(`sec-${category}`);
  if (heading) {
    heading.setAttribute('aria-expanded', 'false');
    const chevron = heading.querySelector('.section-chevron');
    if (chevron) chevron.textContent = ' ▸';
  }
}

/**
 * Scroll to a section heading
 */
async function scrollToSection(category) {
  await new Promise(r => requestAnimationFrame(r));
  const target = document.getElementById(`sec-${category}`);
  if (target) {
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    history.replaceState(null, '', `#sec-${category}`);
  }
}

/**
 * Add click-to-toggle on section headings
 */
function setupSectionToggles() {
  const headings = document.querySelectorAll('.section-heading');
  headings.forEach(heading => {
    heading.style.cursor = 'pointer';
    heading.setAttribute('role', 'button');
    heading.setAttribute('aria-expanded', 'false');
    heading.setAttribute('aria-controls', heading.id.replace('sec-', 'section-') + '-cards');

    // Add toggle chevron
    const chevron = document.createElement('span');
    chevron.className = 'section-chevron';
    chevron.textContent = ' ▸';
    heading.appendChild(chevron);

    heading.addEventListener('click', () => {
      const id = heading.id; // e.g. "sec-survival"
      const category = id.substring(4);
      const section = document.querySelector(`[data-section="${category}"]`);
      if (section && !section.id) section.id = `section-${category}-cards`;
      if (!section) return;

      const isCollapsed = section.classList.contains('section-collapsed');
      if (isCollapsed) {
        forceRenderSection(category);
        section.classList.remove('section-collapsed');
        section.classList.add('section-expanded');
        heading.setAttribute('aria-expanded', 'true');
        chevron.textContent = ' ▾';
        // Sync grid button active state
        if (_categoryGrid) {
          const btn = _categoryGrid.querySelector(`[data-category="${category}"]`);
          if (btn) btn.classList.add('active');
        }
      } else {
        section.classList.add('section-collapsed');
        section.classList.remove('section-expanded');
        heading.setAttribute('aria-expanded', 'false');
        chevron.textContent = ' ▸';
        if (_categoryGrid) {
          const btn = _categoryGrid.querySelector(`[data-category="${category}"]`);
          if (btn) btn.classList.remove('active');
        }
      }
    });
  });
}

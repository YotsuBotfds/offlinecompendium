/**
 * Recommendation Engine
 * Suggests next guides based on prerequisites and reading patterns
 */

import * as storage from './storage.js';
import { escapeHtml } from './utils.js';

/**
 * Get recommended guides for the user
 * @param {Array} allGuides - All available guides
 * @param {number} limit - Maximum recommendations to return
 * @returns {Array} Recommended guide objects with score and reason
 */
export function getRecommendedGuides(allGuides, limit = 5) {
  const completedGuides = storage.getCompletedGuides();
  const recommendations = [];

  // Strategy 1: Guides whose prerequisites are all met
  for (const guide of allGuides) {
    if (completedGuides.has(guide.id)) continue;

    const prerequisites = guide.prerequisites || [];
    const allPrereqsMet = prerequisites.length > 0 &&
      prerequisites.every(prereqId => completedGuides.has(prereqId));

    if (allPrereqsMet) {
      recommendations.push({
        guide,
        score: 100 + prerequisites.length,
        reason: 'Prerequisites complete'
      });
    }
  }

  // Strategy 2: Popular essential/critical guides not yet read
  for (const guide of allGuides) {
    if (completedGuides.has(guide.id)) continue;

    const tags = guide.tags || [];
    if (tags.includes('essential') || tags.includes('critical')) {
      recommendations.push({
        guide,
        score: tags.includes('critical') ? 90 : 80,
        reason: tags.includes('critical') ? 'Critical skill' : 'Essential knowledge'
      });
    }
  }

  // Strategy 3: Beginner guides if user is new (< 5 guides read)
  if (completedGuides.size < 5) {
    for (const guide of allGuides) {
      if (completedGuides.has(guide.id)) continue;
      if (guide.difficulty === 'beginner') {
        recommendations.push({
          guide,
          score: 70,
          reason: 'Great for getting started'
        });
      }
    }
  }

  // Strategy 4: Same category as recently read guides
  if (completedGuides.size > 0) {
    const progress = storage.getProgress();
    const recentGuides = Object.entries(progress)
      .filter(([, data]) => data.completed && data.lastUpdated)
      .sort((a, b) => (b[1].lastUpdated || '').localeCompare(a[1].lastUpdated || ''))
      .slice(0, 3)
      .map(([id]) => allGuides.find(g => g.id === id))
      .filter(Boolean);

    const recentCategories = new Set(recentGuides.map(g => g.category));

    for (const guide of allGuides) {
      if (completedGuides.has(guide.id)) continue;
      if (recentCategories.has(guide.category)) {
        recommendations.push({
          guide,
          score: 60,
          reason: `Continue ${guide.category}`
        });
      }
    }
  }

  // Sort by score and remove duplicates
  const uniqueGuides = new Map();
  recommendations
    .sort((a, b) => b.score - a.score)
    .forEach(rec => {
      if (!uniqueGuides.has(rec.guide.id)) {
        uniqueGuides.set(rec.guide.id, rec);
      }
    });

  return Array.from(uniqueGuides.values()).slice(0, limit);
}

/**
 * Create HTML section for recommended guides
 * @param {Array} recommendations - Recommended guides with metadata
 * @returns {HTMLElement|null} Section element or null if no recommendations
 */
export function createRecommendedSection(recommendations) {
  if (!recommendations || recommendations.length === 0) return null;

  const section = document.createElement('div');
  section.className = 'recommended-section';
  section.innerHTML = `
    <h2 class="section-heading">
      <span class="category-title">\u{1F4A1} Recommended Next</span>
    </h2>
    <div class="recommended-guides">
      ${recommendations.map(rec => `
        <a href="${rec.guide.url || `guides/${rec.guide.slug || rec.guide.id}.html`}" class="recommended-card">
          <span class="recommended-icon">${rec.guide.icon || '\u{1F4D6}'}</span>
          <div class="recommended-content">
            <h3>${escapeHtml(rec.guide.title)}</h3>
            <p class="recommended-reason">${escapeHtml(rec.reason)}</p>
            ${rec.guide.readingTime ? `<span class="recommended-reading-time">~${rec.guide.readingTime} min read</span>` : ''}
          </div>
        </a>
      `).join('')}
    </div>
  `;

  return section;
}

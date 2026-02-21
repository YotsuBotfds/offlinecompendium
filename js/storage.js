/**
 * Storage Module - localStorage abstraction layer
 * Provides a clean interface for all localStorage operations
 */

import { sanitize } from './utils.js';

// Re-export sanitize for backward compatibility
export { sanitize };

/**
 * Get a value from localStorage
 * @param {string} key - The storage key
 * @param {*} defaultValue - Default value if key doesn't exist
 * @returns {*} The stored value or default
 */
export function get(key, defaultValue = null) {
  try {
    const value = localStorage.getItem(key);
    if (value === null) return defaultValue;
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  } catch {
    // localStorage unavailable (private browsing, storage full, etc.)
    return defaultValue;
  }
}

/**
 * Set a value in localStorage with user notification on quota exceeded
 * @param {string} key - The storage key
 * @param {*} value - The value to store
 * @returns {boolean} True if save was successful, false otherwise
 */
export function set(key, value) {
  try {
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
    localStorage.setItem(key, stringValue);
    return true;
  } catch (error) {
    const errorMessage = error?.name || '';
    const isQuotaExceeded = errorMessage === 'QuotaExceededError' ||
                           errorMessage === 'NS_ERROR_DOM_QUOTA_REACHED';

    if (isQuotaExceeded) {
      console.warn(`localStorage quota exceeded when saving key: ${key}`);
      notifyStorageQuotaExceeded(key);
    } else {
      console.warn(`Failed to save to localStorage: ${key}`, error);
    }
    return false;
  }
}

/**
 * Show user notification for localStorage quota exceeded
 * @param {string} failedKey - The key that failed to save
 */
function notifyStorageQuotaExceeded(failedKey) {
  // Dispatch custom event so notifications module can show toast
  window.dispatchEvent(new CustomEvent('storage-quota-exceeded', {
    detail: { failedKey }
  }));

  // Fallback: log a clear warning to console
  console.error(
    'Storage limit reached. Please clear browser cache or delete unused data to continue saving progress.'
  );
}

/**
 * Remove a value from localStorage
 * @param {string} key - The storage key to remove
 */
export function remove(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    // localStorage unavailable
  }
}

/**
 * Get all keys starting with a prefix
 * @param {string} prefix - The prefix to match
 * @returns {Array<string>} Array of matching keys
 */
export function getAllWithPrefix(prefix) {
  try {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith(prefix)) {
        keys.push(key);
      }
    }
    return keys;
  } catch {
    return [];
  }
}

/**
 * Clear all keys with a specific prefix
 * @param {string} prefix - The prefix to clear
 */
export function clearPrefix(prefix) {
  const keys = getAllWithPrefix(prefix);
  keys.forEach(key => remove(key));
}

/**
 * Get theme preference
 * @returns {string} 'dark' or 'light'
 */
export function getTheme() {
  return get('compendium-theme', 'dark');
}

/**
 * Set theme preference
 * @param {string} theme - 'dark' or 'light'
 */
export function setTheme(theme) {
  set('compendium-theme', theme);
}

/**
 * Get reading progress
 * @returns {Object} Progress object keyed by guide ID
 */
export function getProgress() {
  return get('compendium-progress', {});
}

/**
 * Set reading progress
 * @param {Object} progress - Progress object
 */
export function setProgress(progress) {
  set('compendium-progress', progress);
}

/**
 * Get achievements
 * @returns {Object} Achievements object keyed by achievement ID
 */
export function getAchievements() {
  return get('compendium-achievements', {});
}

/**
 * Set achievements
 * @param {Object} achievements - Achievements object
 */
export function setAchievements(achievements) {
  set('compendium-achievements', achievements);
}

/**
 * Get notes for a specific guide
 * @param {string} guideId - The guide ID
 * @returns {string|null} The notes content or null
 */
export function getNotes(guideId) {
  return get(`compendium-notes-${guideId}`, null);
}

/**
 * Set notes for a specific guide
 * @param {string} guideId - The guide ID
 * @param {string} notes - The notes content
 */
export function setNotes(guideId, notes) {
  // Sanitize notes to prevent XSS attacks
  const sanitizedNotes = sanitize(notes);
  set(`compendium-notes-${guideId}`, sanitizedNotes);
}

/**
 * Get set of completed guide IDs
 * @returns {Set<string>} Set of completed guide IDs
 */
export function getCompletedGuides() {
  const progress = getProgress();
  const completed = new Set();
  for (const [guideId, data] of Object.entries(progress)) {
    if (data && data.completed) {
      completed.add(guideId);
    }
  }
  return completed;
}

/**
 * Mark a guide as completed in progress
 * @param {string} guideId - The guide ID to mark as completed
 */
export function addCompletedGuide(guideId) {
  const progress = getProgress();
  if (!progress[guideId]) {
    progress[guideId] = {};
  }
  progress[guideId].completed = true;
  progress[guideId].lastUpdated = new Date().toISOString();
  setProgress(progress);
}

/**
 * Get all notes
 * @returns {Object} Object with guide IDs as keys and notes as values
 */
export function getAllNotes() {
  const notes = {};
  const keys = getAllWithPrefix('compendium-notes-');
  keys.forEach(key => {
    const guideId = key.replace('compendium-notes-', '');
    notes[guideId] = get(key);
  });
  return notes;
}

/**
 * Get reading activity by date
 * @returns {Object} Map of dates to guide IDs read that day
 */
export function getReadingActivity() {
  const progress = getProgress();
  const activity = {};

  for (const [guideId, data] of Object.entries(progress)) {
    if (data.completed && data.lastUpdated) {
      const date = data.lastUpdated.split('T')[0]; // YYYY-MM-DD
      if (!activity[date]) activity[date] = [];
      activity[date].push(guideId);
    }
  }

  return activity;
}

/**
 * Calculate current reading streak
 * @returns {number} Days of consecutive reading
 */
export function getReadingStreak() {
  const activity = getReadingActivity();
  const dates = Object.keys(activity).sort().reverse();

  if (dates.length === 0) return 0;

  let streak = 0;
  const currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);

  for (let i = 0; i < 365; i++) {
    const dateStr = currentDate.toISOString().split('T')[0];

    if (activity[dateStr]) {
      streak++;
    } else if (streak > 0) {
      break;
    }
    // If first day (today) has no activity, that's OK - check yesterday
    // But if we've started counting and miss a day, break
    if (i === 0 && !activity[dateStr]) {
      // Allow checking yesterday too
    }

    currentDate.setDate(currentDate.getDate() - 1);
  }

  return streak;
}

/**
 * Calculate total reading time invested (sum of readingTime for completed guides)
 * @param {Array} allGuides - All guide objects with readingTime field
 * @returns {Object} { invested: minutes, remaining: minutes }
 */
export function getReadingTimeStats(allGuides) {
  const completedGuides = getCompletedGuides();
  let invested = 0;
  let remaining = 0;

  for (const guide of allGuides) {
    const time = guide.readingTime || guide.read_time || 0;
    if (completedGuides.has(guide.id)) {
      invested += time;
    } else {
      remaining += time;
    }
  }

  return { invested, remaining };
}

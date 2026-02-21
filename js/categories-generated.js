/**
 * GENERATED FILE: Do not edit directly.
 * Generated from data/categories.json by scripts/generate-categories.js
 * Run: npm run generate-categories (or make generate-categories)
 */

/**
 * Category display information (id => { name, icon })
 */
export const categoryMap = {
  "survival": {
    "name": "Immediate Survival",
    "icon": "🔥"
  },
  "medical": {
    "name": "Medical & Health",
    "icon": "🏥"
  },
  "agriculture": {
    "name": "Food & Agriculture",
    "icon": "🌾"
  },
  "building": {
    "name": "Building & Engineering",
    "icon": "🔨"
  },
  "crafts": {
    "name": "Crafts & Trade Skills",
    "icon": "⚒️"
  },
  "metalworking": {
    "name": "Metalworking",
    "icon": "⚙️"
  },
  "communications": {
    "name": "Communications",
    "icon": "📡"
  },
  "defense": {
    "name": "Security & Defense",
    "icon": "🛡️"
  },
  "sciences": {
    "name": "Foundational Sciences",
    "icon": "🔬"
  },
  "chemistry": {
    "name": "Industrial Chemistry",
    "icon": "🏭"
  },
  "power-generation": {
    "name": "Power Generation",
    "icon": "⚡"
  },
  "transportation": {
    "name": "Transportation",
    "icon": "🚗"
  },
  "society": {
    "name": "Society & Culture",
    "icon": "🏛️"
  },
  "resource-management": {
    "name": "Resource Management",
    "icon": "📦"
  },
  "salvage": {
    "name": "Scavenging & Salvage",
    "icon": "♻️"
  },
  "utility": {
    "name": "Utilities",
    "icon": "⚙️"
  },
  "primitive-technology": {
    "name": "Primitive Technology",
    "icon": "🪨"
  },
  "culture-knowledge": {
    "name": "Culture & Knowledge",
    "icon": "📖"
  },
  "biology": {
    "name": "Biology",
    "icon": "🧬"
  }
};

/**
 * Category color mapping (id => hex color)
 */
export const categoryColors = {
  "survival": "#ff6b6b",
  "medical": "#ff9999",
  "agriculture": "#53d8a8",
  "building": "#8b7355",
  "crafts": "#b19cd9",
  "metalworking": "#c084fc",
  "communications": "#4a9eff",
  "defense": "#ff8c42",
  "sciences": "#7ec8e3",
  "chemistry": "#ffd700",
  "power-generation": "#fbbf24",
  "transportation": "#60a5fa",
  "society": "#a78bfa",
  "resource-management": "#f59e0b",
  "salvage": "#9ca3af",
  "utility": "#cbd5e1",
  "primitive-technology": "#92400e",
  "culture-knowledge": "#d4a574",
  "biology": "#86efac"
};

/**
 * Ordered category IDs
 */
export const categoryOrder = [
  "medical",
  "agriculture",
  "building",
  "crafts",
  "metalworking",
  "communications",
  "defense",
  "sciences",
  "chemistry",
  "power-generation",
  "transportation",
  "society",
  "resource-management",
  "salvage",
  "utility",
  "primitive-technology",
  "culture-knowledge",
  "biology",
  "survival"
];

/**
 * Default category fallback
 */
export const defaultCategory = 'utility';

/**
 * Get category display name
 */
export function getCategoryName(categoryId) {
  return categoryMap[categoryId]?.name || categoryId;
}

/**
 * Get category icon
 */
export function getCategoryIcon(categoryId) {
  return categoryMap[categoryId]?.icon || '📄';
}

/**
 * Get category color
 */
export function getCategoryColor(categoryId) {
  return categoryColors[categoryId] || '#d4a574';
}

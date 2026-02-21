/**
 * Environment Configuration Module
 * Detects and manages environment-specific settings for the Survival App
 * Supports: development (localhost), staging, production
 */

/**
 * Detect current environment based on hostname and server headers
 * @returns {string} Environment: 'dev', 'staging', or 'production'
 */
function detectEnvironment() {
  // Check hostname patterns
  const hostname = window.location.hostname;

  // Running as bundled Android APK (WebViewAssetLoader serves via this virtual domain)
  if (hostname === 'appassets.androidplatform.net') {
    return 'app';
  }

  // Local development environments
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.') || hostname.startsWith('10.')) {
    return 'dev';
  }

  // Staging environment
  if (hostname.includes('staging') || hostname.includes('stage') || hostname.includes('test')) {
    return 'staging';
  }

  // Default to production for everything else
  return 'production';
}

/**
 * Configuration objects for each environment
 */
const configurations = {
  dev: {
    debug: true,
    serviceWorker: false,
    logLevel: 'debug',
    cacheBust: true,
    environment: 'dev'
  },
  staging: {
    debug: true,
    serviceWorker: true,
    logLevel: 'warn',
    cacheBust: true,
    environment: 'staging'
  },
  production: {
    debug: false,
    serviceWorker: true,
    logLevel: 'error',
    cacheBust: false,
    environment: 'production'
  },
  app: {
    // Bundled Android APK — service worker not needed, all content is local
    debug: false,
    serviceWorker: false,
    logLevel: 'error',
    cacheBust: false,
    environment: 'app'
  }
};

// Current environment
const currentEnvironment = detectEnvironment();
const currentConfig = { ...configurations[currentEnvironment] };

/**
 * Get the complete configuration object for the current environment
 * @returns {Object} Configuration object
 */
export function getConfig() {
  return { ...currentConfig };
}

/**
 * Check if running in development environment
 * @returns {boolean}
 */
export function isDev() {
  return currentEnvironment === 'dev';
}

/**
 * Check if running in production environment
 * @returns {boolean}
 */
export function isProd() {
  return currentEnvironment === 'production';
}

/**
 * Check if running in staging environment
 * @returns {boolean}
 */
export function isStaging() {
  return currentEnvironment === 'staging';
}

/**
 * Check if debug mode is enabled
 * @returns {boolean}
 */
export function isDebug() {
  return currentConfig.debug;
}

/**
 * Get the current environment name
 * @returns {string}
 */
export function getEnvironment() {
  return currentEnvironment;
}

/**
 * Get the log level for the current environment
 * @returns {string} Log level: 'debug', 'info', 'warn', 'error'
 */
export function getLogLevel() {
  return currentConfig.logLevel;
}

/**
 * Check if service worker should be active
 * @returns {boolean}
 */
export function shouldUseServiceWorker() {
  return currentConfig.serviceWorker;
}

/**
 * Check if cache busting should be applied
 * @returns {boolean}
 */
export function shouldBustCache() {
  return currentConfig.cacheBust;
}

/**
 * Create a cache-busting query string if needed
 * @param {string} url - The URL to add cache busting to
 * @returns {string} URL with cache buster if applicable
 */
export function withCacheBuster(url) {
  if (!shouldBustCache()) {
    return url;
  }

  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}_t=${Date.now()}`;
}

/**
 * Conditional logging based on log level and environment
 * @param {string} level - Log level: 'debug', 'info', 'warn', 'error'
 * @param {string} message - Message to log
 * @param {*} data - Optional data to log
 */
export function log(level = 'info', message, data) {
  if (!isDev() && !isDebug()) {
    return;
  }

  const logLevels = { debug: 0, info: 1, warn: 2, error: 3 };
  const currentLevel = logLevels[getLogLevel()] || 1;
  const requestedLevel = logLevels[level] || 1;

  if (requestedLevel < currentLevel) {
    return;
  }

  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`;

  if (data !== undefined) {
    console[level === 'debug' ? 'log' : level](prefix, message, data);
  } else {
    console[level === 'debug' ? 'log' : level](prefix, message);
  }
}

/**
 * Verbose logging (only in debug mode)
 * @param {string} message - Message to log
 * @param {*} data - Optional data to log
 */
export function debug(message, data) {
  if (!isDebug()) {
    return;
  }
  log('debug', message, data);
}

/**
 * Initialize configuration (sets environment from server header)
 * Called by app.js during initialization
 */
export function initialize() {
  // Log initialization info
  debug('Config initialization', {
    environment: currentEnvironment,
    config: currentConfig
  });

  // Add environment class to document for CSS selectors
  document.documentElement.classList.add(`env-${currentEnvironment}`);

  // Store in window for debugging
  if (isDebug()) {
    if (!window.App) window.App = {};
    window.App.__CONFIG__ = getConfig();
    window.App.__DEBUG__ = {
      isDev: isDev(),
      isProd: isProd(),
      isStaging: isStaging(),
      isDebug: isDebug(),
      environment: getEnvironment()
    };
    // Keep old names for backward compatibility
    window.__APP_CONFIG__ = window.App.__CONFIG__;
    window.__APP_DEBUG__ = window.App.__DEBUG__;
    debug('App Config available at window.App.__CONFIG__ (or window.__APP_CONFIG__ for legacy)');
    debug('App Debug Info available at window.App.__DEBUG__ (or window.__APP_DEBUG__ for legacy)');
  }
}

export default {
  getConfig,
  isDev,
  isProd,
  isStaging,
  isDebug,
  getEnvironment,
  getLogLevel,
  shouldUseServiceWorker,
  shouldBustCache,
  withCacheBuster,
  log,
  debug,
  initialize
};

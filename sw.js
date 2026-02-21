const CACHE_VERSION = 'v1771631609';
const CORE_CACHE = `core-${CACHE_VERSION}`;
const GUIDES_CACHE = `guides-${CACHE_VERSION}`;
const DATA_CACHE = `data-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `dynamic-${CACHE_VERSION}`;

// Core shell files to cache on install
const CORE_CACHE_URLS = [
  './index.html',
  './css/main.css',
  './manifest.json',
  './data/guides.json',
  './assets/icon-192.png',
  './assets/icon-512.png',
  // All ES module JS files (each import is a separate HTTP request)
  './js/app.js',
  './js/analytics.js',
  './js/cards.js',
  './js/config.js',
  './js/error-tracking.js',
  './js/error-viewer.js',
  './js/import-export.js',
  './js/keyboard.js',
  './js/notifications.js',
  './js/offline-indicator.js',
  './js/offline-manager.js',
  './js/offline-manager-ui.js',
  './js/progress-viz.js',
  './js/pwa.js',
  './js/random-guide.js',
  './js/recently-viewed.js',
  './js/search.js',
  './js/storage.js',
  './js/text-sizing.js',
  './js/tools-nav.js',
  './js/ui.js',
  './js/utils.js',
  './js/achievements.js',
  './js/collections.js',
  './js/collections-ui.js',
  './js/guide-helper.js',
  './js/init.js',
  './js/learning-paths.js',
  './js/practice-mode.js',
  './js/progression.js',
  './js/share.js',
  './js/toc.js',
  './js/onboarding.js',
  './js/rate-prompt.js',
  './privacy.html',
  './terms.html',
  './disclaimer.html',
  // Guide page shared assets (needed for offline guide viewing)
  './guides/css/shared.css',
  './guides/js/guide-common.js',
  './guides/js/shared.js',
  './shared/theme-sync.js',
];

// Per-cache size limits (#16)
const MAX_CORE_ENTRIES = 100;
const MAX_DATA_ENTRIES = 50;
const MAX_GUIDES_ENTRIES = 550;
const MAX_DYNAMIC_ENTRIES = 200;

// Cache expiration time in milliseconds (30 days)
const CACHE_EXPIRY_TIME = 30 * 24 * 60 * 60 * 1000;

/**
 * Log cache activity for debugging
 */
function logCacheEvent(type, url, hitOrMiss) {
  if (self.clients) {
    self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({
          type: 'CACHE_EVENT',
          cacheType: type,
          url: url,
          hitOrMiss: hitOrMiss,
          timestamp: new Date().toISOString()
        });
      });
    }).catch(() => {
      // Silently ignore client messaging errors
    });
  }
}

/**
 * Check storage quota and estimate available space
 * Returns { available: bytes, estimated: bytes, percentUsed: 0-100 }
 */
async function checkStorageQuota() {
  if (!navigator.storage || !navigator.storage.estimate) {
    // Fallback: assume ~50MB available if API not supported
    return { available: 50 * 1024 * 1024, estimated: 50 * 1024 * 1024, percentUsed: 0 };
  }

  try {
    const estimate = await navigator.storage.estimate();
    return {
      available: estimate.quota - estimate.usage,
      estimated: estimate.quota,
      percentUsed: Math.round((estimate.usage / estimate.quota) * 100)
    };
  } catch (error) {
    console.error('[SW] Error checking storage quota:', error);
    // Fallback on error
    return { available: 50 * 1024 * 1024, estimated: 50 * 1024 * 1024, percentUsed: 0 };
  }
}

/**
 * Check if URL should be skipped from caching
 */
function shouldSkipCache(url) {
  // Skip extension URLs, chrome URLs, etc.
  if (url.startsWith('chrome-extension://') ||
      url.startsWith('chrome://') ||
      url.startsWith('about:')) {
    return true;
  }
  return false;
}

/**
 * Get the cache type for a given URL
 */
function getCacheTypeForUrl(url) {
  if (url.includes('/guides/') && url.endsWith('.html')) {
    return GUIDES_CACHE;
  }
  if (url.includes('/data/') || url.includes('guides.json') || url.includes('skills_merged.json')) {
    return DATA_CACHE;
  }
  return DYNAMIC_CACHE;
}

/**
 * Trim cache to max entries
 */
async function trimCache(cacheName, maxEntries) {
  try {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();

    if (keys.length > maxEntries) {
      const keysToDelete = keys.slice(0, keys.length - maxEntries);
      for (const key of keysToDelete) {
        await cache.delete(key);
      }
    }
  } catch (error) {
    console.error(`Error trimming cache ${cacheName}:`, error);
  }
}

/**
 * Clean expired caches
 */
async function cleanExpiredCaches() {
  try {
    const cacheNames = await caches.keys();
    const now = Date.now();

    for (const cacheName of cacheNames) {
      // Check if cache has metadata about creation time
      const cache = await caches.open(cacheName);
      const keys = await cache.keys();

      for (const request of keys) {
        const response = await cache.match(request);
        if (response && response.headers) {
          const dateHeader = response.headers.get('date');
          if (dateHeader) {
            const cacheTime = new Date(dateHeader).getTime();
            if (now - cacheTime > CACHE_EXPIRY_TIME) {
              await cache.delete(request);
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('Error cleaning expired caches:', error);
  }
}

/**
 * Fetch with network-first strategy
 */
async function networkFirst(request, cacheName) {
  try {
    const networkResponse = await fetch(request);

    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
      logCacheEvent(cacheName, request.url, 'NETWORK_HIT');
    }

    return networkResponse;
  } catch (error) {
    logCacheEvent(cacheName, request.url, 'NETWORK_FAIL');
    const cachedResponse = await caches.match(request);

    if (cachedResponse) {
      logCacheEvent(cacheName, request.url, 'CACHE_HIT');
      return cachedResponse;
    }

    // Return offline page only for navigation requests
    if (request.mode === 'navigate') {
      return caches.match('./index.html');
    }

    throw error;
  }
}

/**
 * Fetch with cache-first strategy
 */
async function cacheFirst(request, cacheName) {
  try {
    const cachedResponse = await caches.match(request);

    if (cachedResponse) {
      logCacheEvent(cacheName, request.url, 'CACHE_HIT');
      return cachedResponse;
    }

    logCacheEvent(cacheName, request.url, 'CACHE_MISS');
    const networkResponse = await fetch(request);

    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
      const maxEntries = cacheName === GUIDES_CACHE ? MAX_GUIDES_ENTRIES
        : cacheName === DATA_CACHE ? MAX_DATA_ENTRIES
        : cacheName === CORE_CACHE ? MAX_CORE_ENTRIES
        : MAX_DYNAMIC_ENTRIES;
      await trimCache(cacheName, maxEntries);
    }

    return networkResponse;
  } catch (error) {
    console.error(`Fetch failed for ${request.url}:`, error);

    // Return offline page only for navigation requests
    if (request.mode === 'navigate') {
      return caches.match('./index.html');
    }

    throw error;
  }
}

/**
 * Fetch with stale-while-revalidate strategy
 */
async function staleWhileRevalidate(request, cacheName) {
  try {
    const cachedResponse = await caches.match(request);

    const fetchPromise = fetch(request).then(async networkResponse => {
      if (networkResponse && networkResponse.status === 200) {
        const cache = await caches.open(cacheName);
        await cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    }).catch(() => {
      logCacheEvent(cacheName, request.url, 'NETWORK_FAIL');
      if (cachedResponse) {
        return cachedResponse;
      }
      throw new Error('No network and no cache available');
    });

    if (cachedResponse) {
      logCacheEvent(cacheName, request.url, 'CACHE_HIT');
      return cachedResponse;
    }

    logCacheEvent(cacheName, request.url, 'CACHE_MISS');
    return fetchPromise;
  } catch (error) {
    console.error(`Fetch failed for ${request.url}:`, error);

    // Return offline page only for navigation requests
    if (request.mode === 'navigate') {
      return caches.match('./index.html');
    }

    throw error;
  }
}

/**
 * Handle range requests for large files (#15)
 * Properly slices the response body and returns 206 Partial Content.
 */
async function handleRangeRequest(request, response) {
  const rangeHeader = request.headers.get('range');

  if (!rangeHeader || !response.ok) {
    return response;
  }

  try {
    const matches = rangeHeader.match(/bytes=(\d+)-(\d*)/);
    if (!matches) {
      return response;
    }

    const body = await response.arrayBuffer();
    const totalSize = body.byteLength;
    const start = parseInt(matches[1], 10);
    const end = matches[2] ? parseInt(matches[2], 10) : totalSize - 1;

    if (start >= totalSize || start > end) {
      return new Response(null, {
        status: 416,
        statusText: 'Range Not Satisfiable',
        headers: { 'Content-Range': `bytes */${totalSize}` }
      });
    }

    const slicedBody = body.slice(start, end + 1);

    return new Response(slicedBody, {
      status: 206,
      statusText: 'Partial Content',
      headers: {
        'Content-Range': `bytes ${start}-${end}/${totalSize}`,
        'Content-Length': slicedBody.byteLength,
        'Content-Type': response.headers.get('content-type') || 'application/octet-stream'
      }
    });
  } catch (error) {
    console.error('Error handling range request:', error);
    return response;
  }
}

/**
 * Install event: cache core shell with storage quota awareness
 */
self.addEventListener('install', (event) => {
  // Service worker install started

  event.waitUntil(
    (async () => {
      try {
        // Check available storage before precaching
        const quota = await checkStorageQuota();
        const coreCacheSize = CORE_CACHE_URLS.length * 15000; // Rough estimate: ~15KB per file

        if (quota.percentUsed > 95) {
          console.warn('[SW] Storage nearly full:', { percentUsed: quota.percentUsed });
          // Still attempt to cache core files, but warn the user via message
          self.clients.matchAll().then(clients => {
            clients.forEach(client => {
              client.postMessage({
                type: 'STORAGE_WARNING',
                message: 'Storage is nearly full. Some offline features may be limited.',
                percentUsed: quota.percentUsed
              });
            });
          });
        }

        if (quota.available < coreCacheSize) {
          console.warn('[SW] Insufficient storage for core cache', {
            available: quota.available,
            needed: coreCacheSize
          });
          // Notify client of insufficient storage
          self.clients.matchAll().then(clients => {
            clients.forEach(client => {
              client.postMessage({
                type: 'STORAGE_ERROR',
                message: 'Insufficient storage available for offline features.',
                available: quota.available,
                needed: coreCacheSize
              });
            });
          });
        }

        // Cache core files
        const cache = await caches.open(CORE_CACHE);
        await cache.addAll(CORE_CACHE_URLS);
        // Core cache populated

        // Skip waiting to activate immediately
        await self.skipWaiting();
      } catch (error) {
        console.error('[SW] Installation error:', error);
        throw error;
      }
    })()
  );
});

/**
 * Activate event: clean up old caches
 */
self.addEventListener('activate', (event) => {
  // Service worker activation started

  event.waitUntil(
    (async () => {
      try {
        // Delete old caches
        const cacheNames = await caches.keys();
        const cachesToDelete = cacheNames.filter(name => {
          return !name.includes(CACHE_VERSION);
        });

        await Promise.all(
          cachesToDelete.map(cacheName => {
            // Deleting old cache
            return caches.delete(cacheName);
          })
        );

        // Clean expired entries
        await cleanExpiredCaches();

        // Claim clients
        await self.clients.claim();
        // Activation complete
      } catch (error) {
        console.error('[SW] Activation error:', error);
        throw error;
      }
    })()
  );
});

/**
 * Fetch event: intelligent caching strategy
 */
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip caching for certain URLs
  if (shouldSkipCache(event.request.url)) {
    return;
  }

  const url = new URL(event.request.url);

  // Determine caching strategy based on URL
  let strategy;
  let cacheName;

  try {
    // Stale-while-revalidate for index.html (#6): serve cached immediately, update in background
    if (url.pathname === '/' || url.pathname.endsWith('/index.html')) {
      strategy = staleWhileRevalidate;
      cacheName = CORE_CACHE;
    }
    // Stale-while-revalidate for data files
    else if (url.pathname.includes('/data/') ||
             url.pathname.endsWith('guides.json') ||
             url.pathname.endsWith('skills_merged.json')) {
      strategy = staleWhileRevalidate;
      cacheName = DATA_CACHE;
    }
    // Cache-first for guide HTML files
    else if (url.pathname.includes('/guides/') && url.pathname.endsWith('.html')) {
      strategy = cacheFirst;
      cacheName = GUIDES_CACHE;
    }
    // Cache-first for static assets (CSS, JS, images)
    else if (url.pathname.endsWith('.css') ||
             url.pathname.endsWith('.js') ||
             url.pathname.endsWith('.png') ||
             url.pathname.endsWith('.jpg') ||
             url.pathname.endsWith('.jpeg') ||
             url.pathname.endsWith('.gif') ||
             url.pathname.endsWith('.svg') ||
             url.pathname.endsWith('.webp') ||
             url.pathname.endsWith('.ico') ||
             url.pathname.endsWith('.woff') ||
             url.pathname.endsWith('.woff2') ||
             url.pathname.endsWith('.ttf')) {
      strategy = cacheFirst;
      cacheName = DYNAMIC_CACHE;
    }
    // Default to stale-while-revalidate for other resources
    else {
      strategy = staleWhileRevalidate;
      cacheName = DYNAMIC_CACHE;
    }

    event.respondWith(
      strategy(event.request, cacheName).then(response => {
        // Handle range requests
        return handleRangeRequest(event.request, response);
      }).catch(error => {
        console.error(`[SW] Fetch error for ${event.request.url}:`, error);

        // Return offline page only for navigation requests
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html').catch(() => {
            return new Response(
              '<!DOCTYPE html><html><body><h1>Offline</h1><p>App is currently offline</p></body></html>',
              { headers: { 'Content-Type': 'text/html' } }
            );
          });
        }

        // For non-HTML requests, return error response (don't fallback to HTML)
        return new Response('Resource not available', {
          status: 503,
          statusText: 'Service Unavailable'
        });
      })
    );
  } catch (error) {
    console.error(`[SW] Unexpected error handling fetch:`, error);

    // Return offline page only for navigation requests
    if (event.request.mode === 'navigate') {
      event.respondWith(
        caches.match('./index.html').catch(() => {
          return new Response(
            '<!DOCTYPE html><html><body><h1>Offline</h1><p>App is currently offline</p></body></html>',
            { headers: { 'Content-Type': 'text/html' } }
          );
        })
      );
    }
  }
});

/**
 * Message event: handle cache operations from clients
 */
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.delete(DYNAMIC_CACHE).then(() => {
      event.ports[0].postMessage({ success: true });
    }).catch(error => {
      event.ports[0].postMessage({ success: false, error: error.message });
    });
  }
});

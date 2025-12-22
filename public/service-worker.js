// service-worker.js - WKF Suite PWA Service Worker
// [FIX v1.1.1] Cache version - increment to force update
const CACHE_VERSION = 'wkf-suite-v1.1.1';
const CACHE_NAME = `${CACHE_VERSION}`;

// [FIX v1.1.1] Files to cache for full offline functionality
const urlsToCache = [
  '/',
  // HTML pages
  '/login.html',
  '/dashboard.html',
  '/dashboardDipendente.html',
  '/report_simple.html',
  '/permesso.html',
  '/upgrade.html',
  '/upgrade-success.html',
  // CSS
  '/styles.css',
  // JavaScript files
  '/login.js',
  '/dashboard.js',
  '/dashboardDipendente.js',
  '/report_simple.js',
  '/permesso.js',
  '/script.js',
  '/toast.js',
  '/notifications.js',
  '/analytics.js',
  '/pwa-install.js',
  '/stripe-upgrade.js',
  '/admin.js',
  '/report.js',
  '/pdf.js',
  '/common-layout.js',
  // Images & Icons
  '/logo.png',
  '/favicon.svg',
  '/favicon.ico',
  '/icons/icon-72x72.png',
  '/icons/icon-96x96.png',
  '/icons/icon-128x128.png',
  '/icons/icon-144x144.png',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/android-chrome-192x192.png',
  '/android-chrome-512x512.png',
  '/apple-touch-icon.png',
  // PWA
  '/manifest.json'
];

// [FIX v1.1.1] Service Worker installation with error handling
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker: Installing v1.1.1...');

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 Service Worker: Caching app shell...');

        // Cache files one by one to avoid total failure
        const cachePromises = urlsToCache.map(url => {
          return cache.add(url)
            .then(() => {
              console.log(`✅ Cached: ${url}`);
            })
            .catch((error) => {
              console.warn(`⚠️ Failed to cache ${url}:`, error.message);
              // Do not block installation for a single file
            });
        });

        return Promise.all(cachePromises);
      })
      .then(() => {
        console.log('✅ Service Worker: Installation complete');
        return self.skipWaiting(); // Activate immediately
      })
      .catch((error) => {
        console.error('❌ Service Worker: Installation failed', error);
        // Continue with installation anyway
        return self.skipWaiting();
      })
  );
});

// Service Worker activation
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker: Activating...');

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // Delete old caches
            if (cacheName !== CACHE_NAME) {
              console.log('🗑️ Service Worker: Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('✅ Service Worker: Activation complete');
        return self.clients.claim(); // Take control of all pages
      })
  );
});

// Fetch strategy: Network First for API, Cache First for assets
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignore non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Ignore requests to external domains
  if (url.origin !== location.origin) {
    return;
  }

  // Strategia Network First per API (dati sempre freschi)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      networkFirstStrategy(request)
    );
    return;
  }

  // [FIX v1.1.1] Cache First strategy for static assets with error handling
  event.respondWith(
    cacheFirstStrategy(request).catch(error => {
      console.error('❌ Service Worker: Error in cacheFirstStrategy:', error);
      // Fallback: try direct fetch
      return fetch(request).catch(() => {
        return new Response('Service Worker Error', { status: 503 });
      });
    })
  );
});

// Network First Strategy: try network, fallback to cache
async function networkFirstStrategy(request) {
  try {
    const networkResponse = await fetch(request);

    // Cache the response if it's valid
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.log('📡 Service Worker: Network failed, trying cache...', request.url);

    const cachedResponse = await caches.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    // If not in cache, return an offline response
    return new Response(
      JSON.stringify({
        error: 'Offline',
        message: 'You are offline. Some features may not be available.'
      }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: new Headers({
          'Content-Type': 'application/json'
        })
      }
    );
  }
}

// Cache First Strategy: try cache, fallback to network
async function cacheFirstStrategy(request) {
  const cachedResponse = await caches.match(request);

  if (cachedResponse) {
    // Update cache in the background
    fetch(request).then((networkResponse) => {
      if (networkResponse && networkResponse.status === 200) {
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, networkResponse);
        });
      }
    }).catch(() => {
      // Ignore network errors in the background
    });

    return cachedResponse;
  }

  // If not in cache, try the network
  try {
    const networkResponse = await fetch(request);

    // Cache the response
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.error('❌ Service Worker: Fetch failed:', error);
    // Return a custom offline page for navigation
    if (request.mode === 'navigate') {
      return caches.match('/offline.html') || new Response(
        '<h1>Offline</h1><p>Connect to the internet to use WKF Suite.</p>',
        { headers: { 'Content-Type': 'text/html' } }
      );
    }

    return new Response('Offline', { status: 503 });
  }
}

// Background Sync for offline requests
self.addEventListener('sync', (event) => {
  console.log('🔄 Service Worker: Background sync triggered', event.tag);

  if (event.tag === 'sync-richieste') {
    event.waitUntil(syncRichieste());
  }
});

// Sync pending requests
async function syncRichieste() {
  try {
    // Retrieve pending requests from IndexedDB or localStorage
    const pendingRequests = await getPendingRequests();

    for (const request of pendingRequests) {
      try {
        await fetch(request.url, request.options);
        await removePendingRequest(request.id);
        console.log('✅ Service Worker: Synced request', request.id);
      } catch (error) {
        console.error('❌ Service Worker: Sync failed for request', request.id);
      }
    }
  } catch (error) {
    console.error('❌ Service Worker: Background sync failed', error);
  }
}

// Push notification handling
self.addEventListener('push', (event) => {
  console.log('📬 Service Worker: Push notification received');

  const data = event.data ? event.data.json() : {};

  const title = data.title || 'WKF Suite';
  const options = {
    body: data.body || 'You have a new notification',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-96x96.png',
    vibrate: [200, 100, 200],
    data: data.url || '/',
    actions: [
      {
        action: 'open',
        title: 'Open'
      },
      {
        action: 'close',
        title: 'Close'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  console.log('👆 Service Worker: Notification clicked');

  event.notification.close();

  if (event.action === 'open' || !event.action) {
    const url = event.notification.data || '/';

    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then((clientList) => {
          // If a window is already open, focus it
          for (const client of clientList) {
            if (client.url === url && 'focus' in client) {
              return client.focus();
            }
          }

          // Otherwise, open a new window
          if (clients.openWindow) {
            return clients.openWindow(url);
          }
        })
    );
  }
});

// Utility: Get pending requests (simplified implementation)
async function getPendingRequests() {
  // TODO: Implement storage with IndexedDB
  return [];
}

// Utility: Remove pending request
async function removePendingRequest(id) {
  // TODO: Implement removal from IndexedDB
  console.log('Removing pending request:', id);
}

// Message from client
self.addEventListener('message', (event) => {
  console.log('💬 Service Worker: Message received', event.data);

  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_VERSION });
  }
});

console.log('📱 WKF Suite Service Worker loaded - Version:', CACHE_VERSION);

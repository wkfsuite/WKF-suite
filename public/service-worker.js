// service-worker.js - WKF Suite PWA Service Worker
// [FIX v1.1.1] Versione cache - incrementa per forzare aggiornamento
const CACHE_VERSION = 'wkf-suite-v1.1.1';
const CACHE_NAME = `${CACHE_VERSION}`;

// [FIX v1.1.1] File da cachare per funzionalità offline completa
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

// [FIX v1.1.1] Installazione Service Worker con gestione errori
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker: Installing v1.1.1...');

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 Service Worker: Caching app shell...');

        // Cache file uno alla volta per evitare fallimenti totali
        const cachePromises = urlsToCache.map(url => {
          return cache.add(url)
            .then(() => {
              console.log(`✅ Cached: ${url}`);
            })
            .catch((error) => {
              console.warn(`⚠️ Failed to cache ${url}:`, error.message);
              // Non bloccare l'installazione per un singolo file
            });
        });

        return Promise.all(cachePromises);
      })
      .then(() => {
        console.log('✅ Service Worker: Installation complete');
        return self.skipWaiting(); // Attiva immediatamente
      })
      .catch((error) => {
        console.error('❌ Service Worker: Installation failed', error);
        // Continua comunque con l'installazione
        return self.skipWaiting();
      })
  );
});

// Attivazione Service Worker
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker: Activating...');

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // Elimina cache vecchie
            if (cacheName !== CACHE_NAME) {
              console.log('🗑️ Service Worker: Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('✅ Service Worker: Activation complete');
        return self.clients.claim(); // Prendi controllo di tutte le pagine
      })
  );
});

// Strategia di fetch: Network First per API, Cache First per asset
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignora richieste non-GET
  if (request.method !== 'GET') {
    return;
  }

  // Ignora richieste a domini esterni
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

  // [FIX v1.1.1] Strategia Cache First per asset statici con error handling
  event.respondWith(
    cacheFirstStrategy(request).catch(error => {
      console.error('❌ Service Worker: Error in cacheFirstStrategy:', error);
      // Fallback: prova fetch diretto
      return fetch(request).catch(() => {
        return new Response('Service Worker Error', { status: 503 });
      });
    })
  );
});

// Network First Strategy: prova rete, fallback su cache
async function networkFirstStrategy(request) {
  try {
    const networkResponse = await fetch(request);

    // Cache la risposta se è valida
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

    // Se non c'è cache, restituisci risposta offline
    return new Response(
      JSON.stringify({
        error: 'Offline',
        message: 'Sei offline. Alcune funzionalità potrebbero non essere disponibili.'
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

// Cache First Strategy: prova cache, fallback su rete
async function cacheFirstStrategy(request) {
  const cachedResponse = await caches.match(request);

  if (cachedResponse) {
    // Aggiorna cache in background
    fetch(request).then((networkResponse) => {
      if (networkResponse && networkResponse.status === 200) {
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, networkResponse);
        });
      }
    }).catch(() => {
      // Ignora errori di rete in background
    });

    return cachedResponse;
  }

  // Se non è in cache, prova la rete
  try {
    const networkResponse = await fetch(request);

    // Cache la risposta
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.error('❌ Service Worker: Fetch failed:', error);

    // Restituisci pagina offline personalizzata per navigazione
    if (request.mode === 'navigate') {
      return caches.match('/offline.html') || new Response(
        '<h1>Offline</h1><p>Connettiti a Internet per usare WKF Suite.</p>',
        { headers: { 'Content-Type': 'text/html' } }
      );
    }

    return new Response('Offline', { status: 503 });
  }
}

// Background Sync per richieste offline
self.addEventListener('sync', (event) => {
  console.log('🔄 Service Worker: Background sync triggered', event.tag);

  if (event.tag === 'sync-richieste') {
    event.waitUntil(syncRichieste());
  }
});

// Sincronizza richieste pendenti
async function syncRichieste() {
  try {
    // Recupera richieste pendenti da IndexedDB o localStorage
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

// Gestione notifiche push
self.addEventListener('push', (event) => {
  console.log('📬 Service Worker: Push notification received');

  const data = event.data ? event.data.json() : {};

  const title = data.title || 'WKF Suite';
  const options = {
    body: data.body || 'Hai una nuova notifica',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-96x96.png',
    vibrate: [200, 100, 200],
    data: data.url || '/',
    actions: [
      {
        action: 'open',
        title: 'Apri'
      },
      {
        action: 'close',
        title: 'Chiudi'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Gestione click su notifica
self.addEventListener('notificationclick', (event) => {
  console.log('👆 Service Worker: Notification clicked');

  event.notification.close();

  if (event.action === 'open' || !event.action) {
    const url = event.notification.data || '/';

    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then((clientList) => {
          // Se c'è già una finestra aperta, attivala
          for (const client of clientList) {
            if (client.url === url && 'focus' in client) {
              return client.focus();
            }
          }

          // Altrimenti apri nuova finestra
          if (clients.openWindow) {
            return clients.openWindow(url);
          }
        })
    );
  }
});

// Utility: Ottieni richieste pendenti (implementazione semplificata)
async function getPendingRequests() {
  // TODO: Implementare storage con IndexedDB
  return [];
}

// Utility: Rimuovi richiesta pendente
async function removePendingRequest(id) {
  // TODO: Implementare rimozione da IndexedDB
  console.log('Removing pending request:', id);
}

// Messaggio da client
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

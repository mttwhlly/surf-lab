const CACHE_NAME = 'surf-lab-v2.0.2';
const DYNAMIC_CACHE = 'surf-lab-dynamic-v2.0.2';
const IMAGE_CACHE = 'surf-lab-images-v2.0.2';
const CURRENT_CACHES = [CACHE_NAME, DYNAMIC_CACHE, IMAGE_CACHE];

// Runtime caching strategy
const CACHE_STRATEGIES = {
  surfData: { maxAge: 5 * 60 * 1000, staleWhileRevalidate: true }, // 5 minutes
  aiReport: { maxAge: 30 * 60 * 1000, staleWhileRevalidate: false }, // 30 minutes, matches the app's React Query staleTime
  static: { maxAge: 24 * 60 * 60 * 1000 }, // 24 hours
  images: { maxAge: 7 * 24 * 60 * 60 * 1000 } // 7 days
};

// Routes that must always hit the network untouched: cron/admin actions,
// form submissions, per-report audio (not worth the Cache Storage quota),
// and health checks.
const PASSTHROUGH_PREFIXES = ['/api/admin', '/api/location-request', '/api/audio-report', '/api/health'];

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => !CURRENT_CACHES.includes(key)).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (PASSTHROUGH_PREFIXES.some(prefix => url.pathname.startsWith(prefix))) return;

  if (url.pathname === '/api/surfability') {
    event.respondWith(staleWhileRevalidate(event, DYNAMIC_CACHE));
    return;
  }

  if (url.pathname === '/api/surf-report') {
    event.respondWith(cacheFirst(event, DYNAMIC_CACHE, CACHE_STRATEGIES.aiReport.maxAge));
    return;
  }

  if (url.pathname === '/api/og') {
    event.respondWith(cacheFirst(event, IMAGE_CACHE, CACHE_STRATEGIES.images.maxAge));
    return;
  }

  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/') || url.pathname === '/manifest.json') {
    event.respondWith(cacheFirst(event, CACHE_NAME, CACHE_STRATEGIES.static.maxAge));
    return;
  }

  // Page navigations and anything else: leave to the network as normal.
});

// Background sync for failed requests
self.addEventListener('sync', event => {
  if (event.tag === 'surf-data-sync') {
    event.waitUntil(syncSurfData());
  }
});

self.addEventListener('push', event => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (error) {
    console.log('Push event had no valid JSON payload');
  }

  const title = data.title || 'Swells';
  const options = {
    body: data.body || 'Conditions update available.',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: { url: data.url || '/' }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url.includes(url) && 'focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});

async function syncSurfData() {
  try {
    const response = await fetch('/api/surfability');
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      await cache.put('/api/surfability', response);
    }
  } catch (error) {
    console.log('Background sync failed, will retry');
  }
}

function stampResponse(response) {
  const headers = new Headers(response.headers);
  headers.set('sw-fetched-on', Date.now().toString());
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

function isFresh(cachedResponse, maxAge) {
  const fetchedOn = cachedResponse.headers.get('sw-fetched-on');
  if (!fetchedOn) return false;
  return Date.now() - Number(fetchedOn) < maxAge;
}

// Serve from cache immediately when present; always revalidate in the background.
async function staleWhileRevalidate(event, cacheName) {
  const { request } = event;
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const networkFetch = fetch(request)
    .then(response => {
      if (response.ok) cache.put(request, stampResponse(response.clone()));
      return response;
    })
    .catch(() => null);

  if (cached) {
    event.waitUntil(networkFetch);
    return cached;
  }

  const response = await networkFetch;
  return response || Response.error();
}

// Serve from cache only while fresh; otherwise fetch, falling back to a
// stale cache entry if the network is unavailable.
async function cacheFirst(event, cacheName, maxAge) {
  const { request } = event;
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached && isFresh(cached, maxAge)) {
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      event.waitUntil(cache.put(request, stampResponse(response.clone())));
    }
    return response;
  } catch (error) {
    if (cached) return cached;
    throw error;
  }
}

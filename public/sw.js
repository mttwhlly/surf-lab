const CACHE_NAME = 'surf-lab-v1.0.0';
const DYNAMIC_CACHE = 'surf-lab-dynamic-v1.0.0';

const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/_next/static/css/app/layout.css',
  '/_next/static/chunks/webpack.js',
  '/_next/static/chunks/main.js',
  '/_next/static/chunks/pages/_app.js',
];

// Install event
self.addEventListener('install', event => {
  console.log('Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Caching static assets...');
        return cache.addAll(STATIC_ASSETS.filter(url => url !== '/'));
      })
      .then(() => self.skipWaiting())
      .catch(error => {
        console.error('Install failed:', error);
        return self.skipWaiting();
      })
  );
});

// Activate event
self.addEventListener('activate', event => {
  console.log('Service Worker activating...');
  event.waitUntil(
    Promise.all([
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME && cacheName !== DYNAMIC_CACHE) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      self.clients.claim()
    ])
  );
});

// Fetch event
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // Handle API requests
  if (url.pathname.includes('/api/')) {
    event.respondWith(handleAPIRequest(event.request));
    return;
  }
  
  // Handle static assets
  event.respondWith(handleStaticAsset(event.request));
});

async function handleAPIRequest(request) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      await cache.put(request, networkResponse.clone());
      return networkResponse;
    } else {
      throw new Error(`API returned ${networkResponse.status}`);
    }
  } catch (error) {
    console.log('Network failed, trying cache...');
    
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return demo data
    return new Response(JSON.stringify({
      location: "St. Augustine, FL",
      timestamp: new Date().toISOString(),
      surfable: true,
      rating: "Demo Mode",
      score: 45,
      goodSurfDuration: "Demo data - API temporarily unavailable",
      details: {
        wave_height_ft: 2.0,
        wave_period_sec: 8.0,
        swell_direction_deg: 90,
        wind_direction_deg: 180,
        wind_speed_kts: 15.0,
        tide_state: "Mid",
        tide_height_ft: 2.0,
        data_source: "Service Worker fallback"
      },
      weather: {
        air_temperature_f: 75,
        water_temperature_f: 72,
        weather_code: 1,
        weather_description: "Partly cloudy"
      },
      tides: {
        current_height_ft: 2.0,
        state: "Mid",
        next_high: { time: "6:30 PM", height: 3.2 },
        next_low: { time: "12:45 AM", height: 0.8 }
      }
    }), {
      headers: { 
        'Content-Type': 'application/json',
        'X-SW-Source': 'fallback'
      }
    });
  }
}

async function handleStaticAsset(request) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      await cache.put(request, networkResponse.clone());
      return networkResponse;
    } else {
      throw new Error(`Asset request failed: ${networkResponse.status}`);
    }
  } catch (error) {
    console.log(`Static asset failed: ${request.url}`);
    
    if (request.headers.get('accept')?.includes('text/html')) {
      const cachedIndex = await caches.match('/');
      if (cachedIndex) {
        return cachedIndex;
      }
    }
    
    return new Response('Resource not available offline', { status: 404 });
  }
}

// Push notifications
self.addEventListener('push', event => {
  const options = {
    body: 'Great surf conditions detected! 🏄‍♂️',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-96.png',
    vibrate: [200, 100, 200],
    tag: 'surf-conditions',
  };

  event.waitUntil(
    self.registration.showNotification('🌊 SURF LAB - Great Conditions!', options)
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(clientList => {
      for (const client of clientList) {
        if (client.url === self.registration.scope && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});

console.log('🌊 SURF LAB Service Worker loaded');
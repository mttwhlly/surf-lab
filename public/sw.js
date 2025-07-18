const CACHE_NAME = 'surf-lab-v2.0.0';
const DYNAMIC_CACHE = 'surf-lab-dynamic-v2.0.0';
const IMAGE_CACHE = 'surf-lab-images-v2.0.0';

// Runtime caching strategy
const CACHE_STRATEGIES = {
  surfData: { maxAge: 5 * 60 * 1000, staleWhileRevalidate: true }, // 5 minutes
  aiReport: { maxAge: 4 * 60 * 60 * 1000, staleWhileRevalidate: false }, // 4 hours
  static: { maxAge: 24 * 60 * 60 * 1000 }, // 24 hours
  images: { maxAge: 7 * 24 * 60 * 60 * 1000 } // 7 days
};

// Background sync for failed requests
self.addEventListener('sync', event => {
  if (event.tag === 'surf-data-sync') {
    event.waitUntil(syncSurfData());
  }
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
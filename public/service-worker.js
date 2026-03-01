const CACHE_NAME = 'trivia-v1';
const PRECACHE_URLS = [
  './',
  './index.html',
  '/trivia-app/',
  '/trivia-app/index.html'
];

// Install: cache shell
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// Activate: clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch: network first, fallback to cache
self.addEventListener('fetch', event => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip API calls (Supabase, Trivia API)
  if (event.request.url.includes('supabase.co') ||
      event.request.url.includes('the-trivia-api.com')) return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Cache successful responses
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => {
        // Fallback to cache if offline
        return caches.match(event.request)
          .then(cached => {
            if (cached) return cached;
            // Try both relative and GitHub Pages paths for index.html fallback
            return caches.match('./index.html')
              .then(rel => rel || caches.match('/trivia-app/index.html'));
          });
      })
  );
});

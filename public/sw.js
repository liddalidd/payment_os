// Minimal service worker — exists only to satisfy PWA install criteria.
// We don't cache anything because the app is fully dynamic (relies on the local server).
self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', () => {
  // Pass-through; required handler for installability.
})

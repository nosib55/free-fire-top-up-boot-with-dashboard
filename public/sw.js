// public/sw.js
// Self-unregistering service worker to clear any zombie service workers from localhost
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    self.registration.unregister()
  );
});

const CACHE_NAME = 'fortx-caller-v1';
const BASE = self.location.pathname.replace(/sw\.js$/, '');

const SHELL_FILES = [
  BASE,
  BASE + 'index.html',
  BASE + 'app.html',
  BASE + 'manifest.json',
  BASE + 'css/base.css',
  BASE + 'css/components.css',
  BASE + 'css/animations.css',
  BASE + 'js/config.js',
  BASE + 'js/auth.js',
  BASE + 'js/api.js',
  BASE + 'js/router.js',
  BASE + 'js/views/home.js',
  BASE + 'js/views/leads.js',
  BASE + 'js/views/earnings.js',
  BASE + 'js/views/leaderboard.js',
  BASE + 'js/views/profile.js',
  BASE + 'js/components/lead-card.js',
  BASE + 'js/components/outcome-modal.js',
  BASE + 'js/components/demo-modal.js',
  BASE + 'js/components/toast.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (url.hostname !== self.location.hostname) {
    return;
  }
  if (url.pathname.includes('/api/') || url.pathname.startsWith('/auth/')) {
    return;
  }
  e.respondWith(
    caches.match(e.request).then((cached) => {
      const fetched = fetch(e.request).then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
        return response;
      }).catch(() => cached);
      return cached || fetched;
    })
  );
});

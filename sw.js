/* Network-first keeps local development fresh; the complete scene works offline. */
const PREFIX = `hanabi:${self.registration.scope}:`;
const CACHE = `${PREFIX}v2`;
const FILES = ['./', 'index.html', 'experience.css', 'experience.js', 'fireworks.js',
  'drones.js', 'audio.js', 'pwa.js', 'manifest.webmanifest', 'LICENSE',
  'media/icons/hanabi.svg', 'media/icons/icon-192.png', 'media/icons/icon-512.png',
  'media/icons/icon-maskable-512.png', 'media/icons/apple-touch-icon.png'];
const URLS = new Set(FILES.map(file => new URL(file, self.registration.scope).href));
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith(PREFIX) && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  url.search = ''; url.hash = '';
  if (!URLS.has(url.href)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const response = await fetch(event.request);
      if (!response.ok) throw new Error('App asset unavailable');
      await cache.put(url.href, response.clone());
      return response;
    } catch (error) {
      const cached = await cache.match(url.href);
      if (cached) return cached;
      throw error;
    }
  })());
});

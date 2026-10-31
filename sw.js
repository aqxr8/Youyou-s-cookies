/* Youyou's Cookies - service worker (makes the site installable and gives an offline screen).
   Orders, login, Firebase and /api calls are NEVER cached - they always go to the network. */
const VERSION = 'yy-v1';
const STATIC = 'yy-static-' + VERSION;
const PAGES = 'yy-pages-' + VERSION;
const PRECACHE = ['/offline', '/assets/images/logo.webp', '/assets/icons/icon-192.png', '/assets/icons/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC).then((cache) => Promise.all(PRECACHE.map((u) => cache.add(u).catch(() => null))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('yy-') && k !== STATIC && k !== PAGES).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;          // Firebase, Google fonts, CDNs: leave alone
  if (url.pathname.startsWith('/api/')) return;             // receipts, telegram: always live
  if (url.pathname === '/sw.js') return;

  // Pages: network first, last good copy when offline, then the offline screen
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const res = await fetch(req);
        if (res && res.ok && !res.redirected && res.type === 'basic') {
          const copy = res.clone();
          caches.open(PAGES).then((c) => c.put(req, copy));
        }
        return res;
      } catch (err) {
        const cached = await caches.match(req, { ignoreSearch: true });
        return cached || (await caches.match('/offline')) || Response.error();
      }
    })());
    return;
  }

  // Images, css, js, fonts of the site: show the saved copy fast, refresh it in the background
  if (/\.(?:css|js|png|jpe?g|webp|svg|ico|woff2?|webmanifest)$/i.test(url.pathname)) {
    event.respondWith((async () => {
      const cache = await caches.open(STATIC);
      const cached = await cache.match(req);
      const network = fetch(req).then((res) => {
        if (res && res.ok && res.type === 'basic') cache.put(req, res.clone());
        return res;
      }).catch(() => cached);
      return cached || network;
    })());
  }
});

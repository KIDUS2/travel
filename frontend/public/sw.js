/* Teguwaz service worker: opens the app and your last-seen memories without a connection.
 * - App files (/assets/*, fonts, icons): cache first, they are versioned by name.
 * - Pages: network first, falling back to the cached app.
 * - API reads (GET /api/...): network first, falling back to the last copy, so the vault opens offline.
 * - Uploads and other writes are never cached; the app keeps them in its outbox instead.
 */
const VERSION = 'teguwaz-v4';
const SHELL = `${VERSION}-shell`;
const DATA = `${VERSION}-data`;

/** Caches the app page plus the scripts and styles it links, so the very next visit works offline. */
async function precache() {
  const cache = await caches.open(SHELL);
  const res = await fetch('/', { cache: 'no-store' });
  const html = await res.clone().text();
  await cache.put('/', res);
  const linked = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map((m) => m[1]);
  // Lazy-loaded parts (detailed maps, photo reader) are listed by the build in asset-list.json.
  const listed = await fetch('/asset-list.json', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : [])).catch(() => []);
  const assets = [...linked, ...listed];
  await cache.addAll([...new Set([...assets, '/manifest.webmanifest', '/favicon.svg', '/icons/icon-192.png'])]);
}

self.addEventListener('install', (event) => {
  event.waitUntil(precache().then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (event) => {
  // Sent on sign-out so the next person on a shared phone cannot read cached memories.
  if (event.data === 'clear-data') event.waitUntil(caches.delete(DATA));
});

async function networkFirst(request, cacheName, fallbackUrl) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch (err) {
    const cached = await cache.match(request, { ignoreVary: true }) || (fallbackUrl && await caches.match(fallbackUrl, { ignoreVary: true }));
    if (cached) return cached;
    throw err;
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request, { ignoreVary: true });
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) (await caches.open(SHELL)).put(request, response.clone());
  return response;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  if (url.origin === self.location.origin && url.pathname.startsWith('/api/')) {
    if (url.pathname.includes('/oauth/') || url.pathname.endsWith('/export')) return;
    event.respondWith(networkFirst(request, DATA));
    return;
  }
  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, SHELL, '/'));
    return;
  }
  if (url.origin === self.location.origin || url.host === 'fonts.googleapis.com' || url.host === 'fonts.gstatic.com') {
    event.respondWith(cacheFirst(request));
  }
});

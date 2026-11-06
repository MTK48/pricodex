/* Pricodex service worker, written by pipeline/pwa.py. VERSION changes with every new page. */
const VERSION = '85c1f6ea4b71';
const CACHE = 'pricodex-' + VERSION, FONTS = 'pricodex-fonts';
const CORE = ['./', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png', 'favicon-32.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE && k !== FONTS).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

function pageFirst(req) {           /* network first; after 4 s, or on failure, the last copy if there is one */
  return new Promise(resolve => {
    let done = false;
    const finish = r => { if (!done && r) { done = true; resolve(r); } };
    const timer = setTimeout(() => caches.match('./').then(finish), 4000);
    fetch(req).then(r => {
      clearTimeout(timer);
      if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put('./', copy)); finish(r); }
      else caches.match('./').then(hit => finish(hit || r));
    }, () => {
      clearTimeout(timer);
      caches.match('./').then(hit => finish(hit || Response.error()));
    });
  });
}
function fontsCached(req) {         /* stale-while-revalidate */
  return caches.open(FONTS).then(c => c.match(req).then(hit => {
    const net = fetch(req).then(r => { if (r.ok || r.type === 'opaque') c.put(req, r.clone()); return r; }).catch(() => hit || Response.error());
    return hit || net;
  }));
}

self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET') return;
  if (req.mode === 'navigate') { e.respondWith(pageFirst(req)); return; }
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') { e.respondWith(fontsCached(req)); return; }
  if (url.origin === location.origin) e.respondWith(caches.match(req).then(hit => hit || fetch(req)));
});

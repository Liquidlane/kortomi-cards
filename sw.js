// Offline-Cache für Kortomi Cards. VERSION erhöhen, wenn sich Dateien ändern.
const VERSION = 'kortomi-v12';
const CORE = [
  './', 'index.html', 'manifest.webmanifest', 'css/style.css',
  'js/app.js', 'js/art.js', 'js/audio.js', 'js/blackjack.js', 'js/cards.js', 'js/fx.js', 'js/mascot.js', 'js/solitaire.js', 'js/store.js', 'js/ui.js', 'js/voice.js', 'js/lines-extra.js', 'js/cascade.js', 'js/shop.js', 'js/hilo.js', 'js/poker.js', 'js/clerk.js', 'js/lines-choc.js', 'js/cloud.js', 'js/tutorial.js',
  'js/progress.js', 'css/progress.css',
  'js/baccarat.js', 'js/baccarat-rules.js', 'js/tutorials-games.js', 'css/baccarat.css',
  'js/music.js', 'js/streaks.js', 'js/lines-streak.js', 'js/winter.js', 'css/winter.css',
  'js/spider.js', 'js/freecell.js', 'js/patience.js', 'js/patience-rules.js', 'css/patience.css',
  'assets/icon.svg', 'assets/icon-180.png', 'assets/icon-192.png', 'assets/icon-512.png',
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Eigene Bilder: immer zuerst frisch aus dem Netz
  if (url.pathname.includes('/assets/custom/')) {
    e.respondWith(fetch(req).then(r => { const cp = r.clone(); caches.open(VERSION).then(c => c.put(req, cp)); return r; }).catch(() => caches.match(req)));
    return;
  }
  // App-Dateien: Netz zuerst und am Browser-Cache vorbei (damit Updates sofort ankommen), sonst Cache
  if (url.origin === location.origin) {
    e.respondWith(fetch(req.url, { cache: 'no-cache' }).then(r => { if (r.ok) { const cp = r.clone(); caches.open(VERSION).then(c => c.put(req, cp)); } return r; }).catch(() => caches.match(req, { ignoreSearch: true })));
    return;
  }
  // Cloud-Spielstand nie aus dem Cache
  if (url.hostname === 'getpantry.cloud') return;
  // Schriften von Google: Cache zuerst
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => { const cp = r.clone(); caches.open(VERSION).then(c => c.put(req, cp)); return r; })));
});

const CACHE = 'attendance-shell-v8';
const APP_SHELL = [
  './', './index.html', './login.html', './register.html', './forget.html',
  './student.html', './admin.html', './students.html', './mark.html',
  './records.html', './reports.html', './settings.html',
  './home.css', './style.css', './admin.css', './firebase.js',
  './attendance-utils.js', './icon-192.png', './icon-512.png', './favicon.png',
  './manifest.webmanifest'
];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  event.respondWith(
    caches.match(req).then(cached => cached || fetch(req).then(res => {
      const copy = res.clone();
      if (new URL(req.url).origin === self.location.origin) caches.open(CACHE).then(c => c.put(req, copy));
      return res;
    }).catch(() => caches.match('./index.html')))
  );
});

const CACHE = 'verts-supporter-v31';

const APP_FILES = [
  './',
  './index.html',
  './app.js',
  './style.css',
  './config.js',
  './manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(APP_FILES))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key.startsWith('verts-supporter-') && key !== CACHE)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Ne jamais mettre en cache les données Supabase.
  if (url.hostname.endsWith('.supabase.co')) {
    return;
  }

  // Ne gérer que les fichiers de notre application.
  if (url.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;

      return fetch(request).then(response => {
        if (response.ok) {
          const copy = response.clone();
          event.waitUntil(
            caches.open(CACHE).then(cache => cache.put(request, copy))
          );
        }
        return response;
      });
    })
  );
});

// NOTIFICATIONS PUSH — CODE CONSERVÉ

self.addEventListener('push', event => {
  let data = {};

  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {}

  const title = data.title || 'Les Comptes des Verts';

  const options = {
    body: data.body || '',
    icon: './icon-512.png',
    badge: './icon-512.png',
    data: {
      url: data.url || './'
    },
    tag: data.tag || 'les-comptes-des-verts'
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();

  const url = event.notification.data?.url || './';

  event.waitUntil(
    clients.openWindow(url)
  );
});

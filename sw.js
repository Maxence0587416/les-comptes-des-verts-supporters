const CACHE='verts-supporter-v30';self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(['./','./index.html','./app.js','./style.css','./config.js','./manifest.json']))));self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(x=>{const c=x.clone();caches.open(CACHE).then(k=>k.put(e.request,c));return x}).catch(()=>caches.match('./index.html')))});
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

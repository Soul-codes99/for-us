/* FOR US service worker: receives Web Push and shows the notification.
   It must live next to index.html (a service worker cannot be inlined). */
const SW_VERSION = 'forus-sw-1';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

/* A push arrives: always show a notification (iOS and Chrome both require it) */
self.addEventListener('push', event => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; }
  catch (e) { d = { body: event.data ? event.data.text() : '' }; }

  const title = d.title || 'FOR US';
  const options = {
    body: d.body || '',
    icon: 'icon-192.png',
    badge: 'badge-96.png',
    tag: d.tag || 'forus',               /* same tag replaces the previous one instead of stacking */
    renotify: !!d.tag,
    timestamp: d.ts || Date.now(),
    data: { open: d.open || '', url: d.url || './' }
  };
  event.waitUntil((async () => {
    /* The app is open and in front: it already shows a live toast, so Android/desktop can skip the
       notification. iPhone requires one for every push, so it never skips. */
    const iphone = /iPhone|iPad|iPod/i.test((self.navigator && self.navigator.userAgent) || '');
    if (!iphone) {
      const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      if (wins.some(w => w.visibilityState === 'visible')) return;
    }
    await self.registration.showNotification(title, options);
  })());
});

/* A tap on the notification: focus the app if it is open, otherwise launch it */
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const data = event.notification.data || {};
  const target = new URL(data.url || './', self.registration.scope).href;

  event.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const w of wins) {
      if (w.url.startsWith(self.registration.scope)) {
        await w.focus();
        w.postMessage({ type: 'push-open', open: data.open || '' });   /* the app shows the right panel */
        return;
      }
    }
    await self.clients.openWindow(target);
  })());
});

/* The browser rotated the subscription: the app re-saves it the next time it opens */
self.addEventListener('pushsubscriptionchange', () => {});

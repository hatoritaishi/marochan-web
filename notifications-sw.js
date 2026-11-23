self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const kind = event.notification.data?.kind;
  if (!['letter', 'steal', 'rescue', 'test'].includes(kind)) return;
  event.waitUntil((async () => {
    const root = new URL(self.registration.scope);
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const existing = windows.find(client => {
      const url = new URL(client.url);
      return url.origin === root.origin && (url.pathname === root.pathname || url.pathname === root.pathname + 'index.html');
    });
    if (existing) {
      await existing.focus();
      existing.postMessage({ type: 'maro-notification-open', kind });
    } else {
      if (kind !== 'test') root.searchParams.set('notice', kind);
      await self.clients.openWindow(root.href);
    }
  })());
});

self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || '📖 Highlights of the Day';
  const options = {
    body: data.body || "Tap to see today's quotes",
    tag: 'daily-highlights',
    renotify: true,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      return clients.openWindow('/');
    })
  );
});

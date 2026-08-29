self.addEventListener('push', function (event) {
  let data = {
    title: '🔔 Lead Reminder',
    body: 'You have a scheduled task reminder!',
    url: '/',
  };

  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/logo.png',
    badge: data.badge || '/logo-white.png',
    vibrate: [500, 250, 500, 250, 1000],
    tag: data.tag || `lead-push-${Date.now()}`,
    data: {
      dateOfArrival: Date.now(),
      url: data.url || '/',
    },
    requireInteraction: true,
    actions: [
      { action: 'open', title: 'Open App' },
    ],
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if ('focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

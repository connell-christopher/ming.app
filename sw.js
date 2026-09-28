const MING_APP_URL = './app.html';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));

self.addEventListener('push', event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (_) {}

  const title = data.kind === 'video' ? 'Incoming video call' : 'Incoming voice call';
  const caller = data.callerName || 'Someone';
  const options = {
    body: caller + ' is calling you on Ming',
    icon: './favicon.ico',
    badge: './favicon.ico',
    tag: 'ming-call-' + (data.callId || 'incoming'),
    renotify: true,
    requireInteraction: true,
    vibrate: [180, 100, 180, 100, 360],
    data: {
      type: 'ming-call',
      callId: data.callId || ''
    },
    actions: [
      { action: 'open', title: 'Answer' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  if (event.action === 'dismiss') return;

  event.waitUntil((async () => {
    const url = new URL(MING_APP_URL, self.location.href).href;
    const windows = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    const existing = windows.find(client => 'focus' in client);

    if (existing) {
      await existing.focus();
      existing.postMessage({
        type: 'ming-call-open',
        callId: event.notification.data?.callId || ''
      });
      return;
    }

    await clients.openWindow(url);
  })());
});

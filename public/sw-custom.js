/**
 * HUMID1 — Custom Service Worker Extensions
 * Handles Web Push Events, Notification Click Routing, and Periodic Background Sync
 */

// Helper to strip emoji characters, unicode pictographs, and variation selectors
function stripEmojis(str) {
  if (!str) return '';
  return String(str)
    .replace(/\p{Extended_Pictographic}/gu, '')
    .replace(/[\u{FE00}-\u{FE0F}\u{1F3FB}-\u{1F3FF}\u{200D}]/gu, '')
    .replace(/[\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2300}-\u{23FF}\u{2B50}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Handle incoming Web Push notifications (e.g. from ThingsBoard Rule Engine or Web Push server)
self.addEventListener('push', (event) => {
  let payload = {
    title: 'HUMID1 Climate Alert',
    body: 'A microclimate warning or threshold breach was detected on your humidor.',
    severity: 'CRITICAL',
    url: '/',
  };

  if (event.data) {
    try {
      const json = event.data.json();
      payload = { ...payload, ...json };
    } catch {
      payload.body = event.data.text() || payload.body;
    }
  }

  const severity = payload.severity || 'CRITICAL';
  const cleanTitle = stripEmojis(payload.title);
  const cleanBody = stripEmojis(payload.body);
  const severityTag = `[${severity}]`;
  const formattedTitle = cleanTitle.toUpperCase().includes(severityTag)
    ? cleanTitle
    : `${severityTag} ${cleanTitle}`;

  const options = {
    body: cleanBody,
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    tag: payload.tag || `humid1-push-${severity.toLowerCase()}-${Date.now()}`,
    vibrate: severity === 'CRITICAL' ? [300, 100, 300, 100, 300] : [200, 100, 200],
    requireInteraction: severity === 'CRITICAL',
    renotify: true,
    data: {
      url: payload.url || '/',
      severity,
      timestamp: Date.now(),
    },
    actions: [
      { action: 'open_dashboard', title: 'Open Dashboard' },
    ],
  };

  event.waitUntil(self.registration.showNotification(formattedTitle, options));
});

// Handle notification interaction (tap/click) on Android / Desktop
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a dashboard window is already open, focus it
      for (const client of clientList) {
        if (client.url.includes(self.registration.scope) && 'focus' in client) {
          return client.focus();
        }
      }
      // If no window is open, launch a new window with the target URL
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

// Support for Chromium / Android Periodic Background Sync API
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'humid1-climate-check') {
    event.waitUntil(
      // Ping clients or perform background cache refresh if needed
      self.clients.matchAll({ type: 'window' }).then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'PERIODIC_SYNC_PULSE', timestamp: Date.now() });
        });
      })
    );
  }
});

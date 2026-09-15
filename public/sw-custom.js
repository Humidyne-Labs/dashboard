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

// Handle incoming Web Push notifications (e.g. from ThingsBoard Rule Engine or Web Push microservice)
self.addEventListener('push', (event) => {
  event.waitUntil((async () => {
    // 1. Query all active window instances of the PWA
    const clientList = await self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true,
    });

    // 2. Check if the user is actively looking at the dashboard tab
    const isAppFocused = clientList.some((client) => client.focused);

    // 3. If active on screen, suppress the OS system tray notification.
    // The active in-app telemetry/alarm connection handles the in-app banner & audio prompt.
    if (isAppFocused) {
      console.log('[SW] App is in focus. Suppressing Web Push system notification.');
      return;
    }

    // 4. App is backgrounded, minimized, or closed -> Show OS system alert
    let payload = {
      title: 'HUMID1 Climate Alert',
      body: 'A microclimate warning or threshold breach was detected on your humidor.',
      severity: 'CRITICAL',
      url: '/',
      deviceId: '',
    };

    if (event.data) {
      try {
        const json = event.data.json();
        payload = { ...payload, ...json };
      } catch {
        payload.body = event.data.text() || payload.body;
      }
    }

    // Ensure incoming severity is normalized to match strict checks
    const validSeverities = ['CRITICAL', 'MAJOR', 'MINOR', 'WARNING', 'INDETERMINATE', 'INDETERMINATE'];
    const rawSeverity = payload.severity 
      ? String(payload.severity).toUpperCase() 
      : 'INDETERMINATE';

    const severity = validSeverities.includes(rawSeverity) 
      ? rawSeverity 
      : 'INDETERMINATE';

    const cleanTitle = stripEmojis(payload.title);
    const cleanBody = stripEmojis(payload.body);
    const severityTag = `[${severity}]`;
    const formattedTitle = cleanTitle.toUpperCase().includes(severityTag)
      ? cleanTitle
      : `${severityTag} ${cleanTitle}`;

    // Tag per device or general to keep alerts deduplicated cleanly
    const deviceId = payload.deviceId || payload.deviceName || '';
    const tag = payload.tag || (deviceId ? `humid1-alarm-${deviceId}` : 'humid1-alarm');
    const targetUrl = payload.url || (deviceId ? `/?device=${encodeURIComponent(deviceId)}` : '/');

    const options = {
      body: cleanBody,
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      tag: tag,
      renotify: true,
      vibrate: severity === 'CRITICAL' ? [300, 100, 300, 100, 300] : [200, 100, 200],
      requireInteraction: severity === 'CRITICAL',
      data: {
        url: targetUrl,
        deviceId,
        severity,
        timestamp: Date.now(),
      },
      actions: [
        { action: 'open_dashboard', title: 'Open Dashboard' },
      ],
    };

    return self.registration.showNotification(formattedTitle, options);
  })());
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

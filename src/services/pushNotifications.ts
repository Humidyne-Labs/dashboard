export type NotificationPermissionState = 'default' | 'granted' | 'denied' | 'unsupported';

export interface HumidorAlertPayload {
  title: string;
  body: string;
  severity: 'CRITICAL' | 'MAJOR' | 'WARNING' | 'INFO';
  deviceId?: string;
  deviceName?: string;
  tag?: string;
  timestamp?: number;
}

class PushNotificationManager {
  private permission: NotificationPermissionState = 'default';
  private registration: ServiceWorkerRegistration | null = null;
  private listeners: Array<(perm: NotificationPermissionState) => void> = [];

  constructor() {
    this.checkInitialState();
  }

  private async checkInitialState() {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      this.permission = 'unsupported';
      this.notifyListeners();
      return;
    }

    this.permission = Notification.permission as NotificationPermissionState;
    this.notifyListeners();

    if ('serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg) {
          this.registration = reg;
        } else {
          navigator.serviceWorker.ready.then((readyReg) => {
            this.registration = readyReg;
          }).catch(() => {});
        }
      } catch (e) {
        console.warn('Could not query service worker registration:', e);
      }
    }
  }

  public async getRegistration(): Promise<ServiceWorkerRegistration | null> {
    if (this.registration) return this.registration;
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      try {
        this.registration = await navigator.serviceWorker.ready;
        return this.registration;
      } catch (e) {
        console.warn('Failed to obtain ready ServiceWorkerRegistration:', e);
      }
    }
    return null;
  }

  public getPermission(): NotificationPermissionState {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'unsupported';
    }
    return Notification.permission as NotificationPermissionState;
  }

  public isSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window;
  }

  public isGranted(): boolean {
    return this.getPermission() === 'granted';
  }

  public subscribe(listener: (perm: NotificationPermissionState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notifyListeners() {
    const current = this.getPermission();
    this.listeners.forEach((l) => l(current));
  }

  public async requestPermission(): Promise<NotificationPermissionState> {
    if (!this.isSupported()) {
      return 'unsupported';
    }

    try {
      const result = await Notification.requestPermission();
      this.permission = result as NotificationPermissionState;
      this.notifyListeners();

      if (result === 'granted') {
        // Attempt to register periodic background sync if available on Android
        this.registerPeriodicSync().catch(() => {});
      }

      return this.permission;
    } catch (err) {
      console.error('Error requesting notification permission:', err);
      return this.getPermission();
    }
  }

  /**
   * Registers Chromium/Android Periodic Background Sync to keep humidor alarms monitored
   */
  public async registerPeriodicSync(): Promise<boolean> {
    const reg = await this.getRegistration();
    if (!reg) return false;

    if ('periodicSync' in reg) {
      try {
        const periodicSync = (reg as any).periodicSync;
        await periodicSync.register('humid1-climate-check', {
          minInterval: 15 * 60 * 1000, // 15 minutes minimum interval supported by OS
        });
        return true;
      } catch (e) {
        console.info('Periodic background sync registration note:', e);
        return false;
      }
    }
    return false;
  }

  /**
   * Get active Web Push Subscription (for ThingsBoard Server Push / FCM Integration)
   */
  public async getPushSubscription(): Promise<PushSubscription | null> {
    const reg = await this.getRegistration();
    if (!reg || !('pushManager' in reg)) return null;

    try {
      return await reg.pushManager.getSubscription();
    } catch (err) {
      console.warn('Error fetching push subscription:', err);
      return null;
    }
  }

  /**
   * Reliable native notification dispatcher
   * Uses ServiceWorkerRegistration.showNotification (mandatory for Android TWA/PWA)
   * with fallback to window Notification for desktop browsers.
   */
  public async showNotification(payload: HumidorAlertPayload): Promise<boolean> {
    if (!this.isGranted()) {
      return false;
    }

    const { title, body, severity, deviceName, tag } = payload;
    const badgeColor =
      severity === 'CRITICAL' ? '🚨' : severity === 'MAJOR' ? '⚠️' : severity === 'WARNING' ? '⚡' : 'ℹ️';

    // Clean title prefix
    const cleanTitle = title.replace(/^[🚨⚠️⚡ℹ️]\s*/, '');
    const formattedTitle = `${badgeColor} ${cleanTitle}${deviceName && !cleanTitle.includes(deviceName) ? ` — ${deviceName}` : ''}`;

    const options: NotificationOptions = {
      body,
      // Note: Android system tray requires bitmap PNG; SVG causes silent rejection or blank box
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      tag: tag || `humid1-${severity.toLowerCase()}-${Date.now()}`,
      // Vibration pattern for Android hardware (buzz-pause-buzz)
      vibrate: severity === 'CRITICAL' ? [300, 100, 300, 100, 300] : [200, 100, 200],
      requireInteraction: severity === 'CRITICAL',
      renotify: true,
      data: {
        timestamp: Date.now(),
        severity,
        url: window.location.origin,
      },
      // Actions supported in Android system notification tray
      actions: [
        { action: 'open_dashboard', title: 'Open Dashboard' },
      ],
    } as any;

    try {
      const reg = await this.getRegistration();
      if (reg && 'showNotification' in reg) {
        await reg.showNotification(formattedTitle, options);
        return true;
      }

      // Desktop fallback only (Android throws Illegal Constructor for window Notification)
      if (typeof window !== 'undefined' && 'Notification' in window) {
        new Notification(formattedTitle, options);
        return true;
      }
      return false;
    } catch (e) {
      console.warn('Native ServiceWorker showNotification failed, trying fallback:', e);
      try {
        if (typeof window !== 'undefined' && 'Notification' in window) {
          new Notification(formattedTitle, options);
          return true;
        }
      } catch (err2) {
        console.error('Failed to display notification:', err2);
      }
      return false;
    }
  }

  public async sendTestAlert(severity: 'CRITICAL' | 'MAJOR' | 'WARNING' = 'CRITICAL'): Promise<boolean> {
    const alerts: Record<string, HumidorAlertPayload> = {
      CRITICAL: {
        title: 'Critical Humidity Breach',
        body: 'Cabinet RH dropped to 63.8% (Minimum safe limit: 65.0%). Replenish hydration reservoir immediately.',
        severity: 'CRITICAL',
        deviceName: 'Master Vault 01',
      },
      MAJOR: {
        title: 'High Temperature Spike',
        body: 'Cabinet temperature elevated to 76.2°F (Safe ceiling: 75.0°F). Inspect thermoelectric cooling cell.',
        severity: 'MAJOR',
        deviceName: 'Aging Tower B',
      },
      WARNING: {
        title: 'Battery Reserve Low',
        body: 'Hardware battery reserve is at 18%. Connect USB-C fast charger or swap Li-Ion cell.',
        severity: 'WARNING',
        deviceName: 'Travel Case 03',
      },
    };

    return this.showNotification(alerts[severity]);
  }
}

export const pushNotifications = new PushNotificationManager();

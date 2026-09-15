import { thingsboard } from './thingsboard';
import { getEnv } from '../utils/env';

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

/**
 * Default local Python micro-service relay endpoint hosting the FCM VAPID public key
 */
export const DEFAULT_MICROSERVICE_URL = 'http://localhost:6000';

/**
 * Fallback static VAPID key in case microservice is temporarily offline during cold boot
 */
export const FALLBACK_VAPID_PUBLIC_KEY =
  'BPCsGTkqZflbV7jYaPUjj5dXE2kcN-lfyfn8anIZOBiqlwjf1r3JB6PMdPEYin4eKXBoFzcesbsTKBTH7FigRFY';

export function getMicroserviceUrl(): string {
  const envUrl = getEnv('VITE_PUSH_MICROSERVICE_URL', getEnv('PUSH_MICROSERVICE_URL', ''));
  if (envUrl && envUrl.trim()) {
    return envUrl.trim().replace(/\/$/, '');
  }
  return DEFAULT_MICROSERVICE_URL;
}

/**
 * Endpoint 1: Health check
 * Checks GET /healthz before issuing any other requests or pushing data.
 */
export async function checkMicroserviceHealth(microserviceBaseUrl?: string): Promise<{
  healthy: boolean;
  status?: string;
  error?: string;
}> {
  const baseUrl = (microserviceBaseUrl || getMicroserviceUrl()).replace(/\/$/, '');
  const url = `${baseUrl}/healthz`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json, text/plain, */*' },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      let data: any = null;
      try {
        data = await res.json();
      } catch {
        // ignore if not json
      }
      return {
        healthy: true,
        status: data?.status || 'ok',
      };
    }
    return {
      healthy: false,
      error: `HTTP ${res.status}: ${res.statusText}`,
    };
  } catch (err: any) {
    const isAbort = err.name === 'AbortError';
    return {
      healthy: false,
      error: isAbort ? 'Connection timed out (4s)' : err?.message || 'Connection refused',
    };
  }
}

/**
 * Endpoint 2: GET /api/v1/vapid-public-key
 * First checks /healthz to ensure the micro-service is active before issuing the request.
 */
export async function fetchVapidPublicKey(microserviceBaseUrl?: string): Promise<{
  key: string;
  endpoint: string;
  fromCache?: boolean;
  error?: string;
}> {
  const baseUrl = (microserviceBaseUrl || getMicroserviceUrl()).replace(/\/$/, '');

  // 1. Proactively verify micro-service health before issuing request
  const health = await checkMicroserviceHealth(baseUrl);
  if (!health.healthy) {
    console.warn(`[PushManager] Microservice health check failed at ${baseUrl}/healthz (${health.error}). Checking cache.`);
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('humid1_cached_vapid_key');
      if (cached && cached.length >= 60) {
        const cachedSrc = localStorage.getItem('humid1_vapid_key_source') || 'cached';
        return { key: cached, endpoint: cachedSrc, fromCache: true, error: health.error };
      }
    }
    return { key: FALLBACK_VAPID_PUBLIC_KEY, endpoint: 'fallback', fromCache: true, error: health.error };
  }

  // 2. Fetch public key from the designated endpoint: /api/v1/vapid-public-key
  const keyUrl = `${baseUrl}/api/v1/vapid-public-key`;
  try {
    const res = await fetch(keyUrl, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    if (res.ok) {
      const data = await res.json();
      const extractedKey = data.public_key || data.publicKey || '';

      if (extractedKey && extractedKey.length >= 60) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('humid1_cached_vapid_key', extractedKey);
          localStorage.setItem('humid1_vapid_key_source', keyUrl);
          localStorage.setItem('humid1_vapid_fetched_at', String(Date.now()));
        }
        console.log(`[PushManager] Dynamically fetched VAPID public key from microservice (${keyUrl})`);
        return { key: extractedKey, endpoint: keyUrl };
      }
    }
  } catch (err: any) {
    console.warn(`[PushManager] Error fetching from ${keyUrl}:`, err);
  }

  // Fallback to locally cached key if needed
  if (typeof window !== 'undefined') {
    const cached = localStorage.getItem('humid1_cached_vapid_key');
    if (cached && cached.length >= 60) {
      const cachedSrc = localStorage.getItem('humid1_vapid_key_source') || 'cached';
      return { key: cached, endpoint: cachedSrc, fromCache: true };
    }
  }

  return { key: FALLBACK_VAPID_PUBLIC_KEY, endpoint: 'fallback', fromCache: true };
}

/**
 * Converts a URL-safe Base64 encoded VAPID public key into a Uint8Array
 * required by the browser pushManager.subscribe applicationServerKey.
 */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const outputArray = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Strips emoji characters, unicode pictographs, dingbats, and variation selectors
 * from notification strings to prevent broken 'tofu' glyph boxes on Android system trays.
 */
export function stripEmojis(str: string): string {
  if (!str) return '';
  return str
    .replace(/\p{Extended_Pictographic}/gu, '')
    .replace(/[\u{FE00}-\u{FE0F}\u{1F3FB}-\u{1F3FF}\u{200D}]/gu, '')
    .replace(/[\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2300}-\u{23FF}\u{2B50}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
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
        // Auto-subscribe and sync to ThingsBoard attributes
        this.syncSubscriptionWithThingsBoard().catch((e) => {
          console.warn('Initial FCM push sync note:', e);
        });
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
   * Subscribe or refresh subscription with Google FCM using dynamic VAPID Public Key from microservice
   */
  public async subscribeToPush(
    customVapidPublicKey?: string,
    forceRefresh: boolean = false
  ): Promise<PushSubscription | null> {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return null;
    }

    try {
      const reg = await navigator.serviceWorker.ready;
      if (!reg || !('pushManager' in reg)) {
        console.warn('[PushManager] pushManager not supported in this browser.');
        return null;
      }

      // 1. Check existing subscription
      const existingSub = await reg.pushManager.getSubscription();
      if (existingSub) {
        if (forceRefresh) {
          await existingSub.unsubscribe();
          console.log('[PushManager] Cleared old subscription.');
        } else {
          return existingSub;
        }
      }

      // 2. Fetch VAPID key dynamically from microservice if not explicitly provided
      let vapidKey = customVapidPublicKey;
      if (!vapidKey) {
        const fetched = await fetchVapidPublicKey();
        vapidKey = fetched.key;
      }

      // 3. Subscribe with the dynamic VAPID public key
      const applicationServerKey = urlBase64ToUint8Array(vapidKey);
      const freshSub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey as unknown as BufferSource,
      });

      console.log('[PushManager] Successfully obtained fresh FCM Web Push subscription:');
      console.log(JSON.stringify(freshSub));
      return freshSub;
    } catch (err) {
      console.error('[PushManager] Failed to subscribe with VAPID key:', err);
      return null;
    }
  }

  /**
   * Syncs the fresh Web Push subscription to ThingsBoard USER and CUSTOMER SERVER_SCOPE attributes.
   * This allows ThingsBoard 24/7 rule chains to push alarms via Google FCM without device scoping.
   */
  public async syncSubscriptionWithThingsBoard(forceRefresh: boolean = false): Promise<{
    success: boolean;
    subscription?: any;
    endpoint?: string;
    vapidSource?: string;
    error?: string;
  }> {
    try {
      if (typeof window === 'undefined' || !('Notification' in window)) {
        return { success: false, error: 'Notifications not supported on this device' };
      }

      if (Notification.permission !== 'granted') {
        return { success: false, error: 'Notification permission is not granted' };
      }

      const token = thingsboard.getEffectiveToken();
      if (!token) {
        return { success: false, error: 'ThingsBoard user authentication token not available' };
      }

      // Dynamically retrieve VAPID key from running Python microservice
      const keyInfo = await fetchVapidPublicKey();

      const freshSub = await this.subscribeToPush(keyInfo.key, forceRefresh);
      if (!freshSub) {
        return { success: false, error: 'Failed to acquire push subscription from browser' };
      }

      const subJson = freshSub.toJSON ? freshSub.toJSON() : JSON.parse(JSON.stringify(freshSub));
      const subString = JSON.stringify(subJson);

      const attributesPayload = {
        push_subscription: subString,
        push_endpoint: freshSub.endpoint,
        push_p256dh: subJson.keys?.p256dh || '',
        push_auth: subJson.keys?.auth || '',
        push_vapid_key: keyInfo.key,
        push_vapid_source: keyInfo.endpoint,
        fcm_push_enabled: true,
        push_subscription_updated: Date.now(),
        push_user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : 'HUMID1-PWA',
      };

      // 1. Assign to USER SERVER_SCOPE attributes
      const userSaved = await thingsboard.saveUserServerAttributes(attributesPayload);

      // 2. Assign to CUSTOMER SERVER_SCOPE attributes (if user belongs to a customer)
      const customerSaved = await thingsboard.saveCustomerServerAttributes(attributesPayload);

      const success = userSaved || customerSaved;
      if (success) {
        try {
          localStorage.setItem(
            'humid1_fcm_sub_cache',
            JSON.stringify({
              endpoint: freshSub.endpoint,
              vapidSource: keyInfo.endpoint,
              syncedAt: Date.now(),
            })
          );
        } catch {
          // ignore
        }
      }

      return {
        success,
        subscription: subJson,
        endpoint: freshSub.endpoint,
        vapidSource: keyInfo.endpoint,
        error: success ? undefined : 'Failed saving attributes to ThingsBoard server',
      };
    } catch (err: any) {
      console.error('[PushManager] syncSubscriptionWithThingsBoard failed:', err);
      return { success: false, error: err?.message || String(err) };
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
    
    // Clean all unicode emojis and symbols from title, body, and device name
    const cleanTitle = stripEmojis(title);
    const cleanBody = stripEmojis(body);
    const cleanDevice = deviceName ? stripEmojis(deviceName) : undefined;

    // Use clean textual tags ([CRITICAL], [MAJOR], [WARNING], [INFO]) without emojis
    const severityTag = `[${severity}]`;
    const hasSeverity = cleanTitle.toUpperCase().includes(severityTag);
    const titleWithTag = hasSeverity ? cleanTitle : `${severityTag} ${cleanTitle}`;
    const formattedTitle = cleanDevice && !titleWithTag.includes(cleanDevice)
      ? `${titleWithTag} — ${cleanDevice}`
      : titleWithTag;

    const options: NotificationOptions = {
      body: cleanBody,
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

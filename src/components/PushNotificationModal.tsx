import React, { useState, useEffect } from 'react';
import {
  BellRing,
  X,
  ShieldCheck,
  Info,
  Check,
  AlertTriangle,
  RefreshCw,
  Copy,
  Radio,
  ExternalLink,
} from 'lucide-react';
import {
  pushNotifications,
  NotificationPermissionState,
} from '../services/pushNotifications';

interface PushNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenApiDiagnostics?: () => void;
}

export const PushNotificationModal: React.FC<PushNotificationModalProps> = ({
  isOpen,
  onClose,
  onOpenApiDiagnostics,
}) => {
  const [permission, setPermission] = useState<NotificationPermissionState>(
    pushNotifications.getPermission()
  );
  const [fcmSub, setFcmSub] = useState<any>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  useEffect(() => {
    return pushNotifications.subscribe((perm) => {
      setPermission((prev) => (prev === perm ? prev : perm));
    });
  }, []);

  useEffect(() => {
    if (isOpen && permission === 'granted') {
      pushNotifications.getPushSubscription().then((sub) => {
        if (sub) {
          setFcmSub(sub.toJSON ? sub.toJSON() : sub);
        }
      });
    }
  }, [isOpen, permission]);

  if (!isOpen) return null;

  const handleRequestPermission = async () => {
    const result = await pushNotifications.requestPermission();
    setPermission(result);
    if (result === 'granted') {
      handleSyncFcm();
    }
  };

  const handleSyncFcm = async () => {
    setIsSyncing(true);
    try {
      const res = await pushNotifications.syncSubscriptionWithThingsBoard(true);
      if (res.success) {
        setFcmSub(res.subscription);
        const deviceNote = (res as any).devicesSynced ? ` & ${(res as any).devicesSynced} device(s)` : '';
        setSyncStatus(
          `FCM token refreshed & synced to User${deviceNote}${
            res.vapidSource ? ` (via ${res.vapidSource})` : ''
          }`
        );
      } else {
        setSyncStatus(res.error || 'Failed saving attributes');
      }
    } catch (e: any) {
      setSyncStatus('Sync error: ' + (e.message || String(e)));
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncStatus(null), 5000);
    }
  };

  const handleCopyFcmJson = async () => {
    if (!fcmSub) return;
    const samplePayload = {
      subscription: fcmSub,
      title: 'HUMID1 Alert',
      body: 'Relative humidity threshold breached!',
    };
    try {
      await navigator.clipboard.writeText(JSON.stringify(samplePayload, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // ignore
    }
  };

  return (
    <div
      id="push-notifications-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-app-bg/80 backdrop-blur-md animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="push-modal-title"
    >
      <div className="bg-app-surface border border-app-border-highlight rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-app-border bg-app-bg/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-app-accent/10 text-app-accent border border-app-accent/20 shrink-0">
              <BellRing className="w-5 h-5" />
            </div>
            <div>
              <h3 id="push-modal-title" className="font-bold text-app-text-primary text-base font-display">
                Push Notifications
              </h3>
              <p className="text-xs text-app-text-secondary">Android TWA, Google FCM &amp; 24/7 Protection</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-app-text-secondary hover:text-app-text-primary hover:bg-app-surface-elevated transition cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Permission Status Banner */}
          <div className="bg-app-bg p-4 rounded-2xl border border-app-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1.5 flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold font-mono text-app-text-secondary uppercase tracking-wider">
                  Device Permission
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wide border inline-flex items-center gap-1 ${
                    permission === 'granted'
                      ? 'bg-app-status-nominal/20 text-app-status-nominal border-app-status-nominal/30'
                      : permission === 'denied'
                      ? 'bg-app-status-critical/20 text-app-status-critical border-app-status-critical/30'
                      : 'bg-app-accent/20 text-app-accent border-app-accent/30'
                  }`}
                >
                  {permission === 'granted' && <Check className="w-3 h-3" />}
                  {permission === 'denied' && <AlertTriangle className="w-3 h-3" />}
                  {permission}
                </span>
              </div>
              <p className="text-xs text-app-text-secondary leading-relaxed">
                {permission === 'granted'
                  ? 'Real-time climate breaches, temperature spikes, and low battery alarms are armed to notify your device.'
                  : permission === 'denied'
                  ? 'Notifications are blocked in system permissions. Please enable in Android Settings > Apps > HUMID1 > Notifications.'
                  : 'Grant notification permission to allow Google FCM and the Service Worker to dispatch alerts.'}
              </p>
            </div>

            {permission !== 'granted' && permission !== 'unsupported' && (
              <button
                id="grant-push-permission-btn"
                onClick={handleRequestPermission}
                className="px-4 py-2.5 rounded-xl bg-app-accent hover:bg-app-accent-hover text-app-accent-text text-xs font-bold transition shrink-0 cursor-pointer shadow-md active:scale-95 whitespace-nowrap"
              >
                Enable Notifications
              </button>
            )}
          </div>

          {/* Google FCM Web Push Cloud Sync */}
          {permission === 'granted' && (
            <div className="bg-app-bg p-4 rounded-2xl border border-app-border space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Radio className="w-4 h-4 text-app-accent" />
                  <span className="text-xs font-bold font-mono text-app-text-secondary uppercase tracking-wider">
                    24/7 ThingsBoard Attribute Sync
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {fcmSub && (
                    <button
                      onClick={handleCopyFcmJson}
                      className="px-2.5 py-1 rounded-lg bg-app-surface border border-app-border hover:bg-app-surface-elevated text-app-text-primary text-[11px] font-mono flex items-center gap-1 transition cursor-pointer"
                      title="Copy subscription JSON"
                    >
                      {copied ? <Check className="w-3 h-3 text-app-status-nominal" /> : <Copy className="w-3 h-3 text-app-accent" />}
                      {copied ? 'Copied' : 'Copy JSON'}
                    </button>
                  )}
                  <button
                    onClick={handleSyncFcm}
                    disabled={isSyncing}
                    className="px-2.5 py-1 rounded-lg bg-app-accent/15 hover:bg-app-accent/25 border border-app-accent/30 text-app-accent text-[11px] font-bold flex items-center gap-1 transition cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                    {isSyncing ? 'Syncing...' : 'Re-sync Token'}
                  </button>
                </div>
              </div>

              {syncStatus && (
                <div className="text-[11px] font-mono text-app-status-nominal bg-app-status-nominal/10 p-2 rounded-xl border border-app-status-nominal/20">
                  {syncStatus}
                </div>
              )}

              <p className="text-xs text-app-text-secondary leading-relaxed">
                A fresh FCM token is acquired dynamically and saved to your ThingsBoard <code className="text-app-accent font-mono text-[11px]">SERVER_SCOPE</code> attributes. ThingsBoard 24/7 rule chains route alerts to your device even when the dashboard is closed.
              </p>

              {fcmSub && (
                <div className="bg-app-surface/60 p-2.5 rounded-xl border border-app-border text-[10px] font-mono text-app-text-muted truncate">
                  <span className="text-app-text-secondary font-bold">Endpoint: </span>
                  {fcmSub.endpoint}
                </div>
              )}
            </div>
          )}

          {/* Architectural Explanation */}
          <div className="bg-app-bg/50 p-4 rounded-2xl border border-app-border space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-app-text-secondary font-mono uppercase tracking-wider">
              <Info className="w-4 h-4 text-app-accent" />
              <span>Active Tab &amp; Closed App Notifications</span>
            </div>
            <p className="text-xs text-app-text-secondary leading-relaxed">
              When an Android app or browser tab is completely closed or suspended by OS memory management:
            </p>
            <ul className="text-xs text-app-text-secondary space-y-2 list-disc list-inside pl-1">
              <li className="leading-relaxed">
                <strong className="text-app-text-primary">Active Tab Suppression:</strong> When you are actively focused on the dashboard tab, system tray push notifications are suppressed so you only hear the in-app alarm without dual alerts.
              </li>
              <li className="leading-relaxed">
                <strong className="text-app-text-primary">Closed / Background (24/7):</strong> When the app is minimized or closed, ThingsBoard triggers Google FCM via your microservice relay, instantly delivering alerts to your Android system notification tray.
              </li>
            </ul>
          </div>

          {/* Developer / Microservice diagnostics note */}
          {onOpenApiDiagnostics && (
            <div className="flex items-center justify-between p-3 rounded-2xl bg-app-surface/50 border border-app-border text-xs text-app-text-secondary">
              <span className="font-mono text-[11px]">Developer API &amp; Relay Diagnostics:</span>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenApiDiagnostics();
                }}
                className="text-app-accent hover:underline flex items-center gap-1 font-bold text-xs cursor-pointer"
              >
                <span>Open Relay Inspector</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-app-border bg-app-bg/70 flex items-center justify-between">
          <span className="text-[11px] text-app-text-muted font-mono flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-app-status-nominal" />
            Dynamic Key + ThingsBoard Relay Active
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-app-surface-elevated hover:bg-app-border-highlight text-app-text-primary text-xs font-bold transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

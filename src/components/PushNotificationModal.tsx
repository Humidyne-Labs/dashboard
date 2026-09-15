import React, { useState, useEffect } from 'react';
import {
  BellRing,
  X,
  ShieldCheck,
  Info,
  Check,
  AlertTriangle,
} from 'lucide-react';
import {
  pushNotifications,
  NotificationPermissionState,
} from '../services/pushNotifications';

interface PushNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PushNotificationModal: React.FC<PushNotificationModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [permission, setPermission] = useState<NotificationPermissionState>(
    pushNotifications.getPermission()
  );

  useEffect(() => {
    return pushNotifications.subscribe((perm) => {
      setPermission((prev) => (prev === perm ? prev : perm));
    });
  }, []);

  if (!isOpen) return null;

  const handleRequestPermission = async () => {
    const result = await pushNotifications.requestPermission();
    setPermission(result);
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
              <p className="text-xs text-app-text-secondary">Android TWA &amp; Real-time Climate Alerts</p>
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
                  ? 'Real-time climate breaches, temperature spikes, and low battery alarms are armed to vibrate and notify your device.'
                  : permission === 'denied'
                  ? 'Notifications are blocked in system permissions. Please enable in Android Settings > Apps > HUMID1 > Notifications.'
                  : 'Grant notification permission to allow the Service Worker to dispatch alerts to your Android notification tray.'}
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

          {/* Architectural Explanation */}
          <div className="bg-app-bg/50 p-4 rounded-2xl border border-app-border space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-app-text-secondary font-mono uppercase tracking-wider">
              <Info className="w-4 h-4 text-app-accent" />
              <span>Background &amp; Closed App Notifications</span>
            </div>
            <p className="text-xs text-app-text-secondary leading-relaxed">
              When an Android app or browser tab is completely closed or killed by OS memory management, client-side JavaScript execution halts. To ensure you never miss a humidor warning:
            </p>
            <ul className="text-xs text-app-text-secondary space-y-2 list-disc list-inside pl-1">
              <li className="leading-relaxed">
                <strong className="text-app-text-primary">Background Heartbeat:</strong> When minimized or the phone is locked, the dashboard continues background polling and triggers Service Worker notifications directly.
              </li>
              <li className="leading-relaxed">
                <strong className="text-app-text-primary">ThingsBoard Rule Engine (24/7):</strong> Your ESP32 hardware publishes directly to ThingsBoard (<code className="font-mono text-app-accent text-[11px]">app.humid1.com</code>). ThingsBoard evaluates thresholds on the cloud server and immediately sends Envelope / Email alerts or Web Push directly to your device without requiring the dashboard to be active.
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-app-border bg-app-bg/70 flex items-center justify-between">
          <span className="text-[11px] text-app-text-muted font-mono flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-app-status-nominal" />
            Service Worker Push + Workbox Active
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

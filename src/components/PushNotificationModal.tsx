import React, { useState, useEffect } from 'react';
import {
  BellRing,
  CheckCircle,
  Send,
  X,
  Smartphone,
  Activity,
  Cloud,
  ShieldCheck,
  Flame,
  Droplets,
  BatteryCharging,
  Info,
} from 'lucide-react';
import {
  pushNotifications,
  NotificationPermissionState,
} from '../services/pushNotifications';
import { thingsboard } from '../services/thingsboard';

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
  const [testSent, setTestSent] = useState<string | null>(null);

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

  const handleSendTest = async (severity: 'CRITICAL' | 'MAJOR' | 'WARNING') => {
    const success = await pushNotifications.sendTestAlert(severity);
    if (success) {
      setTestSent(`Manual ${severity}`);
      setTimeout(() => setTestSent(null), 3500);
    }
  };

  const handleSimulateHardwareBreach = (type: 'RH_CRITICAL' | 'TEMP_SPIKE' | 'BATTERY_LOW') => {
    const activeDevice = thingsboard.getDevices()[0];
    const deviceName = activeDevice?.name || 'HUMID1-CABINET-01';

    if (type === 'RH_CRITICAL') {
      pushNotifications.showNotification({
        title: 'CRITICAL RH BREACH',
        body: `${deviceName}: Humidity plunged to 61.4% (Threshold: 65.0%). Hydration reservoir dry or door ajar!`,
        severity: 'CRITICAL',
        deviceName,
        tag: `humid1-hardware-rh-${Date.now()}`,
      });
      setTestSent('Critical RH Breach');
    } else if (type === 'TEMP_SPIKE') {
      pushNotifications.showNotification({
        title: 'TEMPERATURE CEILING SPIKE',
        body: `${deviceName}: Temperature reached 78.4°F (Safe max: 75.0°F). Risk of tobacco beetle bloom.`,
        severity: 'MAJOR',
        deviceName,
        tag: `humid1-hardware-temp-${Date.now()}`,
      });
      setTestSent('Temp Ceiling Spike');
    } else {
      pushNotifications.showNotification({
        title: 'BATTERY RESERVE DEPLETED',
        body: `${deviceName}: Internal battery cell at 14%. Reconnect USB-C charging rail immediately.`,
        severity: 'WARNING',
        deviceName,
        tag: `humid1-hardware-bat-${Date.now()}`,
      });
      setTestSent('Low Battery');
    }
    setTimeout(() => setTestSent(null), 3500);
  };

  return (
    <div
      id="push-notifications-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-app-bg/80 backdrop-blur-md animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="push-modal-title"
    >
      <div className="bg-app-surface border border-app-border-highlight rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-app-border bg-app-bg/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-app-accent/10 text-app-accent border border-app-accent/20">
              <BellRing className="w-5 h-5" />
            </div>
            <div>
              <h3 id="push-modal-title" className="font-bold text-app-text-primary text-base font-display">
                Push Notifications &amp; Mobile Reliability
              </h3>
              <p className="text-xs text-app-text-secondary">Service Worker, Android TWA &amp; 24/7 Climate Protection</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-app-text-secondary hover:text-app-text-primary hover:bg-app-surface-elevated transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Permission Status Banner */}
          <div className="bg-app-bg p-4 rounded-2xl border border-app-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold font-mono text-app-text-secondary uppercase tracking-wider">
                  Android &amp; Browser Permission
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wide border ${
                    permission === 'granted'
                      ? 'bg-app-status-nominal/20 text-app-status-nominal border-app-status-nominal/30'
                      : permission === 'denied'
                      ? 'bg-app-status-critical/20 text-app-status-critical border-app-status-critical/30'
                      : 'bg-app-accent/20 text-app-accent border-app-accent/30'
                  }`}
                >
                  {permission}
                </span>
              </div>
              <p className="text-xs text-app-text-secondary">
                {permission === 'granted'
                  ? 'Real-time climate breaches, temperature spikes, and low battery alarms are armed to vibrate and notify your device.'
                  : permission === 'denied'
                  ? 'Notifications are blocked in browser / Android app permissions. Please enable in Android Settings > Apps > HUMID1 > Notifications.'
                  : 'Grant notification permission to allow the Service Worker to notify your Android notification tray.'}
              </p>
            </div>

            {permission !== 'granted' && permission !== 'unsupported' && (
              <button
                id="grant-push-permission-btn"
                onClick={handleRequestPermission}
                className="px-4 py-2 rounded-xl bg-app-accent hover:bg-app-accent-hover text-app-accent-text text-xs font-bold transition shrink-0 cursor-pointer shadow-md active:scale-95"
              >
                Enable Notifications
              </button>
            )}
          </div>

          {/* Operational States Overview */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold font-mono text-app-text-secondary uppercase tracking-wider">
              <Activity className="w-4 h-4 text-app-accent" />
              <span>Server-Authoritative Pure Relay Pipeline</span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
              <div className="p-3 rounded-2xl bg-app-bg border border-app-border space-y-1">
                <div className="flex items-center justify-between text-app-status-nominal font-bold">
                  <span>1. Rule Engine</span>
                  <span className="w-2 h-2 rounded-full bg-app-status-nominal animate-pulse" />
                </div>
                <div className="text-[11px] text-app-text-secondary">
                  ThingsBoard server evaluates telemetry and triggers alarms independently of the dashboard.
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-app-bg border border-app-border space-y-1">
                <div className="flex items-center justify-between text-app-accent font-bold">
                  <span>2. Client Relay</span>
                  <span className="w-2 h-2 rounded-full bg-app-accent" />
                </div>
                <div className="text-[11px] text-app-text-secondary">
                  Dashboard receives server alarms and relays them uninhibited to Android tray via Service Worker.
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-app-bg border border-app-border space-y-1">
                <div className="flex items-center justify-between text-app-status-info font-bold">
                  <span>3. Closed / Idle</span>
                  <Cloud className="w-3.5 h-3.5 text-app-status-info" />
                </div>
                <div className="text-[11px] text-app-text-secondary">
                  ThingsBoard server sends direct Email, Webhook, and Web Push notifications 24/7.
                </div>
              </div>
            </div>
          </div>

          {/* Simulate Hardware Error Telemetry */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-app-text-secondary font-mono uppercase tracking-wider">
                Test Client Notification Relay (Service Worker &amp; Tray)
              </h4>
              {testSent && (
                <span className="text-[11px] text-app-status-nominal font-mono flex items-center gap-1 animate-fadeIn">
                  <CheckCircle className="w-3.5 h-3.5" /> Dispatched: {testSent}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                disabled={permission !== 'granted'}
                onClick={() => handleSimulateHardwareBreach('RH_CRITICAL')}
                className="p-3.5 rounded-2xl bg-app-bg border border-app-status-critical/30 hover:border-app-status-critical/60 transition text-left space-y-1.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono font-bold text-app-status-critical flex items-center gap-1">
                    <Droplets className="w-3 h-3" /> RH CRITICAL
                  </span>
                  <Send className="w-3.5 h-3.5 text-app-status-critical group-hover:translate-x-0.5 transition" />
                </div>
                <div className="text-xs font-bold text-app-text-primary">RH &lt; 65% Drop</div>
                <div className="text-[11px] text-app-text-secondary">Simulates sensor reporting severe dry air breach</div>
              </button>

              <button
                disabled={permission !== 'granted'}
                onClick={() => handleSimulateHardwareBreach('TEMP_SPIKE')}
                className="p-3.5 rounded-2xl bg-app-bg border border-app-accent/30 hover:border-app-accent/60 transition text-left space-y-1.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono font-bold text-app-accent flex items-center gap-1">
                    <Flame className="w-3 h-3" /> TEMP SPIKE
                  </span>
                  <Send className="w-3.5 h-3.5 text-app-accent group-hover:translate-x-0.5 transition" />
                </div>
                <div className="text-xs font-bold text-app-text-primary">Temp &gt; 75°F Spike</div>
                <div className="text-[11px] text-app-text-secondary">Simulates cooling failure or thermal surge</div>
              </button>

              <button
                disabled={permission !== 'granted'}
                onClick={() => handleSimulateHardwareBreach('BATTERY_LOW')}
                className="p-3.5 rounded-2xl bg-app-bg border border-app-status-warning/30 hover:border-app-status-warning/60 transition text-left space-y-1.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono font-bold text-app-status-warning flex items-center gap-1">
                    <BatteryCharging className="w-3 h-3" /> LOW BATTERY
                  </span>
                  <Send className="w-3.5 h-3.5 text-app-status-warning group-hover:translate-x-0.5 transition" />
                </div>
                <div className="text-xs font-bold text-app-text-primary">Battery &lt; 20%</div>
                <div className="text-[11px] text-app-text-secondary">Simulates hardware power depletion warning</div>
              </button>
            </div>
          </div>

          {/* Architectural Explanation */}
          <div className="bg-app-bg/50 p-4 rounded-2xl border border-app-border space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-app-text-secondary font-mono uppercase">
              <Info className="w-4 h-4 text-app-accent" />
              <span>How Idle &amp; Closed App Notifications Work</span>
            </div>
            <p className="text-xs text-app-text-secondary leading-relaxed">
              When an Android app or browser tab is completely closed or killed by OS memory management, client-side JavaScript execution stops. To ensure you never miss a humidor warning:
            </p>
            <ul className="text-xs text-app-text-secondary space-y-1.5 list-disc list-inside pl-1">
              <li>
                <strong className="text-app-text-primary">Background Heartbeat:</strong> When minimized or phone is locked, the dashboard continues polling ThingsBoard every 20s and triggers Service Worker notifications.
              </li>
              <li>
                <strong className="text-app-text-primary">ThingsBoard Rule Engine (24/7):</strong> Your ESP32 hardware publishes directly to ThingsBoard (<code className="font-mono text-app-accent">app.humid1.com</code>). ThingsBoard evaluates thresholds on the cloud server and immediately sends Envelope / Email alerts or Web Push directly to your device without requiring the dashboard to be running.
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

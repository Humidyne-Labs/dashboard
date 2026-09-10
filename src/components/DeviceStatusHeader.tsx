import React, { useState, useEffect } from 'react';
import { HumidorDevice } from '../types';
import { thingsboard } from '../services/thingsboard';
import { pushNotifications, NotificationPermissionState } from '../services/pushNotifications';
import { notificationService, NotificationSettings } from '../services/notificationService';
import { 
  Wifi, 
  HardDrive, 
  Clock, 
  ChevronDown, 
  Trash2,
  MailCheck,
  MailX,
  BellRing,
  Volume2,
  VolumeX,
  Loader2,
} from 'lucide-react';

interface DeviceStatusHeaderProps {
  device: HumidorDevice;
  allDevices: HumidorDevice[];
  onSelectDevice: (deviceId: string) => void;
  onRemoveDevice?: () => void;
  onOpenPushModal?: () => void;
}

export const DeviceStatusHeader: React.FC<DeviceStatusHeaderProps> = ({
  device,
  allDevices,
  onSelectDevice,
  onRemoveDevice,
  onOpenPushModal,
}) => {
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
  const [pushPerm, setPushPerm] = useState<NotificationPermissionState>(
    pushNotifications.getPermission()
  );
  const [notifSettings, setNotifSettings] = useState<NotificationSettings>(
    notificationService.getSettings()
  );

  useEffect(() => {
    const unsubPush = pushNotifications.subscribe((perm) => {
      setPushPerm(perm);
    });
    const unsubSound = notificationService.subscribe((settings) => {
      setNotifSettings(settings);
    });
    return () => {
      unsubPush();
      unsubSound();
    };
  }, []);

  const emailAlertsEnabled = device.sharedAttributes?.email_alerts_enabled ?? true;
  const pushSoundEnabled = notifSettings.soundEnabled;

  const handleToggleEmailAlerts = async () => {
    if (isUpdatingEmail) return;
    setIsUpdatingEmail(true);
    try {
      await thingsboard.updateSharedAttributes(device.id, {
        email_alerts_enabled: !emailAlertsEnabled,
      });
    } catch (err) {
      console.warn('Failed to update email alert preference:', err);
    } finally {
      setIsUpdatingEmail(false);
    }
  };

  const handleTogglePushSound = () => {
    const next = !pushSoundEnabled;
    notificationService.updateSettings({ soundEnabled: next });
    if (next) {
      notificationService.playAlarmSound('WARNING');
    }
  };

  const handlePushClick = async () => {
    if (onOpenPushModal) {
      onOpenPushModal();
    } else {
      const result = await pushNotifications.requestPermission();
      setPushPerm(result);
    }
  };

  const getRssiVisual = (rssi: number) => {
    let quality = 'Weak';
    let color = 'text-app-status-critical';
    let bars = 1;

    if (rssi >= -55) {
      quality = 'Excellent';
      color = 'text-app-status-nominal';
      bars = 4;
    } else if (rssi >= -70) {
      quality = 'Good';
      color = 'text-app-accent';
      bars = 3;
    } else if (rssi >= -80) {
      quality = 'Fair';
      color = 'text-orange-400';
      bars = 2;
    }

    return (
      <div className="flex items-center gap-2" title={`Signal: ${rssi} dBm (${quality})`}>
        <div className="flex items-end gap-0.5 h-4">
          <div className={`w-1 rounded-xs ${bars >= 1 ? 'bg-app-status-nominal' : 'bg-slate-700'} h-1.5`} />
          <div className={`w-1 rounded-xs ${bars >= 2 ? (bars >= 3 ? 'bg-app-status-nominal' : 'bg-amber-400') : 'bg-slate-700'} h-2.5`} />
          <div className={`w-1 rounded-xs ${bars >= 3 ? (bars >= 4 ? 'bg-app-status-nominal' : 'bg-amber-400') : 'bg-slate-700'} h-3.5`} />
          <div className={`w-1 rounded-xs ${bars >= 4 ? 'bg-app-status-nominal' : 'bg-slate-700'} h-4.5`} />
        </div>
        <span className={`text-xs font-mono font-medium ${color}`}>
          {rssi} dBm
        </span>
      </div>
    );
  };

  const timeAgo = (ts: number) => {
    const diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  };

  const isPushActive = pushPerm === 'granted';

  return (
    <div className="space-y-3">
      {/* Row 1: Main Dropdown, Live Status Badge, Packet Ticker, and Remove Button */}
      <div className="bg-app-surface/90 border border-app-border rounded-2xl p-3.5 sm:p-4 shadow-xl shadow-black/20 backdrop-blur-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
        {/* Main Controls Group: Dropdown, Live Badge, Packet Ticker */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Main Dropdown Selector */}
          <div className="relative min-w-[200px] sm:min-w-[240px]">
            <select
              value={device.id}
              onChange={(e) => onSelectDevice(e.target.value)}
              className="w-full appearance-none bg-app-bg/90 border border-app-border-highlight hover:border-app-accent/60 rounded-xl px-4 py-2 pr-10 text-sm sm:text-base font-bold text-app-text-primary focus:outline-none focus:ring-2 focus:ring-amber-500/30 cursor-pointer transition-all shadow-inner"
            >
              {allDevices.map((d) => (
                <option key={d.id} value={d.id} className="bg-app-surface text-app-text-primary">
                  {d.name} {d.status === 'ONLINE' ? '🟢' : d.status === 'SLEEP' ? '⚪' : '🔴'}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-app-text-secondary absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Live Status Badge */}
          {device.status === 'ONLINE' ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-app-bg/60 text-emerald-300 border border-app-status-nominal/30 shadow-xs">
              <span className="h-2 w-2 rounded-full bg-app-status-nominal animate-pulse" />
              Live Telemetry
            </span>
          ) : device.status === 'SLEEP' ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-app-surface-elevated text-app-text-secondary border border-app-border-highlight">
              <span className="h-2 w-2 rounded-full bg-slate-400" />
              Deep Sleep (RTC)
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-app-bg/60 text-rose-300 border border-app-status-critical/30">
              <span className="h-2 w-2 rounded-full bg-app-status-critical" />
              Unreachable / Offline
            </span>
          )}

          {/* Packet Ticker */}
          <div className="flex items-center gap-1.5 text-xs text-app-text-secondary font-mono bg-app-bg/60 px-3 py-1.5 rounded-full border border-app-border shadow-xs">
            <Clock className="w-3.5 h-3.5 text-app-accent/90" />
            <span>Last Packet: {timeAgo(device.lastActivityTime)}</span>
          </div>
        </div>

        {/* Remove Badge / Action Button */}
        {onRemoveDevice && (
          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={onRemoveDevice}
              className="h-8.5 px-3 rounded-xl text-xs font-medium border border-app-status-critical/30 bg-app-status-critical/10 hover:bg-app-status-critical/20 text-rose-300 flex items-center gap-1.5 transition shadow-sm cursor-pointer"
              title="Remove or unclaim this humidor device"
            >
              <Trash2 className="w-3.5 h-3.5 text-app-status-critical" />
              <span>Remove Device</span>
            </button>
          </div>
        )}
      </div>

      {/* Row 2: Wi-Fi Badge and Notification Cluster (Positioned directly above hardware spec) */}
      <div className="bg-app-surface/80 border border-app-border/90 rounded-xl px-3.5 py-2.5 shadow-md backdrop-blur-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Wi-Fi & Signal Badge */}
        <div className="bg-app-bg/70 border border-app-border/90 rounded-xl px-3 py-1.5 flex items-center gap-3 w-fit">
          <div className="flex items-center gap-1.5 text-xs text-app-text-secondary">
            <Wifi className="w-3.5 h-3.5 text-app-status-info" />
            <span className="font-semibold truncate max-w-[140px]">{device.clientAttributes.ssid || 'Humidor-WiFi'}</span>
          </div>
          <div className="h-3.5 w-px bg-app-surface-elevated" />
          {getRssiVisual(device.telemetry.rssi)}
        </div>

        {/* Notification Cluster */}
        <div className="flex flex-wrap items-center gap-2">
          {/* 1. Push Alerts */}
          <button
            type="button"
            onClick={handlePushClick}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition cursor-pointer shadow-xs ${
              isPushActive
                ? 'bg-app-bg/60 hover:bg-amber-900/70 text-app-accent border-app-accent/30'
                : 'bg-app-bg hover:bg-app-surface-elevated text-app-text-secondary border-app-border hover:text-app-text-secondary'
            }`}
            title={`Web Push Notifications: ${isPushActive ? 'Active' : 'Click to configure/enable'}`}
          >
            <BellRing className={`w-3.5 h-3.5 ${isPushActive ? 'text-app-accent' : 'text-app-text-primary0'}`} />
            <span>{isPushActive ? 'Push: ON' : 'Push: Setup'}</span>
          </button>

          {/* 2. Email Alerts */}
          <button
            type="button"
            onClick={handleToggleEmailAlerts}
            disabled={isUpdatingEmail}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition cursor-pointer shadow-xs ${
              emailAlertsEnabled
                ? 'bg-app-bg/60 hover:bg-sky-900/70 text-app-status-info border-app-status-info/30'
                : 'bg-app-bg hover:bg-app-surface-elevated text-app-text-secondary border-app-border hover:text-app-text-secondary'
            }`}
            title={`ThingsBoard Email Alerts: ${emailAlertsEnabled ? 'Active' : 'Opted Out'}. Click to toggle.`}
          >
            {isUpdatingEmail ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-app-status-info" />
            ) : emailAlertsEnabled ? (
              <MailCheck className="w-3.5 h-3.5 text-app-status-info" />
            ) : (
              <MailX className="w-3.5 h-3.5 text-app-text-primary0" />
            )}
            <span>{emailAlertsEnabled ? 'Email: ON' : 'Email: OFF'}</span>
          </button>

          {/* 3. Audio Chimes */}
          <button
            type="button"
            onClick={handleTogglePushSound}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition cursor-pointer shadow-xs ${
              pushSoundEnabled
                ? 'bg-app-bg/60 hover:bg-amber-900/70 text-app-accent border-app-accent/30'
                : 'bg-app-bg hover:bg-app-surface-elevated text-app-text-secondary border-app-border hover:text-app-text-secondary'
            }`}
            title={`Push Alert Sound & Chimes: ${pushSoundEnabled ? 'Active' : 'Muted'}. Click to toggle.`}
          >
            {pushSoundEnabled ? (
              <Volume2 className="w-3.5 h-3.5 text-app-accent" />
            ) : (
              <VolumeX className="w-3.5 h-3.5 text-app-text-primary0" />
            )}
            <span>{pushSoundEnabled ? 'Sound: ON' : 'Sound: Muted'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};


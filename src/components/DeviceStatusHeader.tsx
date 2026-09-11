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
      color = 'text-app-status-warning';
      bars = 2;
    }

    return (
      <div className="flex items-center gap-2" title={`Signal: ${rssi} dBm (${quality})`}>
        <div className="flex items-end gap-0.5 h-4">
          <div className={`w-1 rounded-xs ${bars >= 1 ? 'bg-app-status-nominal' : 'bg-app-border'} h-1.5`} />
          <div className={`w-1 rounded-xs ${bars >= 2 ? (bars >= 3 ? 'bg-app-status-nominal' : 'bg-app-status-warning') : 'bg-app-border'} h-2.5`} />
          <div className={`w-1 rounded-xs ${bars >= 3 ? (bars >= 4 ? 'bg-app-status-nominal' : 'bg-app-status-warning') : 'bg-app-border'} h-3.5`} />
          <div className={`w-1 rounded-xs ${bars >= 4 ? 'bg-app-status-nominal' : 'bg-app-border'} h-4.5`} />
        </div>
        <span className={`text-xs font-mono font-medium ${color}`}>
          {rssi} dBm
        </span>
      </div>
    );
  };

  const timeAgo = (ts?: number) => {
    if (!ts || isNaN(ts) || ts <= 0) return 'Just now';
    const diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 0) return 'Just now';
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const isPushActive = pushPerm === 'granted';

  return (
    <div className="space-y-3">
      {/* Row 1: Main Dropdown, Live Status Badge, Packet Ticker, and Remove Button */}
      <div className="bg-app-surface/90 border border-app-border rounded-2xl p-3 sm:p-4 shadow-xl shadow-black/20 backdrop-blur-sm space-y-3 sm:space-y-0 sm:flex sm:items-center sm:justify-between sm:gap-3.5">
        {/* Main Controls Group: Dropdown, Live Badge, Packet Ticker */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3 flex-1">
          {/* Main Dropdown Selector */}
          <div className="relative w-full sm:w-auto sm:min-w-[240px]">
            <select
              value={device.id}
              onChange={(e) => onSelectDevice(e.target.value)}
              className="w-full appearance-none bg-app-bg/90 border border-app-border-highlight hover:border-app-accent/60 rounded-xl px-3.5 py-2 pr-10 text-sm sm:text-base font-bold text-app-text-primary focus:outline-none focus:ring-2 focus:ring-app-accent/30 cursor-pointer transition-all shadow-inner"
            >
              {allDevices.map((d) => (
                <option key={d.id} value={d.id} className="bg-app-surface text-app-text-primary">
                  {d.name} {d.status === 'ONLINE' ? '🟢' : d.status === 'SLEEP' ? '⚪' : '🔴'}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-app-text-secondary absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Status Badge & Packet Ticker */}
          <div className="flex items-center gap-2 flex-wrap justify-between sm:justify-start">
            {/* Live Status Badge */}
            {device.status === 'ONLINE' ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-app-bg/60 text-app-status-nominal border border-app-status-nominal/30 shadow-xs whitespace-nowrap">
                <span className="h-2 w-2 rounded bg-app-status-nominal animate-pulse" />
                Live Telemetry
              </span>
            ) : device.status === 'SLEEP' ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-app-surface-elevated text-app-text-secondary border border-app-border-highlight whitespace-nowrap">
                <span className="h-2 w-2 rounded bg-app-text-muted" />
                Deep Sleep (RTC)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-app-bg/60 text-app-status-critical border border-app-status-critical/30 whitespace-nowrap">
                <span className="h-2 w-2 rounded bg-app-status-critical" />
                Unreachable / Offline
              </span>
            )}

            {/* Packet Ticker */}
            <div className="flex items-center gap-1.5 text-xs text-app-text-secondary font-mono bg-app-bg/60 px-2.5 py-1.5 rounded-lg border border-app-border shadow-xs whitespace-nowrap">
              <Clock className="w-3.5 h-3.5 text-app-accent/90 shrink-0" />
              <span>Last Packet: {timeAgo(device.lastActivityTime)}</span>
            </div>
          </div>
        </div>

        {/* Remove Badge / Action Button */}
        {onRemoveDevice && (
          <div className="flex items-center justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-app-border/40 shrink-0">
            <button
              type="button"
              onClick={onRemoveDevice}
              className="w-full sm:w-auto h-8.5 px-3 rounded-xl text-xs font-medium border border-app-status-critical/30 bg-app-status-critical/10 hover:bg-app-status-critical/20 text-app-status-critical flex items-center justify-center gap-1.5 transition shadow-xs cursor-pointer whitespace-nowrap shrink-0"
              title="Remove or unclaim this humidor device"
            >
              <Trash2 className="w-3.5 h-3.5 text-app-status-critical shrink-0" />
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
                ? 'bg-app-bg/60 hover:bg-app-accent/20 text-app-accent border-app-accent/30'
                : 'bg-app-bg hover:bg-app-surface-elevated text-app-text-secondary border-app-border hover:text-app-text-secondary'
            }`}
            title={`Web Push Notifications: ${isPushActive ? 'Active' : 'Click to configure/enable'}`}
          >
            <BellRing className={`w-3.5 h-3.5 ${isPushActive ? 'text-app-accent' : 'text-app-text-muted'}`} />
            <span>{isPushActive ? 'Push: ON' : 'Push: Setup'}</span>
          </button>

          {/* 2. Email Alerts */}
          <button
            type="button"
            onClick={handleToggleEmailAlerts}
            disabled={isUpdatingEmail}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition cursor-pointer shadow-xs ${
              emailAlertsEnabled
                ? 'bg-app-bg/60 hover:bg-app-status-info/20 text-app-status-info border-app-status-info/30'
                : 'bg-app-bg hover:bg-app-surface-elevated text-app-text-secondary border-app-border hover:text-app-text-secondary'
            }`}
            title={`ThingsBoard Email Alerts: ${emailAlertsEnabled ? 'Active' : 'Opted Out'}. Click to toggle.`}
          >
            {isUpdatingEmail ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-app-status-info" />
            ) : emailAlertsEnabled ? (
              <MailCheck className="w-3.5 h-3.5 text-app-status-info" />
            ) : (
              <MailX className="w-3.5 h-3.5 text-app-text-muted" />
            )}
            <span>{emailAlertsEnabled ? 'Email: ON' : 'Email: OFF'}</span>
          </button>

          {/* 3. Audio Chimes */}
          <button
            type="button"
            onClick={handleTogglePushSound}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition cursor-pointer shadow-xs ${
              pushSoundEnabled
                ? 'bg-app-bg/60 hover:bg-app-accent/20 text-app-accent border-app-accent/30'
                : 'bg-app-bg hover:bg-app-surface-elevated text-app-text-secondary border-app-border hover:text-app-text-secondary'
            }`}
            title={`Push Alert Sound & Chimes: ${pushSoundEnabled ? 'Active' : 'Muted'}. Click to toggle.`}
          >
            {pushSoundEnabled ? (
              <Volume2 className="w-3.5 h-3.5 text-app-accent" />
            ) : (
              <VolumeX className="w-3.5 h-3.5 text-app-text-muted" />
            )}
            <span>{pushSoundEnabled ? 'Sound: ON' : 'Sound: Muted'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};


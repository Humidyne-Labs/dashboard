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
    let color = 'text-rose-400';
    let bars = 1;

    if (rssi >= -55) {
      quality = 'Excellent';
      color = 'text-emerald-400';
      bars = 4;
    } else if (rssi >= -70) {
      quality = 'Good';
      color = 'text-amber-400';
      bars = 3;
    } else if (rssi >= -80) {
      quality = 'Fair';
      color = 'text-orange-400';
      bars = 2;
    }

    return (
      <div className="flex items-center gap-2" title={`Signal: ${rssi} dBm (${quality})`}>
        <div className="flex items-end gap-0.5 h-4">
          <div className={`w-1 rounded-xs ${bars >= 1 ? 'bg-emerald-400' : 'bg-slate-700'} h-1.5`} />
          <div className={`w-1 rounded-xs ${bars >= 2 ? (bars >= 3 ? 'bg-emerald-400' : 'bg-amber-400') : 'bg-slate-700'} h-2.5`} />
          <div className={`w-1 rounded-xs ${bars >= 3 ? (bars >= 4 ? 'bg-emerald-400' : 'bg-amber-400') : 'bg-slate-700'} h-3.5`} />
          <div className={`w-1 rounded-xs ${bars >= 4 ? 'bg-emerald-400' : 'bg-slate-700'} h-4.5`} />
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
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 sm:p-4 shadow-xl shadow-black/20 backdrop-blur-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
        {/* Main Controls Group: Dropdown, Live Badge, Packet Ticker */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Main Dropdown Selector */}
          <div className="relative min-w-[200px] sm:min-w-[240px]">
            <select
              value={device.id}
              onChange={(e) => onSelectDevice(e.target.value)}
              className="w-full appearance-none bg-slate-950/90 border border-slate-700 hover:border-amber-500/60 rounded-xl px-4 py-2 pr-10 text-sm sm:text-base font-bold text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/30 cursor-pointer transition-all shadow-inner"
            >
              {allDevices.map((d) => (
                <option key={d.id} value={d.id} className="bg-slate-900 text-slate-100">
                  {d.name} {d.status === 'ONLINE' ? '🟢' : d.status === 'SLEEP' ? '⚪' : '🔴'}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Live Status Badge */}
          {device.status === 'ONLINE' ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-950/60 text-emerald-300 border border-emerald-500/30 shadow-xs">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              Live Telemetry
            </span>
          ) : device.status === 'SLEEP' ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
              <span className="h-2 w-2 rounded-full bg-slate-400" />
              Deep Sleep (RTC)
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-rose-950/60 text-rose-300 border border-rose-500/30">
              <span className="h-2 w-2 rounded-full bg-rose-400" />
              Unreachable / Offline
            </span>
          )}

          {/* Packet Ticker */}
          <div className="flex items-center gap-1.5 text-xs text-slate-300 font-mono bg-slate-950/60 px-3 py-1.5 rounded-full border border-slate-800 shadow-xs">
            <Clock className="w-3.5 h-3.5 text-amber-400/90" />
            <span>Last Packet: {timeAgo(device.lastActivityTime)}</span>
          </div>
        </div>

        {/* Remove Badge / Action Button */}
        {onRemoveDevice && (
          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={onRemoveDevice}
              className="h-8.5 px-3 rounded-xl text-xs font-medium border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 flex items-center gap-1.5 transition shadow-sm cursor-pointer"
              title="Remove or unclaim this humidor device"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>Remove Device</span>
            </button>
          </div>
        )}
      </div>

      {/* Row 2: Wi-Fi Badge and Notification Cluster (Positioned directly above hardware spec) */}
      <div className="bg-slate-900/80 border border-slate-800/90 rounded-xl px-3.5 py-2.5 shadow-md backdrop-blur-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Wi-Fi & Signal Badge */}
        <div className="bg-slate-950/70 border border-slate-800/90 rounded-xl px-3 py-1.5 flex items-center gap-3 w-fit">
          <div className="flex items-center gap-1.5 text-xs text-slate-300">
            <Wifi className="w-3.5 h-3.5 text-sky-400" />
            <span className="font-semibold truncate max-w-[140px]">{device.clientAttributes.ssid || 'Humidor-WiFi'}</span>
          </div>
          <div className="h-3.5 w-px bg-slate-800" />
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
                ? 'bg-amber-950/60 hover:bg-amber-900/70 text-amber-300 border-amber-500/30'
                : 'bg-slate-950 hover:bg-slate-850 text-slate-400 border-slate-800 hover:text-slate-300'
            }`}
            title={`Web Push Notifications: ${isPushActive ? 'Active' : 'Click to configure/enable'}`}
          >
            <BellRing className={`w-3.5 h-3.5 ${isPushActive ? 'text-amber-400' : 'text-slate-500'}`} />
            <span>{isPushActive ? 'Push: ON' : 'Push: Setup'}</span>
          </button>

          {/* 2. Email Alerts */}
          <button
            type="button"
            onClick={handleToggleEmailAlerts}
            disabled={isUpdatingEmail}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition cursor-pointer shadow-xs ${
              emailAlertsEnabled
                ? 'bg-sky-950/60 hover:bg-sky-900/70 text-sky-300 border-sky-500/30'
                : 'bg-slate-950 hover:bg-slate-850 text-slate-400 border-slate-800 hover:text-slate-300'
            }`}
            title={`ThingsBoard Email Alerts: ${emailAlertsEnabled ? 'Active' : 'Opted Out'}. Click to toggle.`}
          >
            {isUpdatingEmail ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-400" />
            ) : emailAlertsEnabled ? (
              <MailCheck className="w-3.5 h-3.5 text-sky-400" />
            ) : (
              <MailX className="w-3.5 h-3.5 text-slate-500" />
            )}
            <span>{emailAlertsEnabled ? 'Email: ON' : 'Email: OFF'}</span>
          </button>

          {/* 3. Audio Chimes */}
          <button
            type="button"
            onClick={handleTogglePushSound}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition cursor-pointer shadow-xs ${
              pushSoundEnabled
                ? 'bg-amber-950/60 hover:bg-amber-900/70 text-amber-300 border-amber-500/30'
                : 'bg-slate-950 hover:bg-slate-850 text-slate-400 border-slate-800 hover:text-slate-300'
            }`}
            title={`Push Alert Sound & Chimes: ${pushSoundEnabled ? 'Active' : 'Muted'}. Click to toggle.`}
          >
            {pushSoundEnabled ? (
              <Volume2 className="w-3.5 h-3.5 text-amber-400" />
            ) : (
              <VolumeX className="w-3.5 h-3.5 text-slate-500" />
            )}
            <span>{pushSoundEnabled ? 'Sound: ON' : 'Sound: Muted'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};


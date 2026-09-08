import React, { useState, useEffect } from 'react';
import { HumidorAlarm } from '../types';
import { thingsboard } from '../services/thingsboard';
import { alarmThresholdService, AlarmThresholds } from '../services/alarmThresholds';
import { notificationService, NotificationSettings } from '../services/notificationService';
import { 
  Bell, 
  BellRing,
  BellOff,
  Volume2,
  VolumeX,
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  ShieldAlert, 
  Check, 
  XCircle,
  Sliders,
  Trash2
} from 'lucide-react';

interface AlarmsFeedProps {
  alarms: HumidorAlarm[];
  onOpenThresholds?: () => void;
}

export const AlarmsFeed: React.FC<AlarmsFeedProps> = ({ alarms, onOpenThresholds }) => {
  const [thresholds, setThresholds] = useState<AlarmThresholds>(
    alarmThresholdService.getThresholds()
  );
  const [notifSettings, setNotifSettings] = useState<NotificationSettings>(
    notificationService.getSettings()
  );
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>(
    notificationService.getPermission()
  );
  const [isPurging, setIsPurging] = useState(false);
  const [isAckingAll, setIsAckingAll] = useState(false);
  const [isClearingAll, setIsClearingAll] = useState(false);
  const [purgeFeedback, setPurgeFeedback] = useState<string | null>(null);
  const [alarmFilter, setAlarmFilter] = useState<'ALL' | 'ACTIVE' | 'CLEARED'>('ALL');

  useEffect(() => {
    const unsubThresholds = alarmThresholdService.subscribe(setThresholds);
    const unsubNotifs = notificationService.subscribe((settings, perm) => {
      setNotifSettings(settings);
      setNotifPermission(perm);
    });
    return () => {
      unsubThresholds();
      unsubNotifs();
    };
  }, []);

  const handleTogglePush = async () => {
    if (notifPermission !== 'granted') {
      const res = await notificationService.requestPermission();
      if (res === 'granted') {
        notificationService.updateSettings({ pushEnabled: true });
      }
    } else {
      notificationService.updateSettings({ pushEnabled: !notifSettings.pushEnabled });
    }
  };

  const handleToggleSound = () => {
    notificationService.updateSettings({ soundEnabled: !notifSettings.soundEnabled });
    if (!notifSettings.soundEnabled) {
      notificationService.playAlarmSound('WARNING');
    }
  };

  const handlePurgeInactive = async () => {
    setIsPurging(true);
    setPurgeFeedback(null);
    try {
      const res = await thingsboard.clearInactiveAlarms(true);
      setPurgeFeedback(
        res.purgedCount > 0
          ? `Purged ${res.purgedCount} inactive/cleared alarm(s) from ThingsBoard server & local history`
          : 'Server alarm history is already completely clean (0 inactive alarms).'
      );
      setTimeout(() => setPurgeFeedback(null), 5000);
    } catch {
      setPurgeFeedback('Failed to purge server alarm records');
      setTimeout(() => setPurgeFeedback(null), 5000);
    } finally {
      setIsPurging(false);
    }
  };

  const handleAckAll = async () => {
    setIsAckingAll(true);
    try {
      const res = await thingsboard.acknowledgeAllAlarms();
      setPurgeFeedback(`Acknowledged ${res.ackedCount} alarm(s)`);
      setTimeout(() => setPurgeFeedback(null), 4000);
    } catch {
      setPurgeFeedback('Failed to acknowledge alarms');
      setTimeout(() => setPurgeFeedback(null), 4000);
    } finally {
      setIsAckingAll(false);
    }
  };

  const handleClearAllActive = async () => {
    setIsClearingAll(true);
    try {
      const res = await thingsboard.clearAllActiveAlarms();
      setPurgeFeedback(`Cleared ${res.clearedCount} active alarm(s)`);
      setTimeout(() => setPurgeFeedback(null), 4000);
    } catch {
      setPurgeFeedback('Failed to clear active alarms');
      setTimeout(() => setPurgeFeedback(null), 4000);
    } finally {
      setIsClearingAll(false);
    }
  };

  const getSeverityBadge = (severity: HumidorAlarm['severity']) => {
    switch (severity) {
      case 'CRITICAL':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-bold bg-rose-950/80 text-rose-400 border border-rose-500/40">
            <ShieldAlert className="w-3 h-3" />
            CRITICAL
          </span>
        );
      case 'MAJOR':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-bold bg-amber-950/80 text-amber-400 border border-amber-500/40">
            <AlertTriangle className="w-3 h-3" />
            MAJOR
          </span>
        );
      case 'WARNING':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-semibold bg-yellow-950/80 text-yellow-400 border border-yellow-500/40">
            <AlertTriangle className="w-3 h-3" />
            WARNING
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-semibold bg-blue-950/80 text-blue-400 border border-blue-500/40">
            INFO
          </span>
        );
    }
  };

  const activeAlarms = alarms.filter((a) => a.status.startsWith('ACTIVE'));
  const inactiveAlarms = alarms.filter((a) => !a.status.startsWith('ACTIVE'));
  const unackAlarms = alarms.filter((a) => a.status.endsWith('UNACK'));

  const displayedAlarms = alarms.filter((alarm) => {
    if (alarmFilter === 'ACTIVE') return alarm.status.startsWith('ACTIVE');
    if (alarmFilter === 'CLEARED') return !alarm.status.startsWith('ACTIVE');
    return true;
  });

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl backdrop-blur-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-5">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white tracking-wide">
              ThingsBoard Alarm & Anomaly Feed
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-400">
              Active climate boundary violations, power alerts & sensor triggers
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {/* Push Notification Toggle */}
          <button
            type="button"
            onClick={handleTogglePush}
            className={`px-3 py-1.5 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition cursor-pointer shadow-sm ${
              notifSettings.pushEnabled && notifPermission === 'granted'
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border-slate-700'
            }`}
            title={
              notifPermission !== 'granted'
                ? 'Click to grant browser push notification permissions for microclimate alarms'
                : notifSettings.pushEnabled
                ? 'Push notifications enabled - click to disable'
                : 'Push notifications disabled - click to enable'
            }
          >
            {notifSettings.pushEnabled && notifPermission === 'granted' ? (
              <BellRing className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
            ) : (
              <BellOff className="w-3.5 h-3.5 text-slate-400" />
            )}
            <span>
              {notifPermission !== 'granted'
                ? 'Enable Push Alerts'
                : notifSettings.pushEnabled
                ? 'Push Armed'
                : 'Push Muted'}
            </span>
          </button>

          {/* Sound Chime Toggle */}
          <button
            type="button"
            onClick={handleToggleSound}
            className={`px-2.5 py-1.5 rounded-xl border text-xs font-medium flex items-center gap-1 transition cursor-pointer shadow-sm ${
              notifSettings.soundEnabled
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-400 border-slate-700'
            }`}
            title={notifSettings.soundEnabled ? 'Alarm chimes enabled' : 'Alarm chimes muted'}
          >
            {notifSettings.soundEnabled ? (
              <Volume2 className="w-3.5 h-3.5 text-amber-400" />
            ) : (
              <VolumeX className="w-3.5 h-3.5 text-slate-400" />
            )}
          </button>

          {/* Purge All Inactive Alarms (Deletes all cleared records from ThingsBoard server) */}
          <button
            type="button"
            onClick={handlePurgeInactive}
            disabled={isPurging}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-950/60 text-slate-300 hover:text-rose-300 border border-slate-700 hover:border-rose-500/40 text-xs font-medium flex items-center gap-1.5 transition cursor-pointer shadow-sm disabled:opacity-50"
            title="Search ThingsBoard server for all cleared/resolved alarms and permanently delete them via DELETE /api/alarm/{id}"
          >
            <Trash2 className={`w-3.5 h-3.5 text-rose-400 ${isPurging ? 'animate-spin' : ''}`} />
            <span>{isPurging ? 'Purging Server...' : inactiveAlarms.length > 0 ? `Purge All Cleared (${inactiveAlarms.length})` : 'Purge Cleared (All)'}</span>
          </button>

          {onOpenThresholds && (
            <button
              type="button"
              onClick={onOpenThresholds}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-amber-200 border border-slate-700 text-xs font-medium flex items-center gap-1.5 transition cursor-pointer shadow-sm"
              title="Configure live alarm threshold constants"
            >
              <Sliders className="w-3.5 h-3.5 text-amber-400" />
              <span>Set Thresholds</span>
            </button>
          )}

          <span className="text-xs font-mono font-medium text-slate-400 bg-slate-950 px-2.5 py-1.5 rounded-xl border border-slate-800">
            {activeAlarms.length} Active
          </span>
        </div>
      </div>

      {purgeFeedback && (
        <div className="mb-3 p-2.5 bg-emerald-950/60 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{purgeFeedback}</span>
        </div>
      )}

      {/* Filter Tabs & Bulk Action Controls Bar */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => setAlarmFilter('ALL')}
            className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
              alarmFilter === 'ALL'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All ({alarms.length})
          </button>
          <button
            type="button"
            onClick={() => setAlarmFilter('ACTIVE')}
            className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
              alarmFilter === 'ACTIVE'
                ? 'bg-rose-950/80 text-rose-300 border border-rose-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Active ({activeAlarms.length})
          </button>
          <button
            type="button"
            onClick={() => setAlarmFilter('CLEARED')}
            className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
              alarmFilter === 'CLEARED'
                ? 'bg-slate-800 text-slate-200 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Cleared ({inactiveAlarms.length})
          </button>
        </div>

        {/* Secondary Bulk Actions: Ack All & Clear All */}
        <div className="flex items-center gap-1.5">
          {unackAlarms.length > 0 && (
            <button
              type="button"
              onClick={handleAckAll}
              disabled={isAckingAll}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-medium flex items-center gap-1 transition cursor-pointer border border-slate-700 disabled:opacity-50"
              title="Acknowledge all active unacknowledged alarms"
            >
              <Check className="w-3 h-3 text-emerald-400" />
              <span>{isAckingAll ? 'Acking...' : `Ack All (${unackAlarms.length})`}</span>
            </button>
          )}

          {activeAlarms.length > 0 && (
            <button
              type="button"
              onClick={handleClearAllActive}
              disabled={isClearingAll}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-medium flex items-center gap-1 transition cursor-pointer border border-slate-700 disabled:opacity-50"
              title="Transition all active alarms to cleared"
            >
              <XCircle className="w-3 h-3 text-rose-400" />
              <span>{isClearingAll ? 'Clearing...' : `Clear All Active (${activeAlarms.length})`}</span>
            </button>
          )}
        </div>
      </div>

      {/* Active Threshold Strip Banner */}
      <div className="mb-4 p-2.5 bg-slate-950/60 border border-slate-800/80 rounded-xl flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-slate-400">
        <div className="flex items-center gap-2">
          <span className="text-slate-500">RUNTIME LIMITS:</span>
          <span className="text-emerald-400">RH {thresholds.rhLowWarning}%–{thresholds.rhHighWarning}%</span>
          <span className="text-slate-600">•</span>
          <span className="text-rose-400">RH Critical &gt;{thresholds.rhHighCritical}%</span>
          <span className="text-slate-600 hidden xs:inline">•</span>
          <span className="text-sky-300 hidden xs:inline">Temp Critical &gt;{thresholds.tempHighCritical}°F</span>
        </div>
        {onOpenThresholds && (
          <button
            onClick={onOpenThresholds}
            className="text-amber-400 hover:text-amber-300 underline underline-offset-2 cursor-pointer"
          >
            Adjust
          </button>
        )}
      </div>

      {displayedAlarms.length > 0 ? (
        <div className="divide-y divide-slate-800/80 max-h-[320px] overflow-y-auto pr-1">
          {displayedAlarms.map((alarm) => {
            const isActive = alarm.status.startsWith('ACTIVE');
            const isUnack = alarm.status.endsWith('UNACK');

            return (
              <div key={alarm.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-start gap-2.5 sm:gap-3">
                  <div className="mt-0.5">{getSeverityBadge(alarm.severity)}</div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-100">{alarm.type}</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">{alarm.details?.message || 'Climate threshold violated'}</p>
                    <span className="text-[10px] font-mono text-slate-500 flex items-center gap-1 mt-1">
                      <Clock className="w-3 h-3" />
                      {new Date(alarm.createdTime).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <span
                    className={`text-[10px] sm:text-[11px] font-mono font-semibold px-2 py-0.5 rounded ${
                      isActive
                        ? 'bg-rose-950/60 text-rose-300 border border-rose-500/30'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {alarm.status}
                  </span>

                  {isUnack && (
                    <button
                      onClick={() => thingsboard.acknowledgeAlarm(alarm.id)}
                      title="Acknowledge Alarm"
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[10px] font-mono flex items-center gap-1 transition cursor-pointer border border-slate-700"
                    >
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span>Ack</span>
                    </button>
                  )}

                  {isActive && (
                    <button
                      onClick={() => thingsboard.clearAlarm(alarm.id)}
                      title="Clear Alarm"
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[10px] font-mono flex items-center gap-1 transition cursor-pointer border border-slate-700"
                    >
                      <XCircle className="w-3 h-3 text-rose-400" />
                      <span>Clear</span>
                    </button>
                  )}

                  {!isActive && (
                    <button
                      onClick={() => thingsboard.deleteAlarm(alarm.id)}
                      title="Permanently delete alarm entity from ThingsBoard server via REST API (DELETE /api/alarm/{id})"
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-rose-900/40 text-slate-400 hover:text-rose-300 text-[10px] font-mono flex items-center gap-1 transition cursor-pointer border border-slate-700 hover:border-rose-500/40"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Delete</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-7 sm:py-8 bg-slate-950/50 rounded-xl border border-slate-800/60 text-slate-400 text-xs flex flex-col items-center justify-center space-y-2">
          <CheckCircle2 className="w-7 h-7 sm:w-8 sm:h-8 text-emerald-400/80" />
          <p className="font-semibold text-slate-300">All Climates Nominal</p>
          <p className="text-[11px] text-slate-500">No active ThingsBoard threshold alarms triggered within configured envelope.</p>
        </div>
      )}
    </div>
  );
};

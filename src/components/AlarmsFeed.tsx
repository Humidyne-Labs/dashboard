import React, { useState, useEffect } from 'react';
import { HumidorAlarm, TempUnit } from '../types';
import { thingsboard } from '../services/thingsboard';
import { alarmThresholdService, AlarmThresholds, toDisplayTemp } from '../services/alarmThresholds';
import { 
  Bell, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  ShieldAlert, 
  Check, 
  XCircle, 
  Trash2 
} from 'lucide-react';

interface AlarmsFeedProps {
  alarms: HumidorAlarm[];
  tempUnit?: TempUnit;
}

export const AlarmsFeed: React.FC<AlarmsFeedProps> = ({ alarms, tempUnit = 'F' }) => {
  const [thresholds, setThresholds] = useState<AlarmThresholds>(
    alarmThresholdService.getThresholds()
  );
  const [isPurging, setIsPurging] = useState(false);
  const [isAckingAll, setIsAckingAll] = useState(false);
  const [isClearingAll, setIsClearingAll] = useState(false);
  const [purgeFeedback, setPurgeFeedback] = useState<string | null>(null);
  const [alarmFilter, setAlarmFilter] = useState<'ALL' | 'ACTIVE' | 'CLEARED'>('ALL');

  useEffect(() => {
    const unsubThresholds = alarmThresholdService.subscribe(setThresholds);
    return () => {
      unsubThresholds();
    };
  }, []);

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
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-bold bg-app-bg/80 text-app-status-critical border border-app-status-critical/40">
            <ShieldAlert className="w-3 h-3" />
            CRITICAL
          </span>
        );
      case 'MAJOR':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-bold bg-app-bg/80 text-app-accent border border-app-accent/40">
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
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-semibold bg-app-bg/80 text-app-status-info border border-app-status-info/40">
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
    <div className="bg-app-surface/90 border border-app-border rounded-2xl p-4 sm:p-6 shadow-xl backdrop-blur-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-5">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-app-status-critical/10 text-app-status-critical border border-app-status-critical/20">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white tracking-wide">
              ThingsBoard Alarm & Anomaly Feed
            </h3>
            <p className="text-[11px] sm:text-xs text-app-text-secondary">
              Active climate boundary violations, power alerts & sensor triggers
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {/* Purge All Inactive Alarms (Deletes all cleared records from ThingsBoard server) */}
          <button
            type="button"
            onClick={handlePurgeInactive}
            disabled={isPurging}
            className="px-3 py-1.5 rounded-xl bg-app-surface-elevated hover:bg-app-bg/60 text-app-text-secondary hover:text-rose-300 border border-app-border-highlight hover:border-app-status-critical/40 text-xs font-medium flex items-center gap-1.5 transition cursor-pointer shadow-sm disabled:opacity-50"
            title="Search ThingsBoard server for all cleared/resolved alarms and permanently delete them via DELETE /api/alarm/{id}"
          >
            <Trash2 className={`w-3.5 h-3.5 text-app-status-critical ${isPurging ? 'animate-spin' : ''}`} />
            <span>{isPurging ? 'Purging Server...' : inactiveAlarms.length > 0 ? `Purge All Cleared (${inactiveAlarms.length})` : 'Purge Cleared (All)'}</span>
          </button>

          <span className="text-xs font-mono font-medium text-app-text-secondary bg-app-bg px-2.5 py-1.5 rounded-xl border border-app-border">
            {activeAlarms.length} Active
          </span>
        </div>
      </div>

      {purgeFeedback && (
        <div className="mb-3 p-2.5 bg-app-bg/60 border border-app-status-nominal/30 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-app-status-nominal shrink-0" />
          <span>{purgeFeedback}</span>
        </div>
      )}

      {/* Filter Tabs & Bulk Action Controls Bar */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1 bg-app-bg p-1 rounded-xl border border-app-border text-xs">
          <button
            type="button"
            onClick={() => setAlarmFilter('ALL')}
            className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
              alarmFilter === 'ALL'
                ? 'bg-app-surface-elevated text-white shadow-sm'
                : 'text-app-text-secondary hover:text-app-text-primary'
            }`}
          >
            All ({alarms.length})
          </button>
          <button
            type="button"
            onClick={() => setAlarmFilter('ACTIVE')}
            className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
              alarmFilter === 'ACTIVE'
                ? 'bg-app-bg/80 text-rose-300 border border-app-status-critical/30 shadow-sm'
                : 'text-app-text-secondary hover:text-app-text-primary'
            }`}
          >
            Active ({activeAlarms.length})
          </button>
          <button
            type="button"
            onClick={() => setAlarmFilter('CLEARED')}
            className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
              alarmFilter === 'CLEARED'
                ? 'bg-app-surface-elevated text-app-text-primary shadow-sm'
                : 'text-app-text-secondary hover:text-app-text-primary'
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
              className="px-2.5 py-1 rounded-lg bg-app-surface-elevated hover:bg-app-border-highlight text-app-text-secondary hover:text-app-text-primary text-[11px] font-medium flex items-center gap-1 transition cursor-pointer border border-app-border-highlight disabled:opacity-50"
              title="Acknowledge all active unacknowledged alarms"
            >
              <Check className="w-3 h-3 text-app-status-nominal" />
              <span>{isAckingAll ? 'Acking...' : `Ack All (${unackAlarms.length})`}</span>
            </button>
          )}

          {activeAlarms.length > 0 && (
            <button
              type="button"
              onClick={handleClearAllActive}
              disabled={isClearingAll}
              className="px-2.5 py-1 rounded-lg bg-app-surface-elevated hover:bg-app-border-highlight text-app-text-secondary hover:text-app-text-primary text-[11px] font-medium flex items-center gap-1 transition cursor-pointer border border-app-border-highlight disabled:opacity-50"
              title="Transition all active alarms to cleared"
            >
              <XCircle className="w-3 h-3 text-app-status-critical" />
              <span>{isClearingAll ? 'Clearing...' : `Clear All Active (${activeAlarms.length})`}</span>
            </button>
          )}
        </div>
      </div>

      {/* Active Threshold Strip Banner */}
      <div className="mb-4 p-2.5 bg-app-bg/60 border border-app-border/80 rounded-xl flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-app-text-secondary">
        <div className="flex items-center gap-2">
          <span className="text-app-text-primary0">RUNTIME LIMITS:</span>
          <span className="text-app-status-nominal">RH {thresholds.rhLowWarning}%–{thresholds.rhHighWarning}%</span>
          <span className="text-app-text-muted">•</span>
          <span className="text-app-status-critical">RH Critical &gt;{thresholds.rhHighCritical}%</span>
          <span className="text-app-text-muted hidden xs:inline">•</span>
          <span className="text-app-status-info hidden xs:inline">Temp Critical &gt;{toDisplayTemp(thresholds.tempHighCritical, tempUnit)}°{tempUnit}</span>
        </div>
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
                    <h4 className="text-xs font-bold text-app-text-primary">{alarm.type}</h4>
                    <p className="text-[11px] text-app-text-secondary mt-0.5">{alarm.details?.message || 'Climate threshold violated'}</p>
                    <span className="text-[10px] font-mono text-app-text-primary0 flex items-center gap-1 mt-1">
                      <Clock className="w-3 h-3" />
                      {new Date(alarm.createdTime).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <span
                    className={`text-[10px] sm:text-[11px] font-mono font-semibold px-2 py-0.5 rounded ${
                      isActive
                        ? 'bg-app-bg/60 text-rose-300 border border-app-status-critical/30'
                        : 'bg-app-surface-elevated text-app-text-secondary'
                    }`}
                  >
                    {alarm.status}
                  </span>

                  {isUnack && (
                    <button
                      onClick={() => thingsboard.acknowledgeAlarm(alarm.id)}
                      title="Acknowledge Alarm"
                      className="px-2.5 py-1 rounded bg-app-surface-elevated hover:bg-app-border-highlight text-app-text-secondary hover:text-app-text-primary text-[10px] font-mono flex items-center gap-1 transition cursor-pointer border border-app-border-highlight"
                    >
                      <Check className="w-3 h-3 text-app-status-nominal" />
                      <span>Ack</span>
                    </button>
                  )}

                  {isActive && (
                    <button
                      onClick={() => thingsboard.clearAlarm(alarm.id)}
                      title="Clear Alarm"
                      className="px-2.5 py-1 rounded bg-app-surface-elevated hover:bg-app-border-highlight text-app-text-secondary hover:text-app-text-primary text-[10px] font-mono flex items-center gap-1 transition cursor-pointer border border-app-border-highlight"
                    >
                      <XCircle className="w-3 h-3 text-app-status-critical" />
                      <span>Clear</span>
                    </button>
                  )}

                  {!isActive && (
                    <button
                      onClick={() => thingsboard.deleteAlarm(alarm.id)}
                      title="Permanently delete alarm entity from ThingsBoard server via REST API (DELETE /api/alarm/{id})"
                      className="px-2 py-1 rounded bg-app-surface-elevated hover:bg-rose-900/40 text-app-text-secondary hover:text-rose-300 text-[10px] font-mono flex items-center gap-1 transition cursor-pointer border border-app-border-highlight hover:border-app-status-critical/40"
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
        <div className="text-center py-7 sm:py-8 bg-app-bg/50 rounded-xl border border-app-border/60 text-app-text-secondary text-xs flex flex-col items-center justify-center space-y-2">
          <CheckCircle2 className="w-7 h-7 sm:w-8 sm:h-8 text-app-status-nominal/80" />
          <p className="font-semibold text-app-text-secondary">All Climates Nominal</p>
          <p className="text-[11px] text-app-text-primary0">No active ThingsBoard threshold alarms triggered within configured envelope.</p>
        </div>
      )}
    </div>
  );
};

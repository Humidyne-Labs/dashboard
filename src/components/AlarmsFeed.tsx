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
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-semibold bg-app-status-warning/15 text-app-status-warning border border-app-status-warning/30">
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
      {/* Header Bar */}
      <div className="flex items-center justify-between gap-3 mb-4 sm:mb-5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 rounded-xl bg-app-status-critical/10 text-app-status-critical border border-app-status-critical/20 shrink-0">
            <Bell className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm sm:text-base font-bold text-app-text-primary tracking-wide truncate">
              ThingsBoard Alarm Feed
            </h3>
            <p className="text-[11px] sm:text-xs text-app-text-secondary truncate">
              Climate boundary violations &amp; sensor triggers
            </p>
          </div>
        </div>

        {/* Right-aligned Status Badge */}
        <div className="shrink-0">
          {activeAlarms.length > 0 ? (
            <span className="px-2.5 py-1 rounded-xl bg-app-status-critical/15 text-app-status-critical border border-app-status-critical/30 font-mono text-xs font-bold flex items-center gap-1.5 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-app-status-critical animate-pulse shrink-0" />
              <span>{activeAlarms.length} Active</span>
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-xl bg-app-status-nominal/15 text-app-status-nominal border border-app-status-nominal/30 font-mono text-xs font-bold flex items-center gap-1.5 shadow-xs">
              <Check className="w-3.5 h-3.5" />
              <span>0 Active</span>
            </span>
          )}
        </div>
      </div>

      {purgeFeedback && (
        <div className="mb-3 p-2.5 bg-app-bg/60 border border-app-status-nominal/30 rounded-xl text-app-status-nominal text-xs flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-app-status-nominal shrink-0" />
          <span>{purgeFeedback}</span>
        </div>
      )}

      {/* Filter Tabs & Action Controls Bar */}
      <div className="mb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        {/* Symmetrical 3-Way Filter Tabs */}
        <div className="grid grid-cols-3 sm:flex items-center gap-1 bg-app-bg p-1 rounded-xl border border-app-border text-xs w-full sm:w-auto text-center">
          <button
            type="button"
            onClick={() => setAlarmFilter('ALL')}
            className={`px-2.5 py-1.5 rounded-lg font-medium transition cursor-pointer text-center ${
              alarmFilter === 'ALL'
                ? 'bg-app-surface-elevated text-app-text-primary border border-app-border-highlight font-semibold shadow-xs'
                : 'text-app-text-secondary hover:text-app-text-primary'
            }`}
          >
            All ({alarms.length})
          </button>
          <button
            type="button"
            onClick={() => setAlarmFilter('ACTIVE')}
            className={`px-2.5 py-1.5 rounded-lg font-medium transition cursor-pointer text-center ${
              alarmFilter === 'ACTIVE'
                ? 'bg-app-bg/80 text-app-status-critical border border-app-status-critical/30 font-semibold shadow-xs'
                : 'text-app-text-secondary hover:text-app-text-primary'
            }`}
          >
            Active ({activeAlarms.length})
          </button>
          <button
            type="button"
            onClick={() => setAlarmFilter('CLEARED')}
            className={`px-2.5 py-1.5 rounded-lg font-medium transition cursor-pointer text-center ${
              alarmFilter === 'CLEARED'
                ? 'bg-app-surface-elevated text-app-text-primary border border-app-border-highlight font-semibold shadow-xs'
                : 'text-app-text-secondary hover:text-app-text-primary'
            }`}
          >
            Cleared ({inactiveAlarms.length})
          </button>
        </div>

        {/* Unified Action Controls Cluster */}
        <div className="flex items-center justify-between sm:justify-end gap-1.5 flex-wrap w-full sm:w-auto">
          {unackAlarms.length > 0 && (
            <button
              type="button"
              onClick={handleAckAll}
              disabled={isAckingAll}
              className="h-8 px-2.5 rounded-lg bg-app-surface-elevated hover:bg-app-border-highlight text-app-text-secondary hover:text-app-text-primary text-[11px] font-medium flex items-center justify-center gap-1 transition cursor-pointer border border-app-border-highlight disabled:opacity-50 flex-1 sm:flex-initial shadow-xs"
              title="Acknowledge all active unacknowledged alarms"
            >
              <Check className="w-3.5 h-3.5 text-app-status-nominal shrink-0" />
              <span>{isAckingAll ? 'Acking...' : `Ack (${unackAlarms.length})`}</span>
            </button>
          )}

          {activeAlarms.length > 0 && (
            <button
              type="button"
              onClick={handleClearAllActive}
              disabled={isClearingAll}
              className="h-8 px-2.5 rounded-lg bg-app-surface-elevated hover:bg-app-border-highlight text-app-text-secondary hover:text-app-text-primary text-[11px] font-medium flex items-center justify-center gap-1 transition cursor-pointer border border-app-border-highlight disabled:opacity-50 flex-1 sm:flex-initial shadow-xs"
              title="Transition all active alarms to cleared"
            >
              <XCircle className="w-3.5 h-3.5 text-app-status-critical shrink-0" />
              <span>{isClearingAll ? 'Clearing...' : `Clear (${activeAlarms.length})`}</span>
            </button>
          )}

          {/* Purge Cleared Button */}
          <button
            type="button"
            onClick={handlePurgeInactive}
            disabled={isPurging}
            className="h-8 px-2.5 rounded-lg bg-app-surface-elevated hover:bg-app-bg/60 text-app-text-secondary hover:text-app-status-critical border border-app-border-highlight hover:border-app-status-critical/40 text-[11px] font-medium flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs disabled:opacity-50 flex-1 sm:flex-initial"
            title="Search ThingsBoard server for all cleared/resolved alarms and permanently delete them via DELETE /api/alarm/{id}"
          >
            <Trash2 className={`w-3.5 h-3.5 text-app-status-critical shrink-0 ${isPurging ? 'animate-spin' : ''}`} />
            <span>{isPurging ? 'Purging...' : inactiveAlarms.length > 0 ? `Purge (${inactiveAlarms.length})` : 'Purge Cleared'}</span>
          </button>
        </div>
      </div>

      {/* Active Threshold Strip Banner */}
      <div className="mb-4 p-2.5 bg-app-bg/60 border border-app-border/80 rounded-xl flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-app-text-secondary">
        <div className="flex items-center gap-2">
          <span className="text-app-text-secondary">RUNTIME LIMITS:</span>
          <span className="text-app-status-nominal">RH {thresholds.rhLowWarning}%–{thresholds.rhHighWarning}%</span>
          <span className="text-app-text-muted">•</span>
          <span className="text-app-status-critical">RH Critical &gt;{thresholds.rhHighCritical}%</span>
          <span className="text-app-text-muted hidden xs:inline">•</span>
          <span className="text-app-status-info hidden xs:inline">Temp Critical &gt;{toDisplayTemp(thresholds.tempHighCritical, tempUnit)}°{tempUnit}</span>
        </div>
      </div>

      {displayedAlarms.length > 0 ? (
        <div className="divide-y divide-app-border/80 max-h-[320px] overflow-y-auto pr-1">
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
                    <span className="text-[10px] font-mono text-app-text-muted flex items-center gap-1 mt-1">
                      <Clock className="w-3 h-3" />
                      {new Date(alarm.createdTime).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <span
                    className={`text-[10px] sm:text-[11px] font-mono font-semibold px-2 py-0.5 rounded ${
                      isActive
                        ? 'bg-app-bg/60 text-app-status-critical border border-app-status-critical/30'
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
                      className="px-2 py-1 rounded bg-app-surface-elevated hover:bg-app-status-critical/20 text-app-text-secondary hover:text-app-status-critical text-[10px] font-mono flex items-center gap-1 transition cursor-pointer border border-app-border-highlight hover:border-app-status-critical/40"
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
          <p className="text-[11px] text-app-text-muted">No active ThingsBoard threshold alarms triggered within configured envelope.</p>
        </div>
      )}
    </div>
  );
};

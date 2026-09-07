import React, { useState, useEffect } from 'react';
import { HumidorAlarm } from '../types';
import { thingsboard } from '../services/thingsboard';
import { alarmThresholdService, AlarmThresholds } from '../services/alarmThresholds';
import { 
  Bell, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  ShieldAlert, 
  Check, 
  XCircle,
  Sliders,
  Sparkles,
  Info,
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

  useEffect(() => {
    const unsub = alarmThresholdService.subscribe(setThresholds);
    return unsub;
  }, []);

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
          {inactiveAlarms.length > 0 && (
            <button
              type="button"
              onClick={() => thingsboard.clearInactiveAlarms()}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-medium flex items-center gap-1.5 transition cursor-pointer shadow-sm"
              title="Purge all resolved/cleared alarms from history"
            >
              <Trash2 className="w-3.5 h-3.5 text-slate-400" />
              <span>Clear Inactive ({inactiveAlarms.length})</span>
            </button>
          )}

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

      {alarms.length > 0 ? (
        <div className="divide-y divide-slate-800/80 max-h-[320px] overflow-y-auto pr-1">
          {alarms.map((alarm) => {
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

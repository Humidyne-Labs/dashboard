import React, { useState, useEffect } from 'react';
import {
  X,
  Sliders,
  RotateCcw,
  Check,
  AlertTriangle,
  Droplets,
  Thermometer,
  Battery,
  Sparkles,
  Info,
  ShieldCheck,
  UploadCloud,
} from 'lucide-react';
import {
  alarmThresholdService,
  AlarmThresholds,
  DEFAULT_THRESHOLDS,
  THRESHOLD_PRESETS,
} from '../services/alarmThresholds';
import { thingsboard } from '../services/thingsboard';
import { HumidorDevice, TempUnit } from '../types';

interface AlarmThresholdsModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeDevice?: HumidorDevice | null;
  tempUnit?: TempUnit;
}

export const AlarmThresholdsModal: React.FC<AlarmThresholdsModalProps> = ({
  isOpen,
  onClose,
  activeDevice,
  tempUnit = 'F',
}) => {
  const [thresholds, setThresholds] = useState<AlarmThresholds>(
    alarmThresholdService.getThresholds()
  );
  const [isSaved, setIsSaved] = useState(false);
  const [isSyncingWithDevice, setIsSyncingWithDevice] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setThresholds(alarmThresholdService.getThresholds());
      setIsSaved(false);
      setSyncStatus(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleChange = (key: keyof AlarmThresholds, value: number) => {
    setThresholds((prev) => ({
      ...prev,
      [key]: value,
    }));
    setIsSaved(false);
  };

  const handleApplyPreset = (presetId: string) => {
    const preset = THRESHOLD_PRESETS.find((p) => p.id === presetId);
    if (preset) {
      setThresholds({ ...preset.thresholds });
      setIsSaved(false);
    }
  };

  const handleResetDefaults = () => {
    setThresholds({ ...DEFAULT_THRESHOLDS });
    setIsSaved(false);
  };

  const handleSave = async () => {
    alarmThresholdService.saveThresholds(thresholds);
    setIsSaved(true);

    // If active device is connected, also push to ThingsBoard shared attributes
    if (activeDevice && !thingsboard.isDemoMode()) {
      setIsSyncingWithDevice(true);
      try {
        await thingsboard.updateSharedAttributes(activeDevice.id, {
          alarm_thresholds: thresholds,
          target_rh: thresholds.rhTarget,
          target_temp: thresholds.tempTarget,
        });
        setSyncStatus('Synced to Hardware RTC & ThingsBoard shared attributes');
      } catch (err: any) {
        console.warn('Could not sync thresholds to hardware:', err);
        setSyncStatus('Saved locally (device offline or permissions restricted)');
      } finally {
        setIsSyncingWithDevice(false);
      }
    } else {
      setSyncStatus('Saved to active dashboard runtime profile');
    }

    setTimeout(() => {
      setIsSaved(false);
    }, 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl shadow-black/80 flex flex-col relative">
        {/* Header */}
        <div className="sticky top-0 bg-slate-900/95 backdrop-blur-sm p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide">
                Runtime Alarm & Climate Thresholds
              </h2>
              <p className="text-xs text-slate-400">
                Configure live alert triggers, safe envelope bands & mold warnings
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-6 text-slate-300">
          {/* Presets Quick Picker */}
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">
              Standard Blend Presets
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {THRESHOLD_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleApplyPreset(preset.id)}
                  className="p-3 rounded-xl border border-slate-800 bg-slate-950/60 hover:bg-slate-800/80 hover:border-amber-500/40 text-left transition cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-200 group-hover:text-amber-300">
                      {preset.name}
                    </span>
                    <Sparkles className="w-3.5 h-3.5 text-amber-400 opacity-60 group-hover:opacity-100" />
                  </div>
                  <p className="text-[11px] text-slate-400 leading-snug line-clamp-2">
                    {preset.description}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Relative Humidity Envelope */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-300">
                <Droplets className="w-4 h-4 text-amber-400" />
                <span>Relative Humidity (RH %) Thresholds</span>
              </div>
              <span className="text-[11px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                Optimal: {thresholds.rhLowWarning}% – {thresholds.rhHighWarning}%
              </span>
            </div>

            {/* Visual Color Spectrum Bar */}
            <div className="space-y-1.5">
              <div className="h-3 w-full rounded-full bg-slate-800 flex overflow-hidden border border-slate-700/60 text-[9px] font-mono">
                <div
                  style={{ width: `${Math.max(10, thresholds.rhLowCritical)}%` }}
                  className="bg-blue-600/80"
                  title="Critically Dry Zone"
                />
                <div
                  style={{ width: `${Math.max(5, thresholds.rhLowWarning - thresholds.rhLowCritical)}%` }}
                  className="bg-sky-500/70"
                  title="Dry Warning Zone"
                />
                <div
                  style={{ width: `${Math.max(10, thresholds.rhHighWarning - thresholds.rhLowWarning)}%` }}
                  className="bg-emerald-500/80"
                  title="Optimal Sweet Spot"
                />
                <div
                  style={{ width: `${Math.max(5, thresholds.rhHighCritical - thresholds.rhHighWarning)}%` }}
                  className="bg-amber-500/80"
                  title="Humid Warning Zone"
                />
                <div
                  className="bg-rose-500/80 flex-1"
                  title="Mold Hazard Zone"
                />
              </div>
              <div className="flex justify-between text-[10px] font-mono text-slate-500">
                <span>{thresholds.rhLowCritical}% (Critical Dry)</span>
                <span className="text-emerald-400 font-bold">{thresholds.rhTarget}% (Target)</span>
                <span className="text-rose-400 font-bold">{thresholds.rhHighCritical}% (Mold Risk)</span>
              </div>
            </div>

            {/* Sliders Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Low Critical Alert (Below)</span>
                  <span className="font-mono font-bold text-blue-400">{thresholds.rhLowCritical}%</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="65"
                  step="0.5"
                  value={thresholds.rhLowCritical}
                  onChange={(e) => handleChange('rhLowCritical', Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Low Warning (Below)</span>
                  <span className="font-mono font-bold text-sky-300">{thresholds.rhLowWarning}%</span>
                </div>
                <input
                  type="range"
                  min="60"
                  max="68"
                  step="0.5"
                  value={thresholds.rhLowWarning}
                  onChange={(e) => handleChange('rhLowWarning', Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">High Warning (Above)</span>
                  <span className="font-mono font-bold text-amber-400">{thresholds.rhHighWarning}%</span>
                </div>
                <input
                  type="range"
                  min="70"
                  max="78"
                  step="0.5"
                  value={thresholds.rhHighWarning}
                  onChange={(e) => handleChange('rhHighWarning', Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">High Critical Mold Alert (Above)</span>
                  <span className="font-mono font-bold text-rose-400">{thresholds.rhHighCritical}%</span>
                </div>
                <input
                  type="range"
                  min="73"
                  max="85"
                  step="0.5"
                  value={thresholds.rhHighCritical}
                  onChange={(e) => handleChange('rhHighCritical', Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
                />
              </div>
            </div>
          </div>

          {/* Temperature & Battery Thresholds */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Temperature Limits */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-sky-300">
                <Thermometer className="w-4 h-4 text-sky-400" />
                <span>Temperature (°F) Limits</span>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Slow Aging Warning (Below)</span>
                  <span className="font-mono font-bold text-blue-300">{thresholds.tempLowWarning}°F</span>
                </div>
                <input
                  type="range"
                  min="55"
                  max="66"
                  step="1"
                  value={thresholds.tempLowWarning}
                  onChange={(e) => handleChange('tempLowWarning', Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-400"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Beetle Hazard Alert (Above)</span>
                  <span className="font-mono font-bold text-rose-400">{thresholds.tempHighCritical}°F</span>
                </div>
                <input
                  type="range"
                  min="70"
                  max="80"
                  step="1"
                  value={thresholds.tempHighCritical}
                  onChange={(e) => handleChange('tempHighCritical', Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
                />
              </div>
              <p className="text-[10px] text-slate-500 leading-tight">
                Tobacco beetle larvae hatch and bore through wrappers at persistent temperatures above 74°F (23.3°C).
              </p>
            </div>

            {/* Battery Limits */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-300">
                <Battery className="w-4 h-4 text-emerald-400" />
                <span>Hardware LiPo Battery Alert</span>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Low Battery Alarm (Below)</span>
                  <span className="font-mono font-bold text-amber-400">{thresholds.batteryLowCritical}%</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="35"
                  step="5"
                  value={thresholds.batteryLowCritical}
                  onChange={(e) => handleChange('batteryLowCritical', Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
              </div>

              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-400 space-y-1">
                <div className="flex items-center gap-1.5 text-slate-300 font-medium">
                  <Info className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>ESP32 Brownout Safety</span>
                </div>
                <p>
                  Alerts will trigger in ThingsBoard when LiPo discharge reaches this threshold to prevent ungraceful RTC resets.
                </p>
              </div>
            </div>
          </div>

          {/* Sync Status Banner */}
          {syncStatus && (
            <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{syncStatus}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-slate-900/95 backdrop-blur-sm p-4 sm:p-5 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 z-10">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-700/60 transition cursor-pointer self-start sm:self-auto"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Factory Defaults</span>
          </button>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSyncingWithDevice}
              className="flex-1 sm:flex-none px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-amber-950/40 transition-all cursor-pointer disabled:opacity-50"
            >
              {isSyncingWithDevice ? (
                <>
                  <UploadCloud className="w-3.5 h-3.5 animate-pulse" />
                  <span>Syncing...</span>
                </>
              ) : isSaved ? (
                <>
                  <Check className="w-3.5 h-3.5 text-slate-950" />
                  <span>Applied & Saved!</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Save & Apply Thresholds</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

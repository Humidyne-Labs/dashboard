import React, { useState, useEffect } from 'react';
import {
  X,
  Sliders,
  RotateCcw,
  Check,
  Droplets,
  Thermometer,
  Battery,
  Sparkles,
  ShieldCheck,
  UploadCloud,
  SlidersHorizontal,
} from 'lucide-react';
import {
  alarmThresholdService,
  AlarmThresholds,
  DEFAULT_THRESHOLDS,
  THRESHOLD_PRESETS,
  toDisplayTemp,
  fromDisplayTemp,
  toDisplayDelta,
  fromDisplayDelta,
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

  const handleApplyPreset = (presetId: 'sensitive' | 'normal' | 'relaxed') => {
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
    // 1. Persist to local runtime storage
    alarmThresholdService.saveThresholds(thresholds);
    setIsSaved(true);

    // 2. Synchronize to ThingsBoard shared attributes (clean schema, no redundant keys)
    if (activeDevice && !thingsboard.isDemoMode()) {
      setIsSyncingWithDevice(true);
      try {
        await thingsboard.updateSharedAttributes(activeDevice.id, {
          alarm_thresholds: {
            rhLowCritical: thresholds.rhLowCritical,
            rhLowWarning: thresholds.rhLowWarning,
            rhHighWarning: thresholds.rhHighWarning,
            rhHighCritical: thresholds.rhHighCritical,

            tempLowCritical: thresholds.tempLowCritical,
            tempLowWarning: thresholds.tempLowWarning,
            tempHighWarning: thresholds.tempHighWarning,
            tempHighCritical: thresholds.tempHighCritical,

            batteryLowCritical: thresholds.batteryLowCritical,
            batteryLowWarning: thresholds.batteryLowWarning,

            rhHist: thresholds.rhHist,
            tempHist: thresholds.tempHist,
            battHist: thresholds.battHist,
          },
        });
        setSyncStatus('Synced to ThingsBoard shared attributes & device RTC');
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

  // Temperature display values according to active unit (F or C)
  const dispTempLowCritical = toDisplayTemp(thresholds.tempLowCritical, tempUnit);
  const dispTempLowWarning = toDisplayTemp(thresholds.tempLowWarning, tempUnit);
  const dispTempHighWarning = toDisplayTemp(thresholds.tempHighWarning, tempUnit);
  const dispTempHighCritical = toDisplayTemp(thresholds.tempHighCritical, tempUnit);
  const dispTempHist = toDisplayDelta(thresholds.tempHist, tempUnit);

  // Dynamic slider bounds depending on F vs C
  const tempMinSlider = tempUnit === 'C' ? 10 : 50;
  const tempMaxSlider = tempUnit === 'C' ? 32 : 90;
  const tempHistMaxSlider = tempUnit === 'C' ? 3.0 : 5.0;

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
                Runtime Alarm Thresholds & Hysteresis
              </h2>
              <p className="text-xs text-slate-400">
                Configure threshold alert limits, safe envelopes & reset hysteresis zones
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
          {/* Notification Sensitivity Presets */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Notification Sensitivity Presets
              </span>
              <span className="text-[11px] font-mono text-amber-400/80">
                Quick Level Switcher
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {THRESHOLD_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleApplyPreset(preset.id)}
                  className="p-3 rounded-xl border border-slate-800 bg-slate-950/60 hover:bg-slate-800/80 hover:border-amber-500/40 text-left transition cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-200 group-hover:text-amber-300 capitalize">
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

          {/* 1. Relative Humidity (RH %) Thresholds */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-300">
                <Droplets className="w-4 h-4 text-amber-400" />
                <span>Relative Humidity (RH %) Thresholds</span>
              </div>
              <span className="text-[11px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                Safe Envelope: {thresholds.rhLowWarning}%–{thresholds.rhHighWarning}%
              </span>
            </div>

            {/* Visual Color Spectrum Bar */}
            <div className="space-y-1.5">
              <div className="h-3 w-full rounded-full bg-slate-800 flex overflow-hidden border border-slate-700/60 text-[9px] font-mono">
                <div
                  style={{ width: `${Math.max(8, thresholds.rhLowCritical)}%` }}
                  className="bg-blue-600/80"
                  title="Critical Low Zone"
                />
                <div
                  style={{ width: `${Math.max(4, thresholds.rhLowWarning - thresholds.rhLowCritical)}%` }}
                  className="bg-sky-500/70"
                  title="Low Warning Zone"
                />
                <div
                  style={{ width: `${Math.max(8, thresholds.rhHighWarning - thresholds.rhLowWarning)}%` }}
                  className="bg-emerald-500/80"
                  title="Optimal Safe Zone"
                />
                <div
                  style={{ width: `${Math.max(4, thresholds.rhHighCritical - thresholds.rhHighWarning)}%` }}
                  className="bg-amber-500/80"
                  title="High Warning Zone"
                />
                <div
                  className="bg-rose-500/80 flex-1"
                  title="Critical High Zone"
                />
              </div>
              <div className="flex justify-between text-[10px] font-mono text-slate-500">
                <span>{thresholds.rhLowCritical}% (Low Crit)</span>
                <span className="text-sky-300 font-bold">{thresholds.rhLowWarning}% (Low Warn)</span>
                <span className="text-amber-400 font-bold">{thresholds.rhHighWarning}% (High Warn)</span>
                <span className="text-rose-400 font-bold">{thresholds.rhHighCritical}% (High Crit)</span>
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
                  <span className="text-slate-400">High Critical Alert (Above)</span>
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

          {/* 2. Temperature Thresholds (Auto-scales °F / °C) */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-sky-300">
                <Thermometer className="w-4 h-4 text-sky-400" />
                <span>Temperature (°{tempUnit}) Thresholds</span>
              </div>
              <span className="text-[11px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                Safe Envelope: {dispTempLowWarning}°–{dispTempHighWarning}°{tempUnit}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Low Critical Alert (Below)</span>
                  <span className="font-mono font-bold text-blue-400">{dispTempLowCritical}°{tempUnit}</span>
                </div>
                <input
                  type="range"
                  min={tempMinSlider}
                  max={tempMaxSlider}
                  step="0.5"
                  value={dispTempLowCritical}
                  onChange={(e) => handleChange('tempLowCritical', fromDisplayTemp(Number(e.target.value), tempUnit))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Low Warning (Below)</span>
                  <span className="font-mono font-bold text-sky-300">{dispTempLowWarning}°{tempUnit}</span>
                </div>
                <input
                  type="range"
                  min={tempMinSlider}
                  max={tempMaxSlider}
                  step="0.5"
                  value={dispTempLowWarning}
                  onChange={(e) => handleChange('tempLowWarning', fromDisplayTemp(Number(e.target.value), tempUnit))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">High Warning (Above)</span>
                  <span className="font-mono font-bold text-amber-400">{dispTempHighWarning}°{tempUnit}</span>
                </div>
                <input
                  type="range"
                  min={tempMinSlider}
                  max={tempMaxSlider}
                  step="0.5"
                  value={dispTempHighWarning}
                  onChange={(e) => handleChange('tempHighWarning', fromDisplayTemp(Number(e.target.value), tempUnit))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">High Critical Alert (Above)</span>
                  <span className="font-mono font-bold text-rose-400">{dispTempHighCritical}°{tempUnit}</span>
                </div>
                <input
                  type="range"
                  min={tempMinSlider}
                  max={tempMaxSlider}
                  step="0.5"
                  value={dispTempHighCritical}
                  onChange={(e) => handleChange('tempHighCritical', fromDisplayTemp(Number(e.target.value), tempUnit))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
                />
              </div>
            </div>
          </div>

          {/* 3. Battery Thresholds */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-300">
                <Battery className="w-4 h-4 text-emerald-400" />
                <span>Battery Level (%) Thresholds</span>
              </div>
              <span className="text-[11px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                Hardware LiPo
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Low Battery Warning (Below)</span>
                  <span className="font-mono font-bold text-amber-400">{thresholds.batteryLowWarning}%</span>
                </div>
                <input
                  type="range"
                  min="15"
                  max="45"
                  step="1"
                  value={thresholds.batteryLowWarning}
                  onChange={(e) => handleChange('batteryLowWarning', Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Critical Battery Alert (Below)</span>
                  <span className="font-mono font-bold text-rose-400">{thresholds.batteryLowCritical}%</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="25"
                  step="1"
                  value={thresholds.batteryLowCritical}
                  onChange={(e) => handleChange('batteryLowCritical', Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
                />
              </div>
            </div>
          </div>

          {/* 4. Hysteresis Reset Zones (0 to 5.0) */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-300">
                <SlidersHorizontal className="w-4 h-4 text-purple-400" />
                <span>Hysteresis Deactivation Zones (0 – 5.0)</span>
              </div>
              <span className="text-[11px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                Alert Clear Offset
              </span>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              When an alarm threshold is broken, the alert remains active until telemetry transitions back past the threshold by this hysteresis buffer, preventing rapid on/off alert bouncing between 10-second updates.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">RH Hysteresis (rhHist)</span>
                  <span className="font-mono font-bold text-purple-300">{thresholds.rhHist}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="5"
                  step="0.1"
                  value={thresholds.rhHist}
                  onChange={(e) => handleChange('rhHist', Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-400"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Temp Hysteresis (tempHist)</span>
                  <span className="font-mono font-bold text-purple-300">{dispTempHist}°{tempUnit}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max={tempHistMaxSlider}
                  step="0.1"
                  value={dispTempHist}
                  onChange={(e) => handleChange('tempHist', fromDisplayDelta(Number(e.target.value), tempUnit))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-400"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Batt Hysteresis (battHist)</span>
                  <span className="font-mono font-bold text-purple-300">{thresholds.battHist}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="5"
                  step="0.5"
                  value={thresholds.battHist}
                  onChange={(e) => handleChange('battHist', Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-400"
                />
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
            <span>Reset Defaults</span>
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
                  <span>Saved!</span>
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

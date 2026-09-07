import React, { useState } from 'react';
import { HumidorDevice } from '../types';
import { thingsboard } from '../services/thingsboard';
import { alarmThresholdService } from '../services/alarmThresholds';
import { 
  Sliders, 
  Moon, 
  Volume2, 
  VolumeX, 
  Sun, 
  Save, 
  Check, 
  Zap,
  Terminal,
  Radio,
  Clock,
  RefreshCw,
  AlertCircle,
  Droplets,
  Thermometer,
  ShieldCheck,
  Sparkles,
  Layers
} from 'lucide-react';

interface ControlPanelProps {
  device: HumidorDevice;
  onOpenThresholds?: () => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({ device, onOpenThresholds }) => {
  const currentThresholds = alarmThresholdService.getThresholds();

  // Sleep Interval
  const [sleepMin, setSleepMin] = useState<number>(
    device.sharedAttributes.sleep_interval_min || 
    (device.sharedAttributes.sleep_interval_sec ? Math.round(device.sharedAttributes.sleep_interval_sec / 60) : 15)
  );

  // Target Humidity Thresholds
  const [rhTarget, setRhTarget] = useState<number>(
    device.sharedAttributes.target_rh ?? currentThresholds.rhTarget ?? 69.5
  );
  const [rhLow, setRhLow] = useState<number>(
    device.sharedAttributes.alarm_thresholds?.rhLowWarning ?? currentThresholds.rhLowWarning ?? 65.0
  );
  const [rhHigh, setRhHigh] = useState<number>(
    device.sharedAttributes.alarm_thresholds?.rhHighWarning ?? currentThresholds.rhHighWarning ?? 73.0
  );

  // Target Temperature Thresholds
  const [tempTarget, setTempTarget] = useState<number>(
    device.sharedAttributes.target_temp ?? currentThresholds.tempTarget ?? 68.0
  );
  const [tempLow, setTempLow] = useState<number>(
    device.sharedAttributes.alarm_thresholds?.tempLowWarning ?? currentThresholds.tempLowWarning ?? 64.0
  );
  const [tempHigh, setTempHigh] = useState<number>(
    device.sharedAttributes.alarm_thresholds?.tempHighWarning ?? currentThresholds.tempHighWarning ?? 72.0
  );

  // Hardware Display Theme & Audio
  const initialTheme = String(device.sharedAttributes.device_theme || '').toLowerCase();
  const [themeIndex, setThemeIndex] = useState<number>(
    initialTheme === 'dark' ? 1 : (device.sharedAttributes.theme_idx ?? 0)
  );
  const [audioLockout, setAudioLockout] = useState<boolean>(
    device.sharedAttributes.audio_lockout ?? (device.sharedAttributes.sound_enabled === false)
  );
  const [autoUpdate, setAutoUpdate] = useState<boolean>(
    device.sharedAttributes.auto_update_enabled ?? true
  );
  const [manualOta, setManualOta] = useState<boolean>(
    device.sharedAttributes.manual_ota_trigger ?? false
  );

  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // RPC Command states
  const [rpcLoading, setRpcLoading] = useState<string | null>(null);
  const [rpcStatus, setRpcStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const themeNames = ['light', 'dark'] as const;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const updatedThresholds = {
        ...currentThresholds,
        rhTarget,
        rhLowWarning: rhLow,
        rhHighWarning: rhHigh,
        tempTarget,
        tempLowWarning: tempLow,
        tempHighWarning: tempHigh,
      };

      // 1. Update ThingsBoard Shared Attributes without redundant keys
      await thingsboard.updateSharedAttributes(device.id, {
        sleep_interval_min: sleepMin,
        sleep_interval_sec: sleepMin * 60,
        theme_idx: themeIndex,
        device_theme: themeNames[themeIndex],
        audio_lockout: audioLockout,
        sound_enabled: !audioLockout,
        auto_update_enabled: autoUpdate,
        manual_ota_trigger: manualOta,
        target_rh: rhTarget,
        target_temp: tempTarget,
        alarm_thresholds: updatedThresholds,
      });

      // 2. Synchronize local runtime alarm threshold service
      alarmThresholdService.saveThresholds(updatedThresholds);

      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: any) {
      console.warn('Failed to save shared attributes:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTriggerRpc = async (method: string, params: any = {}) => {
    setRpcLoading(method);
    setRpcStatus(null);
    try {
      const res = await thingsboard.sendRpcCommand(device.id, method, params, true, 4000);
      if (res.success) {
        setRpcStatus({
          type: 'success',
          message: `RPC "${method}" acknowledged by hardware${res.data ? `: ${JSON.stringify(res.data)}` : '.'}`,
        });
      } else {
        setRpcStatus({
          type: 'error',
          message: res.error || `RPC "${method}" timed out. Hardware may be sleeping.`,
        });
      }
    } catch (err: any) {
      setRpcStatus({
        type: 'error',
        message: err.message || `RPC "${method}" failed to execute`,
      });
    } finally {
      setRpcLoading(null);
      setTimeout(() => setRpcStatus(null), 6000);
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl backdrop-blur-sm h-full flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4 sm:mb-5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-wide">
                Hardware Device & Alarm Parameters
              </h3>
              <p className="text-xs text-slate-400">
                Live runtime configuration synced to ThingsBoard shared attributes
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenThresholds && (
              <button
                type="button"
                onClick={onOpenThresholds}
                className="h-8.5 px-2.5 rounded-lg bg-slate-800 border border-slate-700 hover:border-amber-500/40 text-amber-400 hover:text-amber-300 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Open Advanced Threshold Presets"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Presets</span>
              </button>
            )}

            {savedSuccess && (
              <span className="inline-flex items-center gap-1 text-xs text-emerald-400 font-semibold bg-emerald-950/80 px-2.5 py-1 rounded-lg border border-emerald-500/30 animate-fadeIn">
                <Check className="w-3.5 h-3.5" /> Synced
              </span>
            )}
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          {/* 1. Target Humidity & Alarm Thresholds */}
          <div className="space-y-3 bg-slate-950/60 p-3.5 sm:p-4 rounded-xl border border-slate-800">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Droplets className="w-3.5 h-3.5 text-cyan-400" />
                <span>Target Humidity & Alerts</span>
              </label>
              <span className="font-mono text-xs font-bold text-cyan-300 bg-cyan-950/60 px-2.5 py-0.5 rounded border border-cyan-500/30">
                Sweet Spot: {rhTarget.toFixed(1)}% RH
              </span>
            </div>

            {/* Target RH Sweet Spot Slider */}
            <div>
              <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                <span>Target Relative Humidity:</span>
                <span className="font-mono text-white font-semibold">{rhTarget}%</span>
              </div>
              <input
                type="range"
                min="60"
                max="75"
                step="0.5"
                value={rhTarget}
                onChange={(e) => setRhTarget(Number(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
            </div>

            {/* Upper and Lower Alert Thresholds */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <div>
                <span className="text-[10px] text-slate-400 block mb-1">Low Alert (&lt;):</span>
                <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5">
                  <input
                    type="number"
                    min="55"
                    max={rhTarget - 1}
                    step="0.5"
                    value={rhLow}
                    onChange={(e) => setRhLow(Number(e.target.value))}
                    className="w-full bg-transparent text-xs font-mono text-amber-300 focus:outline-none"
                  />
                  <span className="text-[10px] font-mono text-slate-500">%</span>
                </div>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 block mb-1">High Alert (&gt;):</span>
                <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5">
                  <input
                    type="number"
                    min={rhTarget + 1}
                    max="80"
                    step="0.5"
                    value={rhHigh}
                    onChange={(e) => setRhHigh(Number(e.target.value))}
                    className="w-full bg-transparent text-xs font-mono text-rose-300 focus:outline-none"
                  />
                  <span className="text-[10px] font-mono text-slate-500">%</span>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Target Temperature & Alarm Thresholds */}
          <div className="space-y-3 bg-slate-950/60 p-3.5 sm:p-4 rounded-xl border border-slate-800">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Thermometer className="w-3.5 h-3.5 text-amber-400" />
                <span>Target Temperature & Alerts</span>
              </label>
              <span className="font-mono text-xs font-bold text-amber-300 bg-amber-950/60 px-2.5 py-0.5 rounded border border-amber-500/30">
                Target: {tempTarget.toFixed(1)}°F
              </span>
            </div>

            {/* Target Temperature Slider */}
            <div>
              <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                <span>Curing Temperature Target:</span>
                <span className="font-mono text-white font-semibold">{tempTarget}°F</span>
              </div>
              <input
                type="range"
                min="60"
                max="75"
                step="0.5"
                value={tempTarget}
                onChange={(e) => setTempTarget(Number(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            </div>

            {/* Upper and Lower Alert Temp */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <div>
                <span className="text-[10px] text-slate-400 block mb-1">Low Temp Warning (&lt;):</span>
                <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5">
                  <input
                    type="number"
                    min="55"
                    max={tempTarget - 1}
                    step="0.5"
                    value={tempLow}
                    onChange={(e) => setTempLow(Number(e.target.value))}
                    className="w-full bg-transparent text-xs font-mono text-amber-300 focus:outline-none"
                  />
                  <span className="text-[10px] font-mono text-slate-500">°F</span>
                </div>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 block mb-1">High Temp Critical (&gt;):</span>
                <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5">
                  <input
                    type="number"
                    min={tempTarget + 1}
                    max="80"
                    step="0.5"
                    value={tempHigh}
                    onChange={(e) => setTempHigh(Number(e.target.value))}
                    className="w-full bg-transparent text-xs font-mono text-rose-300 focus:outline-none"
                  />
                  <span className="text-[10px] font-mono text-slate-500">°F</span>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Deep Sleep Interval Slider */}
          <div className="space-y-2 bg-slate-950/60 p-3.5 sm:p-4 rounded-xl border border-slate-800">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Moon className="w-3.5 h-3.5 text-amber-400" />
                <span>Deep Sleep Wake Interval</span>
              </label>
              <span className="font-mono text-xs font-bold text-amber-300 bg-amber-500/10 px-2.5 py-0.5 rounded border border-amber-500/20">
                {sleepMin}m ({sleepMin * 60}s)
              </span>
            </div>

            <input
              type="range"
              min="1"
              max="60"
              step="1"
              value={sleepMin}
              onChange={(e) => setSleepMin(Number(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />

            <div className="flex justify-between text-[10px] font-mono text-slate-500">
              <span>1 min (Testing)</span>
              <span>15 min (Standard)</span>
              <span>60 min (Max Battery)</span>
            </div>
          </div>

          {/* 4. On-Device E-Ink Display Theme Selector */}
          <div className="space-y-2 bg-slate-950/60 p-3.5 sm:p-4 rounded-xl border border-slate-800">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Sun className="w-3.5 h-3.5 text-amber-400" />
              <span>Hardware E-Ink Display Theme</span>
            </label>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setThemeIndex(0)}
                className={`h-9 px-3 rounded-lg text-xs font-medium border transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  themeIndex === 0
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                }`}
              >
                <Sun className="w-4 h-4 text-amber-400" />
                <span className="font-semibold">Light</span>
              </button>

              <button
                type="button"
                onClick={() => setThemeIndex(1)}
                className={`h-9 px-3 rounded-lg text-xs font-medium border transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  themeIndex === 1
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                }`}
              >
                <Moon className="w-4 h-4 text-sky-400" />
                <span className="font-semibold">Dark</span>
              </button>
            </div>
          </div>

          {/* 5. Audio & Auto-Update Toggles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Audio Lockout Toggle */}
            <div className="flex items-center justify-between bg-slate-950/60 p-3 rounded-xl border border-slate-800">
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-lg ${audioLockout ? 'bg-rose-950 text-rose-400' : 'bg-slate-800 text-slate-300'}`}>
                  {audioLockout ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-200 block">Sound</span>
                  <span className="text-[10px] text-slate-400">{audioLockout ? 'Muted' : 'Enabled'}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setAudioLockout(!audioLockout)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                  audioLockout ? 'bg-rose-700' : 'bg-emerald-600'
                }`}
                title={audioLockout ? 'Unmute buzzer' : 'Mute buzzer'}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    audioLockout ? 'translate-x-1' : 'translate-x-6'
                  }`}
                />
              </button>
            </div>

            {/* Auto Update Toggle */}
            <div className="flex items-center justify-between bg-slate-950/60 p-3 rounded-xl border border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-slate-800 text-sky-400">
                  <ShieldCheck className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-200 block">Auto Update</span>
                  <span className="text-[10px] text-slate-400">{autoUpdate ? 'Automatic' : 'Manual'}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setAutoUpdate(!autoUpdate)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                  autoUpdate ? 'bg-amber-600' : 'bg-slate-800'
                }`}
                title="Toggle automatic firmware updates"
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    autoUpdate ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Manual OTA Trigger Attribute */}
            <div className="flex items-center justify-between bg-slate-950/60 p-3 rounded-xl border border-slate-800 sm:col-span-2">
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-lg ${manualOta ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-800 text-slate-400'}`}>
                  <Zap className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-200 block">Manual OTA Armed Trigger</span>
                  <span className="text-[10px] text-slate-400">Forces device bootloader to query OTA binary on next wake</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setManualOta(!manualOta)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                  manualOta ? 'bg-amber-500' : 'bg-slate-800'
                }`}
                title="Arm manual OTA flash trigger"
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    manualOta ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* 6. Live ThingsBoard RPC Triggers */}
          <div className="space-y-2 bg-slate-950/60 p-3.5 sm:p-4 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-amber-400" />
                <span>Remote RPC Commands</span>
              </label>
              <span className="text-[10px] font-mono text-slate-500">ThingsBoard RPC</span>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-1">
              <button
                type="button"
                disabled={!!rpcLoading}
                onClick={() => handleTriggerRpc('ping')}
                className="h-8.5 px-2 bg-slate-900 border border-slate-700 hover:border-amber-500/40 text-slate-200 rounded-lg text-xs font-mono flex items-center justify-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
              >
                {rpcLoading === 'ping' ? <RefreshCw className="w-3 h-3 animate-spin text-amber-400" /> : <Radio className="w-3 h-3 text-amber-400" />}
                <span>Ping</span>
              </button>

              <button
                type="button"
                disabled={!!rpcLoading}
                onClick={() => handleTriggerRpc('testBuzzer', { durationMs: 500 })}
                className="h-8.5 px-2 bg-slate-900 border border-slate-700 hover:border-amber-500/40 text-slate-200 rounded-lg text-xs font-mono flex items-center justify-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
              >
                {rpcLoading === 'testBuzzer' ? <RefreshCw className="w-3 h-3 animate-spin text-amber-400" /> : <Volume2 className="w-3 h-3 text-amber-400" />}
                <span>Buzzer</span>
              </button>

              <button
                type="button"
                disabled={!!rpcLoading}
                onClick={() => handleTriggerRpc('syncTime', { epoch: Math.floor(Date.now() / 1000) })}
                className="h-8.5 px-2 bg-slate-900 border border-slate-700 hover:border-amber-500/40 text-slate-200 rounded-lg text-xs font-mono flex items-center justify-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
              >
                {rpcLoading === 'syncTime' ? <RefreshCw className="w-3 h-3 animate-spin text-amber-400" /> : <Clock className="w-3 h-3 text-amber-400" />}
                <span>Clock</span>
              </button>
            </div>

            {/* RPC Feedback Message */}
            {rpcStatus && (
              <div
                className={`mt-2 p-2 rounded-lg text-[11px] font-mono flex items-center gap-1.5 ${
                  rpcStatus.type === 'success'
                    ? 'bg-emerald-950/70 border border-emerald-500/30 text-emerald-300'
                    : 'bg-amber-950/70 border border-amber-500/30 text-amber-300'
                }`}
              >
                {rpcStatus.type === 'success' ? <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                <span className="truncate">{rpcStatus.message}</span>
              </div>
            )}
          </div>
        </form>
      </div>

      <div className="pt-4 border-t border-slate-800/80 mt-4 flex items-center justify-between">
        <div className="flex items-center gap-1 text-[11px] text-slate-500 font-mono">
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          <span>Syncs to ThingsBoard & Display Gauges</span>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="h-9 px-4 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-md shadow-amber-950/30 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          <span>Save Parameters</span>
        </button>
      </div>
    </div>
  );
};

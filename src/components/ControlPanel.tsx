import React, { useState, useEffect } from 'react';
import { HumidorDevice, TempUnit, AlarmThresholds } from '../types';
import { thingsboard } from '../services/thingsboard';
import { 
  alarmThresholdService, 
  THRESHOLD_PRESETS, 
  toDisplayTemp, 
  fromDisplayTemp
} from '../services/alarmThresholds';
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
  HardDrive,
  MailCheck,
  MailX
} from 'lucide-react';

interface ControlPanelProps {
  device: HumidorDevice;
  tempUnit?: TempUnit;
  onOpenThresholds?: () => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({ 
  device, 
  tempUnit = 'F',
  onOpenThresholds 
}) => {
  const currentThresholds = alarmThresholdService.getThresholds();

  // Sleep Interval (1 - 60 min)
  const [sleepMin, setSleepMin] = useState<number>(
    device.sharedAttributes.sleep_interval_min || 
    (device.sharedAttributes.sleep_interval_sec ? Math.round(device.sharedAttributes.sleep_interval_sec / 60) : 15)
  );

  // Active Runtime Alarm Thresholds (Canonical storage in °F for temp)
  const [thresholds, setThresholds] = useState<AlarmThresholds>(
    device.sharedAttributes.alarm_thresholds || currentThresholds
  );

  // Hardware Display Theme (strictly 'light' or 'dark')
  const initialTheme = String(device.sharedAttributes.device_theme || 'dark').toLowerCase();
  const [theme, setTheme] = useState<'light' | 'dark'>(initialTheme === 'light' ? 'light' : 'dark');

  // Sound enablement: locked out if SD card is missing
  const hasSdCard = device.clientAttributes?.has_sd_card !== false;
  const [soundEnabled, setSoundEnabled] = useState<boolean>(
    hasSdCard ? (device.sharedAttributes.sound_enabled !== false) : false
  );

  const [autoUpdate, setAutoUpdate] = useState<boolean>(
    device.sharedAttributes.auto_update_enabled ?? true
  );
  const [manualOta, setManualOta] = useState<boolean>(
    device.sharedAttributes.manual_ota_trigger ?? false
  );
  const [emailAlerts, setEmailAlerts] = useState<boolean>(
    device.sharedAttributes.email_alerts_enabled ?? true
  );

  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [activePreset, setActivePreset] = useState<string | null>(null);

  // RPC Command states
  const [rpcLoading, setRpcLoading] = useState<string | null>(null);
  const [rpcStatus, setRpcStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    const unsub = alarmThresholdService.subscribe((updated) => {
      setThresholds(updated);
    });
    return unsub;
  }, []);

  const handleApplyPreset = (presetId: 'sensitive' | 'normal' | 'relaxed') => {
    const found = THRESHOLD_PRESETS.find((p) => p.id === presetId);
    if (found) {
      setThresholds(found.thresholds);
      setActivePreset(presetId);
    }
  };

  const handleThresholdChange = (key: keyof AlarmThresholds, val: number) => {
    setThresholds((prev) => ({
      ...prev,
      [key]: val,
    }));
    setActivePreset(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      // 1. Update ThingsBoard Shared Attributes with clean schema
      await thingsboard.updateSharedAttributes(device.id, {
        sleep_interval_min: sleepMin,
        sleep_interval_sec: sleepMin * 60,
        device_theme: theme,
        sound_enabled: hasSdCard ? soundEnabled : false,
        auto_update_enabled: autoUpdate,
        manual_ota_trigger: manualOta,
        email_alerts_enabled: emailAlerts,
        alarm_thresholds: thresholds,
      });

      // 2. Synchronize local runtime alarm threshold service
      alarmThresholdService.saveThresholds(thresholds);

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

  // Temperature display conversions
  const dispTempLowCritical = toDisplayTemp(thresholds.tempLowCritical, tempUnit);
  const dispTempLowWarning = toDisplayTemp(thresholds.tempLowWarning, tempUnit);
  const dispTempHighWarning = toDisplayTemp(thresholds.tempHighWarning, tempUnit);
  const dispTempHighCritical = toDisplayTemp(thresholds.tempHighCritical, tempUnit);

  const tempMinSlider = tempUnit === 'C' ? 10 : 50;
  const tempMaxSlider = tempUnit === 'C' ? 32 : 90;

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl backdrop-blur-sm flex flex-col justify-between">
      <div>
        {/* Top Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-wide">
                Hardware Device & Alarm Parameters
              </h3>
              <p className="text-xs text-slate-400">
                Direct threshold limits, hysteresis zones & hardware attributes
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenThresholds && (
              <button
                type="button"
                onClick={onOpenThresholds}
                className="h-8.5 px-3 rounded-lg bg-slate-800/80 border border-slate-700 hover:border-amber-500/40 text-amber-400 hover:text-amber-300 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Open Advanced Threshold Configuration"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Advanced Presets</span>
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
          {/* Quick Preset Selector */}
          <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Threshold Envelope Presets</span>
              </span>
              <span className="text-[11px] font-mono text-slate-400">Quick Set</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {THRESHOLD_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleApplyPreset(preset.id)}
                  className={`h-9 px-2 rounded-lg text-xs font-medium border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    activePreset === preset.id
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                  title={preset.description}
                >
                  <span className="font-semibold capitalize">{preset.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 1. Relative Humidity (RH %) Thresholds */}
          <div className="bg-slate-950/60 p-3.5 sm:p-4 rounded-xl border border-slate-800 space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                <Droplets className="w-3.5 h-3.5 text-amber-400" />
                <span>Relative Humidity (RH %) Thresholds</span>
              </label>
              <span className="font-mono text-xs font-bold text-amber-300 bg-amber-950/60 px-2.5 py-0.5 rounded border border-amber-500/30">
                Safe Envelope: {thresholds.rhLowWarning}%–{thresholds.rhHighWarning}%
              </span>
            </div>

            {/* Visual Color Spectrum Bar */}
            <div className="space-y-1">
              <div className="h-2.5 w-full rounded-full bg-slate-800 flex overflow-hidden border border-slate-700/60 text-[9px] font-mono">
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
                <span className="text-sky-300">{thresholds.rhLowWarning}% (Low Warn)</span>
                <span className="text-amber-400">{thresholds.rhHighWarning}% (High Warn)</span>
                <span className="text-rose-400">{thresholds.rhHighCritical}% (High Crit)</span>
              </div>
            </div>

            {/* 4 RH Boundary Sliders */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-slate-400">Low Crit</span>
                  <span className="font-mono font-bold text-blue-400">{thresholds.rhLowCritical}%</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="65"
                  step="0.5"
                  value={thresholds.rhLowCritical}
                  onChange={(e) => handleThresholdChange('rhLowCritical', Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-slate-400">Low Warn</span>
                  <span className="font-mono font-bold text-sky-300">{thresholds.rhLowWarning}%</span>
                </div>
                <input
                  type="range"
                  min="60"
                  max="68"
                  step="0.5"
                  value={thresholds.rhLowWarning}
                  onChange={(e) => handleThresholdChange('rhLowWarning', Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-slate-400">High Warn</span>
                  <span className="font-mono font-bold text-amber-400">{thresholds.rhHighWarning}%</span>
                </div>
                <input
                  type="range"
                  min="70"
                  max="78"
                  step="0.5"
                  value={thresholds.rhHighWarning}
                  onChange={(e) => handleThresholdChange('rhHighWarning', Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-slate-400">High Crit</span>
                  <span className="font-mono font-bold text-rose-400">{thresholds.rhHighCritical}%</span>
                </div>
                <input
                  type="range"
                  min="73"
                  max="85"
                  step="0.5"
                  value={thresholds.rhHighCritical}
                  onChange={(e) => handleThresholdChange('rhHighCritical', Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
                />
              </div>
            </div>
          </div>

          {/* 2. Temperature Thresholds (Auto-scales °F / °C) */}
          <div className="bg-slate-950/60 p-3.5 sm:p-4 rounded-xl border border-slate-800 space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold uppercase tracking-wider text-sky-300 flex items-center gap-1.5">
                <Thermometer className="w-3.5 h-3.5 text-sky-400" />
                <span>Temperature (°{tempUnit}) Thresholds</span>
              </label>
              <span className="font-mono text-xs font-bold text-sky-300 bg-sky-950/60 px-2.5 py-0.5 rounded border border-sky-500/30">
                Safe Envelope: {dispTempLowWarning}°–{dispTempHighWarning}°{tempUnit}
              </span>
            </div>

            {/* 4 Temp Boundary Sliders */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-slate-400">Low Crit</span>
                  <span className="font-mono font-bold text-blue-400">{dispTempLowCritical}°{tempUnit}</span>
                </div>
                <input
                  type="range"
                  min={tempMinSlider}
                  max={tempMaxSlider}
                  step="0.5"
                  value={dispTempLowCritical}
                  onChange={(e) => handleThresholdChange('tempLowCritical', fromDisplayTemp(Number(e.target.value), tempUnit))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-slate-400">Low Warn</span>
                  <span className="font-mono font-bold text-sky-300">{dispTempLowWarning}°{tempUnit}</span>
                </div>
                <input
                  type="range"
                  min={tempMinSlider}
                  max={tempMaxSlider}
                  step="0.5"
                  value={dispTempLowWarning}
                  onChange={(e) => handleThresholdChange('tempLowWarning', fromDisplayTemp(Number(e.target.value), tempUnit))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-slate-400">High Warn</span>
                  <span className="font-mono font-bold text-amber-400">{dispTempHighWarning}°{tempUnit}</span>
                </div>
                <input
                  type="range"
                  min={tempMinSlider}
                  max={tempMaxSlider}
                  step="0.5"
                  value={dispTempHighWarning}
                  onChange={(e) => handleThresholdChange('tempHighWarning', fromDisplayTemp(Number(e.target.value), tempUnit))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-slate-400">High Crit</span>
                  <span className="font-mono font-bold text-rose-400">{dispTempHighCritical}°{tempUnit}</span>
                </div>
                <input
                  type="range"
                  min={tempMinSlider}
                  max={tempMaxSlider}
                  step="0.5"
                  value={dispTempHighCritical}
                  onChange={(e) => handleThresholdChange('tempHighCritical', fromDisplayTemp(Number(e.target.value), tempUnit))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
                />
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

          {/* 4. On-Device E-Ink Display Theme Selector (Light vs Dark) */}
          <div className="space-y-2 bg-slate-950/60 p-3.5 sm:p-4 rounded-xl border border-slate-800">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Sun className="w-3.5 h-3.5 text-amber-400" />
              <span>Hardware E-Ink Display Theme</span>
            </label>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={`h-9 px-3 rounded-lg text-xs font-medium border transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  theme === 'light'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                }`}
              >
                <Sun className="w-4 h-4 text-amber-400" />
                <span className="font-semibold">Light</span>
              </button>

              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={`h-9 px-3 rounded-lg text-xs font-medium border transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  theme === 'dark'
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
            {/* Sound Toggle (Locked if No SD Card) */}
            <div className="flex items-center justify-between bg-slate-950/60 p-3 rounded-xl border border-slate-800">
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-lg ${!hasSdCard ? 'bg-slate-800 text-slate-500' : soundEnabled ? 'bg-emerald-950 text-emerald-400' : 'bg-rose-950 text-rose-400'}`}>
                  {!hasSdCard ? <HardDrive className="w-3.5 h-3.5 text-slate-500" /> : soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-200 block">Sound</span>
                  <span className="text-[10px] text-slate-400">
                    {!hasSdCard ? 'Locked (No SD Card)' : soundEnabled ? 'Enabled' : 'Muted'}
                  </span>
                </div>
              </div>

              <button
                type="button"
                disabled={!hasSdCard}
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  !hasSdCard 
                    ? 'bg-slate-800 opacity-50 cursor-not-allowed' 
                    : soundEnabled 
                    ? 'bg-emerald-600 cursor-pointer' 
                    : 'bg-slate-800 cursor-pointer'
                }`}
                title={!hasSdCard ? 'SD Card required to enable hardware audio' : soundEnabled ? 'Mute buzzer' : 'Enable sound'}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    soundEnabled && hasSdCard ? 'translate-x-6' : 'translate-x-1'
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

            {/* Device Email Alerts Toggle (Shared Attribute: email_alerts_enabled) */}
            <div className="flex items-center justify-between bg-slate-950/60 p-3 rounded-xl border border-slate-800 sm:col-span-2">
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-lg ${emailAlerts ? 'bg-sky-500/20 text-sky-400' : 'bg-slate-800 text-slate-400'}`}>
                  {emailAlerts ? <MailCheck className="w-3.5 h-3.5" /> : <MailX className="w-3.5 h-3.5" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-200">Device Email Alerts</span>
                    <span className="text-[9px] font-mono font-medium px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                      email_alerts_enabled
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {emailAlerts 
                      ? 'Enabled — ThingsBoard Rule Chain sends email alerts for active alarm triggers' 
                      : 'Opted out — ThingsBoard Rule Chain suppresses automated email alerts'}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setEmailAlerts(!emailAlerts)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                  emailAlerts ? 'bg-sky-500' : 'bg-slate-800'
                }`}
                title="Toggle Device Email Alerts in ThingsBoard"
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    emailAlerts ? 'translate-x-6' : 'translate-x-1'
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
          <span>Syncs to ThingsBoard & Active Alarms</span>
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

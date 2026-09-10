import React, { useState, useEffect, useRef } from 'react';
import { HumidorDevice, TempUnit, AlarmThresholds, SharedAttributes } from '../types';
import { thingsboard } from '../services/thingsboard';
import { 
  alarmThresholdService, 
  getPresetThresholds,
  getDefaultThresholds,
  THRESHOLD_PRESETS, 
  toDisplayTemp,
  fromDisplayTemp,
  toDisplayDelta,
  fromDisplayDelta,
} from '../services/alarmThresholds';
import {
  exportDeviceConfigToXml,
  downloadDeviceConfigXml,
  parseDeviceConfigFromXml,
  ParsedXmlConfig
} from '../utils/deviceXmlConfig';
import { 
  Sliders, 
  Moon, 
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
  Battery,
  SlidersHorizontal,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Volume2,
  VolumeX,
  HardDrive,
  ChevronDown,
  ChevronUp,
  Maximize2,
  X,
  Download,
  Upload,
  FileCode,
  FileText,
  CheckCircle2
} from 'lucide-react';

interface ControlPanelProps {
  device: HumidorDevice;
  tempUnit?: TempUnit;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({ 
  device, 
  tempUnit = 'F' 
}) => {
  const currentThresholds = alarmThresholdService.getThresholds();

  // Collapsible and Windowed mode states (default collapsed)
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('humid1_control_panel_collapsed');
      return stored !== null ? stored === 'true' : true;
    } catch {
      return true;
    }
  });
  const [isWindowOpen, setIsWindowOpen] = useState<boolean>(false);

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('humid1_control_panel_collapsed', String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  // Sleep Interval (1 - 60 min)
  const [sleepMin, setSleepMin] = useState<number>(
    device.sharedAttributes.sleep_interval_min || 
    (device.sharedAttributes.sleep_interval_sec ? Math.round(device.sharedAttributes.sleep_interval_sec / 60) : 15)
  );

  // Active Runtime Alarm Thresholds (Canonical storage in Kelvin for temp)
  const [thresholds, setThresholds] = useState<AlarmThresholds>(
    () => device.sharedAttributes.alarm_thresholds || currentThresholds
  );

  // Hardware Display Theme (strictly 'light' or 'dark')
  const initialTheme = String(device.sharedAttributes.device_theme || 'dark').toLowerCase();
  const [theme, setTheme] = useState<'light' | 'dark'>(initialTheme === 'light' ? 'light' : 'dark');

  const [autoUpdate, setAutoUpdate] = useState<boolean>(
    device.sharedAttributes.auto_update_enabled ?? true
  );
  const [manualOta, setManualOta] = useState<boolean>(
    device.sharedAttributes.manual_ota_trigger ?? false
  );

  const hasSdCard = device.clientAttributes?.has_sd_card !== false;
  const [soundEnabled, setSoundEnabled] = useState<boolean>(
    hasSdCard ? (device.sharedAttributes.sound_enabled !== false) : false
  );

  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [activePreset, setActivePreset] = useState<string | null>(null);

  // XML Import / Export state
  const [isXmlImportModalOpen, setIsXmlImportModalOpen] = useState(false);
  const [xmlFileContent, setXmlFileContent] = useState<string>('');
  const [parsedXmlResult, setParsedXmlResult] = useState<ParsedXmlConfig | null>(null);
  const [xmlParseError, setXmlParseError] = useState<string | null>(null);
  const [xmlImportSuccess, setXmlImportSuccess] = useState<string | null>(null);
  const [xmlExportNotice, setXmlExportNotice] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state when device updates from ThingsBoard
  useEffect(() => {
    if (device.sharedAttributes.sleep_interval_min) {
      setSleepMin(device.sharedAttributes.sleep_interval_min);
    } else if (device.sharedAttributes.sleep_interval_sec) {
      setSleepMin(Math.round(device.sharedAttributes.sleep_interval_sec / 60));
    }
    if (device.sharedAttributes.alarm_thresholds) {
      setThresholds(device.sharedAttributes.alarm_thresholds);
    }
    if (device.sharedAttributes.device_theme) {
      setTheme(String(device.sharedAttributes.device_theme).toLowerCase() === 'light' ? 'light' : 'dark');
    }
    if (device.sharedAttributes.sound_enabled !== undefined) {
      setSoundEnabled(hasSdCard ? (device.sharedAttributes.sound_enabled !== false) : false);
    }
    if (device.sharedAttributes.auto_update_enabled !== undefined) {
      setAutoUpdate(device.sharedAttributes.auto_update_enabled);
    }
    if (device.sharedAttributes.manual_ota_trigger !== undefined) {
      setManualOta(device.sharedAttributes.manual_ota_trigger);
    }
  }, [
    device.id,
    device.sharedAttributes.sleep_interval_min,
    device.sharedAttributes.sleep_interval_sec,
    device.sharedAttributes.alarm_thresholds,
    device.sharedAttributes.device_theme,
    device.sharedAttributes.sound_enabled,
    device.sharedAttributes.auto_update_enabled,
    device.sharedAttributes.manual_ota_trigger,
    hasSdCard,
  ]);

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
    const presetTh = getPresetThresholds(presetId);
    setThresholds(presetTh);
    setActivePreset(presetId);
  };

  const handleResetDefaults = () => {
    const defaults = getDefaultThresholds();
    setThresholds(defaults);
    setSleepMin(15);
    setTheme('dark');
    setAutoUpdate(true);
    setManualOta(false);
    if (hasSdCard) setSoundEnabled(true);
    setActivePreset(null);
  };

  const handleExportXml = () => {
    downloadDeviceConfigXml(device, thresholds);
    setXmlExportNotice(true);
    setTimeout(() => setXmlExportNotice(false), 3000);
  };

  const handleXmlFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setXmlFileContent(content);
      processXmlString(content);
    };
    reader.readAsText(file);
  };

  const processXmlString = (content: string) => {
    setXmlParseError(null);
    setParsedXmlResult(null);
    setXmlImportSuccess(null);

    const result = parseDeviceConfigFromXml(content);
    if (!result.success || !result.data) {
      setXmlParseError(result.error || 'Failed to parse XML file.');
      return;
    }

    setParsedXmlResult(result.data);
  };

  const handleApplyXmlToEditor = (andSaveToThingsBoard = false) => {
    if (!parsedXmlResult) return;

    const { sharedAttributes, thresholds: parsedTh } = parsedXmlResult;

    if (sharedAttributes.sleep_interval_min !== undefined) {
      setSleepMin(sharedAttributes.sleep_interval_min);
    }
    if (sharedAttributes.device_theme !== undefined) {
      setTheme(sharedAttributes.device_theme);
    }
    if (sharedAttributes.sound_enabled !== undefined && hasSdCard) {
      setSoundEnabled(sharedAttributes.sound_enabled);
    }
    if (sharedAttributes.auto_update_enabled !== undefined) {
      setAutoUpdate(sharedAttributes.auto_update_enabled);
    }
    if (sharedAttributes.manual_ota_trigger !== undefined) {
      setManualOta(sharedAttributes.manual_ota_trigger);
    }

    let updatedThresholds = thresholds;
    if (parsedTh) {
      updatedThresholds = {
        ...thresholds,
        ...parsedTh,
      };
      setThresholds(updatedThresholds);
      alarmThresholdService.saveThresholds(updatedThresholds);
    }

    if (andSaveToThingsBoard) {
      handleSaveWithValues(
        sharedAttributes.sleep_interval_min ?? sleepMin,
        sharedAttributes.device_theme ?? theme,
        sharedAttributes.auto_update_enabled ?? autoUpdate,
        sharedAttributes.manual_ota_trigger ?? manualOta,
        hasSdCard ? (sharedAttributes.sound_enabled ?? soundEnabled) : false,
        updatedThresholds
      );
    } else {
      setXmlImportSuccess('Parameters loaded into editor! Click "Save Parameters" to persist.');
    }
  };

  const handleSaveWithValues = async (
    sMin: number,
    sTheme: 'light' | 'dark',
    sAuto: boolean,
    sManualOta: boolean,
    sSound: boolean,
    sThresholds: AlarmThresholds
  ) => {
    setIsSaving(true);
    try {
      await thingsboard.updateSharedAttributes(device.id, {
        sleep_interval_min: sMin,
        sleep_interval_sec: sMin * 60,
        device_theme: sTheme,
        auto_update_enabled: sAuto,
        manual_ota_trigger: sManualOta,
        sound_enabled: hasSdCard ? sSound : false,
        temp_unit: tempUnit,
        alarm_thresholds: sThresholds,
      });

      alarmThresholdService.saveThresholds(sThresholds);
      setSavedSuccess(true);
      setXmlImportSuccess('Imported XML configuration applied and synced to ThingsBoard successfully!');
      setTimeout(() => setSavedSuccess(false), 3000);
      setTimeout(() => setIsXmlImportModalOpen(false), 1500);
    } catch (err: any) {
      setXmlParseError(`Failed to save to ThingsBoard: ${err.message || 'Network error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    try {
      // 1. Update ThingsBoard Shared Attributes with clean schema
      await thingsboard.updateSharedAttributes(device.id, {
        sleep_interval_min: sleepMin,
        sleep_interval_sec: sleepMin * 60,
        device_theme: theme,
        auto_update_enabled: autoUpdate,
        manual_ota_trigger: manualOta,
        sound_enabled: hasSdCard ? soundEnabled : false,
        temp_unit: tempUnit,
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

  // Temperature display values
  const dispTempLowCritical = toDisplayTemp(thresholds.tempLowCritical, tempUnit);
  const dispTempLowWarning = toDisplayTemp(thresholds.tempLowWarning, tempUnit);
  const dispTempHighWarning = toDisplayTemp(thresholds.tempHighWarning, tempUnit);
  const dispTempHighCritical = toDisplayTemp(thresholds.tempHighCritical, tempUnit);
  const dispTempHist = toDisplayDelta(thresholds.tempHist, tempUnit);

  const tempMinSlider = tempUnit === 'C' ? 10 : 50;
  const tempMaxSlider = tempUnit === 'C' ? 32 : 90;
  const tempHistMaxSlider = tempUnit === 'C' ? 3.0 : 5.0;

  const renderContent = () => (
    <div className="space-y-4">
      {/* Quick Profile & Presets Bar */}
      <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Threshold Envelope Presets</span>
          </span>
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
          <div className="h-3 w-full rounded-full bg-slate-800 flex overflow-hidden border border-slate-700">
            <div style={{ width: `${thresholds.rhLowCritical}%` }} className="bg-rose-600/80" title="Low Critical (<60%)" />
            <div style={{ width: `${thresholds.rhLowWarning - thresholds.rhLowCritical}%` }} className="bg-amber-500/80" title="Low Warning (60-65%)" />
            <div style={{ width: `${thresholds.rhHighWarning - thresholds.rhLowWarning}%` }} className="bg-emerald-500/80" title="Ideal Safe Range (65-72%)" />
            <div style={{ width: `${thresholds.rhHighCritical - thresholds.rhHighWarning}%` }} className="bg-amber-500/80" title="High Warning (72-75%)" />
            <div style={{ width: `${100 - thresholds.rhHighCritical}%` }} className="bg-rose-600/80" title="High Critical (>75%)" />
          </div>
          <div className="flex justify-between text-[10px] font-mono text-slate-400">
            <span>0%</span>
            <span>{thresholds.rhLowCritical}% (Crit)</span>
            <span className="text-emerald-400 font-bold">{thresholds.rhLowWarning}%–{thresholds.rhHighWarning}% Safe</span>
            <span>{thresholds.rhHighCritical}% (Crit)</span>
            <span>100%</span>
          </div>
        </div>

        {/* Sliders Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <div className="space-y-1 bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
            <div className="flex justify-between text-xs">
              <span className="text-rose-400 font-medium">Low Critical Alarm</span>
              <span className="font-mono text-rose-300 font-bold">{thresholds.rhLowCritical.toFixed(1)}%</span>
            </div>
            <input
              type="range"
              min="50"
              max={thresholds.rhLowWarning - 1}
              step="0.5"
              value={thresholds.rhLowCritical}
              onChange={(e) => setThresholds({ ...thresholds, rhLowCritical: Number(e.target.value) })}
              className="w-full accent-rose-500 h-1.5 bg-slate-950 rounded-lg cursor-pointer"
            />
          </div>

          <div className="space-y-1 bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
            <div className="flex justify-between text-xs">
              <span className="text-amber-400 font-medium">Low Warning Alert</span>
              <span className="font-mono text-amber-300 font-bold">{thresholds.rhLowWarning.toFixed(1)}%</span>
            </div>
            <input
              type="range"
              min={thresholds.rhLowCritical + 1}
              max={thresholds.rhHighWarning - 1}
              step="0.5"
              value={thresholds.rhLowWarning}
              onChange={(e) => setThresholds({ ...thresholds, rhLowWarning: Number(e.target.value) })}
              className="w-full accent-amber-500 h-1.5 bg-slate-950 rounded-lg cursor-pointer"
            />
          </div>

          <div className="space-y-1 bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
            <div className="flex justify-between text-xs">
              <span className="text-amber-400 font-medium">High Warning Alert</span>
              <span className="font-mono text-amber-300 font-bold">{thresholds.rhHighWarning.toFixed(1)}%</span>
            </div>
            <input
              type="range"
              min={thresholds.rhLowWarning + 1}
              max={thresholds.rhHighCritical - 1}
              step="0.5"
              value={thresholds.rhHighWarning}
              onChange={(e) => setThresholds({ ...thresholds, rhHighWarning: Number(e.target.value) })}
              className="w-full accent-amber-500 h-1.5 bg-slate-950 rounded-lg cursor-pointer"
            />
          </div>

          <div className="space-y-1 bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
            <div className="flex justify-between text-xs">
              <span className="text-rose-400 font-medium">High Critical Alarm</span>
              <span className="font-mono text-rose-300 font-bold">{thresholds.rhHighCritical.toFixed(1)}%</span>
            </div>
            <input
              type="range"
              min={thresholds.rhHighWarning + 1}
              max="90"
              step="0.5"
              value={thresholds.rhHighCritical}
              onChange={(e) => setThresholds({ ...thresholds, rhHighCritical: Number(e.target.value) })}
              className="w-full accent-rose-500 h-1.5 bg-slate-950 rounded-lg cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* 2. Temperature Thresholds */}
      <div className="bg-slate-950/60 p-3.5 sm:p-4 rounded-xl border border-slate-800 space-y-3">
        <div className="flex justify-between items-center">
          <label className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
            <Thermometer className="w-3.5 h-3.5 text-amber-400" />
            <span>Temperature (°{tempUnit}) Thresholds</span>
          </label>
          <span className="font-mono text-xs font-bold text-amber-300 bg-amber-950/60 px-2.5 py-0.5 rounded border border-amber-500/30">
            Safe: {dispTempLowWarning.toFixed(1)}°–{dispTempHighWarning.toFixed(1)}°{tempUnit}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1 bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
            <div className="flex justify-between text-xs">
              <span className="text-rose-400 font-medium">Low Critical Temp</span>
              <span className="font-mono text-rose-300 font-bold">{dispTempLowCritical.toFixed(1)}°{tempUnit}</span>
            </div>
            <input
              type="range"
              min={tempMinSlider}
              max={dispTempLowWarning - 1}
              step="0.5"
              value={dispTempLowCritical}
              onChange={(e) => setThresholds({
                ...thresholds,
                tempLowCritical: fromDisplayTemp(Number(e.target.value), tempUnit)
              })}
              className="w-full accent-rose-500 h-1.5 bg-slate-950 rounded-lg cursor-pointer"
            />
          </div>

          <div className="space-y-1 bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
            <div className="flex justify-between text-xs">
              <span className="text-amber-400 font-medium">Low Warning Temp</span>
              <span className="font-mono text-amber-300 font-bold">{dispTempLowWarning.toFixed(1)}°{tempUnit}</span>
            </div>
            <input
              type="range"
              min={dispTempLowCritical + 1}
              max={dispTempHighWarning - 1}
              step="0.5"
              value={dispTempLowWarning}
              onChange={(e) => setThresholds({
                ...thresholds,
                tempLowWarning: fromDisplayTemp(Number(e.target.value), tempUnit)
              })}
              className="w-full accent-amber-500 h-1.5 bg-slate-950 rounded-lg cursor-pointer"
            />
          </div>

          <div className="space-y-1 bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
            <div className="flex justify-between text-xs">
              <span className="text-amber-400 font-medium">High Warning Temp</span>
              <span className="font-mono text-amber-300 font-bold">{dispTempHighWarning.toFixed(1)}°{tempUnit}</span>
            </div>
            <input
              type="range"
              min={dispTempLowWarning + 1}
              max={dispTempHighCritical - 1}
              step="0.5"
              value={dispTempHighWarning}
              onChange={(e) => setThresholds({
                ...thresholds,
                tempHighWarning: fromDisplayTemp(Number(e.target.value), tempUnit)
              })}
              className="w-full accent-amber-500 h-1.5 bg-slate-950 rounded-lg cursor-pointer"
            />
          </div>

          <div className="space-y-1 bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
            <div className="flex justify-between text-xs">
              <span className="text-rose-400 font-medium">High Critical Temp</span>
              <span className="font-mono text-rose-300 font-bold">{dispTempHighCritical.toFixed(1)}°{tempUnit}</span>
            </div>
            <input
              type="range"
              min={dispTempHighWarning + 1}
              max={tempMaxSlider}
              step="0.5"
              value={dispTempHighCritical}
              onChange={(e) => setThresholds({
                ...thresholds,
                tempHighCritical: fromDisplayTemp(Number(e.target.value), tempUnit)
              })}
              className="w-full accent-rose-500 h-1.5 bg-slate-950 rounded-lg cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* 3. Battery & Hysteresis Limits */}
      <div className="space-y-3">
        {/* Battery Warnings - Side by Side */}
        <div className="bg-slate-950/60 p-3.5 sm:p-4 rounded-xl border border-slate-800 space-y-3">
          <div className="flex justify-between items-center">
            <label className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
              <Battery className="w-3.5 h-3.5 text-amber-400" />
              <span>Battery Thresholds</span>
            </label>
            <span className="font-mono text-xs font-bold text-slate-300">
              {thresholds.batteryLowWarning}% / {thresholds.batteryLowCritical}%
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="space-y-1 bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
              <div className="flex justify-between text-xs">
                <span className="text-amber-400 font-medium">Low Battery Warning</span>
                <span className="font-mono text-amber-300 font-bold">{thresholds.batteryLowWarning}%</span>
              </div>
              <input
                type="range"
                min={thresholds.batteryLowCritical + 5}
                max="50"
                step="5"
                value={thresholds.batteryLowWarning}
                onChange={(e) => setThresholds({ ...thresholds, batteryLowWarning: Number(e.target.value) })}
                className="w-full accent-amber-500 h-1.5 bg-slate-950 rounded-lg cursor-pointer"
              />
            </div>

            <div className="space-y-1 bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
              <div className="flex justify-between text-xs">
                <span className="text-rose-400 font-medium">Critical Battery Cutoff</span>
                <span className="font-mono text-rose-300 font-bold">{thresholds.batteryLowCritical}%</span>
              </div>
              <input
                type="range"
                min="5"
                max={thresholds.batteryLowWarning - 5}
                step="5"
                value={thresholds.batteryLowCritical}
                onChange={(e) => setThresholds({ ...thresholds, batteryLowCritical: Number(e.target.value) })}
                className="w-full accent-rose-500 h-1.5 bg-slate-950 rounded-lg cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Hysteresis Anti-Flapping Buffers - 3 in a row */}
        <div className="bg-slate-950/60 p-3.5 sm:p-4 rounded-xl border border-slate-800 space-y-3">
          <div className="flex justify-between items-center">
            <label className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
              <span>Alarm Hysteresis Filters</span>
            </label>
            <span className="text-[10px] text-slate-400 font-mono">Anti-Flap (RH / Temp / Battery)</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="space-y-1 bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300 font-medium">RH Hysteresis</span>
                <span className="font-mono text-amber-300 font-bold">±{thresholds.rhHist.toFixed(1)}% RH</span>
              </div>
              <input
                type="range"
                min="0.2"
                max="3.0"
                step="0.1"
                value={thresholds.rhHist}
                onChange={(e) => setThresholds({ ...thresholds, rhHist: Number(e.target.value) })}
                className="w-full accent-amber-500 h-1.5 bg-slate-950 rounded-lg cursor-pointer"
              />
            </div>

            <div className="space-y-1 bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300 font-medium">Temp Hysteresis</span>
                <span className="font-mono text-amber-300 font-bold">±{dispTempHist.toFixed(1)}°{tempUnit}</span>
              </div>
              <input
                type="range"
                min="0.2"
                max={tempHistMaxSlider}
                step="0.1"
                value={dispTempHist}
                onChange={(e) => setThresholds({
                  ...thresholds,
                  tempHist: fromDisplayDelta(Number(e.target.value), tempUnit)
                })}
                className="w-full accent-amber-500 h-1.5 bg-slate-950 rounded-lg cursor-pointer"
              />
            </div>

            <div className="space-y-1 bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300 font-medium">Battery Hysteresis</span>
                <span className="font-mono text-amber-300 font-bold">±{(thresholds.battHist ?? 2.0).toFixed(1)}%</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="5.0"
                step="0.5"
                value={thresholds.battHist ?? 2.0}
                onChange={(e) => setThresholds({ ...thresholds, battHist: Number(e.target.value) })}
                className="w-full accent-amber-500 h-1.5 bg-slate-950 rounded-lg cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 4. Sleep Interval & Hardware Controls */}
      <div className="bg-slate-950/60 p-3.5 sm:p-4 rounded-xl border border-slate-800 space-y-3">
        <div className="flex justify-between items-center">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>Telemetry Sleep &amp; Wake Interval</span>
          </label>
          <span className="font-mono text-xs font-bold text-amber-300 bg-amber-950/60 px-2.5 py-0.5 rounded border border-amber-500/30">
            {sleepMin} Minutes ({sleepMin * 60}s)
          </span>
        </div>

        <input
          type="range"
          min="1"
          max="60"
          step="1"
          value={sleepMin}
          onChange={(e) => setSleepMin(Number(e.target.value))}
          className="w-full accent-amber-500 h-1.5 bg-slate-900 rounded-lg cursor-pointer"
        />

        <div className="flex justify-between text-[10px] font-mono text-slate-400">
          <span>1 min (Testing)</span>
          <span>15 min (Recommended)</span>
          <span>30 min (Balanced)</span>
          <span>60 min (Max Battery)</span>
        </div>
      </div>

      {/* 5. Display Theme, Sound, Auto Update & Manual Flash */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {/* Hardware Theme Switcher */}
        <div className="flex items-center justify-between bg-slate-950/60 p-3 rounded-xl border border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-slate-800 text-amber-400">
              {theme === 'dark' ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
            </div>
            <div>
              <span className="text-xs font-bold text-slate-200 block">E-Ink Theme</span>
              <span className="text-[10px] text-slate-400 capitalize">Waveshare {theme}</span>
            </div>
          </div>

          <div className="flex items-center bg-slate-900 p-0.5 rounded-lg border border-slate-800">
            <button
              type="button"
              onClick={() => setTheme('dark')}
              className={`p-1 rounded-md transition ${theme === 'dark' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'}`}
              title="Dark theme for E-Ink screen"
            >
              <Moon className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setTheme('light')}
              className={`p-1 rounded-md transition ${theme === 'light' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'}`}
              title="Light theme for E-Ink screen"
            >
              <Sun className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Sound Enabled Toggle */}
        <div className="flex items-center justify-between bg-slate-950/60 p-3 rounded-xl border border-slate-800">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg ${soundEnabled && hasSdCard ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-800 text-slate-400'}`}>
              {soundEnabled && hasSdCard ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            </div>
            <div>
              <span className="text-xs font-bold text-slate-200 block">Speaker Audio</span>
              <span className="text-[10px] text-slate-400">
                {!hasSdCard ? 'No SD Card' : soundEnabled ? 'Enabled' : 'Muted'}
              </span>
            </div>
          </div>

          <button
            type="button"
            disabled={!hasSdCard}
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
              soundEnabled && hasSdCard ? 'bg-amber-500' : 'bg-slate-800'
            }`}
            title={!hasSdCard ? 'Device speaker requires FAT32 SD card for audio playback' : 'Toggle device speaker audio playback'}
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
              <span className="text-xs font-bold text-slate-200 block">Auto Update (Planned)</span>
              <span className="text-[10px] text-slate-400">{autoUpdate ? 'Automatic' : 'Manual'}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setAutoUpdate(!autoUpdate)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
              autoUpdate ? 'bg-amber-600' : 'bg-slate-800'
            }`}
            title="Toggle automatic firmware updates (Feature planned)"
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                autoUpdate ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Manual OTA Trigger Attribute */}
        <div className="flex items-center justify-between bg-slate-950/60 p-3 rounded-xl border border-slate-800">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg ${manualOta ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-800 text-slate-400'}`}>
              <Zap className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-200 block">Manual OTA (Planned)</span>
              <span className="text-[10px] text-slate-400">Arm trigger (Stub)</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setManualOta(!manualOta)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
              manualOta ? 'bg-amber-500' : 'bg-slate-800'
            }`}
            title="Arm manual OTA flash trigger (Feature planned)"
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
            title="Send ping echo request to device"
          >
            {rpcLoading === 'ping' ? <RefreshCw className="w-3 h-3 animate-spin text-amber-400" /> : <Radio className="w-3 h-3 text-amber-400" />}
            <span>Ping</span>
          </button>

          <button
            type="button"
            disabled={!!rpcLoading}
            onClick={() => handleTriggerRpc('testBuzzer', { durationMs: 500 })}
            className="h-8.5 px-2 bg-slate-900 border border-slate-700 hover:border-amber-500/40 text-slate-200 rounded-lg text-xs font-mono flex items-center justify-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
            title="Play audible chime on device speaker to physically locate device"
          >
            {rpcLoading === 'testBuzzer' ? <RefreshCw className="w-3 h-3 animate-spin text-amber-400" /> : <Volume2 className="w-3 h-3 text-amber-400" />}
            <span>Locate</span>
          </button>

          <button
            type="button"
            disabled={!!rpcLoading}
            onClick={() => handleTriggerRpc('syncTime', { epoch: Math.floor(Date.now() / 1000) })}
            className="h-8.5 px-2 bg-slate-900 border border-slate-700 hover:border-amber-500/40 text-slate-200 rounded-lg text-xs font-mono flex items-center justify-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
            title="Synchronize device system clock with UTC/server epoch timestamp"
          >
            {rpcLoading === 'syncTime' ? <RefreshCw className="w-3 h-3 animate-spin text-amber-400" /> : <Clock className="w-3 h-3 text-amber-400" />}
            <span>Time Sync</span>
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

      <div className="pt-4 border-t border-slate-800/80 mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-700/60 transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>

          <button
            type="button"
            onClick={handleExportXml}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono text-slate-300 hover:text-amber-300 hover:bg-slate-800 border border-slate-700/60 transition cursor-pointer"
            title="Download XML Profile"
          >
            <Download className="w-3.5 h-3.5 text-amber-400" />
            <span>Export XML</span>
          </button>
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

  return (
    <>
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl backdrop-blur-sm overflow-hidden transition-all">
        {/* Header Bar - Clickable to toggle collapse */}
        <div className="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 bg-slate-900/95">
          <div 
            onClick={toggleCollapse}
            className="flex items-center gap-3 cursor-pointer select-none group flex-1 min-w-[200px]"
          >
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 group-hover:bg-amber-500/20 transition">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-wide group-hover:text-amber-300 transition">
                  Hardware Device &amp; Alarm Parameters
                </h3>
              </div>
              <p className="text-xs text-slate-400">
                Threshold limits, sleep interval &amp; XML profiles
              </p>
            </div>
          </div>

          {/* Quick Summary Pill Badges & Actions */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Export XML Button */}
            <button
              type="button"
              onClick={handleExportXml}
              className="h-8 px-2.5 rounded-lg bg-slate-800 border border-slate-700 hover:border-amber-500/50 text-slate-300 hover:text-amber-300 text-xs font-mono flex items-center gap-1.5 transition cursor-pointer"
              title="Export complete device configuration to XML profile file"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span>Export XML</span>
            </button>

            {/* Import XML Button */}
            <button
              type="button"
              onClick={() => {
                setParsedXmlResult(null);
                setXmlParseError(null);
                setXmlImportSuccess(null);
                setXmlFileContent('');
                setIsXmlImportModalOpen(true);
              }}
              className="h-8 px-2.5 rounded-lg bg-slate-800 border border-slate-700 hover:border-sky-500/50 text-slate-300 hover:text-sky-300 text-xs font-mono flex items-center gap-1.5 transition cursor-pointer"
              title="Import XML configuration from another humidor device"
            >
              <Upload className="w-3.5 h-3.5 text-sky-400" />
              <span>Import XML</span>
            </button>

            {/* Window Mode / Expansion Button */}
            <button
              type="button"
              onClick={() => setIsWindowOpen(true)}
              className="h-8 w-8 rounded-lg bg-slate-800 border border-slate-700 hover:border-slate-600 text-slate-400 hover:text-slate-200 flex items-center justify-center transition cursor-pointer"
              title="Open parameters in separate window"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>

            {/* Collapse Toggle Chevron */}
            <button
              type="button"
              onClick={toggleCollapse}
              className="h-8 w-8 rounded-lg bg-slate-800 border border-slate-700 hover:border-slate-600 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer"
              title={isCollapsed ? 'Expand parameters panel' : 'Collapse parameters panel'}
            >
              {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>

            {savedSuccess && (
              <span className="inline-flex items-center gap-1 text-xs text-emerald-400 font-semibold bg-emerald-950/80 px-2.5 py-1 rounded-lg border border-emerald-500/30 animate-fadeIn">
                <Check className="w-3.5 h-3.5" /> Synced
              </span>
            )}

            {xmlExportNotice && (
              <span className="inline-flex items-center gap-1 text-xs text-amber-400 font-semibold bg-amber-950/80 px-2.5 py-1 rounded-lg border border-amber-500/30 animate-fadeIn font-mono">
                <FileCode className="w-3.5 h-3.5" /> XML Exported
              </span>
            )}
          </div>
        </div>

        {/* Collapsible Content Body */}
        {!isCollapsed && (
          <div className="p-4 sm:p-6 border-t border-slate-800/80 animate-fadeIn">
            {renderContent()}
          </div>
        )}
      </div>

      {/* Floating Modal Window Mode */}
      {isWindowOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white tracking-wide">
                    Hardware Device &amp; Alarm Parameters Window
                  </h3>
                  <p className="text-xs text-slate-400">{device.name} Configuration</p>
                </div>
              </div>

              <button
                onClick={() => setIsWindowOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              {renderContent()}
            </div>
          </div>
        </div>
      )}

      {/* XML Configuration Import Modal */}
      {isXmlImportModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
                  <FileCode className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white tracking-wide">
                    Import Device Configuration XML
                  </h3>
                  <p className="text-xs text-slate-400">
                    Apply dialed parameters from another humidor profile
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsXmlImportModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              {/* File Upload / Dropzone */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 block">
                  Select or Drop User XML Configuration File:
                </label>
                <input
                  type="file"
                  accept=".xml,text/xml"
                  ref={fileInputRef}
                  onChange={handleXmlFileSelect}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-5 px-4 rounded-xl border-2 border-dashed border-slate-700 hover:border-amber-500/50 bg-slate-950/60 hover:bg-slate-950 text-slate-300 flex flex-col items-center justify-center gap-2 transition cursor-pointer"
                >
                  <Upload className="w-6 h-6 text-amber-400" />
                  <span className="font-semibold text-slate-200">
                    Click to browse or drop .xml profile
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono">
                    Supports &lt;humid1-device-config&gt; schema
                  </span>
                </button>
              </div>

              {/* Or Paste Raw XML */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-300">
                    Or Paste XML Payload Directly:
                  </label>
                  {xmlFileContent && (
                    <button
                      type="button"
                      onClick={() => {
                        setXmlFileContent('');
                        setParsedXmlResult(null);
                        setXmlParseError(null);
                      }}
                      className="text-[10px] font-mono text-rose-400 hover:underline"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <textarea
                  rows={4}
                  value={xmlFileContent}
                  onChange={(e) => {
                    setXmlFileContent(e.target.value);
                    if (e.target.value.trim()) {
                      processXmlString(e.target.value);
                    } else {
                      setParsedXmlResult(null);
                      setXmlParseError(null);
                    }
                  }}
                  placeholder='<humid1-device-config version="1.0"> ... </humid1-device-config>'
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-[11px] font-mono text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-amber-500/50"
                />
              </div>

              {/* Parse Error */}
              {xmlParseError && (
                <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/30 text-rose-300 flex items-start gap-2 font-mono text-[11px]">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{xmlParseError}</span>
                </div>
              )}

              {/* Success Notification */}
              {xmlImportSuccess && (
                <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 flex items-start gap-2 font-mono text-[11px]">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{xmlImportSuccess}</span>
                </div>
              )}

              {/* Parsed Preview Card */}
              {parsedXmlResult && (
                <div className="p-3.5 rounded-xl bg-slate-950 border border-amber-500/30 space-y-2.5 animate-fadeIn">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="font-bold text-amber-300 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-amber-400" />
                      <span>Valid XML Profile Detected</span>
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      v{parsedXmlResult.version}
                    </span>
                  </div>

                  {parsedXmlResult.metadata?.deviceName && (
                    <div className="text-[11px] text-slate-300 font-mono">
                      <span className="text-slate-500">Source Device:</span>{' '}
                      <span className="font-bold text-amber-200">{parsedXmlResult.metadata.deviceName}</span>
                    </div>
                  )}

                  {/* Summary Grid */}
                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono pt-1">
                    <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                      <span className="text-slate-500 block text-[10px]">Wake Interval:</span>
                      <span className="text-sky-300 font-bold">
                        {parsedXmlResult.sharedAttributes.sleep_interval_min ?? sleepMin} min
                      </span>
                    </div>

                    <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                      <span className="text-slate-500 block text-[10px]">Display Theme:</span>
                      <span className="text-amber-300 font-bold capitalize">
                        {parsedXmlResult.sharedAttributes.device_theme ?? theme}
                      </span>
                    </div>

                    {parsedXmlResult.thresholds && (
                      <>
                        <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                          <span className="text-slate-500 block text-[10px]">RH Safe Range:</span>
                          <span className="text-emerald-400 font-bold">
                            {parsedXmlResult.thresholds.rhLowWarning ?? thresholds.rhLowWarning}%–
                            {parsedXmlResult.thresholds.rhHighWarning ?? thresholds.rhHighWarning}% RH
                          </span>
                        </div>

                        <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                          <span className="text-slate-500 block text-[10px]">Battery Low Warn:</span>
                          <span className="text-rose-400 font-bold">
                            {parsedXmlResult.thresholds.batteryLowWarning ?? thresholds.batteryLowWarning}%
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsXmlImportModalOpen(false)}
                className="px-3.5 py-2 rounded-xl text-xs font-mono text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={!parsedXmlResult || isSaving}
                onClick={() => handleApplyXmlToEditor(false)}
                className="px-3.5 py-2 rounded-xl text-xs font-mono bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer disabled:opacity-50"
              >
                Load into Editor
              </button>

              <button
                type="button"
                disabled={!parsedXmlResult || isSaving}
                onClick={() => handleApplyXmlToEditor(true)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-500 text-slate-950 transition shadow-md shadow-amber-950/40 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>Apply &amp; Sync to Device</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

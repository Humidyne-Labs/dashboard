import React, { useState, useEffect } from 'react';
import { HumidorDevice, TempUnit } from '../types';
import { alarmThresholdService, AlarmThresholds } from '../services/alarmThresholds';
import { 
  Droplets, 
  Thermometer, 
  Battery, 
  Wifi, 
  Sparkles,
  Sliders,
  AlertTriangle
} from 'lucide-react';

interface ClimateGaugesProps {
  device: HumidorDevice;
  tempUnit: TempUnit;
  onToggleTempUnit?: () => void;
  onOpenThresholds?: () => void;
}

export const ClimateGauges: React.FC<ClimateGaugesProps> = ({
  device,
  tempUnit,
  onToggleTempUnit,
  onOpenThresholds,
}) => {
  const { rh, temp, battery, rssi } = device.telemetry;
  const [thresholds, setThresholds] = useState<AlarmThresholds>(
    alarmThresholdService.getThresholds()
  );

  useEffect(() => {
    const unsub = alarmThresholdService.subscribe((newThresholds) => {
      setThresholds(newThresholds);
    });
    return unsub;
  }, []);

  // Relative Humidity Quality Evaluation based on configured thresholds
  const getRhStatus = (val: number) => {
    if (val < thresholds.rhLowCritical) {
      return {
        label: 'CRITICALLY DRY',
        color: 'text-blue-400',
        bg: 'bg-blue-950/40',
        border: 'border-blue-500/30',
        barColor: 'bg-blue-500',
        desc: `Below critical ${thresholds.rhLowCritical}%. Wrap cigars immediately.`,
      };
    }
    if (val < thresholds.rhLowWarning) {
      return {
        label: 'DRY ZONE',
        color: 'text-sky-300',
        bg: 'bg-sky-950/40',
        border: 'border-sky-500/30',
        barColor: 'bg-sky-400',
        desc: `Below target sweet spot (${thresholds.rhLowWarning}%–${thresholds.rhHighWarning}%).`,
      };
    }
    if (val <= thresholds.rhHighWarning) {
      return {
        label: 'PERFECT SWEET SPOT',
        color: 'text-emerald-400',
        bg: 'bg-emerald-950/40',
        border: 'border-emerald-500/30',
        barColor: 'bg-emerald-500',
        desc: 'Optimal cell aging & essential oil preservation.',
      };
    }
    if (val <= thresholds.rhHighCritical) {
      return {
        label: 'HIGH WARNING',
        color: 'text-amber-400',
        bg: 'bg-amber-950/40',
        border: 'border-amber-500/30',
        barColor: 'bg-amber-400',
        desc: `Approaching upper threshold limit (${thresholds.rhHighCritical}%).`,
      };
    }
    return {
      label: 'CRITICAL HIGH',
      color: 'text-rose-400',
      bg: 'bg-rose-950/40',
      border: 'border-rose-500/30',
      barColor: 'bg-rose-500',
      desc: `Upper critical threshold exceeded (> ${thresholds.rhHighCritical}%).`,
    };
  };

  // Temperature Evaluation based on configured thresholds
  const getTempStatus = (tempF: number) => {
    if (tempF > thresholds.tempHighCritical) {
      return {
        label: `CRITICAL HIGH (>${thresholds.tempHighCritical}°F)`,
        color: 'text-rose-400',
        bg: 'bg-rose-950/40',
        border: 'border-rose-500/30',
        barColor: 'bg-rose-500',
      };
    }
    if (tempF > thresholds.tempHighWarning) {
      return {
        label: `HIGH WARNING (>${thresholds.tempHighWarning}°F)`,
        color: 'text-amber-400',
        bg: 'bg-amber-950/40',
        border: 'border-amber-500/30',
        barColor: 'bg-amber-400',
      };
    }
    if (tempF < thresholds.tempLowCritical) {
      return {
        label: `CRITICAL LOW (<${thresholds.tempLowCritical}°F)`,
        color: 'text-rose-400',
        bg: 'bg-rose-950/40',
        border: 'border-rose-500/30',
        barColor: 'bg-rose-500',
      };
    }
    if (tempF < thresholds.tempLowWarning) {
      return {
        label: `LOW WARNING (<${thresholds.tempLowWarning}°F)`,
        color: 'text-blue-300',
        bg: 'bg-blue-950/40',
        border: 'border-blue-500/30',
        barColor: 'bg-blue-400',
      };
    }
    return {
      label: `OPTIMAL (${thresholds.tempLowWarning}–${thresholds.tempHighWarning}°F)`,
      color: 'text-emerald-400',
      bg: 'bg-emerald-950/40',
      border: 'border-emerald-500/30',
      barColor: 'bg-emerald-500',
    };
  };

  const rhStatus = getRhStatus(rh);
  const tempStatus = getTempStatus(temp);

  const displayTemp = tempUnit === 'C' ? (((temp - 32) * 5) / 9).toFixed(1) : temp.toFixed(1);
  const tempUnitSymbol = tempUnit === 'C' ? '°C' : '°F';

  // Battery percentage color based on batteryLowCritical threshold
  const getBatteryColor = (lvl: number) => {
    if (lvl > 50) return 'text-emerald-400';
    if (lvl > thresholds.batteryLowCritical) return 'text-amber-400';
    return 'text-rose-400';
  };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
      {/* 1. Relative Humidity Gauge Card */}
      <div className={`bg-slate-900/90 border ${rhStatus.border} rounded-2xl p-3.5 sm:p-5 shadow-xl relative overflow-hidden transition-all backdrop-blur-sm flex flex-col justify-between`}>
        <div>
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className={`p-1.5 sm:p-2 rounded-xl ${rhStatus.bg} ${rhStatus.color}`}>
                <Droplets className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div>
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400">RH %</span>
                <span className={`block text-[10px] sm:text-[11px] font-bold ${rhStatus.color} truncate max-w-[110px] sm:max-w-none`}>{rhStatus.label}</span>
              </div>
            </div>
            {onOpenThresholds ? (
              <button
                type="button"
                onClick={onOpenThresholds}
                className="text-[10px] font-mono text-amber-400 hover:text-amber-300 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800 flex items-center gap-1 transition"
                title="Configure Alarm & Climate Thresholds"
              >
                <Sliders className="w-2.5 h-2.5" />
                <span className="hidden sm:inline">Tune</span>
              </button>
            ) : (
              <span className="text-[10px] sm:text-[11px] font-mono text-slate-500 bg-slate-950 px-1.5 sm:px-2 py-0.5 rounded-md border border-slate-800">
                SHT40
              </span>
            )}
          </div>

          <div className="my-2 sm:my-3 flex items-baseline justify-between">
            <div className="flex items-baseline gap-1">
              <span className="text-3xl sm:text-4xl font-extrabold font-display tracking-tight text-white">
                {rh.toFixed(1)}
              </span>
              <span className="text-xl sm:text-2xl font-bold text-slate-400 font-display">%</span>
            </div>
            <div className="text-right text-[11px] sm:text-xs font-mono text-slate-400">
              <span>Safe: {thresholds.rhLowWarning}–{thresholds.rhHighWarning}%</span>
            </div>
          </div>

          {/* Progress Bar with configured target highlight */}
          <div className="space-y-1 mt-2 sm:mt-4">
            <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden relative border border-slate-800">
              <div
                className={`h-full ${rhStatus.barColor} transition-all duration-500 rounded-full`}
                style={{ width: `${Math.min(Math.max(rh, 0), 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-[9px] sm:text-[10px] font-mono text-slate-500">
              <span>{thresholds.rhLowCritical}%</span>
              <span className="text-emerald-400">{thresholds.rhLowWarning}%–{thresholds.rhHighWarning}%</span>
              <span>{thresholds.rhHighCritical}%</span>
            </div>
          </div>
        </div>

        <p className="mt-2.5 sm:mt-3 text-[10px] sm:text-[11px] text-slate-400 leading-tight sm:leading-relaxed hidden xs:block">
          {rhStatus.desc}
        </p>
      </div>

      {/* 2. Temperature Gauge Card */}
      <div className={`bg-slate-900/90 border ${tempStatus.border} rounded-2xl p-3.5 sm:p-5 shadow-xl relative overflow-hidden transition-all backdrop-blur-sm flex flex-col justify-between`}>
        <div>
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className={`p-1.5 sm:p-2 rounded-xl ${tempStatus.bg} ${tempStatus.color}`}>
                <Thermometer className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div>
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400">Temp</span>
                <span className={`block text-[10px] sm:text-[11px] font-bold ${tempStatus.color} truncate max-w-[110px] sm:max-w-none`}>{tempStatus.label}</span>
              </div>
            </div>
            {onToggleTempUnit && (
              <button
                type="button"
                onClick={onToggleTempUnit}
                className="text-[10px] sm:text-[11px] font-mono text-slate-300 hover:text-amber-400 bg-slate-950 px-1.5 sm:px-2 py-0.5 rounded-md border border-slate-800 transition-colors cursor-pointer"
              >
                {tempUnit}
              </button>
            )}
          </div>

          <div className="my-2 sm:my-3 flex items-baseline justify-between">
            <div className="flex items-baseline gap-1">
              <span className="text-3xl sm:text-4xl font-extrabold font-display tracking-tight text-white">
                {displayTemp}
              </span>
              <span className="text-xl sm:text-2xl font-bold text-slate-400 font-display">{tempUnitSymbol}</span>
            </div>
            <div className="text-right text-[11px] sm:text-xs font-mono text-slate-400">
              <span>Max: {tempUnit === 'C' ? (((thresholds.tempHighCritical - 32) * 5) / 9).toFixed(1) + '°C' : `${thresholds.tempHighCritical}°F`}</span>
            </div>
          </div>

          <div className="space-y-1 mt-2 sm:mt-4">
            <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden relative border border-slate-800">
              <div
                className={`h-full ${tempStatus.barColor} transition-all duration-500 rounded-full`}
                style={{ width: `${Math.min(Math.max(((temp - 50) / 40) * 100, 0), 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-[9px] sm:text-[10px] font-mono text-slate-500">
              <span>{thresholds.tempLowWarning}°F</span>
              <span className="text-emerald-400">Safe Range</span>
              <span>{thresholds.tempHighCritical}°F</span>
            </div>
          </div>
        </div>

        <p className="mt-2.5 sm:mt-3 text-[10px] sm:text-[11px] text-slate-400 leading-tight sm:leading-relaxed hidden xs:block">
          Keep between {tempUnit === 'C' ? (((thresholds.tempLowWarning - 32) * 5 / 9).toFixed(1) + '°C – ' + ((thresholds.tempHighWarning - 32) * 5 / 9).toFixed(1) + '°C') : `${thresholds.tempLowWarning}°F – ${thresholds.tempHighWarning}°F`} configured target boundary.
        </p>
      </div>

      {/* 3. Battery & Power Cell Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 sm:p-5 shadow-xl relative overflow-hidden backdrop-blur-sm flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="p-1.5 sm:p-2 rounded-xl bg-slate-800 text-amber-400 border border-slate-700">
                <Battery className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div>
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400">LiPo Cell</span>
                <span className={`block text-[10px] sm:text-[11px] font-bold ${getBatteryColor(battery)} truncate max-w-[110px] sm:max-w-none`}>
                  {battery > thresholds.batteryLowCritical ? 'LiPo Normal' : 'Low Cell Alert'}
                </span>
              </div>
            </div>
            <span className="text-[10px] sm:text-[11px] font-mono text-slate-500 bg-slate-950 px-1.5 sm:px-2 py-0.5 rounded-md border border-slate-800">
              3.7V
            </span>
          </div>

          <div className="my-2 sm:my-3 flex items-baseline justify-between">
            <div className="flex items-baseline gap-1">
              <span className={`text-3xl sm:text-4xl font-extrabold font-display tracking-tight ${getBatteryColor(battery)}`}>
                {battery}
              </span>
              <span className="text-xl sm:text-2xl font-bold text-slate-400 font-display">%</span>
            </div>
            <div className="text-right text-[11px] sm:text-xs font-mono text-slate-400">
              <span>~{Math.round((battery / 100) * 180)} Days</span>
            </div>
          </div>

          <div className="space-y-1 mt-2 sm:mt-4">
            <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800">
              <div
                className={`h-full ${battery > 50 ? 'bg-emerald-500' : battery > thresholds.batteryLowCritical ? 'bg-amber-500' : 'bg-rose-500'} transition-all duration-500 rounded-full`}
                style={{ width: `${Math.min(Math.max(battery, 0), 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-[9px] sm:text-[10px] font-mono text-slate-500">
              <span>0%</span>
              <span>Sleep RTC</span>
              <span>100%</span>
            </div>
          </div>
        </div>

        <p className="mt-2.5 sm:mt-3 text-[10px] sm:text-[11px] text-slate-400 leading-tight sm:leading-relaxed hidden xs:block">
          Deep-sleep: {device.sharedAttributes.sleep_interval_min || 15}m intervals. Low alert: &lt;{thresholds.batteryLowCritical}%.
        </p>
      </div>

      {/* 4. RF Signal & Telemetry Link Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 sm:p-5 shadow-xl relative overflow-hidden backdrop-blur-sm flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="p-1.5 sm:p-2 rounded-xl bg-slate-800 text-sky-400 border border-slate-700">
                <Wifi className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div>
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400">Wireless</span>
                <span className="block text-[10px] sm:text-[11px] font-bold text-sky-400 truncate max-w-[110px] sm:max-w-none">
                  {device.clientAttributes.ssid || 'Wi-Fi'}
                </span>
              </div>
            </div>
            <span className="text-[10px] sm:text-[11px] font-mono text-slate-500 bg-slate-950 px-1.5 sm:px-2 py-0.5 rounded-md border border-slate-800">
              ESP32
            </span>
          </div>

          <div className="my-2 sm:my-3 flex items-baseline justify-between">
            <div className="flex items-baseline gap-1">
              <span className="text-3xl sm:text-4xl font-extrabold font-display tracking-tight text-white">
                {rssi}
              </span>
              <span className="text-xl sm:text-2xl font-bold text-slate-400 font-display">dBm</span>
            </div>
            <div className="text-right text-[11px] sm:text-xs font-mono text-slate-400">
              <span>{rssi >= -65 ? 'Strong' : rssi >= -80 ? 'Good' : 'Fair'}</span>
            </div>
          </div>

          <div className="space-y-1 mt-2 sm:mt-4">
            <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800">
              <div
                className="h-full bg-sky-500 transition-all duration-500 rounded-full"
                style={{ width: `${Math.min(Math.max(((rssi + 100) / 70) * 100, 5), 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-[9px] sm:text-[10px] font-mono text-slate-500">
              <span>-100 dBm</span>
              <span>Gateway Link</span>
              <span>-30 dBm</span>
            </div>
          </div>
        </div>

        <p className="mt-2.5 sm:mt-3 text-[10px] sm:text-[11px] text-slate-400 leading-tight sm:leading-relaxed hidden xs:block">
          ThingsBoard MQTT/REST gateway synchronization active.
        </p>
      </div>
    </div>
  );
};

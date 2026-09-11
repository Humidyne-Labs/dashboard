import React, { useState, useEffect } from 'react';
import { HumidorDevice, TempUnit } from '../types';
import { alarmThresholdService, AlarmThresholds, toDisplayTemp, toKelvinTemp } from '../services/alarmThresholds';
import { 
  Droplets, 
  Thermometer, 
  Battery, 
  Wifi, 
  Sliders
} from 'lucide-react';

interface ClimateGaugesProps {
  device: HumidorDevice;
  tempUnit: TempUnit;
  onToggleTempUnit?: () => void;
}

export const ClimateGauges: React.FC<ClimateGaugesProps> = ({
  device,
  tempUnit,
  onToggleTempUnit,
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
        color: 'text-app-status-info',
        bg: 'bg-app-bg/40',
        border: 'border-app-status-info/30',
        barColor: 'bg-app-status-info',
        desc: `Below critical ${thresholds.rhLowCritical}%. Wrap cigars immediately.`,
      };
    }
    if (val < thresholds.rhLowWarning) {
      return {
        label: 'DRY ZONE',
        color: 'text-app-status-info',
        bg: 'bg-app-bg/40',
        border: 'border-app-status-info/30',
        barColor: 'bg-app-status-info',
        desc: `Below target sweet spot (${thresholds.rhLowWarning}%–${thresholds.rhHighWarning}%).`,
      };
    }
    if (val <= thresholds.rhHighWarning) {
      return {
        label: 'PERFECT SWEET SPOT',
        color: 'text-app-status-nominal',
        bg: 'bg-app-bg/40',
        border: 'border-app-status-nominal/30',
        barColor: 'bg-app-status-nominal',
        desc: 'Optimal cell aging & essential oil preservation.',
      };
    }
    if (val <= thresholds.rhHighCritical) {
      return {
        label: 'HIGH WARNING',
        color: 'text-app-accent',
        bg: 'bg-app-bg/40',
        border: 'border-app-accent/30',
        barColor: 'bg-app-accent',
        desc: `Approaching upper threshold limit (${thresholds.rhHighCritical}%).`,
      };
    }
    return {
      label: 'CRITICAL HIGH',
      color: 'text-app-status-critical',
      bg: 'bg-app-bg/40',
      border: 'border-app-status-critical/30',
      barColor: 'bg-app-status-critical',
      desc: `Upper critical threshold exceeded (> ${thresholds.rhHighCritical}%).`,
    };
  };

  const kTemp = toKelvinTemp(temp);
  const displayTemp = toDisplayTemp(kTemp, tempUnit).toFixed(1);
  const tempUnitSymbol = `°${tempUnit}`;

  const dispTempLowCrit = toDisplayTemp(thresholds.tempLowCritical, tempUnit);
  const dispTempLowWarn = toDisplayTemp(thresholds.tempLowWarning, tempUnit);
  const dispTempHighWarn = toDisplayTemp(thresholds.tempHighWarning, tempUnit);
  const dispTempHighCrit = toDisplayTemp(thresholds.tempHighCritical, tempUnit);

  // Temperature Evaluation based on configured thresholds (evaluated in Kelvin)
  const getTempStatus = (rawTemp: number) => {
    const k = toKelvinTemp(rawTemp);
    if (k > thresholds.tempHighCritical) {
      return {
        label: `CRITICAL HIGH (>${dispTempHighCrit}${tempUnitSymbol})`,
        color: 'text-app-status-critical',
        bg: 'bg-app-bg/40',
        border: 'border-app-status-critical/30',
        barColor: 'bg-app-status-critical',
      };
    }
    if (k > thresholds.tempHighWarning) {
      return {
        label: `HIGH WARNING (>${dispTempHighWarn}${tempUnitSymbol})`,
        color: 'text-app-accent',
        bg: 'bg-app-bg/40',
        border: 'border-app-accent/30',
        barColor: 'bg-app-accent',
      };
    }
    if (k < thresholds.tempLowCritical) {
      return {
        label: `CRITICAL LOW (<${dispTempLowCrit}${tempUnitSymbol})`,
        color: 'text-app-status-critical',
        bg: 'bg-app-bg/40',
        border: 'border-app-status-critical/30',
        barColor: 'bg-app-status-critical',
      };
    }
    if (k < thresholds.tempLowWarning) {
      return {
        label: `LOW WARNING (<${dispTempLowWarn}${tempUnitSymbol})`,
        color: 'text-app-status-info',
        bg: 'bg-app-bg/40',
        border: 'border-app-status-info/30',
        barColor: 'bg-app-status-info',
      };
    }
    return {
      label: `OPTIMAL (${dispTempLowWarn}–${dispTempHighWarn}${tempUnitSymbol})`,
      color: 'text-app-status-nominal',
      bg: 'bg-app-bg/40',
      border: 'border-app-status-nominal/30',
      barColor: 'bg-app-status-nominal',
    };
  };

  const rhStatus = getRhStatus(rh);
  const tempStatus = getTempStatus(temp);

  // Battery percentage color based on batteryLowCritical threshold
  const getBatteryColor = (lvl: number) => {
    if (lvl > 50) return 'text-app-status-nominal';
    if (lvl > thresholds.batteryLowCritical) return 'text-app-accent';
    return 'text-app-status-critical';
  };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
      {/* 1. Relative Humidity Gauge Card */}
      <div className={`bg-app-surface/90 border ${rhStatus.border} rounded-2xl p-3.5 sm:p-5 shadow-xl relative overflow-hidden transition-all backdrop-blur-sm flex flex-col justify-between`}>
        <div>
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className={`p-1.5 sm:p-2 rounded-xl ${rhStatus.bg} ${rhStatus.color} border border-app-border-highlight`}>
                <Droplets className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div>
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-app-text-secondary">RH %</span>
                <span className={`block text-[10px] sm:text-[11px] font-bold ${rhStatus.color} truncate max-w-[110px] sm:max-w-none`}>{rhStatus.label}</span>
              </div>
            </div>
          </div>

          <div className="my-2 sm:my-3 flex items-baseline justify-between">
            <div className="flex items-baseline gap-1">
              <span className="text-3xl sm:text-4xl font-extrabold font-display tracking-tight text-app-text-primary">
                {rh.toFixed(1)}
              </span>
              <span className="text-xl sm:text-2xl font-bold text-app-text-secondary font-display">%</span>
            </div>
            <div className="text-right text-[11px] sm:text-xs font-mono text-app-text-secondary">
              <span>Safe: {thresholds.rhLowWarning}–{thresholds.rhHighWarning}%</span>
            </div>
          </div>

          {/* Progress Bar with configured target highlight */}
          <div className="space-y-1 mt-2 sm:mt-4">
            <div className="h-2 w-full bg-app-bg rounded overflow-hidden relative border border-app-border">
              <div
                className={`h-full ${rhStatus.barColor} transition-all duration-500 rounded`}
                style={{ width: `${Math.min(Math.max(rh, 0), 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-[9px] sm:text-[10px] font-mono text-app-text-muted">
              <span>{thresholds.rhLowCritical}%</span>
              <span className="text-app-status-nominal">{thresholds.rhLowWarning}%–{thresholds.rhHighWarning}%</span>
              <span>{thresholds.rhHighCritical}%</span>
            </div>
          </div>
        </div>

        <p className="mt-2.5 sm:mt-3 text-[10px] sm:text-[11px] text-app-text-secondary leading-tight sm:leading-relaxed hidden xs:block">
          {rhStatus.desc}
        </p>
      </div>

      {/* 2. Temperature Gauge Card */}
      <div className={`bg-app-surface/90 border ${tempStatus.border} rounded-2xl p-3.5 sm:p-5 shadow-xl relative overflow-hidden transition-all backdrop-blur-sm flex flex-col justify-between`}>
        <div>
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className={`p-1.5 sm:p-2 rounded-xl ${tempStatus.bg} ${tempStatus.color} border border-app-border-highlight`}>
                <Thermometer className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div>
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-app-text-secondary">Temp</span>
                <span className={`block text-[10px] sm:text-[11px] font-bold ${tempStatus.color} truncate max-w-[110px] sm:max-w-none`}>{tempStatus.label}</span>
              </div>
            </div>
          </div>

          <div className="my-2 sm:my-3 flex items-baseline justify-between">
            <div className="flex items-baseline gap-1">
              <span className="text-3xl sm:text-4xl font-extrabold font-display tracking-tight text-app-text-primary">
                {displayTemp}
              </span>
              <span className="text-xl sm:text-2xl font-bold text-app-text-secondary font-display">{tempUnitSymbol}</span>
            </div>
            <div className="text-right text-[11px] sm:text-xs font-mono text-app-text-secondary">
              <span>Max: {dispTempHighCrit}{tempUnitSymbol}</span>
            </div>
          </div>

          <div className="space-y-1 mt-2 sm:mt-4">
            <div className="h-2 w-full bg-app-bg rounded overflow-hidden relative border border-app-border">
              <div
                className={`h-full ${tempStatus.barColor} transition-all duration-500 rounded`}
                style={{
                  width: `${Math.min(
                    Math.max(
                      tempUnit === 'C'
                        ? ((Number(displayTemp) - 10) / 22) * 100
                        : ((Number(displayTemp) - 50) / 40) * 100,
                      0
                    ),
                    100
                  )}%`,
                }}
              />
            </div>
            <div className="flex justify-between text-[9px] sm:text-[10px] font-mono text-app-text-muted">
              <span>{dispTempLowWarn}{tempUnitSymbol}</span>
              <span className="text-app-status-nominal">Safe Range</span>
              <span>{dispTempHighCrit}{tempUnitSymbol}</span>
            </div>
          </div>
        </div>

        <p className="mt-2.5 sm:mt-3 text-[10px] sm:text-[11px] text-app-text-secondary leading-tight sm:leading-relaxed hidden xs:block">
          Keep between {dispTempLowWarn}{tempUnitSymbol} – {dispTempHighWarn}{tempUnitSymbol} configured target boundary.
        </p>
      </div>

      {/* 3. Battery & Power Cell Card */}
      <div className="bg-app-surface/90 border border-app-border rounded-2xl p-3.5 sm:p-5 shadow-xl relative overflow-hidden backdrop-blur-sm flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="p-1.5 sm:p-2 rounded-xl bg-app-surface-elevated text-app-accent border border-app-border-highlight">
                <Battery className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div>
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-app-text-secondary">400mAh LiPo</span>
                <span className={`block text-[10px] sm:text-[11px] font-bold ${getBatteryColor(battery)} truncate max-w-[110px] sm:max-w-none`}>
                  {battery > thresholds.batteryLowCritical ? 'LiPo Nominal' : 'Low Cell Alert'}
                </span>
              </div>
            </div>
          </div>

          <div className="my-2 sm:my-3 flex items-baseline justify-between">
            <div className="flex items-baseline gap-1">
              <span className={`text-3xl sm:text-4xl font-extrabold font-display tracking-tight ${getBatteryColor(battery)}`}>
                {battery}
              </span>
              <span className="text-xl sm:text-2xl font-bold text-app-text-secondary font-display">%</span>
            </div>
            <div className="text-right text-[11px] sm:text-xs font-mono text-app-text-secondary">
              <span className="text-app-status-nominal/90 font-medium">RTC Wake Cycles</span>
            </div>
          </div>

          <div className="space-y-1 mt-2 sm:mt-4">
            <div className="h-2 w-full bg-app-bg rounded overflow-hidden border border-app-border">
              <div
                className={`h-full ${battery > 50 ? 'bg-app-status-nominal' : battery > thresholds.batteryLowCritical ? 'bg-app-accent' : 'bg-app-status-critical'} transition-all duration-500 rounded`}
                style={{ width: `${Math.min(Math.max(battery, 0), 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-[9px] sm:text-[10px] font-mono text-app-text-muted">
              <span>0%</span>
              <span>Deep-Sleep RTC</span>
              <span>100%</span>
            </div>
          </div>
        </div>

        <p className="mt-2.5 sm:mt-3 text-[10px] sm:text-[11px] text-app-text-secondary leading-tight sm:leading-relaxed hidden xs:block">
          Deep-sleep: {device.sharedAttributes.sleep_interval_min || 15}m intervals. Low alert: &lt;{thresholds.batteryLowCritical}%.
        </p>
      </div>

      {/* 4. RF Signal & Telemetry Link Card */}
      <div className="bg-app-surface/90 border border-app-border rounded-2xl p-3.5 sm:p-5 shadow-xl relative overflow-hidden backdrop-blur-sm flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="p-1.5 sm:p-2 rounded-xl bg-app-surface-elevated text-app-status-info border border-app-border-highlight">
                <Wifi className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div>
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-app-text-secondary">Wireless</span>
                <span className="block text-[10px] sm:text-[11px] font-bold text-app-status-info truncate max-w-[110px] sm:max-w-none">
                  {device.clientAttributes.ssid || 'Wi-Fi'}
                </span>
              </div>
            </div>
          </div>

          <div className="my-2 sm:my-3 flex items-baseline justify-between">
            <div className="flex items-baseline gap-1">
              <span className="text-3xl sm:text-4xl font-extrabold font-display tracking-tight text-app-text-primary">
                {rssi}
              </span>
              <span className="text-xl sm:text-2xl font-bold text-app-text-secondary font-display">dBm</span>
            </div>
            <div className="text-right text-[11px] sm:text-xs font-mono text-app-text-secondary">
              <span>{rssi >= -65 ? 'Strong' : rssi >= -80 ? 'Good' : 'Fair'}</span>
            </div>
          </div>

          <div className="space-y-1 mt-2 sm:mt-4">
            <div className="h-2 w-full bg-app-bg rounded overflow-hidden border border-app-border">
              <div
                className="h-full bg-app-status-info transition-all duration-500 rounded"
                style={{ width: `${Math.min(Math.max(((rssi + 100) / 70) * 100, 5), 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-[9px] sm:text-[10px] font-mono text-app-text-muted">
              <span>-100 dBm</span>
              <span>Gateway Link</span>
              <span>-30 dBm</span>
            </div>
          </div>
        </div>

        <p className="mt-2.5 sm:mt-3 text-[10px] sm:text-[11px] text-app-text-secondary leading-tight sm:leading-relaxed hidden xs:block">
          ThingsBoard MQTT/REST gateway synchronization active.
        </p>
      </div>
    </div>
  );
};

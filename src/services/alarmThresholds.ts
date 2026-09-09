import { AlarmThresholds, TempUnit } from '../types';

export type { AlarmThresholds };

/**
 * Default runtime alarm thresholds & hysteresis constants
 * All temperature values stored canonically in Kelvin (K).
 * 58°F = 287.59 K | 64°F = 290.93 K | 72°F = 295.37 K | 75°F = 297.04 K
 */
export const DEFAULT_THRESHOLDS: AlarmThresholds = {
  rhLowCritical: 62.0,
  rhLowWarning: 65.0,
  rhHighWarning: 73.0,
  rhHighCritical: 76.0,

  tempLowCritical: 287.59, // 58.0°F / 14.4°C
  tempLowWarning: 290.93,  // 64.0°F / 17.8°C
  tempHighWarning: 295.37, // 72.0°F / 22.2°C
  tempHighCritical: 297.04,// 75.0°F / 23.9°C

  batteryLowCritical: 15.0,
  batteryLowWarning: 25.0,

  rhHist: 1.5,
  tempHist: 0.56,          // 1.0°F delta = 0.56 K delta
  battHist: 2.0,
};

export interface ThresholdPreset {
  id: 'sensitive' | 'normal' | 'relaxed';
  name: string;
  description: string;
  thresholds: AlarmThresholds;
}

/**
 * Presets: 'sensitive', 'normal', and 'relaxed' in canonical Kelvin (K)
 */
export const THRESHOLD_PRESETS: ThresholdPreset[] = [
  {
    id: 'sensitive',
    name: 'Sensitive',
    description: 'Strict tolerance bands (±2% RH, ±2°F/1.1K) and low hysteresis (0.28K) for tight, proactive monitoring.',
    thresholds: {
      rhLowCritical: 65.0,
      rhLowWarning: 67.0,
      rhHighWarning: 71.0,
      rhHighCritical: 73.0,

      tempLowCritical: 289.82, // 62.0°F
      tempLowWarning: 291.48,  // 65.0°F
      tempHighWarning: 294.82, // 71.0°F
      tempHighCritical: 295.93,// 73.0°F

      batteryLowCritical: 20.0,
      batteryLowWarning: 30.0,

      rhHist: 0.5,
      tempHist: 0.28,
      battHist: 1.0,
    },
  },
  {
    id: 'normal',
    name: 'Normal',
    description: 'Standard recommended envelope (65–73% RH, 64–72°F / 290.9–295.4K) with moderate hysteresis for daily control.',
    thresholds: {
      rhLowCritical: 62.0,
      rhLowWarning: 65.0,
      rhHighWarning: 73.0,
      rhHighCritical: 76.0,

      tempLowCritical: 287.59, // 58.0°F
      tempLowWarning: 290.93,  // 64.0°F
      tempHighWarning: 295.37, // 72.0°F
      tempHighCritical: 297.04,// 75.0°F

      batteryLowCritical: 15.0,
      batteryLowWarning: 25.0,

      rhHist: 1.5,
      tempHist: 0.56,
      battHist: 2.0,
    },
  },
  {
    id: 'relaxed',
    name: 'Relaxed',
    description: 'Wider boundaries (62–75% RH, 60–74°F / 288.7–296.5K) with generous hysteresis preventing alerts during seasonal shifts.',
    thresholds: {
      rhLowCritical: 58.0,
      rhLowWarning: 62.0,
      rhHighWarning: 75.0,
      rhHighCritical: 79.0,

      tempLowCritical: 285.93, // 55.0°F
      tempLowWarning: 288.71,  // 60.0°F
      tempHighWarning: 296.48, // 74.0°F
      tempHighCritical: 298.71,// 78.0°F

      batteryLowCritical: 10.0,
      batteryLowWarning: 20.0,

      rhHist: 2.5,
      tempHist: 1.11,
      battHist: 3.0,
    },
  },
];

/**
 * Temperature Unit Conversion Helpers
 * Canonical storage is ALWAYS in Kelvin (K).
 */
export const toDisplayTemp = (kVal: number, unit: TempUnit | 'K'): number => {
  if (typeof kVal !== 'number' || isNaN(kVal)) return 0;
  if (unit === 'C') {
    return Number((kVal - 273.15).toFixed(1));
  }
  if (unit === 'F') {
    return Number(((kVal - 273.15) * (9 / 5) + 32).toFixed(1));
  }
  return Number(kVal.toFixed(1));
};

export const fromDisplayTemp = (dispVal: number, unit: TempUnit | 'K'): number => {
  if (typeof dispVal !== 'number' || isNaN(dispVal)) return 295.37;
  if (unit === 'C') {
    return Number((dispVal + 273.15).toFixed(2));
  }
  if (unit === 'F') {
    return Number(((dispVal - 32) * (5 / 9) + 273.15).toFixed(2));
  }
  return Number(dispVal.toFixed(2));
};

/**
 * Temperature Differential / Hysteresis Conversion
 */
export const toDisplayDelta = (kDelta: number, unit: TempUnit | 'K'): number => {
  if (typeof kDelta !== 'number' || isNaN(kDelta)) return 0;
  if (unit === 'F') {
    return Number((kDelta * (9 / 5)).toFixed(1));
  }
  return Number(kDelta.toFixed(1));
};

export const fromDisplayDelta = (dispDelta: number, unit: TempUnit | 'K'): number => {
  if (typeof dispDelta !== 'number' || isNaN(dispDelta)) return 0.56;
  if (unit === 'F') {
    return Number((dispDelta * (5 / 9)).toFixed(2));
  }
  return Number(dispDelta.toFixed(2));
};

/**
 * Converts any arbitrary temperature reading (Kelvin, Fahrenheit, or Celsius) to canonical Kelvin.
 */
export const toKelvinTemp = (val: number, assumedUnit?: TempUnit | 'K'): number => {
  if (typeof val !== 'number' || isNaN(val)) return 295.37; // Default fallback (72°F / 22.2°C)
  
  if (assumedUnit === 'K') return val;
  if (assumedUnit === 'C') return val + 273.15;
  if (assumedUnit === 'F') return (val - 32) * (5 / 9) + 273.15;

  // Auto-detect unit if not specified:
  if (val > 200) {
    return val; // Already Kelvin (e.g. 295.37 K)
  }
  if (val > 45) {
    return (val - 32) * (5 / 9) + 273.15; // Fahrenheit (e.g. 72°F)
  }
  return val + 273.15; // Celsius (e.g. 22.2°C)
};

/**
 * Auto-detects and converts threshold values stored in °F, °C, or Kelvin into canonical Kelvin (K).
 */
export const sanitizeToCanonicalKelvin = (th?: Partial<AlarmThresholds>): AlarmThresholds => {
  if (!th) return { ...DEFAULT_THRESHOLDS };

  const rawCritHigh = Number(th.tempHighCritical ?? DEFAULT_THRESHOLDS.tempHighCritical);
  const rawWarnHigh = Number(th.tempHighWarning ?? DEFAULT_THRESHOLDS.tempHighWarning);
  const rawWarnLow = Number(th.tempLowWarning ?? DEFAULT_THRESHOLDS.tempLowWarning);
  const rawCritLow = Number(th.tempLowCritical ?? DEFAULT_THRESHOLDS.tempLowCritical);
  const rawHist = Number(th.tempHist ?? DEFAULT_THRESHOLDS.tempHist);

  let tempHighCritical: number;
  let tempHighWarning: number;
  let tempLowWarning: number;
  let tempLowCritical: number;
  let tempHist: number;

  if (rawCritHigh > 200) {
    // Already in Kelvin!
    tempHighCritical = rawCritHigh;
    tempHighWarning = rawWarnHigh;
    tempLowWarning = rawWarnLow;
    tempLowCritical = rawCritLow;
    tempHist = rawHist;
  } else if (rawCritHigh > 45) {
    // Input is in Fahrenheit (°F)
    tempHighCritical = Number(((rawCritHigh - 32) * (5 / 9) + 273.15).toFixed(2));
    tempHighWarning = Number(((rawWarnHigh - 32) * (5 / 9) + 273.15).toFixed(2));
    tempLowWarning = Number(((rawWarnLow - 32) * (5 / 9) + 273.15).toFixed(2));
    tempLowCritical = Number(((rawCritLow - 32) * (5 / 9) + 273.15).toFixed(2));
    tempHist = Number((rawHist * (5 / 9)).toFixed(2));
  } else {
    // Input is in Celsius (°C)
    tempHighCritical = Number((rawCritHigh + 273.15).toFixed(2));
    tempHighWarning = Number((rawWarnHigh + 273.15).toFixed(2));
    tempLowWarning = Number((rawWarnLow + 273.15).toFixed(2));
    tempLowCritical = Number((rawCritLow + 273.15).toFixed(2));
    tempHist = Number(rawHist.toFixed(2));
  }

  return {
    rhLowCritical: Number(th.rhLowCritical ?? DEFAULT_THRESHOLDS.rhLowCritical),
    rhLowWarning: Number(th.rhLowWarning ?? DEFAULT_THRESHOLDS.rhLowWarning),
    rhHighWarning: Number(th.rhHighWarning ?? DEFAULT_THRESHOLDS.rhHighWarning),
    rhHighCritical: Number(th.rhHighCritical ?? DEFAULT_THRESHOLDS.rhHighCritical),

    tempLowCritical,
    tempLowWarning,
    tempHighWarning,
    tempHighCritical,

    batteryLowCritical: Number(th.batteryLowCritical ?? DEFAULT_THRESHOLDS.batteryLowCritical),
    batteryLowWarning: Number(th.batteryLowWarning ?? DEFAULT_THRESHOLDS.batteryLowWarning),

    rhHist: Math.max(0, Math.min(5, Number(th.rhHist ?? DEFAULT_THRESHOLDS.rhHist))),
    tempHist: Math.max(0, Math.min(5, tempHist)),
    battHist: Math.max(0, Math.min(5, Number(th.battHist ?? DEFAULT_THRESHOLDS.battHist))),
  };
};

export const sanitizeToCanonicalFahrenheit = sanitizeToCanonicalKelvin;

export const convertThresholdsForUnitChange = (
  thresholds: AlarmThresholds,
  _fromUnit: TempUnit,
  _toUnit: TempUnit
): AlarmThresholds => {
  // Thresholds are always canonical in Kelvin, so returning sanitized thresholds works for all units
  return sanitizeToCanonicalKelvin(thresholds);
};

export const getPresetThresholds = (
  presetId: 'sensitive' | 'normal' | 'relaxed'
): AlarmThresholds => {
  const preset = THRESHOLD_PRESETS.find((p) => p.id === presetId);
  return preset ? { ...preset.thresholds } : { ...DEFAULT_THRESHOLDS };
};

export const getDefaultThresholds = (): AlarmThresholds => {
  return { ...DEFAULT_THRESHOLDS };
};

const STORAGE_KEY = 'humid1_runtime_alarm_thresholds_v2';

type ThresholdListener = (thresholds: AlarmThresholds) => void;

class AlarmThresholdService {
  private thresholds: AlarmThresholds;
  private listeners: ThresholdListener[] = [];

  constructor() {
    this.thresholds = this.loadThresholds();
  }

  private loadThresholds(): AlarmThresholds {
    if (typeof window === 'undefined') return { ...DEFAULT_THRESHOLDS };
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return sanitizeToCanonicalKelvin(parsed);
      }
    } catch (e) {
      console.warn('[AlarmThresholds] Failed to parse stored thresholds, using defaults:', e);
    }
    return { ...DEFAULT_THRESHOLDS };
  }

  public getThresholds(): AlarmThresholds {
    return { ...this.thresholds };
  }

  public saveThresholds(newThresholds: Partial<AlarmThresholds>): AlarmThresholds {
    const merged = {
      ...this.thresholds,
      ...newThresholds,
    };
    this.thresholds = sanitizeToCanonicalKelvin(merged);

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.thresholds));
      } catch (e) {
        console.warn('[AlarmThresholds] Failed to save to localStorage:', e);
      }
    }
    this.notifyListeners();
    return { ...this.thresholds };
  }

  public resetToDefaults(): AlarmThresholds {
    return this.saveThresholds(DEFAULT_THRESHOLDS);
  }

  public applyPreset(presetId: 'sensitive' | 'normal' | 'relaxed'): AlarmThresholds {
    const preset = THRESHOLD_PRESETS.find((p) => p.id === presetId);
    if (preset) {
      return this.saveThresholds(preset.thresholds);
    }
    return this.getThresholds();
  }

  public subscribe(listener: ThresholdListener): () => void {
    this.listeners.push(listener);
    listener({ ...this.thresholds });
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notifyListeners() {
    const snapshot = { ...this.thresholds };
    for (const listener of this.listeners) {
      try {
        listener(snapshot);
      } catch (e) {
        console.error('[AlarmThresholds] Listener error:', e);
      }
    }
  }
}

export const alarmThresholdService = new AlarmThresholdService();

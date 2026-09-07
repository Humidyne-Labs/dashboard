import { AlarmThresholds, TempUnit } from '../types';

export type { AlarmThresholds };

/**
 * Default runtime alarm thresholds & hysteresis constants
 * All temperature values stored canonically in °F.
 * When displaying or editing in °C, helper functions auto-scale them dynamically.
 */
export const DEFAULT_THRESHOLDS: AlarmThresholds = {
  rhLowCritical: 62.0,
  rhLowWarning: 65.0,
  rhHighWarning: 73.0,
  rhHighCritical: 76.0,

  tempLowCritical: 58.0,
  tempLowWarning: 64.0,
  tempHighWarning: 72.0,
  tempHighCritical: 75.0,

  batteryLowCritical: 15.0,
  batteryLowWarning: 25.0,

  rhHist: 1.5,
  tempHist: 1.0,
  battHist: 2.0,
};

export interface ThresholdPreset {
  id: 'sensitive' | 'normal' | 'relaxed';
  name: string;
  description: string;
  thresholds: AlarmThresholds;
}

/**
 * Presets: 'sensitive', 'normal', and 'relaxed'
 * Configures notification levels and hysteresis zones
 */
export const THRESHOLD_PRESETS: ThresholdPreset[] = [
  {
    id: 'sensitive',
    name: 'Sensitive',
    description: 'Strict tolerance bands (±2% RH, ±2°F) and low hysteresis (0.5) for tight, proactive monitoring.',
    thresholds: {
      rhLowCritical: 65.0,
      rhLowWarning: 67.0,
      rhHighWarning: 71.0,
      rhHighCritical: 73.0,

      tempLowCritical: 62.0,
      tempLowWarning: 65.0,
      tempHighWarning: 71.0,
      tempHighCritical: 73.0,

      batteryLowCritical: 20.0,
      batteryLowWarning: 30.0,

      rhHist: 0.5,
      tempHist: 0.5,
      battHist: 1.0,
    },
  },
  {
    id: 'normal',
    name: 'Normal',
    description: 'Standard recommended envelope (65–73% RH, 64–72°F) with moderate hysteresis (1.5 / 1.0) for stable daily control.',
    thresholds: {
      rhLowCritical: 62.0,
      rhLowWarning: 65.0,
      rhHighWarning: 73.0,
      rhHighCritical: 76.0,

      tempLowCritical: 58.0,
      tempLowWarning: 64.0,
      tempHighWarning: 72.0,
      tempHighCritical: 75.0,

      batteryLowCritical: 15.0,
      batteryLowWarning: 25.0,

      rhHist: 1.5,
      tempHist: 1.0,
      battHist: 2.0,
    },
  },
  {
    id: 'relaxed',
    name: 'Relaxed',
    description: 'Wider boundaries (62–75% RH, 60–74°F) with generous hysteresis (2.5 / 2.0) preventing alerts during seasonal shifts.',
    thresholds: {
      rhLowCritical: 58.0,
      rhLowWarning: 62.0,
      rhHighWarning: 75.0,
      rhHighCritical: 79.0,

      tempLowCritical: 55.0,
      tempLowWarning: 60.0,
      tempHighWarning: 74.0,
      tempHighCritical: 78.0,

      batteryLowCritical: 10.0,
      batteryLowWarning: 20.0,

      rhHist: 2.5,
      tempHist: 2.0,
      battHist: 3.0,
    },
  },
];

/**
 * Temperature Unit Conversion Helpers
 * Canonical storage is in Fahrenheit (°F).
 */
export const toDisplayTemp = (fVal: number, unit: TempUnit): number => {
  if (unit === 'C') {
    return Number(((fVal - 32) * (5 / 9)).toFixed(1));
  }
  return Number(fVal.toFixed(1));
};

export const fromDisplayTemp = (dispVal: number, unit: TempUnit): number => {
  if (unit === 'C') {
    return Number(((dispVal * (9 / 5)) + 32).toFixed(1));
  }
  return Number(dispVal.toFixed(1));
};

/**
 * Temperature Differential / Hysteresis Conversion
 */
export const toDisplayDelta = (fDelta: number, unit: TempUnit): number => {
  if (unit === 'C') {
    return Number((fDelta * (5 / 9)).toFixed(1));
  }
  return Number(fDelta.toFixed(1));
};

export const fromDisplayDelta = (dispDelta: number, unit: TempUnit): number => {
  if (unit === 'C') {
    return Number((dispDelta * (9 / 5)).toFixed(1));
  }
  return Number(dispDelta.toFixed(1));
};

const STORAGE_KEY = 'humid1_runtime_alarm_thresholds';

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
        return {
          rhLowCritical: Number(parsed.rhLowCritical ?? DEFAULT_THRESHOLDS.rhLowCritical),
          rhLowWarning: Number(parsed.rhLowWarning ?? DEFAULT_THRESHOLDS.rhLowWarning),
          rhHighWarning: Number(parsed.rhHighWarning ?? DEFAULT_THRESHOLDS.rhHighWarning),
          rhHighCritical: Number(parsed.rhHighCritical ?? DEFAULT_THRESHOLDS.rhHighCritical),

          tempLowCritical: Number(parsed.tempLowCritical ?? DEFAULT_THRESHOLDS.tempLowCritical),
          tempLowWarning: Number(parsed.tempLowWarning ?? DEFAULT_THRESHOLDS.tempLowWarning),
          tempHighWarning: Number(parsed.tempHighWarning ?? DEFAULT_THRESHOLDS.tempHighWarning),
          tempHighCritical: Number(parsed.tempHighCritical ?? DEFAULT_THRESHOLDS.tempHighCritical),

          batteryLowCritical: Number(parsed.batteryLowCritical ?? DEFAULT_THRESHOLDS.batteryLowCritical),
          batteryLowWarning: Number(parsed.batteryLowWarning ?? DEFAULT_THRESHOLDS.batteryLowWarning),

          rhHist: Math.max(0, Math.min(5, Number(parsed.rhHist ?? DEFAULT_THRESHOLDS.rhHist))),
          tempHist: Math.max(0, Math.min(5, Number(parsed.tempHist ?? DEFAULT_THRESHOLDS.tempHist))),
          battHist: Math.max(0, Math.min(5, Number(parsed.battHist ?? DEFAULT_THRESHOLDS.battHist))),
        };
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
    this.thresholds = {
      ...this.thresholds,
      ...newThresholds,
      // Clamp hysteresis values to 0 - 5.0
      rhHist: Math.max(0, Math.min(5, Number(newThresholds.rhHist ?? this.thresholds.rhHist))),
      tempHist: Math.max(0, Math.min(5, Number(newThresholds.tempHist ?? this.thresholds.tempHist))),
      battHist: Math.max(0, Math.min(5, Number(newThresholds.battHist ?? this.thresholds.battHist))),
    };
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

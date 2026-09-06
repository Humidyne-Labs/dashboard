/**
 * Runtime Alarm & Climate Thresholds Management
 * Allows live configuration of relative humidity, temperature, and battery thresholds
 * from the dashboard, persisting to localStorage and synchronizing with ThingsBoard shared attributes.
 */

export interface AlarmThresholds {
  rhLowCritical: number;      // Below this: Critically Dry danger
  rhLowWarning: number;       // Below this: Dry warning
  rhTarget: number;           // Optimal target RH
  rhHighWarning: number;      // Above this: Humid warning
  rhHighCritical: number;     // Above this: Mold Hazard danger
  tempLowWarning: number;     // Below this: Slow aging (°F)
  tempTarget: number;         // Optimal temperature target (°F)
  tempHighCritical: number;   // Above this: Tobacco Beetle Risk (°F)
  batteryLowCritical: number; // Below this: Battery alert (%)
}

export const DEFAULT_THRESHOLDS: AlarmThresholds = {
  rhLowCritical: 62.0,
  rhLowWarning: 65.0,
  rhTarget: 69.5,
  rhHighWarning: 73.0,
  rhHighCritical: 76.0,
  tempLowWarning: 64.0,
  tempTarget: 68.0,
  tempHighCritical: 74.0,
  batteryLowCritical: 20.0,
};

export interface ThresholdPreset {
  id: string;
  name: string;
  description: string;
  thresholds: AlarmThresholds;
}

export const THRESHOLD_PRESETS: ThresholdPreset[] = [
  {
    id: 'cuban-aging',
    name: 'Cuban & Long-Term Aging',
    description: 'Traditional 65% envelope favored for Cuban puros, preventing tight draws and oily leaf mold.',
    thresholds: {
      rhLowCritical: 60.0,
      rhLowWarning: 63.0,
      rhTarget: 66.0,
      rhHighWarning: 69.0,
      rhHighCritical: 72.0,
      tempLowWarning: 62.0,
      tempTarget: 66.0,
      tempHighCritical: 72.0,
      batteryLowCritical: 20.0,
    },
  },
  {
    id: 'modern-standard',
    name: 'Modern Balanced Standard',
    description: 'Industrial 69-72% equilibrium for standard New World Nicaraguan, Dominican, and Honduran blends.',
    thresholds: {
      rhLowCritical: 62.0,
      rhLowWarning: 65.0,
      rhTarget: 69.5,
      rhHighWarning: 73.0,
      rhHighCritical: 76.0,
      tempLowWarning: 64.0,
      tempTarget: 68.0,
      tempHighCritical: 74.0,
      batteryLowCritical: 20.0,
    },
  },
  {
    id: 'maduro-preservation',
    name: 'Heavy Maduro & Oily Wrapper',
    description: 'Targeted 67-70% sweet spot preventing split wrappers during climate and humidity swings.',
    thresholds: {
      rhLowCritical: 61.0,
      rhLowWarning: 64.0,
      rhTarget: 68.0,
      rhHighWarning: 71.0,
      rhHighCritical: 74.0,
      tempLowWarning: 63.0,
      tempTarget: 67.0,
      tempHighCritical: 73.0,
      batteryLowCritical: 20.0,
    },
  },
];

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
          rhTarget: Number(parsed.rhTarget ?? DEFAULT_THRESHOLDS.rhTarget),
          rhHighWarning: Number(parsed.rhHighWarning ?? DEFAULT_THRESHOLDS.rhHighWarning),
          rhHighCritical: Number(parsed.rhHighCritical ?? DEFAULT_THRESHOLDS.rhHighCritical),
          tempLowWarning: Number(parsed.tempLowWarning ?? DEFAULT_THRESHOLDS.tempLowWarning),
          tempTarget: Number(parsed.tempTarget ?? DEFAULT_THRESHOLDS.tempTarget),
          tempHighCritical: Number(parsed.tempHighCritical ?? DEFAULT_THRESHOLDS.tempHighCritical),
          batteryLowCritical: Number(parsed.batteryLowCritical ?? DEFAULT_THRESHOLDS.batteryLowCritical),
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

  public applyPreset(presetId: string): AlarmThresholds {
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

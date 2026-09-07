import { HumidorAlarm } from '../types';

export interface NotificationSettings {
  pushEnabled: boolean;
  soundEnabled: boolean;
}

const SETTINGS_STORAGE_KEY = 'humid1_notification_settings';

class NotificationService {
  private permission: NotificationPermission = 'default';
  private settings: NotificationSettings = {
    pushEnabled: true,
    soundEnabled: true,
  };
  private subscribers: Array<(settings: NotificationSettings, perm: NotificationPermission) => void> = [];
  private notifiedAlarmIds = new Set<string>();
  private audioContext: AudioContext | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      if ('Notification' in window) {
        this.permission = Notification.permission;
      }
      try {
        const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
        if (stored) {
          this.settings = { ...this.settings, ...JSON.parse(stored) };
        }
      } catch {
        // ignore storage error
      }
    }
  }

  public isSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window;
  }

  public getPermission(): NotificationPermission {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      this.permission = Notification.permission;
    }
    return this.permission;
  }

  public getSettings(): NotificationSettings {
    return { ...this.settings };
  }

  public updateSettings(partial: Partial<NotificationSettings>): void {
    this.settings = { ...this.settings, ...partial };
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(this.settings));
    } catch {
      // ignore
    }
    this.notifySubscribers();
  }

  public async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported()) {
      return 'denied';
    }
    try {
      const res = await Notification.requestPermission();
      this.permission = res;
      if (res === 'granted') {
        this.updateSettings({ pushEnabled: true });
        this.notify('HUMID1 Alerts Armed', {
          body: 'Real-time microclimate alarm notifications enabled for your humidor.',
          tag: 'humid1-welcome',
        });
      }
      this.notifySubscribers();
      return res;
    } catch (err) {
      console.warn('Notification permission request failed:', err);
      return 'denied';
    }
  }

  public subscribe(cb: (settings: NotificationSettings, perm: NotificationPermission) => void): () => void {
    this.subscribers.push(cb);
    cb(this.getSettings(), this.getPermission());
    return () => {
      this.subscribers = this.subscribers.filter((s) => s !== cb);
    };
  }

  private notifySubscribers(): void {
    const s = this.getSettings();
    const p = this.getPermission();
    for (const sub of this.subscribers) {
      try {
        sub(s, p);
      } catch {
        // ignore
      }
    }
  }

  public playAlarmSound(severity: 'CRITICAL' | 'MAJOR' | 'WARNING' | 'INFO' = 'WARNING'): void {
    if (!this.settings.soundEnabled || typeof window === 'undefined') return;

    // Use user-provided audio files in /audio/ (hosted from public/audio)
    const audioSrc = severity === 'CRITICAL' 
      ? '/audio/critical-229154.mp3'
      : '/audio/warning-129258.mp3';

    try {
      const audio = new Audio(audioSrc);
      audio.volume = severity === 'CRITICAL' ? 1.0 : 0.8;
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // If browser blocked HTMLAudioElement or file missing, fallback to Web Audio API synthesis
          this.playSyntheticAlarmSound(severity);
        });
      }
    } catch {
      this.playSyntheticAlarmSound(severity);
    }
  }

  private playSyntheticAlarmSound(severity: 'CRITICAL' | 'MAJOR' | 'WARNING' | 'INFO'): void {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      if (!this.audioContext || this.audioContext.state === 'suspended') {
        this.audioContext = new AudioCtx();
      }
      const ctx = this.audioContext;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const now = ctx.currentTime;

      if (severity === 'CRITICAL') {
        // Urgent 2-tone pulse
        [0, 0.15, 0.3].forEach((delay, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(idx % 2 === 0 ? 880 : 1174.66, now + delay);
          gain.gain.setValueAtTime(0.2, now + delay);
          gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.12);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + delay);
          osc.stop(now + delay + 0.12);
        });
      } else {
        // Warning chime: pleasant dual bell
        const freqs = [587.33, 880]; // D5, A5
        freqs.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + idx * 0.1);
          gain.gain.setValueAtTime(0.15, now + idx * 0.1);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.35);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.1);
          osc.stop(now + idx * 0.1 + 0.35);
        });
      }
    } catch {
      // Audio not permitted or locked before gesture
    }
  }

  public notifyAlarm(alarm: HumidorAlarm, deviceName?: string): void {
    // Deduplicate so we don't spam for the exact same alarm instance
    if (this.notifiedAlarmIds.has(alarm.id)) return;
    this.notifiedAlarmIds.add(alarm.id);

    // Keep set bounded
    if (this.notifiedAlarmIds.size > 200) {
      const arr = Array.from(this.notifiedAlarmIds);
      this.notifiedAlarmIds = new Set(arr.slice(arr.length - 100));
    }

    const title = `🚨 [${alarm.severity}] ${alarm.type.replace(/_/g, ' ')}`;
    const body = `${deviceName || alarm.deviceName || 'Humidor'}: ${alarm.details?.message || 'Climate condition violated threshold envelope'}`;

    this.playAlarmSound(alarm.severity);

    if (this.settings.pushEnabled && this.getPermission() === 'granted') {
      try {
        new Notification(title, {
          body,
          icon: '/favicon.svg',
          tag: `humid1-${alarm.id}`,
          requireInteraction: alarm.severity === 'CRITICAL',
          silent: true, // Disable host OS / browser default chime to prevent double sound alerts
        });
      } catch {
        // Fallback or permission blocked in context
      }
    }
  }

  public notify(title: string, options?: NotificationOptions): void {
    if (this.settings.pushEnabled && this.getPermission() === 'granted') {
      try {
        new Notification(title, {
          icon: '/favicon.svg',
          silent: true, // Disable host default sound to avoid double chime
          ...options,
        });
      } catch {
        // ignore
      }
    }
  }
}

export const notificationService = new NotificationService();

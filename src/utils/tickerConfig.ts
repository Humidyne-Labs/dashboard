/**
 * Ticker Speed & Playback State Manager
 * Supports localStorage and cookie persistence for session & user preferences.
 */

const STORAGE_KEY_SPEED = 'humid1_ticker_speed_sec';
const STORAGE_KEY_PAUSED = 'humid1_ticker_paused';
const DEFAULT_SPEED_SEC = 35; // Default smooth, readable lateral travel time

export interface TickerSettings {
  speedSec: number;
  isPaused: boolean;
}

/**
 * Reads a cookie by name.
 */
function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'));
  return match ? decodeURIComponent(match[3]) : null;
}

/**
 * Sets a cookie with standard attributes.
 */
function setCookie(name: string, value: string, days = 365): void {
  if (typeof document === 'undefined') return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

/**
 * Loads the current ticker speed (in seconds for one full conveyor cycle).
 */
export function getStoredTickerSpeed(): number {
  if (typeof window === 'undefined') return DEFAULT_SPEED_SEC;

  try {
    // 1. Check localStorage
    const local = localStorage.getItem(STORAGE_KEY_SPEED);
    if (local) {
      const parsed = parseFloat(local);
      if (!isNaN(parsed) && parsed >= 8 && parsed <= 180) {
        return parsed;
      }
    }

    // 2. Check Cookie
    const cookie = getCookie('humid1_ticker_speed');
    if (cookie) {
      const parsed = parseFloat(cookie);
      if (!isNaN(parsed) && parsed >= 8 && parsed <= 180) {
        return parsed;
      }
    }
  } catch {
    // ignore
  }

  return DEFAULT_SPEED_SEC;
}

/**
 * Saves the user's preferred ticker speed in both localStorage and session cookie.
 */
export function saveStoredTickerSpeed(speedSec: number): void {
  const safeSpeed = Math.max(8, Math.min(180, Math.round(speedSec)));
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY_SPEED, String(safeSpeed));
      setCookie('humid1_ticker_speed', String(safeSpeed));
    } catch {
      // ignore
    }
  }
}

/**
 * Loads whether the ticker is manually paused by user.
 */
export function getStoredTickerPaused(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const local = localStorage.getItem(STORAGE_KEY_PAUSED);
    if (local !== null) return local === 'true';

    const cookie = getCookie('humid1_ticker_paused');
    if (cookie !== null) return cookie === 'true';
  } catch {
    // ignore
  }
  return false;
}

/**
 * Saves ticker paused state.
 */
export function saveStoredTickerPaused(isPaused: boolean): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY_PAUSED, String(isPaused));
      setCookie('humid1_ticker_paused', String(isPaused));
    } catch {
      // ignore
    }
  }
}

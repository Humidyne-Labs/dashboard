import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { thingsboard } from '../services/thingsboard';
import {
  Activity,
  RefreshCw,
  AlertCircle,
  Thermometer,
  Droplets,
  Wifi,
  Lock,
  Server,
  CheckCircle2,
  Cpu,
  Pause,
  Play,
  ChevronDown,
  ChevronUp,
  Database,
  Battery,
  Clock,
  Volume2,
} from 'lucide-react';
import { useThingsBoardTelemetry } from '../hooks/useThingsBoardTelemetry';
import {
  configureDefaultClient,
  loginThingsBoard,
  setManualTokenOverride,
} from '../services/tbClientService';

import { TempUnit } from '../types';
import { toDisplayTemp, toKelvinTemp } from '../services/alarmThresholds';

export interface HumidorTelemetryWidgetProps {
  deviceId: string;
  serverUrl?: string;
  initialToken?: string;
  deviceName?: string;
  tempUnit?: TempUnit;
  onDeviceSelect?: (deviceId: string) => void;
}

export const HumidorTelemetryWidget: React.FC<HumidorTelemetryWidgetProps> = ({
  deviceId,
  serverUrl = 'https://app.humid1.com',
  initialToken,
  deviceName,
  tempUnit,
}) => {
  const [token, setToken] = useState<string>(
    initialToken || localStorage.getItem('tb_token') || localStorage.getItem('tb_jwt_override') || ''
  );
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [pollIntervalSec, setPollIntervalSec] = useState<number>(10);
  const [showRawKeys, setShowRawKeys] = useState(false);

  // Sync client configuration whenever serverUrl or token changes
  useEffect(() => {
    configureDefaultClient({
      baseUrl: serverUrl,
      token: token || undefined,
    });
  }, [serverUrl, token]);

  // Query only the 4 active hardware telemetry keys: rh, temp, battery, rssi
  const requestedKeys = useMemo(
    () => ['rh', 'temp', 'battery', 'rssi'],
    []
  );

  const handleUnauthorized = useCallback(() => {
    if (!thingsboard.isDemoMode()) {
      setShowLoginModal((prev) => (prev ? prev : true));
    }
  }, []);

  const {
    device,
    telemetry,
    loading,
    error,
    lastUpdated,
    lastCheckedTs,
    isDeviceSleeping,
    newPacketArrived,
    isPaused,
    togglePause,
    refresh,
  } = useThingsBoardTelemetry({
    deviceId,
    keys: requestedKeys,
    pollIntervalMs: pollIntervalSec * 1000,
    onUnauthorized: handleUnauthorized,
  });

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsAuthenticating(true);
    try {
      const session = await loginThingsBoard(username, password);
      setToken(session.token);
      localStorage.setItem('tb_token', session.token);
      setManualTokenOverride(session.token);
      setShowLoginModal(false);
      setUsername('');
      setPassword('');
      await refresh();
    } catch (err: any) {
      setLoginError(err.message || 'Authentication failed. Please verify your credentials.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const humidorDevice = thingsboard.getDevices().find((d) => d.id === deviceId);

  const formatTimeAgo = (ts: number | null) => {
    if (!ts) return '--';
    const diffSec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
    if (diffSec < 5) return 'just now';
    if (diffSec < 60) return `${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    return `${diffHours}h ago`;
  };

  const getMetricValue = (key: string, defaultValue: string = '--') => {
    if (!telemetry[key] || telemetry[key].value === undefined || telemetry[key].value === null) {
      return defaultValue;
    }
    const val = telemetry[key].value;
    if (typeof val === 'number') {
      return val.toFixed(1);
    }
    return String(val);
  };

  // 4 Active Telemetry Keys: rh, temp, battery, rssi
  const activeUnit = humidorDevice?.sharedAttributes?.temp_unit || tempUnit || 'F';
  const humVal = getMetricValue('rh');
  
  const rawTempNum = typeof telemetry['temp']?.value === 'number'
    ? telemetry['temp'].value
    : (typeof humidorDevice?.telemetry?.temp === 'number' ? humidorDevice.telemetry.temp : null);
  
  const tempVal = rawTempNum !== null
    ? toDisplayTemp(toKelvinTemp(rawTempNum, 'F'), activeUnit as TempUnit).toFixed(1)
    : '--';

  const batteryVal = getMetricValue('battery');
  const rssiVal = telemetry['rssi']?.value !== undefined ? String(telemetry['rssi'].value) : '-64';
  const rhSafeLow = humidorDevice?.sharedAttributes?.alarm_thresholds?.rhLowWarning ?? 65;
  const rhSafeHigh = humidorDevice?.sharedAttributes?.alarm_thresholds?.rhHighWarning ?? 73;

  const rawKeysCount = Object.keys(telemetry).length;

  return (
    <div className="bg-app-surface/95 border border-app-border/90 rounded-2xl p-5 text-app-text-primary shadow-xl relative overflow-hidden">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-app-border/80 pb-4 mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-app-accent/10 border border-app-accent/20 text-app-accent">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-medium uppercase tracking-wider text-app-accent/90">
                {device?.type || 'Humid1 OS Engine'}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono bg-app-surface-elevated text-app-text-secondary border border-app-border-highlight">
                @enerlab/tb-client
              </span>
            </div>
            <h2 className="text-lg font-bold text-app-text-primary tracking-tight">
              {deviceName || device?.name || 'Humidor Telemetry Monitor'}
            </h2>
          </div>
        </div>

        {/* Right Header Area: New Packet Badge (pinned to left of control cluster) + Inline Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* New Packet Badge situated to the LEFT of the controls to prevent shifting */}
          {newPacketArrived && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono bg-app-status-nominal/20 border border-app-status-nominal/40 text-app-status-nominal animate-pulse shadow-sm">
              <span className="w-1.5 h-1.5 rounded bg-app-status-nominal" />
              <span>New Packet!</span>
            </div>
          )}

          {/* Inline Controls Cluster */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Polling Rate Selector */}
            <div className="h-8.5 flex items-center gap-1 bg-app-surface-elevated/80 border border-app-border-highlight/80 rounded-lg px-2 text-xs text-app-text-secondary">
              <span className="text-[11px] text-app-text-secondary font-mono hidden xs:inline">Interval:</span>
              <select
                value={pollIntervalSec}
                onChange={(e) => setPollIntervalSec(Number(e.target.value))}
                className="bg-transparent text-app-accent font-semibold text-xs focus:outline-none cursor-pointer"
              >
                <option value={5} className="bg-app-surface text-app-text-primary">5s (Reactive)</option>
                <option value={10} className="bg-app-surface text-app-text-primary">10s (Optimal)</option>
                <option value={30} className="bg-app-surface text-app-text-primary">30s (Relaxed)</option>
              </select>
            </div>

            {/* Pause / Resume Button */}
            <button
              type="button"
              onClick={togglePause}
              className={`h-8.5 flex items-center gap-1.5 px-2.5 text-xs font-medium rounded-lg border transition cursor-pointer ${
                isPaused
                  ? 'bg-app-accent/15 border-app-accent/40 text-app-accent hover:bg-app-accent/25'
                  : 'bg-app-surface-elevated/80 border-app-border-highlight/80 text-app-text-secondary hover:bg-app-border-highlight/80'
              }`}
              title={isPaused ? 'Resume live background polling' : 'Pause background polling'}
            >
              {isPaused ? (
                <>
                  <Play className="w-3.5 h-3.5 text-app-accent" />
                  <span>Resume</span>
                </>
              ) : (
                <>
                  <Pause className="w-3.5 h-3.5 text-app-text-secondary" />
                  <span>Pause</span>
                </>
              )}
            </button>

            {/* Force Refresh Button */}
            <button
              type="button"
              onClick={() => refresh()}
              disabled={loading}
              className="h-8.5 flex items-center gap-1.5 px-2.5 sm:px-3 text-xs font-medium bg-app-surface-elevated/80 hover:bg-app-border-highlight/80 text-app-text-primary border border-app-border-highlight/80 rounded-lg transition disabled:opacity-50 cursor-pointer"
              title="Force immediate refresh"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-app-accent' : ''}`} />
              <span>Sync</span>
            </button>

            {/* Session Management */}
            <button
              type="button"
              onClick={() => setShowLoginModal(true)}
              className="h-8.5 flex items-center gap-1.5 px-2.5 text-xs font-medium bg-app-accent/10 hover:bg-app-accent/20 text-app-accent border border-app-accent/30 rounded-lg transition cursor-pointer"
              title="ThingsBoard Session Management"
            >
              <Lock className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Session</span>
            </button>

            {/* Live Status Badge */}
            <div
              className={`h-8.5 flex items-center gap-1.5 px-2.5 rounded-lg text-[11px] font-mono border transition-all ${
                error
                  ? 'bg-app-status-critical/10 border-app-status-critical/30 text-app-status-critical'
                  : isPaused
                  ? 'bg-app-accent/10 border-app-accent/30 text-app-accent'
                  : isDeviceSleeping
                  ? 'bg-app-status-info/15 border-app-status-info/40 text-app-status-info'
                  : 'bg-app-status-nominal/10 border-app-status-nominal/30 text-app-status-nominal'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded ${
                  error
                    ? 'bg-app-status-critical animate-pulse'
                    : isPaused
                    ? 'bg-app-status-warning'
                    : isDeviceSleeping
                    ? 'bg-app-status-info'
                    : 'bg-app-status-nominal'
                }`}
              />
              <span>
                {error
                  ? 'Degraded'
                  : isPaused
                  ? 'Paused'
                  : isDeviceSleeping
                  ? 'Device Asleep'
                  : 'Live Sync'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Error Alert Banner if unauthenticated or timeout */}
      {error && (
        <div className="mb-4 p-3 bg-app-status-critical/10 border border-app-status-critical/30 rounded-xl flex items-start gap-2.5 text-xs text-app-status-critical">
          <AlertCircle className="w-4 h-4 text-app-status-critical shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold">ThingsBoard Client Notice: </span>
            {error}
          </div>
          {error.includes('UNAUTHORIZED') && (
            <button
              onClick={() => setShowLoginModal(true)}
              className="h-7 px-2.5 text-[11px] font-medium bg-app-status-critical/20 hover:bg-app-status-critical/30 text-app-status-critical border border-app-status-critical/40 rounded transition cursor-pointer"
            >
              Sign In
            </button>
          )}
        </div>
      )}

      {/* Primary Telemetry Metrics Grid (Matches Real Device Telemetry: RH, Temp, Battery, RSSI) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mb-5">
        {/* Relative Humidity */}
        <div className="bg-app-surface-elevated/40 border border-app-border-highlight/60 rounded-xl p-3.5 relative overflow-hidden group hover:border-app-status-info/40 transition">
          <div className="flex items-center justify-between text-app-text-secondary text-xs font-medium">
            <span>Relative Humidity</span>
            <Droplets className="w-4 h-4 text-app-status-info" />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-bold font-mono text-app-status-info">
              {humVal}
            </span>
            <span className="text-xs font-mono text-app-text-secondary">%</span>
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[11px] text-app-text-secondary">
            <span>Safe: {rhSafeLow}–{rhSafeHigh}%</span>
            <span className="text-app-status-nominal font-mono">Telemetry</span>
          </div>
        </div>

        {/* Temperature */}
        <div className="bg-app-surface-elevated/40 border border-app-border-highlight/60 rounded-xl p-3.5 relative overflow-hidden group hover:border-app-accent/40 transition">
          <div className="flex items-center justify-between text-app-text-secondary text-xs font-medium">
            <span>Temperature</span>
            <Thermometer className="w-4 h-4 text-app-accent" />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-bold font-mono text-app-accent">
              {tempVal}
            </span>
            <span className="text-xs font-mono text-app-text-secondary">°{activeUnit}</span>
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[11px] text-app-text-secondary">
            <span>Curing Temp</span>
            <span className="text-app-accent/90 font-mono">Telemetry</span>
          </div>
        </div>

        {/* Battery Level (Real Telemetry) */}
        <div className="bg-app-surface-elevated/40 border border-app-border-highlight/60 rounded-xl p-3.5 relative overflow-hidden group hover:border-app-status-nominal/40 transition">
          <div className="flex items-center justify-between text-app-text-secondary text-xs font-medium">
            <span>Battery Level</span>
            <Battery className="w-4 h-4 text-app-status-nominal" />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-bold font-mono text-app-status-nominal">
              {batteryVal !== '--' ? batteryVal : '100'}
            </span>
            <span className="text-xs font-mono text-app-text-secondary">%</span>
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[11px] text-app-text-secondary">
            <span>LiPo Cell</span>
            <span className="text-app-status-nominal font-mono">{batteryVal !== '--' && Number(batteryVal) > 20 ? 'Nominal' : 'Low Alert'}</span>
          </div>
        </div>

        {/* Signal RSSI */}
        <div className="bg-app-surface-elevated/40 border border-app-border-highlight/60 rounded-xl p-3.5 relative overflow-hidden group hover:border-app-accent/40 transition">
          <div className="flex items-center justify-between text-app-text-secondary text-xs font-medium">
            <span>RF Signal (RSSI)</span>
            <Wifi className="w-4 h-4 text-app-accent" />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-bold font-mono text-app-accent">
              {rssiVal}
            </span>
            <span className="text-xs font-mono text-app-text-secondary">dBm</span>
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[11px] text-app-text-secondary">
            <span>ESP32 Wi-Fi</span>
            <span className="text-app-accent font-mono">Telemetry</span>
          </div>
        </div>
      </div>

      {/* Secondary Quick Metrics Row (Device Shared & Client Parameters) */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 p-2.5 bg-app-bg/40 border border-app-border/60 rounded-xl text-xs">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1.5 text-app-text-secondary">
            <Clock className="w-3.5 h-3.5 text-app-status-info" />
            <span className="text-app-text-secondary">Sleep Interval:</span>
            <span className="font-mono font-semibold text-app-text-primary">
              {humidorDevice?.sharedAttributes?.sleep_interval_min || (humidorDevice?.sharedAttributes?.sleep_interval_sec ? Math.round(humidorDevice.sharedAttributes.sleep_interval_sec / 60) : 15)}m
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-app-text-secondary">
            <Droplets className="w-3.5 h-3.5 text-app-status-info" />
            <span className="text-app-text-secondary">Safe Envelope:</span>
            <span className="font-mono font-semibold text-app-text-primary">{rhSafeLow}–{rhSafeHigh}% RH</span>
          </div>

          <div className="flex items-center gap-1.5 text-app-text-secondary">
            <Volume2 className="w-3.5 h-3.5 text-app-accent" />
            <span className="text-app-text-secondary">Sound:</span>
            <span className="font-mono font-semibold text-app-text-primary">
              {humidorDevice?.clientAttributes?.has_sd_card === false
                ? 'SD Locked'
                : humidorDevice?.sharedAttributes?.sound_enabled !== false
                ? 'Enabled'
                : 'Muted'}
            </span>
          </div>

          {isDeviceSleeping && (
            <div className="flex items-center gap-1.5 text-app-status-info font-mono text-[11px]">
              <span className="w-1.5 h-1.5 rounded bg-app-status-info" />
              <span>Device in Variable Sleep (Awaiting next wakeup)</span>
            </div>
          )}
        </div>

        {/* Expandable Key-Value Inspector Toggle */}
        <button
          type="button"
          onClick={() => setShowRawKeys((prev) => !prev)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono bg-app-surface-elevated/80 hover:bg-app-border-highlight/80 text-app-text-secondary border border-app-border-highlight transition"
        >
          <Database className="w-3 h-3 text-app-accent" />
          <span>All Received Telemetry Keys ({rawKeysCount})</span>
          {showRawKeys ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>

      {/* Raw Telemetry Key-Value Accordion Panel */}
      {showRawKeys && (
        <div className="mb-4 p-3 bg-app-bg/80 border border-app-border rounded-xl animate-fadeIn text-xs">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-app-border text-[11px] font-mono text-app-text-secondary">
            <span>KEY NAME</span>
            <span>LATEST VALUE & TIMESTAMP</span>
          </div>

          {rawKeysCount === 0 ? (
            <p className="text-app-text-secondary font-mono text-center py-2 text-xs">
              No timeseries keys returned yet from device. Awaiting incoming packet.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
              {Object.entries(telemetry).map(([k, entry]) => (
                <div
                  key={k}
                  className="flex items-center justify-between p-2 bg-app-surface/90 border border-app-border/80 rounded-lg text-[11px] font-mono"
                >
                  <span className="text-app-accent/90 font-semibold">{k}</span>
                  <div className="text-right">
                    <span className="text-app-text-primary font-bold block">
                      {typeof entry?.value === 'object' ? JSON.stringify(entry.value) : String(entry?.value)}
                    </span>
                    {entry?.ts && (
                      <span className="text-[10px] text-app-text-muted block">
                        {new Date(entry.ts).toLocaleTimeString()}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Footer Info & Architecture Telemetry Badge */}
      <div className="pt-3 border-t border-app-border/60 flex flex-wrap items-center justify-between gap-3 text-xs text-app-text-secondary font-mono">
        <div className="flex items-center gap-2">
          <Server className="w-3.5 h-3.5 text-app-text-secondary" />
          <span className="text-app-text-secondary">Target:</span>
          <span className="text-app-text-secondary">{serverUrl}</span>
          <span className="text-app-text-muted">|</span>
          <span className="text-app-text-secondary">Device ID:</span>
          <span className="text-app-accent/90">{deviceId.substring(0, 13)}...</span>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {lastUpdated && (
            <div className="flex items-center gap-1.5 text-app-text-secondary">
              <span className="text-app-text-secondary">Hardware Packet:</span>
              <span className="text-app-accent font-bold">
                {new Date(lastUpdated).toLocaleTimeString()}
              </span>
              <span className="text-app-text-secondary">({formatTimeAgo(lastUpdated)})</span>
            </div>
          )}

          <div className="flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-app-status-nominal" />
            <span>
              {lastCheckedTs
                ? `TB Polled: ${formatTimeAgo(lastCheckedTs)}`
                : 'Connecting...'}
            </span>
          </div>
        </div>
      </div>

      {/* Login / Token Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-app-surface border border-app-border rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <div className="flex items-center justify-between mb-4 border-b border-app-border pb-3">
              <div className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-app-accent" />
                <h3 className="text-base font-bold text-app-text-primary">ThingsBoard Session Auth</h3>
              </div>
              <button
                onClick={() => setShowLoginModal(false)}
                className="text-app-text-secondary hover:text-app-text-primary text-sm px-2 py-1 rounded"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-app-text-secondary mb-4">
              Authenticate via the built-in ThingsBoard <code className="text-app-accent font-mono">/api/auth/login</code> helper or paste a direct JWT Bearer token override.
            </p>

            {thingsboard.isDemoMode() && (
              <div className="mb-4 p-3 bg-app-accent/10 border border-app-accent/30 rounded-xl text-xs text-app-accent">
                <span className="font-bold text-app-accent block mb-0.5">Demo Sandbox Mode Active</span>
                <p className="text-[11px] text-app-text-secondary">Session authentication is automatically bypassed in Demo Mode. Real server credentials are not required.</p>
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs text-app-text-secondary mb-1">Username / Email</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="tenant@thingsboard.org"
                  className="w-full bg-app-surface-elevated border border-app-border-highlight rounded-lg px-3 py-2 text-sm text-app-text-primary focus:outline-none focus:border-app-accent font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs text-app-text-secondary mb-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-app-surface-elevated border border-app-border-highlight rounded-lg px-3 py-2 text-sm text-app-text-primary focus:outline-none focus:border-app-accent"
                  required
                />
              </div>

              {loginError && (
                <div className="p-2.5 bg-app-status-critical/10 border border-app-status-critical/30 text-app-status-critical text-xs rounded-lg">
                  {loginError}
                </div>
              )}

              <button
                type="submit"
                disabled={isAuthenticating}
                className="w-full py-2.5 px-4 bg-app-accent hover:opacity-90 text-app-accent-text font-bold rounded-lg text-sm transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isAuthenticating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Authenticating...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Sign In to ThingsBoard</span>
                  </>
                )}
              </button>
            </form>

            <div className="mt-5 pt-4 border-t border-app-border">
              <label className="block text-xs text-app-text-secondary mb-1.5">Direct JWT Token Override (Optional)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={token}
                  onChange={(e) => {
                    setToken(e.target.value);
                    setManualTokenOverride(e.target.value);
                    localStorage.setItem('tb_jwt_override', e.target.value);
                  }}
                  placeholder="eyJhbGciOiJIUzUxMiJ9..."
                  className="flex-1 bg-app-surface-elevated border border-app-border-highlight rounded-lg px-3 py-1.5 text-xs text-app-text-primary font-mono focus:outline-none focus:border-app-accent"
                />
                <button
                  type="button"
                  onClick={() => {
                    setShowLoginModal(false);
                    refresh();
                  }}
                  className="px-3 py-1.5 bg-app-surface-elevated hover:bg-app-border-highlight text-xs font-medium text-app-text-primary border border-app-border-highlight rounded-lg"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

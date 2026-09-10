import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from 'react-oidc-context';
import { useTheme } from '../context/ThemeContext';
import { HumidorDevice, TempUnit } from '../types';
import { UserProfile, thingsboard } from '../services/thingsboard';
import { toDisplayTemp, toKelvinTemp } from '../services/alarmThresholds';
import { getSafeHost } from '../utils/url';
import { getEnv } from '../utils/env';
import { APP_CONFIG } from '../config/env';
import {
  getStoredTickerSpeed,
  saveStoredTickerSpeed,
  getStoredTickerPaused,
  saveStoredTickerPaused,
} from '../utils/tickerConfig';
import { 
  Battery, 
  Plus, 
  Settings, 
  Bell, 
  Flame, 
  ShieldCheck, 
  User, 
  LogIn, 
  LogOut,
  Terminal,
  Info,
  AlertTriangle,
  BellRing,
  Menu,
  X,
  Play,
  Pause,
  Gauge,
  RotateCcw,
  Sparkles,
  Droplets,
  Thermometer,
  Wifi,
  Activity
} from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';

interface HeaderTickerProps {
  devices: HumidorDevice[];
  selectedDeviceId: string;
  onSelectDevice: (deviceId: string) => void;
  tempUnit: TempUnit;
  onToggleTempUnit: () => void;
  onOpenClaimModal: () => void;
  onOpenConfigModal: () => void;
  onOpenAlarmsModal: () => void;
  onOpenAuthModal?: () => void;
  onOpenApiInspector: () => void;
  onOpenAboutModal: () => void;
  onOpenDevWarning: () => void;
  onOpenPushModal: () => void;
  activeAlarmCount: number;
  currentUser: UserProfile | null;
  isDemoMode: boolean;
}

export const HeaderTicker: React.FC<HeaderTickerProps> = ({
  devices,
  selectedDeviceId,
  onSelectDevice,
  tempUnit,
  onToggleTempUnit,
  onOpenClaimModal,
  onOpenConfigModal,
  onOpenAlarmsModal,
  onOpenAuthModal: _onOpenAuthModal,
  onOpenApiInspector,
  onOpenAboutModal,
  onOpenDevWarning,
  onOpenPushModal,
  activeAlarmCount,
  currentUser,
  isDemoMode,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [speedSec, setSpeedSec] = useState<number>(() => getStoredTickerSpeed());
  const [isPaused, setIsPaused] = useState<boolean>(() => getStoredTickerPaused());
  const [isSpeedControlOpen, setIsSpeedControlOpen] = useState<boolean>(false);
  const speedMenuRef = useRef<HTMLDivElement>(null);
  const { currentTheme, setTheme, presets } = useTheme();

  const auth = useAuth();
  const authUsername =
    (auth.user?.profile?.preferred_username as string) ||
    auth.user?.profile?.name ||
    (auth.user?.profile?.email ? auth.user.profile.email.split('@')[0] : null) ||
    (currentUser ? currentUser.email.split('@')[0] : null);
  const isAuth = auth.isAuthenticated || !!currentUser;

  // Close speed control dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (speedMenuRef.current && !speedMenuRef.current.contains(event.target as Node)) {
        setIsSpeedControlOpen(false);
      }
    };
    if (isSpeedControlOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSpeedControlOpen]);

  const handleSpeedChange = (newSpeed: number) => {
    setSpeedSec(newSpeed);
    saveStoredTickerSpeed(newSpeed);
  };

  const handleTogglePause = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const nextPaused = !isPaused;
    setIsPaused(nextPaused);
    saveStoredTickerPaused(nextPaused);
  };

  const handleAuthClick = async () => {
    if (isDemoMode) {
      await thingsboard.disableDemoMode();
      if (typeof window !== 'undefined') {
        window.location.href = window.location.origin + window.location.pathname;
      }
      return;
    }

    if (isAuth) {
      try {
        await thingsboard.logout();
      } catch (err) {
        console.warn('ThingsBoard logout failed:', err);
      }

      if (auth.isAuthenticated) {
        try {
          await auth.removeUser();
        } catch (err) {
          console.warn('OIDC removeUser failed:', err);
        }
      }

      if (typeof window !== 'undefined') {
        try {
          sessionStorage.clear();
          localStorage.removeItem('tb_token');
          localStorage.removeItem('humid1_active_jwt');
          localStorage.removeItem('humid1_active_refresh_token');
          localStorage.removeItem('humid1_tb_jwt_token');
          localStorage.removeItem('humid1_tb_jwt_refresh');
        } catch {
          // ignore
        }
        window.location.href = window.location.origin + window.location.pathname;
      }
    } else {
      auth.signinRedirect();
    }
  };

  const formatTemp = (rawTemp: number) => {
    const kTemp = toKelvinTemp(rawTemp);
    const disp = toDisplayTemp(kTemp, tempUnit);
    return `${disp.toFixed(1)}°${tempUnit}`;
  };

  const getStatusBadge = (status: HumidorDevice['status']) => {
    switch (status) {
      case 'ONLINE':
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-500/30">
            ONLINE
          </span>
        );
      case 'SLEEP':
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-amber-300 border border-slate-700">
            SLEEP
          </span>
        );
      default:
        return null;
    }
  };

  // Active or Sleeping devices for live telemetry reel
  const activeOrSleepingDevices = devices.filter(
    (d) => d.status === 'ONLINE' || d.status === 'SLEEP'
  );

  /**
   * Generates a rich, multifaceted array of ticker "nodes" for the conveyor belt.
   * Even with 1 device, provides a rotating sequence of informative telemetry,
   * target thresholds, signal diagnostics, and fleet health.
   */
  const renderTickerNodeSequence = (keyPrefix: string) => {
    if (activeOrSleepingDevices.length === 0) return null;

    const baseNodes: React.ReactNode[] = [];

    activeOrSleepingDevices.forEach((device, index) => {
      const isSelected = device.id === selectedDeviceId;
      const rh = device.telemetry.rh;
      const isDry = rh < 65;
      const isWet = rh > 75;
      const isHot = device.telemetry.temp > 75;
      const thresholds = device.sharedAttributes?.alarm_thresholds;
      const sleepMin =
        device.sharedAttributes?.sleep_interval_min ||
        (device.sharedAttributes?.sleep_interval_sec
          ? Math.round(device.sharedAttributes.sleep_interval_sec / 60)
          : 15);

      // Node 1: Primary Telemetry Capsule
      baseNodes.push(
        <button
          key={`${keyPrefix}-dev-main-${device.id}-${index}`}
          onClick={() => onSelectDevice(device.id)}
          className={`inline-flex items-center gap-2.5 px-3 py-1 rounded-md transition-all text-xs font-medium cursor-pointer shrink-0 ${
            isSelected
              ? 'bg-amber-500/15 border border-amber-500/40 text-amber-200 shadow-sm'
              : 'bg-slate-900/80 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white'
          }`}
          title={`Select ${device.name}`}
        >
          <span className="font-semibold text-slate-100">{device.name}</span>
          {getStatusBadge(device.status)}

          <span className="text-slate-600">|</span>

          <span
            className={`font-mono font-medium ${
              isDry ? 'text-blue-400 font-bold' : isWet ? 'text-rose-400 font-bold' : 'text-emerald-400'
            }`}
          >
            RH {rh.toFixed(1)}%
          </span>

          <span className={`font-mono ${isHot ? 'text-amber-400 font-bold' : 'text-slate-300'}`}>
            {formatTemp(device.telemetry.temp)}
          </span>

          <span className="inline-flex items-center gap-1 font-mono text-slate-400">
            <Battery className="w-3 h-3 text-slate-400" />
            {device.telemetry.battery}%
          </span>

          <span className="font-mono text-slate-500 text-[10px]">
            {device.telemetry.rssi} dBm
          </span>
        </button>
      );

      // Node 2: RH Safe Envelope & Climate Health Capsule
      baseNodes.push(
        <div
          key={`${keyPrefix}-dev-rh-env-${device.id}-${index}`}
          onClick={() => onSelectDevice(device.id)}
          className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-slate-900/50 border border-slate-800/80 text-xs font-mono shrink-0 cursor-pointer hover:border-amber-500/30"
          title="RH Stability Envelope"
        >
          <Droplets className="w-3.5 h-3.5 text-sky-400" />
          <span className="text-slate-400">Target Envelope:</span>
          <span className="text-amber-300 font-bold">
            {thresholds?.rhLowWarning ?? 65}%–{thresholds?.rhHighWarning ?? 73}% RH
          </span>
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
              rh >= 65 && rh <= 73
                ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/20'
                : 'bg-amber-950/80 text-amber-300 border border-amber-500/20'
            }`}
          >
            {rh >= 65 && rh <= 73 ? 'Nominal Zone' : rh < 65 ? 'Dry Warning' : 'Humid Warning'}
          </span>
        </div>
      );

      // Node 3: Thermal Metrics & Scale Capsule
      baseNodes.push(
        <div
          key={`${keyPrefix}-dev-thermal-${device.id}-${index}`}
          onClick={() => onSelectDevice(device.id)}
          className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-slate-900/50 border border-slate-800/80 text-xs font-mono shrink-0 cursor-pointer hover:border-amber-500/30"
          title="Thermal Telemetry"
        >
          <Thermometer className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-slate-400">{device.name} Temp:</span>
          <span className="text-slate-200 font-bold">{formatTemp(device.telemetry.temp)}</span>
          <span className="text-slate-500 text-[10px]">
            (Canonical {toKelvinTemp(device.telemetry.temp).toFixed(1)} K)
          </span>
        </div>
      );

      // Node 4: Power Cycle & RF Radio Link Capsule
      baseNodes.push(
        <div
          key={`${keyPrefix}-dev-power-${device.id}-${index}`}
          onClick={() => onSelectDevice(device.id)}
          className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-slate-900/50 border border-slate-800/80 text-xs font-mono shrink-0 cursor-pointer hover:border-amber-500/30"
          title="Hardware Power & Radio Link"
        >
          <Wifi className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-slate-400">Wake Interval:</span>
          <span className="text-sky-300 font-bold">{sleepMin}m Deep-Sleep</span>
          <span className="text-slate-600">•</span>
          <span className="text-slate-400">RF:</span>
          <span className="text-slate-300 font-bold">{device.telemetry.rssi} dBm</span>
        </div>
      );
    });

    // Node 5: Fleet Overview & Auth Status Capsule
    baseNodes.push(
      <div
        key={`${keyPrefix}-fleet-status`}
        className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-amber-950/30 border border-amber-500/20 text-xs font-mono text-amber-200 shrink-0 select-none"
      >
        <Activity className="w-3.5 h-3.5 text-amber-400" />
        <span className="font-semibold text-amber-300">Fleet Active:</span>
        <span>
          {activeOrSleepingDevices.length} / {devices.length} Devices Online
        </span>
        <span className="text-slate-600">•</span>
        <span className="text-emerald-400">Telemetry Streaming</span>
      </div>
    );

    // If few nodes exist, repeat to ensure track is generously wide before cloning for the infinite loop
    let repeatedSequence: React.ReactNode[] = [...baseNodes];
    while (repeatedSequence.length < 8) {
      repeatedSequence = [...repeatedSequence, ...baseNodes];
    }

    return repeatedSequence;
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800/80 shadow-lg shadow-black/20">
      {/* Top Scrolling Live News-Channel Conveyor Ticker */}
      <div className="bg-slate-950 border-b border-slate-800/60 py-1 px-3 flex items-center relative text-xs">
        {/* Left Live Telemetry Label */}
        <div className="flex items-center gap-1.5 text-amber-400 font-bold uppercase tracking-wider text-[11px] pr-3 shrink-0 border-r border-slate-800 z-10 bg-slate-950">
          <span className="relative flex h-2 w-2">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full ${
                activeOrSleepingDevices.length > 0 ? 'bg-emerald-400' : 'bg-amber-400'
              } opacity-75`}
            ></span>
            <span
              className={`relative inline-flex rounded-full h-2 w-2 ${
                activeOrSleepingDevices.length > 0 ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
            ></span>
          </span>
          {activeOrSleepingDevices.length > 0 ? 'Live Telemetry' : 'System Ready'}
        </div>

        {/* Center Pac-Man Rotating Conveyor Belt */}
        <div className="overflow-hidden w-full select-none relative flex-1 min-w-0">
          {activeOrSleepingDevices.length > 0 ? (
            <div
              className={`animate-ticker flex items-center gap-5 ${isPaused ? 'animate-ticker-paused' : ''}`}
              style={{
                ['--ticker-duration' as any]: `${speedSec}s`,
              }}
            >
              {/* Segment 1: Main Stream */}
              <div className="flex items-center gap-5 shrink-0">
                {renderTickerNodeSequence('seg-a')}
              </div>

              {/* Segment 2: Seamless Clone for Continuous 0% -> -50% Pac-Man Loop */}
              <div className="flex items-center gap-5 shrink-0" aria-hidden="true">
                {renderTickerNodeSequence('seg-b')}
              </div>
            </div>
          ) : (
            <div className="px-3 text-slate-400 font-mono text-xs flex items-center gap-2">
              <span className="text-slate-500">SSO AUTHENTICATED:</span>
              <span className="text-emerald-400 font-bold">
                {auth.user?.profile?.email || authUsername || 'Active Session'}
              </span>
              <span className="text-slate-600">•</span>
              <span>
                No active or sleeping humidor telemetry streams detected. Claim a hardware device to start monitoring.
              </span>
            </div>
          )}
        </div>

        {/* Right Conveyor Speed & Pause Controls Cluster */}
        <div className="relative shrink-0 flex items-center gap-1.5 pl-3 border-l border-slate-800 bg-slate-950 z-10" ref={speedMenuRef}>
          {/* Pause / Play Quick Toggle */}
          <button
            type="button"
            onClick={handleTogglePause}
            className={`h-6 px-1.5 rounded flex items-center gap-1 text-[10px] font-mono transition cursor-pointer ${
              isPaused
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
            title={isPaused ? 'Resume live ticker conveyor' : 'Pause ticker motion (hovering also pauses)'}
          >
            {isPaused ? <Play className="w-2.5 h-2.5 text-amber-400 fill-amber-400" /> : <Pause className="w-2.5 h-2.5" />}
            <span className="hidden sm:inline">{isPaused ? 'Paused' : 'Motion'}</span>
          </button>

          {/* Speed Controller Popover Button */}
          <button
            type="button"
            onClick={() => setIsSpeedControlOpen(!isSpeedControlOpen)}
            className={`h-6 px-2 rounded flex items-center gap-1.5 text-[10px] font-mono transition cursor-pointer ${
              isSpeedControlOpen
                ? 'bg-amber-500/20 border border-amber-500/50 text-amber-300'
                : 'bg-slate-900 border border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
            }`}
            title="Configure lateral travel rate & loop duration"
          >
            <Gauge className="w-3 h-3 text-amber-400" />
            <span className="font-bold">{speedSec}s</span>
          </button>

          {/* Speed Configuration Floating Menu */}
          {isSpeedControlOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-72 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-3.5 z-50 animate-fadeIn text-slate-200">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-2.5 gap-2">
                <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5 shrink-0">
                  <Gauge className="w-3.5 h-3.5 text-amber-400" />
                  <span>Conveyor Rate Speed</span>
                </span>
                <span className="text-[10px] font-mono bg-slate-950 px-2 py-0.5 rounded text-amber-400 border border-slate-800 font-bold shrink-0">
                  {speedSec}s / cycle
                </span>
              </div>

              {/* Live Rate Slider */}
              <div className="space-y-1.5 mb-3">
                <div className="flex justify-between text-[10px] font-mono text-slate-400">
                  <span>Fast (10s)</span>
                  <span>Normal (35s)</span>
                  <span>Cruise (90s)</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="90"
                  step="5"
                  value={speedSec}
                  onChange={(e) => handleSpeedChange(Number(e.target.value))}
                  className="w-full accent-amber-500 h-1.5 bg-slate-950 rounded-lg cursor-pointer"
                />
              </div>

              {/* Quick Preset Buttons */}
              <div className="grid grid-cols-3 gap-1.5 mb-2.5">
                <button
                  type="button"
                  onClick={() => handleSpeedChange(15)}
                  className={`h-6 text-[10px] font-mono rounded border transition cursor-pointer ${
                    speedSec === 15
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Fast
                </button>
                <button
                  type="button"
                  onClick={() => handleSpeedChange(35)}
                  className={`h-6 text-[10px] font-mono rounded border transition cursor-pointer ${
                    speedSec === 35
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Normal
                </button>
                <button
                  type="button"
                  onClick={() => handleSpeedChange(60)}
                  className={`h-6 text-[10px] font-mono rounded border transition cursor-pointer ${
                    speedSec === 60
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Cruise
                </button>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[10px] text-slate-400">
                <button
                  type="button"
                  onClick={() => handleSpeedChange(35)}
                  className="flex items-center gap-1 hover:text-amber-300 transition cursor-pointer font-mono"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                  <span>Reset Default</span>
                </button>
                <span className="font-mono text-slate-500">Saved in Session</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="max-w-[1536px] mx-auto px-3 sm:px-6 lg:px-8 h-15 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">
        {/* Brand & Identity */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            onClick={onOpenAboutModal}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-amber-600 via-amber-700 to-amber-900 flex items-center justify-center shadow-md shadow-amber-950/40 border border-amber-500/30 hover:scale-105 transition cursor-pointer shrink-0"
            title="About HUMID1 Dashboard"
          >
            <Flame className="w-5 h-5 text-amber-200" />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                onClick={onOpenAboutModal}
                className="font-display font-bold text-base sm:text-lg text-amber-100 tracking-wider hover:text-amber-200 transition text-left truncate cursor-pointer"
                title="View About & System Specs"
              >
                <span className="sm:hidden">HUMID1</span>
                <span className="hidden sm:inline">{getEnv('VITE_APP_TITLE', 'HUMID1_DASHBOARD')}</span>
              </button>
              <button
                onClick={onOpenDevWarning}
                className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1 transition cursor-pointer shrink-0"
                title="Dashboard Under Active Development - Click to view notice"
              >
                <AlertTriangle className="w-2.5 h-2.5 text-amber-400" />
                <span className="hidden xs:inline">v{APP_CONFIG.version} (Dev)</span>
                <span className="xs:hidden">Dev</span>
              </button>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 hidden xl:flex items-center gap-1 shrink-0">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                SSO Active
              </span>
            </div>
            <span className="text-[10px] sm:text-[11px] text-slate-400 tracking-tight font-mono truncate block max-w-[130px] xs:max-w-[200px] sm:max-w-none">
              {getSafeHost(getEnv('VITE_AUTHENTIK_URL', ''), 'SSO')} • {authUsername || 'Authenticated'}
            </span>
          </div>
        </div>

        {/* Center / Right Controls Cluster */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Theme Selector Dropdown */}
          <div className="relative shrink-0 hidden sm:block">
            <select
              value={currentTheme.id}
              onChange={(e) => setTheme(e.target.value)}
              className="h-9 pl-3 pr-8 rounded-lg bg-slate-800 border border-slate-700 hover:border-slate-600 text-xs font-mono text-slate-200 transition-colors shadow-sm cursor-pointer appearance-none outline-none"
              title="Change application theme"
            >
              {presets.map((t) => (
                <option key={t.id} value={t.id} className="bg-slate-900 text-slate-200">
                  {t.name}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
              <svg className="fill-current h-3.5 w-3.5 text-slate-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
              </svg>
            </div>
          </div>

          {/* Quick Unit Switcher (°F / °C) - Always Visible */}
          <button
            onClick={onToggleTempUnit}
            className="h-9 px-2.5 rounded-lg bg-slate-800 border border-slate-700 hover:border-slate-600 text-xs font-mono text-slate-200 transition-colors shadow-sm cursor-pointer flex items-center justify-center gap-1 shrink-0 whitespace-nowrap"
            title="Toggle temperature scale"
          >
            <span className={tempUnit === 'F' ? 'text-amber-400 font-bold' : 'text-slate-400'}>°F</span>
            <span className="text-slate-600">/</span>
            <span className={tempUnit === 'C' ? 'text-amber-400 font-bold' : 'text-slate-400'}>°C</span>
          </button>

          {/* Alarms Button - Always Visible */}
          <button
            onClick={onOpenAlarmsModal}
            className="w-9 h-9 relative rounded-lg bg-slate-800 border border-slate-700 hover:border-slate-600 text-slate-300 hover:text-white transition-colors cursor-pointer flex items-center justify-center shrink-0"
            title="View active alarms"
          >
            <Bell className="w-4 h-4" />
            {activeAlarmCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white shadow-sm ring-2 ring-slate-900 animate-pulse">
                {activeAlarmCount}
              </span>
            )}
          </button>

          {/* Desktop & Tablet Direct Controls (Hidden on Mobile) */}
          {/* PWA Install Button / Status - Visible on lg+ */}
          <div className="hidden lg:flex items-center shrink-0">
            <PWAInstallButton />
          </div>

          {/* Web Push Alerts Modal Trigger - Visible on xl+ */}
          <button
            id="open-push-modal-btn"
            onClick={onOpenPushModal}
            className="hidden xl:flex h-9 px-3 rounded-lg bg-slate-800 border border-slate-700 hover:border-amber-500/50 text-slate-300 hover:text-amber-300 transition-colors cursor-pointer items-center justify-center gap-1.5 text-xs font-mono shrink-0 whitespace-nowrap"
            title="Web Push Notifications & TWA Settings"
          >
            <BellRing className="w-4 h-4 text-amber-400" />
            <span>Push</span>
          </button>

          {/* About Badge Button - Visible on xl+ */}
          <button
            id="open-about-modal-btn"
            onClick={onOpenAboutModal}
            className="hidden xl:flex h-9 px-3 rounded-lg bg-slate-800 border border-slate-700 hover:border-amber-500/50 text-slate-300 hover:text-amber-300 transition-colors cursor-pointer items-center justify-center gap-1.5 text-xs font-mono shrink-0 whitespace-nowrap"
            title="About Dashboard, Authors, Contributors & Specs"
          >
            <Info className="w-4 h-4 text-amber-400" />
            <span>About</span>
          </button>

          {/* Claim Device Action - Visible on md+ */}
          <button
            onClick={onOpenClaimModal}
            className="hidden md:inline-flex h-9 items-center justify-center gap-1.5 px-3 rounded-lg bg-amber-600 hover:bg-amber-500 text-slate-950 font-semibold text-xs transition-all shadow-md shadow-amber-950/30 hover:scale-[1.02] active:scale-[0.98] cursor-pointer shrink-0 whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Claim Device</span>
          </button>

          {/* Login / Profile Button - Visible on md+ */}
          <button
            onClick={handleAuthClick}
            className={`hidden md:inline-flex h-9 items-center justify-center gap-1.5 px-3 rounded-lg text-xs font-medium border transition-colors cursor-pointer shrink-0 whitespace-nowrap ${
              isAuth
                ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/80 hover:border-emerald-500'
                : 'bg-slate-800 border-slate-700 hover:border-amber-500/50 text-slate-200 hover:text-white'
            }`}
            title={isAuth ? `Authenticated as ${auth.user?.profile?.email || authUsername}. Click to Sign Out.` : 'Sign In with Authentik'}
          >
            {isAuth ? (
              <>
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span className="max-w-[110px] truncate font-mono">{authUsername}</span>
                <LogOut className="w-3 h-3 text-slate-400 ml-0.5 hover:text-rose-400" />
              </>
            ) : (
              <>
                <LogIn className="w-3.5 h-3.5 text-amber-400" />
                <span>Sign In (SSO)</span>
              </>
            )}
          </button>

          {/* API Transaction Inspector - Visible on lg+ */}
          <button
            onClick={onOpenApiInspector}
            className="hidden lg:flex h-9 px-3 rounded-lg bg-slate-800 border border-slate-700 hover:border-amber-500/50 text-amber-400 hover:text-amber-300 transition-colors cursor-pointer items-center justify-center gap-1.5 text-xs font-mono shrink-0 whitespace-nowrap"
            title="Inspect API Transactions, Endpoints & JSON Payloads"
          >
            <Terminal className="w-4 h-4" />
            <span className="hidden xl:inline">API Logs</span>
          </button>

          {/* Settings / Connection Config - Visible on sm+ */}
          <button
            onClick={onOpenConfigModal}
            className="hidden sm:flex w-9 h-9 rounded-lg bg-slate-800 border border-slate-700 hover:border-slate-600 text-slate-300 hover:text-white transition-colors cursor-pointer items-center justify-center shrink-0"
            title="ThingsBoard Server Settings"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Mobile Menu Toggle Button (Hamburger / Close) - Visible on mobile only */}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden w-9 h-9 flex items-center justify-center rounded-lg bg-slate-800 border border-slate-700 hover:border-amber-500/50 text-slate-200 hover:text-amber-300 transition cursor-pointer shrink-0"
            aria-label="Toggle Navigation Menu"
            title={isMobileMenuOpen ? 'Close Menu' : 'Open Menu'}
          >
            {isMobileMenuOpen ? <X className="w-4 h-4 text-amber-400" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Menu Drawer */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-slate-800 bg-slate-900/98 backdrop-blur-xl px-4 py-3.5 space-y-3 animate-fadeIn shadow-2xl">
          {/* User Session Bar in Mobile Menu */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800/80">
            <div className="flex items-center gap-2 min-w-0">
              <div className={`p-1.5 rounded-lg ${isAuth ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                {isAuth ? <ShieldCheck className="w-4 h-4" /> : <User className="w-4 h-4" />}
              </div>
              <div className="min-w-0">
                <span className="text-xs font-mono font-semibold text-slate-200 truncate block">
                  {authUsername || 'Guest User'}
                </span>
                <span className="text-[10px] text-slate-500 font-mono block">
                  {isAuth ? 'SSO Authenticated' : 'Session Unauthenticated'}
                </span>
              </div>
            </div>

            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                handleAuthClick();
              }}
              className={`h-7 px-2.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition cursor-pointer ${
                isAuth
                  ? 'bg-rose-500/15 border border-rose-500/30 text-rose-300 hover:bg-rose-500/25'
                  : 'bg-amber-500 text-slate-950 font-bold hover:bg-amber-400'
              }`}
            >
              {isAuth ? (
                <>
                  <LogOut className="w-3 h-3" />
                  <span>Sign Out</span>
                </>
              ) : (
                <>
                  <LogIn className="w-3 h-3" />
                  <span>Sign In</span>
                </>
              )}
            </button>
          </div>

          {/* Prominent Action: Claim Device */}
          <button
            onClick={() => {
              setIsMobileMenuOpen(false);
              onOpenClaimModal();
            }}
            className="w-full h-10 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-950/40 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Claim New Humidor Device</span>
          </button>

          {/* Mobile Theme Selector */}
          <div className="space-y-1.5 pt-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block pl-1">Theme Preset</span>
            <div className="relative">
              <select
                value={currentTheme.id}
                onChange={(e) => setTheme(e.target.value)}
                className="w-full h-10 pl-3 pr-8 rounded-xl bg-slate-800 border border-slate-700 hover:border-slate-600 text-xs font-mono text-slate-200 transition-colors shadow-sm cursor-pointer appearance-none outline-none"
              >
                {presets.map((t) => (
                  <option key={t.id} value={t.id} className="bg-slate-900 text-slate-200">
                    {t.name} — {t.description}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                  <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                </svg>
              </div>
            </div>
          </div>

          {/* Quick Actions Grid in Mobile Menu */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            {/* PWA Install Button */}
            <div className="col-span-2">
              <PWAInstallButton className="w-full justify-center h-9" />
            </div>

            {/* Server Settings */}
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                onOpenConfigModal();
              }}
              className="h-9 px-3 rounded-xl bg-slate-800/90 border border-slate-700/80 hover:border-amber-500/40 text-slate-300 text-xs font-medium flex items-center gap-2 transition cursor-pointer"
            >
              <Settings className="w-4 h-4 text-slate-400" />
              <span>Server Settings</span>
            </button>

            {/* Web Push Notifications */}
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                onOpenPushModal();
              }}
              className="h-9 px-3 rounded-xl bg-slate-800/90 border border-slate-700/80 hover:border-amber-500/40 text-slate-300 text-xs font-medium flex items-center gap-2 transition cursor-pointer"
            >
              <BellRing className="w-4 h-4 text-amber-400" />
              <span>Push Alerts</span>
            </button>

            {/* API Logs Inspector */}
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                onOpenApiInspector();
              }}
              className="h-9 px-3 rounded-xl bg-slate-800/90 border border-slate-700/80 hover:border-amber-500/40 text-slate-300 text-xs font-medium flex items-center gap-2 transition cursor-pointer font-mono"
            >
              <Terminal className="w-4 h-4 text-amber-400" />
              <span>API Logs</span>
            </button>

            {/* About & Specs */}
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                onOpenAboutModal();
              }}
              className="h-9 px-3 rounded-xl bg-slate-800/90 border border-slate-700/80 hover:border-amber-500/40 text-slate-300 text-xs font-medium flex items-center gap-2 transition cursor-pointer"
            >
              <Info className="w-4 h-4 text-amber-400" />
              <span>About & Specs</span>
            </button>

            {/* Dev Notice */}
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                onOpenDevWarning();
              }}
              className="col-span-2 h-8 px-3 rounded-xl bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 text-amber-300 text-[11px] font-medium flex items-center justify-center gap-1.5 transition cursor-pointer font-mono"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span>Dashboard v{APP_CONFIG.version} (Active Development)</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};

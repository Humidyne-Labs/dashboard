import React, { useState } from 'react';
import { useAuth } from 'react-oidc-context';
import { HumidorDevice, TempUnit } from '../types';
import { UserProfile, thingsboard } from '../services/thingsboard';
import { getSafeHost } from '../utils/url';
import { getEnv } from '../utils/env';
import { APP_CONFIG } from '../config/env';
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
  X
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
  const auth = useAuth();
  const authUsername =
    (auth.user?.profile?.preferred_username as string) ||
    auth.user?.profile?.name ||
    (auth.user?.profile?.email ? auth.user.profile.email.split('@')[0] : null) ||
    (currentUser ? currentUser.email.split('@')[0] : null);
  const isAuth = auth.isAuthenticated || !!currentUser;

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
        // ALWAYS clear the ThingsBoard session locally first
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

      // Deep-clean storage to guarantee all credentials and sessions are completely wiped
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
        // Redirect to a clean origin path to force a clean reload and show the auth gate immediately
        window.location.href = window.location.origin + window.location.pathname;
      }
    } else {
      auth.signinRedirect();
    }
  };

  const formatTemp = (tempF: number) => {
    if (tempUnit === 'C') {
      return `${(((tempF - 32) * 5) / 9).toFixed(1)}°C`;
    }
    return `${tempF.toFixed(1)}°F`;
  };

  const getStatusBadge = (status: HumidorDevice['status']) => {
    switch (status) {
      case 'ONLINE':
        return <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-500/30">ONLINE</span>;
      case 'SLEEP':
        return <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-amber-300 border border-slate-700">SLEEP</span>;
      default:
        return null;
    }
  };

  // Only active (ONLINE) or SLEEP devices appear in the live telemetry reel
  const activeOrSleepingDevices = devices.filter(
    (d) => d.status === 'ONLINE' || d.status === 'SLEEP'
  );

  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800/80 shadow-lg shadow-black/20">
      {/* Top Scrolling Live News-Channel Ticker */}
      <div className="bg-slate-950 border-b border-slate-800/60 overflow-hidden py-1.5 px-3 flex items-center relative text-xs">
        <div className="flex items-center gap-1.5 text-amber-400 font-bold uppercase tracking-wider text-[11px] pr-3 shrink-0 border-r border-slate-800 z-10 bg-slate-950">
          <span className="relative flex h-2 w-2">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${activeOrSleepingDevices.length > 0 ? 'bg-emerald-400' : 'bg-amber-400'} opacity-75`}></span>
            <span className={`relative inline-flex rounded-full h-2 w-2 ${activeOrSleepingDevices.length > 0 ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
          </span>
          {activeOrSleepingDevices.length > 0 ? 'Live Telemetry' : 'System Ready'}
        </div>

        <div className="overflow-hidden w-full select-none">
          {activeOrSleepingDevices.length > 0 ? (
            <div className="animate-ticker flex items-center gap-6">
              {activeOrSleepingDevices.map((device) => {
                const isSelected = device.id === selectedDeviceId;
                const isDry = device.telemetry.rh < 65;
                const isWet = device.telemetry.rh > 75;
                const isHot = device.telemetry.temp > 75;

                return (
                  <button
                    key={device.id}
                    onClick={() => onSelectDevice(device.id)}
                    className={`inline-flex items-center gap-2.5 px-3 py-1 rounded-md transition-all text-xs font-medium cursor-pointer shrink-0 ${
                      isSelected
                        ? 'bg-amber-500/15 border border-amber-500/40 text-amber-200 shadow-sm'
                        : 'bg-slate-900/80 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white'
                    }`}
                  >
                    <span className="font-semibold text-slate-100">{device.name}</span>
                    {getStatusBadge(device.status)}

                    <span className="text-slate-600">|</span>

                    <span className={`font-mono font-medium ${isDry ? 'text-blue-400 font-bold' : isWet ? 'text-rose-400 font-bold' : 'text-emerald-400'}`}>
                      RH {device.telemetry.rh.toFixed(1)}%
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
              })}
            </div>
          ) : (
            <div className="px-3 text-slate-400 font-mono text-xs flex items-center gap-2">
              <span className="text-slate-500">SSO AUTHENTICATED:</span>
              <span className="text-emerald-400 font-bold">{auth.user?.profile?.email || authUsername || 'Active Session'}</span>
              <span className="text-slate-600">•</span>
              <span>No active or sleeping humidor telemetry streams detected. Claim a hardware device to start monitoring.</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-15 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">
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

      {/* Mobile Dropdown Menu Drawer (Clean, Accessible & Responsive) */}
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

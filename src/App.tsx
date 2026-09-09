import { useState, useEffect } from 'react';
import { useAuth } from 'react-oidc-context';
import { HumidorDevice, HumidorAlarm, TempUnit } from './types';
import { thingsboard } from './services/thingsboard';
import { HeaderTicker } from './components/HeaderTicker';
import { DeviceStatusHeader } from './components/DeviceStatusHeader';
import { ClimateGauges } from './components/ClimateGauges';
import { HistoricalChart } from './components/HistoricalChart';
import { ControlPanel } from './components/ControlPanel';
import { OtaUpdateCenter } from './components/OtaUpdateCenter';
import { AlarmsFeed } from './components/AlarmsFeed';
import { ClaimDeviceModal } from './components/ClaimDeviceModal';
import { ServerConfigModal } from './components/ServerConfigModal';
import { AuthModal } from './components/AuthModal';
import { ApiInspectorModal } from './components/ApiInspectorModal';
import { RemoveDeviceModal } from './components/RemoveDeviceModal';
import { DevelopmentWarningModal } from './components/DevelopmentWarningModal';
import { AboutModal } from './components/AboutModal';
import { PushNotificationModal } from './components/PushNotificationModal';
import { AlarmThresholdsModal } from './components/AlarmThresholdsModal';
import { ProtectedRoute } from './components/ProtectedRoute';
import { getEnv } from './utils/env';
import { Flame, Cpu, Info, AlertTriangle } from 'lucide-react';

function areDevicesEqual(a: HumidorDevice[], b: HumidorDevice[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (
      a[i].id !== b[i].id ||
      a[i].name !== b[i].name ||
      a[i].status !== b[i].status ||
      a[i].telemetry?.rh !== b[i].telemetry?.rh ||
      a[i].telemetry?.temp !== b[i].telemetry?.temp ||
      a[i].telemetry?.battery !== b[i].telemetry?.battery ||
      a[i].telemetry?.timestamp !== b[i].telemetry?.timestamp
    ) {
      return false;
    }
  }
  return true;
}

function areAlarmsEqual(a: HumidorAlarm[], b: HumidorAlarm[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (
      a[i].id !== b[i].id ||
      a[i].status !== b[i].status ||
      a[i].severity !== b[i].severity ||
      a[i].createdTime !== b[i].createdTime
    ) {
      return false;
    }
  }
  return true;
}

export default function App() {
  const auth = useAuth();
  const [devices, setDevices] = useState<HumidorDevice[]>(() => thingsboard.getDevices());
  const [alarms, setAlarms] = useState<HumidorAlarm[]>(() => thingsboard.getAlarms());
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>(() => {
    const initialDevices = thingsboard.getDevices();
    return initialDevices.length > 0 ? initialDevices[0].id : '';
  });
  const [tempUnit, setTempUnit] = useState<TempUnit>('F');
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isApiInspectorOpen, setIsApiInspectorOpen] = useState(false);
  const [isRemoveModalOpen, setIsRemoveModalOpen] = useState(false);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
  const [isDevWarningOpen, setIsDevWarningOpen] = useState(false);
  const [isPushModalOpen, setIsPushModalOpen] = useState(false);
  const [isThresholdsModalOpen, setIsThresholdsModalOpen] = useState(false);

  const appTitle = getEnv('VITE_APP_TITLE', 'HUMID1-DASHBOARD');
  const appDesc = getEnv('VITE_APP_DESCRIPTION', 'Precision Humidor Monitoring & Telemetry Stack');

  // Check on startup if dev warning was dismissed
  useEffect(() => {
    try {
      const dismissed = localStorage.getItem('humid1_dev_warning_dismissed');
      if (dismissed !== 'true') {
        setIsDevWarningOpen(true);
      }
    } catch {
      setIsDevWarningOpen(true);
    }
  }, []);

  const isAuth = auth.isAuthenticated;
  const oidcSub = auth.user?.profile?.sub;
  const oidcEmail = auth.user?.profile?.email;
  const oidcName = auth.user?.profile?.name || auth.user?.profile?.preferred_username;

  const tbProfile = thingsboard.getCurrentUser();
  const currentUser =
    tbProfile ||
    (isAuth && (oidcSub || oidcEmail)
      ? {
          id: (oidcSub as string) || 'oidc-user',
          name: oidcName || oidcEmail || 'Humid1 User',
          email: oidcEmail || 'user@humid1.com',
          role: 'Authenticated User',
        }
      : null);

  useEffect(() => {
    const unsubDevices = thingsboard.subscribe((updatedDevices, updatedAlarms) => {
      setDevices((prev) => (areDevicesEqual(prev, updatedDevices) ? prev : updatedDevices));
      setAlarms((prev) => (areAlarmsEqual(prev, updatedAlarms) ? prev : updatedAlarms));

      // Select first device if none selected
      setSelectedDeviceId((prevId) => {
        if (!prevId && updatedDevices.length > 0) {
          return updatedDevices[0].id;
        }
        if (prevId && !updatedDevices.some((d) => d.id === prevId)) {
          return updatedDevices[0]?.id || '';
        }
        return prevId;
      });
    });

    return () => {
      unsubDevices();
    };
  }, []);

  const selectedDevice = devices.find((d) => d.id === selectedDeviceId) || devices[0];

  // Synchronize unit with device's shared attribute temp_unit if configured
  useEffect(() => {
    if (selectedDevice?.sharedAttributes?.temp_unit) {
      const u = selectedDevice.sharedAttributes.temp_unit;
      if (u === 'F' || u === 'C') {
        setTempUnit(u);
      }
    }
  }, [selectedDevice?.id, selectedDevice?.sharedAttributes?.temp_unit]);

  const handleSelectDevice = (deviceId: string) => {
    setSelectedDeviceId(deviceId);
  };

  const handleToggleTempUnit = () => {
    const nextUnit: TempUnit = tempUnit === 'F' ? 'C' : 'F';
    setTempUnit(nextUnit);
    if (selectedDevice?.id) {
      // Update only the 'temp_unit' shared attribute in ThingsBoard
      thingsboard.updateSharedAttributes(selectedDevice.id, {
        temp_unit: nextUnit,
      });
    }
  };

  const userEmail =
    auth.user?.profile?.email ||
    auth.user?.profile?.preferred_username ||
    currentUser?.email ||
    'Authenticated User';

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-amber-500 selection:text-slate-950 font-sans antialiased overflow-x-hidden w-full max-w-full">
        {/* Top Header with live ticker & device switcher */}
        <HeaderTicker
          devices={devices}
          selectedDeviceId={selectedDeviceId || (devices[0]?.id ?? '')}
          onSelectDevice={handleSelectDevice}
          tempUnit={tempUnit}
          onToggleTempUnit={handleToggleTempUnit}
          activeAlarmCount={alarms.filter((a) => a.status.startsWith('ACTIVE')).length}
          onOpenConfigModal={() => setIsConfigModalOpen(true)}
          onOpenAuthModal={() => setIsAuthModalOpen(true)}
          onOpenClaimModal={() => setIsClaimModalOpen(true)}
          onOpenApiInspector={() => setIsApiInspectorOpen(true)}
          onOpenAboutModal={() => setIsAboutModalOpen(true)}
          onOpenDevWarning={() => setIsDevWarningOpen(true)}
          onOpenPushModal={() => setIsPushModalOpen(true)}
          onOpenAlarmsModal={() => {
            const el = document.getElementById('alarms-feed-section');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
          currentUser={currentUser}
          isDemoMode={thingsboard.isDemoMode()}
        />

        {/* Main Content Area */}
        <main className="flex-1 max-w-[1536px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          {devices.length > 0 && selectedDevice ? (
            <>
              {/* Primary Device Status & Quick Metrics with Grouped Alert Controls */}
              <DeviceStatusHeader
                device={selectedDevice}
                allDevices={devices}
                onSelectDevice={handleSelectDevice}
                onRemoveDevice={() => setIsRemoveModalOpen(true)}
                onOpenPushModal={() => setIsPushModalOpen(true)}
              />

              {/* Climate Gauges Grid (RH%, Temp, Battery, RSSI) */}
              <ClimateGauges
                device={selectedDevice}
                tempUnit={tempUnit}
                onToggleTempUnit={handleToggleTempUnit}
              />

              {/* Historical Telemetry Chart */}
              <HistoricalChart device={selectedDevice} tempUnit={tempUnit} />

              {/* Hardware Device & Alarm Parameters Control Panel (Collapsible & Windowed) */}
              <ControlPanel 
                device={selectedDevice} 
                tempUnit={tempUnit}
                onOpenThresholds={() => setIsThresholdsModalOpen(true)} 
              />

              {/* OTA Firmware Management Center (Collapsible & Windowed) */}
              <OtaUpdateCenter device={selectedDevice} />

              {/* Live ThingsBoard Alarms Feed */}
              <div id="alarms-feed-section">
                <AlarmsFeed alarms={alarms} />
              </div>
            </>
          ) : (
            <div className="text-center py-20 bg-slate-900/50 border border-slate-800 rounded-3xl max-w-xl mx-auto p-8 shadow-2xl space-y-4">
              <div className="p-4 bg-amber-500/10 text-amber-400 rounded-2xl w-fit mx-auto border border-amber-500/20 shadow-inner">
                <Cpu className="w-10 h-10" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white mb-1">No Claimed Humidor Devices</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                  Authenticated as <span className="text-emerald-400 font-mono font-medium">{userEmail}</span>. There are no ESP32 telemetry hardware units assigned to this account yet.
                </p>
              </div>

              <div className="pt-3 flex items-center justify-center">
                <button
                  onClick={() => setIsClaimModalOpen(true)}
                  className="px-6 py-3 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-md shadow-amber-950/40 flex items-center gap-2 cursor-pointer"
                >
                  + Claim Hardware Device
                </button>
              </div>
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="border-t border-slate-800/80 bg-slate-950/80 py-6 text-xs text-slate-500">
          <div className="max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-500" />
              <button
                onClick={() => setIsAboutModalOpen(true)}
                className="font-display font-semibold text-slate-300 hover:text-amber-300 transition cursor-pointer"
              >
                {appTitle}
              </button>
              <span>— {appDesc}</span>
            </div>
            <div className="flex items-center gap-4 text-[11px] font-mono">
              <button
                onClick={() => setIsDevWarningOpen(true)}
                className="text-amber-400/90 hover:text-amber-300 flex items-center gap-1 cursor-pointer transition"
              >
                <AlertTriangle className="w-3 h-3 text-amber-400" />
                <span>Dev Preview Notice</span>
              </button>
              <span>•</span>
              <button
                onClick={() => setIsAboutModalOpen(true)}
                className="hover:text-slate-300 flex items-center gap-1 cursor-pointer transition"
              >
                <Info className="w-3 h-3" />
                <span>About &amp; Specs</span>
              </button>
              <span>•</span>
              <span>ThingsBoard CE</span>
            </div>
          </div>
        </footer>

        {/* Modals */}
        <ClaimDeviceModal
          isOpen={isClaimModalOpen}
          onClose={() => setIsClaimModalOpen(false)}
          onDeviceClaimed={(newId: string) => {
            setSelectedDeviceId(newId);
          }}
        />
        <ServerConfigModal
          isOpen={isConfigModalOpen}
          onClose={() => setIsConfigModalOpen(false)}
          onOpenDiagnostics={() => {
            setIsConfigModalOpen(false);
            setIsApiInspectorOpen(true);
          }}
        />
        <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
        <ApiInspectorModal isOpen={isApiInspectorOpen} onClose={() => setIsApiInspectorOpen(false)} />
        <DevelopmentWarningModal
          isOpen={isDevWarningOpen}
          onClose={() => setIsDevWarningOpen(false)}
        />
        <AboutModal
          isOpen={isAboutModalOpen}
          onClose={() => setIsAboutModalOpen(false)}
          onOpenDevWarning={() => setIsDevWarningOpen(true)}
        />
        <PushNotificationModal
          isOpen={isPushModalOpen}
          onClose={() => setIsPushModalOpen(false)}
        />
        <AlarmThresholdsModal
          isOpen={isThresholdsModalOpen}
          onClose={() => setIsThresholdsModalOpen(false)}
          activeDevice={selectedDevice}
          tempUnit={tempUnit}
        />
        <RemoveDeviceModal
          isOpen={isRemoveModalOpen}
          onClose={() => setIsRemoveModalOpen(false)}
          device={selectedDevice}
          onDeviceRemoved={(removedId: string) => {
            const remaining = devices.filter((d) => d.id !== removedId);
            if (selectedDeviceId === removedId) {
              setSelectedDeviceId(remaining[0]?.id ?? '');
            }
          }}
        />
      </div>
    </ProtectedRoute>
  );
}

export { App };


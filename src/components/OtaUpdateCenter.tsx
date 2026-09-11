import React, { useState } from 'react';
import { HumidorDevice } from '../types';
import { 
  Cpu, 
  ArrowUpCircle, 
  Loader2, 
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Maximize2,
  X
} from 'lucide-react';

interface OtaUpdateCenterProps {
  device: HumidorDevice;
}

export const OtaUpdateCenter: React.FC<OtaUpdateCenterProps> = ({ device }) => {
  const [updating, setUpdating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [targetVersion] = useState('v1.2.5');

  // Collapsible and Window mode states (default collapsed)
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('humid1_ota_collapsed');
      return stored !== null ? stored === 'true' : true;
    } catch {
      return true;
    }
  });
  const [isWindowOpen, setIsWindowOpen] = useState<boolean>(false);

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('humid1_ota_collapsed', String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const currentVersion = device.clientAttributes.fw_version;

  const handleStartOta = () => {
    setUpdating(true);
    setProgress(10);

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          clearInterval(interval);
          setTimeout(() => {
            setUpdating(false);
            setProgress(100);
          }, 1200);
          return 95;
        }
        return prev + 15;
      });
    }, 600);
  };

  const renderContent = () => (
    <div className="space-y-4">
      {/* Version Matrix */}
      <div className="space-y-3 bg-app-bg/60 p-4 rounded-xl border border-app-border text-xs">
        <div className="flex items-center justify-between">
          <span className="text-app-text-secondary">Current Running Build:</span>
          <span className="font-mono text-app-status-nominal font-bold bg-app-bg/60 px-2 py-0.5 rounded border border-app-status-nominal/20">
            {currentVersion}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-app-text-secondary">Latest Stable Release:</span>
          <span className="font-mono text-app-accent font-bold bg-app-bg/60 px-2 py-0.5 rounded border border-app-accent/20">
            {targetVersion}
          </span>
        </div>

        <div className="flex items-center justify-between border-t border-app-border pt-2">
          <span className="text-app-text-secondary">Partition Scheme:</span>
          <span className="font-mono text-app-text-secondary">Dual OTA (ota_0 / ota_1)</span>
        </div>
      </div>

      {/* Update Progress or Status */}
      {updating ? (
        <div className="space-y-3 p-4 bg-app-accent/10 border border-app-accent/30 rounded-xl">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-app-accent flex items-center gap-1.5">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Flashing Firmware Binary...
            </span>
            <span className="font-mono font-bold text-app-accent">{progress}%</span>
          </div>

          <div className="h-2 w-full bg-app-bg rounded overflow-hidden">
            <div
              className="h-full bg-app-accent transition-all duration-300 rounded"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-[11px] text-app-text-secondary leading-tight">
            Do not power off ESP32 humidor during flash write operation.
          </p>
        </div>
      ) : (
        <div className="p-4 bg-app-bg/20 border border-app-accent/30 rounded-xl text-xs space-y-2">
          <div className="flex items-center gap-2 text-app-accent font-medium">
            <ShieldCheck className="w-4 h-4 text-app-accent" />
            <span>OTA Capability Status: Planned / Non-Functional</span>
          </div>
          <p className="text-[11px] text-app-text-secondary leading-relaxed">
            Remote OTA binary deployment is currently non-functional on active hardware. Firmware revisions must be flashed locally over USB-C via ESP-IDF / esptool. Remote FOTA binary flashing is staged for a future firmware milestone.
          </p>
        </div>
      )}

      <div className="pt-4 border-t border-app-border/80 flex items-center justify-between">
        <span className="text-[11px] font-mono text-app-text-muted">
          Auto-Rollback on Panic: Enabled (Hardware RTC)
        </span>

        <button
          onClick={handleStartOta}
          disabled={updating}
          className={`h-9 px-4 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer ${
            updating
              ? 'bg-app-surface-elevated text-app-text-muted cursor-not-allowed'
              : 'bg-app-surface-elevated hover:bg-app-border-highlight text-app-text-secondary border border-app-border-highlight'
          }`}
          title="OTA is planned and currently non-functional"
        >
          {updating ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Simulating Flash...</span>
            </>
          ) : (
            <>
              <ArrowUpCircle className="w-3.5 h-3.5 text-app-accent" />
              <span>OTA Update (Planned / Inactive)</span>
            </>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <>
      <div className="bg-app-surface/90 border border-app-border rounded-2xl shadow-xl backdrop-blur-sm overflow-hidden transition-all flex flex-col justify-between">
        {/* Header Bar */}
        <div className="p-3.5 sm:p-4 flex items-center justify-between gap-3 bg-app-surface/95">
          <div 
            onClick={toggleCollapse}
            className="flex items-center gap-3 cursor-pointer select-none group min-w-0 flex-1"
          >
            <div className="p-2 rounded-xl bg-app-accent/10 text-app-accent border border-app-accent/20 group-hover:bg-app-accent/20 transition shrink-0">
              <Cpu className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm sm:text-base font-bold text-app-text-primary tracking-wide group-hover:text-app-accent transition truncate">
                OTA Firmware
              </h3>
              <p className="text-xs text-app-text-secondary truncate">
                ESP32-S3 firmware lifecycle
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="font-mono text-xs text-app-status-nominal font-bold bg-app-bg/60 px-2.5 py-1 rounded-lg border border-app-status-nominal/20 whitespace-nowrap">
              {currentVersion}
            </span>

            {/* Window Mode Button */}
            <button
              type="button"
              onClick={() => setIsWindowOpen(true)}
              className="h-8 w-8 rounded-lg bg-app-surface-elevated border border-app-border-highlight hover:border-app-accent text-app-text-secondary hover:text-app-text-primary flex items-center justify-center transition cursor-pointer"
              title="Open OTA Updater in separate window"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>

            {/* Collapse Toggle Chevron */}
            <button
              type="button"
              onClick={toggleCollapse}
              className="h-8 w-8 rounded-lg bg-app-surface-elevated border border-app-border-highlight hover:border-app-accent text-app-text-secondary hover:text-app-text-primary flex items-center justify-center transition cursor-pointer"
              title={isCollapsed ? 'Expand OTA Updater' : 'Collapse OTA Updater'}
            >
              {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Collapsible Content Body */}
        {!isCollapsed && (
          <div className="p-4 sm:p-6 border-t border-app-border/80 animate-fadeIn">
            {renderContent()}
          </div>
        )}
      </div>

      {/* Floating Modal Window Mode */}
      {isWindowOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-app-bg/80 backdrop-blur-md animate-fadeIn"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-app-surface border border-app-border-highlight rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-app-border bg-app-bg/80">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-app-accent/10 text-app-accent border border-app-accent/20">
                  <Cpu className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-app-text-primary tracking-wide">
                    OTA Firmware Updater Window
                  </h3>
                  <p className="text-xs text-app-text-secondary">{device.name} FOTA Manager</p>
                </div>
              </div>

              <button
                onClick={() => setIsWindowOpen(false)}
                className="p-2 rounded-xl text-app-text-secondary hover:text-app-text-primary hover:bg-app-surface-elevated transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              {renderContent()}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

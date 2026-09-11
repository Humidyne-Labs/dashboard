import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, ChevronRight, Bug } from 'lucide-react';
import { APP_CONFIG } from '../config/env';

interface DevelopmentWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const STORAGE_KEY_DEV_DISMISSED = 'humid1_dev_warning_dismissed';

export const DevelopmentWarningModal: React.FC<DevelopmentWarningModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  if (!isOpen) return null;

  const handleDismiss = () => {
    if (dontShowAgain) {
      try {
        localStorage.setItem(STORAGE_KEY_DEV_DISMISSED, 'true');
      } catch {
        // ignore
      }
    }
    onClose();
  };

  return (
    <div
      id="dev-warning-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-app-bg/80 backdrop-blur-md animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dev-warning-title"
    >
      <div className="bg-app-surface border border-app-accent/40 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden text-app-text-primary animate-scaleIn">
        {/* Banner Top Accent */}
        <div className="bg-app-accent h-2 w-full" />

        <div className="p-6 sm:p-7 space-y-5">
          {/* Icon & Title */}
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-2xl bg-app-accent/15 border border-app-accent/30 text-app-accent shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-app-accent/20 text-app-accent border border-app-accent/30">
                  Pre-Release Build {APP_CONFIG.version}
                </span>
              </div>
              <h2 id="dev-warning-title" className="text-lg font-bold text-app-text-primary font-display">
                Dashboard Under Active Development
              </h2>
            </div>
          </div>

          {/* Description & Notice */}
          <div className="space-y-3 text-xs leading-relaxed text-app-text-secondary bg-app-bg/70 p-4 rounded-2xl border border-app-border">
            <p className="text-app-text-primary">
              Welcome to <strong>HUMID1 Telemetry Dashboard</strong> (<code className="font-mono text-app-accent">dash.humid1.com</code>).
            </p>
            <p className="text-app-text-secondary">
              Please note that this dashboard is in active development and testing. Features, telemetry feeds, and SSO authentication flows are being refined and may experience intermittent quirks or bugs as live hardware testing continues.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-app-border/80 text-[11px] font-mono">
              <div className="flex items-center gap-1.5 text-app-accent/90">
                <Bug className="w-3.5 h-3.5 text-app-accent shrink-0" />
                <span>Active Bug Squash Phase</span>
              </div>
              <div className="flex items-center gap-1.5 text-app-status-nominal">
                <CheckCircle className="w-3.5 h-3.5 text-app-status-nominal shrink-0" />
                <span>Live Telemetry Active</span>
              </div>
            </div>
          </div>

          {/* Checkbox: Don't show again */}
          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2.5 text-xs text-app-text-secondary hover:text-app-text-secondary cursor-pointer select-none">
              <input
                type="checkbox"
                checked={dontShowAgain}
                onChange={(e) => setDontShowAgain(e.target.checked)}
                className="w-4 h-4 rounded border-app-border-highlight bg-app-bg text-app-accent focus:ring-app-accent/40 focus:ring-offset-0 transition cursor-pointer"
              />
              <span>Don't show this notice again on this device</span>
            </label>
          </div>

          {/* Action Button */}
          <div className="pt-2">
            <button
              id="dismiss-dev-warning-btn"
              type="button"
              onClick={handleDismiss}
              className="w-full py-3 px-5 rounded-xl bg-app-accent hover:bg-app-accent-hover text-app-accent-text font-bold text-xs tracking-wide transition-all shadow-lg shadow-app-bg/40 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
            >
              <span>I Understand &amp; Continue</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

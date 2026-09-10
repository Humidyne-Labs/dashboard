import React, { useState } from 'react';
import { Download, Smartphone, Share, PlusSquare, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  className?: string;
  variant?: 'header' | 'button' | 'compact';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  className = '',
  variant = 'header',
}) => {
  const { isInstallable, isInstalled, isStandalone, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [installing, setInstalling] = useState(false);

  const handleInstallClick = async () => {
    if (isInstallable) {
      setInstalling(true);
      try {
        await install();
      } finally {
        setInstalling(false);
      }
    } else if (isIOS) {
      setShowIOSGuide(true);
    }
  };

  // If running in standalone or TWA mode, show active badge
  if (isStandalone || isInstalled) {
    if (variant === 'compact') return null;
    return (
      <div
        className={`h-9 flex items-center gap-1.5 px-3 rounded-lg bg-app-status-nominal/10 border border-app-status-nominal/20 text-app-status-nominal text-xs font-mono select-none whitespace-nowrap ${className}`}
        title="Running as an installed PWA / Android TWA"
      >
        <Smartphone className="w-3.5 h-3.5 text-app-status-nominal" />
        <span className="hidden sm:inline">PWA Active</span>
      </div>
    );
  }

  // Not installable in this browser engine (or already installed) and not iOS
  if (!isInstallable && !isIOS) {
    return null;
  }

  return (
    <>
      <button
        id="pwa-install-app-btn"
        type="button"
        onClick={handleInstallClick}
        disabled={installing}
        className={`h-9 flex items-center gap-1.5 px-3 rounded-lg bg-gradient-to-r from-app-accent to-app-accent-hover hover:from-app-accent hover:to-app-accent-hover text-app-accent-text font-bold text-xs tracking-wide transition shadow-sm cursor-pointer active:scale-95 disabled:opacity-50 whitespace-nowrap ${className}`}
        title={isIOS ? 'Install HUMID1 on iPhone/iPad' : 'Install HUMID1 Native App'}
      >
        <Download className="w-3.5 h-3.5 text-app-accent-text stroke-[2.5]" />
        <span>{isIOS ? 'Install on iOS' : 'Install App'}</span>
      </button>

      {/* iOS Installation Instruction Guide Modal */}
      {showIOSGuide && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-app-bg/80 backdrop-blur-md animate-fadeIn"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-app-surface border border-app-border-highlight rounded-2xl w-full max-w-sm shadow-2xl p-6 text-app-text-primary space-y-4 animate-scaleIn">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-app-accent/10 text-app-accent border border-app-accent/20">
                  <Smartphone className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-app-text-primary text-base font-display">Install on iPhone / iPad</h3>
              </div>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="p-1.5 rounded-lg text-app-text-secondary hover:text-app-text-primary hover:bg-app-surface-elevated transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-app-text-secondary bg-app-bg/80 p-4 rounded-xl border border-app-border">
              <div className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-app-accent/20 text-app-accent font-mono font-bold flex items-center justify-center shrink-0 text-[11px]">
                  1
                </span>
                <p>
                  In Safari, tap the <strong className="text-app-accent">Share</strong> icon <Share className="inline w-3.5 h-3.5 text-app-accent mx-0.5" /> at the bottom of the screen.
                </p>
              </div>

              <div className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-app-accent/20 text-app-accent font-mono font-bold flex items-center justify-center shrink-0 text-[11px]">
                  2
                </span>
                <p>
                  Scroll down the menu and tap <strong className="text-app-accent">Add to Home Screen</strong> <PlusSquare className="inline w-3.5 h-3.5 text-app-accent mx-0.5" />.
                </p>
              </div>

              <div className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-app-status-nominal/20 text-emerald-300 font-mono font-bold flex items-center justify-center shrink-0 text-[11px]">
                  3
                </span>
                <p>
                  Tap <strong className="text-emerald-300">Add</strong> in the top-right corner to launch HUMID1 as a full-screen native app.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowIOSGuide(false)}
              className="w-full py-2.5 rounded-xl bg-app-surface-elevated hover:bg-app-border-highlight text-app-text-primary font-semibold text-xs transition cursor-pointer"
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </>
  );
};

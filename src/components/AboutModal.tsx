import React, { useState } from 'react';
import {
  X,
  Flame,
  Shield,
  Calendar,
  UserCheck,
  Sparkles,
  Layers,
  Check,
  Copy,
} from 'lucide-react';
import { APP_CONFIG } from '../config/env';
import { getEnv } from '../utils/env';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenDevWarning?: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({
  isOpen,
  onClose,
  onOpenDevWarning,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const version = APP_CONFIG.version;
  const revision = APP_CONFIG.revision;
  const buildDate = getEnv('VITE_BUILD_DATE', 'September 2026 (Continuous Build)');
  const authors = 'HUMID1 Engineering Team';
  const contributors = [
    'HUMID1 Core Developers',
    'Google AI Studio',
    'Gemini API',
  ];
  const copyright = `© ${new Date().getFullYear()} HUMIDYNE LABS. All rights reserved.`;
  const license = 'MIT License';
  const dataRetention = '7 Days (604,800 seconds)';

  const aboutJson = {
    appName: 'HUMID1 Telemetry Dashboard',
    version,
    revision,
    buildDate,
    authors,
    contributors,
    copyright,
    license,
    dataRetentionPolicy: dataRetention,
    environment: {
      dashboardDomain: APP_CONFIG.domains.dashboardUrl,
      thingsboardUrl: APP_CONFIG.domains.thingsboardUrl,
      authentikUrl: APP_CONFIG.domains.authentikUrl,
    },
  };

  const handleCopySpecs = () => {
    navigator.clipboard.writeText(JSON.stringify(aboutJson, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      id="about-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-app-bg/80 backdrop-blur-md animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="about-modal-title"
    >
      <div className="bg-app-surface border border-app-border-highlight rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-app-border bg-app-bg/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-app-accent/10 text-app-accent border border-app-accent/20">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <h3 id="about-modal-title" className="font-bold text-app-text-primary text-base font-display">
                About HUMID1 Dashboard
              </h3>
              <p className="text-xs text-app-text-secondary">Precision IoT Telemetry &amp; Climate Control Architecture</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopySpecs}
              className="p-2 rounded-xl text-app-text-secondary hover:text-app-text-primary hover:bg-app-surface-elevated transition flex items-center gap-1.5 text-xs font-mono cursor-pointer"
              title="Copy System Specs JSON"
            >
              {copied ? <Check className="w-4 h-4 text-app-status-nominal" /> : <Copy className="w-4 h-4" />}
              <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy Specs'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-app-text-secondary hover:text-app-text-primary hover:bg-app-surface-elevated transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Main Hero Card */}
          <div className="bg-app-bg p-5 rounded-2xl border border-app-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-app-text-primary font-display">HUMID1</span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-app-accent/20 text-app-accent border border-app-accent/30">
                  v{version}
                </span>
              </div>
              <p className="text-xs text-app-text-secondary max-w-md leading-relaxed">
                Industrial-grade real-time humidor climate telemetry, ESP32 hardware device management, dual-sensor differential analytics, and ThingsBoard IoT command center.
              </p>
            </div>

            {onOpenDevWarning && (
              <button
                onClick={() => {
                  onClose();
                  onOpenDevWarning();
                }}
                className="px-3 py-1.5 rounded-xl bg-app-accent/10 hover:bg-app-accent/20 border border-app-accent/30 text-app-accent text-xs font-semibold transition shrink-0 cursor-pointer"
              >
                Development Status
              </button>
            )}
          </div>

          {/* Key Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Version & Build */}
            <div className="bg-app-bg/60 p-4 rounded-2xl border border-app-border/80 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-bold text-app-text-secondary font-mono">
                <Calendar className="w-4 h-4 text-app-accent" />
                <span>Build &amp; Release</span>
              </div>
              <div className="text-xs text-app-text-primary font-mono">
                Version: <span className="text-app-accent font-bold">{version}</span>
              </div>
              <div className="text-xs text-app-text-primary font-mono">
                Revision: <span className="text-app-accent font-bold">{revision}</span>
              </div>
              <div className="text-xs text-app-text-secondary font-mono">
                Build Date: <span className="text-app-text-secondary">{buildDate}</span>
              </div>
            </div>

            {/* License & Copyright */}
            <div className="bg-app-bg/60 p-4 rounded-2xl border border-app-border/80 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-bold text-app-text-secondary font-mono">
                <Shield className="w-4 h-4 text-app-status-nominal" />
                <span>Legal &amp; Licensing</span>
              </div>
              <div className="text-xs text-app-text-primary font-mono">
                License: <span className="text-emerald-300 font-bold">{license}</span>
              </div>
              <div className="text-xs text-app-text-secondary font-mono">{copyright}</div>
            </div>

            {/* Authors */}
            <div className="bg-app-bg/60 p-4 rounded-2xl border border-app-border/80 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-bold text-app-text-secondary font-mono">
                <UserCheck className="w-4 h-4 text-app-status-info" />
                <span>Authors</span>
              </div>
              <div className="text-xs text-app-text-primary font-medium">{authors}</div>
              <div className="text-[11px] text-app-text-secondary">HUMID1 Systems &amp; Embedded Firmware Group</div>
            </div>

            {/* Contributors */}
            <div className="bg-app-bg/60 p-4 rounded-2xl border border-app-border/80 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-bold text-app-text-secondary font-mono">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span>Contributors</span>
              </div>
              <ul className="text-xs text-app-text-primary space-y-1">
                {contributors.map((c, idx) => (
                  <li key={idx} className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Architecture & Infrastructure Specs */}
          <div className="bg-app-bg p-4 rounded-2xl border border-app-border space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-app-text-secondary uppercase tracking-wider font-mono">
              <Layers className="w-4 h-4 text-app-accent" />
              <span>Stack &amp; Telemetry Architecture</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono text-app-text-secondary">
              <div className="p-2.5 rounded-xl bg-app-surface border border-app-border">
                <span className="text-app-text-primary0 block text-[10px]">Data Retention TTL</span>
                <span className="text-app-accent font-bold">{dataRetention}</span>
                <span className="text-[10px] text-app-text-primary0 block">SQL_DATA_RETENTION_TTL=604800</span>
              </div>

              <div className="p-2.5 rounded-xl bg-app-surface border border-app-border">
                <span className="text-app-text-primary0 block text-[10px]">IoT Core Platform</span>
                <span className="text-emerald-300 font-bold">ThingsBoard CE REST &amp; WSS</span>
                <span className="text-[10px] text-app-text-primary0 block truncate">{APP_CONFIG.domains.thingsboardUrl}</span>
              </div>

              <div className="p-2.5 rounded-xl bg-app-surface border border-app-border">
                <span className="text-app-text-primary0 block text-[10px]">Identity &amp; Auth</span>
                <span className="text-app-status-info font-bold">Authentik OIDC (PKCE) + Native JWT</span>
                <span className="text-[10px] text-app-text-primary0 block truncate">{APP_CONFIG.domains.authentikUrl}</span>
              </div>

              <div className="p-2.5 rounded-xl bg-app-surface border border-app-border">
                <span className="text-app-text-primary0 block text-[10px]">Frontend Stack</span>
                <span className="text-purple-300 font-bold">React 18 + Vite + Tailwind CSS</span>
                <span className="text-[10px] text-app-text-primary0 block">Docker Multi-stage runtime</span>
              </div>

              <div className="p-2.5 rounded-xl bg-app-surface border border-app-border sm:col-span-2">
                <span className="text-app-text-primary0 block text-[10px]">PWA &amp; Native Android TWA Stack</span>
                <span className="text-app-accent font-bold">Vite PWA (Workbox v7) + Google Bubblewrap CLI</span>
                <span className="text-[10px] text-app-text-secondary block">com.humid1.app • Web Push API • /.well-known/assetlinks.json</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer with Close Button */}
        <div className="px-6 py-4 border-t border-app-border bg-app-bg/70 flex items-center justify-between">
          <span className="text-[11px] text-app-text-primary0 font-mono">
            {APP_CONFIG.domains.dashboardUrl}
          </span>
          <button
            id="close-about-modal-btn"
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-app-surface-elevated hover:bg-app-border-highlight text-app-text-primary text-xs font-bold transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

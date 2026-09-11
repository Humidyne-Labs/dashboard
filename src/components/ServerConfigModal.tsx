import React, { useState } from 'react';
import { thingsboard } from '../services/thingsboard';
import { apiLogger } from '../services/apiLogger';
import {
  Settings,
  X,
  Server,
  CheckCircle2,
  Zap,
  Key,
  ShieldCheck,
  ShieldAlert,
  AlertCircle,
  Play,
  Terminal,
  Loader2,
} from 'lucide-react';
import {
  isAuthentikOidcToken,
  isThingsBoardToken,
  normalizeBearerToken,
} from '../utils/authTokens';

interface ServerConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenDiagnostics?: (tab?: 'logs' | 'token') => void;
}

export const ServerConfigModal: React.FC<ServerConfigModalProps> = ({
  isOpen,
  onClose,
  onOpenDiagnostics,
}) => {
  const currentConfig = thingsboard.getConfig();
  const [serverUrl, setServerUrl] = useState(currentConfig.serverUrl);
  const [authentikUrl, setAuthentikUrl] = useState(currentConfig.authentikUrl || '');
  const [thingsboardToken, setThingsboardToken] = useState(currentConfig.thingsboardToken || '');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    status: number;
    error?: string;
  } | null>(null);

  const activeToken = thingsboard.getEffectiveToken();
  const currentUser = thingsboard.getCurrentUser();

  if (!isOpen) return null;

  const normalizedActive = normalizeBearerToken(activeToken);
  const isTb = isThingsBoardToken(normalizedActive);
  const isOidc = isAuthentikOidcToken(normalizedActive);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanToken = thingsboardToken.trim();
    thingsboard.saveConfig({
      serverUrl: serverUrl.trim(),
      authentikUrl: authentikUrl.trim(),
      thingsboardToken: cleanToken,
    });
    if (cleanToken) {
      thingsboard.setAuthSession(cleanToken);
    }
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 800);
  };

  const handleTestToken = async () => {
    const tokenToTest = thingsboardToken.trim() || activeToken;
    if (!tokenToTest) {
      setTestResult({
        success: false,
        status: 0,
        error: 'No token specified to test.',
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    const result = await apiLogger.testTokenDirect(serverUrl.trim(), tokenToTest);
    setIsTesting(false);
    setTestResult({
      success: result.success,
      status: result.status,
      error: result.error,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-app-bg/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-app-surface border border-app-border rounded-2xl w-full max-w-lg p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-app-text-secondary hover:text-app-text-primary p-1 rounded-lg hover:bg-app-surface-elevated transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center justify-between mb-5 pr-8">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-app-accent/10 text-app-accent border border-app-accent/20">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-app-text-primary">Platform & Gateway Configuration</h3>
              <p className="text-xs text-app-text-secondary">Manage runtime service endpoints & ThingsBoard credentials</p>
            </div>
          </div>
        </div>

        {savedSuccess && (
          <div className="mb-4 p-3 rounded-xl bg-app-bg/60 border border-app-status-nominal/30 text-app-status-nominal text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-app-status-nominal" />
            <span>Configuration saved successfully!</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-app-text-secondary mb-1.5">
              ThingsBoard Server Host URL
            </label>
            <div className="relative">
              <input
                type="text"
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
                placeholder="https://app.humid1.com"
                className="w-full bg-app-bg border border-app-border-highlight rounded-xl px-3.5 py-2.5 pl-10 text-app-text-primary placeholder-app-text-muted focus:outline-none focus:border-app-accent font-mono text-xs"
              />
              <Server className="w-4 h-4 text-app-text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>
            <span className="text-[11px] text-app-text-muted mt-1 block">
              ThingsBoard IoT engine REST & WebSocket endpoint.
            </span>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-app-text-secondary">
                ThingsBoard API Access Token (JWT Override)
              </label>
            </div>
            <div className="relative">
              <input
                type="password"
                value={thingsboardToken}
                onChange={(e) => setThingsboardToken(e.target.value)}
                placeholder="Paste ThingsBoard JWT token here..."
                className="w-full bg-app-bg border border-app-border-highlight rounded-xl px-3.5 py-2.5 pl-10 text-app-text-primary placeholder-app-text-muted focus:outline-none focus:border-app-accent font-mono text-xs"
              />
              <Key className="w-4 h-4 text-app-text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>
            <span className="text-[11px] text-app-text-secondary mt-1 block">
              ThingsBoard requires its native JWT. (Authentik OIDC tokens are rejected with 401).
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-app-text-secondary mb-1.5">
              Authentik SSO / IdP Host URL
            </label>
            <div className="relative">
              <input
                type="text"
                value={authentikUrl}
                onChange={(e) => setAuthentikUrl(e.target.value)}
                placeholder="https://auth.humid1.com"
                className="w-full bg-app-bg border border-app-border-highlight rounded-xl px-3.5 py-2.5 pl-10 text-app-text-primary placeholder-app-text-muted focus:outline-none focus:border-app-accent font-mono text-xs"
              />
              <Server className="w-4 h-4 text-app-text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>
            <span className="text-[11px] text-app-text-muted mt-1 block">
              Authentik identity provider portal address (for SSO user authentication).
            </span>
          </div>

          {/* Active Token Status Card */}
          <div className="p-3.5 bg-app-bg/80 border border-app-border rounded-xl space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-app-accent" />
                <span className="text-xs font-bold text-app-text-primary">Session Token Status</span>
              </div>
              {normalizedActive ? (
                isTb ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-app-bg/80 text-app-status-nominal border border-app-status-nominal/30">
                    <ShieldCheck className="w-3.5 h-3.5 text-app-status-nominal" />
                    ThingsBoard JWT Active
                  </span>
                ) : isOidc ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-app-bg/80 text-app-accent border border-app-accent/30">
                    <ShieldAlert className="w-3.5 h-3.5 text-app-accent" />
                    Authentik OIDC (Causes 401 in TB)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-app-bg/80 text-app-status-info border border-app-status-info/30">
                    Custom JWT
                  </span>
                )
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-app-bg/80 text-app-status-critical border border-app-status-critical/30">
                  <AlertCircle className="w-3.5 h-3.5 text-app-status-critical" />
                  No Token Loaded
                </span>
              )}
            </div>

            {normalizedActive && (
              <div className="text-[11px] font-mono text-app-text-secondary truncate bg-app-surface px-2 py-1 rounded border border-app-border">
                {normalizedActive.substring(0, 24)}...{normalizedActive.substring(normalizedActive.length - 16)}
              </div>
            )}

            {/* Test Connection Button */}
            <div className="pt-2 flex items-center justify-between border-t border-app-surface">
              <button
                type="button"
                onClick={handleTestToken}
                disabled={isTesting || (!thingsboardToken.trim() && !activeToken)}
                className="px-3 py-1.5 rounded-lg bg-app-surface-elevated hover:bg-app-border-highlight text-app-text-primary text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isTesting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Testing...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 text-app-accent" />
                    <span>Test Token Connection</span>
                  </>
                )}
              </button>

              {onOpenDiagnostics && (
                <button
                  type="button"
                  onClick={() => onOpenDiagnostics('logs')}
                  className="text-xs text-app-text-secondary hover:text-app-text-primary flex items-center gap-1 cursor-pointer"
                >
                  <Terminal className="w-3.5 h-3.5 text-app-text-muted" />
                  <span>View Live Logs</span>
                </button>
              )}
            </div>

            {testResult && (
              <div
                className={`p-2.5 rounded-lg text-xs font-mono border ${
                  testResult.success
                    ? 'bg-app-bg/60 border-app-status-nominal/30 text-app-status-nominal'
                    : 'bg-app-bg/60 border-app-status-critical/30 text-app-status-critical'
                }`}
              >
                {testResult.success
                  ? `✅ HTTP ${testResult.status} OK — Valid ThingsBoard session!`
                  : `❌ HTTP ${testResult.status || 0} Error: ${testResult.error || 'Connection rejected'}`}
              </div>
            )}

            {currentUser && (
              <div className="pt-1 text-[11px] text-app-text-muted font-mono flex items-center justify-between border-t border-app-surface">
                <span>User: {currentUser.email}</span>
                <span>Role: {currentUser.authority || 'CUSTOMER_USER'}</span>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-app-border flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-app-text-secondary hover:text-app-text-primary bg-app-surface-elevated hover:bg-app-border-highlight transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-bold bg-app-accent hover:bg-app-accent-hover text-app-accent-text transition-all shadow-md shadow-app-bg/40 cursor-pointer"
            >
              Save Settings
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

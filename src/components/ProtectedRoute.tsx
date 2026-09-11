import React, { useState, useEffect } from 'react';
import { useAuth } from 'react-oidc-context';
import { thingsboard } from '../services/thingsboard';
import { getResolvedOidcParams } from '../services/oidcConfig';
import { getThingsBoardOAuth2Url } from '../config/env';
import { isAuthentikOidcToken } from '../utils/authTokens';
import { 
  ShieldCheck, 
  LogIn, 
  AlertCircle, 
  Key, 
  Settings, 
  Loader2, 
  ExternalLink, 
  Radio, 
  Eye,
  EyeOff,
  Terminal,
  Play,
  Info
} from 'lucide-react';
import { AuthModal } from './AuthModal';
import { ApiInspectorModal } from './ApiInspectorModal';
import { apiLogger } from '../services/apiLogger';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const auth = useAuth();
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showDirectLogin, setShowDirectLogin] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [diagnosticsTab, setDiagnosticsTab] = useState<'logs' | 'token'>('logs');
  const [txCount, setTxCount] = useState(0);
  const [, setTbAuthVersion] = useState(0);

  // Direct login form state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [directTokenInput, setDirectTokenInput] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [authChecking, setAuthChecking] = useState(true);

  const oidcParams = getResolvedOidcParams();

  // Safety timeout for OIDC initialization (max 1.5s) to avoid preview hang if auth server is unreachable
  useEffect(() => {
    const timer = setTimeout(() => {
      setAuthChecking(false);
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  // Track transaction count for live indicator
  useEffect(() => {
    const unsub = apiLogger.subscribe((txs) => {
      setTxCount((prev) => (prev === txs.length ? prev : txs.length));
    });
    return unsub;
  }, []);

  // Check on load if demo requested in URL params
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('demo') === 'true' || params.get('preview') === 'true') {
        thingsboard.enableDemoMode();
      }
    }
  }, []);

  // Subscribe to ThingsBoard auth changes to force re-render when token/profile updates
  useEffect(() => {
    const unsub = thingsboard.subscribeAuth(() => {
      setTbAuthVersion((v) => v + 1);
    });
    return unsub;
  }, []);

  const activeToken = thingsboard.getAuthToken();

  const openDiagnosticsModal = (tab: 'logs' | 'token' = 'logs') => {
    setDiagnosticsTab(tab);
    setShowDiagnostics(true);
  };

  const handleThingsBoardSsoLogin = () => {
    setLoginError(null);
    try {
      const targetUrl = getThingsBoardOAuth2Url();
      console.info('[ThingsBoard SSO] Initiating ThingsBoard OAuth2 redirect to:', targetUrl);
      window.location.href = targetUrl;
    } catch (err: any) {
      setLoginError(`ThingsBoard SSO Initiation failed: ${err?.message || 'Check configuration'}`);
    }
  };

  const handleAuthentikLogin = () => {
    setLoginError(null);
    try {
      auth.signinRedirect();
    } catch (err: any) {
      console.warn('Redirect failed, attempting popup:', err);
      auth.signinPopup().catch((popupErr) => {
        setLoginError(`SSO Initiation failed: ${popupErr?.message || err?.message || 'Check Authentik OIDC configuration'}`);
      });
    }
  };

  const handleCredentialsLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setLoginError('Please provide both username and password.');
      return;
    }

    setLoginLoading(true);
    setLoginError(null);

    const config = thingsboard.getConfig();
    const serverUrl = config.serverUrl || 'https://app.humid1.com';

    // Direct login probe with full logging
    const res = await apiLogger.testLoginDirect(serverUrl, username.trim(), password);
    setLoginLoading(false);

    if (res.success && res.data?.token) {
      await thingsboard.setAuthSession(res.data.token, undefined, res.data.refreshToken);
    } else {
      setLoginError(
        `Login failed (${res.status}): ${res.error || 'Invalid credentials. Please verify your ThingsBoard username and password.'}`
      );
    }
  };

  const handleDirectTokenSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = directTokenInput.trim();
    if (!clean) {
      setLoginError('Please enter a valid JWT token string.');
      return;
    }
    if (isAuthentikOidcToken(clean)) {
      setLoginError(
        '⚠️ Detected Authentik OIDC token (issued by auth.humid1.com). ThingsBoard API requires a native ThingsBoard JWT token.'
      );
      return;
    }
    thingsboard.setAuthSession(clean);
  };


  const isUserAuthenticated = Boolean(auth.isAuthenticated || activeToken || thingsboard.isDemoMode());

  const handleEnterDemo = () => {
    thingsboard.enableDemoMode();
    setTbAuthVersion((v) => v + 1);
  };

  // Show loading during initial OIDC session check (bounded by authChecking timeout)
  if (auth.isLoading && authChecking) {
    return (
      <div className="min-h-screen bg-app-bg flex flex-col items-center justify-center p-4 text-app-text-primary font-sans">
        <div className="flex flex-col items-center max-w-sm text-center space-y-4">
          <div className="relative">
            <div className="w-14 h-14 rounded-2xl bg-app-accent/10 border border-app-accent/30 flex items-center justify-center shadow-lg shadow-amber-500/10">
              <Radio className="w-7 h-7 text-app-accent animate-pulse" />
            </div>
            <Loader2 className="w-5 h-5 text-app-accent animate-spin absolute -top-1 -right-1" />
          </div>
          <h2 className="text-lg font-bold text-app-text-primary tracking-wide">
            HUMID1<span className="text-app-accent">_OS</span>
          </h2>
          <p className="text-xs text-app-text-secondary font-mono">
            Verifying Authentik SSO & ThingsBoard credentials...
          </p>
        </div>
      </div>
    );
  }

  // If authenticated, render children
  if (isUserAuthenticated) {
    return <>{children}</>;
  }

  // Otherwise, render the polished authentication gate
  return (
    <div className="min-h-screen bg-app-bg flex flex-col items-center justify-center p-4 selection:bg-app-accent/30 selection:text-app-accent relative">
      {/* Top Floating Diagnostics Bar */}
      <div className="absolute top-4 right-4 flex items-center gap-2 z-20">
        <button
          onClick={() => openDiagnosticsModal('logs')}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-app-surface/90 hover:bg-app-surface-elevated border border-app-border-highlight text-app-text-secondary hover:text-app-text-primary text-xs font-mono transition shadow-lg cursor-pointer"
          title="Open API Inspector & Diagnostics"
        >
          <Terminal className="w-4 h-4 text-app-accent" />
          <span className="hidden sm:inline">Diagnostics & Logs</span>
          <span className="px-1.5 py-0.2 rounded bg-app-surface-elevated text-[10px] text-app-accent border border-app-border-highlight">
            {txCount}
          </span>
        </button>

        <button
          onClick={() => setShowConfigModal(true)}
          className="p-2 rounded-xl text-app-text-secondary hover:text-app-text-primary hover:bg-app-surface-elevated border border-app-border bg-app-surface transition-colors cursor-pointer"
          title="Configure Server & Auth URLs"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      <div className="w-full max-w-md bg-app-surface border border-app-border rounded-3xl p-7 shadow-2xl relative">
        {/* Top Header & Logo */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-app-accent/20 border border-app-accent/30 flex items-center justify-center text-app-accent shadow-md">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-extrabold tracking-tight text-app-text-primary flex items-center gap-1.5">
                HUMID1<span className="text-app-accent">_OS</span>
              </h1>
              <p className="text-[11px] font-mono text-app-text-secondary">
                Precision Humidor Telemetry Stack
              </p>
            </div>
          </div>
        </div>

        {/* Primary Alert / Error Feedback */}
        {auth.error && (
          <div className="mb-5 p-3.5 rounded-2xl bg-app-bg/70 border border-app-status-critical/30 text-app-status-critical text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-app-status-critical shrink-0 mt-0.5" />
            <div className="flex-1 space-y-1">
              <div className="font-bold text-app-status-critical">Authentik OIDC Error:</div>
              <div className="font-mono text-[11px] leading-relaxed text-app-status-critical/90">{auth.error.message}</div>
            </div>
          </div>
        )}

        {loginError && (
          <div className="mb-5 p-3.5 rounded-2xl bg-app-bg/70 border border-app-status-critical/30 text-app-status-critical text-xs flex flex-col gap-2">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-app-status-critical shrink-0 mt-0.5" />
              <div className="flex-1 font-mono text-[11px] leading-relaxed text-app-status-critical/90">{loginError}</div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-1 border-t border-app-status-critical/30">
              <button
                type="button"
                onClick={() => openDiagnosticsModal('logs')}
                className="text-[11px] text-app-accent hover:opacity-80 underline font-mono flex items-center gap-1 cursor-pointer"
              >
                <Terminal className="w-3 h-3" /> View Request Log
              </button>
            </div>
          </div>
        )}

        {/* Primary Action: ThingsBoard SSO via OAuth2 */}
        <div className="space-y-3 mb-6">
          <button
            onClick={handleThingsBoardSsoLogin}
            className="w-full py-3 px-4 rounded-xl bg-app-accent hover:bg-app-accent-hover text-app-accent-text font-bold text-sm shadow-lg shadow-app-bg/40 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2.5 cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Sign In with ThingsBoard SSO (Authentik)</span>
          </button>

          <button
            type="button"
            onClick={handleEnterDemo}
            className="w-full py-2.5 px-4 rounded-xl bg-app-surface-elevated hover:bg-app-border-highlight border border-app-border-highlight hover:border-app-accent/40 text-app-accent font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Explore Live Dashboard (Sandbox / Demo Mode)</span>
          </button>

          <div className="flex items-center justify-between px-1 text-[11px] text-app-text-secondary font-mono">
            <button
              type="button"
              onClick={() => {
                try {
                  localStorage.removeItem('humid1_dev_warning_dismissed');
                  window.location.reload();
                } catch {}
              }}
              className="text-app-text-muted hover:text-app-accent flex items-center gap-1 cursor-pointer transition-colors"
              title="Reset & show pre-release active development warning notice"
            >
              <Info className="w-3 h-3" /> Dev Info Notice
            </button>
            <button
              type="button"
              onClick={handleAuthentikLogin}
              className="text-app-accent hover:underline flex items-center gap-1 cursor-pointer"
              title="Direct Authentik OIDC flow"
            >
              Direct Authentik OIDC <ExternalLink className="w-3 h-3" />
            </button>
          </div>

          {/* OIDC Config Summary Pill */}
          <div className="p-3 rounded-xl bg-app-bg/70 border border-app-border text-[11px] space-y-1 text-app-text-secondary font-mono">
            <div className="flex justify-between">
              <span className="text-app-text-muted">SSO Provider:</span>
              <span className="text-app-text-secondary font-semibold">{oidcParams.authentikUrl}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-app-text-muted">ThingsBoard Gateway:</span>
              <span className="text-app-accent font-semibold">app.humid1.com/oauth2</span>
            </div>
            <div className="flex justify-between">
              <span className="text-app-text-muted">Authentik App:</span>
              <span className="text-app-text-secondary font-semibold truncate max-w-[200px]" title={oidcParams.appSlug}>
                {oidcParams.appSlug}
              </span>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="relative flex py-2 items-center mb-5">
          <div className="flex-grow border-t border-app-border"></div>
          <span className="flex-shrink mx-3 text-app-text-muted text-[10px] uppercase font-mono tracking-wider">
            Or Alternate Access
          </span>
          <div className="flex-grow border-t border-app-border"></div>
        </div>

        {/* Direct Thingsboard / Token Dropdown */}
        <div>
          <button
            onClick={() => setShowDirectLogin(!showDirectLogin)}
            className="w-full text-center text-xs text-app-text-secondary hover:text-app-accent font-medium py-1.5 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Key className="w-3.5 h-3.5" />
            <span>{showDirectLogin ? 'Hide Credentials & Token Login' : 'Direct ThingsBoard Login / Token Override'}</span>
          </button>

          {showDirectLogin && (
            <div className="mt-4 p-4 rounded-2xl bg-app-bg/80 border border-app-border space-y-4 animate-fadeIn">
              {/* Username/Password Form */}
              <form onSubmit={handleCredentialsLogin} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-app-text-secondary mb-1">
                    Username / Customer Email
                  </label>
                  <input
                    type="text"
                    placeholder="customer@example.com"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-app-surface border border-app-border-highlight rounded-xl px-3 py-2 text-xs text-app-text-primary placeholder-app-text-muted focus:outline-none focus:border-app-accent font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-app-text-secondary mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-app-surface border border-app-border-highlight rounded-xl px-3 py-2 pr-9 text-xs text-app-text-primary placeholder-app-text-muted focus:outline-none focus:border-app-accent font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-app-text-secondary hover:text-app-text-primary cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loginLoading}
                  className="w-full py-2 px-3 rounded-xl bg-app-surface-elevated hover:bg-app-border-highlight text-app-text-primary hover:text-app-text-primary text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {loginLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Authenticating...</span>
                    </>
                  ) : (
                    <>
                      <LogIn className="w-3.5 h-3.5" />
                      <span>Log In via ThingsBoard REST</span>
                    </>
                  )}
                </button>
              </form>

              {/* Or Token Input */}
              <div className="pt-3 border-t border-app-border space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-app-text-secondary">
                    Paste Raw ThingsBoard JWT
                  </label>
                </div>
                <form onSubmit={handleDirectTokenSubmit} className="flex gap-2">
                  <input
                    type="password"
                    placeholder="eyJhbGciOi..."
                    value={directTokenInput}
                    onChange={(e) => setDirectTokenInput(e.target.value)}
                    className="flex-1 bg-app-surface border border-app-border-highlight rounded-xl px-3 py-1.5 text-xs text-app-text-primary font-mono placeholder-app-text-muted focus:outline-none focus:border-app-accent"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded-xl bg-app-accent-hover hover:bg-app-accent text-app-accent-text text-xs font-bold cursor-pointer"
                  >
                    Apply
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>

      <AuthModal
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
      />

      <ApiInspectorModal
        isOpen={showDiagnostics}
        onClose={() => setShowDiagnostics(false)}
        initialTab={diagnosticsTab}
      />
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { thingsboard, DEFAULT_THINGSBOARD_URL, DEFAULT_AUTHENTIK_URL, DEFAULT_APP_SLUG, DEFAULT_CLIENT_ID } from '../services/thingsboard';
import { 
  X, 
  Settings, 
  ShieldCheck, 
  Server, 
  Check, 
  RotateCcw,
  Eye,
  EyeOff
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const [tbUrl, setTbUrl] = useState('');
  const [token, setToken] = useState('');
  const [authentikUrl, setAuthentikUrl] = useState('');
  const [authentikClientId, setAuthentikClientId] = useState('');
  const [authentikAppSlug, setAuthentikAppSlug] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const config = thingsboard.getConfig();
      setTbUrl(config.serverUrl || DEFAULT_THINGSBOARD_URL);
      setToken(config.thingsboardToken || '');
      setAuthentikUrl(config.authentikUrl || DEFAULT_AUTHENTIK_URL);
      setAuthentikClientId(config.authentikClientId || DEFAULT_CLIENT_ID);
      setAuthentikAppSlug(config.authentikAppSlug || DEFAULT_APP_SLUG);
      setSavedSuccess(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    thingsboard.saveConfig({
      serverUrl: tbUrl.trim(),
      thingsboardToken: token.trim(),
      authentikUrl: authentikUrl.trim(),
      authentikClientId: authentikClientId.trim(),
      authentikAppSlug: authentikAppSlug.trim(),
    });

    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
      // Reload page if needed to reinitialize oidc context with new endpoints
      window.location.reload();
    }, 600);
  };

  const handleResetDefaults = () => {
    setTbUrl(DEFAULT_THINGSBOARD_URL);
    setAuthentikUrl(DEFAULT_AUTHENTIK_URL);
    setAuthentikAppSlug(DEFAULT_APP_SLUG);
    setAuthentikClientId(DEFAULT_CLIENT_ID);
    setToken('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-app-bg/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-app-surface border border-app-border rounded-3xl w-full max-w-lg p-6 shadow-2xl shadow-black/80 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-app-text-secondary hover:text-app-text-primary p-1 rounded-lg hover:bg-app-surface-elevated transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 rounded-xl bg-app-accent/10 text-app-accent border border-app-accent/20">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Platform & SSO Configuration</h3>
            <p className="text-xs text-app-text-secondary">Manage Authentik OIDC Provider and ThingsBoard endpoints</p>
          </div>
        </div>

        {savedSuccess && (
          <div className="mb-4 p-3 rounded-xl bg-app-bg/70 border border-app-status-nominal/30 text-emerald-300 text-xs flex items-center gap-2">
            <Check className="w-4 h-4 text-app-status-nominal" />
            <span>Settings saved successfully. Refreshing session...</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          {/* Authentik OIDC Section */}
          <div className="p-4 rounded-2xl bg-app-bg/60 border border-app-border space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-app-accent uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4" />
                <span>Authentik SSO Settings</span>
              </div>
              <span className="text-[10px] font-mono text-app-text-primary0">OIDC PKCE</span>
            </div>

            <div>
              <label className="block text-[11px] font-mono uppercase text-app-text-secondary mb-1">
                Authentik Base URL
              </label>
              <input
                type="text"
                placeholder="https://auth.humid1.com"
                value={authentikUrl}
                onChange={(e) => setAuthentikUrl(e.target.value)}
                className="w-full bg-app-surface border border-app-border-highlight rounded-xl px-3 py-2 text-xs text-app-text-primary font-mono focus:outline-none focus:border-app-accent"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-mono uppercase text-app-text-secondary mb-1">
                  App Slug
                </label>
                <input
                  type="text"
                  placeholder="humid1-dash"
                  value={authentikAppSlug}
                  onChange={(e) => setAuthentikAppSlug(e.target.value)}
                  className="w-full bg-app-surface border border-app-border-highlight rounded-xl px-3 py-2 text-xs text-app-text-primary font-mono focus:outline-none focus:border-app-accent"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase text-app-text-secondary mb-1">
                  Client ID
                </label>
                <input
                  type="text"
                  placeholder="7nvidWHfM8C3wE3VKGqFNGFNnl9aou46mL5kporI"
                  value={authentikClientId}
                  onChange={(e) => setAuthentikClientId(e.target.value)}
                  className="w-full bg-app-surface border border-app-border-highlight rounded-xl px-3 py-2 text-xs text-app-text-primary font-mono focus:outline-none focus:border-app-accent"
                />
              </div>
            </div>
          </div>

          {/* ThingsBoard Section */}
          <div className="p-4 rounded-2xl bg-app-bg/60 border border-app-border space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-app-accent uppercase tracking-wider">
              <Server className="w-4 h-4" />
              <span>ThingsBoard IoT Server</span>
            </div>

            <div>
              <label className="block text-[11px] font-mono uppercase text-app-text-secondary mb-1">
                Server URL
              </label>
              <input
                type="text"
                placeholder="https://app.humid1.com"
                value={tbUrl}
                onChange={(e) => setTbUrl(e.target.value)}
                className="w-full bg-app-surface border border-app-border-highlight rounded-xl px-3 py-2 text-xs text-app-text-primary font-mono focus:outline-none focus:border-app-accent"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono uppercase text-app-text-secondary mb-1">
                Optional Static API / JWT Token
              </label>
              <div className="relative">
                <input
                  type={showToken ? 'text' : 'password'}
                  placeholder="Bearer JWT or leave blank for OIDC auto-session"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="w-full bg-app-surface border border-app-border-highlight rounded-xl px-3 py-2 pr-9 text-xs text-app-text-primary font-mono focus:outline-none focus:border-app-accent"
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-app-text-secondary hover:text-app-text-primary"
                >
                  {showToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-2 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleResetDefaults}
              className="px-3 py-2 rounded-xl text-xs font-semibold text-app-text-secondary hover:text-app-text-primary bg-app-surface-elevated/80 hover:bg-app-surface-elevated transition-colors flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Defaults</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-app-text-secondary hover:text-app-text-primary bg-app-surface-elevated hover:bg-app-border-highlight transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl text-xs font-bold bg-app-accent hover:bg-amber-400 text-app-accent-text transition-all shadow-md shadow-app-bg/40"
              >
                Save & Apply
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

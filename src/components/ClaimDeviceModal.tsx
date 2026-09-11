import React, { useState } from 'react';
import { thingsboard } from '../services/thingsboard';
import { X, Plus, Radio, Check, AlertCircle, Loader2 } from 'lucide-react';

interface ClaimDeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeviceClaimed: (deviceId: string) => void;
}

export const ClaimDeviceModal: React.FC<ClaimDeviceModalProps> = ({
  isOpen,
  onClose,
  onDeviceClaimed,
}) => {
  const [deviceName, setDeviceName] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deviceName.trim() || !secretKey.trim()) {
      setError('Please provide both Device Name / ID and Claiming Secret Key.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const device = await thingsboard.claimDevice(deviceName.trim(), secretKey.trim());
      setSuccess(true);
      if (device && device.id) {
        onDeviceClaimed(device.id);
      }
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1000);
    } catch (err: any) {
      setError(err?.message || 'Failed to claim device. Verify device name and secret.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-app-bg/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-app-surface border border-app-border rounded-3xl w-full max-w-md p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-app-text-secondary hover:text-app-text-primary p-1 rounded-lg hover:bg-app-surface-elevated transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 rounded-xl bg-app-accent/10 text-app-accent border border-app-accent/20">
            <Radio className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-app-text-primary">Claim Physical Device</h3>
            <p className="text-xs text-app-text-secondary">Pair ESP32 humidor hardware to your ThingsBoard account</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-app-bg/70 border border-app-status-critical/30 text-app-status-critical text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-app-status-critical shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 rounded-xl bg-app-bg/70 border border-app-status-nominal/30 text-app-status-nominal text-xs flex items-center gap-2">
            <Check className="w-4 h-4 text-app-status-nominal shrink-0" />
            <span>Device claimed and provisioned successfully!</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-mono uppercase text-app-text-secondary mb-1">
              Device Name / ID (e.g. Humidor-01)
            </label>
            <input
              type="text"
              placeholder="Humidor-01"
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
              className="w-full bg-app-bg border border-app-border-highlight rounded-xl px-3 py-2 text-xs text-app-text-primary font-mono focus:outline-none focus:border-app-accent"
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono uppercase text-app-text-secondary mb-1">
              Claiming Secret Key
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={secretKey}
              onChange={(e) => setSecretKey(e.target.value)}
              className="w-full bg-app-bg border border-app-border-highlight rounded-xl px-3 py-2 text-xs text-app-text-primary font-mono focus:outline-none focus:border-app-accent"
            />
            <span className="text-[10px] text-app-text-muted mt-1 block">
              Found printed on the ESP32 enclosure QR label or packaging insert.
            </span>
          </div>

          <div className="pt-3 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-app-text-secondary hover:text-app-text-primary bg-app-surface-elevated hover:bg-app-border-highlight transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-app-accent hover:bg-app-accent-hover text-app-accent-text transition-all shadow-md shadow-app-bg/40 flex items-center gap-1.5 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Claiming...</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  <span>Claim Unit</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

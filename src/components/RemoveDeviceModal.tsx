import React, { useState } from 'react';
import { thingsboard } from '../services/thingsboard';
import { HumidorDevice } from '../types';
import {
  Trash2,
  X,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  RotateCcw,
  ShieldAlert,
  Info,
} from 'lucide-react';

interface RemoveDeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
  device: HumidorDevice | null;
  onDeviceRemoved: (deviceId: string) => void;
}

type RemovalAction = 'unclaim' | 'delete';

export const RemoveDeviceModal: React.FC<RemoveDeviceModalProps> = ({
  isOpen,
  onClose,
  device,
  onDeviceRemoved,
}) => {
  const [actionType, setActionType] = useState<RemovalAction>('unclaim');
  const [confirmText, setConfirmText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen || !device) return null;

  const currentUser = thingsboard.getCurrentUser();
  const isCustomerUser = currentUser?.authority === 'CUSTOMER_USER';

  const deviceName = device.clientAttributes?.device_name || device.name;
  const isDeleteConfirmed = actionType === 'unclaim' || confirmText.trim().toUpperCase() === 'DELETE';

  const handleExecuteRemoval = async () => {
    if (!isDeleteConfirmed) return;

    setIsProcessing(true);
    setError(null);
    setSuccessMessage(null);

    try {
      if (actionType === 'unclaim' || isCustomerUser) {
        await thingsboard.unclaimDevice(deviceName, device.id);
        setSuccessMessage(`Device "${deviceName}" has been successfully released/unclaimed.`);
      } else {
        await thingsboard.deleteDevice(device.id, deviceName);
        setSuccessMessage(`Device "${deviceName}" has been permanently removed.`);
      }

      onDeviceRemoved(device.id);

      setTimeout(() => {
        setIsProcessing(false);
        setSuccessMessage(null);
        setConfirmText('');
        onClose();
      }, 1200);
    } catch (err: any) {
      setIsProcessing(false);
      setError(err?.message || 'Failed to remove device. Please check your account permissions.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-app-bg/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-app-surface border border-app-border rounded-2xl w-full max-w-lg p-5 sm:p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isProcessing}
          className="absolute top-4 right-4 p-2 text-app-text-secondary hover:text-app-text-primary rounded-lg hover:bg-app-surface-elevated transition disabled:opacity-40"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="p-3 rounded-xl bg-app-status-critical/10 border border-app-status-critical/20 text-app-status-critical shrink-0">
            <Trash2 className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-app-text-primary tracking-tight">Remove Humidor Device</h2>
            <p className="text-xs text-app-text-secondary">
              Unclaim from customer account or permanently delete device entity
            </p>
          </div>
        </div>

        {/* Target Device Summary */}
        <div className="p-3.5 bg-app-surface-elevated/60 border border-app-border-highlight/60 rounded-xl mb-4 text-xs text-app-text-secondary space-y-1.5">
          <div className="flex justify-between items-center">
            <span className="text-app-text-secondary font-medium">Device Name:</span>
            <span className="font-bold text-app-text-primary font-mono">{deviceName}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-app-text-secondary font-medium">Device ID:</span>
            <span className="font-mono text-app-text-secondary text-[11px] truncate max-w-[220px]">
              {device.id}
            </span>
          </div>
          {device.clientAttributes?.mac_address && (
            <div className="flex justify-between items-center">
              <span className="text-app-text-secondary font-medium">MAC Address:</span>
              <span className="font-mono text-app-text-secondary text-[11px]">
                {device.clientAttributes.mac_address}
              </span>
            </div>
          )}
          <div className="flex justify-between items-center">
            <span className="text-app-text-secondary font-medium">Account Role:</span>
            <span className="font-mono text-[11px] font-bold text-app-accent">
              {currentUser?.authority || 'CUSTOMER_USER'}
            </span>
          </div>
        </div>

        {/* Removal Action Selection Tabs */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <button
            type="button"
            onClick={() => setActionType('unclaim')}
            className={`p-3 rounded-xl border text-left transition flex flex-col gap-1 cursor-pointer ${
              actionType === 'unclaim'
                ? 'bg-app-accent/15 border-app-accent/50 text-app-accent shadow-sm'
                : 'bg-app-surface-elevated/40 border-app-border-highlight/60 text-app-text-secondary hover:bg-app-surface-elevated'
            }`}
          >
            <div className="flex items-center gap-1.5 font-semibold text-xs text-app-text-primary">
              <RotateCcw className="w-3.5 h-3.5 text-app-accent" />
              <span>Unclaim Device</span>
            </div>
            <span className="text-[11px] text-app-text-secondary leading-snug">
              Standard for Customer accounts. Safe to re-claim later.
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActionType('delete')}
            className={`p-3 rounded-xl border text-left transition flex flex-col gap-1 cursor-pointer ${
              actionType === 'delete'
                ? 'bg-app-status-critical/15 border-app-status-critical/50 text-app-status-critical shadow-sm'
                : 'bg-app-surface-elevated/40 border-app-border-highlight/60 text-app-text-secondary hover:bg-app-surface-elevated'
            }`}
          >
            <div className="flex items-center gap-1.5 font-semibold text-xs text-app-text-primary">
              <ShieldAlert className="w-3.5 h-3.5 text-app-status-critical" />
              <span>Delete Permanently</span>
            </div>
            <span className="text-[11px] text-app-text-secondary leading-snug">
              Tenant Admin privilege required to delete entity from DB.
            </span>
          </button>
        </div>

        {/* Action Explanation Notice */}
        {actionType === 'unclaim' ? (
          <div className="p-3 bg-app-accent/10 border border-app-accent/20 rounded-xl mb-4 text-xs text-app-accent/90 leading-relaxed flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-app-accent shrink-0 mt-0.5" />
            <div>
              <strong>Unclaiming is non-destructive:</strong> Detaches{' '}
              <span className="font-mono text-app-text-primary font-bold">{deviceName}</span> from your customer dashboard.
              You or another user can reclaim it anytime using the device claim key.
            </div>
          </div>
        ) : isCustomerUser ? (
          <div className="p-3 bg-app-status-info/10 border border-app-status-info/30 rounded-xl mb-4 text-xs text-app-text-secondary leading-relaxed flex items-start gap-2.5">
            <Info className="w-4 h-4 text-app-status-info shrink-0 mt-0.5" />
            <div>
              <strong>Tenant Admin Privileges Required:</strong> ThingsBoard customer accounts
              cannot permanently delete device entities from the tenant database. Proceeding will perform
              an <strong>Unclaim & Release</strong> operation instead to safely remove it from your dashboard.
            </div>
          </div>
        ) : (
          <div className="space-y-3 mb-4">
            <div className="p-3 bg-app-status-critical/10 border border-app-status-critical/30 rounded-xl text-xs text-app-status-critical leading-relaxed flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 text-app-status-critical shrink-0 mt-0.5" />
              <div>
                <strong>Tenant Entity Deletion:</strong> Deleting permanently purges the device entity
                and all recorded timeseries history from ThingsBoard.
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-app-text-secondary mb-1.5">
                Type <span className="font-mono text-app-status-critical font-bold">DELETE</span> to confirm:
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="DELETE"
                className="w-full bg-app-bg border border-app-border-highlight rounded-lg px-3 py-2 text-sm text-app-text-primary font-mono focus:outline-none focus:border-app-status-critical transition"
              />
            </div>
          </div>
        )}

        {/* Error / Success Feedback */}
        {error && (
          <div className="mb-4 p-3 bg-app-status-critical/10 border border-app-status-critical/30 rounded-xl text-xs text-app-status-critical flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-app-status-critical shrink-0 mt-0.5" />
            <div>{error}</div>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-3 bg-app-status-nominal/10 border border-app-status-nominal/30 rounded-xl text-xs text-app-status-nominal flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-app-status-nominal shrink-0" />
            <div>{successMessage}</div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="px-4 py-2 text-xs font-medium text-app-text-secondary hover:text-app-text-primary bg-app-surface-elevated hover:bg-app-border-highlight rounded-lg transition disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleExecuteRemoval}
            disabled={isProcessing || (!isDeleteConfirmed && !isCustomerUser)}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition shadow-lg cursor-pointer ${
              actionType === 'delete' && !isCustomerUser
                ? 'bg-app-status-critical hover:bg-app-status-critical/80 text-white shadow-md disabled:opacity-40'
                : 'bg-app-accent hover:bg-app-accent-hover text-app-accent-text shadow-md disabled:opacity-40'
            }`}
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Processing...</span>
              </>
            ) : actionType === 'delete' && !isCustomerUser ? (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Device Entity</span>
              </>
            ) : (
              <>
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Unclaim & Release Device</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

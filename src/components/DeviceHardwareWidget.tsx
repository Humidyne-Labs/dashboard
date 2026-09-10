import React from 'react';
import { HumidorDevice } from '../types';
import { 
  HardDrive, 
  Wifi, 
  Layers, 
  Info
} from 'lucide-react';

interface DeviceHardwareWidgetProps {
  device: HumidorDevice;
  className?: string;
}

export const DeviceHardwareWidget: React.FC<DeviceHardwareWidgetProps> = ({ 
  device,
  className = '' 
}) => {
  return (
    <section 
      aria-label="Device Hardware Specifications"
      className={`grid grid-cols-2 sm:grid-cols-4 gap-3 ${className}`}
    >
      {/* 1. Device Identifier */}
      <div className="bg-slate-900/80 border border-slate-800/90 p-3.5 rounded-xl shadow-md backdrop-blur-xs flex flex-col justify-between hover:border-slate-700/80 transition">
        <div className="flex items-center gap-1.5 text-slate-400 mb-1.5">
          <Info className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Device ID</span>
        </div>
        <div>
          <span className="font-mono text-slate-100 font-bold truncate block text-xs sm:text-sm" title={device.name}>
            {device.clientAttributes.device_name || device.name}
          </span>
          <span className="text-[10px] font-mono text-slate-500 truncate block mt-0.5">
            {device.id.slice(0, 16)}...
          </span>
        </div>
      </div>

      {/* 2. Hardware MAC & Local IP */}
      <div className="bg-slate-900/80 border border-slate-800/90 p-3.5 rounded-xl shadow-md backdrop-blur-xs flex flex-col justify-between hover:border-slate-700/80 transition">
        <div className="flex items-center gap-1.5 text-slate-400 mb-1.5">
          <Wifi className="w-3.5 h-3.5 text-sky-400" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Network MAC</span>
        </div>
        <div>
          <span className="font-mono text-slate-200 text-xs sm:text-sm truncate block font-medium">
            {device.clientAttributes.mac_address || 'ESP32-MAC'}
          </span>
          <span className="text-[10px] font-mono text-sky-400/90 truncate block mt-0.5">
            IP: {device.clientAttributes.ip_address || '192.168.1.x'}
          </span>
        </div>
      </div>

      {/* 3. MicroSD Peripheral Storage */}
      <div className="bg-slate-900/80 border border-slate-800/90 p-3.5 rounded-xl shadow-md backdrop-blur-xs flex flex-col justify-between hover:border-slate-700/80 transition">
        <div className="flex items-center gap-1.5 text-slate-400 mb-1.5">
          <HardDrive className="w-3.5 h-3.5 text-indigo-400" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">MicroSD Storage</span>
        </div>
        <div>
          <span className={`font-semibold text-xs sm:text-sm block ${
            device.clientAttributes.has_sd_card ? 'text-emerald-300' : 'text-amber-300'
          }`}>
            {device.clientAttributes.has_sd_card ? 'Storage Mounted' : 'Not Detected'}
          </span>
          <span className="text-[10px] font-mono text-slate-500 truncate block mt-0.5">
            {device.clientAttributes.has_sd_card ? 'Active' : 'Offline / Missing'}
          </span>
        </div>
      </div>

      {/* 4. Active Firmware Version */}
      <div className="bg-slate-900/80 border border-slate-800/90 p-3.5 rounded-xl shadow-md backdrop-blur-xs flex flex-col justify-between hover:border-slate-700/80 transition">
        <div className="flex items-center gap-1.5 text-slate-400 mb-1.5">
          <Layers className="w-3.5 h-3.5 text-purple-400" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Firmware</span>
        </div>
        <div>
          <span className="font-mono text-amber-300 font-bold text-xs sm:text-sm block">
            {device.clientAttributes.fw_version || 'v1.0.4'}
          </span>
          <span className="text-[10px] font-mono text-slate-500 truncate block mt-0.5">
            ota_0 Partition
          </span>
        </div>
      </div>
    </section>
  );
};

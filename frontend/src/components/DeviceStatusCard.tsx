import React from 'react';
import { Cpu, Zap } from 'lucide-react';
import { DoorStatus } from '../types';

interface DeviceStatusCardProps {
  status: DoorStatus | null;
}

export const DeviceStatusCard: React.FC<DeviceStatusCardProps> = ({ status }) => {
  const formatTimestamp = (isoString?: string | null) => {
    if (!isoString) return 'No sync recorded';
    try {
      const d = new Date(isoString);
      const diffSecs = Math.max(0, Math.round((Date.now() - d.getTime()) / 1000));
      return `${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })} (${diffSecs}s ago)`;
    } catch {
      return isoString;
    }
  };

  return (
    <div className="bg-white/90 backdrop-blur-md border border-slate-200/90 rounded-3xl p-4 sm:p-6 shadow-sm hover:shadow-md transition-all">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 sm:pb-4 border-b border-slate-100 gap-2.5 sm:gap-3">
        <div className="flex items-center space-x-2.5 sm:space-x-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shadow-inner flex-shrink-0">
            <Cpu className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.2]" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5 flex-wrap">
              <span>Hardware & Node Telemetry</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                ESP32 IoT Node
              </span>
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-400 font-medium">Real-time microcontroller connection & diagnostic feed</p>
          </div>
        </div>

        {status && (
          <div className="flex items-center self-start sm:self-auto">
            <span
              className={`inline-flex items-center space-x-1.5 px-2.5 sm:px-3 py-1 rounded-full text-[11px] sm:text-xs font-bold border transition-colors ${
                status.is_online
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border-rose-200'
              }`}
            >
              <span className="relative flex h-2 w-2">
                {status.is_online && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                )}
                <span
                  className={`relative inline-flex rounded-full h-2 w-2 ${
                    status.is_online ? 'bg-emerald-500' : 'bg-rose-500'
                  }`}
                ></span>
              </span>
              <span>{status.is_online ? 'NODE ONLINE' : 'NODE DISCONNECTED'}</span>
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3 mt-4 sm:mt-5">
        <div className="bg-slate-50/80 border border-slate-100 rounded-2xl p-3 sm:p-3.5">
          <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Device ID
          </span>
          <span className="font-mono text-xs font-bold text-slate-800 break-all">
            {status?.device_id || 'esp32_main_gate'}
          </span>
        </div>

        <div className="bg-slate-50/80 border border-slate-100 rounded-2xl p-3 sm:p-3.5">
          <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Operating Mode
          </span>
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
            {status?.operating_mode || 'ESP32'}
          </span>
        </div>

        <div className="bg-slate-50/80 border border-slate-100 rounded-2xl p-3 sm:p-3.5">
          <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Sensor Interface
          </span>
          <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
            <Zap className="w-3.5 h-3.5 text-emerald-500" />
            <span>GPIO 4 (Reed)</span>
          </span>
        </div>

        <div className="bg-slate-50/80 border border-slate-100 rounded-2xl p-3 sm:p-3.5">
          <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Last Sensor Event
          </span>
          <span className="text-xs font-semibold text-slate-700 font-mono block truncate">
            {formatTimestamp(status?.last_event_at)}
          </span>
        </div>

        <div className="bg-slate-50/80 border border-slate-100 rounded-2xl p-3 sm:p-3.5">
          <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Heartbeat Sync
          </span>
          <span className="text-xs font-semibold text-slate-700 font-mono block truncate">
            {formatTimestamp(status?.last_seen_at)}
          </span>
        </div>

        <div className="bg-slate-50/80 border border-slate-100 rounded-2xl p-3 sm:p-3.5">
          <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Watchdog Timeout
          </span>
          <span className="text-xs font-bold text-slate-700 font-mono">
            {status?.heartbeat_timeout_seconds || 30}s
          </span>
        </div>
      </div>
    </div>
  );
};

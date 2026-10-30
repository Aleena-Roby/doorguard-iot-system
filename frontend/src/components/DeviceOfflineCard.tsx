import React, { useState } from 'react';
import { WifiOff, RefreshCw, Cpu, Zap, HelpCircle, History, ChevronDown, ChevronUp } from 'lucide-react';
import { DoorStatus, DoorEvent } from '../types';
import { EventHistoryTable } from './EventHistoryTable';

interface DeviceOfflineCardProps {
  status: DoorStatus | null;
  onRefresh: () => void;
  events?: DoorEvent[];
  totalEvents?: number;
  eventPage?: number;
  eventLimit?: number;
  isEventsLoading?: boolean;
  onPageChange?: (page: number) => void;
  selectedSource?: string;
  onSourceChange?: (src: string) => void;
}

export const DeviceOfflineCard: React.FC<DeviceOfflineCardProps> = ({
  status,
  onRefresh,
  events = [],
  totalEvents = 0,
  eventPage = 1,
  eventLimit = 10,
  isEventsLoading = false,
  onPageChange = () => {},
  selectedSource = '',
  onSourceChange = () => {},
}) => {
  const [isChecking, setIsChecking] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const handleCheckNow = async () => {
    setIsChecking(true);
    await onRefresh();
    setTimeout(() => setIsChecking(false), 800);
  };

  const formatLastSeen = (isoString?: string | null) => {
    if (!isoString) return 'No previous connection recorded';
    try {
      const d = new Date(isoString);
      const diffSecs = Math.max(0, Math.round((Date.now() - d.getTime()) / 1000));
      if (diffSecs < 60) return `${diffSecs}s ago (${d.toLocaleTimeString()})`;
      const diffMins = Math.floor(diffSecs / 60);
      return `${diffMins}m ${diffSecs % 60}s ago (${d.toLocaleTimeString()})`;
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Main Offline Hero Card */}
      <div className="bg-white/95 backdrop-blur-md border-2 border-rose-200/90 rounded-3xl p-6 sm:p-10 shadow-lg shadow-rose-500/5 text-center relative overflow-hidden">
        {/* Ambient Top Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-2 bg-gradient-to-r from-transparent via-rose-500 to-transparent opacity-80" />

        {/* Pulsing Disconnected Icon */}
        <div className="mx-auto w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-rose-50 border-2 border-rose-200/80 flex items-center justify-center text-rose-500 mb-5 sm:mb-6 shadow-inner relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-3xl bg-rose-400 opacity-20" />
          <WifiOff className="w-8 h-8 sm:w-10 sm:h-10 stroke-[2.2] relative z-10" />
        </div>

        {/* Headings */}
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-rose-100/80 text-rose-800 text-xs font-extrabold uppercase tracking-wider mb-3">
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
          <span>Device Not Connected</span>
        </div>

        <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
          {status?.device_name || 'Main Gate'} Sensor Offline
        </h2>

        <p className="text-xs sm:text-sm text-slate-500 max-w-lg mx-auto mt-2 leading-relaxed">
          The physical ESP32 microcontroller is currently not detected. Live door state, siren controls, and real-time alerts are paused until the board connects.
        </p>

        {/* Quick Diagnostics Badges */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 max-w-xl mx-auto mt-6 text-left">
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
              Node ID
            </span>
            <span className="font-mono text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-indigo-500" />
              <span>{status?.device_id || 'esp32_main_gate'}</span>
            </span>
          </div>

          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
              Last Contact
            </span>
            <span className="font-mono text-xs font-bold text-slate-700 truncate block">
              {formatLastSeen(status?.last_seen_at)}
            </span>
          </div>

          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
              Sensor Pin
            </span>
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span>GPIO 4 (Reed Switch)</span>
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center justify-center gap-3 mt-7">
          <button
            type="button"
            onClick={handleCheckNow}
            disabled={isChecking}
            className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md hover:shadow-lg active:scale-95 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
            <span>{isChecking ? 'Checking Network...' : 'Check Connection Now'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowHistory((prev) => !prev)}
            className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 font-bold text-xs border border-slate-200/80 active:scale-95 transition-all"
          >
            <History className="w-3.5 h-3.5 text-slate-500" />
            <span>{showHistory ? 'Hide Past Logs' : 'View Historical Logs'}</span>
            {showHistory ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Troubleshooting Guidance */}
        <div className="mt-8 pt-6 border-t border-slate-100 text-left max-w-lg mx-auto">
          <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mb-2.5">
            <HelpCircle className="w-4 h-4 text-slate-400" />
            <span>How to Reconnect Your Device:</span>
          </h4>
          <ol className="text-[11px] sm:text-xs text-slate-500 space-y-1.5 list-decimal list-inside pl-1 font-medium">
            <li>Ensure the ESP32 board is plugged into USB or power supply on <strong className="text-slate-700 font-mono">COM3</strong>.</li>
            <li>Confirm phone hotspot or Wi-Fi (<strong className="text-slate-700">moto g96 5G_5200</strong> on 2.4 GHz) is turned ON.</li>
            <li>The board will automatically connect in ~3 seconds and this dashboard will immediately restore live door telemetry.</li>
          </ol>
        </div>
      </div>

      {/* Collapsible Historical Event Logs (Only shown if toggled by user) */}
      {showHistory && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <History className="w-4 h-4 text-slate-500" />
              <span>Historical Log Archive (Read-Only)</span>
            </h3>
            <span className="text-[11px] text-slate-400 font-medium">
              Showing events recorded prior to disconnect
            </span>
          </div>

          <EventHistoryTable
            events={events}
            total={totalEvents}
            page={eventPage}
            limit={eventLimit}
            isLoading={isEventsLoading}
            onPageChange={onPageChange}
            selectedSource={selectedSource}
            onSourceChange={onSourceChange}
            onRefresh={onRefresh}
          />
        </div>
      )}
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import { ShieldCheck, AlertTriangle, Lock, Unlock, Clock, Bell, Sparkles } from 'lucide-react';
import { DoorStatus } from '../types';
import { api } from '../services/api';
import { soundManager } from '../utils/sound';
import { notificationManager } from '../utils/notifications';

interface MainStatusCardProps {
  status: DoorStatus | null;
  onThresholdChanged?: (newThreshold: number) => void;
}

const THRESHOLD_PILLS = [
  { label: '10s', value: 10 },
  { label: '30s', value: 30 },
  { label: '1m', value: 60 },
  { label: '5m', value: 300 },
];

export const MainStatusCard: React.FC<MainStatusCardProps> = ({
  status,
  onThresholdChanged,
}) => {
  const [liveDuration, setLiveDuration] = useState<number>(0);
  const [isUpdatingThreshold, setIsUpdatingThreshold] = useState<number | null>(null);
  const [isAudioReady, setIsAudioReady] = useState<boolean>(soundManager.isReady());

  useEffect(() => {
    return soundManager.subscribe((ready) => {
      setIsAudioReady(ready);
    });
  }, []);

  // Live timer calculation synchronized with backend last_opened_at
  useEffect(() => {
    if (!status || status.current_state !== 'OPEN') {
      setLiveDuration(0);
      return;
    }

    const refTime = status.last_opened_at || status.last_event_at;
    if (!refTime) {
      setLiveDuration(status.open_duration_seconds || 0);
      return;
    }

    const startTime = new Date(refTime).getTime();

    const updateTimer = () => {
      const now = Date.now();
      const elapsed = Math.max(0, (now - startTime) / 1000);
      setLiveDuration(elapsed);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 200);
    return () => clearInterval(interval);
  }, [status?.current_state, status?.last_opened_at, status?.last_event_at, status?.open_duration_seconds]);

  const isOpen = status?.current_state === 'OPEN';
  const threshold = status?.alert_threshold_seconds || 10;
  const isThresholdExceeded = Boolean(isOpen && (status?.is_alert_active || liveDuration >= threshold));

  // Trigger audible alarm sound loop & native push notifications when alert threshold is exceeded (hook called unconditionally)
  useEffect(() => {
    if (isThresholdExceeded) {
      soundManager.startAlarmLoop();
      notificationManager.sendDoorAlert(status?.device_name || 'Main Gate', liveDuration, threshold);
    } else {
      soundManager.stopAlarmLoop();
      notificationManager.clearAlert();
    }

    return () => {
      soundManager.stopAlarmLoop();
      notificationManager.clearAlert();
    };
  }, [isThresholdExceeded, status?.device_name, threshold]);

  const handleSelectThreshold = async (value: number) => {
    if (!status || value === status.alert_threshold_seconds) return;
    setIsUpdatingThreshold(value);
    try {
      await api.updateSettings(value);
      if (onThresholdChanged) {
        onThresholdChanged(value);
      }
    } catch (err: any) {
      console.error('Failed to update threshold:', err);
    } finally {
      setIsUpdatingThreshold(null);
    }
  };

  if (!status) {
    return (
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 flex items-center justify-center shadow-sm animate-pulse">
        <p className="text-slate-400 font-medium text-sm">Connecting to live sensor...</p>
      </div>
    );
  }

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = Math.floor(sec % 60);
    const tenths = Math.floor((sec % 1) * 10);
    if (mins > 0) return `${mins}m ${secs}.${tenths}s`;
    return `${secs}.${tenths}s`;
  };

  const formatTimestamp = (isoString?: string | null) => {
    if (!isoString) return 'Waiting for sensor event';
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return isoString;
    }
  };

  const progressPercent = Math.min(100, Math.round((liveDuration / threshold) * 100));

  return (
    <div
      className={`relative overflow-hidden rounded-3xl border transition-all duration-500 glass-card ${
        isOpen
          ? isThresholdExceeded
            ? 'bg-gradient-to-b from-rose-50/70 via-white to-rose-50/30 border-rose-300 shadow-glow-rose'
            : 'bg-gradient-to-b from-amber-50/60 via-white to-amber-50/30 border-amber-300 shadow-md shadow-amber-500/10'
          : 'bg-white border-emerald-200/90 shadow-sm hover:shadow-md'
      }`}
    >
      {/* Dynamic Security Warning Banner */}
      {isThresholdExceeded && (
        <div className="bg-gradient-to-r from-rose-600 to-rose-500 text-white px-4 py-2 sm:px-6 sm:py-2.5 flex flex-wrap items-center justify-between gap-2 shadow-sm animate-pulse">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span className="font-bold text-[11px] sm:text-xs uppercase tracking-wider">
              Gate Open Beyond {threshold}s Limit
            </span>
          </div>
          <div className="flex items-center space-x-2">
            {!isAudioReady && !soundManager.getIsMuted() && (
              <button
                type="button"
                onClick={() => soundManager.unlockAudio()}
                className="text-[10px] sm:text-[11px] font-bold bg-white text-rose-700 hover:bg-rose-50 px-2.5 py-0.5 rounded-full shadow transition-all flex items-center space-x-1"
                title="Tap to activate siren audio"
              >
                <span>🔊 Unmute Siren</span>
              </button>
            )}
            <span className="text-[10px] sm:text-[11px] font-mono bg-rose-700 px-2 py-0.5 rounded-full font-bold">
              +{Math.max(0, Math.round(liveDuration - threshold))}s OVERDUE
            </span>
          </div>
        </div>
      )}

      <div className="p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-6 sm:gap-8">
          
          {/* Left: Interactive Graphic & State Badge */}
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 text-center sm:text-left w-full lg:w-auto">
            {/* Visual Door Portal Graphic */}
            <div className="relative flex items-center justify-center flex-shrink-0">
              {isOpen && isThresholdExceeded && (
                <div className="absolute inset-0 rounded-2xl bg-rose-400/20 animate-ripple pointer-events-none" />
              )}
              <div
                className={`w-24 h-24 sm:w-28 sm:h-28 rounded-2xl flex items-center justify-center border-2 transition-all duration-300 shadow-inner ${
                  isOpen
                    ? isThresholdExceeded
                      ? 'bg-rose-100 text-rose-600 border-rose-300'
                      : 'bg-amber-100 text-amber-600 border-amber-300'
                    : 'bg-emerald-50 text-emerald-600 border-emerald-200 shadow-glow-emerald'
                }`}
              >
                {isOpen ? (
                  <Unlock className="w-10 h-10 sm:w-12 sm:h-12 stroke-[2.2] animate-bounce" />
                ) : (
                  <Lock className="w-10 h-10 sm:w-12 sm:h-12 stroke-[2.2]" />
                )}
              </div>
            </div>

            {/* Status Headings */}
            <div className="flex flex-col items-center sm:items-start">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  {status.device_name || 'Main Gate'}
                </span>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase ${
                    isOpen
                      ? isThresholdExceeded
                        ? 'bg-rose-100 text-rose-700 border border-rose-200'
                        : 'bg-amber-100 text-amber-800 border border-amber-200'
                      : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  }`}
                >
                  {isOpen ? (isThresholdExceeded ? 'ALARM ACTIVE' : 'UNLATCHED') : 'PROTECTED'}
                </span>
              </div>

              <h2
                className={`text-4xl sm:text-6xl font-extrabold tracking-tight mt-1 transition-colors ${
                  isOpen
                    ? isThresholdExceeded
                      ? 'text-rose-600'
                      : 'text-amber-600'
                    : 'text-emerald-600'
                }`}
              >
                {status.current_state}
              </h2>

              <div className="flex items-center space-x-1.5 text-xs text-slate-500 font-medium mt-1.5 sm:mt-2">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Last updated: {formatTimestamp(status.last_event_at)}</span>
              </div>
            </div>
          </div>

          {/* Right: Live Stopwatch Widget & Alert Limit Quick Selector */}
          <div className="w-full lg:w-auto lg:min-w-[280px] flex flex-col items-center lg:items-end justify-center bg-slate-50/90 border border-slate-200/80 rounded-2xl p-4 sm:p-6">
            {isOpen ? (
              <div className="w-full flex flex-col items-center lg:items-end">
                <span className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Continuous Open Time
                </span>
                <div
                  className={`font-mono text-3xl sm:text-5xl font-extrabold tracking-tight mt-1 ${
                    isThresholdExceeded ? 'text-rose-600 animate-pulse' : 'text-slate-900'
                  }`}
                >
                  {formatSeconds(liveDuration)}
                </div>

                {/* Progress bar towards alert threshold */}
                <div className="w-full bg-slate-200 rounded-full h-2 mt-3 sm:mt-4 overflow-hidden shadow-inner">
                  <div
                    className={`h-full transition-all duration-300 rounded-full ${
                      isThresholdExceeded ? 'bg-rose-500' : 'bg-amber-500'
                    }`}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <div className="w-full flex items-center justify-between text-[10px] sm:text-[11px] text-slate-400 font-medium mt-1">
                  <span>Progress to alert</span>
                  <span>{progressPercent}%</span>
                </div>
              </div>
            ) : (
              <div className="w-full flex flex-col items-center lg:items-end text-center lg:text-right">
                <div className="flex items-center space-x-1.5 text-emerald-600 mb-1">
                  <ShieldCheck className="w-5 h-5 stroke-[2.2]" />
                  <span className="font-bold text-sm">Gate Latch Closed</span>
                </div>
                <p className="text-xs text-slate-500 max-w-[220px] mt-1">
                  Magnetic reed sensor on GPIO 4 actively reading gate secured.
                </p>
              </div>
            )}

            {/* Quick Alert Limit Selector Pill */}
            <div className="w-full pt-3 sm:pt-4 mt-3 sm:mt-4 border-t border-slate-200 flex flex-col items-center lg:items-end">
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                <Bell className="w-3 h-3 text-slate-400" />
                <span>Alert Limit Threshold:</span>
              </span>
              <div className="flex items-center space-x-1 p-1 bg-slate-200/60 rounded-xl w-full justify-between">
                {THRESHOLD_PILLS.map((pill) => {
                  const isActive = threshold === pill.value;
                  const isLoading = isUpdatingThreshold === pill.value;
                  return (
                    <button
                      key={pill.value}
                      onClick={() => handleSelectThreshold(pill.value)}
                      disabled={isLoading}
                      className={`flex-1 py-1 sm:py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${
                        isActive
                          ? 'bg-white text-slate-900 shadow-sm border border-slate-300/60'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-300/40'
                      }`}
                    >
                      {pill.label}
                    </button>
                  );
                })}
              </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
};

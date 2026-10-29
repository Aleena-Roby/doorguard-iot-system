import React, { useState } from 'react';
import { Bell, Check, Loader2 } from 'lucide-react';
import { api } from '../services/api';

interface AlertSettingsCardProps {
  currentThreshold: number;
  onThresholdUpdated: (newThreshold: number) => void;
}

const THRESHOLD_OPTIONS = [
  { label: '10 Seconds', value: 10, description: 'Default for MCA demo testing' },
  { label: '30 Seconds', value: 30, description: 'Quick warning threshold' },
  { label: '60 Seconds', value: 60, description: '1 minute continuous open' },
  { label: '5 Minutes', value: 300, description: 'Standard residential threshold' },
];

export const AlertSettingsCard: React.FC<AlertSettingsCardProps> = ({
  currentThreshold,
  onThresholdUpdated,
}) => {
  const [isUpdating, setIsUpdating] = useState<number | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSelectThreshold = async (value: number) => {
    if (value === currentThreshold) return;
    setIsUpdating(value);
    setSuccessMsg(null);
    try {
      await api.updateSettings(value);
      onThresholdUpdated(value);
      setSuccessMsg(`Threshold updated to ${value}s in PostgreSQL`);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      alert(`Failed to update setting: ${err.message || 'Unknown error'}`);
    } finally {
      setIsUpdating(null);
    }
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400">
            <Bell className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Alert Threshold Settings</h3>
            <p className="text-xs text-slate-400">Trigger security alert after door stays open</p>
          </div>
        </div>
        {successMsg && (
          <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20 animate-fade-in flex items-center gap-1">
            <Check className="w-3 h-3" />
            {successMsg}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
        {THRESHOLD_OPTIONS.map((opt) => {
          const isSelected = currentThreshold === opt.value;
          const loadingThis = isUpdating === opt.value;

          return (
            <button
              key={opt.value}
              onClick={() => handleSelectThreshold(opt.value)}
              disabled={loadingThis}
              className={`p-3.5 rounded-xl border text-left transition-all ${
                isSelected
                  ? 'bg-amber-500/15 border-amber-500/50 ring-1 ring-amber-500/30'
                  : 'bg-slate-800/40 border-slate-700/60 hover:bg-slate-800/80 hover:border-slate-600'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-sm font-bold font-mono ${isSelected ? 'text-amber-400' : 'text-slate-200'}`}>
                  {opt.label}
                </span>
                {loadingThis ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                ) : isSelected ? (
                  <span className="w-2 h-2 rounded-full bg-amber-400 shadow-sm shadow-amber-400" />
                ) : null}
              </div>
              <p className="text-[11px] text-slate-400 mt-1 leading-tight">{opt.description}</p>
            </button>
          );
        })}
      </div>

      <p className="text-[11px] text-slate-500 mt-3">
        * Persistent in PostgreSQL `app_settings` table. The backend server evaluates active alert status in real-time.
      </p>
    </div>
  );
};


import React, { useState } from 'react';
import { X, Plus, Cpu, Loader2 } from 'lucide-react';
import { api } from '../services/api';

interface AddDeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeviceCreated: (newDeviceId: string) => void;
}

const PRESETS = [
  { id: 'esp32_back_gate', name: 'Back Gate' },
  { id: 'esp32_side_door', name: 'Side Entrance' },
  { id: 'esp32_garage_gate', name: 'Garage Gate' },
  { id: 'esp32_main_door', name: 'Main Front Door' },
];

export const AddDeviceModal: React.FC<AddDeviceModalProps> = ({
  isOpen,
  onClose,
  onDeviceCreated,
}) => {
  const [deviceId, setDeviceId] = useState('');
  const [deviceName, setDeviceName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleApplyPreset = (preset: { id: string; name: string }) => {
    setDeviceId(preset.id);
    setDeviceName(preset.name);
    setErrorMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deviceId.trim()) {
      setErrorMsg('Device ID is required.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await api.createDevice(deviceId.trim(), deviceName.trim() || 'Smart Gate Sensor', 'ESP32');
      onDeviceCreated(deviceId.trim());
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create device');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md p-5 sm:p-7 shadow-2xl relative max-h-[92vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 sm:top-5 right-4 sm:top-5 text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 pb-3.5 sm:pb-4 border-b border-slate-100">
          <div className="p-2 sm:p-2.5 bg-emerald-50 border border-emerald-100 rounded-2xl text-emerald-600 shadow-sm flex-shrink-0">
            <Plus className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-extrabold text-slate-900">Add New Gate / Door Node</h2>
            <p className="text-[11px] sm:text-xs text-slate-400 font-medium">Register a physical ESP32 sensor node</p>
          </div>
        </div>

        {/* Quick Hardware Presets */}
        <div className="mt-4 sm:mt-5">
          <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
            Location Templates
          </span>
          <div className="grid grid-cols-2 gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handleApplyPreset(p)}
                className="text-left p-2 sm:p-2.5 rounded-xl bg-slate-50 hover:bg-emerald-50/60 border border-slate-200/80 hover:border-emerald-200 text-xs transition-all"
              >
                <div className="font-bold text-slate-800 text-[11px] sm:text-xs truncate">{p.name}</div>
                <div className="text-[9px] sm:text-[10px] text-slate-400 font-mono mt-0.5 truncate">{p.id}</div>
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 sm:mt-5 space-y-3.5 sm:space-y-4">
          {errorMsg && (
            <div className="p-2.5 sm:p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Device Identifier (ID)
            </label>
            <input
              type="text"
              value={deviceId}
              onChange={(e) => setDeviceId(e.target.value)}
              placeholder="e.g. esp32_garden_gate"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 font-mono text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all bg-slate-50/50"
              required
            />
          </div>

          <div>
            <label className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Friendly Display Name
            </label>
            <input
              type="text"
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
              placeholder="e.g. Garden Gate"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all bg-slate-50/50"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm hover:shadow transition-all flex items-center justify-center space-x-1.5 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Registering Node...</span>
                </>
              ) : (
                <>
                  <Cpu className="w-4 h-4" />
                  <span>Register Node</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

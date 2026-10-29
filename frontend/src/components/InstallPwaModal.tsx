import React from 'react';
import { X, Smartphone, Download, Share, CheckCircle2, ShieldCheck, ArrowRight } from 'lucide-react';
import { pwaManager } from '../utils/pwa';

interface InstallPwaModalProps {
  isOpen: boolean;
  onClose: () => void;
  canInstallPrompt: boolean;
}

export const InstallPwaModal: React.FC<InstallPwaModalProps> = ({
  isOpen,
  onClose,
  canInstallPrompt,
}) => {
  if (!isOpen) return null;

  const handleInstallClick = async () => {
    const outcome = await pwaManager.triggerInstall();
    if (outcome === 'accepted') {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white border border-slate-200/90 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-emerald-50/50">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-sm">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">Install DoorGuard App</h3>
              <p className="text-xs text-slate-500">Add to Home Screen for fullscreen monitoring</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4">
          {/* Quick One-Tap Install Button if Browser Prompt is Available */}
          {canInstallPrompt && (
            <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md flex items-center justify-between">
              <div>
                <p className="font-bold text-sm">One-Click Install Ready</p>
                <p className="text-xs text-emerald-100 mt-0.5">Install directly on this device</p>
              </div>
              <button
                onClick={handleInstallClick}
                className="px-4 py-2 bg-white text-emerald-700 hover:bg-emerald-50 font-bold text-xs rounded-xl shadow transition-all active:scale-95 flex items-center space-x-1.5"
              >
                <Download className="w-4 h-4" />
                <span>Install Now</span>
              </button>
            </div>
          )}

          {/* Android Chrome Instructions */}
          <div className="p-3.5 rounded-xl border border-slate-200/90 bg-slate-50/70">
            <div className="flex items-center space-x-2 font-bold text-xs text-slate-800 mb-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Android / Motorola (Chrome)</span>
            </div>
            <ol className="text-xs text-slate-600 space-y-1 list-decimal list-inside pl-1">
              <li>Tap the three dots menu (<strong className="text-slate-800">⋮</strong>) in the top-right.</li>
              <li>Select <strong className="text-emerald-700">"Add to Home screen"</strong> or <strong className="text-emerald-700">"Install app"</strong>.</li>
              <li>Tap <strong className="text-slate-800">Add</strong> to complete.</li>
            </ol>
          </div>

          {/* iPhone / iPad Safari Instructions */}
          <div className="p-3.5 rounded-xl border border-slate-200/90 bg-slate-50/70">
            <div className="flex items-center space-x-2 font-bold text-xs text-slate-800 mb-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span>iPhone / iPad (Safari)</span>
            </div>
            <ol className="text-xs text-slate-600 space-y-1 list-decimal list-inside pl-1">
              <li>Tap the <strong className="text-slate-800">Share</strong> button (<Share className="w-3.5 h-3.5 inline mx-0.5 text-blue-600" />) at the bottom.</li>
              <li>Scroll down and tap <strong className="text-blue-700">"Add to Home Screen"</strong>.</li>
              <li>Tap <strong className="text-slate-800">Add</strong> in the top-right corner.</li>
            </ol>
          </div>

          {/* Benefits */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-around text-[11px] text-slate-500 font-medium">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Fullscreen UI
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Instant Push Alerts
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Zero App Store Needed
            </span>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-200/60 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};


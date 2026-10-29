import React, { useState } from 'react';
import { PlayCircle, DoorOpen, DoorClosed, RotateCcw, AlertCircle, Loader2 } from 'lucide-react';
import { api } from '../services/api';
import { DoorState } from '../types';

interface SimulationControlsCardProps {
  currentDoorState: DoorState;
  onActionComplete: () => void;
}

export const SimulationControlsCard: React.FC<SimulationControlsCardProps> = ({
  currentDoorState,
  onActionComplete,
}) => {
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [showConfirmReset, setShowConfirmReset] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleSimulate = async (state: DoorState) => {
    setLoadingAction(state);
    setFeedback(null);
    try {
      await api.simulateDoor(state);
      setFeedback(`Simulated: Door ${state} recorded in PostgreSQL.`);
      onActionComplete();
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: any) {
      alert(`Simulation error: ${err.message || 'Failed to simulate door event'}`);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleReset = async () => {
    setLoadingAction('RESET');
    setFeedback(null);
    try {
      const res = await api.resetSimulation();
      setFeedback(res.message || 'Simulation data reset in database.');
      setShowConfirmReset(false);
      onActionComplete();
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      alert(`Reset error: ${err.message || 'Failed to reset simulation'}`);
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-2">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 bg-purple-500/10 border border-purple-500/20 rounded-lg text-purple-400">
            <PlayCircle className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Hardware Simulation Controls</h3>
            <p className="text-xs text-slate-400">
              Test door transitions and alert timers without physical hardware
            </p>
          </div>
        </div>

        {feedback && (
          <span className="text-xs text-purple-300 bg-purple-500/15 border border-purple-500/30 px-3 py-1 rounded-md">
            {feedback}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
        {/* Open Door Button */}
        <button
          onClick={() => handleSimulate('OPEN')}
          disabled={loadingAction !== null || currentDoorState === 'OPEN'}
          className={`flex items-center justify-center space-x-2 p-3.5 rounded-xl font-medium text-xs transition-all ${
            currentDoorState === 'OPEN'
              ? 'bg-slate-800/40 text-slate-500 border border-slate-800 cursor-not-allowed'
              : 'bg-amber-600/20 text-amber-300 border border-amber-500/30 hover:bg-amber-600/30 shadow-sm'
          }`}
        >
          {loadingAction === 'OPEN' ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <DoorOpen className="w-4 h-4" />
          )}
          <span>Simulate Door Open</span>
        </button>

        {/* Close Door Button */}
        <button
          onClick={() => handleSimulate('CLOSED')}
          disabled={loadingAction !== null || currentDoorState === 'CLOSED'}
          className={`flex items-center justify-center space-x-2 p-3.5 rounded-xl font-medium text-xs transition-all ${
            currentDoorState === 'CLOSED'
              ? 'bg-slate-800/40 text-slate-500 border border-slate-800 cursor-not-allowed'
              : 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-600/30 shadow-sm'
          }`}
        >
          {loadingAction === 'CLOSED' ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <DoorClosed className="w-4 h-4" />
          )}
          <span>Simulate Door Close</span>
        </button>

        {/* Reset Simulation Button */}
        {!showConfirmReset ? (
          <button
            onClick={() => setShowConfirmReset(true)}
            disabled={loadingAction !== null}
            className="flex items-center justify-center space-x-2 p-3.5 rounded-xl font-medium text-xs bg-slate-800/70 text-slate-300 border border-slate-700/80 hover:bg-slate-800 hover:text-white transition-all"
          >
            <RotateCcw className="w-4 h-4 text-slate-400" />
            <span>Reset Simulation</span>
          </button>
        ) : (
          <div className="flex items-center space-x-2 p-1.5 bg-rose-950/30 border border-rose-500/40 rounded-xl">
            <button
              onClick={handleReset}
              disabled={loadingAction === 'RESET'}
              className="flex-1 py-2 px-2 text-[11px] font-bold bg-rose-600 text-white rounded-lg hover:bg-rose-500 transition-colors flex items-center justify-center space-x-1"
            >
              {loadingAction === 'RESET' ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
              <span>Confirm Reset</span>
            </button>
            <button
              onClick={() => setShowConfirmReset(false)}
              className="py-2 px-3 text-[11px] font-medium bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      <div className="flex items-start space-x-2 text-[11px] text-slate-500 mt-3.5">
        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 text-slate-400 mt-0.5" />
        <span>
          Every simulation action calls the Flask REST API, executes PostgreSQL transactions, and appears in the event history table. Resetting purges only simulated records; real ESP32 hardware logs remain intact.
        </span>
      </div>
    </div>
  );
};


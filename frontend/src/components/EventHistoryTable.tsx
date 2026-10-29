import React, { useState } from 'react';
import { History, Download, ChevronLeft, ChevronRight, RefreshCw, Lock, Unlock, Clock, LayoutGrid, ListFilter } from 'lucide-react';
import { DoorEvent } from '../types';
import { api } from '../services/api';

interface EventHistoryTableProps {
  events: DoorEvent[];
  total: number;
  page: number;
  limit: number;
  isLoading: boolean;
  onPageChange: (newPage: number) => void;
  selectedSource: string;
  onSourceChange: (source: string) => void;
  onRefresh: () => void;
  deviceId?: string;
}

export const EventHistoryTable: React.FC<EventHistoryTableProps> = ({
  events,
  total,
  page,
  limit,
  isLoading,
  onPageChange,
  selectedSource,
  onSourceChange,
  onRefresh,
  deviceId,
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [viewMode, setViewMode] = useState<'feed' | 'table'>('feed');

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const formatTimestamp = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) +
        ', ' + d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return isoString;
    }
  };

  const getRelativeTime = (isoString: string) => {
    try {
      const diffSec = Math.round((Date.now() - new Date(isoString).getTime()) / 1000);
      if (diffSec < 60) return `${diffSec}s ago`;
      if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
      return `${Math.floor(diffSec / 3600)}h ago`;
    } catch {
      return '';
    }
  };

  const handleExportCsv = () => {
    setIsExporting(true);
    const link = document.createElement('a');
    let exportUrl = api.getCsvExportUrl(deviceId, selectedSource);
    link.href = exportUrl;
    link.setAttribute('download', `doorguard_events.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => setIsExporting(false), 800);
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
      {/* Header Toolbar */}
      <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center space-x-2.5 sm:space-x-3">
          <div className="p-2 sm:p-2.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-700 flex-shrink-0">
            <History className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-bold text-slate-900">Live Activity Feed</h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                {total} Events
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-400 font-medium">Real-time hardware sensor audit log</p>
          </div>
        </div>

        {/* Actions & View Controls */}
        <div className="flex items-center space-x-2 self-start sm:self-auto">
          {/* View Mode Toggle */}
          <div className="flex items-center space-x-1 p-1 bg-slate-100 rounded-xl border border-slate-200/70 text-xs">
            <button
              onClick={() => setViewMode('feed')}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === 'feed' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Feed View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === 'table' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Table View"
            >
              <ListFilter className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Refresh Button */}
          <button
            onClick={onRefresh}
            className="p-1.5 sm:p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl border border-slate-200/80 transition-colors"
            title="Refresh events"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-emerald-600' : ''}`} />
          </button>

          {/* Export CSV Button */}
          <button
            onClick={handleExportCsv}
            disabled={isExporting || total === 0}
            className="flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 disabled:opacity-40 transition-all shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">{isExporting ? 'Exporting...' : 'Export CSV'}</span>
            <span className="xs:hidden">CSV</span>
          </button>
        </div>
      </div>

      {/* Main Content Area: Feed or Table */}
      {events.length === 0 ? (
        <div className="p-8 sm:p-10 text-center">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center mx-auto mb-2 text-slate-400">
            <Clock className="w-5 h-5 sm:w-6 sm:h-6 stroke-[1.8]" />
          </div>
          <p className="text-xs sm:text-sm font-bold text-slate-700">No Events Logged Yet</p>
          <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
            Physical events will appear here the moment your gate or door is opened or closed.
          </p>
        </div>
      ) : viewMode === 'feed' ? (
        /* Visual Card Timeline / Feed */
        <div className="p-3.5 sm:p-5 grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 bg-slate-50/50">
          {events.map((ev) => {
            const isOpen = ev.state === 'OPEN';
            return (
              <div
                key={ev.id}
                className="bg-white border border-slate-200/80 rounded-xl p-3 sm:p-4 shadow-sm hover:border-slate-300 transition-all flex items-center justify-between gap-2"
              >
                <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0">
                  <div
                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center border flex-shrink-0 ${
                      isOpen
                        ? 'bg-amber-50 text-amber-600 border-amber-200'
                        : 'bg-emerald-50 text-emerald-600 border-emerald-200'
                    }`}
                  >
                    {isOpen ? <Unlock className="w-4 h-4 sm:w-5 sm:h-5" /> : <Lock className="w-4 h-4 sm:w-5 sm:h-5" />}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center space-x-1.5 sm:space-x-2">
                      <span
                        className={`text-[10px] sm:text-xs font-extrabold tracking-wide uppercase px-1.5 sm:px-2 py-0.5 rounded-md flex-shrink-0 ${
                          isOpen
                            ? 'bg-amber-100/80 text-amber-800'
                            : 'bg-emerald-100/80 text-emerald-800'
                        }`}
                      >
                        {ev.state}
                      </span>
                      <span className="text-xs font-bold text-slate-700 truncate">{ev.device_id}</span>
                    </div>
                    <div className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 sm:mt-1 flex items-center space-x-1 font-medium truncate">
                      <span>{formatTimestamp(ev.event_timestamp)}</span>
                      <span>•</span>
                      <span>{getRelativeTime(ev.event_timestamp)}</span>
                    </div>
                  </div>
                </div>

                {ev.duration_seconds !== null && ev.duration_seconds !== undefined && (
                  <span className="text-[11px] sm:text-xs font-mono font-bold bg-slate-100 text-slate-700 px-2 sm:px-2.5 py-1 rounded-lg border border-slate-200 flex-shrink-0">
                    {ev.duration_seconds}s
                  </span>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* Classic Clean Table View with Horizontal Scroll on Mobile */
        <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
          <table className="w-full text-left text-xs text-slate-600 min-w-[500px]">
            <thead className="bg-slate-50 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-100">
              <tr>
                <th className="py-2.5 sm:py-3 px-3 sm:px-4">Event Time</th>
                <th className="py-2.5 sm:py-3 px-3 sm:px-4">State</th>
                <th className="py-2.5 sm:py-3 px-3 sm:px-4">Open Duration</th>
                <th className="py-2.5 sm:py-3 px-3 sm:px-4">Gate / Door</th>
                <th className="py-2.5 sm:py-3 px-3 sm:px-4">Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {events.map((ev) => {
                const isOpen = ev.state === 'OPEN';
                return (
                  <tr key={ev.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 sm:py-3 px-3 sm:px-4 font-mono text-slate-700 whitespace-nowrap">
                      {formatTimestamp(ev.event_timestamp)}
                    </td>
                    <td className="py-2.5 sm:py-3 px-3 sm:px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-bold ${
                          isOpen
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        {ev.state}
                      </span>
                    </td>
                    <td className="py-2.5 sm:py-3 px-3 sm:px-4 font-mono text-slate-700">
                      {ev.duration_seconds !== null ? `${ev.duration_seconds}s` : '—'}
                    </td>
                    <td className="py-2.5 sm:py-3 px-3 sm:px-4 text-slate-700 font-semibold">{ev.device_id}</td>
                    <td className="py-2.5 sm:py-3 px-3 sm:px-4 text-slate-400">{ev.source}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination Footer */}
      <div className="p-3.5 sm:p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium bg-slate-50/50">
        <span>
          Page {page} of {totalPages}
        </span>
        <div className="flex items-center space-x-1.5">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1 || isLoading}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-white disabled:opacity-40 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages || isLoading}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-white disabled:opacity-40 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

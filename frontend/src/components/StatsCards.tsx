import React from 'react';
import { DoorOpen, Clock, Zap, Timer, CheckCircle2 } from 'lucide-react';
import { Statistics } from '../types';

interface StatsCardsProps {
  stats: Statistics | null;
}

export const StatsCards: React.FC<StatsCardsProps> = ({ stats }) => {
  const formatSeconds = (sec: number) => {
    if (sec <= 0) return '0s';
    const hours = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const secs = Math.floor(sec % 60);

    const parts = [];
    if (hours > 0) parts.push(`${hours}h`);
    if (mins > 0) parts.push(`${mins}m`);
    if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);
    return parts.join(' ');
  };

  const cards = [
    {
      title: 'Openings Today',
      value: stats ? stats.openings_today.toString() : '0',
      tag: 'Gate Cycles',
      icon: DoorOpen,
      iconColor: 'text-indigo-600',
      bgColor: 'bg-indigo-50 border-indigo-100',
      badgeColor: 'bg-indigo-100/70 text-indigo-700',
    },
    {
      title: 'Total Open Time',
      value: stats ? formatSeconds(stats.total_open_duration_seconds) : '0s',
      tag: 'Today Total',
      icon: Clock,
      iconColor: 'text-emerald-600',
      bgColor: 'bg-emerald-50 border-emerald-100',
      badgeColor: 'bg-emerald-100/70 text-emerald-700',
    },
    {
      title: 'Longest Opening',
      value: stats ? formatSeconds(stats.longest_opening_seconds) : '0s',
      tag: 'Peak Duration',
      icon: Zap,
      iconColor: 'text-amber-600',
      bgColor: 'bg-amber-50 border-amber-100',
      badgeColor: 'bg-amber-100/70 text-amber-700',
    },
    {
      title: 'Current Status',
      value: stats && stats.current_open_duration_seconds > 0
        ? formatSeconds(stats.current_open_duration_seconds)
        : 'Secured',
      tag: stats && stats.current_open_duration_seconds > 0 ? 'Active Cycle' : 'All Clear',
      icon: stats && stats.current_open_duration_seconds > 0 ? Timer : CheckCircle2,
      iconColor: stats && stats.current_open_duration_seconds > 0 ? 'text-rose-600' : 'text-emerald-600',
      bgColor: stats && stats.current_open_duration_seconds > 0 ? 'bg-rose-50 border-rose-100' : 'bg-emerald-50 border-emerald-100',
      badgeColor: stats && stats.current_open_duration_seconds > 0 ? 'bg-rose-100/70 text-rose-700' : 'bg-emerald-100/70 text-emerald-700',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className="bg-white border border-slate-200/90 rounded-2xl p-3.5 sm:p-5 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between gap-1">
              <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider truncate">
                {card.title}
              </span>
              <div className={`p-1.5 sm:p-2 rounded-xl border flex-shrink-0 ${card.bgColor} ${card.iconColor}`}>
                <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.2]" />
              </div>
            </div>
            <div className="mt-2.5 sm:mt-3 flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1">
              <span className="text-xl xs:text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 font-mono">
                {card.value}
              </span>
              <span className={`text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full self-start sm:self-auto ${card.badgeColor}`}>
                {card.tag}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

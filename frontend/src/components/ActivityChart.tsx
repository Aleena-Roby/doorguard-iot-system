import React, { useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { BarChart3, Clock } from 'lucide-react';
import { HourlyActivity } from '../types';

interface ActivityChartProps {
  activityData: HourlyActivity[];
}

export const ActivityChart: React.FC<ActivityChartProps> = ({ activityData }) => {
  const [metric, setMetric] = useState<'openings' | 'duration_seconds'>('openings');

  const hasData = activityData && activityData.some(d => d.openings > 0 || d.duration_seconds > 0);
  const chartData = activityData || [];

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-6 shadow-sm hover:shadow-md transition-all duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 sm:pb-4 border-b border-slate-100 gap-3">
        <div className="flex items-center space-x-2.5 sm:space-x-3">
          <div className="p-2 sm:p-2.5 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-600 flex-shrink-0">
            <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.2]" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Today's Hourly Distribution</h3>
            <p className="text-[11px] sm:text-xs text-slate-400 font-medium">Activity pattern over the last 24 hours</p>
          </div>
        </div>

        {/* Metric Switcher Pills */}
        <div className="flex items-center space-x-1 p-1 bg-slate-100 rounded-xl border border-slate-200/80 self-start sm:self-auto">
          <button
            onClick={() => setMetric('openings')}
            className={`px-2.5 sm:px-3 py-1 sm:py-1.5 text-xs font-bold rounded-lg transition-all ${
              metric === 'openings'
                ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/60'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Openings
          </button>
          <button
            onClick={() => setMetric('duration_seconds')}
            className={`px-2.5 sm:px-3 py-1 sm:py-1.5 text-xs font-bold rounded-lg transition-all ${
              metric === 'duration_seconds'
                ? 'bg-white text-emerald-600 shadow-sm border border-slate-200/60'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Duration (s)
          </button>
        </div>
      </div>

      <div className="pt-4 sm:pt-6 h-52 sm:h-64 w-full">
        {!hasData ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 bg-slate-50/70 rounded-xl border border-dashed border-slate-200 p-4 sm:p-6 text-center">
            <div className="p-2.5 sm:p-3 bg-white rounded-full shadow-sm border border-slate-200/70 mb-2 text-slate-400">
              <Clock className="w-5 h-5 sm:w-6 sm:h-6 stroke-[1.8]" />
            </div>
            <p className="text-xs sm:text-sm font-bold text-slate-700">No Activity Recorded Today</p>
            <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5 max-w-sm">
              Trigger a gate opening using your physical ESP32 sensor on GPIO 4 to populate live hourly bars.
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 8, left: -24, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="hour"
                stroke="#94a3b8"
                fontSize={10}
                tickLine={false}
                interval={2}
              />
              <YAxis
                stroke="#94a3b8"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  borderColor: '#e2e8f0',
                  borderRadius: '0.75rem',
                  fontSize: '11px',
                  color: '#0f172a',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                }}
                labelStyle={{ fontWeight: 'bold', color: '#0f172a' }}
                cursor={{ fill: '#f8fafc' }}
                formatter={(val: any) => [
                  metric === 'openings' ? `${val} times` : `${val}s open`,
                  metric === 'openings' ? 'Openings' : 'Duration',
                ]}
              />
              <Bar
                dataKey={metric}
                fill={metric === 'openings' ? '#6366f1' : '#10b981'}
                radius={[6, 6, 0, 0]}
                maxBarSize={32}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

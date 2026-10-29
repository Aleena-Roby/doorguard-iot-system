import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Header } from './components/Header';
import { MainStatusCard } from './components/MainStatusCard';
import { StatsCards } from './components/StatsCards';
import { ActivityChart } from './components/ActivityChart';
import { EventHistoryTable } from './components/EventHistoryTable';
import { DeviceStatusCard } from './components/DeviceStatusCard';
import { AddDeviceModal } from './components/AddDeviceModal';
import { api } from './services/api';
import { DoorStatus, Statistics, DoorEvent, DeviceItem } from './types';
import { AlertCircle, AlertTriangle, Bell, X } from 'lucide-react';
import { notificationManager } from './utils/notifications';

export const App: React.FC = () => {
  const [devices, setDevices] = useState<DeviceItem[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('esp32_main_gate');
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);

  const [status, setStatus] = useState<DoorStatus | null>(null);
  const [stats, setStats] = useState<Statistics | null>(null);
  const [events, setEvents] = useState<DoorEvent[]>([]);
  const [totalEvents, setTotalEvents] = useState<number>(0);
  const [eventPage, setEventPage] = useState<number>(1);
  const [eventLimit] = useState<number>(10);
  const [selectedSource, setSelectedSource] = useState<string>('');
  const [isBackendConnected, setIsBackendConnected] = useState<boolean>(true);
  const [isEventsLoading, setIsEventsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeToast, setActiveToast] = useState<{
    title: string;
    body: string;
    type: 'alert' | 'info';
  } | null>(null);

  useEffect(() => {
    return notificationManager.subscribeToast((toast) => {
      setActiveToast(toast);
      const timer = setTimeout(() => {
        setActiveToast((current) => (current === toast ? null : current));
      }, 5000);
      return () => clearTimeout(timer);
    });
  }, []);

  const prevDoorStateRef = useRef<string | null>(null);
  const isPollingRef = useRef<boolean>(false);

  // Fetch registered devices list
  const fetchDevices = useCallback(async () => {
    try {
      const res = await api.getDevices();
      setDevices(res.devices);
      if (res.devices.length > 0 && !res.devices.some(d => d.id === selectedDeviceId)) {
        setSelectedDeviceId(res.devices[0].id);
      }
    } catch (err) {
      console.error('Error fetching devices:', err);
    }
  }, [selectedDeviceId]);

  // Fetch full auxiliary data for selected device
  const fetchAuxiliaryData = useCallback(async () => {
    try {
      setIsEventsLoading(true);
      const [statsData, eventsData] = await Promise.all([
        api.getStats(selectedDeviceId),
        api.getEvents(eventPage, eventLimit, selectedSource, selectedDeviceId),
      ]);
      setStats(statsData);
      setEvents(eventsData.events);
      setTotalEvents(eventsData.total);
      setErrorMessage(null);
    } catch (err: any) {
      console.error('Failed to load stats/events:', err);
    } finally {
      setIsEventsLoading(false);
    }
  }, [eventPage, eventLimit, selectedSource, selectedDeviceId]);

  // Status polling loop (every 1 second)
  useEffect(() => {
    let isMounted = true;

    const pollStatus = async () => {
      if (isPollingRef.current) return;
      isPollingRef.current = true;

      try {
        const currentStatus = await api.getStatus(selectedDeviceId);
        if (!isMounted) return;

        setStatus(currentStatus);
        setIsBackendConnected(true);
        setErrorMessage(null);

        if (
          prevDoorStateRef.current !== null &&
          prevDoorStateRef.current !== currentStatus.current_state
        ) {
          fetchAuxiliaryData();
        }
        prevDoorStateRef.current = currentStatus.current_state;
      } catch (err: any) {
        if (!isMounted) return;
        setIsBackendConnected(false);
        setErrorMessage('Cannot communicate with Flask backend at http://localhost:5000. Retrying...');
      } finally {
        isPollingRef.current = false;
      }
    };

    pollStatus();
    const interval = setInterval(pollStatus, 1000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [selectedDeviceId, fetchAuxiliaryData]);

  // Fetch devices and auxiliary data on mount & device switch
  useEffect(() => {
    fetchDevices();
    fetchAuxiliaryData();
  }, [fetchDevices, fetchAuxiliaryData]);

  // Periodic refresh of devices and stats every 6s
  useEffect(() => {
    const auxInterval = setInterval(() => {
      fetchDevices();
      fetchAuxiliaryData();
    }, 6000);
    return () => clearInterval(auxInterval);
  }, [fetchDevices, fetchAuxiliaryData]);

  const handleThresholdUpdated = (newThreshold: number) => {
    if (status) {
      setStatus({ ...status, alert_threshold_seconds: newThreshold });
    }
    fetchAuxiliaryData();
  };

  const handleDeviceCreated = (newId: string) => {
    setSelectedDeviceId(newId);
    fetchDevices();
  };

  return (
    <div className="min-h-screen bg-white bg-dot-grid flex flex-col font-sans text-slate-800 selection:bg-emerald-500 selection:text-white">
      <Header
        status={status}
        devices={devices}
        selectedDeviceId={selectedDeviceId}
        onSelectDevice={setSelectedDeviceId}
        onOpenAddModal={() => setIsAddModalOpen(true)}
        isBackendConnected={isBackendConnected}
      />

      {/* Floating Push Alert & In-App Notification Toast */}
      {activeToast && (
        <div className="fixed top-16 sm:top-20 right-3 sm:right-6 z-50 max-w-sm w-full bg-white border border-slate-200/90 shadow-2xl rounded-2xl p-4 flex items-start space-x-3 animate-bounce">
          <div
            className={`p-2 rounded-xl flex-shrink-0 ${
              activeToast.type === 'alert'
                ? 'bg-rose-100 text-rose-600'
                : 'bg-emerald-100 text-emerald-600'
            }`}
          >
            {activeToast.type === 'alert' ? (
              <AlertTriangle className="w-5 h-5" />
            ) : (
              <Bell className="w-5 h-5" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-xs text-slate-900 truncate">{activeToast.title}</h4>
            <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">{activeToast.body}</p>
          </div>
          <button
            onClick={() => setActiveToast(null)}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <main className="flex-1 max-w-7xl w-full mx-auto p-3.5 sm:p-6 lg:p-8 space-y-4 sm:space-y-6">
        {/* Connection Failure Alert */}
        {!isBackendConnected && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-2xl flex items-center space-x-2.5 sm:space-x-3 text-xs sm:text-sm shadow-sm animate-pulse">
            <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 text-rose-500" />
            <span className="font-medium">
              {errorMessage || 'Connection to Flask backend lost. Ensure the backend server is running on port 5000.'}
            </span>
          </div>
        )}

        {/* 1. Main Status Card with Door Graphic, State, Live Timer, and Alert Threshold Selector */}
        <MainStatusCard
          status={status}
          onThresholdChanged={handleThresholdUpdated}
        />

        {/* 2. Key Metrics & Daily Statistics Cards */}
        <StatsCards stats={stats} />

        {/* 3. Activity Chart */}
        <ActivityChart activityData={stats?.activity_chart || []} />

        {/* 4. Real-time Persistent Event History Table & Activity Feed */}
        <EventHistoryTable
          events={events}
          total={totalEvents}
          page={eventPage}
          limit={eventLimit}
          isLoading={isEventsLoading}
          onPageChange={setEventPage}
          selectedSource={selectedSource}
          onSourceChange={(src) => {
            setSelectedSource(src);
            setEventPage(1);
          }}
          onRefresh={fetchAuxiliaryData}
        />

        {/* 5. Microcontroller & Node Telemetry Diagnostics */}
        <DeviceStatusCard status={status} />
      </main>

      {/* Add Device Modal */}
      <AddDeviceModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onDeviceCreated={handleDeviceCreated}
      />

      {/* Footer */}
      <footer className="border-t border-slate-200/80 bg-white/80 backdrop-blur-md py-3 sm:py-4 px-4 sm:px-6 text-center text-[11px] sm:text-xs text-slate-500 font-medium">
        <p>DoorGuard Smart Gate & Door Monitoring System — Real-Time IoT Microcontroller Platform</p>
      </footer>
    </div>
  );
};


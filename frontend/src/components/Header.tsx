import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Plus,
  Minus,
  Radio,
  Volume2,
  VolumeX,
  Bell,
  BellRing,
  Smartphone,
} from 'lucide-react';
import { DoorStatus, DeviceItem } from '../types';
import { soundManager } from '../utils/sound';
import { notificationManager } from '../utils/notifications';
import { pwaManager } from '../utils/pwa';
import { InstallPwaModal } from './InstallPwaModal';

interface HeaderProps {
  status: DoorStatus | null;
  devices: DeviceItem[];
  selectedDeviceId: string;
  onSelectDevice: (deviceId: string) => void;
  onOpenAddModal: () => void;
  isBackendConnected: boolean;
  isDeviceOnline?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  status,
  devices,
  selectedDeviceId,
  onSelectDevice,
  onOpenAddModal,
  isBackendConnected,
  isDeviceOnline = true,
}) => {
  const [isMuted, setIsMuted] = useState<boolean>(soundManager.getIsMuted());
  const [isAudioReady, setIsAudioReady] = useState<boolean>(soundManager.isReady());
  const [volume, setVolume] = useState<number>(soundManager.getVolume());
  const [hasNotifPermission, setHasNotifPermission] = useState<boolean>(
    notificationManager.getHasPermission()
  );
  const [canInstallPwa, setCanInstallPwa] = useState<boolean>(pwaManager.canInstall());
  const [isPwaInstalled, setIsPwaInstalled] = useState<boolean>(pwaManager.getIsInstalled());
  const [isInstallModalOpen, setIsInstallModalOpen] = useState<boolean>(false);

  useEffect(() => {
    const unsubSound = soundManager.subscribe((ready, vol, muted) => {
      setIsAudioReady(ready);
      if (vol !== undefined) setVolume(vol);
      if (muted !== undefined) setIsMuted(muted);
    });

    const unsubNotif = notificationManager.subscribe((hasPerm) => {
      setHasNotifPermission(hasPerm);
    });

    const unsubPwa = pwaManager.subscribe((can, installed) => {
      setCanInstallPwa(can);
      setIsPwaInstalled(installed);
    });

    return () => {
      unsubSound();
      unsubNotif();
      unsubPwa();
    };
  }, []);

  const handleToggleMute = () => {
    const nextMuted = soundManager.toggleMute();
    setIsMuted(nextMuted);
  };

  const handleIncreaseVolume = (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = soundManager.increaseVolume(15);
    setVolume(next);
  };

  const handleDecreaseVolume = (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = soundManager.decreaseVolume(15);
    setVolume(next);
  };

  const handleTestSound = (e: React.MouseEvent) => {
    e.stopPropagation();
    soundManager.playAlertTone();
  };

  const handleNotificationClick = async () => {
    if (hasNotifPermission) {
      // If already granted, test immediately to give instant visual feedback!
      await notificationManager.testNotification();
    } else {
      const granted = await notificationManager.requestPermission();
      setHasNotifPermission(granted);
    }
  };

  return (
    <>
      <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur-md sticky top-0 z-40 px-3.5 sm:px-6 lg:px-8 py-3 transition-colors">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-2.5 sm:gap-4">
          {/* Top / Main Row: Brand & Quick Action Pills */}
          <div className="flex items-center justify-between w-full md:w-auto">
            {/* Brand & Subtitle */}
            <div className="flex items-center space-x-2.5 sm:space-x-3.5">
              <div className="p-2 sm:p-2.5 bg-emerald-50 border border-emerald-200/80 rounded-xl text-emerald-600 shadow-sm flex items-center justify-center flex-shrink-0">
                <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.2]" />
              </div>
              <div>
                <div className="flex items-center space-x-1.5 sm:space-x-2">
                  <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-slate-900">
                    DoorGuard
                  </h1>
                  <span
                    className={`px-1.5 py-0.5 text-[10px] sm:text-[11px] font-bold tracking-wide rounded-full border transition-colors ${
                      isDeviceOnline
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                        : 'bg-rose-100 text-rose-800 border-rose-200'
                    }`}
                  >
                    {isDeviceOnline ? 'LIVE' : 'OFFLINE'}
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-500 font-medium hidden xs:block">
                  Smart Gate & Door Monitoring
                </p>
              </div>
            </div>

            {/* Mobile-only Quick Status, Sound, PWA & Push toggles right-aligned */}
            <div className="flex items-center space-x-1.5 md:hidden">
              {/* Install PWA Button (Mobile) */}
              {!isPwaInstalled && (
                <button
                  type="button"
                  onClick={() => setIsInstallModalOpen(true)}
                  className="p-2 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 active:scale-95 transition-transform"
                  title="Add to Home Screen (Install App)"
                >
                  <Smartphone className="w-4 h-4 text-emerald-600" />
                </button>
              )}

              {/* Mobile Sound Mute & Volume Quick Control */}
              <div className="flex items-center space-x-1">
                <button
                  onClick={handleToggleMute}
                  className={`p-2 rounded-xl border transition-all ${
                    isMuted
                      ? 'bg-slate-100 text-slate-400 border-slate-200'
                      : !isAudioReady
                      ? 'bg-amber-50 text-amber-700 border-amber-300 animate-pulse'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}
                  title={
                    isMuted
                      ? 'Sound muted. Tap to enable.'
                      : !isAudioReady
                      ? 'Tap to enable siren audio'
                      : 'Siren active. Tap to mute.'
                  }
                >
                  {isMuted ? (
                    <VolumeX className="w-4 h-4" />
                  ) : (
                    <Volume2 className="w-4 h-4 text-emerald-600" />
                  )}
                </button>

                {!isMuted && (
                  <button
                    type="button"
                    onClick={handleIncreaseVolume}
                    className="px-2 py-1.5 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 font-mono font-bold text-[11px] active:scale-95 transition-transform"
                    title="Tap to cycle/increase volume"
                  >
                    {volume}%
                  </button>
                )}
              </div>

              {/* Mobile Push Notification Toggle */}
              <button
                onClick={handleNotificationClick}
                className={`p-2 rounded-xl border transition-all ${
                  hasNotifPermission
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-slate-100 text-slate-400 border-slate-200'
                }`}
                title={
                  hasNotifPermission
                    ? 'Push alerts active! Tap to test alert notification.'
                    : 'Tap to allow browser push notifications'
                }
              >
                {hasNotifPermission ? (
                  <BellRing className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Bell className="w-4 h-4" />
                )}
              </button>

              {/* Connection Indicator */}
              <div
                className={`p-2 rounded-xl border flex items-center justify-center ${
                  isBackendConnected
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border-rose-200'
                }`}
                title={isBackendConnected ? 'Server connected' : 'Server offline'}
              >
                <Radio
                  className={`w-4 h-4 ${
                    isBackendConnected ? 'text-emerald-600 animate-pulse' : 'text-rose-500'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Right Area (Desktop) / Second Row (Mobile): Node Switcher & Actions */}
          <div className="flex items-center justify-between md:justify-end gap-2 w-full md:w-auto overflow-x-auto no-scrollbar py-0.5">
            {/* Device Tabs / Active Node Chip */}
            {devices.length <= 1 ? (
              <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-100/90 border border-slate-200/90 text-xs font-bold text-slate-800 shadow-sm flex-shrink-0">
                <span
                  className={`w-2 h-2 rounded-full ${
                    !isDeviceOnline
                      ? 'bg-rose-500'
                      : status?.current_state === 'OPEN'
                      ? 'bg-rose-500 animate-pulse'
                      : 'bg-emerald-500'
                  }`}
                />
                <span className="truncate max-w-[130px] sm:max-w-none">
                  {devices[0]?.name || 'Main Gate'} {!isDeviceOnline && '(Offline)'}
                </span>
                <span className="text-[10px] text-slate-400 font-mono font-normal hidden sm:inline">
                  ({devices[0]?.id || 'esp32_main_gate'})
                </span>
              </div>
            ) : (
              <div className="flex items-center space-x-1 p-1 bg-slate-100/80 border border-slate-200/80 rounded-xl overflow-x-auto flex-shrink-0">
                {devices.map((d) => {
                  const isSelected = d.id === selectedDeviceId;
                  const isDoorOpen = d.current_state === 'OPEN';
                  return (
                    <button
                      key={d.id}
                      onClick={() => onSelectDevice(d.id)}
                      className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                        isSelected
                          ? 'bg-white text-slate-900 shadow-sm border border-slate-200/90'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          isDoorOpen ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'
                        }`}
                      />
                      <span>{d.name}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Install PWA Button (Desktop) */}
            {!isPwaInstalled && (
              <button
                type="button"
                onClick={() => setIsInstallModalOpen(true)}
                className="hidden md:flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-emerald-300 bg-emerald-50/80 hover:bg-emerald-100 text-emerald-800 text-xs font-bold shadow-sm transition-all flex-shrink-0"
                title="Install DoorGuard on your desktop / home screen"
              >
                <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
                <span>Install App</span>
              </button>
            )}

            {/* Add Device Button */}
            <button
              onClick={onOpenAddModal}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl font-semibold text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm hover:shadow transition-all flex-shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Add Device</span>
              <span className="xs:hidden">Add</span>
            </button>

            {/* Desktop-only Sound Alarm & Volume Control Group */}
            <div className="hidden md:flex items-center space-x-1 p-0.5 rounded-xl border border-slate-200/90 bg-slate-50/70 text-xs font-semibold flex-shrink-0">
              {/* Mute / Unmute Button */}
              <button
                onClick={handleToggleMute}
                className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all ${
                  isMuted
                    ? 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200/70'
                    : !isAudioReady
                    ? 'bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100 animate-pulse'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                }`}
                title={
                  isMuted
                    ? 'Alert sound muted. Click to enable alarm beeps.'
                    : !isAudioReady
                    ? 'Click to activate browser siren audio'
                    : 'Alert sound active. Click to mute.'
                }
              >
                {isMuted ? (
                  <VolumeX className="w-3.5 h-3.5 text-slate-400" />
                ) : (
                  <Volume2 className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                )}
                <span>{isMuted ? 'Muted' : !isAudioReady ? 'Enable Siren' : 'Siren ON'}</span>
              </button>

              {/* Volume Adjustment Buttons (Visible when unmuted) */}
              {!isMuted && (
                <div className="flex items-center space-x-1 pl-1 pr-1.5 text-slate-600">
                  <button
                    type="button"
                    onClick={handleDecreaseVolume}
                    disabled={volume <= 10}
                    className="p-1 rounded hover:bg-slate-200 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                    title="Decrease Volume"
                  >
                    <Minus className="w-3 h-3 text-slate-600" />
                  </button>

                  <button
                    type="button"
                    onClick={handleTestSound}
                    className="px-1.5 py-0.5 rounded font-mono font-bold text-[11px] text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 transition-colors"
                    title="Click to play loud test siren"
                  >
                    {volume}%
                  </button>

                  <button
                    type="button"
                    onClick={handleIncreaseVolume}
                    disabled={volume >= 100}
                    className="p-1 rounded hover:bg-slate-200 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                    title="Increase Volume (Max 100%)"
                  >
                    <Plus className="w-3 h-3 text-slate-600" />
                  </button>
                </div>
              )}
            </div>

            {/* Desktop Push Notification Toggle */}
            <button
              onClick={handleNotificationClick}
              className={`hidden md:flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all flex-shrink-0 ${
                hasNotifPermission
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                  : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200/70'
              }`}
              title={
                hasNotifPermission
                  ? 'Push notifications active! Click to test alert notification.'
                  : 'Click to enable native system push alerts.'
              }
            >
              {hasNotifPermission ? (
                <BellRing className="w-3.5 h-3.5 text-emerald-600 animate-bounce" />
              ) : (
                <Bell className="w-3.5 h-3.5 text-slate-400" />
              )}
              <span>{hasNotifPermission ? 'Push Alerts ON' : 'Enable Push'}</span>
            </button>

            {/* Desktop-only Connection Pill */}
            <div
              className={`hidden md:flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold flex-shrink-0 ${
                isBackendConnected
                  ? 'bg-emerald-50/70 text-emerald-700 border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border-rose-200'
              }`}
            >
              <Radio
                className={`w-3.5 h-3.5 ${
                  isBackendConnected ? 'text-emerald-600 animate-pulse' : 'text-rose-500'
                }`}
              />
              <span>{isBackendConnected ? 'System Online' : 'Offline'}</span>
            </div>
          </div>
        </div>
      </header>

      {/* PWA 'Add to Home Screen' Modal */}
      <InstallPwaModal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
        canInstallPrompt={canInstallPwa}
      />
    </>
  );
};

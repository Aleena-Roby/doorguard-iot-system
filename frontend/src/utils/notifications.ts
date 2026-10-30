class NotificationManager {
  private hasPermission: boolean = false;
  private isSupported: boolean = false;
  private lastAlertTimestamp: number = 0;
  private toastListeners: Set<(toast: { title: string; body: string; type: 'alert' | 'info' }) => void> = new Set();
  private subscribers: Set<(hasPerm: boolean) => void> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      this.isSupported = 'Notification' in window;
      if (this.isSupported) {
        this.hasPermission = Notification.permission === 'granted';
      }
    }
  }

  public subscribe(listener: (hasPerm: boolean) => void) {
    this.subscribers.add(listener);
    listener(this.hasPermission);
    return () => {
      this.subscribers.delete(listener);
    };
  }

  private notifySubscribers() {
    this.subscribers.forEach((fn) => fn(this.hasPermission));
  }

  public getIsSupported(): boolean {
    return this.isSupported;
  }

  public getHasPermission(): boolean {
    return this.hasPermission;
  }

  public subscribeToast(listener: (toast: { title: string; body: string; type: 'alert' | 'info' }) => void) {
    this.toastListeners.add(listener);
    return () => {
      this.toastListeners.delete(listener);
    };
  }

  private triggerToast(title: string, body: string, type: 'alert' | 'info' = 'alert') {
    this.toastListeners.forEach((fn) => fn({ title, body, type }));
  }

  public async requestPermission(): Promise<boolean> {
    if (!this.isSupported) {
      this.triggerToast('Notifications Unsupported', 'Your browser or origin does not support native push notifications.', 'info');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      this.hasPermission = permission === 'granted';
      this.notifySubscribers();

      if (this.hasPermission) {
        await this.sendNotification(
          '🔔 DoorGuard Alerts Enabled',
          'You will now receive instant push alerts if any door or gate is left open.',
          'doorguard-welcome'
        );
      } else if (permission === 'denied') {
        this.triggerToast('Permission Blocked', 'Please allow notifications in your browser site settings.', 'info');
      }
      return this.hasPermission;
    } catch (e) {
      console.warn('Notification permission error:', e);
      return false;
    }
  }

  public async testNotification() {
    this.triggerToast('🔔 Testing Push Alerts', 'Dispatching sample security alert...', 'info');

    if (!this.hasPermission) {
      const granted = await this.requestPermission();
      if (!granted) return;
    }

    await this.sendNotification(
      '🔔 DoorGuard Alert Active',
      'Push notification test successful! Security alerts are working on this device.',
      'doorguard-test'
    );
  }

  public sendDoorAlert(deviceName: string, durationSeconds: number, thresholdSeconds: number) {
    const now = Date.now();
    // Rate-limit both in-app banner and OS tray alerts to avoid UI contention while alarm is sounding
    if (now - this.lastAlertTimestamp < 10000) return;
    this.lastAlertTimestamp = now;

    const overdue = Math.max(0, Math.round(durationSeconds - thresholdSeconds));
    const title = `⚠️ SECURITY ALERT: ${deviceName} OPEN!`;
    const body = `${deviceName} has been open for ${Math.round(durationSeconds)}s (+${overdue}s beyond safe limit). Tap to inspect.`;

    // Trigger visual in-app banner
    this.triggerToast(title, body, 'alert');

    if (!this.hasPermission || !this.isSupported) return;
    this.sendNotification(title, body, 'doorguard-gate-alert');
  }

  public clearAlert() {
    this.lastAlertTimestamp = 0;
  }

  private async sendNotification(title: string, body: string, tag: string) {
    const options: any = {
      body,
      icon: '/pwa-192.png',
      badge: '/icon.svg',
      tag,
      vibrate: [200, 100, 200, 100, 400],
      requireInteraction: false,
    };

    // 1. Service Worker showNotification (Mandatory for Android Chrome & mobile PWA)
    if ('serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.ready;
        if (reg && reg.showNotification) {
          await reg.showNotification(title, options);
          return;
        }
      } catch (err) {
        console.warn('ServiceWorker showNotification failed, trying fallback:', err);
      }
    }

    // 2. Fallback to standard window Notification (Desktop browsers)
    try {
      if ('Notification' in window && Notification.permission === 'granted') {
        const notif = new Notification(title, options);
        notif.onclick = () => {
          window.focus();
          notif.close();
        };
      }
    } catch (e) {
      console.warn('Native Notification fallback failed:', e);
    }
  }
}

export const notificationManager = new NotificationManager();

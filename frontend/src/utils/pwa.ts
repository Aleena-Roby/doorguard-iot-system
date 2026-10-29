// PWA Installation & 'Add to Home Screen' Manager
class PwaManager {
  private deferredPrompt: any = null;
  private isInstalled: boolean = false;
  private subscribers: Set<(canInstall: boolean, isInstalled: boolean) => void> = new Set();

  constructor() {
    if (typeof window === 'undefined') return;

    // Detect if already running as installed standalone PWA
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://');

    this.isInstalled = isStandalone;

    window.addEventListener('beforeinstallprompt', (e: any) => {
      // Prevent browser default mini-infobar
      e.preventDefault();
      this.deferredPrompt = e;
      this.notifySubscribers();
    });

    window.addEventListener('appinstalled', () => {
      this.isInstalled = true;
      this.deferredPrompt = null;
      this.notifySubscribers();
    });
  }

  public subscribe(listener: (canInstall: boolean, isInstalled: boolean) => void) {
    this.subscribers.add(listener);
    listener(this.canInstall(), this.isInstalled);
    return () => {
      this.subscribers.delete(listener);
    };
  }

  private notifySubscribers() {
    const can = this.canInstall();
    const installed = this.isInstalled;
    this.subscribers.forEach((fn) => fn(can, installed));
  }

  public canInstall(): boolean {
    return !this.isInstalled && this.deferredPrompt !== null;
  }

  public getIsInstalled(): boolean {
    return this.isInstalled;
  }

  public async triggerInstall(): Promise<'accepted' | 'dismissed' | 'manual_instructions'> {
    if (this.deferredPrompt) {
      try {
        this.deferredPrompt.prompt();
        const choice = await this.deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          this.isInstalled = true;
          this.deferredPrompt = null;
          this.notifySubscribers();
          return 'accepted';
        }
        return 'dismissed';
      } catch (err) {
        console.warn('PWA install prompt error:', err);
      }
    }
    return 'manual_instructions';
  }
}

export const pwaManager = new PwaManager();


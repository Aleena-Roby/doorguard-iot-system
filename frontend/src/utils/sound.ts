// Web Audio API Sound Synthesizer with Autoplay User-Gesture Compliance & Volume Boost
class SoundManager {
  private audioCtx: AudioContext | null = null;
  private isMuted: boolean = false;
  private volume: number = 1.0; // 0.1 to 1.0 (default: 100% maximum volume)
  private isUnlocked: boolean = false;
  private isAlarmLoopActive: boolean = false;
  private intervalId: any = null;
  private subscribers: Set<(isUnlocked: boolean, volume?: number, isMuted?: boolean) => void> = new Set();
  private gestureListenersAttached: boolean = false;

  constructor() {
    // Check localStorage for muted preference
    const savedMute = localStorage.getItem('doorguard_sound_muted');
    if (savedMute !== null) {
      this.isMuted = savedMute === 'true';
    }

    // Check localStorage for volume preference (defaults to 100% full volume)
    const savedVol = localStorage.getItem('doorguard_sound_volume');
    if (savedVol !== null) {
      const parsed = parseInt(savedVol, 10);
      if (!isNaN(parsed) && parsed >= 10 && parsed <= 100) {
        this.volume = parsed / 100;
      }
    }

    this.attachGestureListeners();
  }

  // Attach one-time window listeners to unlock AudioContext on genuine user interaction
  private attachGestureListeners() {
    if (typeof window === 'undefined' || this.gestureListenersAttached) return;
    this.gestureListenersAttached = true;

    const events = ['click', 'touchstart', 'pointerdown', 'keydown'];
    const handleGesture = () => {
      this.unlockAudio();
      events.forEach((evt) => {
        window.removeEventListener(evt, handleGesture, true);
      });
    };

    events.forEach((evt) => {
      window.addEventListener(evt, handleGesture, { capture: true, once: true });
    });
  }

  // Subscribe React components to audio unlock & volume status
  public subscribe(listener: (isUnlocked: boolean, volume?: number, isMuted?: boolean) => void) {
    this.subscribers.add(listener);
    listener(this.isReady(), this.getVolume(), this.isMuted);
    return () => {
      this.subscribers.delete(listener);
    };
  }

  private notifySubscribers() {
    const ready = this.isReady();
    const vol = this.getVolume();
    const muted = this.isMuted;
    this.subscribers.forEach((fn) => fn(ready, vol, muted));
  }

  public isReady(): boolean {
    return this.isUnlocked && !!this.audioCtx && this.audioCtx.state === 'running';
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public getVolume(): number {
    return Math.round(this.volume * 100);
  }

  public setVolume(percent: number) {
    const clamped = Math.max(10, Math.min(100, Math.round(percent)));
    this.volume = clamped / 100;
    localStorage.setItem('doorguard_sound_volume', String(clamped));
    this.notifySubscribers();
    if (!this.isMuted) {
      this.playTestBeep();
    }
  }

  public increaseVolume(step: number = 20): number {
    const next = Math.min(100, this.getVolume() + step);
    this.setVolume(next);
    return next;
  }

  public decreaseVolume(step: number = 20): number {
    const next = Math.max(10, this.getVolume() - step);
    this.setVolume(next);
    return next;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    localStorage.setItem('doorguard_sound_muted', muted ? 'true' : 'false');
    if (muted) {
      this.stopAlarmLoop();
    }
    this.notifySubscribers();
  }

  public toggleMute(): boolean {
    this.unlockAudio();
    const nextMuted = !this.isMuted;
    this.setMuted(nextMuted);
    if (!nextMuted) {
      this.playTestBeep();
    }
    return nextMuted;
  }

  // Safely unlocks and resumes the AudioContext on user interaction
  public unlockAudio() {
    if (typeof window === 'undefined') return;

    try {
      if (!this.audioCtx) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          this.audioCtx = new AudioContextClass();
        }
      }

      if (this.audioCtx) {
        if (this.audioCtx.state === 'suspended') {
          this.audioCtx
            .resume()
            .then(() => {
              this.isUnlocked = true;
              this.notifySubscribers();
              if (this.isAlarmLoopActive && !this.isMuted) {
                this.playAlertTone();
              }
            })
            .catch(() => {
              // Silently catch if browser still rejected
            });
        } else if (this.audioCtx.state === 'running') {
          this.isUnlocked = true;
          this.notifySubscribers();
          if (this.isAlarmLoopActive && !this.isMuted) {
            this.playAlertTone();
          }
        }
      }
    } catch (e) {
      console.warn('Audio unlock warning:', e);
    }
  }

  // High-Volume, Piercing Dual-Tone Security Siren with Dynamics Compressor
  public playAlertTone() {
    if (this.isMuted) return;
    if (!this.audioCtx || this.audioCtx.state !== 'running') {
      return;
    }

    try {
      const ctx = this.audioCtx;
      const now = ctx.currentTime;

      // 1. Dynamics Compressor to maximize acoustic loudness while preventing digital clipping
      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.setValueAtTime(-12, now);
      compressor.knee.setValueAtTime(6, now);
      compressor.ratio.setValueAtTime(6, now);
      compressor.attack.setValueAtTime(0.003, now);
      compressor.release.setValueAtTime(0.12, now);
      compressor.connect(ctx.destination);

      // 2. High-output master gain (scaled by user's volume setting)
      const masterGain = ctx.createGain();
      const effectiveVol = Math.max(0.1, Math.min(1.0, this.volume));
      masterGain.gain.setValueAtTime(effectiveVol * 0.95, now);
      masterGain.connect(compressor);

      // 3. Tone 1: High warning sweep (920 Hz -> 1180 Hz) - Sharp penetrating wave
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(920, now);
      osc1.frequency.exponentialRampToValueAtTime(1180, now + 0.14);

      gain1.gain.setValueAtTime(0, now);
      gain1.gain.linearRampToValueAtTime(0.85, now + 0.02);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

      osc1.connect(gain1);
      gain1.connect(masterGain);

      osc1.start(now);
      osc1.stop(now + 0.17);

      // 4. Tone 2: Resonant urgency chirp (720 Hz -> 880 Hz)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(720, now + 0.16);
      osc2.frequency.exponentialRampToValueAtTime(880, now + 0.32);

      gain2.gain.setValueAtTime(0, now + 0.16);
      gain2.gain.linearRampToValueAtTime(0.9, now + 0.18);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.36);

      osc2.connect(gain2);
      gain2.connect(masterGain);

      osc2.start(now + 0.16);
      osc2.stop(now + 0.38);
    } catch (e) {
      console.warn('AudioContext playback error:', e);
    }
  }

  // Quick confirmation beep when adjusting volume or unmuting
  public playTestBeep() {
    if (!this.audioCtx || this.audioCtx.state !== 'running') {
      this.unlockAudio();
      return;
    }

    try {
      const ctx = this.audioCtx;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(659.25, now); // E5 note

      const effectiveVol = Math.max(0.1, Math.min(1.0, this.volume));
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(effectiveVol * 0.75, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.16);
    } catch {}
  }

  // Starts continuous alarm pulses while alert is active
  public startAlarmLoop() {
    this.isAlarmLoopActive = true;
    if (this.intervalId) return;

    if (this.isReady()) {
      this.playAlertTone();
    }

    this.intervalId = setInterval(() => {
      if (this.isReady() && this.isAlarmLoopActive) {
        this.playAlertTone();
      }
    }, 1300);
  }

  // Stops immediately when door/gate is closed or alert clears
  public stopAlarmLoop() {
    this.isAlarmLoopActive = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}

export const soundManager = new SoundManager();

/**
 * Townsaver — Native Web Audio API 8-Bit Synthesizer (Milestone 2)
 * Zero external audio assets; procedural oscillators + deterministic LCG white-noise buffers.
 */

export type WeaponSoundType = 'single' | 'double' | 'heavy';

export type SoundTriggerEffect =
  | 'bow_single'
  | 'bow_double'
  | 'bow_heavy'
  | 'enemy_hit'
  | 'wood_shatter'
  | 'piercing_shatter'
  | 'metallic_clang'
  | 'arrow_clip_buzz'
  | 'stage_clear'
  | 'town_breached'
  | 'enemy_throw'
  | 'player_hurt'
  | 'pickup_item'
  | 'sanctum_unlock'
  | 'story_advance';

export class SoundSystem {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private muted = false;
  private unlocked = false;

  // Diagnostic telemetry for automated verification (window.__TOWNSAVER__)
  public lastSoundPlayed: string | null = null;
  public soundPlayCount = 0;
  public readonly soundHistory: string[] = [];

  constructor() {
    this.installFirstInteractionUnlock();
  }

  /**
   * Automatically unlocks/resumes Web Audio context on first user gesture
   */
  private installFirstInteractionUnlock(): void {
    if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') return;
    const unlockHandler = () => {
      void this.unlock();
    };
    window.addEventListener('pointerdown', unlockHandler, { once: true, passive: true });
    window.addEventListener('keydown', unlockHandler, { once: true, passive: true });
  }

  /**
   * Lazily initializes or resumes the AudioContext
   */
  public async unlock(): Promise<void> {
    const context = this.ensureContext();
    if (!context) return;
    try {
      if (context.state === 'suspended') {
        await context.resume();
      }
      this.unlocked = true;
    } catch {
      // Ignore autoplay restrictions in headless environments
    }
  }

  private ensureContext(): AudioContext | null {
    if (this.ctx) return this.ctx;
    if (typeof window === 'undefined') return null;

    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;

    try {
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.muted ? 0 : 0.65, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
      this.noiseBuffer = this.createWhiteNoiseBuffer(this.ctx, 0.5);
      return this.ctx;
    } catch {
      return null;
    }
  }

  /**
   * Generates a reusable 0.5s white-noise AudioBuffer using a deterministic LCG PRNG
   * for percussion, fletching snaps, and wood-splinter bursts.
   */
  private createWhiteNoiseBuffer(context: AudioContext, durationSec: number): AudioBuffer {
    const sampleRate = context.sampleRate || 44100;
    const length = Math.max(1, Math.floor(sampleRate * durationSec));
    const buffer = context.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    let seed = 0x1337beef;
    for (let i = 0; i < length; i++) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      data[i] = (seed / 0xffffffff) * 2 - 1;
    }
    return buffer;
  }

  /**
   * Records sound telemetry synchronously and returns active AudioContext if unmuted.
   */
  private beginSound(soundId: string): AudioContext | null {
    if (this.muted) {
      return null;
    }
    this.lastSoundPlayed = soundId;
    this.soundPlayCount += 1;
    this.soundHistory.push(soundId);
    if (this.soundHistory.length > 32) {
      this.soundHistory.shift();
    }

    const context = this.ensureContext();
    if (!context) return null;
    if (context.state === 'suspended') {
      void context.resume().catch(() => {});
    }
    this.unlocked = true;
    return context;
  }

  private scheduleTone(
    context: AudioContext,
    type: OscillatorType,
    startFreq: number,
    endFreq: number,
    startTime: number,
    duration: number,
    peakGain: number
  ): void {
    if (!this.masterGain) return;
    const osc = context.createOscillator();
    const gain = context.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(20, startFreq), startTime);
    if (Math.abs(startFreq - endFreq) > 0.5) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), startTime + duration);
    }

    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(peakGain, startTime + Math.min(0.006, duration * 0.2));
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.onended = () => {
      try {
        osc.disconnect();
        gain.disconnect();
      } catch {
        // Ignore
      }
    };

    osc.start(startTime);
    osc.stop(startTime + duration + 0.005);
  }

  private scheduleNoise(
    context: AudioContext,
    filterType: BiquadFilterType,
    startFreq: number,
    endFreq: number,
    q: number,
    startTime: number,
    duration: number,
    peakGain: number
  ): void {
    if (!this.masterGain || !this.noiseBuffer) return;
    const src = context.createBufferSource();
    src.buffer = this.noiseBuffer;

    const filter = context.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.setValueAtTime(Math.max(40, startFreq), startTime);
    if (Math.abs(startFreq - endFreq) > 1) {
      filter.frequency.exponentialRampToValueAtTime(Math.max(40, endFreq), startTime + duration);
    }
    filter.Q.setValueAtTime(q, startTime);

    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(peakGain, startTime + Math.min(0.005, duration * 0.15));
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    src.onended = () => {
      try {
        src.disconnect();
        filter.disconnect();
        gain.disconnect();
      } catch {
        // Ignore
      }
    };

    src.start(startTime);
    src.stop(startTime + duration + 0.005);
  }

  /**
   * 1. Bow release sound tailored to active weapon variation:
   * - 'single': Crisp bowstring twang + high-frequency fletching snap
   * - 'double': Dual-harmonic staggered twang (22ms spread)
   * - 'heavy':  Great Arrow booming cannon-bow blast + fiery noise burst
   */
  public playBowRelease(weaponType: WeaponSoundType = 'single'): void {
    const context = this.beginSound(`bow_release:${weaponType}`);
    if (!context) return;

    try {
      const now = context.currentTime;
      if (weaponType === 'single') {
        this.scheduleTone(context, 'triangle', 640, 190, now, 0.09, 0.28);
        this.scheduleNoise(context, 'highpass', 1800, 1800, 1.0, now, 0.018, 0.14);
      } else if (weaponType === 'double') {
        this.scheduleTone(context, 'triangle', 640, 190, now, 0.085, 0.25);
        this.scheduleNoise(context, 'highpass', 2000, 2000, 1.2, now, 0.016, 0.12);
        this.scheduleTone(context, 'square', 880, 260, now + 0.022, 0.09, 0.20);
        this.scheduleNoise(context, 'highpass', 2200, 2200, 1.2, now + 0.022, 0.018, 0.12);
      } else {
        this.scheduleTone(context, 'sawtooth', 180, 42, now, 0.28, 0.36);
        this.scheduleTone(context, 'square', 320, 65, now, 0.18, 0.24);
        this.scheduleNoise(context, 'lowpass', 950, 220, 1.4, now, 0.26, 0.28);
      }
    } catch {
      // Safe fallback in restricted audio contexts
    }
  }

  /**
   * 2. Punchy retro square-wave impact pop on enemy/crate hit
   */
  public playEnemyHit(): void {
    const context = this.beginSound('enemy_hit');
    if (!context) return;

    try {
      const now = context.currentTime;
      this.scheduleTone(context, 'square', 520, 140, now, 0.085, 0.30);
      this.scheduleTone(context, 'triangle', 180, 60, now, 0.07, 0.22);
    } catch {
      // Safe fallback
    }
  }

  /**
   * 3. Splintering noise burst + heavy crunch for Wood Palisade drag or Great Arrow Piercing Shatter
   */
  public playWoodShatter(piercing = false): void {
    const context = this.beginSound(piercing ? 'wood_shatter:piercing' : 'wood_shatter:normal');
    if (!context) return;

    try {
      const now = context.currentTime;
      if (!piercing) {
        this.scheduleTone(context, 'triangle', 160, 70, now, 0.08, 0.22);
        this.scheduleNoise(context, 'bandpass', 1100, 750, 2.5, now, 0.095, 0.25);
      } else {
        this.scheduleTone(context, 'sawtooth', 240, 48, now, 0.22, 0.34);
        this.scheduleTone(context, 'square', 920, 210, now + 0.015, 0.14, 0.22);
        this.scheduleNoise(context, 'bandpass', 1800, 420, 1.8, now, 0.24, 0.35);
      }
    } catch {
      // Safe fallback
    }
  }

  /**
   * 4. High-pitched metallic inharmonic clang on Blue-Iron Block deflection (Fail Condition 1)
   */
  public playMetallicClang(): void {
    const context = this.beginSound('metallic_clang');
    if (!context) return;

    try {
      const now = context.currentTime;
      this.scheduleTone(context, 'square', 1046.5, 1046.5, now, 0.22, 0.22);
      this.scheduleTone(context, 'sawtooth', 1480, 1420, now, 0.25, 0.18);
      this.scheduleTone(context, 'sawtooth', 2217, 2150, now, 0.19, 0.15);
      this.scheduleTone(context, 'triangle', 1760, 620, now + 0.02, 0.18, 0.20);
      this.scheduleNoise(context, 'highpass', 3200, 3200, 2.0, now, 0.035, 0.22);
    } catch {
      // Safe fallback
    }
  }

  /**
   * 5. Harsh sawtooth clash buzz on arrow-on-arrow clip (Fail Condition 2)
   */
  public playArrowClipBuzz(): void {
    const context = this.beginSound('arrow_clip_buzz');
    if (!context) return;

    try {
      const now = context.currentTime;
      this.scheduleTone(context, 'sawtooth', 145, 92, now, 0.21, 0.26);
      this.scheduleTone(context, 'sawtooth', 158, 98, now, 0.21, 0.26);
      this.scheduleTone(context, 'square', 780, 180, now, 0.045, 0.22);
      this.scheduleNoise(context, 'bandpass', 850, 600, 3.0, now, 0.12, 0.18);
    } catch {
      // Safe fallback
    }
  }

  /**
   * 6. Royal fanfare arpeggio when Adrian & The Queen celebrate stage clear
   */
  public playStageClear(): void {
    const context = this.beginSound('stage_clear');
    if (!context) return;

    try {
      const now = context.currentTime;
      const notes = [
        { freq: 523.25, harmony: 261.63, offset: 0.0, dur: 0.11 },  // C5 + C4
        { freq: 659.25, harmony: 329.63, offset: 0.11, dur: 0.11 }, // E5 + E4
        { freq: 783.99, harmony: 392.00, offset: 0.22, dur: 0.11 }, // G5 + G4
        { freq: 1046.50, harmony: 523.25, offset: 0.33, dur: 0.29 } // C6 + C5
      ];
      for (const n of notes) {
        this.scheduleTone(context, 'square', n.freq, n.freq, now + n.offset, n.dur, 0.24);
        this.scheduleTone(context, 'triangle', n.harmony, n.harmony, now + n.offset, n.dur, 0.18);
      }
    } catch {
      // Safe fallback
    }
  }

  /**
   * 7. Dramatic descending minor cadence on 0-heart town breach
   */
  public playTownBreached(): void {
    const context = this.beginSound('town_breached');
    if (!context) return;

    try {
      const now = context.currentTime;
      const notes = [
        { start: 440.00, end: 430.00, sub: 220.00, offset: 0.0, dur: 0.16 },  // A4
        { start: 349.23, end: 340.00, sub: 174.61, offset: 0.16, dur: 0.16 }, // F4
        { start: 293.66, end: 285.00, sub: 146.83, offset: 0.32, dur: 0.16 }, // D4
        { start: 220.00, end: 196.00, sub: 110.00, offset: 0.48, dur: 0.27 }, // A3 -> G3
      ];
      for (const n of notes) {
        this.scheduleTone(context, 'sawtooth', n.start, n.end, now + n.offset, n.dur, 0.26);
        this.scheduleTone(context, 'triangle', n.sub, n.sub * 0.95, now + n.offset, n.dur, 0.20);
      }
      this.scheduleNoise(context, 'lowpass', 280, 110, 1.5, now + 0.48, 0.27, 0.20);
    } catch {
      // Safe fallback
    }
  }

  /**
   * 8. Enemy dagger / fireball throw whoosh
   */
  public playEnemyThrow(kind: 'dagger' | 'fireball' = 'dagger'): void {
    const context = this.beginSound(`enemy_throw:${kind}`);
    if (!context) return;

    try {
      const now = context.currentTime;
      if (kind === 'dagger') {
        this.scheduleTone(context, 'triangle', 920, 340, now, 0.075, 0.16);
        this.scheduleNoise(context, 'highpass', 2400, 1200, 1.4, now, 0.05, 0.12);
      } else {
        this.scheduleTone(context, 'sawtooth', 310, 120, now, 0.12, 0.18);
        this.scheduleNoise(context, 'bandpass', 900, 380, 1.6, now, 0.13, 0.2);
      }
    } catch {
      // Safe fallback
    }
  }

  /**
   * 9. Player hurt crunch when hit by goblin projectile, bat swoop, or floor spike
   */
  public playPlayerHurt(): void {
    const context = this.beginSound('player_hurt');
    if (!context) return;

    try {
      const now = context.currentTime;
      this.scheduleTone(context, 'sawtooth', 260, 75, now, 0.18, 0.3);
      this.scheduleTone(context, 'square', 190, 58, now + 0.02, 0.16, 0.24);
      this.scheduleNoise(context, 'lowpass', 720, 180, 1.5, now, 0.15, 0.24);
    } catch {
      // Safe fallback
    }
  }

  /**
   * 10. Bright retro power-up chime when collecting crate quiver or heart potion
   */
  public playPickup(): void {
    const context = this.beginSound('pickup_item');
    if (!context) return;

    try {
      const now = context.currentTime;
      this.scheduleTone(context, 'square', 587.33, 587.33, now, 0.06, 0.2);
      this.scheduleTone(context, 'square', 880, 880, now + 0.06, 0.1, 0.22);
      this.scheduleTone(context, 'triangle', 1174.66, 1174.66, now + 0.11, 0.12, 0.18);
    } catch {
      // Safe fallback
    }
  }

  /**
   * 11. Heavy iron portcullis slide + royal bell chime when Top Sanctum Gate unlocks
   */
  public playSanctumUnlock(): void {
    const context = this.beginSound('sanctum_unlock');
    if (!context) return;

    try {
      const now = context.currentTime;
      this.scheduleNoise(context, 'lowpass', 480, 220, 1.2, now, 0.16, 0.2);
      this.scheduleTone(context, 'triangle', 523.25, 659.25, now + 0.05, 0.12, 0.24);
      this.scheduleTone(context, 'square', 783.99, 1046.5, now + 0.15, 0.22, 0.24);
    } catch {
      // Safe fallback
    }
  }

  /**
   * 12. Crisp parchment/dialogue blip when advancing Prologue or Mission Briefing
   */
  public playStoryAdvance(): void {
    const context = this.beginSound('story_advance');
    if (!context) return;

    try {
      const now = context.currentTime;
      this.scheduleTone(context, 'triangle', 440, 660, now, 0.055, 0.16);
    } catch {
      // Safe fallback
    }
  }

  /**
   * Helper to trigger any named sound effect from UI or test harness
   */
  public triggerEffect(effect: SoundTriggerEffect): void {
    switch (effect) {
      case 'bow_single':
        this.playBowRelease('single');
        break;
      case 'bow_double':
        this.playBowRelease('double');
        break;
      case 'bow_heavy':
        this.playBowRelease('heavy');
        break;
      case 'enemy_hit':
        this.playEnemyHit();
        break;
      case 'wood_shatter':
        this.playWoodShatter(false);
        break;
      case 'piercing_shatter':
        this.playWoodShatter(true);
        break;
      case 'metallic_clang':
        this.playMetallicClang();
        break;
      case 'arrow_clip_buzz':
        this.playArrowClipBuzz();
        break;
      case 'stage_clear':
        this.playStageClear();
        break;
      case 'town_breached':
        this.playTownBreached();
        break;
      case 'enemy_throw':
        this.playEnemyThrow('dagger');
        break;
      case 'player_hurt':
        this.playPlayerHurt();
        break;
      case 'pickup_item':
        this.playPickup();
        break;
      case 'sanctum_unlock':
        this.playSanctumUnlock();
        break;
      case 'story_advance':
        this.playStoryAdvance();
        break;
    }
  }

  /**
   * Toggles mute state and synchronizes Web Audio masterGain
   */
  public toggleMute(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.ctx && this.masterGain) {
      try {
        this.masterGain.gain.setValueAtTime(this.muted ? 0 : 0.65, this.ctx.currentTime);
      } catch {
        // Ignore
      }
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public isUnlocked(): boolean {
    return this.unlocked;
  }

  public getAudioContextState(): AudioContextState | 'uninitialized' | 'unsupported' {
    if (typeof window === 'undefined') return 'unsupported';
    const hasWebAudio =
      'AudioContext' in window ||
      'webkitAudioContext' in (window as unknown as Record<string, unknown>);
    if (!hasWebAudio) return 'unsupported';
    if (!this.ctx) return 'uninitialized';
    return this.ctx.state;
  }
}

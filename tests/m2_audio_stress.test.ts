/**
 * Townsaver — Challenger M2-2 Adversarial Web Audio Synthesizer Unit & Stress Suite
 * Stress-tests SoundSystem (src/audio.ts) with a strict Web Audio API specification
 * mock to verify node creation, parameter automation invariants, onended cleanup,
 * deterministic LCG white-noise generation, mute suppression, and ring-buffer bounds.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { SoundSystem, SoundTriggerEffect, WeaponSoundType } from '../src/audio';

interface MockAudioNodeRecord {
  kind: 'oscillator' | 'bufferSource' | 'gain' | 'biquadFilter';
  started: boolean;
  stopped: boolean;
  startTime: number;
  stopTime: number;
  disconnected: boolean;
  onended?: (() => void) | null;
}

function createStrictMockAudioEnvironment() {
  const nodes: MockAudioNodeRecord[] = [];
  const gainSetCalls: Array<{ value: number; time: number; isMaster: boolean }> = [];
  const paramErrors: string[] = [];
  let masterGainNode: unknown = null;

  function makeAudioParam(initialValue: number, isMasterGetter: () => boolean) {
    return {
      value: initialValue,
      setValueAtTime(val: number, time: number) {
        if (!Number.isFinite(val) || !Number.isFinite(time) || time < 0) {
          paramErrors.push(`Invalid setValueAtTime(${val}, ${time})`);
        }
        this.value = val;
        gainSetCalls.push({ value: val, time, isMaster: isMasterGetter() });
      },
      linearRampToValueAtTime(val: number, time: number) {
        if (!Number.isFinite(val) || !Number.isFinite(time) || time < 0) {
          paramErrors.push(`Invalid linearRampToValueAtTime(${val}, ${time})`);
        }
        this.value = val;
      },
      exponentialRampToValueAtTime(val: number, time: number) {
        // Web Audio spec: exponentialRampToValueAtTime throws RangeError if value <= 0
        if (!Number.isFinite(val) || val <= 0 || !Number.isFinite(time) || time < 0) {
          paramErrors.push(`Invalid exponentialRampToValueAtTime(${val}, ${time})`);
        }
        this.value = val;
      },
    };
  }

  class MockAudioContext {
    public state: AudioContextState = 'suspended';
    public sampleRate = 44100;
    public currentTime = 1.25;
    public destination = { kind: 'destination' };

    public async resume(): Promise<void> {
      this.state = 'running';
    }

    public createGain() {
      const record: MockAudioNodeRecord = {
        kind: 'gain',
        started: false,
        stopped: false,
        startTime: 0,
        stopTime: 0,
        disconnected: false,
      };
      nodes.push(record);
      const isMaster = masterGainNode === null;
      const node = {
        gain: makeAudioParam(1, () => isMaster),
        connect() {},
        disconnect() {
          record.disconnected = true;
        },
      };
      if (isMaster) {
        masterGainNode = node;
      }
      return node;
    }

    public createOscillator() {
      const record: MockAudioNodeRecord = {
        kind: 'oscillator',
        started: false,
        stopped: false,
        startTime: 0,
        stopTime: 0,
        disconnected: false,
        onended: null,
      };
      nodes.push(record);
      return {
        type: 'sine' as OscillatorType,
        frequency: makeAudioParam(440, () => false),
        connect() {},
        disconnect() {
          record.disconnected = true;
        },
        start(when = 0) {
          if (!Number.isFinite(when) || when < 0) {
            paramErrors.push(`Invalid osc.start(${when})`);
          }
          record.started = true;
          record.startTime = when;
        },
        stop(when = 0) {
          if (!Number.isFinite(when) || when <= record.startTime) {
            paramErrors.push(`Invalid osc.stop(${when}) <= start(${record.startTime})`);
          }
          record.stopped = true;
          record.stopTime = when;
        },
        set onended(cb: (() => void) | null) {
          record.onended = cb;
        },
        get onended() {
          return record.onended ?? null;
        },
      };
    }

    public createBiquadFilter() {
      const record: MockAudioNodeRecord = {
        kind: 'biquadFilter',
        started: false,
        stopped: false,
        startTime: 0,
        stopTime: 0,
        disconnected: false,
      };
      nodes.push(record);
      return {
        type: 'lowpass' as BiquadFilterType,
        frequency: makeAudioParam(350, () => false),
        Q: makeAudioParam(1, () => false),
        connect() {},
        disconnect() {
          record.disconnected = true;
        },
      };
    }

    public createBuffer(channels: number, length: number, sampleRate: number) {
      const data = new Float32Array(length);
      return {
        numberOfChannels: channels,
        length,
        sampleRate,
        getChannelData(ch: number) {
          if (ch !== 0) throw new Error('Invalid channel');
          return data;
        },
      };
    }

    public createBufferSource() {
      const record: MockAudioNodeRecord = {
        kind: 'bufferSource',
        started: false,
        stopped: false,
        startTime: 0,
        stopTime: 0,
        disconnected: false,
        onended: null,
      };
      nodes.push(record);
      return {
        buffer: null as AudioBuffer | null,
        connect() {},
        disconnect() {
          record.disconnected = true;
        },
        start(when = 0) {
          if (!Number.isFinite(when) || when < 0) {
            paramErrors.push(`Invalid bufferSource.start(${when})`);
          }
          record.started = true;
          record.startTime = when;
        },
        stop(when = 0) {
          if (!Number.isFinite(when) || when <= record.startTime) {
            paramErrors.push(`Invalid bufferSource.stop(${when}) <= start(${record.startTime})`);
          }
          record.stopped = true;
          record.stopTime = when;
        },
        set onended(cb: (() => void) | null) {
          record.onended = cb;
        },
        get onended() {
          return record.onended ?? null;
        },
      };
    }
  }

  return { MockAudioContext, nodes, gainSetCalls, paramErrors };
}

describe('Challenger M2-2: SoundSystem Adversarial Stress & Invariant Tests', () => {
  const originalWindow = (globalThis as Record<string, unknown>).window;

  afterEach(() => {
    if (originalWindow === undefined) {
      delete (globalThis as Record<string, unknown>).window;
    } else {
      (globalThis as Record<string, unknown>).window = originalWindow;
    }
  });

  it('validates Web Audio node scheduling, parameter ramps, and onended node disconnection across 250 rapid bursts', async () => {
    const { MockAudioContext, nodes, paramErrors } = createStrictMockAudioEnvironment();
    (globalThis as Record<string, unknown>).window = {
      AudioContext: MockAudioContext,
      addEventListener() {},
    };

    const sound = new SoundSystem();
    expect(sound.getAudioContextState()).toBe('uninitialized');
    expect(sound.isUnlocked()).toBe(false);

    await sound.unlock();
    expect(sound.isUnlocked()).toBe(true);
    expect(sound.getAudioContextState()).toBe('running');

    const allEffects: SoundTriggerEffect[] = [
      'bow_single',
      'bow_double',
      'bow_heavy',
      'enemy_hit',
      'wood_shatter',
      'piercing_shatter',
      'metallic_clang',
      'arrow_clip_buzz',
      'stage_clear',
      'town_breached',
    ];

    // Fire 25 full cycles = 250 rapid sound synthesis calls
    for (let cycle = 0; cycle < 25; cycle++) {
      for (const eff of allEffects) {
        sound.triggerEffect(eff);
      }
    }

    expect(sound.soundPlayCount).toBe(250);
    expect(paramErrors).toEqual([]);

    // Verify bounded ring buffer invariant (never exceeds 32 entries)
    expect(sound.soundHistory.length).toBe(32);
    expect(sound.soundHistory[31]).toBe('town_breached');
    expect(sound.soundHistory[30]).toBe('stage_clear');

    // Verify all scheduled oscillators and buffer sources started and stopped cleanly
    const sourceNodes = nodes.filter(
      (n) => n.kind === 'oscillator' || n.kind === 'bufferSource'
    );
    expect(sourceNodes.length).toBeGreaterThan(500);
    for (const src of sourceNodes) {
      expect(src.started).toBe(true);
      expect(src.stopped).toBe(true);
      expect(src.stopTime).toBeGreaterThan(src.startTime);
      expect(typeof src.onended).toBe('function');
      // Fire onended callback to verify node graph disconnection
      src.onended?.();
      expect(src.disconnected).toBe(true);
    }

    // Every non-master gain node and biquadFilter node should also be disconnected after onended
    const transientNodes = nodes.slice(1); // index 0 is masterGain
    for (const n of transientNodes) {
      expect(n.disconnected).toBe(true);
    }
  });

  it('enforces mute invariant across setMuted(true), toggleMute(), and pre-unlock mute states', () => {
    const { MockAudioContext, nodes, gainSetCalls } = createStrictMockAudioEnvironment();
    (globalThis as Record<string, unknown>).window = {
      AudioContext: MockAudioContext,
      addEventListener() {},
    };

    const sound = new SoundSystem();

    // 1. Mute BEFORE AudioContext is even created
    sound.setMuted(true);
    expect(sound.isMuted()).toBe(true);

    const weapons: WeaponSoundType[] = ['single', 'double', 'heavy'];
    for (let i = 0; i < 50; i++) {
      sound.playBowRelease(weapons[i % 3]);
      sound.playEnemyHit();
      sound.playWoodShatter(i % 2 === 0);
      sound.playMetallicClang();
      sound.playArrowClipBuzz();
      sound.playStageClear();
      sound.playTownBreached();
    }

    // Invariant: 0 sounds played, 0 history entries, AudioContext not even instantiated while muted
    expect(sound.soundPlayCount).toBe(0);
    expect(sound.lastSoundPlayed).toBeNull();
    expect(sound.soundHistory.length).toBe(0);
    expect(nodes.length).toBe(0);

    // 2. Unmute and trigger a sound -> initializes AudioContext with masterGain = 0.65
    sound.setMuted(false);
    expect(sound.isMuted()).toBe(false);
    sound.playBowRelease('heavy');
    expect(sound.soundPlayCount).toBe(1);
    expect(sound.lastSoundPlayed).toBe('bow_release:heavy');

    const masterGainsAfterInit = gainSetCalls.filter((c) => c.isMaster);
    expect(masterGainsAfterInit.length).toBeGreaterThanOrEqual(1);
    expect(masterGainsAfterInit[masterGainsAfterInit.length - 1].value).toBeCloseTo(0.65, 5);

    // 3. Toggle mute ON -> masterGain set to 0, subsequent calls suppressed
    const nodeCountBeforeMute = nodes.length;
    expect(sound.toggleMute()).toBe(true);
    expect(sound.isMuted()).toBe(true);

    const masterGainsAfterMute = gainSetCalls.filter((c) => c.isMaster);
    expect(masterGainsAfterMute[masterGainsAfterMute.length - 1].value).toBe(0);

    for (let i = 0; i < 40; i++) {
      sound.playMetallicClang();
      sound.playArrowClipBuzz();
    }
    expect(sound.soundPlayCount).toBe(1);
    expect(sound.lastSoundPlayed).toBe('bow_release:heavy');
    expect(nodes.length).toBe(nodeCountBeforeMute);

    // 4. Toggle mute OFF -> masterGain restored to 0.65, synthesis resumes
    expect(sound.toggleMute()).toBe(false);
    const masterGainsAfterUnmute = gainSetCalls.filter((c) => c.isMaster);
    expect(masterGainsAfterUnmute[masterGainsAfterUnmute.length - 1].value).toBeCloseTo(0.65, 5);

    sound.playStageClear();
    expect(sound.soundPlayCount).toBe(2);
    expect(sound.lastSoundPlayed).toBe('stage_clear');
    expect(nodes.length).toBeGreaterThan(nodeCountBeforeMute);
  });
});

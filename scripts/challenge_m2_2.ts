/**
 * Townsaver — Challenger M2-2: Empirical Web Audio API Synthesizer & Stress Harness
 * Launches headless desktop /usr/bin/chromium (1280x800) with Web Audio graph
 * instrumentation to stress-test SoundSystem (src/audio.ts) and src/main.ts integration.
 */

import { chromium } from 'playwright-core';

interface CheckResult {
  name: string;
  passed: boolean;
  details: string;
}

interface AudioTrackerStats {
  oscCreated: number;
  oscEnded: number;
  bufSourceCreated: number;
  bufSourceEnded: number;
  gainCreated: number;
  filterCreated: number;
  masterGainValues: number[];
  paramErrors: string[];
}

declare global {
  interface Window {
    __AUDIO_TRACKER__?: AudioTrackerStats;
  }
}

async function runChallengerM2_2() {
  console.log('================================================================');
  console.log('Townsaver Challenger M2-2: Web Audio Synthesizer Stress Suite');
  console.log('Target: /usr/bin/chromium (1280x800 Desktop Web)');
  console.log('================================================================');

  const results: CheckResult[] = [];
  const targetUrl = process.env.TARGET_URL || 'http://localhost:5173';

  const browser = await chromium.launch({
    executablePath: '/usr/bin/chromium',
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--ignore-certificate-errors',
      '--autoplay-policy=no-user-gesture-required',
    ],
  });

  const page = await browser.newPage({
    viewport: { width: 1280, height: 800 },
  });

  const consoleErrors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      if (!text.includes('ERR_CERT_AUTHORITY_INVALID')) {
        consoleErrors.push(text);
      }
    }
  });
  page.on('pageerror', (err) => {
    consoleErrors.push(err.message);
  });

  // Instrument Web Audio API before page scripts execute
  await page.addInitScript(() => {
    const tracker: AudioTrackerStats = {
      oscCreated: 0,
      oscEnded: 0,
      bufSourceCreated: 0,
      bufSourceEnded: 0,
      gainCreated: 0,
      filterCreated: 0,
      masterGainValues: [],
      paramErrors: [],
    };
    window.__AUDIO_TRACKER__ = tracker;

    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    const origCreateOsc = AudioCtx.prototype.createOscillator;
    const origCreateBufSrc = AudioCtx.prototype.createBufferSource;
    const origCreateGain = AudioCtx.prototype.createGain;
    const origCreateFilter = AudioCtx.prototype.createBiquadFilter;

    let masterGainCaptured = false;

    AudioCtx.prototype.createGain = function () {
      const gainNode = origCreateGain.call(this);
      tracker.gainCreated += 1;
      if (!masterGainCaptured) {
        masterGainCaptured = true;
        const origSetVal = gainNode.gain.setValueAtTime.bind(gainNode.gain);
        gainNode.gain.setValueAtTime = function (value: number, startTime: number) {
          tracker.masterGainValues.push(value);
          return origSetVal(value, startTime);
        };
      }
      return gainNode;
    };

    AudioCtx.prototype.createOscillator = function () {
      const osc = origCreateOsc.call(this);
      tracker.oscCreated += 1;
      osc.addEventListener('ended', () => {
        tracker.oscEnded += 1;
      });
      return osc;
    };

    AudioCtx.prototype.createBufferSource = function () {
      const src = origCreateBufSrc.call(this);
      tracker.bufSourceCreated += 1;
      src.addEventListener('ended', () => {
        tracker.bufSourceEnded += 1;
      });
      return src;
    };

    AudioCtx.prototype.createBiquadFilter = function () {
      const filter = origCreateFilter.call(this);
      tracker.filterCreated += 1;
      return filter;
    };
  });

  try {
    await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForFunction(
      () => {
        const h = window.__TOWNSAVER__;
        return Boolean(h && h.canvasReady && h.frameCount >= 5);
      },
      { timeout: 10000 }
    );

    // -------------------------------------------------------------------------
    // 1. Verify Exact Node Topologies for All 10 Sound Synthesis Effects
    // -------------------------------------------------------------------------
    const expectedTopologies: Array<{
      effect:
        | 'bow_single'
        | 'bow_double'
        | 'bow_heavy'
        | 'enemy_hit'
        | 'wood_shatter'
        | 'piercing_shatter'
        | 'metallic_clang'
        | 'arrow_clip_buzz'
        | 'stage_clear'
        | 'town_breached';
      expectedId: string;
      oscDelta: number;
      noiseDelta: number;
    }> = [
      { effect: 'bow_single', expectedId: 'bow_release:single', oscDelta: 1, noiseDelta: 1 },
      { effect: 'bow_double', expectedId: 'bow_release:double', oscDelta: 2, noiseDelta: 2 },
      { effect: 'bow_heavy', expectedId: 'bow_release:heavy', oscDelta: 2, noiseDelta: 1 },
      { effect: 'enemy_hit', expectedId: 'enemy_hit', oscDelta: 2, noiseDelta: 0 },
      { effect: 'wood_shatter', expectedId: 'wood_shatter:normal', oscDelta: 1, noiseDelta: 1 },
      { effect: 'piercing_shatter', expectedId: 'wood_shatter:piercing', oscDelta: 2, noiseDelta: 1 },
      { effect: 'metallic_clang', expectedId: 'metallic_clang', oscDelta: 4, noiseDelta: 1 },
      { effect: 'arrow_clip_buzz', expectedId: 'arrow_clip_buzz', oscDelta: 3, noiseDelta: 1 },
      { effect: 'stage_clear', expectedId: 'stage_clear', oscDelta: 8, noiseDelta: 0 },
      { effect: 'town_breached', expectedId: 'town_breached', oscDelta: 8, noiseDelta: 1 },
    ];

    // Pause showcase auto-collisions during exact topology count so background arrows don't add extra hits
    await page.click('#btn-pause');

    for (const item of expectedTopologies) {
      const check = await page.evaluate((eff) => {
        const hook = window.__TOWNSAVER__!;
        const tr = window.__AUDIO_TRACKER__!;
        const oscBefore = tr.oscCreated;
        const noiseBefore = tr.bufSourceCreated;
        const countBefore = hook.soundPlayCount;

        hook.triggerSound(eff);

        return {
          lastSoundPlayed: hook.lastSoundPlayed,
          countDelta: hook.soundPlayCount - countBefore,
          oscDelta: tr.oscCreated - oscBefore,
          noiseDelta: tr.bufSourceCreated - noiseBefore,
          ctxState: hook.audioContextState,
        };
      }, item.effect);

      results.push({
        name: `Topology & telemetry for '${item.effect}' -> '${item.expectedId}'`,
        passed:
          check.lastSoundPlayed === item.expectedId &&
          check.countDelta === 1 &&
          check.oscDelta === item.oscDelta &&
          check.noiseDelta === item.noiseDelta &&
          check.ctxState === 'running',
        details: `osc:+${check.oscDelta} (exp ${item.oscDelta}), noise:+${check.noiseDelta} (exp ${item.noiseDelta}), state:${check.ctxState}`,
      });
    }

    // Resume from pause
    await page.click('#btn-pause');

    // -------------------------------------------------------------------------
    // 2. Rapid Burst Stress (200+ triggerSound calls + 30 fireShowcaseArrow calls)
    // -------------------------------------------------------------------------
    const burstResult = await page.evaluate(() => {
      const hook = window.__TOWNSAVER__!;
      const tr = window.__AUDIO_TRACKER__!;
      const effects = [
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
      ] as const;

      const countBefore = hook.soundPlayCount;
      const oscBefore = tr.oscCreated;
      const bufBefore = tr.bufSourceCreated;

      // 20 cycles * 10 effects = 200 synchronous synthesis bursts
      for (let cycle = 0; cycle < 20; cycle++) {
        for (const eff of effects) {
          hook.triggerSound(eff);
        }
      }

      // Plus 30 rapid fireShowcaseArrow bursts across single, double, heavy
      const weapons = ['single', 'double', 'heavy'] as const;
      for (let i = 0; i < 30; i++) {
        hook.fireShowcaseArrow(weapons[i % 3]);
      }

      return {
        callsTriggered: hook.soundPlayCount - countBefore,
        oscScheduled: tr.oscCreated - oscBefore,
        bufScheduled: tr.bufSourceCreated - bufBefore,
        historyLen: hook.soundHistory.length,
        historyTail: hook.soundHistory.slice(-3),
        activeArrowsCount: hook.activeArrowsCount,
        ctxState: hook.audioContextState,
      };
    });

    results.push({
      name: 'Rapid burst of 230 synthesis calls executes with 0 errors and exact telemetry',
      passed:
        burstResult.callsTriggered === 230 &&
        burstResult.oscScheduled === 20 * 33 + 10 * (1 + 2 + 2) &&
        burstResult.bufScheduled === 20 * 9 + 10 * (1 + 2 + 1) &&
        burstResult.ctxState === 'running',
      details: `triggered:${burstResult.callsTriggered}, osc:+${burstResult.oscScheduled}, noise:+${burstResult.bufScheduled}`,
    });

    results.push({
      name: 'soundHistory ring buffer strictly bounded at 32 entries after >240 events',
      passed:
        burstResult.historyLen === 32 &&
        burstResult.historyTail[0] === 'bow_release:single' &&
        burstResult.historyTail[1] === 'bow_release:double' &&
        burstResult.historyTail[2] === 'bow_release:heavy',
      details: `len:${burstResult.historyLen}, tail:${burstResult.historyTail.join(', ')}`,
    });

    results.push({
      name: 'liveArrows array capped at <= 12 (+3 static = 15 max) during 30 rapid shots',
      passed: burstResult.activeArrowsCount <= 15,
      details: `activeArrowsCount:${burstResult.activeArrowsCount}`,
    });

    // Verify defensive copy isolation on window.__TOWNSAVER__.soundHistory
    const copyIsolation = await page.evaluate(() => {
      const hook = window.__TOWNSAVER__!;
      hook.soundHistory.push('EXTERNAL_MUTATION_ATTACK');
      hook.triggerSound('enemy_hit');
      return {
        len: hook.soundHistory.length,
        containsAttack: hook.soundHistory.includes('EXTERNAL_MUTATION_ATTACK'),
        lastEntry: hook.soundHistory[hook.soundHistory.length - 1],
      };
    });

    results.push({
      name: 'window.__TOWNSAVER__.soundHistory is isolated from external array mutation',
      passed:
        copyIsolation.len === 32 &&
        copyIsolation.containsAttack === false &&
        copyIsolation.lastEntry === 'enemy_hit',
      details: `len:${copyIsolation.len}, containsAttack:${copyIsolation.containsAttack}`,
    });

    // -------------------------------------------------------------------------
    // 3. Mute Invariant Stress Test (KeyM & #btn-mute & masterGain === 0)
    // -------------------------------------------------------------------------
    // Pause showcase physics briefly so flying arrows from earlier burst don't trigger hits mid-check
    await page.click('#btn-restart');
    await page.click('#btn-pause');

    // Mute via KeyM
    await page.keyboard.press('KeyM');
    const keyMMuteCheck = await page.evaluate(() => {
      const hook = window.__TOWNSAVER__!;
      const tr = window.__AUDIO_TRACKER__!;
      const label = document.getElementById('mute-label')?.textContent;
      const icon = document.getElementById('mute-icon')?.textContent;
      const countBefore = hook.soundPlayCount;
      const lastBefore = hook.lastSoundPlayed;
      const oscBefore = tr.oscCreated;
      const lastMasterGain = tr.masterGainValues[tr.masterGainValues.length - 1];

      const effects = [
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
      ] as const;

      for (let i = 0; i < 5; i++) {
        for (const eff of effects) {
          hook.triggerSound(eff);
        }
        hook.fireShowcaseArrow('heavy');
      }

      return {
        muted: hook.soundMuted,
        label,
        icon,
        lastMasterGain,
        countDelta: hook.soundPlayCount - countBefore,
        lastUnchanged: hook.lastSoundPlayed === lastBefore,
        oscDelta: tr.oscCreated - oscBefore,
      };
    });

    results.push({
      name: 'KeyM mutes masterGain (0), updates DOM, and suppresses 55 burst calls (+0 count, +0 nodes)',
      passed:
        keyMMuteCheck.muted === true &&
        keyMMuteCheck.label === 'UNMUTE (M)' &&
        keyMMuteCheck.icon === '🔇' &&
        keyMMuteCheck.lastMasterGain === 0 &&
        keyMMuteCheck.countDelta === 0 &&
        keyMMuteCheck.lastUnchanged === true &&
        keyMMuteCheck.oscDelta === 0,
      details: `muted:${keyMMuteCheck.muted}, masterGain:${keyMMuteCheck.lastMasterGain}, countDelta:${keyMMuteCheck.countDelta}, oscDelta:${keyMMuteCheck.oscDelta}`,
    });

    // Unmute via KeyM
    await page.keyboard.press('KeyM');
    const keyMUnmuteCheck = await page.evaluate(() => {
      const hook = window.__TOWNSAVER__!;
      const tr = window.__AUDIO_TRACKER__!;
      const label = document.getElementById('mute-label')?.textContent;
      const icon = document.getElementById('mute-icon')?.textContent;
      const lastMasterGain = tr.masterGainValues[tr.masterGainValues.length - 1];
      const countBefore = hook.soundPlayCount;
      hook.triggerSound('metallic_clang');
      return {
        muted: hook.soundMuted,
        label,
        icon,
        lastMasterGain,
        countDelta: hook.soundPlayCount - countBefore,
        lastSound: hook.lastSoundPlayed,
      };
    });

    results.push({
      name: 'KeyM unmutes masterGain (0.65), updates DOM, and resumes sound synthesis',
      passed:
        keyMUnmuteCheck.muted === false &&
        keyMUnmuteCheck.label === 'MUTE (M)' &&
        keyMUnmuteCheck.icon === '🔊' &&
        Math.abs(keyMUnmuteCheck.lastMasterGain - 0.65) < 1e-5 &&
        keyMUnmuteCheck.countDelta === 1 &&
        keyMUnmuteCheck.lastSound === 'metallic_clang',
      details: `muted:${keyMUnmuteCheck.muted}, masterGain:${keyMUnmuteCheck.lastMasterGain}, countDelta:+${keyMUnmuteCheck.countDelta}`,
    });

    // Mute via #btn-mute click
    await page.click('#btn-mute');
    const btnMuteCheck = await page.evaluate(() => {
      const hook = window.__TOWNSAVER__!;
      const tr = window.__AUDIO_TRACKER__!;
      const countBefore = hook.soundPlayCount;
      const oscBefore = tr.oscCreated;
      hook.triggerSound('stage_clear');
      hook.triggerSound('town_breached');
      return {
        muted: hook.soundMuted,
        lastMasterGain: tr.masterGainValues[tr.masterGainValues.length - 1],
        countDelta: hook.soundPlayCount - countBefore,
        oscDelta: tr.oscCreated - oscBefore,
      };
    });

    results.push({
      name: '#btn-mute click silences masterGain (0) and suppresses synthesis',
      passed:
        btnMuteCheck.muted === true &&
        btnMuteCheck.lastMasterGain === 0 &&
        btnMuteCheck.countDelta === 0 &&
        btnMuteCheck.oscDelta === 0,
      details: `muted:${btnMuteCheck.muted}, masterGain:${btnMuteCheck.lastMasterGain}, countDelta:${btnMuteCheck.countDelta}`,
    });

    // Unmute via #btn-mute click
    await page.click('#btn-mute');
    // Unpause showcase
    await page.click('#btn-pause');

    // -------------------------------------------------------------------------
    // 4. Live Showcase Collision Audio Integration (Blue-Iron Clang & Arrow Clip Buzz)
    // -------------------------------------------------------------------------
    await page.click('#btn-restart');
    await page.click('#btn-weapon-1');

    // Click Column 2 (x = 90) on #game-canvas to fire at the Blue-Iron Block
    // and Column 4 (x = 210) to fire at the lodged-arrow hazard
    await page.evaluate(() => {
      const c = document.getElementById('game-canvas')!;
      const rect = c.getBoundingClientRect();
      const yClient = rect.top + rect.height * 0.8;
      const col2X = rect.left + rect.width * (90 / 240);
      const col4X = rect.left + rect.width * (210 / 240);
      c.dispatchEvent(new PointerEvent('pointerdown', { clientX: col2X, clientY: yClient }));
      c.dispatchEvent(new PointerEvent('pointerdown', { clientX: col4X, clientY: yClient }));
    });

    // Wait 600ms (~36 frames at 60 FPS) for arrows (vy = -4.2 from y=266 to y<=156 -> 27 frames) to collide
    await page.waitForTimeout(600);

    const collisionAudio = await page.evaluate(() => {
      const hook = window.__TOWNSAVER__!;
      return {
        history: hook.soundHistory.slice(-6),
        hasClang: hook.soundHistory.slice(-6).includes('metallic_clang'),
        hasClipBuzz: hook.soundHistory.slice(-6).includes('arrow_clip_buzz'),
      };
    });

    results.push({
      name: 'Live showcase projectiles trigger contextual metallic_clang (Col 2) and arrow_clip_buzz (Col 4)',
      passed: collisionAudio.hasClang && collisionAudio.hasClipBuzz,
      details: `recentHistory: [${collisionAudio.history.join(', ')}]`,
    });

    // -------------------------------------------------------------------------
    // 5. Web Audio Node Lifecycle Cleanup (onended) & Memory/FPS Stability
    // -------------------------------------------------------------------------
    // Wait 900ms so all previously scheduled oscillators/buffers (max 0.75s) finish and fire onended
    await page.click('#btn-restart');
    await page.waitForTimeout(900);

    const lifecycleAndMemory = await page.evaluate(() => {
      const hook = window.__TOWNSAVER__!;
      const tr = window.__AUDIO_TRACKER__!;
      const perfMem = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;
      return {
        oscCreated: tr.oscCreated,
        oscEnded: tr.oscEnded,
        bufCreated: tr.bufSourceCreated,
        bufEnded: tr.bufSourceEnded,
        heapMB: perfMem ? perfMem.usedJSHeapSize / (1024 * 1024) : 0,
        fps: hook.fps,
        frameCount: hook.frameCount,
      };
    });

    results.push({
      name: '100% of scheduled OscillatorNodes and AudioBufferSourceNodes complete & disconnect via onended',
      passed:
        lifecycleAndMemory.oscCreated > 700 &&
        lifecycleAndMemory.oscEnded === lifecycleAndMemory.oscCreated &&
        lifecycleAndMemory.bufCreated > 200 &&
        lifecycleAndMemory.bufEnded === lifecycleAndMemory.bufCreated,
      details: `osc: ${lifecycleAndMemory.oscEnded}/${lifecycleAndMemory.oscCreated}, noise: ${lifecycleAndMemory.bufEnded}/${lifecycleAndMemory.bufCreated}`,
    });

    results.push({
      name: 'JS Heap remains stable (< 50 MB) and 60 FPS loop remains active after audio stress',
      passed:
        lifecycleAndMemory.heapMB < 50 &&
        lifecycleAndMemory.fps >= 30 &&
        lifecycleAndMemory.frameCount > 60,
      details: `heap: ${lifecycleAndMemory.heapMB.toFixed(2)} MB, fps: ${lifecycleAndMemory.fps}, frames: ${lifecycleAndMemory.frameCount}`,
    });

    results.push({
      name: 'Zero browser console or page errors across entire audio stress test',
      passed: consoleErrors.length === 0,
      details: consoleErrors.length === 0 ? '0 errors' : consoleErrors.join('; '),
    });
  } finally {
    await browser.close();
  }

  console.log('\n================================================================');
  console.log('CHALLENGER M2-2 RESULTS:');
  console.log('================================================================');
  let failed = 0;
  for (const r of results) {
    console.log(`${r.passed ? '✓ PASS' : '✗ FAIL'} | ${r.name} (${r.details})`);
    if (!r.passed) failed++;
  }
  console.log('================================================================');
  console.log(
    `Total Checks: ${results.length} | Passed: ${results.length - failed} | Failed: ${failed}`
  );

  if (failed > 0) {
    process.exit(1);
  }
}

runChallengerM2_2().catch((err) => {
  console.error('Fatal error in Challenger M2-2:', err);
  process.exit(1);
});

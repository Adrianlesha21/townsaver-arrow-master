/**
 * Townsaver — Challenger M3-2: Live Headless Desktop Chromium E2E Gameplay,
 * DOM Lockstep, Fail Conditions, 0-Heart Breach Recovery & Reload Persistence Suite
 *
 * Target: /usr/bin/chromium (1280x800 Desktop Web)
 * Strictly isolated to desktop Chrome/Chromium web (zero Android/emulator interaction).
 */

import { chromium } from 'playwright-core';

interface ChallengeAssertion {
  id: string;
  name: string;
  passed: boolean;
  details: string;
}

async function runChallengeM3_2(): Promise<void> {
  console.log('================================================================');
  console.log('Townsaver Challenger M3-2: Live Chromium E2E & Persistence Suite');
  console.log('Target: /usr/bin/chromium (1280x800 Desktop Web)');
  console.log('================================================================');

  const assertions: ChallengeAssertion[] = [];
  const record = (id: string, name: string, passed: boolean, details: string) => {
    assertions.push({ id, name, passed, details });
    const badge = passed ? 'PASS' : 'FAIL';
    console.log(`[${badge}] ${id} — ${name} (${details})`);
  };

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

  try {
    await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(200);

    // -------------------------------------------------------------------------
    // 1. Title Screen ('title') -> Pressing Space -> Live 'playing' Transition
    // -------------------------------------------------------------------------
    const titleSetup = await page.evaluate(() => {
      const hook = (window as any).__TOWNSAVER__;
      hook.resetSave();
      hook.engine.loadStage(1, { status: 'title' });
      hook.stepFrames(0);
      return {
        statusBefore: hook.status,
        engineStatusBefore: hook.getState().status,
      };
    });

    record(
      'M32-01',
      "Title state ('title') initializes cleanly before Space key press",
      titleSetup.statusBefore === 'title' && titleSetup.engineStatusBefore === 'title',
      JSON.stringify(titleSetup)
    );

    await page.keyboard.press('Space');

    const afterSpaceFromTitle = await page.evaluate(() => {
      const hook = (window as any).__TOWNSAVER__;
      const st = hook.getState();
      return {
        hookStatus: hook.status,
        engineStatus: st.status,
        lastKeyPressed: hook.lastKeyPressed,
        arrowsInFlight: st.arrows.length,
        adrianFrame: hook.adrianFrame,
      };
    });

    record(
      'M32-02',
      "Pressing Space from 'title' transitions game into 'playing' and fires opening arrow",
      afterSpaceFromTitle.hookStatus === 'playing' &&
        afterSpaceFromTitle.engineStatus === 'playing' &&
        afterSpaceFromTitle.lastKeyPressed === 'FIRE(Space)' &&
        afterSpaceFromTitle.arrowsInFlight >= 1,
      JSON.stringify(afterSpaceFromTitle)
    );

    // -------------------------------------------------------------------------
    // 2. Column 1 Clear -> Auto-Step to Column 2 (x=90), Queen Cheering & Quiver
    // -------------------------------------------------------------------------
    const autoStepResult = await page.evaluate(() => {
      const hook = (window as any).__TOWNSAVER__;
      hook.loadStage(1);
      // Pause background rAF while keeping engine unpaused for deterministic stepping
      if (!hook.isPaused) {
        document.getElementById('btn-pause')?.click();
      }
      hook.engine.setPaused(false);

      const beforeCol = hook.adrianCol;
      const beforeX = hook.getState().adrianX;
      const doubleBefore = hook.doubleAmmo;

      hook.clearCurrentColumn();
      const midStep = hook.stepFrames(5);
      const midX = midStep.adrianX;
      const finalStep = hook.stepFrames(10);

      return {
        beforeCol,
        beforeX,
        midX,
        afterCol: hook.adrianCol,
        afterX: finalStep.adrianX,
        queenMood: hook.queenMood,
        domQueenTitle: document.getElementById('queen-mood-title')?.textContent,
        domQueenHasClass: document
          .getElementById('queen-mood-title')
          ?.classList.contains('cheering'),
        doubleBefore,
        doubleAfter: hook.doubleAmmo,
        domDoubleAmmo: document.querySelector('#ammo-double .ammo-val')?.textContent,
      };
    });

    record(
      'M32-03',
      'Clearing Column 1 smoothly auto-steps Adrian from Column 0 (x=30) to Column 1 (x=90)',
      autoStepResult.beforeCol === 0 &&
        autoStepResult.beforeX === 30 &&
        autoStepResult.midX > 30 &&
        autoStepResult.midX < 90 &&
        autoStepResult.afterCol === 1 &&
        autoStepResult.afterX === 90,
      JSON.stringify({
        beforeCol: autoStepResult.beforeCol,
        beforeX: autoStepResult.beforeX,
        midX: autoStepResult.midX,
        afterCol: autoStepResult.afterCol,
        afterX: autoStepResult.afterX,
      })
    );

    record(
      'M32-04',
      "Clearing Column 1 sets Queen mood to 'cheering' (#queen-mood-title === 'CHEERING') and grants +1 Double Shot",
      autoStepResult.queenMood === 'cheering' &&
        autoStepResult.domQueenTitle === 'CHEERING' &&
        autoStepResult.domQueenHasClass === true &&
        autoStepResult.doubleAfter === autoStepResult.doubleBefore + 1 &&
        autoStepResult.domDoubleAmmo === String(autoStepResult.doubleAfter),
      JSON.stringify({
        queenMood: autoStepResult.queenMood,
        domQueenTitle: autoStepResult.domQueenTitle,
        doubleBefore: autoStepResult.doubleBefore,
        doubleAfter: autoStepResult.doubleAfter,
        domDoubleAmmo: autoStepResult.domDoubleAmmo,
      })
    );

    // -------------------------------------------------------------------------
    // 3. Weapon Switching (1, 2, 3, Tab) & Live DOM Ammo Badge Lockstep
    // -------------------------------------------------------------------------
    await page. evaluate(() => {
      const hook = (window as any).__TOWNSAVER__;
      hook.loadStage(1);
      if (!hook.isPaused) {
        document.getElementById('btn-pause')?.click();
      }
      hook.engine.setPaused(false);
    });

    await page.keyboard.press('Digit1');
    const w1Dom = await page.evaluate(() => ({
      activeWeapon: (window as any).__TOWNSAVER__.activeWeapon,
      btn1Active: document.getElementById('btn-weapon-1')?.classList.contains('active'),
      ammoSingleText: document.getElementById('ammo-single')?.textContent?.trim(),
    }));

    await page.keyboard.press('Digit2');
    await page.keyboard.press('Space');
    const w2DomAfterFire = await page.evaluate(() => ({
      activeWeapon: (window as any).__TOWNSAVER__.activeWeapon,
      btn2Active: document.getElementById('btn-weapon-2')?.classList.contains('active'),
      hookDoubleAmmo: (window as any).__TOWNSAVER__.doubleAmmo,
      domDoubleVal: document.querySelector('#ammo-double .ammo-val')?.textContent?.trim(),
    }));

    await page.keyboard.press('Digit3');
    await page.keyboard.press('Space');
    const w3DomAfterFire = await page.evaluate(() => ({
      activeWeapon: (window as any).__TOWNSAVER__.activeWeapon,
      btn3Active: document.getElementById('btn-weapon-3')?.classList.contains('active'),
      hookHeavyAmmo: (window as any).__TOWNSAVER__.heavyAmmo,
      domHeavyVal: document.querySelector('#ammo-heavy .ammo-val')?.textContent?.trim(),
    }));

    await page.keyboard.press('Tab');
    const afterTabCycle = await page.evaluate(
      () => (window as any).__TOWNSAVER__.activeWeapon
    );

    record(
      'M32-05',
      'Switching weapons (1/2/3/Tab) and firing updates #ammo-single, #ammo-double .ammo-val, and #ammo-heavy .ammo-val in lockstep',
      w1Dom.activeWeapon === 'single' &&
        w1Dom.btn1Active === true &&
        w1Dom.ammoSingleText === '∞' &&
        w2DomAfterFire.activeWeapon === 'double' &&
        w2DomAfterFire.btn2Active === true &&
        w2DomAfterFire.hookDoubleAmmo === 4 &&
        w2DomAfterFire.domDoubleVal === '4' &&
        w3DomAfterFire.activeWeapon === 'heavy' &&
        w3DomAfterFire.btn3Active === true &&
        w3DomAfterFire.hookHeavyAmmo === 1 &&
        w3DomAfterFire.domHeavyVal === '1' &&
        afterTabCycle === 'single',
      JSON.stringify({ w1Dom, w2DomAfterFire, w3DomAfterFire, afterTabCycle })
    );

    // Verify special quiver exhaustion fallback (0 heavy ammo -> falls back to 'single')
    const emptyAmmoFallback = await page.evaluate(() => {
      const hook = (window as any).__TOWNSAVER__;
      hook.loadStage(1);
      if (!hook.isPaused) {
        document.getElementById('btn-pause')?.click();
      }
      hook.engine.setPaused(false);
      hook.engine.selectWeapon('heavy');
      hook.engine.fireWeapon(); // uses 1st heavy charge (1 left)
      hook.engine.fireWeapon(); // uses 2nd heavy charge (0 left)
      const fallbackSpawn = hook.engine.fireWeapon(); // 0 left -> falls back to 'single'
      hook.stepFrames(1);
      return {
        heavyAmmoRemaining: hook.heavyAmmo,
        domHeavyVal: document.querySelector('#ammo-heavy .ammo-val')?.textContent?.trim(),
        activeWeaponAfterExhaustion: hook.activeWeapon,
        fallbackArrowType: fallbackSpawn[0]?.weaponType,
      };
    });

    record(
      'M32-06',
      "Depleting Great Arrow charges to 0 updates DOM to '0' and automatically falls back to 'single' arrow",
      emptyAmmoFallback.heavyAmmoRemaining === 0 &&
        emptyAmmoFallback.domHeavyVal === '0' &&
        emptyAmmoFallback.activeWeaponAfterExhaustion === 'single' &&
        emptyAmmoFallback.fallbackArrowType === 'single',
      JSON.stringify(emptyAmmoFallback)
    );

    // -------------------------------------------------------------------------
    // 4. Fail Condition 1 & Fail Condition 2 Live DOM Hearts, Classes & Queen Moods
    // -------------------------------------------------------------------------
    const failSequence = await page.evaluate(() => {
      (window as any).__name = (fn: unknown) => fn;
      const hook = (window as any).__TOWNSAVER__;
      hook.loadStage(1);
      if (!hook.isPaused) {
        document.getElementById('btn-pause')?.click();
      }
      hook.engine.setPaused(false);

      const snapshotDOMHearts = () => ({
        hookHearts: hook.hearts,
        text: document.getElementById('hearts-count-text')?.textContent?.trim(),
        activeCount: document.querySelectorAll('#hearts-row .heart-icon.active').length,
        lostCount: document.querySelectorAll('#hearts-row .heart-icon.lost').length,
        queenMood: hook.queenMood,
        domQueenTitle: document.getElementById('queen-mood-title')?.textContent?.trim(),
        lastFailReason: hook.lastFailReason,
        lastSound: hook.lastSoundPlayed,
        status: hook.status,
        banner: hook.statusBanner,
        footerText: document.getElementById('footer-status-msg')?.textContent?.trim(),
      });

      const initial = snapshotDOMHearts();

      // Step 1: Fail Condition 1 (Blue-Iron Block deflection: 4 -> 3 Hearts)
      hook.triggerIronDeflectionTest('single');
      const afterFail1 = snapshotDOMHearts();

      // Step past 180ms hit-stop (15 frames)
      hook.stepFrames(15);

      // Step 2: Fail Condition 2A (Palisade-slowed arrow clip: 3 -> 2 Hearts)
      hook.triggerArrowClipTest('palisade_slowed');
      const afterFail2Slowed = snapshotDOMHearts();

      hook.stepFrames(15);

      // Step 3: Fail Condition 2B (Lodged arrow clip: 2 -> 1 Heart -> Queen PRAYING)
      hook.triggerArrowClipTest('lodged');
      const afterFail2Lodged = snapshotDOMHearts();

      // Step 80 frames to confirm Queen stays PRAYING at 1 Heart (does not revert to WATCHING)
      hook.stepFrames(80);
      const prayingPersistsAt1Heart = snapshotDOMHearts();

      // Step 4: Final deflection at 1 Heart using Great Arrow ('heavy') -> 0 Hearts Town Breached!
      hook.triggerIronDeflectionTest('heavy');
      const atZeroBreach = snapshotDOMHearts();

      // Step 95 frames (past 1.5s breachResetTimer) to verify automatic stage restart & 4/5 recovery
      hook.stepFrames(95);
      const afterBreachRecovery = snapshotDOMHearts();

      return {
        initial,
        afterFail1,
        afterFail2Slowed,
        afterFail2Lodged,
        prayingPersistsAt1Heart,
        atZeroBreach,
        afterBreachRecovery,
      };
    });

    record(
      'M32-07',
      "Fail Condition 1 (triggerIronDeflectionTest) drops Hearts 4 -> 3 ('3 / 5', 3 active / 2 lost icons) & sets Queen DISTRESSED",
      failSequence.initial.text === '4 / 5' &&
        failSequence.initial.activeCount === 4 &&
        failSequence.afterFail1.hookHearts === 3 &&
        failSequence.afterFail1.text === '3 / 5' &&
        failSequence.afterFail1.activeCount === 3 &&
        failSequence.afterFail1.lostCount === 2 &&
        failSequence.afterFail1.lastFailReason === 'iron_block_deflection' &&
        failSequence.afterFail1.domQueenTitle === 'DISTRESSED' &&
        failSequence.afterFail1.lastSound === 'metallic_clang',
      JSON.stringify(failSequence.afterFail1)
    );

    record(
      'M32-08',
      "Fail Condition 2A (palisade_slowed arrow clip) drops Hearts 3 -> 2 ('2 / 5', 2 active / 3 lost icons) & plays arrow_clip_buzz",
      failSequence.afterFail2Slowed.hookHearts === 2 &&
        failSequence.afterFail2Slowed.text === '2 / 5' &&
        failSequence.afterFail2Slowed.activeCount === 2 &&
        failSequence.afterFail2Slowed.lostCount === 3 &&
        failSequence.afterFail2Slowed.lastFailReason === 'arrow_on_arrow_clip' &&
        failSequence.afterFail2Slowed.domQueenTitle === 'DISTRESSED' &&
        failSequence.afterFail2Slowed.lastSound === 'arrow_clip_buzz',
      JSON.stringify(failSequence.afterFail2Slowed)
    );

    record(
      'M32-09',
      "Fail Condition 2B (lodged arrow clip) drops Hearts 2 -> 1 ('1 / 5', 1 active / 4 lost icons) & locks Queen mood to PRAYING",
      failSequence.afterFail2Lodged.hookHearts === 1 &&
        failSequence.afterFail2Lodged.text === '1 / 5' &&
        failSequence.afterFail2Lodged.activeCount === 1 &&
        failSequence.afterFail2Lodged.lostCount === 4 &&
        failSequence.afterFail2Lodged.domQueenTitle === 'PRAYING' &&
        failSequence.prayingPersistsAt1Heart.domQueenTitle === 'PRAYING',
      JSON.stringify({
        immediate: failSequence.afterFail2Lodged,
        after80Frames: failSequence.prayingPersistsAt1Heart.domQueenTitle,
      })
    );

    record(
      'M32-10',
      "0-Heart depletion triggers 'town_breached' ('0 / 5', 0 active / 5 lost icons, banner 'Town Breached — Restarting Stage')",
      failSequence.atZeroBreach.hookHearts === 0 &&
        failSequence.atZeroBreach.text === '0 / 5' &&
        failSequence.atZeroBreach.activeCount === 0 &&
        failSequence.atZeroBreach.lostCount === 5 &&
        failSequence.atZeroBreach.status === 'town_breached' &&
        failSequence.atZeroBreach.banner === 'Town Breached — Restarting Stage' &&
        failSequence.atZeroBreach.footerText === 'TOWN BREACHED — RESTARTING STAGE' &&
        failSequence.atZeroBreach.lastSound === 'town_breached',
      JSON.stringify(failSequence.atZeroBreach)
    );

    record(
      'M32-11',
      "Stepping 95 frames after Town Breached automatically resets Stage to 'playing' with '4 / 5' Hearts and WATCHING Queen",
      failSequence.afterBreachRecovery.status === 'playing' &&
        failSequence.afterBreachRecovery.hookHearts === 4 &&
        failSequence.afterBreachRecovery.text === '4 / 5' &&
        failSequence.afterBreachRecovery.activeCount === 4 &&
        failSequence.afterBreachRecovery.lostCount === 1 &&
        failSequence.afterBreachRecovery.domQueenTitle === 'WATCHING',
      JSON.stringify(failSequence.afterBreachRecovery)
    );

    // -------------------------------------------------------------------------
    // 5. Stage Clear, Flawless 5th Heart & localStorage Persistence Across Reload
    // -------------------------------------------------------------------------
    const stageClearBeforeReload = await page.evaluate(() => {
      const hook = (window as any).__TOWNSAVER__;
      hook.resetSave();
      hook.loadStage(1);
      if (!hook.isPaused) {
        document.getElementById('btn-pause')?.click();
      }
      hook.engine.setPaused(false);

      const stClear = hook.clearCurrentStage(false);
      const clearStatus = stClear.status;
      const clearBanner = stClear.statusBanner;
      const heartsAtClear = stClear.hearts;
      const domHeartsAtClear = document.getElementById('hearts-count-text')?.textContent?.trim();
      const activeIconsAtClear = document.querySelectorAll(
        '#hearts-row .heart-icon.active'
      ).length;
      const rawSave = window.localStorage.getItem('townsaver_save_v1');
      const parsedSave = rawSave ? JSON.parse(rawSave) : null;

      // Step 95 frames to transition into Stage 2
      const stStage2 = hook.stepFrames(95);

      return {
        clearStatus,
        clearBanner,
        heartsAtClear,
        domHeartsAtClear,
        activeIconsAtClear,
        savedHighScore: parsedSave?.highScore ?? 0,
        savedUnlockedStage: parsedSave?.unlockedStage ?? 1,
        nextStageNum: stStage2.stage,
        domStageNum: document.getElementById('stage-display-num')?.textContent?.trim(),
        domStageName: document.getElementById('stage-display-name')?.textContent?.trim(),
      };
    });

    record(
      'M32-12',
      "Flawless Stage 1 Clear grants 5th bonus Heart ('5 / 5'), saves progress to localStorage ('townsaver_save_v1'), and advances to Stage 2",
      stageClearBeforeReload.clearStatus === 'stage_clear' &&
        stageClearBeforeReload.clearBanner === 'Stage Clear!' &&
        stageClearBeforeReload.heartsAtClear === 5 &&
        stageClearBeforeReload.domHeartsAtClear === '5 / 5' &&
        stageClearBeforeReload.activeIconsAtClear === 5 &&
        stageClearBeforeReload.savedHighScore > 0 &&
        stageClearBeforeReload.savedUnlockedStage >= 2 &&
        stageClearBeforeReload.nextStageNum === 2 &&
        stageClearBeforeReload.domStageNum === 'STAGE 02' &&
        stageClearBeforeReload.domStageName === 'GOBLIN PATROL',
      JSON.stringify(stageClearBeforeReload)
    );

    // Execute real Chromium page reload and verify persistence!
    await page.reload({ waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(150);

    const afterReload = await page.evaluate(() => {
      const hook = (window as any).__TOWNSAVER__;
      const rawSave = window.localStorage.getItem('townsaver_save_v1');
      const parsedSave = rawSave ? JSON.parse(rawSave) : null;
      return {
        storageHighScore: parsedSave?.highScore ?? 0,
        storageUnlockedStage: parsedSave?.unlockedStage ?? 1,
        hookHighScore: hook.highScore,
        hookUnlockedStage: hook.unlockedStage,
        domHighScoreText: document.getElementById('high-score')?.textContent?.trim(),
      };
    });

    const expectedFormattedHighScore = String(stageClearBeforeReload.savedHighScore).padStart(
      6,
      '0'
    );

    record(
      'M32-13',
      'Full browser page.reload() preserves highScore and unlockedStage in localStorage, window.__TOWNSAVER__, and #high-score DOM',
      afterReload.storageHighScore === stageClearBeforeReload.savedHighScore &&
        afterReload.storageUnlockedStage >= 2 &&
        afterReload.hookHighScore === stageClearBeforeReload.savedHighScore &&
        afterReload.hookUnlockedStage >= 2 &&
        afterReload.domHighScoreText === expectedFormattedHighScore,
      JSON.stringify(afterReload)
    );

    // -------------------------------------------------------------------------
    // 6. Multi-Stage Sweep Stress Test (Stages 1..15 Handcrafted + Stage 16 Endless)
    // -------------------------------------------------------------------------
    const stageSweep = await page.evaluate(() => {
      const hook = (window as any).__TOWNSAVER__;
      const visited: Array<{ stage: number; palette: string; targets: number; hazards: number }> =
        [];
      for (let s = 1; s <= 18; s++) {
        const st = hook.loadStage(s);
        hook.stepFrames(5);
        visited.push({
          stage: st.stage,
          palette: st.terrainPalette,
          targets: st.targets.length,
          hazards: st.hazards.length,
        });
      }
      hook.loadStage(1);
      return visited;
    });

    const allStagesValid =
      stageSweep.length === 18 &&
      stageSweep.every((s, idx) => s.stage === idx + 1 && s.targets >= 3);

    record(
      'M32-14',
      'Live browser sweep across all 15 handcrafted stages + Endless Stages 16..18 loads and renders with zero errors',
      allStagesValid && consoleErrors.length === 0,
      `stagesSwept=${stageSweep.length}, consoleErrors=${consoleErrors.length}`
    );

    console.log('\n================================================================');
    const failed = assertions.filter((a) => !a.passed);
    console.log(
      `Summary: ${assertions.length - failed.length}/${assertions.length} Challenger M3-2 assertions PASSED.`
    );
    console.log('================================================================');

    if (failed.length > 0 || consoleErrors.length > 0) {
      console.error('Failed assertions or console errors:', { failed, consoleErrors });
      process.exitCode = 1;
    }
  } finally {
    await browser.close();
  }
}

runChallengeM3_2().catch((err) => {
  console.error('[Challenger M3-2] Fatal error:', err);
  process.exit(1);
});

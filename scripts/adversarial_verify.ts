/**
 * Townsaver — Milestone 1 Adversarial Challenger Verification Suite
 * Stress-tests input handling, rapid weapon cycling, key/click floods,
 * memory stability, viewport invariants, and console cleanliness.
 */

import { chromium } from 'playwright-core';
import * as path from 'path';
import * as fs from 'fs';

interface ChallengeResult {
  category: string;
  test: string;
  passed: boolean;
  details?: string;
}

const results: ChallengeResult[] = [];

function record(category: string, test: string, passed: boolean, details?: string) {
  results.push({ category, test, passed, details });
  const status = passed ? '✓ PASS' : '✗ FAIL';
  console.log(`[${category}] ${status}: ${test} ${details ? `(${details})` : ''}`);
}

async function runAdversarialSuite() {
  console.log('================================================================');
  console.log('Townsaver M1: Adversarial Stress & Robustness Suite');
  console.log('Target: Google Chrome / Chromium Web (1280x800 desktop)');
  console.log('Dev Server: http://localhost:5173');
  console.log('================================================================\n');

  const targetUrl = process.env.TARGET_URL || 'http://localhost:5173';
  const screenshotDir = path.resolve(process.cwd(), 'screenshots');
  const stressScreenshotPath = path.join(screenshotDir, 'm1_stress_test.png');

  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

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
  const consoleWarnings: string[] = [];
  const pageErrors: string[] = [];

  page.on('console', (msg) => {
    const text = msg.text();
    if (msg.type() === 'error') {
      if (!text.includes('ERR_CERT_AUTHORITY_INVALID')) {
        consoleErrors.push(text);
      }
    } else if (msg.type() === 'warning') {
      consoleWarnings.push(text);
    }
  });

  page.on('pageerror', (err) => {
    pageErrors.push(err.message);
  });

  try {
    // -------------------------------------------------------------------------
    // Phase 1: Navigation & Scaffolding Health
    // -------------------------------------------------------------------------
    console.log('[Phase 1] Navigating and verifying baseline hook...');
    await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 15000 });

    await page.waitForFunction(() => {
      const hook = (window as any).__TOWNSAVER__;
      return hook && hook.canvasReady === true && hook.frameCount >= 5;
    }, { timeout: 10000 });

    const initialHook = await page.evaluate(() => (window as any).__TOWNSAVER__);
    record('Baseline', 'Hook initialized', initialHook?.canvasReady === true, `version: ${initialHook?.version}`);
    record('Baseline', 'Logical dimensions 240x320', initialHook?.width === 240 && initialHook?.height === 320, `${initialHook?.width}x${initialHook?.height}`);

    // Check viewport overflow (no scrollbars at 1280x800)
    const scrollInfo = await page.evaluate(() => {
      return {
        bodyScrollWidth: document.body.scrollWidth,
        bodyClientWidth: document.body.clientWidth,
        bodyScrollHeight: document.body.scrollHeight,
        bodyClientHeight: document.body.clientHeight,
        cabinetWidth: document.getElementById('arcade-cabinet')?.clientWidth,
        cabinetHeight: document.getElementById('arcade-cabinet')?.clientHeight,
      };
    });
    const noOverflow = scrollInfo.bodyScrollWidth <= scrollInfo.bodyClientWidth &&
                       scrollInfo.bodyScrollHeight <= scrollInfo.bodyClientHeight;
    record('Layout', 'No page scrollbars at 1280x800', noOverflow,
      `Scroll: ${scrollInfo.bodyScrollWidth}x${scrollInfo.bodyScrollHeight}, Client: ${scrollInfo.bodyClientWidth}x${scrollInfo.bodyClientHeight}`);

    // Check canvas pixelated rendering
    const canvasStyles = await page.evaluate(() => {
      const canvasEl = document.getElementById('game-canvas');
      if (!canvasEl) return null;
      const computed = window.getComputedStyle(canvasEl);
      return {
        imageRendering: computed.imageRendering,
        width: computed.width,
        height: computed.height,
      };
    });
    const isPixelated = canvasStyles && (canvasStyles.imageRendering.includes('pixelated') || canvasStyles.imageRendering.includes('crisp-edges'));
    record('Rendering', 'Canvas image-rendering is pixelated/crisp-edges', Boolean(isPixelated), `style: ${canvasStyles?.imageRendering}`);

    // -------------------------------------------------------------------------
    // Phase 2: Stress-Test Rapid Weapon Switching Storm
    // -------------------------------------------------------------------------
    console.log('\n[Phase 2] Stress-testing rapid weapon switching (200 cycles)...');
    const weaponKeys = ['Digit1', 'Digit2', 'Digit3', 'Tab', 'KeyQ'];
    for (let i = 0; i < 100; i++) {
      const key = weaponKeys[i % weaponKeys.length];
      await page.keyboard.press(key);
    }
    // Now rapid button clicks on weapon cards
    for (let i = 0; i < 60; i++) {
      const btnId = `#btn-weapon-${(i % 3) + 1}`;
      await page.click(btnId);
    }

    // Verify final state matches exactly
    await page.click('#btn-weapon-2');
    let weapon = await page.evaluate(() => (window as any).__TOWNSAVER__.activeWeapon);
    let activeButtonsCount = await page.evaluate(() => document.querySelectorAll('.weapon-card.active').length);
    record('Weapons', 'Weapon switch to double succeeded after rapid churn', weapon === 'double', `activeWeapon: ${weapon}`);
    record('Weapons', 'Exactly one weapon button is active', activeButtonsCount === 1, `active buttons: ${activeButtonsCount}`);

    await page.keyboard.press('Digit3');
    weapon = await page.evaluate(() => (window as any).__TOWNSAVER__.activeWeapon);
    activeButtonsCount = await page.evaluate(() => document.querySelectorAll('.weapon-card.active').length);
    record('Weapons', 'Keyboard Digit3 sets heavy weapon', weapon === 'heavy', `activeWeapon: ${weapon}`);
    record('Weapons', 'Single button active invariant maintained', activeButtonsCount === 1, `active buttons: ${activeButtonsCount}`);

    // -------------------------------------------------------------------------
    // Phase 3: Stress-Test Rapid Fire & Pointer Storm
    // -------------------------------------------------------------------------
    console.log('\n[Phase 3] Stress-testing rapid fire & pointer click flood...');
    const fireKeys = ['Space', 'KeyW', 'ArrowUp', 'Enter', 'Numpad5'];
    for (let i = 0; i < 100; i++) {
      await page.keyboard.press(fireKeys[i % fireKeys.length]);
    }
    let lastKey = await page.evaluate(() => (window as any).__TOWNSAVER__.lastKeyPressed);
    record('FireKeys', 'Rapid fire keys registered without throwing', typeof lastKey === 'string' && lastKey.includes('FIRE'), `lastKey: ${lastKey}`);

    // Flood canvas clicks at critical boundaries
    const clickPositions = [
      { x: 10, y: 10 },
      { x: 230, y: 310 },
      { x: 0, y: 0 },
      { x: 479, y: 639 }, // Rendered canvas size is 480x640
      { x: 240, y: 320 },
      { x: 120, y: 160 },
      { x: 60, y: 80 },
    ];
    for (let i = 0; i < 70; i++) {
      const pos = clickPositions[i % clickPositions.length];
      await page.click('#game-canvas', { position: pos });
    }
    lastKey = await page.evaluate(() => (window as any).__TOWNSAVER__.lastKeyPressed);
    record('PointerClicks', 'Canvas edge & boundary clicks registered', typeof lastKey === 'string' && lastKey.includes('CLICK'), `lastKey: ${lastKey}`);

    // Click large arcade FIRE button rapidly
    for (let i = 0; i < 30; i++) {
      await page.click('#btn-fire');
    }
    lastKey = await page.evaluate(() => (window as any).__TOWNSAVER__.lastKeyPressed);
    record('FireButton', 'Bezel arcade FIRE button rapid clicks handled', lastKey === 'FIRE_BTN', `lastKey: ${lastKey}`);

    // -------------------------------------------------------------------------
    // Phase 4: Chaotic / Unhandled Keypresses & Boundary Inputs
    // -------------------------------------------------------------------------
    console.log('\n[Phase 4] Testing chaotic / unhandled key inputs...');
    const chaoticKeys = [
      'ShiftLeft', 'AltLeft', 'ControlRight', 'F1', 'F5', 'Backspace',
      'Delete', 'Escape', 'KeyM', 'KeyP', 'KeyR', 'KeyZ', 'KeyX',
      'Semicolon', 'Quote', 'Backslash', 'BracketLeft', 'Minus'
    ];
    for (const k of chaoticKeys) {
      try {
        await page.keyboard.press(k);
      } catch (e) {
        // ignore modifier key constraints if any in playwright
      }
    }
    const hookAfterChaos = await page.evaluate(() => (window as any).__TOWNSAVER__);
    record('ChaosKeys', 'Application survives unhandled keypress barrage', Boolean(hookAfterChaos && hookAfterChaos.canvasReady), 'App intact');

    // -------------------------------------------------------------------------
    // Phase 5: Rapid Stage Selector Cycling & Boundary Wraparound
    // -------------------------------------------------------------------------
    console.log('\n[Phase 5] Stress-testing stage selector cycling & boundary wraparound...');
    for (let i = 0; i < 40; i++) {
      await page.click('#btn-next-stage');
    }
    let stageNum = await page.evaluate(() => (window as any).__TOWNSAVER__.selectedStage);
    const stageDisplayNum = await page.evaluate(() => document.getElementById('stage-display-num')?.textContent);
    const stageDisplayName = await page.evaluate(() => document.getElementById('stage-display-name')?.textContent);
    record('StageCycling', 'Next-stage rapid cycling bounded [1..16]', stageNum >= 1 && stageNum <= 16, `stage: ${stageNum}, display: ${stageDisplayNum}`);
    record('StageCycling', 'Stage display name rendered', Boolean(stageDisplayName && stageDisplayName.length > 0), `name: ${stageDisplayName}`);

    for (let i = 0; i < 40; i++) {
      await page.click('#btn-prev-stage');
    }
    stageNum = await page.evaluate(() => (window as any).__TOWNSAVER__.selectedStage);
    record('StageCycling', 'Prev-stage rapid cycling bounded [1..16]', stageNum >= 1 && stageNum <= 16, `stage: ${stageNum}`);

    // Direct dropdown selection of all 16 stages
    let allStagesValid = true;
    for (let s = 1; s <= 16; s++) {
      await page.selectOption('#stage-select', String(s));
      const cur = await page.evaluate(() => (window as any).__TOWNSAVER__.selectedStage);
      if (cur !== s) allStagesValid = false;
    }
    record('StageDropdown', 'All 16 stages selectable via dropdown', allStagesValid, 'stages 1 to 16 verified');

    // -------------------------------------------------------------------------
    // Phase 6: Rapid Toggle Storm (Pause & Mute)
    // -------------------------------------------------------------------------
    console.log('\n[Phase 6] Stress-testing Pause & Mute rapid toggling...');
    for (let i = 0; i < 50; i++) {
      await page.click('#btn-mute');
    }
    const finalMute = await page.evaluate(() => (window as any).__TOWNSAVER__.soundMuted);
    const muteLabel = await page.evaluate(() => document.getElementById('mute-label')?.textContent);
    const muteIcon = await page.evaluate(() => document.getElementById('mute-icon')?.textContent);
    const muteConsistent = (finalMute && muteLabel?.includes('UNMUTE') && muteIcon === '🔇') ||
                           (!finalMute && muteLabel?.includes('MUTE') && muteIcon === '🔊');
    record('MuteToggle', 'Mute UI remains consistent after 50 toggles', muteConsistent, `soundMuted: ${finalMute}, label: ${muteLabel}`);

    for (let i = 0; i < 50; i++) {
      await page.click('#btn-pause');
    }
    const finalPause = await page.evaluate(() => (window as any).__TOWNSAVER__.isPaused);
    const pauseLabel = await page.evaluate(() => document.getElementById('btn-pause')?.textContent);
    const pauseConsistent = (finalPause && pauseLabel?.includes('RESUME')) ||
                            (!finalPause && pauseLabel?.includes('PAUSE'));
    record('PauseToggle', 'Pause UI remains consistent after 50 toggles', pauseConsistent, `isPaused: ${finalPause}, label: ${pauseLabel}`);

    // -------------------------------------------------------------------------
    // Phase 7: Deterministic Frame Clock & Memory Stability
    // -------------------------------------------------------------------------
    console.log('\n[Phase 7] Monitoring animation clock and memory leak indicators...');
    const frameSample1 = await page.evaluate(() => (window as any).__TOWNSAVER__.frameCount);
    await page.waitForTimeout(2000); // Wait 2 seconds
    const frameSample2 = await page.evaluate(() => (window as any).__TOWNSAVER__.frameCount);
    const fps = await page.evaluate(() => (window as any).__TOWNSAVER__.fps);
    const deltaFrames = frameSample2 - frameSample1;

    // In 2 seconds at 60 FPS, expect ~100-130 frames
    const clockAdvancing = deltaFrames >= 90 && deltaFrames <= 150;
    record('Performance', 'Fixed 60 FPS animation clock advancing steadily', clockAdvancing, `frames elapsed in 2s: ${deltaFrames}, currentFps: ${fps}`);

    // Memory Heap Inspection via Performance API
    const heapInfo = await page.evaluate(() => {
      const perf = window.performance as any;
      if (perf && perf.memory) {
        return {
          usedJSHeapSize: perf.memory.usedJSHeapSize,
          totalJSHeapSize: perf.memory.totalJSHeapSize,
        };
      }
      return null;
    });

    let heapNormal = true;
    let heapDetails = 'N/A';
    if (heapInfo) {
      const usedMB = (heapInfo.usedJSHeapSize / (1024 * 1024)).toFixed(2);
      const totalMB = (heapInfo.totalJSHeapSize / (1024 * 1024)).toFixed(2);
      heapDetails = `used: ${usedMB} MB, total: ${totalMB} MB`;
      // For a lightweight 2D canvas scaffolding, used heap should easily remain < 50MB
      heapNormal = heapInfo.usedJSHeapSize < 50 * 1024 * 1024;
    }
    record('Memory', 'JS Heap usage within normal bounds (<50MB)', heapNormal, heapDetails);

    // -------------------------------------------------------------------------
    // Phase 8: Console Errors & Unhandled Rejections Audit
    // -------------------------------------------------------------------------
    console.log('\n[Phase 8] Auditing console errors and page errors...');
    record('Errors', 'Zero unhandled console errors during stress tests', consoleErrors.length === 0,
      consoleErrors.length > 0 ? consoleErrors.join('; ') : 'clean');
    record('Errors', 'Zero unhandled page exceptions during stress tests', pageErrors.length === 0,
      pageErrors.length > 0 ? pageErrors.join('; ') : 'clean');

    // -------------------------------------------------------------------------
    // Phase 9: Capture Stress Test Proof Screenshot
    // -------------------------------------------------------------------------
    console.log(`\n[Phase 9] Capturing stress test proof screenshot: ${stressScreenshotPath}...`);
    await page.screenshot({ path: stressScreenshotPath, fullPage: false });
    const screenshotOk = fs.existsSync(stressScreenshotPath) && fs.statSync(stressScreenshotPath).size > 10000;
    record('Artifacts', 'Adversarial proof screenshot created (>10KB)', screenshotOk,
      `${fs.statSync(stressScreenshotPath).size} bytes`);

  } finally {
    await browser.close();
  }

  // ---------------------------------------------------------------------------
  // Summary & Evaluation
  // ---------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log('ADVERSARIAL VERIFICATION SUMMARY:');
  console.log('================================================================');
  let failures = 0;
  for (const r of results) {
    const symbol = r.passed ? '✓ PASS' : '✗ FAIL';
    console.log(`${symbol} | [${r.category}] ${r.test} ${r.details ? `-> ${r.details}` : ''}`);
    if (!r.passed) failures++;
  }
  console.log('================================================================');
  console.log(`TOTAL CHECKS: ${results.length} | PASSED: ${results.length - failures} | FAILED: ${failures}`);
  console.log('================================================================\n');

  if (failures > 0) {
    console.error(`VERDICT: REJECT (${failures} failures detected)`);
    process.exit(1);
  } else {
    console.log('VERDICT: APPROVE (All adversarial stress tests passed cleanly)');
    process.exit(0);
  }
}

runAdversarialSuite().catch((err) => {
  console.error('Fatal crash during adversarial suite:', err);
  process.exit(1);
});

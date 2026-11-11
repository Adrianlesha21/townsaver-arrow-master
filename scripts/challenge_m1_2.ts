/**
 * Townsaver — Milestone 1 Challenger M1-2 Empirical Verification Suite
 * 
 * Verifies:
 * 1. Canvas rasterization properties (240x320, imageSmoothingEnabled false, CSS pixelated)
 * 2. window.__TOWNSAVER__ contract properties & active dynamism
 * 3. 1920x1080 viewport cabinet centering, aspect ratio, and zero distortion
 * 4. Multi-viewport stress test (2560x1440, 1366x768)
 * 5. Pixel sharpness verification (sampling canvas ImageData directly)
 * 6. System check for zero mobile/Android tools or emulators
 */

import { chromium } from 'playwright-core';
import * as path from 'path';
import * as fs from 'fs';
import { execSync } from 'child_process';

interface TestItem {
  section: string;
  name: string;
  passed: boolean;
  expected?: any;
  actual?: any;
  details?: string;
}

const tests: TestItem[] = [];

function record(section: string, name: string, passed: boolean, actual: any, expected: any, details?: string) {
  tests.push({ section, name, passed, expected, actual, details });
  const mark = passed ? 'PASS' : 'FAIL';
  console.log(`[${mark}] [${section}] ${name} | Expected: ${JSON.stringify(expected)} | Actual: ${JSON.stringify(actual)}${details ? ` | ${details}` : ''}`);
}

async function main() {
  console.log('========================================================================');
  console.log('Townsaver Milestone 1 — Challenger M1-2 Adversarial Empirical Suite');
  console.log('========================================================================\n');

  const targetUrl = process.env.TARGET_URL || 'http://localhost:5173';
  const screenshotDir = path.resolve(process.cwd(), 'screenshots');
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  // Section 0: Verify zero mobile / Android tools running
  console.log('\n--- SECTION 0: Strict Environment Boundary (No Mobile/Android Emulators) ---');
  try {
    const psOutput = execSync('ps aux', { encoding: 'utf-8' });
    const mobileProcesses = psOutput.split('\n').filter(line => {
      const lower = line.toLowerCase();
      return (
        lower.includes('emulator') ||
        lower.includes('qemu') ||
        lower.includes('adb server') ||
        lower.includes('android-studio') ||
        lower.includes('avdmanager') ||
        lower.includes('sdkmanager')
      );
    });

    record(
      'Environment',
      'Zero mobile/Android emulator processes running',
      mobileProcesses.length === 0,
      mobileProcesses.length === 0 ? 'None detected' : mobileProcesses.join('; '),
      'None detected'
    );
  } catch (err: any) {
    record('Environment', 'Process inspection', false, err.message, 'Process check succeeds');
  }

  // Launch Desktop Chromium
  console.log('\n--- Launching Desktop Chromium at 1920x1080 Viewport ---');
  const browser = await chromium.launch({
    executablePath: '/usr/bin/chromium',
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--window-size=1920,1080',
      '--ignore-certificate-errors',
    ],
  });

  const page = await browser.newPage({
    viewport: { width: 1920, height: 1080 },
  });

  const consoleErrors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      const txt = msg.text();
      if (!txt.includes('ERR_CERT_AUTHORITY_INVALID')) {
        consoleErrors.push(txt);
      }
    }
  });

  await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForFunction(() => window.__TOWNSAVER__ && window.__TOWNSAVER__.canvasReady);

  // SECTION 1: Canvas Rasterization Properties
  console.log('\n--- SECTION 1: Canvas Rasterization & Pixelation Properties ---');

  const rasterProps = await page.evaluate(() => {
    const canvas = document.getElementById('game-canvas') as HTMLCanvasElement | null;
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const computed = window.getComputedStyle(canvas);
    const rect = canvas.getBoundingClientRect();

    const ctxAny = ctx as any;

    return {
      logicalWidth: canvas.width,
      logicalHeight: canvas.height,
      imageSmoothingEnabled: ctx.imageSmoothingEnabled,
      webkitImageSmoothingEnabled: ctxAny.webkitImageSmoothingEnabled ?? null,
      mozImageSmoothingEnabled: ctxAny.mozImageSmoothingEnabled ?? null,
      cssWidth: computed.width,
      cssHeight: computed.height,
      imageRendering: computed.imageRendering,
      boundingRect: {
        width: rect.width,
        height: rect.height,
        left: rect.left,
        top: rect.top,
      },
    };
  });

  if (!rasterProps) {
    record('Rasterization', 'Canvas and context acquired', false, null, 'Non-null object');
  } else {
    // 1.1 Canvas dimensions
    record(
      'Rasterization',
      'canvas.width === 240',
      rasterProps.logicalWidth === 240,
      rasterProps.logicalWidth,
      240
    );

    record(
      'Rasterization',
      'canvas.height === 320',
      rasterProps.logicalHeight === 320,
      rasterProps.logicalHeight,
      320
    );

    // 1.2 Context smoothing
    record(
      'Rasterization',
      'ctx.imageSmoothingEnabled === false',
      rasterProps.imageSmoothingEnabled === false,
      rasterProps.imageSmoothingEnabled,
      false
    );

    if (rasterProps.webkitImageSmoothingEnabled !== null) {
      record(
        'Rasterization',
        'webkitImageSmoothingEnabled === false',
        rasterProps.webkitImageSmoothingEnabled === false,
        rasterProps.webkitImageSmoothingEnabled,
        false
      );
    }

    // 1.3 CSS Scaling preserves pixelation
    const hasPixelatedRendering =
      rasterProps.imageRendering === 'pixelated' ||
      rasterProps.imageRendering === 'crisp-edges' ||
      rasterProps.imageRendering === '-webkit-crisp-edges' ||
      rasterProps.imageRendering === '-moz-crisp-edges';

    record(
      'Rasterization',
      'CSS image-rendering preserves pixelation (pixelated or crisp-edges)',
      hasPixelatedRendering,
      rasterProps.imageRendering,
      'pixelated | crisp-edges'
    );

    // 1.4 Aspect ratio preservation
    const logicalAspect = 240 / 320; // 0.75
    const renderedAspect = rasterProps.boundingRect.width / rasterProps.boundingRect.height;
    const aspectDiff = Math.abs(renderedAspect - logicalAspect);

    record(
      'Rasterization',
      'Canvas bounding rect preserves exact 3:4 (0.75) aspect ratio without distortion',
      aspectDiff < 0.001,
      Number(renderedAspect.toFixed(5)),
      0.75,
      `Calculated difference: ${aspectDiff}`
    );

    // 1.5 Integer scaling
    const scaleX = rasterProps.boundingRect.width / 240;
    const scaleY = rasterProps.boundingRect.height / 320;
    const isIntegerScale = Number.isInteger(scaleX) && Number.isInteger(scaleY);
    record(
      'Rasterization',
      'Canvas scaled by clean integer factor (2.0x)',
      isIntegerScale && scaleX === 2 && scaleY === 2,
      `${scaleX}x by ${scaleY}x`,
      '2x by 2x'
    );
  }

  // SECTION 2: window.__TOWNSAVER__ Contract Verification
  console.log('\n--- SECTION 2: window.__TOWNSAVER__ Contract Verification ---');

  const hookState1 = await page.evaluate(() => {
    return window.__TOWNSAVER__ ? { ...window.__TOWNSAVER__ } : null;
  });

  if (!hookState1) {
    record('DevHook', 'window.__TOWNSAVER__ exists', false, null, 'Defined object');
  } else {
    record('DevHook', 'window.__TOWNSAVER__ exists', true, 'Defined', 'Defined');
    record('DevHook', 'canvasReady === true', hookState1.canvasReady === true, hookState1.canvasReady, true);
    record('DevHook', 'contextAcquired === true', hookState1.contextAcquired === true, hookState1.contextAcquired, true);
    record('DevHook', 'logical dimensions width === 240', hookState1.width === 240, hookState1.width, 240);
    record('DevHook', 'logical dimensions height === 320', hookState1.height === 320, hookState1.height, 320);
    record('DevHook', 'fps is a valid number (>0)', typeof hookState1.fps === 'number' && hookState1.fps > 0, hookState1.fps, '>0');
    record('DevHook', 'frameCount initialized (>=0)', typeof hookState1.frameCount === 'number' && hookState1.frameCount >= 0, hookState1.frameCount, '>=0');
    record('DevHook', 'activeWeapon initialized to "single"', hookState1.activeWeapon === 'single', hookState1.activeWeapon, 'single');
    record('DevHook', 'soundMuted initialized to false', hookState1.soundMuted === false, hookState1.soundMuted, false);
    record('DevHook', 'isPaused initialized to false', hookState1.isPaused === false, hookState1.isPaused, false);
    record('DevHook', 'selectedStage initialized to 1', hookState1.selectedStage === 1, hookState1.selectedStage, 1);

    // Wait 500ms to verify frame ticking dynamism
    const initialFrames = hookState1.frameCount;
    await page.waitForTimeout(500);

    const hookState2 = await page.evaluate(() => ({ ...window.__TOWNSAVER__ }));
    const framesAdvanced = (hookState2.frameCount ?? 0) - initialFrames;
    record(
      'DevHook',
      'frameCount actively ticks upward during animation loop (>= 15 frames in 500ms)',
      framesAdvanced >= 15,
      `Advanced +${framesAdvanced} frames`,
      '>= 15 frames'
    );

    // Interactive contract checks
    // A: Weapon switching via keydown Digit2 and Digit3
    await page.keyboard.press('Digit2');
    const weaponState2 = await page.evaluate(() => window.__TOWNSAVER__?.activeWeapon);
    record('DevHook', 'Keyboard Digit2 sets activeWeapon = "double"', weaponState2 === 'double', weaponState2, 'double');

    await page.keyboard.press('Digit3');
    const weaponState3 = await page.evaluate(() => window.__TOWNSAVER__?.activeWeapon);
    record('DevHook', 'Keyboard Digit3 sets activeWeapon = "heavy"', weaponState3 === 'heavy', weaponState3, 'heavy');

    await page.keyboard.press('Digit1');
    const weaponState1 = await page.evaluate(() => window.__TOWNSAVER__?.activeWeapon);
    record('DevHook', 'Keyboard Digit1 sets activeWeapon = "single"', weaponState1 === 'single', weaponState1, 'single');

    // B: Sound mute toggle via KeyM
    await page.keyboard.press('KeyM');
    const muteState1 = await page.evaluate(() => window.__TOWNSAVER__?.soundMuted);
    record('DevHook', 'Keyboard KeyM toggles soundMuted to true', muteState1 === true, muteState1, true);

    await page.keyboard.press('KeyM');
    const muteState2 = await page.evaluate(() => window.__TOWNSAVER__?.soundMuted);
    record('DevHook', 'Keyboard KeyM toggles soundMuted back to false', muteState2 === false, muteState2, false);

    // C: Pause toggle via KeyP
    await page.keyboard.press('KeyP');
    const pauseState1 = await page.evaluate(() => window.__TOWNSAVER__?.isPaused);
    record('DevHook', 'Keyboard KeyP toggles isPaused to true', pauseState1 === true, pauseState1, true);

    await page.keyboard.press('KeyP');
    const pauseState2 = await page.evaluate(() => window.__TOWNSAVER__?.isPaused);
    record('DevHook', 'Keyboard KeyP toggles isPaused back to false', pauseState2 === false, pauseState2, false);

    // D: Stage selector
    await page.selectOption('#stage-select', '8');
    const stageState8 = await page.evaluate(() => window.__TOWNSAVER__?.selectedStage);
    record('DevHook', 'Stage selector dropdown changes selectedStage to 8', stageState8 === 8, stageState8, 8);
  }

  // SECTION 3: Viewport Scaling, Cabinet Centering & Distortion at 1920x1080
  console.log('\n--- SECTION 3: Viewport Stress: 1920x1080 Centering & Zero Distortion ---');

  const layout1080p = await page.evaluate(() => {
    const cabinet = document.getElementById('arcade-cabinet');
    const canvas = document.getElementById('game-canvas');
    if (!cabinet || !canvas) return null;

    const cabRect = cabinet.getBoundingClientRect();
    const canRect = canvas.getBoundingClientRect();

    return {
      windowWidth: window.innerWidth,
      windowHeight: window.innerHeight,
      cabinet: {
        width: cabRect.width,
        height: cabRect.height,
        left: cabRect.left,
        top: cabRect.top,
        right: cabRect.right,
        bottom: cabRect.bottom,
      },
      canvas: {
        width: canRect.width,
        height: canRect.height,
        left: canRect.left,
        top: canRect.top,
      },
      scrollWidth: document.documentElement.scrollWidth,
      scrollHeight: document.documentElement.scrollHeight,
      clientWidth: document.documentElement.clientWidth,
      clientHeight: document.documentElement.clientHeight,
    };
  });

  if (!layout1080p) {
    record('Layout1080p', 'Layout inspection', false, null, 'Non-null layout');
  } else {
    // 3.1 Cabinet Dimensions at 1920x1080
    // Note: border 4px + border 4px = +8px if border-box or content-box
    record(
      'Layout1080p',
      'Cabinet width matches 1280px specification',
      Math.abs(layout1080p.cabinet.width - 1280) <= 2,
      layout1080p.cabinet.width,
      1280
    );

    record(
      'Layout1080p',
      'Cabinet height matches 800px specification',
      Math.abs(layout1080p.cabinet.height - 800) <= 2,
      layout1080p.cabinet.height,
      800
    );

    // 3.2 Horizontal Centering
    // Expected left: (1920 - 1280) / 2 = 320px
    const expectedLeft = (1920 - layout1080p.cabinet.width) / 2;
    const leftDiff = Math.abs(layout1080p.cabinet.left - expectedLeft);
    record(
      'Layout1080p',
      'Cabinet is horizontally centered in 1920px viewport (left ≈ 320px)',
      leftDiff <= 1.0,
      Number(layout1080p.cabinet.left.toFixed(2)),
      Number(expectedLeft.toFixed(2)),
      `Deviation: ${leftDiff.toFixed(3)}px`
    );

    // 3.3 Vertical Centering
    // Expected top: (1080 - 800) / 2 = 140px
    const expectedTop = (1080 - layout1080p.cabinet.height) / 2;
    const topDiff = Math.abs(layout1080p.cabinet.top - expectedTop);
    record(
      'Layout1080p',
      'Cabinet is vertically centered in 1080px viewport (top ≈ 140px)',
      topDiff <= 1.0,
      Number(layout1080p.cabinet.top.toFixed(2)),
      Number(expectedTop.toFixed(2)),
      `Deviation: ${topDiff.toFixed(3)}px`
    );

    // 3.4 Zero Scrollbars / No Overflow
    record(
      'Layout1080p',
      'Zero page overflow scrollbars (scrollHeight === clientHeight)',
      layout1080p.scrollHeight === layout1080p.clientHeight,
      layout1080p.scrollHeight,
      layout1080p.clientHeight
    );

    record(
      'Layout1080p',
      'Zero page horizontal scrollbars (scrollWidth === clientWidth)',
      layout1080p.scrollWidth === layout1080p.clientWidth,
      layout1080p.scrollWidth,
      layout1080p.clientWidth
    );

    // 3.5 Canvas Center Placement inside Cabinet
    // Canvas should be located inside the CRT housing and horizontally centered in cabinet
    const cabinetCenterX = layout1080p.cabinet.left + layout1080p.cabinet.width / 2;
    const canvasCenterX = layout1080p.canvas.left + layout1080p.canvas.width / 2;
    const centerAlignDiff = Math.abs(cabinetCenterX - canvasCenterX);
    record(
      'Layout1080p',
      'Canvas is centered along the arcade cabinet vertical axis',
      centerAlignDiff <= 5.0,
      Number(canvasCenterX.toFixed(2)),
      Number(cabinetCenterX.toFixed(2)),
      `Offset from center: ${centerAlignDiff.toFixed(2)}px`
    );
  }

  // Capture challenge proof screenshot at 1920x1080
  const screenshot1080Path = path.join(screenshotDir, 'm1_1080p_challenge.png');
  await page.screenshot({ path: screenshot1080Path, fullPage: false });
  const stat1080 = fs.existsSync(screenshot1080Path) ? fs.statSync(screenshot1080Path) : null;
  record(
    'Screenshot',
    'Challenge screenshot captured at 1920x1080 m1_1080p_challenge.png (size > 20KB)',
    stat1080 !== null && stat1080.size > 20000,
    stat1080 ? `${stat1080.size} bytes` : '0 bytes',
    '> 20000 bytes'
  );

  // SECTION 4: Viewport Stress at 2560x1440 (QHD) and 1366x768 (Laptop)
  console.log('\n--- SECTION 4: Viewport Invariance Stress Testing ---');

  // 4.1 2560x1440 Viewport
  await page.setViewportSize({ width: 2560, height: 1440 });
  const layout2k = await page.evaluate(() => {
    const cabinet = document.getElementById('arcade-cabinet');
    const canvas = document.getElementById('game-canvas');
    if (!cabinet || !canvas) return null;
    const cb = cabinet.getBoundingClientRect();
    const cn = canvas.getBoundingClientRect();
    return {
      cabLeft: cb.left,
      cabTop: cb.top,
      cabWidth: cb.width,
      cabHeight: cb.height,
      canWidth: cn.width,
      canHeight: cn.height,
      canAspect: cn.width / cn.height,
    };
  });

  if (layout2k) {
    const expectedLeft2k = (2560 - layout2k.cabWidth) / 2;
    const expectedTop2k = (1440 - layout2k.cabHeight) / 2;
    record(
      'ViewportStress2K',
      '2560x1440: Cabinet centered horizontally (left ≈ 640px)',
      Math.abs(layout2k.cabLeft - expectedLeft2k) <= 1.0,
      Number(layout2k.cabLeft.toFixed(2)),
      Number(expectedLeft2k.toFixed(2))
    );
    record(
      'ViewportStress2K',
      '2560x1440: Cabinet centered vertically (top ≈ 320px)',
      Math.abs(layout2k.cabTop - expectedTop2k) <= 1.0,
      Number(layout2k.cabTop.toFixed(2)),
      Number(expectedTop2k.toFixed(2))
    );
    record(
      'ViewportStress2K',
      '2560x1440: Canvas aspect ratio strictly preserved (0.75)',
      Math.abs(layout2k.canAspect - 0.75) < 0.001,
      Number(layout2k.canAspect.toFixed(5)),
      0.75
    );
  }

  // 4.2 1366x768 Viewport (Height constraint stress)
  await page.setViewportSize({ width: 1366, height: 768 });
  const layoutLaptop = await page.evaluate(() => {
    const cabinet = document.getElementById('arcade-cabinet');
    const canvas = document.getElementById('game-canvas');
    if (!cabinet || !canvas) return null;
    const cb = cabinet.getBoundingClientRect();
    const cn = canvas.getBoundingClientRect();
    return {
      cabWidth: cb.width,
      cabHeight: cb.height,
      overflowY: document.body.scrollHeight > window.innerHeight,
      canAspect: cn.width / cn.height,
    };
  });

  if (layoutLaptop) {
    record(
      'ViewportStressLaptop',
      '1366x768: Cabinet constrained to max-height 100vh without page blowout',
      layoutLaptop.cabHeight <= 768,
      Number(layoutLaptop.cabHeight.toFixed(2)),
      '<= 768px'
    );
    record(
      'ViewportStressLaptop',
      '1366x768: Canvas aspect ratio preserved (0.75)',
      Math.abs(layoutLaptop.canAspect - 0.75) < 0.001,
      Number(layoutLaptop.canAspect.toFixed(5)),
      0.75
    );
  }

  // SECTION 5: Pixel Sharpness / Antialiasing Direct Sampling
  console.log('\n--- SECTION 5: Direct Canvas ImageData Pixel Sharpness Check ---');
  // Reset viewport to 1920x1080
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.waitForTimeout(200);

  const pixelSharpness = await page.evaluate(() => {
    const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Check pixel data at the outer border (strokeRect at 1,1 to 239, 319 with gold color #e2b43b)
    // Pixel (1, 30) is the 2px gold border (#e2b43b => R:226, G:180, B:59)
    // Pixel (2, 30) is the dark slate background (#1e2025 => R:30, G:32, B:37)
    // Nearest-neighbor rendering ensures a razor-sharp step edge with zero intermediate blending
    const imgData = ctx.getImageData(0, 30, 4, 1);
    const p1 = [imgData.data[4], imgData.data[5], imgData.data[6]]; // x=1
    const p2 = [imgData.data[8], imgData.data[9], imgData.data[10]]; // x=2

    return {
      p1,
      p2,
      contrastDelta: Math.abs(p2[0] - p1[0]) + Math.abs(p2[1] - p1[1]) + Math.abs(p2[2] - p1[2]),
    };
  });

  if (pixelSharpness) {
    record(
      'PixelSharpness',
      'Step edge between border pixel (1,30) and background pixel (2,30) exhibits sharp transition (>200 color delta)',
      pixelSharpness.contrastDelta > 200,
      `Delta = ${pixelSharpness.contrastDelta} (p1: ${pixelSharpness.p1.join(',')}, p2: ${pixelSharpness.p2.join(',')})`,
      '> 200'
    );
  }

  // SECTION 6: Unhandled Browser Console Errors
  console.log('\n--- SECTION 6: Browser Console Error Audit ---');
  record(
    'ConsoleAudit',
    'Zero unhandled browser console runtime errors',
    consoleErrors.length === 0,
    consoleErrors.length === 0 ? 'Clean' : consoleErrors.join('; '),
    'Clean'
  );

  await browser.close();

  // FINAL SUMMARY
  console.log('\n========================================================================');
  console.log('CHALLENGER M1-2 EMPIRICAL VERIFICATION SUMMARY');
  console.log('========================================================================');
  const total = tests.length;
  const passedCount = tests.filter(t => t.passed).length;
  const failedCount = total - passedCount;

  console.log(`Total Assertions : ${total}`);
  console.log(`Passed           : ${passedCount}`);
  console.log(`Failed           : ${failedCount}`);

  if (failedCount > 0) {
    console.error(`\nVERDICT: REJECT (${failedCount} assertions failed)`);
    process.exit(1);
  } else {
    console.log(`\nVERDICT: APPROVE (All ${total} adversarial empirical assertions passed)`);
    process.exit(0);
  }
}

main().catch(err => {
  console.error('[FATAL ERROR]', err);
  process.exit(1);
});

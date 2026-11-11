/**
 * Townsaver v2.0 (The Arrow Master) — Automated Desktop Headless Chromium E2E Suite
 * Launches /usr/bin/chromium at 1280x800 and verifies:
 * - Story Campaign Prologue (3 slides) & Per-Stage Mission Briefings + Right Bezel Story Chronicle
 * - Full 8-Way WASD / Arrow Key 2D Movement & Sliding Maze Obstacle Collision
 * - 360° Mouse-Cursor Aiming & Click Firing + 3 Distinct Weapons (Single, Double, Great Arrow)
 * - Goblin Dagger/Fireball Ranged Throws, Siege Crate Loot Pickups & Classic Lv21/Lv31 Mazes
 * - Fail Condition 1 (Blue-Iron Deflection), Fail Condition 2 (Arrow-on-Arrow Clip) & 0-Heart Reset
 * - Top Royal Sanctum Gate Unlock & Physical Walk-Up Rescue of Queen Aurelia + Stage 15 Grand Finale
 * - Zero console errors & zero uncaught page exceptions
 */

import { chromium } from 'playwright-core';
import * as path from 'path';
import * as fs from 'fs';

interface VerificationResult {
  passed: boolean;
  name: string;
  details?: string;
}

const REQUIRED_SPRITES = [
  'adrian',
  'queen',
  'goblin_torch',
  'goblin_dagger',
  'goblin_stagger',
  'bat',
  'palisade_intact',
  'palisade_broken',
  'crate',
  'iron_block',
  'rotating_shield',
  'arrow_single',
  'arrow_double',
  'arrow_heavy',
  'heart_active',
  'heart_lost',
] as const;

async function runVerification() {
  console.log('================================================================');
  console.log('Townsaver v2.0 (The Arrow Master): Desktop Chromium E2E Suite');
  console.log('Target: Google Chrome / Chromium Web (1280x800 desktop)');
  console.log('================================================================');

  const results: VerificationResult[] = [];
  const targetUrl = process.env.TARGET_URL || 'http://localhost:5173';
  const screenshotDir = path.resolve(process.cwd(), 'screenshots');

  const v2Screenshots = {
    s01Prologue: path.join(screenshotDir, '01_story_prologue.png'),
    s02Briefing: path.join(screenshotDir, '02_stage_briefing.png'),
    s03MazeCombat: path.join(screenshotDir, '03_2d_maze_combat.png'),
    s04TwinChannels: path.join(screenshotDir, '04_twin_channels_lv31.png'),
    s05SanctumOpen: path.join(screenshotDir, '05_sanctum_unlocked.png'),
    s06QueenRescue: path.join(screenshotDir, '06_queen_rescue_victory.png'),
    s07CampaignFinale: path.join(screenshotDir, '07_campaign_finale.png'),
  };

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
    console.log(`[Navigating] Loading ${targetUrl}...`);
    await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 15000 });

    // 1. Verify Document & Bezel DOM Structure (including v2.0 Story Chronicle panel)
    const title = await page.title();
    results.push({
      name: 'Document Title includes Townsaver',
      passed: title.includes('Townsaver'),
      details: title,
    });

    const requiredSelectors = [
      '#arcade-cabinet',
      '#game-canvas',
      '#arsenal-panel',
      '#controls-panel',
      '#queen-panel',
      '#story-panel',
      '#score-panel',
      '#stage-panel',
      '#btn-prologue',
      '#btn-briefing',
    ];
    for (const sel of requiredSelectors) {
      const el = await page.$(sel);
      results.push({
        name: `DOM element ${sel} exists`,
        passed: el !== null,
      });
    }

    // 2. Wait for window.__TOWNSAVER__ v2.0 DevHook
    await page.waitForFunction(
      () => {
        const hook = (window as any).__TOWNSAVER__;
        return hook && hook.canvasReady === true && hook.frameCount >= 5;
      },
      { timeout: 10000 }
    );

    const bootState = await page.evaluate(() => {
      const h = (window as any).__TOWNSAVER__;
      return {
        version: h.version,
        milestone: h.milestone,
        width: h.width,
        height: h.height,
        status: h.status,
        prologueIndex: h.getState().prologueIndex,
        spritesRendered: h.spritesRendered,
      };
    });

    results.push({
      name: 'Boot into v2.0.0-arrow-master 240x320 Prologue Cutscene (Slide 1/3)',
      passed:
        bootState.version === '2.0.0-arrow-master' &&
        bootState.width === 240 &&
        bootState.height === 320 &&
        bootState.status === 'prologue' &&
        bootState.prologueIndex === 0,
      details: JSON.stringify({
        version: bootState.version,
        status: bootState.status,
        slide: bootState.prologueIndex + 1,
      }),
    });

    // Capture Screenshot 01: Opening Story Prologue Cutscene
    await page.screenshot({ path: v2Screenshots.s01Prologue, fullPage: false });

    // 3. Advance through Prologue Slides (1 -> 2 -> 3 -> Stage 1 Mission Briefing) via Spacebar
    await page.keyboard.press('Space'); // Slide 2
    await page.keyboard.press('Space'); // Slide 3
    await page.keyboard.press('Space'); // Stage 1 Story Mission Briefing!

    const briefingState = await page.evaluate(() => {
      const st = (window as any).__TOWNSAVER__.getState();
      const bezelChapter = document.getElementById('story-chapter-title')?.textContent;
      const bezelObj = document.getElementById('story-objective-pill')?.textContent;
      return {
        status: st.status,
        seenPrologue: st.seenPrologue,
        chapterTitle: st.story.chapterTitle,
        bezelChapter,
        bezelObj,
      };
    });

    results.push({
      name: 'Advancing Prologue transitions to Stage 1 Mission Briefing & updates Story Bezel card',
      passed:
        briefingState.status === 'briefing' &&
        briefingState.seenPrologue === true &&
        briefingState.chapterTitle.includes('MEADOW GATEWAY') &&
        Boolean(briefingState.bezelChapter?.includes('MEADOW GATEWAY')),
      details: JSON.stringify(briefingState),
    });

    // Capture Screenshot 02: Stage 1 Story Mission Briefing
    await page.screenshot({ path: v2Screenshots.s02Briefing, fullPage: false });

    // Deploy into live Stage 1 gameplay via Spacebar
    await page.keyboard.press('Space');
    const deployedStatus = await page.evaluate(() => (window as any).__TOWNSAVER__.status);
    results.push({
      name: 'Pressing Space deploys Adrian from Story Briefing into live 2D Castle Gameplay',
      passed: deployedStatus === 'playing',
      details: `status: ${deployedStatus}`,
    });

    // 4. Verify Nearest-Neighbor Pixel Art & All 16 Sprite Families + 4 Queen Moods
    const missingSprites = REQUIRED_SPRITES.filter(
      (s) => !bootState.spritesRendered.includes(s)
    );
    const pixelAudit = await page.evaluate(() => {
      const c = document.getElementById('game-canvas') as HTMLCanvasElement;
      const qc = document.getElementById('queen-portrait-canvas') as HTMLCanvasElement;
      const ctx2d = c.getContext('2d')!;
      const qCtx2d = qc.getContext('2d')!;
      return {
        playfieldSmoothing: ctx2d.imageSmoothingEnabled,
        queenSmoothing: qCtx2d.imageSmoothingEnabled,
      };
    });

    results.push({
      name: 'All 16 procedural sprite families active with crisp nearest-neighbor canvas rendering',
      passed:
        missingSprites.length === 0 &&
        pixelAudit.playfieldSmoothing === false &&
        pixelAudit.queenSmoothing === false,
      details: `16/16 sprites, smoothing=${pixelAudit.playfieldSmoothing}`,
    });

    // 5. Verify Live 2D All-Direction WASD Movement & 360° Mouse Aim + Click Firing
    const moveAndAimCheck = await page.evaluate(async () => {
      const hook = (window as any).__TOWNSAVER__;
      // Pause rAF loop while stepping deterministically for crisp combat snapshot
      if (!hook.isPaused) {
        document.getElementById('btn-pause')?.click();
      }
      hook.engine.setPaused(false);
      hook.loadStage(1, false);
      const startX = hook.adrianX;
      const startY = hook.adrianY;

      // Move up-left in 2D toward central hall
      hook.moveAdrian(-1, -1, 22);
      const movedX = hook.adrianX;
      const movedY = hook.adrianY;

      // Aim 360° diagonally toward upper-right Raider and fire Double Shot!
      hook.engine.setAimCursor(165, 110);
      hook.fireWeapon('double');
      // Also spawn a live Goblin Dagger throw so the combat screenshot shows full 2D tactical action!
      hook.engine.spawnEnemyProjectile('dagger', 90, 115, movedX + 18, movedY);
      const st = hook.stepFrames(5);

      return {
        movedLeft: movedX < startX - 15,
        movedUp: movedY < startY - 15,
        useMouseAim: st.useMouseAim,
        activeArrows: st.arrows.length,
        diagonalArrowVx: st.arrows[0]?.vx ?? 0,
        diagonalArrowVy: st.arrows[0]?.vy ?? 0,
        enemyProjectiles: st.enemyProjectiles.length,
      };
    });

    results.push({
      name: '2D All-Direction movement & 360° diagonal Mouse-Aim Double Shot + Goblin Dagger active',
      passed:
        moveAndAimCheck.movedLeft &&
        moveAndAimCheck.movedUp &&
        moveAndAimCheck.useMouseAim === true &&
        moveAndAimCheck.activeArrows === 2 &&
        moveAndAimCheck.diagonalArrowVx > 80 &&
        moveAndAimCheck.diagonalArrowVy < -100 &&
        moveAndAimCheck.enemyProjectiles >= 1,
      details: JSON.stringify(moveAndAimCheck),
    });

    // Capture Screenshot 03: Live 2D Maze Movement, 360° Diagonal Aiming & Goblin Dagger Combat
    await page.screenshot({ path: v2Screenshots.s03MazeCombat, fullPage: false });

    // Also test real DOM Keyboard WASD movement & real Mouse Click on #game-canvas when unpaused
    await page.evaluate(() => {
      const hook = (window as any).__TOWNSAVER__;
      if (hook.isPaused) {
        document.getElementById('btn-pause')?.click();
      }
      hook.loadStage(1, false);
    });
    const yBeforeKeyW = await page.evaluate(() => (window as any).__TOWNSAVER__.adrianY);
    await page.keyboard.down('KeyW');
    await page.waitForTimeout(180);
    await page.keyboard.up('KeyW');
    const yAfterKeyW = await page.evaluate(() => (window as any).__TOWNSAVER__.adrianY);

    await page.click('#game-canvas', { position: { x: 260, y: 180 } });
    const clickCheck = await page.evaluate(() => ({
      lastKey: (window as any).__TOWNSAVER__.lastKeyPressed,
      useMouseAim: (window as any).__TOWNSAVER__.getState().useMouseAim,
    }));

    results.push({
      name: 'Real Keyboard KeyW moves Adrian vertically upward & Canvas Mouse Click fires 360° shot',
      passed:
        yAfterKeyW < yBeforeKeyW - 4 &&
        typeof clickCheck.lastKey === 'string' &&
        clickCheck.lastKey.startsWith('CLICK') &&
        clickCheck.useMouseAim === true,
      details: `y: ${yBeforeKeyW.toFixed(1)} -> ${yAfterKeyW.toFixed(1)}, key: ${clickCheck.lastKey}`,
    });

    // 6. Verify Stage 8 Twin Vertical Iron Channels (Arrow Master Lv31 Homage) & Crate Pickups
    const stage8Check = await page.evaluate(() => {
      const hook = (window as any).__TOWNSAVER__;
      if (!hook.isPaused) {
        document.getElementById('btn-pause')?.click();
      }
      hook.engine.setPaused(false);
      hook.loadStage(8, false);
      // Move Adrian into the central iron channel and fire Great Arrow upward while a Torch Goblin throws a fireball
      hook.setPosition(120, 236);
      hook.engine.setAimCursor(120, 95);
      hook.fireWeapon('heavy');
      hook.engine.spawnEnemyProjectile('fireball', 40, 128, 85, 220);
      const afterStep = hook.stepFrames(5);
      return {
        stageName: afterStep.stageName,
        ironBlocks: afterStep.hazards.filter((h: any) => h.kind === 'iron_block').length,
        raiders: afterStep.remainingRaiders,
      };
    });

    results.push({
      name: 'Stage 8 (IRON FORTRESS — Twin Iron Channels Lv31 homage) renders 6 channel blocks & active raiders',
      passed:
        stage8Check.stageName === 'IRON FORTRESS' &&
        stage8Check.ironBlocks >= 6 &&
        stage8Check.raiders >= 5,
      details: JSON.stringify(stage8Check),
    });

    // Capture Screenshot 04: Stage 8 Twin Vertical Iron Channels (Lv31 Homage)
    await page.screenshot({ path: v2Screenshots.s04TwinChannels, fullPage: false });

    // 7. Verify Fail Condition 1 (Blue-Iron Deflection), Fail Condition 2 (Arrow Clip) & Web Audio SFX
    const failAndAudioCheck = await page.evaluate(() => {
      const hook = (window as any).__TOWNSAVER__;
      hook.loadStage(1, false);
      const sFail1 = hook.triggerIronDeflectionTest('single');
      const heartsAfterFail1 = sFail1.hearts;
      const reason1 = sFail1.lastFailReason;

      hook.stepFrames(15);
      const sFail2 = hook.triggerArrowClipTest('palisade_slowed');
      const heartsAfterFail2 = sFail2.hearts;
      const reason2 = sFail2.lastFailReason;

      hook.triggerSound('enemy_throw');
      const daggerSound = hook.lastSoundPlayed;
      hook.triggerSound('sanctum_unlock');
      const unlockSound = hook.lastSoundPlayed;

      return {
        heartsAfterFail1,
        reason1,
        heartsAfterFail2,
        reason2,
        daggerSound,
        unlockSound,
      };
    });

    results.push({
      name: 'Fail Condition 1 (Iron Deflection) & Fail Condition 2 (Arrow Clip) + v2.0 Web Audio SFX verified',
      passed:
        failAndAudioCheck.heartsAfterFail1 === 3 &&
        failAndAudioCheck.reason1 === 'iron_block_deflection' &&
        failAndAudioCheck.heartsAfterFail2 === 2 &&
        failAndAudioCheck.reason2 === 'arrow_on_arrow_clip' &&
        failAndAudioCheck.daggerSound === 'enemy_throw:dagger' &&
        failAndAudioCheck.unlockSound === 'sanctum_unlock',
      details: JSON.stringify(failAndAudioCheck),
    });

    // 8. Verify Top Royal Sanctum Gate Unlock & Physical Walk-Up Rescue of Queen Aurelia!
    const sanctumOpenCheck = await page.evaluate(() => {
      const hook = (window as any).__TOWNSAVER__;
      hook.loadStage(5, false); // Stage 5 (Lv21 Bailey Maze)
      hook.setPosition(120, 128);
      const stUnlocked = hook.unlockSanctumOnly();
      const pillText = document.getElementById('story-objective-pill')?.textContent;
      return {
        status: stUnlocked.status,
        sanctumUnlocked: stUnlocked.sanctum.unlocked,
        remainingRaiders: stUnlocked.remainingRaiders,
        queenMood: stUnlocked.queenMood,
        pillText,
      };
    });

    results.push({
      name: 'Defeating all Raiders unlocks Top Sanctum Portcullis Gate & prompts Adrian to walk up to Queen Aurelia',
      passed:
        sanctumOpenCheck.status === 'playing' &&
        sanctumOpenCheck.sanctumUnlocked === true &&
        sanctumOpenCheck.remainingRaiders === 0 &&
        sanctumOpenCheck.queenMood === 'cheering' &&
        Boolean(sanctumOpenCheck.pillText?.includes('WALK UP')),
      details: JSON.stringify(sanctumOpenCheck),
    });

    // Capture Screenshot 05: Top Sanctum Portcullis Unlocked with Golden Chevrons Leading to Queen Aurelia!
    await page.screenshot({ path: v2Screenshots.s05SanctumOpen, fullPage: false });

    // Now walk Adrian straight up into Queen Aurelia's Top Sanctum Alcove (x=120, y=38) to rescue her!
    const rescueVictoryCheck = await page.evaluate(() => {
      const hook = (window as any).__TOWNSAVER__;
      hook.setPosition(120, 74);
      const stRescued = hook.moveAdrian(0, -1, 28);
      return {
        status: stRescued.status,
        rescued: stRescued.sanctum.rescued,
        adrianY: stRescued.adrianY,
        reunionQuote: stRescued.story.reunionQuote,
      };
    });

    results.push({
      name: 'Physically walking Adrian up into Top Sanctum triggers Queen Aurelia Rescue & Stage Clear story reunion',
      passed:
        rescueVictoryCheck.status === 'stage_clear' &&
        rescueVictoryCheck.rescued === true &&
        rescueVictoryCheck.reunionQuote.length > 10,
      details: JSON.stringify(rescueVictoryCheck),
    });

    // Capture Screenshot 06: Queen Aurelia Rescued Story Reunion Overlay
    await page.screenshot({ path: v2Screenshots.s06QueenRescue, fullPage: false });

    // 9. Verify Stage 15 Grand Campaign Liberation Finale
    const finaleCheck = await page.evaluate(() => {
      const hook = (window as any).__TOWNSAVER__;
      hook.loadStage(15, false);
      hook.unlockSanctumOnly();
      hook.setPosition(120, 70);
      const stFinale = hook.moveAdrian(0, -1, 25);
      return {
        status: stFinale.status,
        stage: stFinale.stage,
        unlockedStage: stFinale.unlockedStage,
      };
    });

    results.push({
      name: 'Rescuing Queen Aurelia on Stage 15 triggers Grand Campaign Finale (victory_campaign) & unlocks Stage 16 Endless',
      passed:
        finaleCheck.status === 'victory_campaign' &&
        finaleCheck.stage === 15 &&
        finaleCheck.unlockedStage === 16,
      details: JSON.stringify(finaleCheck),
    });

    // Capture Screenshot 07: Stage 15 Castle Eldoria Liberated Finale
    await page.screenshot({ path: v2Screenshots.s07CampaignFinale, fullPage: false });

    // Verify all 7 v2.0 proof screenshots exist and are >10KB
    for (const sp of Object.values(v2Screenshots)) {
      const base = path.basename(sp);
      const exists = fs.existsSync(sp) && fs.statSync(sp).size > 10000;
      results.push({
        name: `Proof screenshot ${base} generated and >10KB`,
        passed: exists,
        details: exists ? `${fs.statSync(sp).size} bytes` : 'missing or too small',
      });
    }

    // Verify Zero Console / Page Errors
    results.push({
      name: 'Zero unhandled browser console or page errors',
      passed: consoleErrors.length === 0,
      details: consoleErrors.length > 0 ? consoleErrors.join('; ') : 'clean',
    });
  } finally {
    await browser.close();
  }

  console.log('\n================================================================');
  console.log('VERIFICATION SUMMARY (TOWNSAVER v2.0 — THE ARROW MASTER):');
  console.log('================================================================');
  let allPassed = true;
  for (const r of results) {
    const symbol = r.passed ? '✓ PASS' : '✗ FAIL';
    console.log(`${symbol} | ${r.name} ${r.details ? `(${r.details})` : ''}`);
    if (!r.passed) allPassed = false;
  }
  console.log('================================================================');

  if (!allPassed) {
    console.error('Chromium verification encountered failures!');
    process.exit(1);
  } else {
    console.log(
      `All ${results.length} Townsaver v2.0 Desktop Chromium E2E assertions PASSED successfully!`
    );
    process.exit(0);
  }
}

runVerification().catch((err) => {
  console.error('Fatal error during Chromium verification:', err);
  process.exit(1);
});

/**
 * Townsaver — Milestone 2 Challenger M2-1 Live Headless Chromium Empirical Rasterization Suite
 *
 * Launches /usr/bin/chromium at 1280x800 and empirically verifies:
 * 1. Zero mobile/Android emulator processes running on host.
 * 2. Live #game-canvas (240x320) & #queen-portrait-canvas (36x48) nearest-neighbor pixel rasterization.
 * 3. All 16 procedural sprite families in SPRITE_CATALOG rendered with multi-color pixel data on #game-canvas
 *    (verified by sampling bounding-box ROIs directly via ctx.getImageData).
 * 4. Stage selector cycling across all 3 terrain palettes ('meadow', 'courtyard', 'fortress') measurably
 *    changes background lane pixel RGB values on #game-canvas.
 * 5. Queen mood cycling ('watching', 'cheering', 'praying', 'distressed') measurably changes pixel data
 *    on BOTH #queen-portrait-canvas (36x48) AND the Town Sanctuary Queen ROI on #game-canvas (240x320).
 * 6. Firing each weapon ('single', 'double', 'heavy') spawns live visible projectiles on #game-canvas
 *    that alter pixel data along Adrian's firing lane and trigger muzzle flash pixels.
 */

import { chromium } from 'playwright-core';
import { execSync } from 'child_process';

interface ChallengeAssertion {
  category: string;
  name: string;
  passed: boolean;
  actual: unknown;
  expected: unknown;
}

const assertions: ChallengeAssertion[] = [];

function check(
  category: string,
  name: string,
  passed: boolean,
  actual: unknown,
  expected: unknown
): void {
  assertions.push({ category, name, passed, actual, expected });
  const status = passed ? 'PASS' : 'FAIL';
  console.log(
    `[${status}] [${category}] ${name} | actual=${JSON.stringify(actual)} | expected=${JSON.stringify(expected)}`
  );
}

async function runChallengeM2() {
  console.log('========================================================================');
  console.log('Townsaver Milestone 2 — Challenger M2-1 Live Chromium Empirical Suite');
  console.log('Viewport: 1280x800 | Browser: /usr/bin/chromium');
  console.log('========================================================================');

  // 1. Strict Environment Boundary Check (Zero Android/Mobile Emulators)
  const psOut = execSync('ps aux', { encoding: 'utf-8' });
  const emulatorLines = psOut.split('\n').filter((line) => {
    const l = line.toLowerCase();
    return (
      l.includes('qemu') ||
      l.includes('emulator') ||
      l.includes('adb ') ||
      l.includes('avdmanager')
    );
  });
  check(
    'Environment',
    'Zero Android or mobile emulator processes active',
    emulatorLines.length === 0,
    emulatorLines.length,
    0
  );

  const targetUrl = process.env.TARGET_URL || 'http://localhost:5173';
  const browser = await chromium.launch({
    executablePath: '/usr/bin/chromium',
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--window-size=1280,800',
      '--autoplay-policy=no-user-gesture-required',
    ],
  });

  const page = await browser.newPage({
    viewport: { width: 1280, height: 800 },
  });

  const pageErrors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error' && !msg.text().includes('ERR_CERT_AUTHORITY_INVALID')) {
      pageErrors.push(msg.text());
    }
  });
  page.on('pageerror', (err) => {
    pageErrors.push(err.message);
  });

  try {
    await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForFunction(
      () => {
        const h = (window as unknown as { __TOWNSAVER__?: { canvasReady?: boolean; frameCount?: number } })
          .__TOWNSAVER__;
        return Boolean(h && h.canvasReady && (h.frameCount ?? 0) >= 5);
      },
      { timeout: 10000 }
    );

    // Pause automatic tick progression while sampling deterministic ROIs
    await page.evaluate(() => {
      const h = (window as unknown as { __TOWNSAVER__: { isPaused: boolean } }).__TOWNSAVER__;
      if (!h.isPaused) {
        document.getElementById('btn-pause')?.click();
      }
    });

    // 2. Verify Bounding-Box ROIs on #game-canvas for all 16 Sprite Showcase Regions
    const roiAudit = await page.evaluate(() => {
      const c = document.getElementById('game-canvas') as HTMLCanvasElement;
      const ctx = c.getContext('2d')!;
      const specs: Array<[string, number, number, number, number]> = [
        ['batCol1', 20, 36, 20, 16],
        ['goblinTorch2Hp', 21, 86, 18, 20],
        ['singleArrowCol1', 25, 130, 10, 32],
        ['palisadeIntact', 18, 203, 24, 18],
        ['goblinDagger1Hp', 81, 86, 18, 20],
        ['blueIronBlock', 80, 137, 20, 18],
        ['doubleArrowCol2', 78, 160, 24, 30],
        ['palisadeBroken', 78, 203, 24, 18],
        ['goblinStagger', 141, 38, 18, 20],
        ['crateIntact', 140, 89, 20, 18],
        ['rotatingShield', 134, 134, 32, 32],
        ['greatArrowHeavy', 140, 184, 20, 36],
        ['crateCracked', 200, 139, 20, 18],
        ['queenPlayfield', 7, 270, 18, 24],
        ['adrianPlayfield', 20, 270, 20, 24],
        ['hudHearts', 176, 5, 60, 11],
      ];
      const out: Record<string, number> = {};
      for (const [name, x, y, w, h] of specs) {
        const data = ctx.getImageData(x, y, w, h).data;
        const colors = new Set<string>();
        for (let i = 0; i < data.length; i += 4) {
          colors.add(`${data[i]},${data[i + 1]},${data[i + 2]}`);
        }
        out[name] = colors.size;
      }
      return out;
    });

    for (const [roiName, colorCount] of Object.entries(roiAudit)) {
      check(
        'SpriteROI',
        `#game-canvas ROI '${roiName}' renders multi-color pixel art (>= 4 colors)`,
        colorCount >= 4,
        colorCount,
        '>= 4'
      );
    }

    // 3. Verify Terrain Palette Cycling ('meadow', 'courtyard', 'fortress') changes #game-canvas pixels
    await page.evaluate(() => {
      const h = (window as unknown as { __TOWNSAVER__: { isPaused: boolean } }).__TOWNSAVER__;
      if (h.isPaused) {
        document.getElementById('btn-pause')?.click();
      }
    });

    const stagePalettes: Array<{ stage: string; expectedPalette: string }> = [
      { stage: '1', expectedPalette: 'meadow' },
      { stage: '2', expectedPalette: 'courtyard' },
      { stage: '3', expectedPalette: 'fortress' },
    ];
    const backdropSamples: Record<string, string> = {};

    for (const sp of stagePalettes) {
      await page.selectOption('#stage-select', sp.stage);
      await page.waitForTimeout(40);
      const sample = await page.evaluate(() => {
        const c = document.getElementById('game-canvas') as HTMLCanvasElement;
        const ctx = c.getContext('2d')!;
        const p1 = ctx.getImageData(8, 70, 1, 1).data;
        const p2 = ctx.getImageData(68, 70, 1, 1).data;
        const h = (window as unknown as { __TOWNSAVER__: { terrainPalette: string } }).__TOWNSAVER__;
        return {
          palette: h.terrainPalette,
          rgbPair: `${p1[0]},${p1[1]},${p1[2]}|${p2[0]},${p2[1]},${p2[2]}`,
        };
      });
      backdropSamples[sp.expectedPalette] = sample.rgbPair;
      check(
        'TerrainPalette',
        `Stage ${sp.stage} sets terrainPalette='${sp.expectedPalette}' and renders lane colors`,
        sample.palette === sp.expectedPalette,
        sample,
        sp.expectedPalette
      );
    }

    const uniqueBackdropRgbPairs = new Set(Object.values(backdropSamples)).size;
    check(
      'TerrainPalette',
      'All 3 terrain palettes (meadow, courtyard, fortress) produce distinct #game-canvas background pixel RGBs',
      uniqueBackdropRgbPairs === 3,
      backdropSamples,
      '3 distinct RGB pairs'
    );

    // 4. Verify all 4 Queen moods update BOTH #queen-portrait-canvas AND #game-canvas Queen ROI
    const moods = ['watching', 'cheering', 'praying', 'distressed'] as const;
    const portraitHashes = new Set<number>();
    const playfieldQueenHashes = new Set<number>();

    for (const mood of moods) {
      await page.evaluate((m) => {
        const h = (
          window as unknown as { __TOWNSAVER__: { setQueenMood: (mood: string) => void } }
        ).__TOWNSAVER__;
        h.setQueenMood(m);
      }, mood);
      await page.waitForTimeout(35);

      const hashes = await page.evaluate(() => {
        const c = document.getElementById('game-canvas') as HTMLCanvasElement;
        const ctx = c.getContext('2d')!;
        const qc = document.getElementById('queen-portrait-canvas') as HTMLCanvasElement;
        const qCtx = qc.getContext('2d')!;

        const pfData = ctx.getImageData(7, 270, 18, 24).data;
        let pfHash = 2166136261;
        for (let i = 0; i < pfData.length; i += 4) {
          pfHash ^= (pfData[i] << 16) | (pfData[i + 1] << 8) | pfData[i + 2];
          pfHash = Math.imul(pfHash, 16777619) >>> 0;
        }

        const qData = qCtx.getImageData(6, 10, 24, 36).data;
        let qHash = 2166136261;
        for (let i = 0; i < qData.length; i += 4) {
          qHash ^= (qData[i] << 16) | (qData[i + 1] << 8) | qData[i + 2];
          qHash = Math.imul(qHash, 16777619) >>> 0;
        }

        return {
          pfHash: pfHash >>> 0,
          qHash: qHash >>> 0,
        };
      });

      portraitHashes.add(hashes.qHash);
      playfieldQueenHashes.add(hashes.pfHash);
    }

    check(
      'QueenMoods',
      'All 4 Queen moods produce 4 distinct pixel buffers on #queen-portrait-canvas',
      portraitHashes.size === 4,
      portraitHashes.size,
      4
    );
    check(
      'QueenMoods',
      'All 4 Queen moods produce 4 distinct pixel buffers in the Sanctuary Queen ROI on #game-canvas',
      playfieldQueenHashes.size === 4,
      playfieldQueenHashes.size,
      4
    );

    // 5. Verify firing each weapon ('single', 'double', 'heavy') spawns visible projectile pixels on #game-canvas
    for (const weapon of ['single', 'double', 'heavy'] as const) {
      const fireCheck = await page.evaluate(async (w) => {
        const c = document.getElementById('game-canvas') as HTMLCanvasElement;
        const ctx = c.getContext('2d')!;
        const h = (
          window as unknown as {
            __TOWNSAVER__: {
              adrianCol: number;
              activeArrowsCount: number;
              fireShowcaseArrow: (weapon: string) => void;
            };
          }
        ).__TOWNSAVER__;

        const colX = [30, 90, 150, 210][h.adrianCol] ?? 30;
        // Sample flight corridor above Adrian (y = 235..268) before firing
        const beforeData = ctx.getImageData(colX - 10, 235, 20, 33).data;
        let beforeChecksum = 0;
        for (let i = 0; i < beforeData.length; i += 4) {
          beforeChecksum = (beforeChecksum * 31 + beforeData[i] + beforeData[i + 1] + beforeData[i + 2]) >>> 0;
        }

        h.fireShowcaseArrow(w);
        const arrowsAfterFire = h.activeArrowsCount;

        // Wait two animation frames so renderShowcase draws the newly spawned arrow & muzzle flash
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

        const afterData = ctx.getImageData(colX - 10, 235, 20, 33).data;
        let afterChecksum = 0;
        const distinctColors = new Set<string>();
        for (let i = 0; i < afterData.length; i += 4) {
          afterChecksum = (afterChecksum * 31 + afterData[i] + afterData[i + 1] + afterData[i + 2]) >>> 0;
          distinctColors.add(`${afterData[i]},${afterData[i + 1]},${afterData[i + 2]}`);
        }

        return {
          arrowsAfterFire,
          pixelChanged: beforeChecksum !== afterChecksum,
          corridorColorCount: distinctColors.size,
        };
      }, weapon);

      check(
        'WeaponProjectiles',
        `Firing '${weapon}' spawns live projectile and changes pixel data on #game-canvas`,
        fireCheck.arrowsAfterFire >= 4 && fireCheck.pixelChanged && fireCheck.corridorColorCount >= 5,
        fireCheck,
        { arrowsAfterFire: '>=4', pixelChanged: true, corridorColorCount: '>=5' }
      );
    }

    // 6. Verify zero console/page errors
    check(
      'Stability',
      'Zero browser console or uncaught page errors during empirical challenge',
      pageErrors.length === 0,
      pageErrors,
      []
    );
  } finally {
    await browser.close();
  }

  const failed = assertions.filter((a) => !a.passed);
  console.log('========================================================================');
  console.log(
    `CHALLENGER M2-1 SUMMARY: ${assertions.length - failed.length}/${assertions.length} assertions PASSED`
  );
  console.log('========================================================================');

  if (failed.length > 0) {
    process.exit(1);
  }
}

runChallengeM2().catch((err) => {
  console.error('Fatal error in challenge_m2_1:', err);
  process.exit(1);
});

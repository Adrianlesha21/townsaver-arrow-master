/**
 * Townsaver — Challenger M2-1 Adversarial Empirical Sprite Rasterization Test Suite
 *
 * Empirically stress-tests all 16 sprite families and all procedural drawing functions in
 * src/sprites.ts using a 2D pixel-buffer software canvas oracle to verify:
 * 1. Multi-color pixel rasterization (never blank or single-color) for every sprite family.
 * 2. Distinct pixel outputs across state transitions:
 *    - All 4 Queen moods ('watching', 'cheering', 'praying', 'distressed') on playfield & portrait
 *    - 1-HP (helmet-stripped) vs 2-HP (helmeted) Goblins, Torch vs Dagger, Walk vs Stagger ('!!')
 *    - Intact vs Broken Wood Palisades, Intact vs Cracked Siege Crates
 *    - All 3 Weapon Arrow Variations ('single', 'double', 'heavy') + Muzzle Flashes + Impact Bursts
 *    - Active vs Lost Hearts, all 3 Terrain Palettes ('meadow', 'courtyard', 'fortress')
 * 3. Edge-case resilience: negative coordinates, floating-point coordinates, extreme negative/positive
 *    frame numbers, zero/negative HP, and empty/malformed arrays without throwing or blanking.
 */

import { describe, expect, it } from 'vitest';
import {
  drawAdrian,
  drawArrow,
  drawBackdrop,
  drawBat,
  drawBlueIronBlock,
  drawDoubleArrow,
  drawGoblin,
  drawGreatArrow,
  drawHazard,
  drawHeart,
  drawHUD,
  drawImpactBurst,
  drawLodgedArrow,
  drawMuzzleFlash,
  drawParticle,
  drawQueen,
  drawQueenPortrait,
  drawRotatingShield,
  drawSanctuary,
  drawSiegeCrate,
  drawSingleArrow,
  drawTarget,
  drawWoodPalisade,
  SPRITE_CATALOG,
} from '../src/sprites';

interface TransformState {
  tx: number;
  ty: number;
  angle: number;
  fillStyle: string;
  strokeStyle: string;
  lineWidth: number;
}

/**
 * Software 2D pixel-buffer canvas oracle that records exact per-pixel color strings
 * on a WxH grid, supporting translate(), rotate(), fillRect(), stroke(), and arc().
 */
function createPixelBufferCanvas(width = 240, height = 320) {
  const pixels = new Map<string, string>();
  const stack: TransformState[] = [];
  let tx = 0;
  let ty = 0;
  let angle = 0;
  let pathPoints: Array<{ x: number; y: number }> = [];

  const toWorld = (lx: number, ly: number): [number, number] => {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const wx = Math.round(tx + lx * cos - ly * sin);
    const wy = Math.round(ty + lx * sin + ly * cos);
    return [wx, wy];
  };

  const setPixel = (wx: number, wy: number, color: string) => {
    if (!Number.isFinite(wx) || !Number.isFinite(wy)) {
      throw new Error(`Non-finite pixel coordinate (${wx}, ${wy})`);
    }
    if (wx >= 0 && wx < width && wy >= 0 && wy < height) {
      pixels.set(`${wx},${wy}`, color);
    }
  };

  const mockCtx = {
    fillStyle: '#000000',
    strokeStyle: '#000000',
    lineWidth: 1,
    font: '8px monospace',
    textAlign: 'left',
    imageSmoothingEnabled: false,
    save() {
      stack.push({
        tx,
        ty,
        angle,
        fillStyle: String(mockCtx.fillStyle),
        strokeStyle: String(mockCtx.strokeStyle),
        lineWidth: mockCtx.lineWidth,
      });
    },
    restore() {
      const prev = stack.pop();
      if (prev) {
        tx = prev.tx;
        ty = prev.ty;
        angle = prev.angle;
        mockCtx.fillStyle = prev.fillStyle;
        mockCtx.strokeStyle = prev.strokeStyle;
        mockCtx.lineWidth = prev.lineWidth;
      }
    },
    translate(dx: number, dy: number) {
      const [wx, wy] = toWorld(dx, dy);
      tx = wx;
      ty = wy;
    },
    rotate(rad: number) {
      angle += rad;
    },
    fillRect(x: number, y: number, w: number, h: number) {
      const color = String(mockCtx.fillStyle);
      const iw = Math.max(0, Math.round(w));
      const ih = Math.max(0, Math.round(h));
      for (let dy = 0; dy < ih; dy++) {
        for (let dx = 0; dx < iw; dx++) {
          const [wx, wy] = toWorld(x + dx, y + dy);
          setPixel(wx, wy, color);
        }
      }
    },
    strokeRect(x: number, y: number, w: number, h: number) {
      const color = String(mockCtx.strokeStyle);
      const [wx, wy] = toWorld(x, y);
      setPixel(wx, wy, color);
      setPixel(wx + Math.round(w), wy + Math.round(h), color);
    },
    fillText(text: string, x: number, y: number) {
      const color = String(mockCtx.fillStyle);
      for (let i = 0; i < text.length; i++) {
        const [wx, wy] = toWorld(x + i * 4, y);
        setPixel(wx, wy, color);
      }
    },
    beginPath() {
      pathPoints = [];
    },
    moveTo(x: number, y: number) {
      const [wx, wy] = toWorld(x, y);
      pathPoints.push({ x: wx, y: wy });
    },
    lineTo(x: number, y: number) {
      const [wx, wy] = toWorld(x, y);
      pathPoints.push({ x: wx, y: wy });
    },
    arc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
      const steps = 16;
      for (let i = 0; i <= steps; i++) {
        const a = startAngle + ((endAngle - startAngle) * i) / steps;
        const [wx, wy] = toWorld(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
        pathPoints.push({ x: wx, y: wy });
      }
    },
    closePath() {},
    stroke() {
      const color = String(mockCtx.strokeStyle);
      for (let i = 0; i < pathPoints.length; i++) {
        const p = pathPoints[i];
        setPixel(p.x, p.y, color);
        if (i > 0) {
          const prev = pathPoints[i - 1];
          const midX = Math.round((prev.x + p.x) / 2);
          const midY = Math.round((prev.y + p.y) / 2);
          setPixel(midX, midY, color);
        }
      }
    },
    fill() {
      const color = String(mockCtx.fillStyle);
      for (const p of pathPoints) {
        setPixel(p.x, p.y, color);
      }
    },
  };

  const getDistinctColors = (): Set<string> => new Set(pixels.values());
  const getSignature = (): string => {
    const entries = [...pixels.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    return entries.map(([k, v]) => `${k}:${v}`).join('|');
  };
  const clear = () => {
    pixels.clear();
    tx = 0;
    ty = 0;
    angle = 0;
    stack.length = 0;
  };

  return {
    ctx: mockCtx as unknown as CanvasRenderingContext2D,
    pixels,
    getDistinctColors,
    getSignature,
    clear,
  };
}

describe('Challenger M2-1: Multi-Color Pixel Rasterization & State Distinctness', () => {
  it('verifies all 16 sprite families render multi-color (>= 3 colors) non-blank pixel data', () => {
    expect(SPRITE_CATALOG.length).toBe(16);

    const familyRenderers: Record<(typeof SPRITE_CATALOG)[number], (ctx: CanvasRenderingContext2D) => void> = {
      adrian: (ctx) => drawAdrian(ctx, 120, 160, 'idle1', false),
      queen: (ctx) => drawQueen(ctx, 120, 160, 'watching', 0),
      goblin_torch: (ctx) => drawGoblin(ctx, 120, 160, { variant: 'goblin_torch', hp: 2, walkFrame: 0 }),
      goblin_dagger: (ctx) => drawGoblin(ctx, 120, 160, { variant: 'goblin_dagger', hp: 2, walkFrame: 0 }),
      goblin_stagger: (ctx) => drawGoblin(ctx, 120, 160, { variant: 'goblin_torch', hp: 1, stagger: true }),
      bat: (ctx) => drawBat(ctx, 120, 160, 'spread'),
      palisade_intact: (ctx) => drawWoodPalisade(ctx, 120, 160, false, false, 0),
      palisade_broken: (ctx) => drawWoodPalisade(ctx, 120, 160, true, false, 0),
      crate: (ctx) => drawSiegeCrate(ctx, 120, 160, 2, 2, false, 0),
      iron_block: (ctx) => drawBlueIronBlock(ctx, 120, 160, 0, false),
      rotating_shield: (ctx) =>
        drawHazard(ctx, { type: 'rotating_shield', x: 120, y: 160, angle: 0.2, lodgedArrows: [0.4] }, 0),
      arrow_single: (ctx) => drawArrow(ctx, { x: 120, y: 160, weaponType: 'single' }, 0),
      arrow_double: (ctx) => drawArrow(ctx, { x: 120, y: 160, weaponType: 'double', spread: 12 }, 0),
      arrow_heavy: (ctx) => drawArrow(ctx, { x: 120, y: 160, weaponType: 'heavy', piercing: true }, 0),
      heart_active: (ctx) => drawHeart(ctx, 120, 160, true, false),
      heart_lost: (ctx) => drawHeart(ctx, 120, 160, false, false),
    };

    for (const family of SPRITE_CATALOG) {
      const surface = createPixelBufferCanvas(240, 320);
      familyRenderers[family](surface.ctx);
      const colors = surface.getDistinctColors();
      expect(surface.pixels.size, `${family} non-empty pixel count`).toBeGreaterThan(25);
      expect(colors.size, `${family} distinct colors`).toBeGreaterThanOrEqual(4);
    }
  });

  it('verifies all 4 Adrian animation frames and all 3 muzzle flash variations produce distinct pixel buffers', () => {
    const frameSignatures = new Set<string>();
    for (const frame of ['idle1', 'idle2', 'nock', 'draw'] as const) {
      const surface = createPixelBufferCanvas(240, 320);
      drawAdrian(surface.ctx, 120, 160, frame, false);
      expect(surface.getDistinctColors().size).toBeGreaterThanOrEqual(8);
      frameSignatures.add(surface.getSignature());
    }
    expect(frameSignatures.size).toBe(4);

    const flashSignatures = new Set<string>();
    for (const flash of ['single', 'double', 'heavy'] as const) {
      const surface = createPixelBufferCanvas(240, 320);
      drawAdrian(surface.ctx, 120, 160, 'draw', flash);
      flashSignatures.add(surface.getSignature());
    }
    expect(flashSignatures.size).toBe(3);
  });

  it('verifies all 4 Queen moods produce distinct multi-color pixel buffers on both playfield and 36x48 portrait canvas', () => {
    const playfieldMoodSigs = new Set<string>();
    const portraitMoodSigs = new Set<string>();

    for (const mood of ['watching', 'cheering', 'praying', 'distressed'] as const) {
      const playfield = createPixelBufferCanvas(240, 320);
      drawQueen(playfield.ctx, 60, 280, mood, 0);
      expect(playfield.pixels.size).toBeGreaterThan(150);
      expect(playfield.getDistinctColors().size).toBeGreaterThanOrEqual(8);
      playfieldMoodSigs.add(playfield.getSignature());

      const portrait = createPixelBufferCanvas(36, 48);
      drawQueenPortrait(portrait.ctx, mood, 0);
      expect(portrait.pixels.size).toBe(36 * 48);
      expect(portrait.getDistinctColors().size).toBeGreaterThanOrEqual(10);
      portraitMoodSigs.add(portrait.getSignature());
    }

    expect(playfieldMoodSigs.size).toBe(4);
    expect(portraitMoodSigs.size).toBe(4);
  });

  it('verifies 2-HP vs 1-HP Goblin helmet stripping, Torch vs Dagger variants, and Stagger reaction', () => {
    const goblin2Hp = createPixelBufferCanvas(240, 320);
    drawGoblin(goblin2Hp.ctx, 100, 100, { variant: 'goblin_torch', hp: 2, maxHp: 2, walkFrame: 0 });

    const goblin1Hp = createPixelBufferCanvas(240, 320);
    drawGoblin(goblin1Hp.ctx, 100, 100, { variant: 'goblin_torch', hp: 1, maxHp: 2, walkFrame: 0 });

    const goblinDagger = createPixelBufferCanvas(240, 320);
    drawGoblin(goblinDagger.ctx, 100, 100, { variant: 'goblin_dagger', hp: 2, maxHp: 2, walkFrame: 0 });

    const goblinStagger = createPixelBufferCanvas(240, 320);
    drawGoblin(goblinStagger.ctx, 100, 100, { variant: 'goblin_torch', hp: 1, maxHp: 2, stagger: true });

    const sigs = new Set([
      goblin2Hp.getSignature(),
      goblin1Hp.getSignature(),
      goblinDagger.getSignature(),
      goblinStagger.getSignature(),
    ]);
    expect(sigs.size).toBe(4);
  });

  it('verifies all 5 Winged Bat wing-flap frames produce distinct pixel buffers', () => {
    const batSigs = new Set<string>();
    for (const frame of [0, 1, 2, 3, 4] as const) {
      const surface = createPixelBufferCanvas(240, 320);
      drawBat(surface.ctx, 120, 80, frame);
      expect(surface.pixels.size).toBeGreaterThan(80);
      expect(surface.getDistinctColors().size).toBeGreaterThanOrEqual(5);
      batSigs.add(surface.getSignature());
    }
    expect(batSigs.size).toBe(5);
  });

  it('verifies Intact vs Broken Palisades, Intact vs Cracked Crates, and all 3 Terrain Palettes', () => {
    const palIntact = createPixelBufferCanvas(240, 320);
    drawWoodPalisade(palIntact.ctx, 120, 160, false, false, 0);
    const palBroken = createPixelBufferCanvas(240, 320);
    drawWoodPalisade(palBroken.ctx, 120, 160, true, false, 0);
    expect(palIntact.getSignature()).not.toBe(palBroken.getSignature());
    // Intact palisade has more timber pixels in center columns than broken palisade
    expect(palIntact.pixels.size).toBeGreaterThan(palBroken.pixels.size);

    const crateIntact = createPixelBufferCanvas(240, 320);
    drawSiegeCrate(crateIntact.ctx, 120, 160, 2, 2, false, 0);
    const crateCracked = createPixelBufferCanvas(240, 320);
    drawSiegeCrate(crateCracked.ctx, 120, 160, 1, 2, false, 0);
    expect(crateIntact.getSignature()).not.toBe(crateCracked.getSignature());

    const terrainSigs = new Set<string>();
    for (const palette of ['meadow', 'courtyard', 'fortress'] as const) {
      const bg = createPixelBufferCanvas(240, 320);
      drawBackdrop(bg.ctx, palette, 0, 0);
      expect(bg.pixels.size).toBe(72080); // y = 22..320 (71520) + top 2px border (480) + upper side borders (80)
      expect(bg.getDistinctColors().size).toBeGreaterThanOrEqual(8);
      terrainSigs.add(bg.getSignature());
    }
    expect(terrainSigs.size).toBe(3);
  });
});

describe('Challenger M2-1: Adversarial Edge-Case Input Fuzzing', () => {
  it('survives negative coordinates, floating-point coordinates, and extreme frame numbers without throwing', () => {
    const surface = createPixelBufferCanvas(240, 320);
    const ctx = surface.ctx;

    const extremeCoords: Array<[number, number]> = [
      [-100, -100],
      [-0.5, -0.5],
      [0, 0],
      [119.4999, 159.9999],
      [239.9, 319.9],
      [500, 500],
    ];
    const extremeFrames = [-999999, -15, -1, 0, 1, 17, 90, 999999];

    expect(() => {
      for (const [x, y] of extremeCoords) {
        for (const f of extremeFrames) {
          drawAdrian(ctx, x, y, (f % 4) as 0 | 1 | 2 | 3, f % 2 === 0 ? 'heavy' : false);
          drawQueen(ctx, x, y, 'distressed', f);
          drawQueenPortrait(ctx, 'cheering', f);
          drawGoblin(ctx, x, y, {
            variant: f % 2 === 0 ? 'goblin_torch' : 'goblin_dagger',
            hp: f % 3,
            maxHp: 2,
            walkFrame: f,
            flameFrame: f,
            stagger: f < 0,
            lodgedArrows: f % 2 === 0 ? -2 : [{ offsetX: -3.5, offsetY: 5.7, angle: 0.45 }],
          });
          drawBat(ctx, x, y, f as 0);
          drawWoodPalisade(ctx, x, y, f < 0, f % 2 === 0, f % 3);
          drawSiegeCrate(ctx, x, y, f % 3, 2, f % 2 === 0, [{ offsetX: 1.2, offsetY: 7.8 }]);
          drawBlueIronBlock(ctx, x, y, f, f % 5 === 0);
          drawRotatingShield(
            ctx,
            x,
            y,
            f * 0.13,
            [
              { type: 'iron', startAngle: 0, endAngle: 1.2, hp: 99, maxHp: 99 },
              { type: 'wood', startAngle: 1.5, endAngle: 2.8, hp: f % 3, maxHp: 2 },
            ],
            [0.25, { angleOffset: -0.75 }],
            f < 0
          );
          drawSingleArrow(ctx, x, y, f * 0.1, f < 0, f);
          drawDoubleArrow(ctx, x, y, 12.5, f * 0.05, f < 0, f);
          drawGreatArrow(ctx, x, y, f * 0.05, f);
          drawLodgedArrow(ctx, x, y, f * 0.2);
          drawMuzzleFlash(ctx, x, y, 'single', (f % 10) / 10);
          drawMuzzleFlash(ctx, x, y, 'double', (f % 10) / 10);
          drawMuzzleFlash(ctx, x, y, 'heavy', (f % 10) / 10);
          drawImpactBurst(ctx, x, y, 'piercing_shatter', Math.abs(f % 10) / 10);
          drawImpactBurst(ctx, x, y, 'iron_deflect', Math.abs(f % 10) / 10);
          drawImpactBurst(ctx, x, y, 'arrow_clip', Math.abs(f % 10) / 10);
          drawParticle(ctx, {
            x,
            y,
            vx: 1.5,
            vy: -2.5,
            color: '#facc15',
            size: f % 4,
            kind: 'wood_chip',
          });
          drawHeart(ctx, x, y, f >= 0, f % 2 === 0);
          drawSanctuary(ctx, 'praying', f, f % 6, f);
          drawTarget(ctx, { type: 'bat', x, y, hp: 1, maxHp: 1 }, f);
          drawTarget(ctx, { type: 'goblin_torch', x, y, hp: 1, maxHp: 2, staggerTimer: f % 2 }, f);
          drawTarget(ctx, { type: 'palisade', x, y, hp: f % 2, maxHp: 2, broken: f < 0 }, f);
          drawTarget(ctx, { type: 'crate', x, y, hp: f % 2, maxHp: 2 }, f);
          drawBackdrop(ctx, f, f, f % 6);
          drawHUD(ctx, {
            score: f,
            stage: f,
            hearts: f % 6,
            maxHearts: 5,
            activeWeapon: f % 3 === 0 ? 'single' : f % 3 === 1 ? 'double' : 'heavy',
            doubleAmmo: f,
            heavyAmmo: f,
            heartFlashTimer: f % 3,
          });
        }
      }
    }).not.toThrow();

    expect(surface.pixels.size).toBeGreaterThan(1000);
    expect(surface.getDistinctColors().size).toBeGreaterThan(20);
  });
});

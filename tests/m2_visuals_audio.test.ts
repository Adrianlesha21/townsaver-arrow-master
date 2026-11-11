/**
 * Townsaver — Milestone 2 Unit Tests (Visuals & Audio System)
 * Verifies all procedural pixel-art sprite matrices, dimensions, palettes,
 * drawing contract functions, and Web Audio API SoundSystem synthesis methods.
 */

import { describe, expect, it } from 'vitest';
import {
  ADRIAN_FRAMES,
  ADRIAN_PALETTE,
  BAT_FRAMES,
  BAT_PALETTE,
  BLUE_IRON_BLOCK_20x18,
  CRATE_CRACKED_20x18,
  CRATE_INTACT_20x18,
  drawAdrian,
  drawArrow,
  drawBackdrop,
  drawBat,
  drawGoblin,
  drawHazard,
  drawHeart,
  drawHUD,
  drawImpactBurst,
  drawParticle,
  drawQueen,
  drawQueenPortrait,
  drawTarget,
  GOBLIN_BARE_HEAD_ROWS,
  GOBLIN_FRAMES,
  GOBLIN_PALETTE,
  GREAT_ARROW_9x24,
  HEART_ACTIVE_10x9,
  HEART_LOST_10x9,
  OBSTACLE_PROJECTILE_PALETTE,
  PALISADE_BROKEN_24x18,
  PALISADE_INTACT_24x18,
  QUEEN_MOOD_FRAMES,
  QUEEN_PALETTE,
  resolveTerrainPalette,
  SINGLE_ARROW_5x16,
  SPRITE_CATALOG,
} from '../src/sprites';
import { SoundSystem } from '../src/audio';

function createMockContext() {
  const fillRectCalls: Array<{ x: number; y: number; w: number; h: number; style: string }> = [];
  const fillTextCalls: Array<{ text: string; x: number; y: number }> = [];
  const arcCalls: Array<{ x: number; y: number; r: number }> = [];

  const mockCtx = {
    fillStyle: '#000000',
    strokeStyle: '#000000',
    lineWidth: 1,
    font: '8px monospace',
    textAlign: 'left',
    imageSmoothingEnabled: false,
    fillRect(x: number, y: number, w: number, h: number) {
      fillRectCalls.push({ x, y, w, h, style: String(mockCtx.fillStyle) });
    },
    strokeRect() {},
    fillText(text: string, x: number, y: number) {
      fillTextCalls.push({ text, x, y });
    },
    save() {},
    restore() {},
    translate() {},
    rotate() {},
    beginPath() {},
    moveTo() {},
    lineTo() {},
    stroke() {},
    arc(x: number, y: number, r: number) {
      arcCalls.push({ x, y, r });
    },
    closePath() {},
    fill() {},
  };
  const ctx = mockCtx as unknown as CanvasRenderingContext2D;

  return { ctx, fillRectCalls, fillTextCalls, arcCalls };
}

describe('Milestone 2: Procedural Pixel-Art Sprite Matrices & Palettes', () => {
  it('verifies ADRIAN_FRAMES are strictly 20x24 across all 4 frames and palette keys exist', () => {
    const keys = ['idle1', 'idle2', 'nock', 'draw'] as const;
    for (const key of keys) {
      const grid = ADRIAN_FRAMES[key];
      expect(grid.length).toBe(24);
      for (const row of grid) {
        expect(row.length).toBe(20);
        for (const ch of row) {
          if (ch !== '.' && ch !== ' ') {
            expect(ADRIAN_PALETTE[ch]).toBeDefined();
          }
        }
      }
    }
  });

  it('verifies QUEEN_MOOD_FRAMES are strictly 18x24 across all 4 reactive moods', () => {
    const moods = ['watching', 'cheering', 'praying', 'distressed'] as const;
    for (const mood of moods) {
      const grid = QUEEN_MOOD_FRAMES[mood];
      expect(grid.length).toBe(24);
      for (const row of grid) {
        expect(row.length).toBe(18);
        for (const ch of row) {
          if (ch !== '.' && ch !== ' ') {
            expect(QUEEN_PALETTE[ch]).toBeDefined();
          }
        }
      }
    }
  });

  it('verifies GOBLIN_FRAMES are strictly 18x20 across all 5 states plus 1-HP bare head overlay', () => {
    const keys = ['torch_walk1', 'torch_walk2', 'dagger_walk1', 'dagger_walk2', 'stagger'] as const;
    for (const key of keys) {
      const grid = GOBLIN_FRAMES[key];
      expect(grid.length).toBe(20);
      for (const row of grid) {
        expect(row.length).toBe(18);
        for (const ch of row) {
          if (ch !== '.' && ch !== ' ') {
            expect(GOBLIN_PALETTE[ch]).toBeDefined();
          }
        }
      }
    }
    expect(GOBLIN_BARE_HEAD_ROWS.length).toBe(5);
    for (const row of GOBLIN_BARE_HEAD_ROWS) {
      expect(row.length).toBe(18);
    }
  });

  it('verifies BAT_FRAMES are strictly 20x14 across all 5 wing-flap frames', () => {
    const keys = ['spread', 'mid', 'down', 'up', 'mid_up'] as const;
    for (const key of keys) {
      const grid = BAT_FRAMES[key];
      expect(grid.length).toBe(14);
      for (const row of grid) {
        expect(row.length).toBe(20);
        for (const ch of row) {
          if (ch !== '.' && ch !== ' ') {
            expect(BAT_PALETTE[ch]).toBeDefined();
          }
        }
      }
    }
  });

  it('verifies Obstacles, Projectiles, and Hearts matrix dimensions and palette mappings', () => {
    const matrices: Array<{ name: string; grid: readonly string[]; w: number; h: number }> = [
      { name: 'PALISADE_INTACT_24x18', grid: PALISADE_INTACT_24x18, w: 24, h: 18 },
      { name: 'PALISADE_BROKEN_24x18', grid: PALISADE_BROKEN_24x18, w: 24, h: 18 },
      { name: 'CRATE_INTACT_20x18', grid: CRATE_INTACT_20x18, w: 20, h: 18 },
      { name: 'CRATE_CRACKED_20x18', grid: CRATE_CRACKED_20x18, w: 20, h: 18 },
      { name: 'BLUE_IRON_BLOCK_20x18', grid: BLUE_IRON_BLOCK_20x18, w: 20, h: 18 },
      { name: 'SINGLE_ARROW_5x16', grid: SINGLE_ARROW_5x16, w: 5, h: 16 },
      { name: 'GREAT_ARROW_9x24', grid: GREAT_ARROW_9x24, w: 9, h: 24 },
      { name: 'HEART_ACTIVE_10x9', grid: HEART_ACTIVE_10x9, w: 10, h: 9 },
      { name: 'HEART_LOST_10x9', grid: HEART_LOST_10x9, w: 10, h: 9 },
    ];

    for (const item of matrices) {
      expect(item.grid.length, `${item.name} height`).toBe(item.h);
      for (const row of item.grid) {
        expect(row.length, `${item.name} width`).toBe(item.w);
        for (const ch of row) {
          if (ch !== '.' && ch !== ' ') {
            expect(
              OBSTACLE_PROJECTILE_PALETTE[ch],
              `${item.name} char '${ch}'`
            ).toBeDefined();
          }
        }
      }
    }
  });

  it('exports all 16 required sprite families in SPRITE_CATALOG', () => {
    expect(SPRITE_CATALOG.length).toBe(16);
    expect(SPRITE_CATALOG).toContain('adrian');
    expect(SPRITE_CATALOG).toContain('queen');
    expect(SPRITE_CATALOG).toContain('goblin_torch');
    expect(SPRITE_CATALOG).toContain('goblin_dagger');
    expect(SPRITE_CATALOG).toContain('goblin_stagger');
    expect(SPRITE_CATALOG).toContain('bat');
    expect(SPRITE_CATALOG).toContain('palisade_intact');
    expect(SPRITE_CATALOG).toContain('palisade_broken');
    expect(SPRITE_CATALOG).toContain('crate');
    expect(SPRITE_CATALOG).toContain('iron_block');
    expect(SPRITE_CATALOG).toContain('rotating_shield');
    expect(SPRITE_CATALOG).toContain('arrow_single');
    expect(SPRITE_CATALOG).toContain('arrow_double');
    expect(SPRITE_CATALOG).toContain('arrow_heavy');
    expect(SPRITE_CATALOG).toContain('heart_active');
    expect(SPRITE_CATALOG).toContain('heart_lost');
  });
});

describe('Milestone 2: Canvas Rendering Contract Functions', () => {
  it('renders Adrian frames and muzzle flashes (single, double, heavy) onto CanvasRenderingContext2D', () => {
    const { ctx, fillRectCalls } = createMockContext();
    drawAdrian(ctx, 30, 282, 'idle1', false);
    const idleCount = fillRectCalls.length;
    expect(idleCount).toBeGreaterThan(100);

    drawAdrian(ctx, 90, 282, 'draw', 'heavy');
    expect(fillRectCalls.length).toBeGreaterThan(idleCount + 100);
  });

  it('renders The Queen on playfield and 2x scaled on #queen-portrait-canvas across all 4 moods', () => {
    const { ctx, fillRectCalls } = createMockContext();
    for (const mood of ['watching', 'cheering', 'praying', 'distressed'] as const) {
      const before = fillRectCalls.length;
      drawQueen(ctx, 18, 282, mood, 10);
      expect(fillRectCalls.length).toBeGreaterThan(before + 100);

      const qBefore = fillRectCalls.length;
      drawQueenPortrait(ctx, mood, 10);
      expect(fillRectCalls.length).toBeGreaterThan(qBefore + 100);
    }
  });

  it('renders all Target, Hazard, Arrow, Particle, Heart, Backdrop, and HUD types', () => {
    const { ctx, fillRectCalls, fillTextCalls, arcCalls } = createMockContext();

    drawBackdrop(ctx, 'meadow', 0, 0);
    expect(fillRectCalls.length).toBeGreaterThan(20);

    drawTarget(ctx, { type: 'bat', x: 30, y: 48, hp: 1, maxHp: 1 }, 5);
    drawTarget(ctx, { type: 'goblin_torch', x: 30, y: 96, hp: 2, maxHp: 2 }, 5);
    drawTarget(ctx, { type: 'goblin_dagger', x: 90, y: 96, hp: 1, maxHp: 2, lodgedArrows: 1 }, 5);
    drawTarget(ctx, { type: 'goblin_torch', x: 150, y: 50, hp: 1, maxHp: 2, staggerTimer: 1 }, 5);
    drawTarget(ctx, { type: 'palisade', x: 30, y: 212, hp: 2, maxHp: 2, broken: false }, 5);
    drawTarget(ctx, { type: 'palisade', x: 90, y: 212, hp: 0, maxHp: 2, broken: true }, 5);
    drawTarget(ctx, { type: 'crate', x: 150, y: 108, hp: 2, maxHp: 2 }, 5);
    drawTarget(ctx, { type: 'crate', x: 210, y: 148, hp: 1, maxHp: 2, lodgedArrows: 1 }, 5);

    drawHazard(ctx, { type: 'iron_block', x: 90, y: 156 }, 5);
    drawHazard(ctx, { type: 'rotating_shield', x: 150, y: 158, angle: 0.5, lodgedArrows: [0.2] }, 5);
    expect(arcCalls.length).toBeGreaterThan(0);

    drawArrow(ctx, { x: 30, y: 160, weaponType: 'single' }, 5);
    drawArrow(ctx, { x: 90, y: 180, weaponType: 'double' }, 5);
    drawArrow(ctx, { x: 150, y: 200, weaponType: 'heavy' }, 5);

    drawImpactBurst(ctx, 150, 210, 'piercing_shatter', 0.4);
    drawParticle(ctx, { x: 100, y: 100, vx: 1, vy: -1, color: '#facc15', size: 2, kind: 'iron_spark' });
    drawHeart(ctx, 200, 6, true);
    drawHeart(ctx, 212, 6, false);

    drawHUD(ctx, {
      score: 498,
      stage: 1,
      hearts: 4,
      maxHearts: 5,
      activeWeapon: 'heavy',
      doubleAmmo: 5,
      heavyAmmo: 2,
      queenMood: 'watching',
    });
    expect(fillTextCalls.some((c) => c.text.includes('SCR:00498'))).toBe(true);
    expect(fillTextCalls.some((c) => c.text.includes('LV01'))).toBe(true);

    // Check stage terrain palette resolution
    expect(resolveTerrainPalette(1).id).toBe('meadow');
    expect(resolveTerrainPalette(2).id).toBe('courtyard');
    expect(resolveTerrainPalette(3).id).toBe('fortress');
    expect(resolveTerrainPalette(6).id).toBe('courtyard');
    expect(resolveTerrainPalette(11).id).toBe('fortress');

    // Also test direct drawGoblin and drawBat calls
    drawGoblin(ctx, 30, 100, { variant: 'goblin_torch', hp: 2, walkFrame: 1, flameFrame: 2 });
    drawBat(ctx, 30, 50, 'up');
  });
});

describe('Milestone 2: Web Audio API 8-Bit Synthesizer (SoundSystem)', () => {
  it('tracks all sound effects synchronously and suppresses playback when muted', () => {
    const sound = new SoundSystem();
    expect(sound.isMuted()).toBe(false);
    expect(sound.soundPlayCount).toBe(0);

    sound.playBowRelease('single');
    expect(sound.lastSoundPlayed).toBe('bow_release:single');
    expect(sound.soundPlayCount).toBe(1);

    sound.playBowRelease('double');
    expect(sound.lastSoundPlayed).toBe('bow_release:double');
    expect(sound.soundPlayCount).toBe(2);

    sound.playBowRelease('heavy');
    expect(sound.lastSoundPlayed).toBe('bow_release:heavy');
    expect(sound.soundPlayCount).toBe(3);

    sound.playEnemyHit();
    expect(sound.lastSoundPlayed).toBe('enemy_hit');

    sound.playWoodShatter(false);
    expect(sound.lastSoundPlayed).toBe('wood_shatter:normal');

    sound.playWoodShatter(true);
    expect(sound.lastSoundPlayed).toBe('wood_shatter:piercing');

    sound.playMetallicClang();
    expect(sound.lastSoundPlayed).toBe('metallic_clang');

    sound.playArrowClipBuzz();
    expect(sound.lastSoundPlayed).toBe('arrow_clip_buzz');

    sound.playStageClear();
    expect(sound.lastSoundPlayed).toBe('stage_clear');

    sound.playTownBreached();
    expect(sound.lastSoundPlayed).toBe('town_breached');
    expect(sound.soundPlayCount).toBe(10);

    // Mute suppression check
    const muted = sound.toggleMute();
    expect(muted).toBe(true);
    expect(sound.isMuted()).toBe(true);

    sound.playBowRelease('single');
    sound.playMetallicClang();
    expect(sound.soundPlayCount).toBe(10);
    expect(sound.lastSoundPlayed).toBe('town_breached');

    // Unmute resumes tracking
    sound.toggleMute();
    expect(sound.isMuted()).toBe(false);
    sound.playBowRelease('single');
    expect(sound.soundPlayCount).toBe(11);
    expect(sound.lastSoundPlayed).toBe('bow_release:single');
  });
});

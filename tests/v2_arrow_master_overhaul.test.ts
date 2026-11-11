import { describe, expect, it } from 'vitest';
import { SoundSystem } from '../src/audio';
import { FIXED_DT, GameEngine } from '../src/engine';
import { PROLOGUE_SLIDES, STORY_CHAPTERS, getStageConfig, getStoryChapter } from '../src/stages';
import { QUEEN_TOP_SANCTUM_X, QUEEN_TOP_SANCTUM_Y, TOP_SANCTUM_GATE_Y } from '../src/types';

class MemoryStorage {
  private map = new Map<string, string>();

  getItem(key: string): string | null {
    return this.map.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }

  removeItem(key: string): void {
    this.map.delete(key);
  }
}

describe('Townsaver v2.0 — Arrow Master Overhaul (2D Movement, Mazes, Top Sanctum Queen & Story)', () => {
  it('boots into 3-Slide Prologue on fresh save and advances Prologue -> Stage Briefing -> Live Play', () => {
    const storage = new MemoryStorage();
    const sound = new SoundSystem();
    const engine = new GameEngine({ sound, storage, initialStage: 1, storyMode: true });

    expect(PROLOGUE_SLIDES.length).toBe(3);
    expect(engine.getState().status).toBe('prologue');
    expect(engine.getState().prologueIndex).toBe(0);

    engine.advanceStory();
    expect(engine.getState().status).toBe('prologue');
    expect(engine.getState().prologueIndex).toBe(1);

    engine.advanceStory();
    expect(engine.getState().status).toBe('prologue');
    expect(engine.getState().prologueIndex).toBe(2);

    engine.advanceStory();
    expect(engine.getState().status).toBe('briefing');
    expect(engine.getState().seenPrologue).toBe(true);
    expect(engine.getState().story.chapterTitle).toContain('MEADOW GATEWAY');

    engine.advanceStory();
    expect(engine.getState().status).toBe('playing');
    expect(engine.getState().adrianX).toBe(120);
    expect(engine.getState().adrianY).toBe(282);
  });

  it('defines unique Story Chapters for all 15 handcrafted stages plus Endless Epilogue chapters', () => {
    expect(Object.keys(STORY_CHAPTERS).length).toBe(15);
    for (let s = 1; s <= 15; s++) {
      const ch = getStoryChapter(s);
      expect(ch.stageNumber).toBe(s);
      expect(ch.actTitle.length).toBeGreaterThan(5);
      expect(ch.chapterTitle.length).toBeGreaterThan(5);
      expect(ch.briefingLines.length).toBeGreaterThanOrEqual(3);
      expect(ch.queenPlea).toContain('"');
      expect(ch.reunionQuote).toContain('"');
    }

    const endlessCh = getStoryChapter(16);
    expect(endlessCh.actTitle).toContain('ENDLESS');
    expect(endlessCh.chapterTitle).toContain('WAVE 1');
  });

  it('moves Adrian freely in all 8 directions (WASD / diagonal) and collides cleanly against Iron Blocks & intact Palisades', () => {
    const engine = new GameEngine({
      storage: new MemoryStorage(),
      initialStage: 1,
      storyMode: true,
      startStatus: 'playing',
    });

    const startX = engine.getState().adrianX;
    const startY = engine.getState().adrianY;

    // Move up-left diagonally for 20 frames
    for (let i = 0; i < 20; i++) {
      engine.moveAdrian(-1, -1, FIXED_DT);
    }
    const afterDiag = engine.getState();
    expect(afterDiag.adrianX).toBeLessThan(startX);
    expect(afterDiag.adrianY).toBeLessThan(startY);
    // Diagonal movement preserves 8-way motion while snapping bow cleanly to cardinal 'up'
    expect(afterDiag.adrianFacingDir).toBe('up');

    // Place Adrian directly below Stage 1's intact Wood Palisade at (30, 212) and try walking up through it
    const pal = engine.getState().targets.find((t) => t.id === 's1_pal_c0')!;
    expect(pal.broken).toBe(false);
    engine.setPosition(pal.x, pal.y + 24);
    for (let i = 0; i < 30; i++) {
      engine.moveAdrian(0, -1, FIXED_DT);
    }
    // Blocked by intact palisade (cannot pass above pal.y + 9 + 7 = 228)
    expect(engine.getState().adrianY).toBeGreaterThanOrEqual(pal.y + 15);

    // Now shatter the Wood Palisade with a Great Arrow and walk straight through the opened gap!
    engine.setAimDirection(0, -1);
    engine.fireWeapon('heavy');
    engine.stepFrames(12);
    expect(pal.broken).toBe(true);

    for (let i = 0; i < 35; i++) {
      engine.moveAdrian(0, -1, FIXED_DT);
    }
    expect(engine.getState().adrianY).toBeLessThan(pal.y - 5);

    // Verify Blue-Iron Block at (62, 196) blocks horizontal movement solidly
    const iron = engine.getState().hazards.find((h) => h.id === 's1_cover_mid')!;
    engine.setPosition(iron.x - 24, iron.y);
    for (let i = 0; i < 30; i++) {
      engine.moveAdrian(1, 0, FIXED_DT);
    }
    expect(engine.getState().adrianX).toBeLessThanOrEqual(iron.x - 15);
  });

  it('couples WASD / Arrow movement to strict 4-Way Cardinal Aiming (Up, Down, Left, Right) without mouse aiming', () => {
    const engine = new GameEngine({
      storage: new MemoryStorage(),
      initialStage: 1,
      storyMode: true,
      startStatus: 'playing',
    });

    engine.setPosition(120, 240);
    expect(engine.getState().useMouseAim).toBe(false);
    // Live Queen Aurelia Castle Entry Callout is active upon entering the castle ward
    expect(engine.getState().queenCalloutText).toBeTruthy();

    // 1. Horizontal right shot via cardinal aim
    engine.setCardinalAim('right');
    const rightArrows = engine.fireWeapon('single');
    expect(rightArrows.length).toBe(1);
    expect(rightArrows[0].vx).toBeGreaterThan(250);
    expect(Math.abs(rightArrows[0].vy)).toBeLessThan(0.1);
    expect(engine.getState().adrianFacingDir).toBe('right');
    engine.getState().arrows.length = 0;

    // 2. Downward cardinal shot
    engine.setCardinalAim('down');
    const downArrows = engine.fireWeapon('single');
    expect(downArrows.length).toBe(1);
    expect(downArrows[0].vy).toBeGreaterThan(250);
    expect(Math.abs(downArrows[0].vx)).toBeLessThan(0.1);
    expect(engine.getState().adrianFacingDir).toBe('down');
    engine.getState().arrows.length = 0;

    // 3. Diagonal movement with preferred last-pressed cardinal ('left' vs 'up')
    engine.setMoveInput(-1, -1, 'left');
    expect(engine.getState().adrianFacingDir).toBe('left');
    const leftArrows = engine.fireWeapon('double');
    expect(leftArrows.length).toBe(2);
    expect(leftArrows[0].vx).toBeLessThan(-250);
    expect(Math.abs(leftArrows[0].vy)).toBeLessThan(0.1);
    expect(engine.getState().useMouseAim).toBe(false);
  });

  it('locks Top Sanctum Portcullis until all Raiders fall, animates rising portcullis, and requires walking up to Queen Aurelia to clear the stage', () => {
    const sound = new SoundSystem();
    const engine = new GameEngine({
      sound,
      storage: new MemoryStorage(),
      initialStage: 1,
      storyMode: true,
      startStatus: 'playing',
    });

    expect(engine.getState().sanctum.unlocked).toBe(false);
    expect(engine.getState().sanctum.portcullisProgress).toBe(0);
    expect(engine.getState().sanctum.queenX).toBe(QUEEN_TOP_SANCTUM_X);
    expect(engine.getState().sanctum.queenY).toBe(QUEEN_TOP_SANCTUM_Y);

    // Try walking through the locked Top Sanctum Gate at y = 56 while Raiders are still alive
    engine.setPosition(120, 76);
    for (let i = 0; i < 30; i++) {
      engine.moveAdrian(0, -1, FIXED_DT);
    }
    expect(engine.getState().adrianY).toBeGreaterThanOrEqual(TOP_SANCTUM_GATE_Y + 8);
    expect(engine.getState().status).toBe('playing');

    // Defeat all required Raiders via combat / unlockSanctumOnly while Adrian stands down at y = 180
    engine.setPosition(120, 180);
    engine.unlockSanctumOnly();

    const unlockedState = engine.getState();
    expect(unlockedState.sanctum.unlocked).toBe(true);
    expect(unlockedState.remainingRaiders).toBe(0);
    // Step 30 frames to verify smooth rising Portcullis animation (portcullisProgress -> 1)
    engine.stepFrames(35);
    expect(engine.getState().sanctum.portcullisProgress).toBeGreaterThan(0.95);
    // Still 'playing' because Adrian has not walked up to Queen Aurelia yet!
    expect(unlockedState.status).toBe('playing');
    expect(sound.soundHistory).toContain('sanctum_unlock');

    // Walk Adrian straight up into the Top Royal Sanctum Alcove to reach Queen Aurelia!
    engine.setPosition(120, 74);
    for (let i = 0; i < 35; i++) {
      engine.moveAdrian(0, -1, FIXED_DT);
      if (engine.getState().status !== 'playing') break;
    }

    const rescuedState = engine.getState();
    expect(rescuedState.sanctum.rescued).toBe(true);
    expect(rescuedState.status).toBe('stage_clear');
    expect(rescuedState.queenMood).toBe('cheering');
    expect(sound.soundHistory).toContain('stage_clear');
  });

  it('triggers victory_campaign grand ending when rescuing Queen Aurelia on Stage 15', () => {
    const engine = new GameEngine({
      storage: new MemoryStorage(),
      initialStage: 15,
      storyMode: true,
      startStatus: 'playing',
    });

    engine.unlockSanctumOnly();
    engine.setPosition(120, 68);
    for (let i = 0; i < 25; i++) {
      engine.moveAdrian(0, -1, FIXED_DT);
      if (engine.getState().status !== 'playing') break;
    }

    expect(engine.getState().status).toBe('victory_campaign');
    // Advancing after Stage 15 enters Stage 16 Endless Mode Briefing
    engine.advanceStory();
    expect(engine.getState().stage).toBe(16);
    expect(engine.getState().status).toBe('briefing');
  });

  it('handles Goblin ranged projectiles: blocked by Blue-Iron cover, parried mid-air by arrows, and hurts Adrian on hit', () => {
    const sound = new SoundSystem();
    const engine = new GameEngine({
      sound,
      storage: new MemoryStorage(),
      initialStage: 1,
      storyMode: true,
      startStatus: 'playing',
    });

    // Clear stage targets/hazards for isolated projectile physics checks
    const st = engine.getState();
    st.targets = [];
    st.hazards = [
      {
        id: 'cover_iron',
        kind: 'iron_block',
        type: 'iron_block',
        columnIndex: 1,
        x: 120,
        y: 180,
        baseX: 120,
        width: 20,
        height: 18,
        radius: 0,
        angle: 0,
        angularSpeed: 0,
        oscillateAmplitude: 0,
        oscillateSpeed: 0,
        segments: [],
        lodgedArrows: [],
      },
    ];

    // 1. Dagger thrown from (120, 130) toward Adrian behind Iron Block at (120, 230) is blocked by cover!
    engine.setPosition(120, 230);
    engine.spawnEnemyProjectile('dagger', 120, 130, 120, 230);
    expect(st.enemyProjectiles.length).toBe(1);
    engine.stepFrames(45);
    expect(engine.getState().enemyProjectiles.length).toBe(0);
    expect(engine.getState().hearts).toBe(4); // Unharmed behind cover!

    // 2. Mid-air parry: Remove cover block, throw fireball down x=120, fire arrow straight up to shoot it down!
    engine.getState().hazards = [];
    const scoreBefore = engine.getState().score;
    engine.spawnEnemyProjectile('fireball', 120, 140, 120, 230);
    engine.setAimDirection(0, -1);
    engine.fireWeapon('single');
    engine.stepFrames(30);
    expect(engine.getState().enemyProjectiles.length).toBe(0);
    expect(engine.getState().hearts).toBe(4);
    expect(engine.getState().score).toBe(scoreBefore + 25);

    // 3. Direct hit on Adrian deducts 1 Heart and grants 1.0s invulnerability
    engine.getState().arrows = [];
    engine.spawnEnemyProjectile('dagger', 120, 200, 120, 230);
    engine.stepFrames(25);
    expect(engine.getState().hearts).toBe(3);
    expect(engine.getState().lastFailReason).toBe('enemy_attack');
    expect(engine.getState().adrianInvulnTimer).toBeGreaterThan(0.5);
    expect(sound.soundHistory).toContain('player_hurt');
  });

  it('drops collectible Quiver & Heart pickups from smashed Siege Crates and damages Adrian on Floor Spikes', () => {
    const sound = new SoundSystem();
    const engine = new GameEngine({
      sound,
      storage: new MemoryStorage(),
      initialStage: 7, // Stage 7 includes Floor Spikes & Siege Crates
      storyMode: true,
      startStatus: 'playing',
    });

    const st7 = engine.getState();
    const crate = st7.targets.find((t) => t.kind === 'crate')!;
    expect(crate).toBeDefined();

    // Position Adrian below the crate and smash it with a Great Arrow
    const doubleBefore = st7.doubleAmmo;
    const heavyBefore = st7.heavyAmmo;
    engine.setPosition(crate.x, crate.y + 32);
    engine.setAimDirection(0, -1);
    engine.fireWeapon('heavy'); // consumes 1 heavyAmmo
    engine.stepFrames(12);

    expect(crate.active).toBe(false);
    expect(engine.getState().pickups.length).toBe(1);

    // Walk Adrian up onto the dropped pickup to collect it
    for (let i = 0; i < 30; i++) {
      engine.moveAdrian(0, -1, FIXED_DT);
      engine.step(FIXED_DT);
      if (engine.getState().pickups.length === 0) break;
    }
    expect(engine.getState().pickups.length).toBe(0);
    expect(sound.soundHistory).toContain('pickup_item');
    expect(
      engine.getState().doubleAmmo > doubleBefore ||
        engine.getState().heavyAmmo > heavyBefore - 1 ||
        engine.getState().hearts >= 4
    ).toBe(true);

    // Verify stepping onto Stage 7's Floor Spike trap damages Adrian (-1 Heart)
    const spike = engine.getState().hazards.find((h) => h.kind === 'floor_spike')!;
    expect(spike).toBeDefined();
    const heartsBeforeSpike = engine.getState().hearts;
    engine.setPosition(spike.x, spike.y);
    engine.step(FIXED_DT);
    expect(engine.getState().hearts).toBe(heartsBeforeSpike - 1);
    expect(engine.getState().lastFailReason).toBe('hazard_contact');

    // Also verify Stage 5 (Lv21 homage) and Stage 8 (Lv31 Twin Iron Channels) maze geometry
    const cfg5 = getStageConfig(5);
    const cfg8 = getStageConfig(8);
    expect(cfg5.hazards.filter((h) => h.kind === 'iron_block').length).toBeGreaterThanOrEqual(4);
    expect(cfg8.hazards.filter((h) => h.kind === 'iron_block').length).toBeGreaterThanOrEqual(6);
  });
});

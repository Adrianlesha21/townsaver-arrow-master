/**
 * Townsaver — Milestone 3 & Milestone 4 Deterministic GameEngine Unit Test Suite (Vitest)
 * Verifies:
 * 1. All 15 Handcrafted Stages + Stage 16+ Endless Mode configurations, palettes, and deep-clone isolation.
 * 2. 3 Weapon Variations:
 *    - Single Arrow (1 DMG, slows from -260 to -115 px/s in Wood Palisade, lodges into 2-HP targets).
 *    - Double Shot (2x1 DMG Wide Multi-Hit at x-6 & x+6, strips helmet & defeats 2-HP Goblin in 1 volley).
 *    - Great Arrow (3 DMG Piercing Shatter blasts through Wood Palisades without velocity drop, still deflects off Blue-Iron Blocks).
 * 3. Auto-Stepping Column Lanes across [30, 90, 150, 210], ammo rewards, and Queen reactive moods
 *    ('watching', 'cheering', 'praying' at 1 Heart, 'distressed').
 * 4. Fail Condition 1: Blue-Iron Block & Iron Shield Arc deflection (-1 Heart, metallic_clang, 180ms hit-stop).
 * 5. Fail Condition 2: Arrow-on-Arrow Clip on palisade-slowed in-flight arrows AND lodged arrows (-1 Heart, arrow_clip_buzz).
 * 6. 0-Heart Stage Reset: Town Breached — Restarting Stage & clean 4-Heart restoration.
 * 7. Stage Clear Progression, Flawless Bonus Heart (up to 5 max), and localStorage persistence ('townsaver_save_v1').
 */

import { describe, expect, it } from 'vitest';
import { SoundSystem } from '../src/audio';
import {
  COLUMNS,
  FIXED_DT,
  GREAT_ARROW_SPEED,
  GameEngine,
  PALISADE_SLOWED_SPEED,
  SAVE_STORAGE_KEY,
  SINGLE_ARROW_SPEED,
} from '../src/engine';
import { getTerrainPaletteName } from '../src/sprites';
import {
  HANDCRAFTED_STAGE_COUNT,
  STAGE_CONFIGS,
  STAGE_NAMES,
  TOTAL_HANDCRAFTED_STAGES,
  getAllHandcraftedStages,
  getStageConfig,
} from '../src/stages';

class MockStorage {
  public map = new Map<string, string>();
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

describe('Townsaver M3/M4 — Stages & Endless Generator (src/stages.ts)', () => {
  it('defines all 15 handcrafted stages plus Stage 16+ endless scaling with matching names and palettes', () => {
    expect(TOTAL_HANDCRAFTED_STAGES).toBe(15);
    expect(HANDCRAFTED_STAGE_COUNT).toBe(15);
    expect(STAGE_CONFIGS.length).toBe(15);
    expect(getAllHandcraftedStages().length).toBe(15);

    for (let s = 1; s <= 20; s++) {
      const cfg = getStageConfig(s);
      expect(cfg.stageNumber).toBe(s);
      if (s <= 16) {
        expect(cfg.name).toBe(STAGE_NAMES[s]);
        expect(cfg.palette).toBe(getTerrainPaletteName(s));
      } else {
        expect(cfg.name).toBe('ENDLESS INVASION');
        expect(cfg.subtitle).toContain(`ENDLESS WAVE ${s - 15}`);
      }
      expect(cfg.columns.length).toBeGreaterThanOrEqual(2);
      expect(cfg.columns.length).toBeLessThanOrEqual(4);
      expect(cfg.startingDoubleAmmo).toBeGreaterThanOrEqual(5);
      expect(cfg.startingHeavyAmmo).toBeGreaterThanOrEqual(2);

      // Every active column in the stage must have at least 1 required target
      for (let colIdx = 0; colIdx < cfg.columns.length; colIdx++) {
        const reqInCol = cfg.targets.filter(
          (t) => t.columnIndex === colIdx && t.requiredForClear
        );
        expect(reqInCol.length).toBeGreaterThan(0);
      }
    }
  });

  it('returns fresh deep-cloned stage configurations so gameplay mutations never corrupt templates', () => {
    const stage1A = getStageConfig(1);
    const stage1B = getStageConfig(1);
    stage1A.targets[0].hp = 0;
    stage1A.targets[0].broken = true;
    expect(stage1B.targets[0].hp).toBeGreaterThan(0);
    expect(stage1B.targets[0].broken).toBe(false);
  });
});

describe('Townsaver M3/M4 — Weapon Variations & Physics (src/engine.ts)', () => {
  it('Variation 1 (Single Arrow): fires at -260 px/s, slows to -115 px/s through Wood Palisade, and lodges into 2-HP Goblin', () => {
    const sound = new SoundSystem();
    const storage = new MockStorage();
    const engine = new GameEngine({ sound, storage, initialStage: 1 });

    // Stage 1 Col 0 (x=30) has intact palisade at y=212 and 2-HP goblin_torch at y=96
    const st = engine.getState();
    const palisade = st.targets.find((t) => t.columnIndex === 0 && t.kind === 'palisade')!;
    const goblin = st.targets.find((t) => t.columnIndex === 0 && t.kind === 'goblin_torch')!;
    goblin.vx = 0;
    goblin.x = 30;

    expect(palisade.broken).toBe(false);
    expect(goblin.hp).toBe(2);

    const spawned = engine.fireWeapon('single', 0);
    expect(spawned.length).toBe(1);
    expect(spawned[0].vy).toBe(SINGLE_ARROW_SPEED);
    expect(spawned[0].slowedByPalisade).toBe(false);
    expect(sound.lastSoundPlayed).toBe('bow_release:single');

    // Step until arrow passes through palisade at y=212 (~15 frames)
    for (let i = 0; i < 20; i++) {
      engine.step(FIXED_DT);
      if (palisade.broken) break;
    }

    expect(palisade.broken).toBe(true);
    expect(spawned[0].vy).toBe(PALISADE_SLOWED_SPEED);
    expect(spawned[0].slowedByPalisade).toBe(true);
    expect(spawned[0].slowed).toBe(true);
    expect(sound.soundHistory).toContain('wood_shatter:normal');

    // Step until slowed arrow reaches 2-HP Goblin at y=96 and lodges into it (leaving 1 HP)
    for (let i = 0; i < 90; i++) {
      engine.step(FIXED_DT);
      if (!spawned[0].active) break;
    }

    expect(goblin.hp).toBe(1);
    expect(goblin.lodgedArrows.length).toBe(1);
    expect(goblin.staggerTimer).toBeGreaterThan(0);
    expect(sound.soundHistory).toContain('enemy_hit');
  });

  it('Variation 2 (Double Shot): consumes 1 charge, fires twin arrows (x-6, x+6), and defeats a 2-HP Goblin in 1 shot without self-clipping', () => {
    const sound = new SoundSystem();
    const storage = new MockStorage();
    const engine = new GameEngine({ sound, storage, initialStage: 2 });

    const st = engine.getState();
    const startDoubleAmmo = st.doubleAmmo;
    // Stage 2 Col 0 has 2-HP goblin_dagger at y=150 (front-most target in Col 0)
    const frontGoblin = st.targets.find((t) => t.id === 's2_gob2_c0')!;
    frontGoblin.vx = 0;
    frontGoblin.x = 30;
    expect(frontGoblin.hp).toBe(2);

    engine.selectWeapon('double');
    const twinArrows = engine.fireWeapon('double', 0);
    expect(twinArrows.length).toBe(2);
    expect(twinArrows[0].x).toBe(24); // 30 - 6
    expect(twinArrows[1].x).toBe(36); // 30 + 6
    expect(twinArrows[0].volleyId).toBe(twinArrows[1].volleyId);
    expect(engine.getState().doubleAmmo).toBe(startDoubleAmmo - 1);
    expect(sound.lastSoundPlayed).toBe('bow_release:double');

    // Step until twin arrows strike the 2-HP goblin at y=150
    for (let i = 0; i < 45; i++) {
      engine.step(FIXED_DT);
      if (!frontGoblin.active) break;
    }

    expect(frontGoblin.hp).toBe(0);
    expect(frontGoblin.active).toBe(false);
    expect(engine.getState().hearts).toBe(4); // Zero self-clip penalty!
    expect(engine.getState().lastFailReason).toBe('none');
  });

  it('Variation 3 (Great Arrow): Piercing Shatter blasts through Wood Palisades without slowing down, destroys 2-HP targets, and STILL deflects off Blue-Iron Blocks', () => {
    const sound = new SoundSystem();
    const storage = new MockStorage();
    const engine = new GameEngine({ sound, storage, initialStage: 1 });

    const st = engine.getState();
    const startHeavyAmmo = st.heavyAmmo;
    const palisade = st.targets.find((t) => t.columnIndex === 0 && t.kind === 'palisade')!;
    const goblin = st.targets.find((t) => t.columnIndex === 0 && t.kind === 'goblin_torch')!;
    const bat = st.targets.find((t) => t.columnIndex === 0 && t.kind === 'bat')!;
    goblin.vx = 0;
    goblin.x = 30;
    bat.vx = 0;
    bat.x = 30;

    const spawned = engine.fireWeapon('heavy', 0);
    expect(spawned.length).toBe(1);
    const greatArrow = spawned[0];
    expect(greatArrow.vy).toBe(GREAT_ARROW_SPEED);
    expect(greatArrow.piercing).toBe(true);
    expect(greatArrow.damage).toBe(3);
    expect(engine.getState().heavyAmmo).toBe(startHeavyAmmo - 1);
    expect(sound.lastSoundPlayed).toBe('bow_release:heavy');

    // Step through palisade, 2-HP goblin, and bat in Column 0
    for (let i = 0; i < 85; i++) {
      engine.step(FIXED_DT);
      if (palisade.broken && !greatArrow.deflected) {
        // Velocity must never drop when piercing through palisade!
        expect(greatArrow.vy).toBe(GREAT_ARROW_SPEED);
        expect(greatArrow.slowedByPalisade).toBe(false);
      }
    }

    expect(palisade.broken).toBe(true);
    expect(goblin.hp).toBe(0);
    expect(bat.hp).toBe(0);
    expect(sound.soundHistory).toContain('wood_shatter:piercing');

    // Verify Great Arrow STILL deflects off an indestructible Blue-Iron Block (-1 Heart)
    const heartsBefore = engine.getState().hearts;
    engine.triggerIronDeflectionTest('heavy');
    expect(engine.getState().hearts).toBe(heartsBefore - 1);
    expect(engine.getState().lastFailReason).toBe('iron_block_deflection');
    expect(sound.lastSoundPlayed).toBe('metallic_clang');
  });
});

describe('Townsaver M3/M4 — Fail Conditions 1 & 2, Queen Moods & 0-Heart Breach Reset', () => {
  it('Fail Condition 1: Blue-Iron Block deflection deducts 1 Heart, plays metallic_clang, triggers 180ms hit-stop/shake, and sets Queen distressed', () => {
    const sound = new SoundSystem();
    const engine = new GameEngine({ sound, storage: new MockStorage(), initialStage: 1 });

    expect(engine.getState().hearts).toBe(4);
    expect(engine.getState().queenMood).toBe('watching');

    engine.triggerIronDeflectionTest('single');
    const st = engine.getState();

    expect(st.hearts).toBe(3);
    expect(st.lostHearts).toBe(2);
    expect(st.lastFailReason).toBe('iron_block_deflection');
    expect(st.queenMood).toBe('distressed');
    expect(st.hitStopTimer).toBeGreaterThan(0);
    expect(st.screenShakeTimer).toBeGreaterThan(0);
    expect(sound.lastSoundPlayed).toBe('metallic_clang');
  });

  it('Fail Condition 2A & 2B: Clipping a palisade-slowed arrow OR a lodged arrow deducts 1 Heart, plays arrow_clip_buzz, and transitions Queen to praying at 1 Heart', () => {
    const sound = new SoundSystem();
    const engine = new GameEngine({ sound, storage: new MockStorage(), initialStage: 1 });

    // 2A: Palisade-slowed in-flight arrow clip (4 -> 3 Hearts)
    engine.triggerArrowClipTest('palisade_slowed');
    expect(engine.getState().hearts).toBe(3);
    expect(engine.getState().lastFailReason).toBe('arrow_on_arrow_clip');
    expect(engine.getState().queenMood).toBe('distressed');
    expect(sound.lastSoundPlayed).toBe('arrow_clip_buzz');

    // Step past 180ms hit-stop (12 frames)
    engine.stepFrames(15);

    // 2B: Lodged arrow clip on armored target (3 -> 2 Hearts)
    engine.triggerArrowClipTest('lodged');
    expect(engine.getState().hearts).toBe(2);
    expect(engine.getState().lastFailReason).toBe('arrow_on_arrow_clip');
    expect(sound.lastSoundPlayed).toBe('arrow_clip_buzz');

    engine.stepFrames(15);

    // Drop to 1 Heart -> Queen must enter 'praying' mood!
    engine.triggerIronDeflectionTest('single');
    expect(engine.getState().hearts).toBe(1);
    expect(engine.getState().queenMood).toBe('praying');
  });

  it('0-Heart Depletion triggers Town Breached — Restarting Stage and resets stage cleanly back to 4 Hearts', () => {
    const sound = new SoundSystem();
    const engine = new GameEngine({ sound, storage: new MockStorage(), initialStage: 1 });

    for (let hit = 0; hit < 4; hit++) {
      engine.triggerIronDeflectionTest('single');
      if (hit < 3) {
        engine.stepFrames(15);
      }
    }

    const breached = engine.getState();
    expect(breached.hearts).toBe(0);
    expect(breached.status).toBe('town_breached');
    expect(breached.lastFailReason).toBe('town_breached');
    expect(breached.statusBanner).toBe('Town Breached — Restarting Stage');
    expect(breached.queenMood).toBe('distressed');
    expect(sound.lastSoundPlayed).toBe('town_breached');

    // Advance 95 frames (1.58s) -> stage automatically restarts at 4 Hearts
    engine.stepFrames(95);
    const restarted = engine.getState();
    expect(restarted.status).toBe('playing');
    expect(restarted.hearts).toBe(4);
    expect(restarted.queenMood).toBe('watching');
    expect(restarted.stage).toBe(1);
  });
});

describe('Townsaver M3/M4 — Auto-Stepping Column Lanes, Stage Clear & localStorage Persistence', () => {
  it('auto-steps Adrian smoothly across columns [30, 90, 150, 210] as columns are cleared, cheering Queen and awarding special ammo', () => {
    const sound = new SoundSystem();
    const storage = new MockStorage();
    const engine = new GameEngine({ sound, storage, initialStage: 1 });

    expect(engine.getState().currentColumnIndex).toBe(0);
    expect(engine.getState().adrianX).toBe(COLUMNS[0]);

    const initialDoubleAmmo = engine.getState().doubleAmmo;
    const initialHeavyAmmo = engine.getState().heavyAmmo;

    // Clear Column 0 -> Adrian targets Column 1 (x=90), Queen cheers, +1 Double Shot
    engine.clearCurrentColumn();
    expect(engine.getState().currentColumnIndex).toBe(1);
    expect(engine.getState().targetAdrianX).toBe(COLUMNS[1]);
    expect(engine.getState().queenMood).toBe('cheering');
    expect(engine.getState().doubleAmmo).toBe(initialDoubleAmmo + 1);

    // Step 12 frames so Adrian smoothly walks from x=30 to x=90
    engine.stepFrames(12);
    expect(engine.getState().adrianX).toBe(COLUMNS[1]);

    // Clear Column 1 (2nd column cleared) -> +1 Double Shot AND +1 Great Arrow!
    engine.clearCurrentColumn();
    expect(engine.getState().currentColumnIndex).toBe(2);
    expect(engine.getState().doubleAmmo).toBe(initialDoubleAmmo + 2);
    expect(engine.getState().heavyAmmo).toBe(initialHeavyAmmo + 1);
  });

  it('clearing all required targets triggers Stage Clear!, awards flawless bonus heart (5 max), persists save to localStorage, and advances to Stage 2', () => {
    const sound = new SoundSystem();
    const storage = new MockStorage();
    const engine = new GameEngine({ sound, storage, initialStage: 1 });

    engine.clearCurrentStage(false);
    const clearState = engine.getState();

    expect(clearState.status).toBe('stage_clear');
    expect(clearState.statusBanner).toBe('Stage Clear!');
    expect(clearState.queenMood).toBe('cheering');
    expect(clearState.hearts).toBe(5); // Flawless clear bonus heart: 4 -> 5!
    expect(clearState.unlockedStage).toBe(2);
    expect(clearState.score).toBeGreaterThan(0);
    expect(clearState.highScore).toBe(clearState.score);
    expect(sound.lastSoundPlayed).toBe('stage_clear');

    // Verify localStorage persistence
    const savedRaw = storage.getItem(SAVE_STORAGE_KEY);
    expect(savedRaw).toBeTruthy();
    const saved = JSON.parse(savedRaw!);
    expect(saved.unlockedStage).toBe(2);
    expect(saved.highScore).toBe(clearState.score);

    // Step 95 frames to transition into Stage 2
    engine.stepFrames(95);
    const stage2State = engine.getState();
    expect(stage2State.status).toBe('playing');
    expect(stage2State.stage).toBe(2);
    expect(stage2State.stageName).toBe('GOBLIN PATROL');
    expect(stage2State.terrainPalette).toBe('courtyard');
    expect(stage2State.hearts).toBe(5); // Preserved bonus heart!
  });
});

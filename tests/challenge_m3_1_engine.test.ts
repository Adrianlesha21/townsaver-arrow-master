/**
 * Townsaver — Challenger M3-1 Adversarial & White-Box Coverage Hardening Suite (Vitest)
 * Target: src/engine.ts, src/stages.ts, src/types.ts
 *
 * Stress-tests:
 * 1. All 15 Handcrafted Stages (1..15) + Endless Mode Stages (16, 17, 20, 25, 50):
 *    - Valid playfield coordinates, non-overlapping vertical column bounding boxes,
 *      patrol boundaries, oscillating Blue-Iron Block shooting windows, Rotating Shield
 *      open/wood angular windows, and full sequential campaign clear from Stage 1 -> Stage 16.
 * 2. Rotating Shield Barrier ('rotating_shield') White-Box Physics:
 *    - Striking an 'iron' arc triggers Fail Condition 1 (-1 Heart, metallic_clang, deflection).
 *    - Striking an intact 'wood' arc with a Single Arrow deals 1 DMG (2 -> 1 HP) and lodges an
 *      arrow onto the rotating shield rim.
 *    - Striking that rotating lodged arrow with a subsequent Single Arrow triggers Fail Condition 2
 *      (-1 Heart, arrow_clip_buzz) and snaps off the lodged arrow.
 *    - Striking an intact 'wood' arc with a Great Arrow ('heavy') shatters the wood segment (2 -> 0 HP)
 *      with 'wood_shatter:piercing' without lodging or slowing down.
 * 3. Double Shot Volley Deduplication ('penalizedVolleyIds'):
 *    - Firing a Double Shot (2 twin arrows sharing a volleyId at x-6 and x+6) into a centered
 *      20px-wide Blue-Iron Block hits with both twin arrows on the same step but deducts
 *      strictly 1 Heart (never 2 Hearts).
 *    - Double Shot twin arrows passing through a Wood Palisade slow down together without
 *      self-clipping each other, and striking a 2-HP target with both twin arrows never triggers
 *      a self-lodged clip.
 * 4. Queen Reactive Mood Priority Transitions:
 *    - 'watching' (4 Hearts) -> 'distressed' (on 4->3 Hearts) -> decays to 'watching' after 1.2s ->
 *      'praying' (at 1 Heart, sticky) -> 'cheering' (on column clear at 1 Heart) -> returns to
 *      'praying' after 1.5s cheer timer -> 'distressed' (at 0 Hearts Town Breached) ->
 *      'watching' (after stage reset to 4 Hearts) -> 'cheering' (on Stage Clear).
 * 5. Flawless Clear +1 Bonus Heart Cap (4 -> 5 max, never 6), Non-Flawless Clear behavior,
 *    Ammo Depletion Fallback, and localStorage Persistence + Corrupted JSON Resilience + resetSave().
 */

import { describe, expect, it } from 'vitest';
import { SoundSystem } from '../src/audio';
import {
  ARROW_SPAWN_Y,
  COLUMNS,
  FIXED_DT,
  GREAT_ARROW_SPEED,
  GameEngine,
  LOGICAL_HEIGHT,
  LOGICAL_WIDTH,
  PALISADE_SLOWED_SPEED,
  SAVE_STORAGE_KEY,
  TOP_CEILING_Y,
} from '../src/engine';
import {
  STAGE_NAMES,
  TOTAL_HANDCRAFTED_STAGES,
  createDefaultShieldSegments,
  generateEndlessStage,
  getAllHandcraftedStages,
  getStageConfig,
} from '../src/stages';

class AdversarialMockStorage {
  public store = new Map<string, string>();
  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
}

describe('Challenger M3-1 — 1. All 15 Handcrafted Stages + Endless Stages 16..50 Audit', () => {
  const stageNumbersToAudit = [
    1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 20, 25, 50,
  ];

  it('verifies valid playfield coordinates, non-overlapping vertical targets, and patrol bounds across Stages 1..50', () => {
    expect(LOGICAL_WIDTH).toBe(240);
    expect(LOGICAL_HEIGHT).toBe(320);
    expect(TOTAL_HANDCRAFTED_STAGES).toBe(15);
    expect(getAllHandcraftedStages().length).toBe(15);

    for (const s of stageNumbersToAudit) {
      const cfg = getStageConfig(s);
      expect(cfg.stageNumber).toBe(s);
      expect(cfg.targets.length).toBeGreaterThan(0);

      if (s <= 15) {
        expect(cfg.name).toBe(STAGE_NAMES[s]);
      } else {
        expect(cfg.name).toBe('ENDLESS INVASION');
        expect(cfg.subtitle).toContain(`ENDLESS WAVE ${s - 15}`);
      }

      // Group targets by column and check bounds & vertical separation
      for (let col = 0; col < cfg.columns.length; col++) {
        const colCenter = COLUMNS[col];
        const colTargets = cfg.targets.filter((t) => t.columnIndex === col);
        const reqTargets = colTargets.filter((t) => t.requiredForClear);
        expect(reqTargets.length).toBeGreaterThan(0);

        for (const t of colTargets) {
          expect(t.x).toBeGreaterThanOrEqual(8);
          expect(t.x).toBeLessThanOrEqual(LOGICAL_WIDTH - 8);
          expect(t.y).toBeGreaterThanOrEqual(TOP_CEILING_Y + 10);
          expect(t.y).toBeLessThanOrEqual(ARROW_SPAWN_Y - 30);
          expect(t.patrolMinX).toBeGreaterThanOrEqual(colCenter - 20);
          expect(t.patrolMaxX).toBeLessThanOrEqual(colCenter + 20);
          expect(t.patrolMinX).toBeLessThanOrEqual(t.patrolMaxX);
        }

        // Verify targets in the same column do not vertically overlap each other
        const sortedByY = [...colTargets].sort((a, b) => a.y - b.y);
        for (let i = 1; i < sortedByY.length; i++) {
          const prev = sortedByY[i - 1];
          const curr = sortedByY[i];
          const minVerticalGap = (prev.height + curr.height) / 2;
          expect(curr.y - prev.y).toBeGreaterThanOrEqual(minVerticalGap);
        }
      }

      // Verify Endless Wave 50 velocity and speed caps remain bounded and playable
      if (s === 50) {
        const endless50 = generateEndlessStage(50);
        for (const t of endless50.targets) {
          expect(Math.abs(t.vx)).toBeLessThanOrEqual(44);
        }
        for (const h of endless50.hazards) {
          if (h.kind === 'iron_block') {
            expect(h.oscillateSpeed).toBeLessThanOrEqual(2.8);
          } else if (h.kind === 'rotating_shield') {
            expect(Math.abs(h.angularSpeed)).toBeLessThanOrEqual(2.6);
          }
        }
      }
    }
  });

  it('verifies every oscillating Blue-Iron Block and Rotating Shield opens clear shooting windows over a 2-second cycle', () => {
    for (const s of stageNumbersToAudit) {
      const engine = new GameEngine({ storage: new AdversarialMockStorage(), initialStage: s });
      const st = engine.getState();

      // Track whether each column's hazards open a clear path at column center X
      const openWindowFound = new Map<string, boolean>();
      for (const h of st.hazards) {
        openWindowFound.set(h.id, false);
      }

      for (let frame = 0; frame < 120; frame++) {
        engine.step(FIXED_DT);
        const cur = engine.getState();
        for (const h of cur.hazards) {
          const colX = COLUMNS[h.columnIndex];
          if (h.kind === 'iron_block') {
            // Single arrow halfWidth=3, iron_block halfWidth=10 -> clear when |h.x - colX| > 13
            if (Math.abs(h.x - colX) > h.width / 2 + 3) {
              openWindowFound.set(h.id, true);
            }
          } else if (h.kind === 'rotating_shield') {
            // Upward arrow strikes bottom of shield at world angle Math.PI / 2
            const relAngle =
              ((Math.PI / 2 - h.angle) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
            const ironBlocking = h.segments.some(
              (seg) =>
                seg.type === 'iron' &&
                relAngle >= seg.startAngle - 0.12 &&
                relAngle <= seg.endAngle + 0.12
            );
            if (!ironBlocking) {
              openWindowFound.set(h.id, true);
            }
          } else if (h.kind === 'floor_spike') {
            // Ground spike traps do not block flying arrows
            openWindowFound.set(h.id, true);
          }
        }
      }

      for (const [hazardId, isOpen] of openWindowFound.entries()) {
        expect(isOpen, `Hazard ${hazardId} in Stage ${s} must open a shooting window`).toBe(true);
      }
    }
  });

  it('completes full stage progression sequentially from Stage 1 through Stage 16 (Endless Wave 1)', () => {
    const storage = new AdversarialMockStorage();
    const sound = new SoundSystem();
    const engine = new GameEngine({ sound, storage, initialStage: 1 });

    for (let expectedStage = 1; expectedStage <= 16; expectedStage++) {
      const stateBefore = engine.getState();
      expect(stateBefore.stage).toBe(expectedStage);
      expect(stateBefore.status).toBe('playing');

      // Clear columns one by one using clearCurrentColumn() until the final column triggers stage_clear
      let safetyCounter = 0;
      while (engine.getState().status === 'playing' && safetyCounter < 10) {
        engine.clearCurrentColumn();
        safetyCounter += 1;
      }

      const clearedState = engine.getState();
      expect(clearedState.status).toBe('stage_clear');
      expect(clearedState.statusBanner).toBe('Stage Clear!');
      expect(clearedState.queenMood).toBe('cheering');
      expect(clearedState.unlockedStage).toBe(Math.min(16, expectedStage + 1));

      if (expectedStage < 16) {
        // Step through the 90-frame stage clear celebration timer to auto-advance
        engine.stepFrames(92);
        expect(engine.getState().stage).toBe(expectedStage + 1);
      }
    }

    const finalSave = JSON.parse(storage.getItem(SAVE_STORAGE_KEY)!);
    expect(finalSave.unlockedStage).toBe(16);
    expect(finalSave.highScore).toBe(engine.getState().score);
    expect(finalSave.highScore).toBeGreaterThan(20000);
  });
});

describe('Challenger M3-1 — 2. Rotating Shield Barrier (rotating_shield) Physics & Edge Cases', () => {
  it('hitting an iron shield arc triggers Fail Condition 1 (-1 Heart, metallic_clang, arrow deflection)', () => {
    const sound = new SoundSystem();
    const engine = new GameEngine({ sound, storage: new AdversarialMockStorage(), initialStage: 9 });
    const st = engine.getState();

    // Isolate Rotating Shield in Column 0 (x=30, y=152, radius=14)
    const shield = st.hazards.find((h) => h.kind === 'rotating_shield' && h.columnIndex === 0)!;
    expect(shield).toBeDefined();
    shield.angularSpeed = 0;
    shield.lodgedArrows = [];
    shield.segments = createDefaultShieldSegments();
    // Iron segment 0 spans [0, 0.42*PI]. Bottom of wheel is worldImpactAngle = 0.5*PI.
    // Set shield.angle = 0.3*PI so relAngle = 0.5*PI - 0.3*PI = 0.2*PI (squarely inside iron segment 0!)
    shield.angle = Math.PI * 0.3;

    const arrows = engine.fireWeapon('single', 0);
    arrows[0].y = shield.y + shield.radius + 2; // Just below bottom rim
    engine.step(FIXED_DT);

    const after = engine.getState();
    expect(after.hearts).toBe(3);
    expect(after.lastFailReason).toBe('iron_block_deflection');
    expect(after.queenMood).toBe('distressed');
    expect(arrows[0].deflected).toBe(true);
    expect(sound.lastSoundPlayed).toBe('metallic_clang');
  });

  it('hitting a wood shield arc with Single Arrow damages it (2->1 HP) & lodges arrow, and hitting that rotating lodged arrow triggers Fail Condition 2 (-1 Heart, arrow_clip_buzz)', () => {
    const sound = new SoundSystem();
    const engine = new GameEngine({ sound, storage: new AdversarialMockStorage(), initialStage: 9 });
    const st = engine.getState();

    const shield = st.hazards.find((h) => h.kind === 'rotating_shield' && h.columnIndex === 0)!;
    shield.angularSpeed = 0;
    shield.lodgedArrows = [];
    shield.segments = createDefaultShieldSegments();
    // Wood segment 1 spans [0.5*PI, 0.92*PI].
    // Set shield.angle = -0.2*PI so at bottom of wheel (0.5*PI), relAngle = 0.7*PI (inside wood segment 1!)
    shield.angle = -Math.PI * 0.2;

    const woodSeg = shield.segments[1];
    expect(woodSeg.type).toBe('wood');
    expect(woodSeg.hp).toBe(2);

    // 1st Single Arrow strikes intact wood arc -> 2 -> 1 HP and lodges into shield rim
    const firstShot = engine.fireWeapon('single', 0);
    firstShot[0].y = shield.y + shield.radius + 2;
    engine.step(FIXED_DT);

    expect(woodSeg.hp).toBe(1);
    expect(shield.lodgedArrows.length).toBe(1);
    expect(engine.getState().hearts).toBe(4);
    expect(sound.lastSoundPlayed).toBe('enemy_hit');

    // Rotate the shield slightly and back (or keep at same angle where the lodged arrow sits at bottom rim)
    // Now fire a 2nd Single Arrow at the exact rim position of that lodged arrow -> Fail Condition 2!
    const secondShot = engine.fireWeapon('single', 0);
    secondShot[0].y = shield.y + shield.radius + 2;
    engine.step(FIXED_DT);

    const afterClip = engine.getState();
    expect(afterClip.hearts).toBe(3);
    expect(afterClip.lastFailReason).toBe('arrow_on_arrow_clip');
    expect(afterClip.queenMood).toBe('distressed');
    expect(shield.lodgedArrows.length).toBe(0); // Lodged arrow snapped off on clip
    expect(sound.lastSoundPlayed).toBe('arrow_clip_buzz');
  });

  it('hitting an intact wood shield arc with a Great Arrow (heavy) shatters it cleanly (2->0 HP) without lodging or slowing down', () => {
    const sound = new SoundSystem();
    const engine = new GameEngine({ sound, storage: new AdversarialMockStorage(), initialStage: 9 });
    const st = engine.getState();

    const shield = st.hazards.find((h) => h.kind === 'rotating_shield' && h.columnIndex === 0)!;
    shield.angularSpeed = 0;
    shield.lodgedArrows = [];
    shield.segments = createDefaultShieldSegments();
    shield.angle = -Math.PI * 0.2; // Exposes wood segment 1 at bottom of shield

    const woodSeg = shield.segments[1];
    expect(woodSeg.hp).toBe(2);

    const heavyArrows = engine.fireWeapon('heavy', 0);
    expect(heavyArrows.length).toBe(1);
    heavyArrows[0].y = shield.y + shield.radius + 3;

    engine.step(FIXED_DT);

    expect(woodSeg.hp).toBe(0);
    expect(shield.lodgedArrows.length).toBe(0);
    expect(heavyArrows[0].active).toBe(true);
    expect(heavyArrows[0].vy).toBe(GREAT_ARROW_SPEED);
    expect(engine.getState().hearts).toBe(4);
    expect(sound.soundHistory).toContain('wood_shatter:piercing');
  });
});

describe('Challenger M3-1 — 3. Double Shot Volley Deduplication & Multi-Arrow Edge Cases', () => {
  it('firing a Double Shot (2 twin arrows sharing a volleyId) into a wide Blue-Iron Block deducts strictly 1 Heart (not 2 Hearts)', () => {
    const sound = new SoundSystem();
    const engine = new GameEngine({ sound, storage: new AdversarialMockStorage(), initialStage: 4 });
    const st = engine.getState();

    // Center the 20px-wide Blue-Iron Block in Column 0 (x=30) so both x=24 and x=36 twin arrows hit it simultaneously
    const ironBlock = st.hazards.find((h) => h.kind === 'iron_block' && h.columnIndex === 0)!;
    expect(ironBlock).toBeDefined();
    ironBlock.oscillateAmplitude = 0;
    ironBlock.oscillateSpeed = 0;
    ironBlock.x = COLUMNS[0]; // 30
    ironBlock.baseX = COLUMNS[0];
    ironBlock.y = 180;

    expect(st.hearts).toBe(4);

    const twinArrows = engine.fireWeapon('double', 0);
    expect(twinArrows.length).toBe(2);
    expect(twinArrows[0].volleyId).toBeDefined();
    expect(twinArrows[0].volleyId).toBe(twinArrows[1].volleyId);

    // Position both twin arrows right below the iron block so both collide on the next step
    twinArrows[0].y = ironBlock.y + 10;
    twinArrows[1].y = ironBlock.y + 10;

    engine.step(FIXED_DT);

    const after = engine.getState();
    expect(twinArrows[0].deflected).toBe(true);
    expect(twinArrows[1].deflected).toBe(true);
    // Must deduct strictly 1 Heart (4 -> 3), NEVER 2 Hearts (4 -> 2)!
    expect(after.hearts).toBe(3);
    expect(after.lastFailReason).toBe('iron_block_deflection');
    expect(sound.lastSoundPlayed).toBe('metallic_clang');
  });

  it('Double Shot twin arrows passing through a Wood Palisade slow down together to -115 px/s without self-clipping', () => {
    const engine = new GameEngine({ storage: new AdversarialMockStorage(), initialStage: 1 });
    const st = engine.getState();
    const palisade = st.targets.find((t) => t.columnIndex === 0 && t.kind === 'palisade')!;
    expect(palisade.broken).toBe(false);

    const twinArrows = engine.fireWeapon('double', 0);
    expect(twinArrows.length).toBe(2);

    // Step until palisade is cracked by the twin volley
    for (let i = 0; i < 20; i++) {
      engine.step(FIXED_DT);
      if (palisade.broken) break;
    }

    expect(palisade.broken).toBe(true);
    expect(twinArrows[0].vy).toBe(PALISADE_SLOWED_SPEED);
    expect(twinArrows[1].vy).toBe(PALISADE_SLOWED_SPEED);
    expect(twinArrows[0].slowedByPalisade).toBe(true);
    expect(twinArrows[1].slowedByPalisade).toBe(true);

    // Continue stepping 15 more frames to verify twin arrows never clip each other in flight
    engine.stepFrames(15);
    expect(engine.getState().hearts).toBe(4);
    expect(engine.getState().lastFailReason).toBe('none');
  });
});

describe('Challenger M3-1 — 4. Queen Reactive Mood Priority Transitions', () => {
  it('verifies full Queen mood priority lifecycle: watching -> distressed -> watching -> praying (sticky at 1 Heart) -> cheering -> praying -> distressed (0-Heart breach) -> watching (reset) -> cheering (stage clear)', () => {
    const sound = new SoundSystem();
    const engine = new GameEngine({ sound, storage: new AdversarialMockStorage(), initialStage: 1 });

    // 1. Starts at 4 Hearts in 'watching' mood
    expect(engine.getState().hearts).toBe(4);
    expect(engine.getState().queenMood).toBe('watching');

    // 2. Lose 1 Heart (4 -> 3 Hearts) -> 'distressed'
    engine.triggerIronDeflectionTest('single');
    expect(engine.getState().hearts).toBe(3);
    expect(engine.getState().queenMood).toBe('distressed');

    // Step past 180ms hit-stop (12 frames) + 1.2s queenMoodTimer (75 frames) -> decays back to 'watching'
    engine.stepFrames(90);
    expect(engine.getState().hearts).toBe(3);
    expect(engine.getState().queenMood).toBe('watching');

    // 3. Lose 2nd Heart (3 -> 2 Hearts) -> 'distressed'
    engine.triggerArrowClipTest('palisade_slowed');
    expect(engine.getState().hearts).toBe(2);
    expect(engine.getState().queenMood).toBe('distressed');
    engine.stepFrames(20);

    // 4. Lose 3rd Heart (2 -> 1 Heart) -> 'praying' (must remain 'praying' even after 120 frames!)
    engine.triggerIronDeflectionTest('single');
    expect(engine.getState().hearts).toBe(1);
    expect(engine.getState().queenMood).toBe('praying');
    engine.stepFrames(120);
    expect(engine.getState().queenMood).toBe('praying');

    // 5. Clear Column 0 while at 1 Heart -> temporarily 'cheering', then returns to 'praying' after 1.5s!
    engine.clearCurrentColumn();
    expect(engine.getState().queenMood).toBe('cheering');
    engine.stepFrames(95);
    expect(engine.getState().hearts).toBe(1);
    expect(engine.getState().queenMood).toBe('praying');

    // 6. Lose final Heart (1 -> 0 Hearts) -> Town Breached sets Queen to 'distressed'
    engine.triggerIronDeflectionTest('single');
    expect(engine.getState().hearts).toBe(0);
    expect(engine.getState().status).toBe('town_breached');
    expect(engine.getState().queenMood).toBe('distressed');

    // 7. Step 95 frames to complete stage reset -> back to 4 Hearts and 'watching'
    engine.stepFrames(95);
    expect(engine.getState().status).toBe('playing');
    expect(engine.getState().hearts).toBe(4);
    expect(engine.getState().queenMood).toBe('watching');

    // 8. Clear Stage -> Queen enters 'cheering'
    engine.clearCurrentStage(false);
    expect(engine.getState().status).toBe('stage_clear');
    expect(engine.getState().queenMood).toBe('cheering');
  });
});

describe('Challenger M3-1 — 5. 5-Heart Flawless Cap, Ammo Fallback & localStorage Persistence', () => {
  it('caps Hearts at 5 across consecutive flawless stage clears (4 -> 5 -> 5) and withholds bonus heart on non-flawless clear', () => {
    const storage = new AdversarialMockStorage();
    const engine = new GameEngine({ storage, initialStage: 1 });

    expect(engine.getState().hearts).toBe(4);
    expect(engine.getState().maxHearts).toBe(5);
    expect(engine.getState().flawlessStage).toBe(true);

    // Flawless clear of Stage 1 -> 4 -> 5 Hearts
    engine.clearCurrentStage(false);
    expect(engine.getState().hearts).toBe(5);
    expect(engine.getState().lostHearts).toBe(0);

    // Advance to Stage 2 -> preserves 5 Hearts
    engine.advanceToNextStage();
    expect(engine.getState().stage).toBe(2);
    expect(engine.getState().hearts).toBe(5);

    // Flawless clear of Stage 2 -> stays capped at 5 Hearts (never 6!)
    engine.clearCurrentStage(false);
    expect(engine.getState().hearts).toBe(5);
    expect(engine.getState().maxHearts).toBe(5);

    // Advance to Stage 3, take 2 damage (5 -> 3 Hearts, flawlessStage = false), then clear Stage 3
    engine.advanceToNextStage();
    expect(engine.getState().stage).toBe(3);
    engine.triggerIronDeflectionTest('single');
    engine.stepFrames(15);
    engine.triggerIronDeflectionTest('single');
    engine.stepFrames(15);
    expect(engine.getState().hearts).toBe(3);
    expect(engine.getState().flawlessStage).toBe(false);

    // Clearing Stage 3 non-flawlessly must NOT award a bonus heart on clear
    engine.clearCurrentStage(false);
    expect(engine.getState().hearts).toBe(3);

    // Advancing to Stage 4 restores baseline 4 Hearts
    engine.advanceToNextStage();
    expect(engine.getState().stage).toBe(4);
    expect(engine.getState().hearts).toBe(4);
  });

  it('automatically falls back to Single Arrow when Double Shot or Great Arrow ammo is depleted, and respects pause state', () => {
    const engine = new GameEngine({ storage: new AdversarialMockStorage(), initialStage: 2 });

    // Exhaust all Heavy ammo
    engine.selectWeapon('heavy');
    const heavyCount = engine.getState().heavyAmmo;
    for (let i = 0; i < heavyCount; i++) {
      const fired = engine.fireWeapon();
      expect(fired[0].weaponType).toBe('heavy');
    }
    expect(engine.getState().heavyAmmo).toBe(0);

    // Next fireWeapon() without override must auto-switch to 'single' and fire a single arrow
    const fallbackShot = engine.fireWeapon();
    expect(fallbackShot.length).toBe(1);
    expect(fallbackShot[0].weaponType).toBe('single');
    expect(engine.getState().activeWeapon).toBe('single');

    // Pausing prevents firing and stepping physics
    engine.setPaused(true);
    expect(engine.getState().status).toBe('paused');
    const pausedFire = engine.fireWeapon();
    expect(pausedFire.length).toBe(0);
    const timeBefore = engine.getState().stageTime;
    engine.stepFrames(30);
    expect(engine.getState().stageTime).toBe(timeBefore);
    engine.setPaused(false);
    expect(engine.getState().status).toBe('playing');
  });

  it('persists highScore and unlockedStage to localStorage, handles corrupted JSON gracefully, and supports resetSave()', () => {
    const storage = new AdversarialMockStorage();
    storage.setItem(SAVE_STORAGE_KEY, '{corrupted_json_payload');

    // Engine must recover cleanly from corrupted localStorage
    const engine = new GameEngine({ storage, initialStage: 5 });
    expect(engine.getState().highScore).toBe(0);
    expect(engine.getState().unlockedStage).toBe(1);

    // Clear Stage 5 -> unlocks Stage 6 and saves highScore
    engine.clearCurrentStage(false);
    const scoreAfterClear = engine.getState().score;
    expect(scoreAfterClear).toBeGreaterThan(0);
    expect(engine.getState().unlockedStage).toBe(6);

    // Boot a second engine instance reading from the same storage -> restores highScore and unlockedStage
    const engine2 = new GameEngine({ storage, initialStage: 1 });
    expect(engine2.getState().highScore).toBe(scoreAfterClear);
    expect(engine2.getState().unlockedStage).toBe(6);

    // resetSave() wipes highScore to 0 and unlockedStage to 1 both in state and storage
    engine2.resetSave();
    expect(engine2.getState().highScore).toBe(0);
    expect(engine2.getState().unlockedStage).toBe(1);
    const afterResetRaw = JSON.parse(storage.getItem(SAVE_STORAGE_KEY)!);
    expect(afterResetRaw.highScore).toBe(0);
    expect(afterResetRaw.unlockedStage).toBe(1);
  });
});

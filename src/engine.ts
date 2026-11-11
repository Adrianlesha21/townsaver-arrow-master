/**
 * Townsaver: The Arrow Master — Deterministic 60 FPS 2D Tactical & Story GameEngine (v2.0)
 *
 * Implements:
 * - Full 8-Way / 2D Free-Roam Movement (`WASD` / `Arrows`) with sliding AABB obstacle collision
 * - 8-Way Directional & 360° Mouse-Cursor Hybrid Aiming across all 3 Weapons (Single, Double, Great Arrow)
 * - Destructible Wood Palisade Gates (walkable once shattered!) & Loot-Dropping Siege Crates
 * - Active Enemy AI: Goblin Dagger & Fireball throws (blocked by Iron Blocks / Palisades or parried mid-air!)
 *   + Swooping Purple Winged Bats + Floor Spike Traps
 * - Signature Shot-Discipline Hazards: Fail Condition 1 (Blue-Iron Deflection) & Fail Condition 2 (Arrow Clip)
 * - Top Royal Sanctum Portcullis Unlock & Physical Walk-Up Rescue of Queen Aurelia at the top of each stage
 * - 3-Slide Opening Story Prologue + 15 Handcrafted Per-Stage Story Briefings & Reunion Dialogues
 */

import { SoundSystem } from './audio';
import { getTerrainPaletteName } from './sprites';
import { PROLOGUE_SLIDES, getStageConfig, getStoryChapter } from './stages';
import {
  ADRIAN_SANCTUARY_X,
  ADRIAN_SANCTUARY_Y,
  ARROW_SPAWN_Y,
  ArrowEntity,
  COLUMNS,
  CardinalDirection,
  EnemyProjectile,
  FacingDirection,
  FailReason,
  GameState,
  GameStatus,
  HazardBlock,
  ImpactBurst,
  LOGICAL_HEIGHT,
  LOGICAL_WIDTH,
  PLAYFIELD_TOP_Y,
  ParticleEntity,
  PickupItem,
  PickupKind,
  QUEEN_TOP_SANCTUM_X,
  QUEEN_TOP_SANCTUM_Y,
  QueenMood,
  StageConfig,
  TargetEntity,
  TOP_SANCTUM_GATE_Y,
  TownsaverSaveData,
  WeaponType,
} from './types';

export { LOGICAL_WIDTH, LOGICAL_HEIGHT, COLUMNS, ARROW_SPAWN_Y };
export const ADRIAN_Y = ADRIAN_SANCTUARY_Y;
export const QUEEN_X = QUEEN_TOP_SANCTUM_X;
export const QUEEN_Y = QUEEN_TOP_SANCTUM_Y;
export const TOP_CEILING_Y = PLAYFIELD_TOP_Y;
export const FIXED_DT = 1 / 60;
export const SAVE_STORAGE_KEY = 'townsaver_save_v1';

export const SINGLE_ARROW_SPEED = -260;
export const PALISADE_SLOWED_SPEED = -115;
export const GREAT_ARROW_SPEED = -300;
export const ADRIAN_MOVE_SPEED = 98;
export const ADRIAN_STEP_SPEED = 360;
export const HIT_STOP_DURATION = 0.18; // 180ms
export const ADRIAN_INVULN_DURATION = 1.0; // 1.0s mercy invulnerability after enemy/spike hit

export interface GameEngineOptions {
  sound?: SoundSystem;
  storage?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | null;
  initialStage?: number;
  startStatus?: GameStatus;
  storyMode?: boolean;
}

export interface LoadStageOptions {
  preserveScore?: boolean;
  preserveHearts?: boolean;
  preserveBonusAmmo?: boolean;
  status?: GameStatus;
  showBriefing?: boolean;
}

export class GameEngine {
  private sound: SoundSystem | null;
  private storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | null;
  private fallbackStore = new Map<string, string>();
  private nextEntityId = 1;
  private nextVolleyId = 1;
  private penalizedVolleyIds = new Set<number>();
  private storyModeEnabled: boolean;
  private moveInputX = 0;
  private moveInputY = 0;
  private preferredCardinal: CardinalDirection | null = null;
  private autoStepActive = false;

  private state: GameState;

  constructor(optionsOrSound: GameEngineOptions | SoundSystem = {}) {
    const options: GameEngineOptions =
      optionsOrSound instanceof SoundSystem
        ? { sound: optionsOrSound }
        : optionsOrSound;

    this.sound = options.sound ?? null;
    this.storage =
      options.storage !== undefined
        ? options.storage
        : typeof window !== 'undefined' && window.localStorage
        ? window.localStorage
        : null;
    this.storyModeEnabled = Boolean(options.storyMode);

    const saved = this.loadSaveData();
    const initialStage = options.initialStage ?? 1;
    const initialPalette = getTerrainPaletteName(initialStage);
    const initialStory = getStoryChapter(initialStage);

    const defaultStartStatus: GameStatus =
      options.startStatus ??
      (this.storyModeEnabled ? (saved.seenPrologue ? 'briefing' : 'prologue') : 'playing');

    this.state = {
      status: defaultStartStatus,
      stage: initialStage,
      stageNumber: initialStage,
      stageName: 'MEADOW GATEWAY',
      stageSubtitle: 'BREACH THE OUTER GATE & REACH THE QUEEN',
      palette: initialPalette,
      terrainPalette: initialPalette,
      columns: [...COLUMNS],
      currentColumnIndex: 0,
      adrianCol: 0,
      adrianX: this.storyModeEnabled ? ADRIAN_SANCTUARY_X : COLUMNS[0],
      adrianY: ADRIAN_Y,
      adrianVx: 0,
      adrianVy: 0,
      targetAdrianX: this.storyModeEnabled ? ADRIAN_SANCTUARY_X : COLUMNS[0],
      targetAdrianY: ADRIAN_Y,
      adrianFacingAngle: -Math.PI / 2,
      adrianFacingDir: 'up',
      adrianWalkTick: 0,
      adrianInvulnTimer: 0,
      aimCursorX: null,
      aimCursorY: null,
      useMouseAim: false,
      adrianFrame: 'idle1',
      muzzleFlashTimer: 0,
      muzzleFlashWeapon: 'none',
      activeWeapon: 'single',
      doubleAmmo: 5,
      heavyAmmo: 2,
      hearts: 4,
      maxHearts: 5,
      lostHearts: 1,
      queenMood: 'watching',
      queenMoodTimer: 0,
      sanctum: {
        x: QUEEN_TOP_SANCTUM_X,
        y: QUEEN_TOP_SANCTUM_Y,
        queenX: QUEEN_TOP_SANCTUM_X,
        queenY: QUEEN_TOP_SANCTUM_Y,
        gateY: TOP_SANCTUM_GATE_Y,
        gateWidth: 64,
        unlocked: false,
        rescued: false,
        portcullisProgress: 0,
      },
      story: initialStory,
      prologueIndex: 0,
      seenPrologue: Boolean(saved.seenPrologue),
      remainingRaiders: 0,
      score: 0,
      highScore: saved.highScore,
      unlockedStage: saved.unlockedStage,
      arrows: [],
      enemyProjectiles: [],
      pickups: [],
      targets: [],
      hazards: [],
      particles: [],
      bursts: [],
      hitStopTimer: 0,
      screenShakeTimer: 0,
      screenShakeOffsetX: 0,
      screenShakeOffsetY: 0,
      heartFlashTimer: 0,
      statusBanner: null,
      bannerTimer: 0,
      queenCalloutText: null,
      queenCalloutTimer: 0,
      lastFailReason: 'none',
      stageClearTimer: 0,
      breachResetTimer: 0,
      flawlessStage: true,
      columnsClearedInStage: 0,
      totalColumnsCleared: 0,
      frameCount: 0,
      stageTime: 0,
      elapsedTime: 0,
    };

    this.loadStage(initialStage, { status: defaultStartStatus });
  }

  // ==========================================================================
  // 1. LOCALSTORAGE PERSISTENCE ('townsaver_save_v1')
  // ==========================================================================

  public loadSaveData(): TownsaverSaveData {
    try {
      const raw = this.storage
        ? this.storage.getItem(SAVE_STORAGE_KEY)
        : this.fallbackStore.get(SAVE_STORAGE_KEY) ?? null;
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<TownsaverSaveData>;
        const highScore =
          typeof parsed.highScore === 'number' && Number.isFinite(parsed.highScore)
            ? Math.max(0, Math.floor(parsed.highScore))
            : 0;
        const unlockedStage =
          typeof parsed.unlockedStage === 'number' && Number.isFinite(parsed.unlockedStage)
            ? Math.max(1, Math.min(16, Math.floor(parsed.unlockedStage)))
            : 1;
        const seenPrologue = Boolean(parsed.seenPrologue);
        return { highScore, unlockedStage, seenPrologue };
      }
    } catch {
      // Ignore malformed JSON or storage permission errors
    }
    return { highScore: 0, unlockedStage: 1, seenPrologue: false };
  }

  public saveProgress(): void {
    const payload: TownsaverSaveData = {
      highScore: Math.max(0, Math.floor(this.state.highScore)),
      unlockedStage: Math.max(1, Math.min(16, Math.floor(this.state.unlockedStage))),
      seenPrologue: this.state.seenPrologue,
    };
    const serialized = JSON.stringify(payload);
    this.fallbackStore.set(SAVE_STORAGE_KEY, serialized);
    if (this.storage) {
      try {
        this.storage.setItem(SAVE_STORAGE_KEY, serialized);
      } catch {
        // Ignore quota/security exceptions
      }
    }
  }

  public resetSave(): GameState {
    this.state.highScore = 0;
    this.state.unlockedStage = 1;
    this.state.seenPrologue = false;
    this.fallbackStore.delete(SAVE_STORAGE_KEY);
    if (this.storage) {
      try {
        this.storage.removeItem(SAVE_STORAGE_KEY);
      } catch {
        // Ignore
      }
    }
    this.saveProgress();
    return this.getState();
  }

  // ==========================================================================
  // 2. STAGE LOADING, STORY CAMPAIGN & INITIALIZATION
  // ==========================================================================

  public loadStage(stageNumber: number, options: LoadStageOptions = {}): GameState {
    const clampedStage = Math.max(1, Math.floor(stageNumber));
    const config: StageConfig = getStageConfig(clampedStage);
    const story = config.story ?? getStoryChapter(clampedStage);

    this.penalizedVolleyIds.clear();
    this.autoStepActive = false;
    this.moveInputX = 0;
    this.moveInputY = 0;
    this.preferredCardinal = null;

    const targets: TargetEntity[] = config.targets.map((t, idx) => {
      const kind = t.kind ?? t.type ?? 'goblin_torch';
      const colIdx = Math.max(0, Math.min(3, t.columnIndex ?? Math.floor(t.x / 60)));
      const colCenter = COLUMNS[colIdx];
      return {
        ...t,
        id: t.id ?? `target_${clampedStage}_${idx}_${this.nextEntityId++}`,
        kind,
        type: kind,
        columnIndex: colIdx,
        x: t.x ?? colCenter,
        y: t.y,
        baseY: t.baseY ?? t.y,
        width:
          t.width ??
          (kind === 'palisade'
            ? 24
            : kind === 'goblin_torch' || kind === 'goblin_dagger'
            ? 18
            : 20),
        height:
          t.height ??
          (kind === 'bat'
            ? 14
            : kind === 'goblin_torch' || kind === 'goblin_dagger'
            ? 20
            : 18),
        hp: t.hp,
        maxHp: t.maxHp ?? t.hp,
        patrolMinX: t.patrolMinX ?? colCenter - 12,
        patrolMaxX: t.patrolMaxX ?? colCenter + 12,
        vx: t.vx ?? 0,
        attackInterval:
          t.attackInterval ??
          (kind === 'goblin_dagger' ? 2.5 : kind === 'goblin_torch' ? 2.9 : 0),
        attackCooldown: t.attackCooldown ?? 1.2 + (idx % 4) * 0.45,
        dropKind: t.dropKind,
        swoopPhase: t.swoopPhase ?? idx * 0.9,
        staggerTimer: t.staggerTimer ?? 0,
        flashTimer: 0,
        broken: Boolean(t.broken) || t.hp <= 0,
        lodgedArrows: Array.isArray(t.lodgedArrows)
          ? t.lodgedArrows.map((la) => ({ ...la }))
          : [],
        points:
          t.points ??
          (kind === 'goblin_torch' || kind === 'goblin_dagger'
            ? 120
            : kind === 'crate'
            ? 85
            : kind === 'bat'
            ? 60
            : 40),
        requiredForClear: t.requiredForClear ?? (kind !== 'palisade' && kind !== 'crate'),
        active: t.hp > 0 || kind === 'palisade',
      };
    });

    const hazards: HazardBlock[] = config.hazards.map((h, idx) => {
      const kind = h.kind ?? h.type ?? 'iron_block';
      const colIdx = Math.max(0, Math.min(3, h.columnIndex ?? Math.floor(h.x / 60)));
      const colCenter = COLUMNS[colIdx];
      return {
        ...h,
        id: h.id ?? `hazard_${clampedStage}_${idx}_${this.nextEntityId++}`,
        kind,
        type: kind,
        columnIndex: colIdx,
        x: h.x ?? colCenter,
        y: h.y,
        baseX: h.baseX ?? h.x ?? colCenter,
        width:
          h.width ??
          (kind === 'rotating_shield' ? 28 : kind === 'floor_spike' ? 24 : 20),
        height:
          h.height ??
          (kind === 'rotating_shield' ? 28 : kind === 'floor_spike' ? 10 : 18),
        radius: h.radius ?? (kind === 'rotating_shield' ? 14 : 0),
        angle: h.angle ?? 0,
        angularSpeed: h.angularSpeed ?? (kind === 'rotating_shield' ? 1.8 : 0),
        oscillateAmplitude: h.oscillateAmplitude ?? 0,
        oscillateSpeed: h.oscillateSpeed ?? 0,
        oscillatePhase: h.oscillatePhase ?? 0,
        segments: h.segments ? h.segments.map((s) => ({ ...s })) : [],
        lodgedArrows: Array.isArray(h.lodgedArrows)
          ? h.lodgedArrows.map((la) => ({ ...la }))
          : [],
        sparkTimer: 0,
        flashTimer: 0,
        frame: 0,
      };
    });

    const firstActiveCol = this.findFirstColumnWithRequiredTargets(targets);
    const pal = config.palette ?? getTerrainPaletteName(clampedStage);
    const startX = this.storyModeEnabled
      ? config.spawnX ?? ADRIAN_SANCTUARY_X
      : COLUMNS[firstActiveCol];
    const startY = config.spawnY ?? ADRIAN_Y;

    this.state.stage = clampedStage;
    this.state.stageNumber = clampedStage;
    this.state.stageName = config.name;
    this.state.stageSubtitle = config.subtitle ?? '';
    this.state.palette = pal;
    this.state.terrainPalette = pal;
    this.state.columns = [...config.columns];
    this.state.currentColumnIndex = firstActiveCol;
    this.state.adrianCol = Math.max(0, Math.min(3, Math.floor(startX / 60)));
    this.state.adrianX = startX;
    this.state.adrianY = startY;
    this.state.adrianVx = 0;
    this.state.adrianVy = 0;
    this.state.targetAdrianX = startX;
    this.state.targetAdrianY = startY;
    this.state.adrianFacingAngle = -Math.PI / 2;
    this.state.adrianFacingDir = 'up';
    this.state.adrianWalkTick = 0;
    this.state.adrianInvulnTimer = 0;
    this.state.adrianFrame = 'idle1';
    this.state.muzzleFlashTimer = 0;
    this.state.muzzleFlashWeapon = 'none';
    this.state.story = story;

    const reqCount = targets.filter((t) => t.active && t.requiredForClear && t.hp > 0).length;
    this.state.remainingRaiders = reqCount;
    this.state.sanctum = {
      x: QUEEN_TOP_SANCTUM_X,
      y: QUEEN_TOP_SANCTUM_Y,
      queenX: QUEEN_TOP_SANCTUM_X,
      queenY: QUEEN_TOP_SANCTUM_Y,
      gateY: TOP_SANCTUM_GATE_Y,
      gateWidth: 64,
      unlocked: reqCount === 0,
      rescued: false,
      portcullisProgress: reqCount === 0 ? 1 : 0,
    };

    if (!options.preserveScore && clampedStage === 1) {
      this.state.score = 0;
    }

    this.state.maxHearts = 5;
    this.state.hearts = options.preserveHearts
      ? Math.max(4, Math.min(this.state.maxHearts, this.state.hearts))
      : 4;
    this.state.lostHearts = Math.max(0, this.state.maxHearts - this.state.hearts);
    this.state.queenMood = this.state.hearts === 1 ? 'praying' : 'watching';
    this.state.queenMoodTimer = 0;

    this.state.doubleAmmo = options.preserveBonusAmmo
      ? Math.max(config.startingDoubleAmmo, this.state.doubleAmmo)
      : config.startingDoubleAmmo;
    this.state.heavyAmmo = options.preserveBonusAmmo
      ? Math.max(config.startingHeavyAmmo, this.state.heavyAmmo)
      : config.startingHeavyAmmo;

    if (this.state.activeWeapon === 'double' && this.state.doubleAmmo <= 0) {
      this.state.activeWeapon = 'single';
    } else if (this.state.activeWeapon === 'heavy' && this.state.heavyAmmo <= 0) {
      this.state.activeWeapon = 'single';
    }

    this.state.arrows = [];
    this.state.enemyProjectiles = [];
    this.state.pickups = config.pickups ? config.pickups.map((p) => ({ ...p })) : [];
    this.state.targets = targets;
    this.state.hazards = hazards;
    this.state.particles = [];
    this.state.bursts = [];
    this.state.stageTime = 0;
    this.state.elapsedTime = 0;
    this.state.hitStopTimer = 0;
    this.state.screenShakeTimer = 0;
    this.state.screenShakeOffsetX = 0;
    this.state.screenShakeOffsetY = 0;
    this.state.heartFlashTimer = 0;
    this.state.statusBanner = null;
    this.state.bannerTimer = 0;
    this.state.useMouseAim = false;
    this.state.aimCursorX = null;
    this.state.aimCursorY = null;
    this.state.stageClearTimer = 0;
    this.state.breachResetTimer = 0;
    this.state.lastFailReason = 'none';
    this.state.flawlessStage = true;
    this.state.columnsClearedInStage = 0;

    if (options.status) {
      this.state.status = options.status;
    } else if (options.showBriefing) {
      this.state.status = 'briefing';
    } else {
      this.state.status = 'playing';
    }

    if (this.state.status === 'playing' && this.storyModeEnabled) {
      this.state.queenCalloutText =
        story.queenCastleCallout ?? '"Adrian! Over here—strike down the guards!"';
      this.state.queenCalloutTimer = 4.2;
    } else {
      this.state.queenCalloutText = null;
      this.state.queenCalloutTimer = 0;
    }

    return this.getState();
  }

  public openPrologue(): GameState {
    this.state.prologueIndex = 0;
    this.state.status = 'prologue';
    this.sound?.playStoryAdvance();
    return this.getState();
  }

  public openBriefing(): GameState {
    this.state.status = 'briefing';
    this.sound?.playStoryAdvance();
    return this.getState();
  }

  /**
   * Advances Prologue slides -> Stage Mission Briefing -> Live Gameplay,
   * or advances Stage Clear / Campaign Victory into the next stage!
   */
  public advanceStory(): GameState {
    if (this.state.status === 'prologue') {
      this.sound?.playStoryAdvance();
      if (this.state.prologueIndex + 1 < PROLOGUE_SLIDES.length) {
        this.state.prologueIndex += 1;
      } else {
        this.state.seenPrologue = true;
        this.saveProgress();
        this.state.status = 'briefing';
      }
      return this.getState();
    }

    if (this.state.status === 'briefing' || this.state.status === 'title') {
      this.sound?.playStoryAdvance();
      this.state.status = 'playing';
      if (this.storyModeEnabled) {
        this.state.queenCalloutText =
          this.state.story.queenCastleCallout ?? '"Adrian! Over here—strike down the guards!"';
        this.state.queenCalloutTimer = 4.2;
      }
      return this.getState();
    }

    if (this.state.status === 'stage_clear' || this.state.status === 'victory_campaign') {
      this.sound?.playStoryAdvance();
      return this.advanceToNextStage(this.storyModeEnabled);
    }

    return this.getState();
  }

  public startGame(): GameState {
    const wasNonPlaying = this.state.status !== 'playing' && this.state.status !== 'paused';
    if (
      this.state.status === 'title' ||
      this.state.status === 'paused' ||
      this.state.status === 'prologue' ||
      this.state.status === 'briefing'
    ) {
      this.state.status = 'playing';
      if (wasNonPlaying && this.storyModeEnabled) {
        this.state.queenCalloutText =
          this.state.story.queenCastleCallout ?? '"Adrian! Over here—strike down the guards!"';
        this.state.queenCalloutTimer = 4.2;
      }
    }
    return this.getState();
  }

  public restartStage(): GameState {
    return this.loadStage(this.state.stage, {
      preserveScore: false,
      preserveHearts: false,
      preserveBonusAmmo: false,
      status: 'playing',
    });
  }

  public advanceToNextStage(showBriefing = false): GameState {
    const nextStage = this.state.stage + 1;
    return this.loadStage(nextStage, {
      preserveScore: true,
      preserveHearts: true,
      preserveBonusAmmo: true,
      status: showBriefing ? 'briefing' : 'playing',
    });
  }

  // ==========================================================================
  // 3. 8-WAY FREE-ROAM MOVEMENT + CLEAN 4-WAY CARDINAL AIMING (UP/DOWN/LEFT/RIGHT)
  // ==========================================================================

  public static cardinalToAngle(dir: CardinalDirection): number {
    switch (dir) {
      case 'up':
        return -Math.PI / 2;
      case 'down':
        return Math.PI / 2;
      case 'left':
        return Math.PI;
      case 'right':
        return 0;
    }
  }

  public static snapToCardinal(
    dx: number,
    dy: number,
    fallback: CardinalDirection = 'up'
  ): CardinalDirection {
    if (dx === 0 && dy === 0) return fallback;
    if (Math.abs(dy) >= Math.abs(dx)) {
      return dy < 0 ? 'up' : 'down';
    }
    return dx < 0 ? 'left' : 'right';
  }

  public static currentCardinalFromFacing(dir: FacingDirection): CardinalDirection {
    if (dir === 'up' || dir === 'down' || dir === 'left' || dir === 'right') {
      return dir;
    }
    if (dir === 'up-left' || dir === 'up-right') return 'up';
    return 'down';
  }

  public setCardinalAim(dir: CardinalDirection): void {
    this.preferredCardinal = dir;
    this.state.useMouseAim = false;
    this.state.aimCursorX = null;
    this.state.aimCursorY = null;
    this.state.adrianFacingDir = dir;
    this.state.adrianFacingAngle = GameEngine.cardinalToAngle(dir);
  }

  public setMoveInput(
    dx: number,
    dy: number,
    preferredCardinal?: CardinalDirection | null
  ): void {
    this.moveInputX = Math.max(-1, Math.min(1, dx));
    this.moveInputY = Math.max(-1, Math.min(1, dy));
    if (preferredCardinal) {
      this.preferredCardinal = preferredCardinal;
    } else if (this.moveInputX === 0 && this.moveInputY === 0) {
      this.preferredCardinal = null;
    }

    if (this.moveInputX !== 0 || this.moveInputY !== 0) {
      this.autoStepActive = false;
      const curCard = GameEngine.currentCardinalFromFacing(this.state.adrianFacingDir);
      const nextCard =
        preferredCardinal ?? GameEngine.snapToCardinal(this.moveInputX, this.moveInputY, curCard);
      this.setCardinalAim(nextCard);
    }
  }

  public setAimDirection(dx: number, dy: number): void {
    if (dx === 0 && dy === 0) return;
    const curCard = GameEngine.currentCardinalFromFacing(this.state.adrianFacingDir);
    const nextCard = GameEngine.snapToCardinal(dx, dy, curCard);
    this.setCardinalAim(nextCard);
  }

  public setAimCursor(cursorX: number, cursorY: number): void {
    // 360° mouse aiming removed per v2.1 design; snaps cleanly to nearest 4-way cardinal
    const dx = cursorX - this.state.adrianX;
    const dy = cursorY - this.state.adrianY;
    if (Math.hypot(dx, dy) > 2) {
      const curCard = GameEngine.currentCardinalFromFacing(this.state.adrianFacingDir);
      this.setCardinalAim(GameEngine.snapToCardinal(dx, dy, curCard));
    }
  }

  public setPosition(x: number, y: number): GameState {
    this.autoStepActive = false;
    this.state.adrianX = Math.max(14, Math.min(LOGICAL_WIDTH - 14, x));
    this.state.adrianY = Math.max(32, Math.min(292, y));
    this.state.targetAdrianX = this.state.adrianX;
    this.state.targetAdrianY = this.state.adrianY;
    this.state.adrianCol = Math.max(0, Math.min(3, Math.floor(this.state.adrianX / 60)));
    this.state.currentColumnIndex = this.state.adrianCol;
    return this.getState();
  }

  /**
   * Moves Adrian along a 2D input vector (dx, dy) with sliding X/Y obstacle collision
   * while snapping his bow aim cleanly to the 4 cardinal directions (Up, Down, Left, Right).
   */
  public moveAdrian(
    dx: number,
    dy: number,
    dtSeconds: number = FIXED_DT,
    preservePreferredCardinal = false
  ): GameState {
    if (dx === 0 && dy === 0) {
      this.state.adrianVx = 0;
      this.state.adrianVy = 0;
      return this.getState();
    }

    const len = Math.hypot(dx, dy);
    const nx = dx / len;
    const ny = dy / len;
    const stepSpeed = ADRIAN_MOVE_SPEED;
    const vx = nx * stepSpeed;
    const vy = ny * stepSpeed;

    this.state.adrianVx = vx;
    this.state.adrianVy = vy;
    this.state.adrianWalkTick += dtSeconds;

    const curCard = GameEngine.currentCardinalFromFacing(this.state.adrianFacingDir);
    const nextCard =
      preservePreferredCardinal && this.preferredCardinal
        ? this.preferredCardinal
        : GameEngine.snapToCardinal(dx, dy, curCard);
    this.state.useMouseAim = false;
    this.state.aimCursorX = null;
    this.state.aimCursorY = null;
    this.state.adrianFacingDir = nextCard;
    this.state.adrianFacingAngle = GameEngine.cardinalToAngle(nextCard);

    // Sliding collision: resolve X first, then Y independently
    const candidateX = Math.max(14, Math.min(LOGICAL_WIDTH - 14, this.state.adrianX + vx * dtSeconds));
    if (!this.isSolidForAdrian(candidateX, this.state.adrianY)) {
      this.state.adrianX = candidateX;
    }

    const minY = this.state.sanctum.unlocked ? 34 : TOP_SANCTUM_GATE_Y + 8;
    const candidateY = Math.max(minY, Math.min(292, this.state.adrianY + vy * dtSeconds));
    if (!this.isSolidForAdrian(this.state.adrianX, candidateY)) {
      this.state.adrianY = candidateY;
    }

    this.state.targetAdrianX = this.state.adrianX;
    this.state.targetAdrianY = this.state.adrianY;
    this.state.adrianCol = Math.max(0, Math.min(3, Math.floor(this.state.adrianX / 60)));
    this.state.currentColumnIndex = this.state.adrianCol;

    // Check Top Sanctum Queen Rescue upon walking up to Queen Aurelia!
    this.checkSanctumRescue();

    return this.getState();
  }

  private isSolidForAdrian(x: number, y: number): boolean {
    const adrianHalfW = 6;
    const adrianHalfH = 7;

    // 1. Top castle bastion walls flanking the Sanctum Alcove (x < 88 or x > 152 above y = 56)
    if (y - adrianHalfH < 48 && (x - adrianHalfW < 88 || x + adrianHalfW > 152)) {
      return true;
    }

    // 2. Locked Sanctum Portcullis Gate (blocks y < 62 in central alcove until Raiders are defeated)
    if (!this.state.sanctum.unlocked && y - adrianHalfH < TOP_SANCTUM_GATE_Y + 2) {
      if (x + adrianHalfW > 84 && x - adrianHalfW < 156) {
        return true;
      }
    }

    // 3. Solid Blue-Iron Blocks & Rotating Shield central hubs
    for (const h of this.state.hazards) {
      if (h.kind === 'iron_block') {
        const hw = (h.width || 20) / 2;
        const hh = (h.height || 18) / 2;
        if (Math.abs(x - h.x) < hw + adrianHalfW && Math.abs(y - h.y) < hh + adrianHalfH) {
          return true;
        }
      } else if (h.kind === 'rotating_shield') {
        if (Math.hypot(x - h.x, y - h.y) < 11 + adrianHalfW) {
          return true;
        }
      }
    }

    // 4. Intact Wood Palisades & Intact Siege Crates (shattered palisades & broken crates allow passage!)
    for (const t of this.state.targets) {
      if (t.kind === 'palisade') {
        if (t.broken || t.hp <= 0) continue;
        const tw = (t.width || 24) / 2;
        const th = (t.height || 18) / 2;
        if (Math.abs(x - t.x) < tw + adrianHalfW && Math.abs(y - t.y) < th + adrianHalfH) {
          return true;
        }
      } else if (t.kind === 'crate') {
        if (!t.active || t.broken || t.hp <= 0) continue;
        const tw = (t.width || 20) / 2;
        const th = (t.height || 18) / 2;
        if (Math.abs(x - t.x) < tw + adrianHalfW && Math.abs(y - t.y) < th + adrianHalfH) {
          return true;
        }
      }
    }

    return false;
  }

  public static angleToFacingDir(angle: number): FacingDirection {
    const deg = (((angle * 180) / Math.PI) % 360 + 360) % 360;
    if (deg >= 337.5 || deg < 22.5) return 'right';
    if (deg >= 22.5 && deg < 67.5) return 'down-right';
    if (deg >= 67.5 && deg < 112.5) return 'down';
    if (deg >= 112.5 && deg < 157.5) return 'down-left';
    if (deg >= 157.5 && deg < 202.5) return 'left';
    if (deg >= 202.5 && deg < 247.5) return 'up-left';
    if (deg >= 247.5 && deg < 292.5) return 'up';
    return 'up-right';
  }

  // ==========================================================================
  // 4. WEAPON SELECTION & DIRECTIONAL / 360° FIRING
  // ==========================================================================

  public selectWeapon(weapon: WeaponType): void {
    this.state.activeWeapon = weapon;
  }

  public cycleWeapon(): WeaponType {
    const order: WeaponType[] = ['single', 'double', 'heavy'];
    const idx = order.indexOf(this.state.activeWeapon);
    const next = order[(idx + 1) % order.length];
    this.state.activeWeapon = next;
    return next;
  }

  public setColumn(columnIndex: number): void {
    const clamped = Math.max(0, Math.min(3, Math.floor(columnIndex)));
    this.autoStepActive = false;
    this.state.currentColumnIndex = clamped;
    this.state.adrianCol = clamped;
    this.state.adrianX = COLUMNS[clamped];
    this.state.adrianY = ADRIAN_Y;
    this.state.targetAdrianX = COLUMNS[clamped];
    this.state.targetAdrianY = ADRIAN_Y;
    this.state.adrianFacingAngle = -Math.PI / 2;
    this.state.adrianFacingDir = 'up';
  }

  public setAdrianColumn(columnIndex: number): void {
    this.setColumn(columnIndex);
  }

  public fire(
    weaponOverride?: WeaponType,
    columnIndex?: number,
    aimAngleOverride?: number
  ): ArrowEntity[] {
    return this.fireWeapon(weaponOverride, columnIndex, aimAngleOverride);
  }

  public fireWeapon(
    weaponOverride?: WeaponType,
    columnIndex?: number,
    aimAngleOverride?: number
  ): ArrowEntity[] {
    if (
      this.state.status === 'prologue' ||
      this.state.status === 'briefing' ||
      this.state.status === 'title'
    ) {
      this.advanceStory();
      if (columnIndex === undefined && aimAngleOverride === undefined) {
        return [];
      }
    } else if (
      this.state.status === 'stage_clear' ||
      this.state.status === 'victory_campaign'
    ) {
      this.advanceToNextStage(this.storyModeEnabled);
      return [];
    } else if (this.state.status === 'town_breached') {
      this.restartStage();
      return [];
    } else if (this.state.status === 'paused') {
      return [];
    }

    const explicitColMode = columnIndex !== undefined;
    if (explicitColMode) {
      this.setColumn(columnIndex);
    }

    let weapon: WeaponType = weaponOverride ?? this.state.activeWeapon;

    // Enforce special quiver ammo consumption (fallback to 'single' if empty unless explicitly overridden)
    if (weapon === 'double') {
      if (this.state.doubleAmmo > 0) {
        this.state.doubleAmmo -= 1;
      } else if (!weaponOverride) {
        weapon = 'single';
        this.state.activeWeapon = 'single';
      }
    } else if (weapon === 'heavy') {
      if (this.state.heavyAmmo > 0) {
        this.state.heavyAmmo -= 1;
      } else if (!weaponOverride) {
        weapon = 'single';
        this.state.activeWeapon = 'single';
      }
    }

    // Refresh mouse cursor angle if aiming with mouse
    if (
      !explicitColMode &&
      aimAngleOverride === undefined &&
      this.state.useMouseAim &&
      this.state.aimCursorX !== null &&
      this.state.aimCursorY !== null
    ) {
      const cdx = this.state.aimCursorX - this.state.adrianX;
      const cdy = this.state.aimCursorY - this.state.adrianY;
      if (Math.hypot(cdx, cdy) > 2) {
        this.state.adrianFacingAngle = Math.atan2(cdy, cdx);
        this.state.adrianFacingDir = GameEngine.angleToFacingDir(this.state.adrianFacingAngle);
      }
    }

    const aimAngle = explicitColMode
      ? -Math.PI / 2
      : aimAngleOverride ?? this.state.adrianFacingAngle ?? -Math.PI / 2;

    this.state.adrianFacingAngle = aimAngle;
    this.state.adrianFacingDir = GameEngine.angleToFacingDir(aimAngle);

    const cosA = Math.cos(aimAngle);
    const sinA = Math.sin(aimAngle);
    const perpX = -sinA;
    const perpY = cosA;

    const isStraightUp = Math.abs(aimAngle + Math.PI / 2) < 1e-4;
    const originX = explicitColMode
      ? COLUMNS[this.state.currentColumnIndex]
      : isStraightUp && this.autoStepActive
      ? this.state.targetAdrianX
      : this.state.adrianX + cosA * 10;
    const originY = explicitColMode
      ? ARROW_SPAWN_Y
      : isStraightUp && Math.abs(this.state.adrianY - ADRIAN_Y) < 1
      ? ARROW_SPAWN_Y
      : this.state.adrianY + sinA * 10;

    if (explicitColMode || (isStraightUp && this.autoStepActive)) {
      this.state.adrianX = originX;
      this.state.targetAdrianX = originX;
    }

    const colIdx = Math.max(0, Math.min(3, Math.floor(originX / 60)));

    this.sound?.playBowRelease(weapon);
    this.state.muzzleFlashWeapon = weapon;
    this.state.muzzleFlashTimer = 0.22;
    this.state.adrianFrame = 'draw';

    const volleyId = this.nextVolleyId++;
    const shotId = `shot_${volleyId}`;
    const spawned: ArrowEntity[] = [];

    const baseSpeed = Math.abs(weapon === 'heavy' ? GREAT_ARROW_SPEED : SINGLE_ARROW_SPEED);
    const vx = isStraightUp ? 0 : cosA * baseSpeed;
    const vy = isStraightUp
      ? weapon === 'heavy'
        ? GREAT_ARROW_SPEED
        : SINGLE_ARROW_SPEED
      : sinA * baseSpeed;
    const spriteAngle = isStraightUp ? 0 : aimAngle + Math.PI / 2;

    if (weapon === 'single') {
      const arrow: ArrowEntity = {
        id: `arrow_${this.nextEntityId++}`,
        volleyId,
        shotId,
        x: originX,
        y: originY,
        vx,
        vy,
        weaponType: 'single',
        damage: 1,
        piercing: false,
        slowedByPalisade: false,
        slowed: false,
        deflected: false,
        angle: spriteAngle,
        active: true,
        columnIndex: colIdx,
        hitPalisadeIds: [],
        frame: this.state.frameCount,
      };
      this.state.arrows.push(arrow);
      spawned.push(arrow);
    } else if (weapon === 'double') {
      for (const offset of [-6, 6]) {
        const arrow: ArrowEntity = {
          id: `arrow_${this.nextEntityId++}`,
          volleyId,
          shotId,
          x: isStraightUp ? originX + offset : originX + perpX * offset,
          y: isStraightUp ? originY : originY + perpY * offset,
          vx,
          vy,
          weaponType: 'double',
          spread: 0,
          damage: 1,
          piercing: false,
          slowedByPalisade: false,
          slowed: false,
          deflected: false,
          angle: spriteAngle,
          active: true,
          columnIndex: colIdx,
          hitPalisadeIds: [],
          frame: this.state.frameCount,
        };
        this.state.arrows.push(arrow);
        spawned.push(arrow);
      }
    } else {
      const arrow: ArrowEntity = {
        id: `arrow_${this.nextEntityId++}`,
        volleyId,
        shotId,
        x: originX,
        y: originY,
        vx,
        vy,
        weaponType: 'heavy',
        damage: 3,
        piercing: true,
        slowedByPalisade: false,
        slowed: false,
        deflected: false,
        angle: spriteAngle,
        active: true,
        columnIndex: colIdx,
        hitPalisadeIds: [],
        frame: this.state.frameCount,
      };
      this.state.arrows.push(arrow);
      spawned.push(arrow);
    }

    while (this.state.arrows.length > 14) {
      this.state.arrows.shift();
    }

    return spawned;
  }

  // ==========================================================================
  // 5. DETERMINISTIC 60 FPS STEP SIMULATION
  // ==========================================================================

  public step(dtSeconds: number = FIXED_DT): GameState {
    const dt = dtSeconds > 0 ? dtSeconds : FIXED_DT;
    this.state.frameCount += 1;

    if (
      this.state.status === 'paused' ||
      this.state.status === 'title' ||
      this.state.status === 'prologue' ||
      this.state.status === 'briefing'
    ) {
      return this.getState();
    }

    // Update cosmetic & invulnerability timers
    if (this.state.adrianInvulnTimer > 0) {
      this.state.adrianInvulnTimer = Math.max(0, this.state.adrianInvulnTimer - dt);
    }

    if (this.state.bannerTimer > 0) {
      this.state.bannerTimer = Math.max(0, this.state.bannerTimer - dt);
      if (
        this.state.bannerTimer === 0 &&
        this.state.status === 'playing' &&
        this.state.statusBanner !== 'Stage Clear!' &&
        this.state.statusBanner !== 'Town Breached — Restarting Stage'
      ) {
        this.state.statusBanner =
          this.state.sanctum.unlocked ? 'GATE OPEN! WALK UP TO THE QUEEN!' : null;
      }
    }

    if (this.state.queenCalloutTimer && this.state.queenCalloutTimer > 0) {
      this.state.queenCalloutTimer = Math.max(0, this.state.queenCalloutTimer - dt);
      if (this.state.queenCalloutTimer === 0) {
        this.state.queenCalloutText = null;
      }
    }

    if (this.state.sanctum.unlocked) {
      const prevProg = this.state.sanctum.portcullisProgress ?? 0;
      if (prevProg < 1) {
        this.state.sanctum.portcullisProgress = Math.min(1, prevProg + dt * 1.9);
      }
    }

    if (this.state.heartFlashTimer > 0) {
      this.state.heartFlashTimer = Math.max(0, this.state.heartFlashTimer - dt);
    }

    if (this.state.screenShakeTimer > 0) {
      this.state.screenShakeTimer = Math.max(0, this.state.screenShakeTimer - dt);
      this.state.screenShakeOffsetX = this.state.frameCount % 2 === 0 ? -2 : 2;
      this.state.screenShakeOffsetY = this.state.frameCount % 3 === 0 ? -1 : 1;
    } else {
      this.state.screenShakeOffsetX = 0;
      this.state.screenShakeOffsetY = 0;
    }

    // Handle 0-Heart Town Breached Reset Countdown
    if (this.state.status === 'town_breached') {
      this.updateBurstsAndParticles(dt);
      this.state.breachResetTimer = Math.max(0, this.state.breachResetTimer - dt);
      if (this.state.breachResetTimer <= 0) {
        this.restartStage();
      }
      return this.getState();
    }

    // Handle Stage Clear Celebration Countdown -> Next Stage
    if (this.state.status === 'stage_clear' || this.state.status === 'victory_campaign') {
      this.updateBurstsAndParticles(dt);
      this.state.stageClearTimer = Math.max(0, this.state.stageClearTimer - dt);
      if (this.state.stageClearTimer <= 0) {
        this.advanceToNextStage(this.storyModeEnabled);
      }
      return this.getState();
    }

    // Hit-stop freeze on Fail Conditions (180ms)
    if (this.state.hitStopTimer > 0) {
      this.state.hitStopTimer = Math.max(0, this.state.hitStopTimer - dt);
      this.updateBurstsAndParticles(dt);
      return this.getState();
    }

    this.state.stageTime += dt;
    this.state.elapsedTime = this.state.stageTime;

    // 1. Update Adrian bow animation & 2D movement
    if (this.state.muzzleFlashTimer > 0) {
      this.state.muzzleFlashTimer = Math.max(0, this.state.muzzleFlashTimer - dt);
      this.state.adrianFrame = this.state.muzzleFlashTimer > 0.1 ? 'draw' : 'nock';
      if (this.state.muzzleFlashTimer === 0) {
        this.state.muzzleFlashWeapon = 'none';
      }
    } else if (this.moveInputX !== 0 || this.moveInputY !== 0) {
      this.state.adrianFrame =
        Math.floor(this.state.adrianWalkTick * 10) % 2 === 0 ? 'idle1' : 'idle2';
    } else {
      this.state.adrianFrame =
        Math.floor(this.state.frameCount / 24) % 2 === 0 ? 'idle1' : 'idle2';
    }

    if (this.moveInputX !== 0 || this.moveInputY !== 0) {
      this.moveAdrian(this.moveInputX, this.moveInputY, dt, true);
    } else {
      this.state.adrianVx = 0;
      this.state.adrianVy = 0;
      if (this.autoStepActive && this.state.adrianX !== this.state.targetAdrianX) {
        const diff = this.state.targetAdrianX - this.state.adrianX;
        const stepDist = ADRIAN_STEP_SPEED * dt;
        if (Math.abs(diff) <= stepDist) {
          this.state.adrianX = this.state.targetAdrianX;
          this.autoStepActive = false;
        } else {
          this.state.adrianX += Math.sign(diff) * stepDist;
        }
      }
    }

    // 2. Update Queen reactive mood timer
    if (this.state.queenMoodTimer > 0) {
      this.state.queenMoodTimer = Math.max(0, this.state.queenMoodTimer - dt);
      if (this.state.queenMoodTimer === 0 && this.state.status === 'playing') {
        this.state.queenMood = this.state.sanctum.unlocked
          ? 'cheering'
          : this.state.hearts === 1
          ? 'praying'
          : 'watching';
      }
    }

    // 3. Update Targets (Goblin patrol + dagger/fireball attacks, Bat swoop patrol, stagger & flash)
    this.updateTargetsAndEnemyAI(dt);

    // 4. Update Hazards (Blue-Iron Block oscillation, Rotating Shield rotation & Spike contact)
    for (const hazard of this.state.hazards) {
      if (hazard.sparkTimer && hazard.sparkTimer > 0) {
        hazard.sparkTimer = Math.max(0, hazard.sparkTimer - dt);
      }
      if (hazard.flashTimer && hazard.flashTimer > 0) {
        hazard.flashTimer = Math.max(0, hazard.flashTimer - dt);
      }
      if (hazard.kind === 'iron_block') {
        if (hazard.oscillateAmplitude > 0 && hazard.oscillateSpeed !== 0) {
          const phase = hazard.oscillatePhase ?? 0;
          hazard.x =
            hazard.baseX +
            Math.sin(this.state.stageTime * hazard.oscillateSpeed + phase) *
              hazard.oscillateAmplitude;
        }
      } else if (hazard.kind === 'rotating_shield') {
        hazard.angle =
          (hazard.angle + hazard.angularSpeed * dt + Math.PI * 2) % (Math.PI * 2);
      } else if (hazard.kind === 'floor_spike') {
        // Check if Adrian stepped onto a Floor Spike trap!
        if (this.state.adrianInvulnTimer <= 0) {
          const sw = (hazard.width || 24) / 2;
          const sh = (hazard.height || 10) / 2;
          if (
            Math.abs(this.state.adrianX - hazard.x) <= sw + 4 &&
            Math.abs(this.state.adrianY - hazard.y) <= sh + 5
          ) {
            this.handleDirectPlayerDamage('hazard_contact', hazard.x, hazard.y);
          }
        }
      }
    }

    // 5. Advance Player Arrows & Resolve Collisions
    this.updateArrowsAndCollisions(dt);

    // 6. Advance Enemy Projectiles (Goblin Daggers & Fireballs)
    if (this.state.status === 'playing') {
      this.updateEnemyProjectiles(dt);
    }

    // 7. Collect Crate Pickups & Check Top Sanctum Queen Rescue
    if (this.state.status === 'playing') {
      this.updatePickups();
      this.checkSanctumRescue();
    }

    // 8. Update Bursts & Particles
    this.updateBurstsAndParticles(dt);

    return this.getState();
  }

  public stepFrames(frames = 1, dtSeconds = FIXED_DT): GameState {
    const count = Math.max(0, Math.floor(frames));
    for (let i = 0; i < count; i++) {
      this.step(dtSeconds);
    }
    return this.getState();
  }

  // ==========================================================================
  // 6. ACTIVE ENEMY AI, ENEMY PROJECTILES & CRATE PICKUPS
  // ==========================================================================

  private updateTargetsAndEnemyAI(dt: number): void {
    for (const target of this.state.targets) {
      if (!target.active) continue;

      if (target.staggerTimer > 0) {
        target.staggerTimer = Math.max(0, target.staggerTimer - dt);
      }
      if (target.flashTimer && target.flashTimer > 0) {
        target.flashTimer = Math.max(0, target.flashTimer - dt);
      }
      if (target.hp <= 0) continue;

      // Horizontal Patrol
      if (target.vx !== 0 && target.staggerTimer <= 0) {
        target.x += target.vx * dt;
        if (target.x <= target.patrolMinX) {
          target.x = target.patrolMinX;
          target.vx = Math.abs(target.vx);
        } else if (target.x >= target.patrolMaxX) {
          target.x = target.patrolMaxX;
          target.vx = -Math.abs(target.vx);
        }
      }

      // Winged Bat Swoop Wave (only when moving / patrolling)
      if (target.kind === 'bat' && target.vx !== 0 && target.baseY !== undefined) {
        const phase = target.swoopPhase ?? 0;
        target.y = target.baseY + Math.sin(this.state.stageTime * 2.8 + phase) * 7;
      }

      // Goblin Raider Ranged Attacks (Dagger / Torch Fireball) in Story / 2D Tactical Mode
      if (
        this.storyModeEnabled &&
        (target.kind === 'goblin_dagger' || target.kind === 'goblin_torch') &&
        target.staggerTimer <= 0
      ) {
        const interval = target.attackInterval ?? 2.6;
        target.attackCooldown = (target.attackCooldown ?? interval) - dt;
        if (target.attackCooldown <= 0) {
          target.attackCooldown = interval;
          const dist = Math.hypot(this.state.adrianX - target.x, this.state.adrianY - target.y);
          if (dist <= 215 && this.state.enemyProjectiles.length < 6) {
            this.spawnEnemyProjectile(
              target.kind === 'goblin_dagger' ? 'dagger' : 'fireball',
              target.x,
              target.y + 8,
              this.state.adrianX,
              this.state.adrianY
            );
          }
        }
      }

      // Contact Damage if Adrian walks directly into a live Goblin or swooping Bat
      if (
        (target.kind === 'bat' ||
          target.kind === 'goblin_dagger' ||
          target.kind === 'goblin_torch') &&
        this.state.adrianInvulnTimer <= 0
      ) {
        const tw = (target.width || 18) / 2;
        const th = (target.height || 18) / 2;
        if (
          Math.abs(this.state.adrianX - target.x) <= tw + 4 &&
          Math.abs(this.state.adrianY - target.y) <= th + 5
        ) {
          this.handleDirectPlayerDamage('hazard_contact', target.x, target.y);
          break;
        }
      }
    }
  }

  public spawnEnemyProjectile(
    kind: 'dagger' | 'fireball',
    fromX: number,
    fromY: number,
    toX: number,
    toY: number
  ): EnemyProjectile {
    const angle = Math.atan2(toY - fromY, toX - fromX);
    const speed = kind === 'dagger' ? 112 : 94;
    const proj: EnemyProjectile = {
      id: `eproj_${this.nextEntityId++}`,
      kind,
      x: fromX,
      y: fromY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      angle: kind === 'dagger' ? angle + Math.PI / 2 : 0,
      radius: kind === 'dagger' ? 4 : 5,
      active: true,
      frame: this.state.frameCount,
    };
    this.state.enemyProjectiles.push(proj);
    this.sound?.playEnemyThrow(kind);
    return proj;
  }

  private updateEnemyProjectiles(dt: number): void {
    for (const proj of this.state.enemyProjectiles) {
      if (!proj.active) continue;

      proj.x += proj.vx * dt;
      proj.y += proj.vy * dt;
      proj.frame = this.state.frameCount;
      if (proj.kind === 'dagger') {
        proj.angle += 11 * dt;
      }

      // Out of bounds
      if (
        proj.x < 4 ||
        proj.x > LOGICAL_WIDTH - 4 ||
        proj.y < PLAYFIELD_TOP_Y ||
        proj.y > LOGICAL_HEIGHT - 8
      ) {
        proj.active = false;
        continue;
      }

      // 1. Blocked by Blue-Iron Blocks or Rotating Shields (Tactical Cover!)
      let blocked = false;
      for (const h of this.state.hazards) {
        if (h.kind === 'iron_block') {
          if (
            Math.abs(proj.x - h.x) <= (h.width || 20) / 2 + proj.radius &&
            Math.abs(proj.y - h.y) <= (h.height || 18) / 2 + proj.radius
          ) {
            proj.active = false;
            this.spawnParticles(proj.x, proj.y, 'iron_spark', 4, '#9be4ff');
            blocked = true;
            break;
          }
        } else if (h.kind === 'rotating_shield') {
          if (Math.hypot(proj.x - h.x, proj.y - h.y) <= (h.radius || 14) + proj.radius) {
            proj.active = false;
            this.spawnParticles(proj.x, proj.y, 'iron_spark', 4, '#9be4ff');
            blocked = true;
            break;
          }
        }
      }
      if (blocked) continue;

      // 2. Blocked by Intact Wood Palisades
      for (const t of this.state.targets) {
        if (t.kind === 'palisade' && !t.broken && t.hp > 0) {
          if (
            Math.abs(proj.x - t.x) <= (t.width || 24) / 2 + proj.radius &&
            Math.abs(proj.y - t.y) <= (t.height || 18) / 2 + proj.radius
          ) {
            proj.active = false;
            this.spawnParticles(proj.x, proj.y, 'splinter', 3, '#b56c35');
            blocked = true;
            break;
          }
        }
      }
      if (blocked) continue;

      // 3. Hit Adrian!
      if (
        this.state.adrianInvulnTimer <= 0 &&
        Math.abs(proj.x - this.state.adrianX) <= 7 + proj.radius &&
        Math.abs(proj.y - this.state.adrianY) <= 9 + proj.radius
      ) {
        proj.active = false;
        this.handleDirectPlayerDamage('enemy_attack', proj.x, proj.y);
        if (this.state.status !== 'playing') break;
      }
    }

    this.state.enemyProjectiles = this.state.enemyProjectiles.filter((p) => p.active);
  }

  private spawnCratePickup(x: number, y: number, kind?: PickupKind): void {
    const resolvedKind: PickupKind =
      kind ??
      (this.state.hearts < this.state.maxHearts && this.nextEntityId % 3 === 0
        ? 'heart'
        : this.nextEntityId % 2 === 0
        ? 'double_ammo'
        : 'heavy_ammo');

    const item: PickupItem = {
      id: `pickup_${this.nextEntityId++}`,
      kind: resolvedKind,
      x,
      y,
      bobPhase: (this.nextEntityId % 6) * 0.8,
      active: true,
    };
    this.state.pickups.push(item);
  }

  private updatePickups(): void {
    for (const item of this.state.pickups) {
      if (!item.active) continue;
      if (Math.hypot(this.state.adrianX - item.x, this.state.adrianY - item.y) <= 15) {
        item.active = false;
        this.sound?.playPickup();
        this.addScore(50);
        if (item.kind === 'double_ammo') {
          this.state.doubleAmmo += 3;
          this.state.statusBanner = 'LOOT! +3 DOUBLE ARROWS';
        } else if (item.kind === 'heavy_ammo') {
          this.state.heavyAmmo += 2;
          this.state.statusBanner = 'LOOT! +2 GREAT ARROWS';
        } else {
          this.state.hearts = Math.min(this.state.maxHearts, this.state.hearts + 1);
          this.state.lostHearts = Math.max(0, this.state.maxHearts - this.state.hearts);
          if (this.state.hearts > 1 && this.state.queenMood === 'praying') {
            this.state.queenMood = 'watching';
          }
          this.state.statusBanner = 'ROYAL POTION! +1 HEART';
        }
        this.state.bannerTimer = 1.2;
      }
    }
    this.state.pickups = this.state.pickups.filter((p) => p.active);
  }

  private checkSanctumRescue(): void {
    if (!this.state.sanctum.unlocked || this.state.sanctum.rescued) return;
    if (this.state.status !== 'playing') return;

    const dx = Math.abs(this.state.adrianX - this.state.sanctum.queenX);
    const dy = Math.abs(this.state.adrianY - this.state.sanctum.queenY);
    if (dx <= 24 && (dy <= 22 || this.state.adrianY <= TOP_SANCTUM_GATE_Y)) {
      this.state.sanctum.rescued = true;
      this.triggerStageClear();
    }
  }

  // ==========================================================================
  // 7. PLAYER ARROW PHYSICS & COLLISION RESOLUTION
  // ==========================================================================

  private updateArrowsAndCollisions(dt: number): void {
    for (const arrow of this.state.arrows) {
      if (!arrow.active) continue;

      arrow.x += arrow.vx * dt;
      arrow.y += arrow.vy * dt;
      arrow.frame = this.state.frameCount;

      if (arrow.deflected) {
        arrow.angle = (arrow.angle ?? 0.4) + 14 * dt;
        if (
          arrow.y > LOGICAL_HEIGHT - 10 ||
          arrow.y < TOP_CEILING_Y ||
          arrow.x < 0 ||
          arrow.x > LOGICAL_WIDTH
        ) {
          arrow.active = false;
        }
        continue;
      }

      // Expire harmlessly when reaching playfield outer walls
      if (
        arrow.y <= TOP_CEILING_Y ||
        arrow.y >= LOGICAL_HEIGHT - 4 ||
        arrow.x <= 2 ||
        arrow.x >= LOGICAL_WIDTH - 2
      ) {
        arrow.active = false;
        continue;
      }

      const arrowHalfW = arrow.weaponType === 'heavy' ? 5 : 3;
      const arrowHalfH = arrow.weaponType === 'heavy' ? 12 : 8;

      // ----------------------------------------------------------------------
      // 0. MID-AIR PARRY: Player arrow shoots down Goblin Dagger or Fireball!
      // ----------------------------------------------------------------------
      let parriedProj = false;
      for (const eproj of this.state.enemyProjectiles) {
        if (!eproj.active) continue;
        if (Math.hypot(arrow.x - eproj.x, arrow.y - eproj.y) <= arrowHalfW + eproj.radius + 4) {
          eproj.active = false;
          this.sound?.playEnemyHit();
          this.spawnBurst(eproj.x, eproj.y, 'normal', 0.2);
          this.addScore(25);
          if (!arrow.piercing) {
            arrow.active = false;
            parriedProj = true;
          }
          break;
        }
      }
      if (parriedProj || !arrow.active) continue;

      // ----------------------------------------------------------------------
      // A. FAIL CONDITION 2A: In-Flight Arrow-on-Arrow Clip (Fast vs. Slowed)
      // ----------------------------------------------------------------------
      let clippedInFlight = false;
      const speedThis = Math.hypot(arrow.vx, arrow.vy);
      for (const other of this.state.arrows) {
        if (
          !other.active ||
          other.deflected ||
          other.id === arrow.id ||
          (other.volleyId !== undefined && other.volleyId === arrow.volleyId)
        ) {
          continue;
        }
        const speedOther = Math.hypot(other.vx, other.vy);
        if (
          Math.abs(arrow.x - other.x) <= 7 &&
          Math.abs(arrow.y - other.y) <= 12 &&
          speedThis > speedOther + 10
        ) {
          this.handleArrowOnArrowClip(arrow, (arrow.x + other.x) / 2, (arrow.y + other.y) / 2);
          other.active = false;
          clippedInFlight = true;
          break;
        }
      }
      if (clippedInFlight || !arrow.active || this.state.status !== 'playing') {
        continue;
      }

      // ----------------------------------------------------------------------
      // B. HAZARDS: Indestructible Blue-Iron Block & Rotating Shield Barrier
      // ----------------------------------------------------------------------
      let hitHazard = false;
      for (const hazard of this.state.hazards) {
        if (hazard.kind === 'iron_block') {
          const hHalfW = (hazard.width || 20) / 2;
          const hHalfH = (hazard.height || 18) / 2;
          if (
            Math.abs(arrow.x - hazard.x) <= hHalfW + arrowHalfW &&
            Math.abs(arrow.y - hazard.y) <= hHalfH + arrowHalfH
          ) {
            this.handleIronDeflection(arrow, hazard);
            hitHazard = true;
            break;
          }
        } else if (hazard.kind === 'rotating_shield') {
          const outerR = hazard.radius || 14;

          // 1. Check lodged arrows rotating on the shield rim (Fail Condition 2)
          let clippedShieldArrow = false;
          for (let lIdx = hazard.lodgedArrows.length - 1; lIdx >= 0; lIdx--) {
            const la = hazard.lodgedArrows[lIdx];
            if (la.volleyId !== undefined && la.volleyId === arrow.volleyId) continue;
            const worldA = hazard.angle + (la.angleOffset ?? la.angle ?? 0);
            const lx = hazard.x + Math.cos(worldA) * outerR;
            const ly = hazard.y + Math.sin(worldA) * outerR;
            if (Math.hypot(arrow.x - lx, arrow.y - ly) <= 8) {
              hazard.lodgedArrows.splice(lIdx, 1);
              this.handleArrowOnArrowClip(arrow, lx, ly);
              clippedShieldArrow = true;
              hitHazard = true;
              break;
            }
          }
          if (clippedShieldArrow) break;

          // 2. Check shield rim collision
          const dist = Math.hypot(arrow.x - hazard.x, arrow.y - hazard.y);
          if (dist <= outerR + arrowHalfW) {
            const worldImpactAngle = Math.atan2(arrow.y - hazard.y, arrow.x - hazard.x);
            const relAngle =
              ((worldImpactAngle - hazard.angle) % (Math.PI * 2) + Math.PI * 2) %
              (Math.PI * 2);

            const segments = hazard.segments ?? [];
            const hitSeg = segments.find(
              (seg) =>
                (seg.type === 'iron' || seg.hp > 0) &&
                relAngle >= seg.startAngle - 0.12 &&
                relAngle <= seg.endAngle + 0.12
            );

            if (hitSeg) {
              if (hitSeg.type === 'iron') {
                this.handleIronDeflection(arrow, hazard);
                hitHazard = true;
                break;
              } else if (hitSeg.type === 'wood' && hitSeg.hp > 0) {
                if (arrow.piercing) {
                  hitSeg.hp = 0;
                  this.sound?.playWoodShatter(true);
                  this.spawnBurst(arrow.x, arrow.y, 'piercing_shatter', 0.3);
                  this.addScore(30);
                } else {
                  hitSeg.hp = Math.max(0, hitSeg.hp - arrow.damage);
                  this.sound?.playEnemyHit();
                  this.spawnBurst(arrow.x, arrow.y, 'normal', 0.22);
                  arrow.active = false;
                  hazard.lodgedArrows.push({
                    id: arrow.id,
                    volleyId: arrow.volleyId,
                    offsetX: 0,
                    offsetY: 0,
                    angle: relAngle,
                    angleOffset: relAngle,
                  });
                  this.addScore(15);
                  hitHazard = true;
                  break;
                }
              }
            }
          }
        }
      }
      if (hitHazard || !arrow.active || this.state.status !== 'playing') {
        continue;
      }

      // ----------------------------------------------------------------------
      // C. TARGETS: Lodged Arrow Clips (Fail Condition 2B), Palisades & Raiders
      // ----------------------------------------------------------------------
      for (const target of this.state.targets) {
        if (!target.active) continue;

        // 1. Check lodged arrows sticking out of this target first (Fail Condition 2B)
        if (target.lodgedArrows.length > 0 && target.kind !== 'palisade' && target.hp > 0) {
          let clippedTargetLodged = false;
          for (let lIdx = target.lodgedArrows.length - 1; lIdx >= 0; lIdx--) {
            const la = target.lodgedArrows[lIdx];
            if (la.volleyId !== undefined && la.volleyId === arrow.volleyId) {
              continue;
            }
            const lx = target.x + (la.offsetX ?? 0);
            const ly = target.y + (la.offsetY ?? 7);
            if (!arrow.piercing && Math.abs(arrow.x - lx) <= 5 && Math.abs(arrow.y - ly) <= 10) {
              target.lodgedArrows.splice(lIdx, 1);
              this.handleArrowOnArrowClip(arrow, lx, ly);
              clippedTargetLodged = true;
              break;
            }
          }
          if (clippedTargetLodged) break;
        }

        // 2. Wood Palisade Gate Interaction (opens walkable shortcut when broken!)
        if (target.kind === 'palisade') {
          if (target.broken || target.hp <= 0) {
            continue;
          }
          const pHalfW = (target.width || 24) / 2;
          const pHalfH = (target.height || 18) / 2;
          if (
            Math.abs(arrow.x - target.x) <= pHalfW + arrowHalfW &&
            Math.abs(arrow.y - target.y) <= pHalfH + arrowHalfH
          ) {
            if (arrow.piercing) {
              target.broken = true;
              target.hp = 0;
              target.flashTimer = 0.2;
              this.sound?.playWoodShatter(true);
              this.spawnBurst(target.x, target.y, 'piercing_shatter', 0.3);
              this.spawnParticles(target.x, target.y, 'wood_chip', 8, '#9c5a2b');
              this.addScore(target.points || 40);
            } else {
              const curSpeed = Math.hypot(arrow.vx, arrow.vy) || 260;
              const slowedMag = Math.abs(PALISADE_SLOWED_SPEED);
              if (arrow.vx === 0 && arrow.vy < 0) {
                arrow.vy = PALISADE_SLOWED_SPEED;
              } else {
                arrow.vx = (arrow.vx / curSpeed) * slowedMag;
                arrow.vy = (arrow.vy / curSpeed) * slowedMag;
              }
              arrow.slowedByPalisade = true;
              arrow.slowed = true;
              target.flashTimer = 0.18;
              target.broken = true;
              target.hp = 0;

              for (const sibling of this.state.arrows) {
                if (
                  sibling.active &&
                  sibling.id !== arrow.id &&
                  sibling.volleyId !== undefined &&
                  sibling.volleyId === arrow.volleyId
                ) {
                  if (sibling.vx === 0 && sibling.vy < 0) {
                    sibling.vy = PALISADE_SLOWED_SPEED;
                  } else {
                    const sibSpeed = Math.hypot(sibling.vx, sibling.vy) || 260;
                    sibling.vx = (sibling.vx / sibSpeed) * slowedMag;
                    sibling.vy = (sibling.vy / sibSpeed) * slowedMag;
                  }
                  sibling.slowedByPalisade = true;
                  sibling.slowed = true;
                }
              }
              this.sound?.playWoodShatter(false);
              this.spawnParticles(arrow.x, target.y, 'splinter', 5, '#b56c35');
              this.addScore(target.points || 40);
            }
          }
          continue;
        }

        if (target.hp <= 0) continue;

        // 3. Bats, Goblin Raiders & Siege Crates
        const tHalfW = (target.width || 18) / 2;
        const tHalfH = (target.height || 18) / 2;
        if (
          Math.abs(arrow.x - target.x) <= tHalfW + arrowHalfW &&
          Math.abs(arrow.y - target.y) <= tHalfH + arrowHalfH
        ) {
          target.hp = Math.max(0, target.hp - arrow.damage);
          target.flashTimer = 0.16;

          if (arrow.piercing) {
            this.sound?.playEnemyHit();
            this.spawnBurst(target.x, target.y, 'piercing_shatter', 0.28);
            this.spawnParticles(target.x, target.y, 'wood_chip', 6, '#facc15');
          } else {
            arrow.active = false;
            this.sound?.playEnemyHit();
            this.spawnBurst(
              arrow.x,
              target.y,
              arrow.weaponType === 'double' ? 'wide_multi_hit' : 'normal',
              0.24
            );
          }

          if (target.hp > 0) {
            target.staggerTimer = 0.35;
            if (!arrow.piercing) {
              target.lodgedArrows.push({
                id: arrow.id,
                volleyId: arrow.volleyId,
                offsetX: Math.round(arrow.x - target.x),
                offsetY: target.kind === 'crate' ? 8 : 6,
                angle: arrow.angle,
              });
            }
            this.addScore(30);
          } else {
            target.active = false;
            target.broken = true;
            this.addScore(target.points || 100);

            if (target.kind === 'crate') {
              this.sound?.playWoodShatter(false);
              this.spawnParticles(target.x, target.y, 'wood_chip', 7, '#c9834b');
              this.spawnCratePickup(target.x, target.y, target.dropKind);
            }

            if (target.requiredForClear) {
              this.onRequiredTargetDestroyed();
            }
          }

          if (!arrow.active || this.state.status !== 'playing') {
            break;
          }
        }
      }
    }

    this.state.arrows = this.state.arrows.filter((a) => a.active);
  }

  // ==========================================================================
  // 8. FAIL CONDITIONS, DAMAGE, SANCTUM UNLOCK & STAGE PROGRESSION
  // ==========================================================================

  private handleIronDeflection(arrow: ArrowEntity, hazard: HazardBlock): void {
    this.sound?.playMetallicClang();

    arrow.deflected = true;
    arrow.vx = arrow.x < hazard.x ? -95 : 95;
    arrow.vy = arrow.y < hazard.y ? -140 : 150;
    arrow.deflectVx = arrow.vx * FIXED_DT;
    arrow.deflectVy = arrow.vy * FIXED_DT;
    arrow.angle = arrow.x < hazard.x ? -0.65 : 0.65;

    hazard.sparkTimer = 0.25;
    hazard.flashTimer = 0.18;

    this.spawnBurst(arrow.x, arrow.y, 'iron_deflect', 0.26);
    this.spawnParticles(arrow.x, arrow.y, 'iron_spark', 6, '#9be4ff');

    this.applySanctuaryPenalty('iron_block_deflection', arrow.volleyId);
  }

  private handleArrowOnArrowClip(arrow: ArrowEntity, clipX: number, clipY: number): void {
    this.sound?.playArrowClipBuzz();

    arrow.active = false;
    this.spawnBurst(clipX, clipY, 'arrow_clip', 0.26);
    this.spawnParticles(clipX, clipY, 'arrow_splinter', 6, '#b56c35');

    this.applySanctuaryPenalty('arrow_on_arrow_clip', arrow.volleyId);
  }

  private handleDirectPlayerDamage(
    reason: 'enemy_attack' | 'hazard_contact',
    sourceX: number,
    sourceY: number
  ): void {
    this.sound?.playPlayerHurt();
    this.state.adrianInvulnTimer = ADRIAN_INVULN_DURATION;
    this.spawnBurst(this.state.adrianX, this.state.adrianY, 'arrow_clip', 0.25);
    this.spawnParticles(this.state.adrianX, this.state.adrianY, 'spark', 6, '#ef4444');

    // Gentle knockback away from hazard
    const pushX = this.state.adrianX - sourceX;
    const pushY = this.state.adrianY - sourceY;
    const plen = Math.hypot(pushX, pushY) || 1;
    const nx = Math.max(14, Math.min(LOGICAL_WIDTH - 14, this.state.adrianX + (pushX / plen) * 10));
    const ny = Math.max(40, Math.min(292, this.state.adrianY + (pushY / plen) * 10));
    if (!this.isSolidForAdrian(nx, ny)) {
      this.state.adrianX = nx;
      this.state.adrianY = ny;
    }

    this.applySanctuaryPenalty(reason);
  }

  private applySanctuaryPenalty(reason: FailReason, volleyId?: number): void {
    this.state.lastFailReason = reason;
    this.state.hitStopTimer = HIT_STOP_DURATION;
    this.state.screenShakeTimer = HIT_STOP_DURATION;
    this.state.screenShakeOffsetX = -2;
    this.state.screenShakeOffsetY = 1;
    this.state.heartFlashTimer = 0.35;
    this.state.flawlessStage = false;

    if (volleyId !== undefined) {
      if (this.penalizedVolleyIds.has(volleyId)) {
        return;
      }
      this.penalizedVolleyIds.add(volleyId);
    }

    this.state.hearts = Math.max(0, this.state.hearts - 1);
    this.state.lostHearts = Math.max(0, this.state.maxHearts - this.state.hearts);

    const bannerMap: Record<FailReason, string> = {
      none: '',
      iron_block_deflection: 'IRON DEFLECTION! -1 HEART',
      arrow_on_arrow_clip: 'ARROW CLIP! -1 HEART',
      enemy_attack: 'HIT BY RAIDER! -1 HEART',
      hazard_contact: 'SPIKE / RAIDER HIT! -1 HEART',
      town_breached: 'Town Breached — Restarting Stage',
    };

    if (this.state.hearts === 0) {
      this.state.status = 'town_breached';
      this.state.lastFailReason = 'town_breached';
      this.state.queenMood = 'distressed';
      this.state.queenMoodTimer = 0;
      this.state.statusBanner = 'Town Breached — Restarting Stage';
      this.state.bannerTimer = 1.5;
      this.state.queenCalloutText = '"No—Adrian! Stand again, my champion!"';
      this.state.queenCalloutTimer = 1.5;
      this.state.breachResetTimer = 1.5;
      this.sound?.playTownBreached();
    } else if (this.state.hearts === 1) {
      this.state.queenMood = 'praying';
      this.state.queenMoodTimer = 0;
      this.state.statusBanner = bannerMap[reason];
      this.state.bannerTimer = 1.1;
      this.state.queenCalloutText =
        '"Gods preserve you, Adrian—only one heart left! Hold to cover!"';
      this.state.queenCalloutTimer = 3.2;
    } else {
      this.state.queenMood = 'distressed';
      this.state.queenMoodTimer = 1.2;
      this.state.statusBanner = bannerMap[reason];
      this.state.bannerTimer = 1.1;
      this.state.queenCalloutText =
        reason === 'iron_block_deflection'
          ? '"Beware the enchanted Blue-Iron—it hurls your own shaft back!"'
          : '"Adrian, careful! Keep the stone pillars between you and their fire!"';
      this.state.queenCalloutTimer = 2.6;
    }
  }

  /**
   * Evaluates garrison progress:
   * - When all required Raiders fall, unlocks Queen Aurelia's Top Sanctum Portcullis Gate!
   * - In Story / 2D Tactical Mode (`storyModeEnabled`), Adrian must physically walk up to Queen Aurelia
   *   at the Top Sanctum (`x=120, y=38`) to complete the rescue!
   */
  private onRequiredTargetDestroyed(allowInstantClearFallback = false): void {
    const remainingAll = this.state.targets.filter(
      (t) => t.active && t.requiredForClear && t.hp > 0
    );
    this.state.remainingRaiders = remainingAll.length;

    if (remainingAll.length === 0) {
      this.state.sanctum.unlocked = true;
      this.state.sanctum.portcullisProgress = this.state.sanctum.portcullisProgress ?? 0.05;
      this.state.enemyProjectiles = [];

      if (this.storyModeEnabled && !allowInstantClearFallback) {
        // Unlock Top Sanctum Portcullis so Adrian walks up to rescue Queen Aurelia!
        this.sound?.playSanctumUnlock();
        this.state.queenMood = 'cheering';
        this.state.queenMoodTimer = 0;
        this.state.statusBanner = 'SANCTUM SEAL BROKEN! ASCEND TO QUEEN AURELIA!';
        this.state.bannerTimer = 2.8;
        this.state.queenCalloutText =
          '"The blood-seal shatters—the grate rises! Come to me up the crimson carpet, Adrian!"';
        this.state.queenCalloutTimer = 5.5;
        this.spawnParticles(120, 52, 'spark', 8, '#fde047');
        this.checkSanctumRescue();
      } else {
        this.state.sanctum.portcullisProgress = 1;
        this.state.sanctum.rescued = true;
        this.triggerStageClear();
      }
      return;
    }

    // Check if current sector column is cleared (awards bonus ammo!)
    const remainingInCol = remainingAll.filter(
      (t) => t.columnIndex === this.state.currentColumnIndex
    );

    if (remainingInCol.length === 0) {
      this.state.columnsClearedInStage += 1;
      this.state.totalColumnsCleared += 1;

      this.state.doubleAmmo += 1;
      if (this.state.totalColumnsCleared % 2 === 0) {
        this.state.heavyAmmo += 1;
      }

      if (!this.storyModeEnabled) {
        const nextCol = this.findNextColumnWithRequiredTargets(this.state.currentColumnIndex);
        this.state.currentColumnIndex = nextCol;
        this.state.adrianCol = nextCol;
        this.state.targetAdrianX = COLUMNS[nextCol];
        this.autoStepActive = true;
      }

      this.state.queenMood = 'cheering';
      this.state.queenMoodTimer = 1.5;
      this.state.statusBanner = 'SECTOR CLEARED! +1 DOUBLE SHOT';
      this.state.bannerTimer = 1.1;
    }
  }

  private triggerStageClear(): void {
    const isFinalCampaignBoss = this.storyModeEnabled && this.state.stage === 15;
    this.state.status = isFinalCampaignBoss ? 'victory_campaign' : 'stage_clear';
    this.state.queenMood = 'cheering';
    this.state.queenMoodTimer = 0;
    this.state.statusBanner = 'Stage Clear!';
    this.state.bannerTimer = 1.8;
    this.state.stageClearTimer = this.storyModeEnabled ? 2.6 : 1.5;

    if (this.state.flawlessStage && this.state.hearts < this.state.maxHearts) {
      this.state.hearts = Math.min(this.state.maxHearts, this.state.hearts + 1);
      this.state.lostHearts = Math.max(0, this.state.maxHearts - this.state.hearts);
    }

    this.state.doubleAmmo += 2;
    this.state.heavyAmmo += 1;
    this.addScore(250 * this.state.stage);

    const nextUnlocked = Math.min(16, this.state.stage + 1);
    if (nextUnlocked > this.state.unlockedStage) {
      this.state.unlockedStage = nextUnlocked;
    }
    this.saveProgress();

    this.sound?.playStageClear();
  }

  // ==========================================================================
  // 9. DETERMINISTIC TEST & DEVHOOK HELPERS
  // ==========================================================================

  public getState(): GameState {
    this.state.stageNumber = this.state.stage;
    this.state.palette = this.state.terrainPalette;
    this.state.adrianCol = this.state.currentColumnIndex;
    this.state.lostHearts = Math.max(0, this.state.maxHearts - this.state.hearts);
    this.state.elapsedTime = this.state.stageTime;
    this.state.remainingRaiders = this.state.targets.filter(
      (t) => t.active && t.requiredForClear && t.hp > 0
    ).length;
    return this.state;
  }

  public setQueenMood(mood: QueenMood): void {
    this.state.queenMood = mood;
    this.state.queenMoodTimer = 0;
  }

  public setHearts(hearts: number): void {
    this.state.hearts = Math.max(0, Math.min(this.state.maxHearts, Math.floor(hearts)));
    this.state.lostHearts = Math.max(0, this.state.maxHearts - this.state.hearts);
    if (this.state.hearts === 0) {
      this.state.queenMood = 'distressed';
    } else if (this.state.hearts === 1) {
      this.state.queenMood = 'praying';
    } else if (this.state.queenMood === 'praying') {
      this.state.queenMood = 'watching';
    }
  }

  public setPaused(paused: boolean): void {
    if (paused && this.state.status === 'playing') {
      this.state.status = 'paused';
    } else if (!paused && this.state.status === 'paused') {
      this.state.status = 'playing';
    }
  }

  public togglePause(): boolean {
    this.setPaused(this.state.status !== 'paused');
    return this.state.status === 'paused';
  }

  public triggerIronDeflectionTest(weapon: WeaponType = 'single'): GameState {
    this.state.status = 'playing';
    this.state.hitStopTimer = 0;
    const colIdx = this.state.currentColumnIndex;
    const colX = COLUMNS[colIdx];

    let block = this.state.hazards.find(
      (h) => h.kind === 'iron_block' && Math.abs(h.x - colX) <= 8
    );
    if (!block) {
      block = {
        id: `test_iron_${this.nextEntityId++}`,
        kind: 'iron_block',
        type: 'iron_block',
        columnIndex: colIdx,
        x: colX,
        y: 220,
        baseX: colX,
        width: 20,
        height: 18,
        radius: 0,
        angle: 0,
        angularSpeed: 0,
        oscillateAmplitude: 0,
        oscillateSpeed: 0,
        segments: [],
        lodgedArrows: [],
        sparkTimer: 0,
        flashTimer: 0,
      };
      this.state.hazards.push(block);
    } else {
      block.x = colX;
      block.y = 220;
      block.oscillateAmplitude = 0;
    }

    const arrows = this.fireWeapon(weapon, colIdx);
    for (const a of arrows) {
      a.y = block.y + 12;
    }
    return this.step(FIXED_DT);
  }

  public triggerArrowClipTest(
    mode: 'palisade_slowed' | 'lodged' = 'palisade_slowed'
  ): GameState {
    this.state.status = 'playing';
    this.state.hitStopTimer = 0;
    const colIdx = this.state.currentColumnIndex;
    const colX = COLUMNS[colIdx];

    if (mode === 'palisade_slowed') {
      const slowedArrow: ArrowEntity = {
        id: `arrow_slow_${this.nextEntityId++}`,
        volleyId: this.nextVolleyId++,
        shotId: `shot_slow_${this.nextVolleyId}`,
        x: colX,
        y: 180,
        vx: 0,
        vy: PALISADE_SLOWED_SPEED,
        weaponType: 'single',
        damage: 1,
        piercing: false,
        slowedByPalisade: true,
        slowed: true,
        deflected: false,
        angle: 0,
        active: true,
        columnIndex: colIdx,
        hitPalisadeIds: [],
        frame: this.state.frameCount,
      };
      this.state.arrows.push(slowedArrow);
      const fastArrows = this.fireWeapon('single', colIdx);
      if (fastArrows[0]) {
        fastArrows[0].y = 188;
      }
      return this.step(FIXED_DT);
    } else {
      let target = this.state.targets.find(
        (t) => t.active && t.columnIndex === colIdx && t.kind !== 'palisade' && t.hp > 0
      );
      if (!target) {
        target = {
          id: `test_goblin_${this.nextEntityId++}`,
          kind: 'goblin_torch',
          type: 'goblin_torch',
          columnIndex: colIdx,
          x: colX,
          y: 170,
          width: 18,
          height: 20,
          hp: 1,
          maxHp: 2,
          patrolMinX: colX,
          patrolMaxX: colX,
          vx: 0,
          staggerTimer: 0.5,
          broken: false,
          lodgedArrows: [{ id: 'lodged_1', volleyId: -1, offsetX: 0, offsetY: 6, angle: 0 }],
          points: 100,
          requiredForClear: true,
          active: true,
        };
        this.state.targets.push(target);
      } else {
        target.x = colX;
        target.vx = 0;
        target.lodgedArrows = [
          { id: 'lodged_1', volleyId: -1, offsetX: 0, offsetY: 6, angle: 0 },
        ];
      }
      const arrows = this.fireWeapon('single', colIdx);
      if (arrows[0]) {
        arrows[0].y = target.y + 12;
      }
      return this.step(FIXED_DT);
    }
  }

  public clearCurrentColumn(): GameState {
    this.state.status = 'playing';
    const col = this.state.currentColumnIndex;
    const colTargets = this.state.targets.filter(
      (t) => t.active && t.requiredForClear && t.hp > 0 && t.columnIndex === col
    );
    for (const t of colTargets) {
      t.hp = 0;
      t.active = false;
      t.broken = true;
      this.addScore(t.points || 100);
    }
    if (colTargets.length > 0) {
      this.onRequiredTargetDestroyed(true);
    }
    return this.getState();
  }

  /**
   * Unlocks the Top Sanctum Gate by defeating all Raiders without teleporting Adrian,
   * allowing callers/E2E tests to walk Adrian up to Queen Aurelia physically!
   */
  public unlockSanctumOnly(): GameState {
    this.state.status = 'playing';
    for (const t of this.state.targets) {
      if (t.active && t.requiredForClear && t.hp > 0) {
        t.hp = 0;
        t.active = false;
        t.broken = true;
        this.addScore(t.points || 100);
      }
    }
    this.state.remainingRaiders = 0;
    this.state.sanctum.unlocked = true;
    this.state.sanctum.portcullisProgress = 1;
    this.state.enemyProjectiles = [];
    this.sound?.playSanctumUnlock();
    this.state.queenMood = 'cheering';
    this.state.statusBanner = 'SANCTUM SEAL BROKEN! ASCEND TO QUEEN AURELIA!';
    this.state.bannerTimer = 2.8;
    this.state.queenCalloutText =
      '"The blood-seal shatters—the grate rises! Come to me up the crimson carpet, Adrian!"';
    this.state.queenCalloutTimer = 5.5;
    return this.getState();
  }

  public clearCurrentStage(advanceImmediately = false): GameState {
    for (const t of this.state.targets) {
      if (t.active && t.requiredForClear && t.hp > 0) {
        t.hp = 0;
        t.active = false;
        t.broken = true;
        this.addScore(t.points || 100);
      }
    }
    this.state.remainingRaiders = 0;
    this.state.sanctum.unlocked = true;
    this.state.sanctum.rescued = true;
    this.state.adrianX = this.state.sanctum.queenX;
    this.state.adrianY = this.state.sanctum.queenY + 14;
    this.triggerStageClear();
    if (advanceImmediately) {
      this.advanceToNextStage(false);
    }
    return this.getState();
  }

  // ==========================================================================
  // 10. INTERNAL HELPERS
  // ==========================================================================

  private addScore(points: number): void {
    this.state.score += Math.max(0, Math.floor(points));
    if (this.state.score > this.state.highScore) {
      this.state.highScore = this.state.score;
      this.saveProgress();
    }
  }

  private findFirstColumnWithRequiredTargets(targets: readonly TargetEntity[]): number {
    for (let c = 0; c < 4; c++) {
      if (targets.some((t) => t.active && t.requiredForClear && t.hp > 0 && t.columnIndex === c)) {
        return c;
      }
    }
    return 0;
  }

  private findNextColumnWithRequiredTargets(fromCol: number): number {
    for (let offset = 1; offset <= 4; offset++) {
      const candidate = (fromCol + offset) % 4;
      if (
        this.state.targets.some(
          (t) => t.active && t.requiredForClear && t.hp > 0 && t.columnIndex === candidate
        )
      ) {
        return candidate;
      }
    }
    return fromCol;
  }

  private spawnBurst(
    x: number,
    y: number,
    type: ImpactBurst['type'],
    maxTimer = 0.25
  ): void {
    if (this.state.bursts.length >= 16) {
      this.state.bursts.shift();
    }
    this.state.bursts.push({ x, y, type, timer: 0, maxTimer });
  }

  private spawnParticles(
    x: number,
    y: number,
    kind: ParticleEntity['kind'],
    count: number,
    color: string
  ): void {
    const velocities: ReadonlyArray<readonly [number, number]> = [
      [-65, -80],
      [65, -80],
      [-90, -30],
      [90, -30],
      [-45, 55],
      [45, 55],
      [-25, -105],
      [25, -105],
    ];
    for (let i = 0; i < count; i++) {
      if (this.state.particles.length >= 48) {
        this.state.particles.shift();
      }
      const [vx, vy] = velocities[i % velocities.length];
      this.state.particles.push({
        x,
        y,
        vx,
        vy,
        color,
        outlineColor: '#231409',
        size: i % 2 === 0 ? 3 : 2,
        life: 0.28,
        maxLife: 0.28,
        kind,
      });
    }
  }

  private updateBurstsAndParticles(dt: number): void {
    for (let i = this.state.bursts.length - 1; i >= 0; i--) {
      const b = this.state.bursts[i];
      b.timer += dt;
      if (b.timer >= b.maxTimer) {
        this.state.bursts.splice(i, 1);
      }
    }
    for (let i = this.state.particles.length - 1; i >= 0; i--) {
      const p = this.state.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life = (p.life ?? 0.25) - dt;
      if (p.life <= 0) {
        this.state.particles.splice(i, 1);
      }
    }
  }
}

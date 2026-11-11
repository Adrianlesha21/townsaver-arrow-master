/**
 * Townsaver: The Arrow Master — Core Canonical Type Definitions (v2.0 Tactical & Story Overhaul)
 * Supports 8-Way 2D Free-Roam Movement, 8-Way & 360° Hybrid Aiming, Active Enemy Projectiles,
 * Crate Pickups, Floor Spikes, Top Royal Sanctum Queen Rescue, and Full 15-Stage Story Campaign.
 */

import type {
  AdrianFrameName,
  HazardKind,
  LodgedArrowView,
  QueenMood,
  ShieldSegment,
  SpriteParticle,
  TargetKind,
  TerrainPalette,
  WeaponType,
} from './sprites';

export type {
  AdrianFrameName,
  HazardKind,
  LodgedArrowView,
  QueenMood,
  ShieldSegment,
  SpriteParticle,
  TargetKind,
  TerrainPalette,
  WeaponType,
};

export type ParticleEntity = SpriteParticle;

export const LOGICAL_WIDTH = 240;
export const LOGICAL_HEIGHT = 320;
export const COLUMNS: readonly number[] = [30, 90, 150, 210] as const;

// Adrian spawns at the Castle Courtyard Entrance near the bottom; Queen Aurelia awaits at the Top Sanctum!
export const ADRIAN_SANCTUARY_X = 120;
export const ADRIAN_SANCTUARY_Y = 282;
export const QUEEN_TOP_SANCTUM_X = 120;
export const QUEEN_TOP_SANCTUM_Y = 38;
// Legacy aliases kept for compatibility
export const QUEEN_SANCTUARY_X = QUEEN_TOP_SANCTUM_X;
export const QUEEN_SANCTUARY_Y = QUEEN_TOP_SANCTUM_Y;
export const ARROW_SPAWN_Y = 264;
export const SANCTUARY_THRESHOLD_Y = 264;
export const PLAYFIELD_TOP_Y = 22;
export const TOP_SANCTUM_GATE_Y = 56;

export type CardinalDirection = 'up' | 'down' | 'left' | 'right';

export type FacingDirection =
  | CardinalDirection
  | 'up-left'
  | 'up-right'
  | 'down-left'
  | 'down-right';

export type GameStatus =
  | 'title'
  | 'prologue'
  | 'briefing'
  | 'playing'
  | 'paused'
  | 'stage_clear'
  | 'victory_campaign'
  | 'town_breached';

export type FailReason =
  | 'none'
  | 'iron_block_deflection'
  | 'arrow_on_arrow_clip'
  | 'enemy_attack'
  | 'hazard_contact'
  | 'town_breached';

/**
 * Prologue slide shown before Stage 1 (or when clicking STORY PROLOGUE).
 */
export interface PrologueSlide {
  slideNumber: number;
  totalSlides: number;
  heading: string;
  caption: string;
  lines: string[];
  accentColor: string;
  sceneType: 'invasion' | 'captive_queen' | 'arrow_master_oath';
}

/**
 * Per-stage story briefing & Queen reunion dialogue.
 */
export interface StoryChapter {
  stageNumber: number;
  actTitle: string;
  chapterTitle: string;
  briefingLines: string[];
  tacticalHint: string;
  queenPlea: string;
  queenCastleCallout?: string;
  reunionQuote: string;
}

/**
 * Top Royal Sanctum state where Queen Aurelia awaits rescue at the top of each level.
 */
export interface SanctumState {
  x: number;
  y: number;
  queenX: number;
  queenY: number;
  gateY: number;
  gateWidth: number;
  unlocked: boolean;
  rescued: boolean;
  portcullisProgress?: number;
}

/**
 * Enemy projectile (iron dagger thrown by Dagger Goblin or blazing firebrand thrown by Torch Goblin).
 */
export interface EnemyProjectile {
  id: string;
  kind: 'dagger' | 'fireball';
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  radius: number;
  active: boolean;
  frame: number;
}

/**
 * Collectible loot dropped when smashing Siege Crates or placed in secret alcoves.
 */
export type PickupKind = 'double_ammo' | 'heavy_ammo' | 'heart';

export interface PickupItem {
  id: string;
  kind: PickupKind;
  x: number;
  y: number;
  bobPhase: number;
  active: boolean;
}

/**
 * Represents an arrow shaft/fletching lodged into a 2-HP target (Goblin/Crate/Palisade)
 * or a wooden rim segment of a Rotating Shield Wheel.
 */
export interface LodgedArrow extends LodgedArrowView {
  id: string;
  volleyId?: number;
  offsetX: number;
  offsetY: number;
  angle: number;
  angleOffset?: number;
  weaponType?: WeaponType;
}

/**
 * Active in-flight or deflecting player arrow projectile.
 */
export interface ArrowEntity {
  id: string;
  volleyId?: number;
  shotId?: string;
  columnIndex: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  weaponType: WeaponType;
  damage: number;
  piercing: boolean;
  slowedByPalisade: boolean;
  slowed: boolean;
  deflected: boolean;
  deflectVx?: number;
  deflectVy?: number;
  angle: number;
  spread?: number;
  active: boolean;
  hitPalisadeIds?: string[];
  frame?: number;
}

/**
 * Enemy Raider, Winged Bat, Siege Crate, or destructible Wood Palisade Gate.
 */
export interface TargetEntity {
  id: string;
  kind: TargetKind;
  type: TargetKind;
  columnIndex: number;
  x: number;
  y: number;
  baseY?: number;
  width: number;
  height: number;
  hp: number;
  maxHp: number;
  patrolMinX: number;
  patrolMaxX: number;
  patrolMinY?: number;
  patrolMaxY?: number;
  vx: number;
  vy?: number;
  attackCooldown?: number;
  attackInterval?: number;
  dropKind?: PickupKind;
  swoopPhase?: number;
  staggerTimer: number;
  flashTimer?: number;
  animFrame?: number;
  flameFrame?: number;
  broken: boolean;
  active: boolean;
  lodgedArrows: LodgedArrow[];
  points: number;
  requiredForClear: boolean;
}

/**
 * Indestructible Blue-Iron Block, Rotating Shield Wheel, or Floor Spike Trap.
 */
export interface HazardBlock {
  id: string;
  kind: HazardKind;
  type: HazardKind;
  columnIndex: number;
  x: number;
  y: number;
  baseX: number;
  baseY?: number;
  width: number;
  height: number;
  radius: number;
  angle: number;
  angularSpeed: number;
  oscillateAmplitude: number;
  oscillateSpeed: number;
  oscillatePhase?: number;
  segments: ShieldSegment[];
  lodgedArrows: LodgedArrow[];
  sparkTimer?: number;
  flashTimer?: number;
  frame?: number;
}

/**
 * Blueprint configuration for a handcrafted castle maze stage or endless stage.
 */
export interface StageConfig {
  stageNumber: number;
  name: string;
  subtitle: string;
  palette: TerrainPalette;
  columns: number[];
  startingDoubleAmmo: number;
  startingHeavyAmmo: number;
  spawnX?: number;
  spawnY?: number;
  story?: StoryChapter;
  targets: TargetEntity[];
  hazards: HazardBlock[];
  pickups?: PickupItem[];
}

/**
 * Visual starburst effect spawned on impact, shatter, deflection, parry, or arrow clip.
 */
export interface ImpactBurst {
  id?: string;
  x: number;
  y: number;
  type: 'normal' | 'wide_multi_hit' | 'piercing_shatter' | 'iron_deflect' | 'arrow_clip';
  timer: number;
  maxTimer: number;
}

/**
 * Persisted save data stored in localStorage under 'townsaver_save_v1'.
 */
export interface SavedProgress {
  highScore: number;
  unlockedStage: number;
  seenPrologue?: boolean;
}

export type TownsaverSaveData = SavedProgress;

/**
 * Complete deterministic engine state snapshot returned by engine.getState().
 */
export interface GameState {
  status: GameStatus;
  stage: number;
  stageNumber: number;
  stageName: string;
  stageSubtitle: string;
  palette: TerrainPalette;
  terrainPalette: TerrainPalette;
  columns: number[];
  currentColumnIndex: number;
  adrianCol: number;
  adrianX: number;
  adrianY: number;
  adrianVx: number;
  adrianVy: number;
  targetAdrianX: number;
  targetAdrianY: number;
  adrianFacingAngle: number;
  adrianFacingDir: FacingDirection;
  adrianWalkTick: number;
  adrianInvulnTimer: number;
  aimCursorX: number | null;
  aimCursorY: number | null;
  useMouseAim: boolean;
  adrianFrame: AdrianFrameName;
  muzzleFlashTimer: number;
  muzzleFlashWeapon: WeaponType | 'none';
  activeWeapon: WeaponType;
  doubleAmmo: number;
  heavyAmmo: number;
  hearts: number;
  maxHearts: number;
  lostHearts: number;
  queenMood: QueenMood;
  queenMoodTimer: number;
  sanctum: SanctumState;
  story: StoryChapter;
  prologueIndex: number;
  seenPrologue: boolean;
  remainingRaiders: number;
  score: number;
  highScore: number;
  unlockedStage: number;
  arrows: ArrowEntity[];
  enemyProjectiles: EnemyProjectile[];
  pickups: PickupItem[];
  targets: TargetEntity[];
  hazards: HazardBlock[];
  particles: SpriteParticle[];
  bursts: ImpactBurst[];
  hitStopTimer: number;
  screenShakeTimer: number;
  screenShakeOffsetX: number;
  screenShakeOffsetY: number;
  heartFlashTimer: number;
  statusBanner: string | null;
  bannerTimer: number;
  queenCalloutText?: string | null;
  queenCalloutTimer?: number;
  lastFailReason: FailReason;
  stageClearTimer: number;
  breachResetTimer: number;
  flawlessStage: boolean;
  columnsClearedInStage: number;
  totalColumnsCleared: number;
  frameCount: number;
  stageTime: number;
  elapsedTime: number;
}

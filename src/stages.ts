/**
 * Townsaver: The Arrow Master — 15 Tactical Castle Maze Stages, Story Campaign & Endless Mode (v2.0)
 * Inspired by classic Nokia Arrow Master (Lv21 & Lv31):
 * - Staggered Blue-Iron Fortress Block mazes, twin vertical channels, and tactical cover pillars
 * - Destructible Wood Palisade Gates that open walkable shortcuts once shattered
 * - Siege Crates dropping collectible Double Shot Quivers, Great Arrow Quivers, and Heart Potions
 * - Aggressive Torch & Dagger Goblin Raiders, Swooping Purple Bats, Rotating Shield Wheels & Floor Spikes
 * - Opening 3-Slide Prologue Cutscene + 15 Unique Per-Stage Story Chapters leading to Queen Aurelia at the Top Sanctum!
 */

import {
  COLUMNS,
  HazardBlock,
  LodgedArrow,
  PickupKind,
  PrologueSlide,
  ShieldSegment,
  StageConfig,
  StoryChapter,
  TargetEntity,
  TargetKind,
  TerrainPalette,
} from './types';

export { COLUMNS };

export const TOTAL_HANDCRAFTED_STAGES = 15;
export const HANDCRAFTED_STAGE_COUNT = 15;

export const PROLOGUE_SLIDES: readonly PrologueSlide[] = [
  {
    slideNumber: 1,
    totalSlides: 3,
    heading: 'PROLOGUE I • FALL OF ELDORIA',
    caption: 'MIDNIGHT AT THE ROYAL CITADEL',
    lines: [
      'Under a blood-red moon, Warlord',
      'Grimgor and the Ironfang Horde',
      'breached the walls of Castle Eldoria.',
      'Goblins and night-bats seized every',
      'courtyard, hall, and watchtower.',
    ],
    accentColor: '#ef4444',
    sceneType: 'invasion',
  },
  {
    slideNumber: 2,
    totalSlides: 3,
    heading: 'PROLOGUE II • CAPTIVE IN THE KEEP',
    caption: 'QUEEN AURELIA IMPRISONED ABOVE',
    lines: [
      'Queen Aurelia was dragged up into',
      'the Royal Sanctums and locked behind',
      'enchanted iron portcullis gates.',
      'Only defeating every guard in a hall',
      'breaks the seal on her gate!',
    ],
    accentColor: '#a855f7',
    sceneType: 'captive_queen',
  },
  {
    slideNumber: 3,
    totalSlides: 3,
    heading: 'PROLOGUE III • THE ARROW MASTER',
    caption: 'ADRIAN TAKES UP THE ROYAL BOW',
    lines: [
      'Lone survivor of the Royal Guard,',
      'Adrian — The Arrow Master — enters',
      'the Outer Gate. Move in all directions,',
      'use iron blocks as cover, smash crates,',
      'and ascend to rescue Queen Aurelia!',
    ],
    accentColor: '#facc15',
    sceneType: 'arrow_master_oath',
  },
];

export const STAGE_TITLES: Record<
  number,
  { name: string; subtitle: string; palette: TerrainPalette }
> = {
  1: { name: 'MEADOW GATEWAY', subtitle: 'BREACH THE OUTER GATE & REACH THE QUEEN', palette: 'meadow' },
  2: { name: 'GOBLIN PATROL', subtitle: 'DODGE DAGGER THROWS IN THE STONE ALLEY', palette: 'courtyard' },
  3: { name: 'TIMBER BARRICADE', subtitle: 'CARVE A PATH THROUGH TRIPLE PALISADES', palette: 'fortress' },
  4: { name: 'BLUE-IRON CRAGS', subtitle: 'WEAVE BETWEEN SLIDING BLUE-IRON PILLARS', palette: 'meadow' },
  5: { name: 'PURPLE CAVERN', subtitle: 'BAILEY MAZE • INSPIRED BY ARROW MASTER LV21', palette: 'meadow' },
  6: { name: 'DUAL SIEGE', subtitle: 'LOOT THE SUPPLY CRATES UNDER CROSSFIRE', palette: 'courtyard' },
  7: { name: 'FLANKING HORDE', subtitle: 'OUTMANEUVER FOUR-CORNER RAIDER AMBUSHES', palette: 'courtyard' },
  8: { name: 'IRON FORTRESS', subtitle: 'TWIN IRON CHANNELS • ARROW MASTER LV31', palette: 'fortress' },
  9: { name: 'ROTATING REDOUBT', subtitle: 'FLANK THE SPINNING IRON SHIELD BASTIONS', palette: 'courtyard' },
  10: { name: 'SPLINTER CORRIDOR', subtitle: 'SHATTER SEALED GATES WITH GREAT ARROWS', palette: 'courtyard' },
  11: { name: 'BAT BARRAGE', subtitle: 'SURVIVE DIVING NIGHTWINGS IN THE BELFRY', palette: 'fortress' },
  12: { name: 'GARRISON SIEGE', subtitle: 'STORM THE IRONFANG BARRACKS STRONGHOLD', palette: 'fortress' },
  13: { name: 'RIVETED MAZE', subtitle: 'THREAD LABYRINTH SHIELDS & SPIKE TRAPS', palette: 'fortress' },
  14: { name: 'CHAOS COURTYARD', subtitle: 'BREAK THE ELITE THRONE ROOM GUARD', palette: 'courtyard' },
  15: { name: 'CITADEL LAST STAND', subtitle: 'LIBERATE CASTLE ELDORIA & SAVE THE QUEEN', palette: 'fortress' },
  16: { name: 'ENDLESS INVASION', subtitle: 'ENDLESS WAVE 1 • DEFEND RECLAIMED ELDORIA', palette: 'fortress' },
};

export const STAGE_NAMES: Record<number, string> = {
  1: 'MEADOW GATEWAY',
  2: 'GOBLIN PATROL',
  3: 'TIMBER BARRICADE',
  4: 'BLUE-IRON CRAGS',
  5: 'PURPLE CAVERN',
  6: 'DUAL SIEGE',
  7: 'FLANKING HORDE',
  8: 'IRON FORTRESS',
  9: 'ROTATING REDOUBT',
  10: 'SPLINTER CORRIDOR',
  11: 'BAT BARRAGE',
  12: 'GARRISON SIEGE',
  13: 'RIVETED MAZE',
  14: 'CHAOS COURTYARD',
  15: 'CITADEL LAST STAND',
  16: 'ENDLESS INVASION',
};

export const STORY_CHAPTERS: Record<number, StoryChapter> = {
  1: {
    stageNumber: 1,
    actTitle: 'ACT I • THE OUTER BAILEY',
    chapterTitle: 'CH.1 — MEADOW GATEWAY',
    briefingLines: [
      'Adrian slips past the burning drawbridge',
      'into the Outer Meadow Gatehouse.',
      'Ironfang scouts bar the path to the',
      'north balcony where Aurelia is held.',
    ],
    queenPlea: '"Adrian! Defeat the guards so my portcullis unlocks, then walk up to me!"',
    tacticalHint: 'MOVE: WASD/Arrows • AIM/SHOOT: Mouse Click or Space/5!',
    reunionQuote: '"You came for me! Hurry—goblin captains pull me up to the Courtyard!"',
  },
  2: {
    stageNumber: 2,
    actTitle: 'ACT I • THE OUTER BAILEY',
    chapterTitle: 'CH.2 — GOBLIN PATROL',
    briefingLines: [
      'Retreating horn-blasts echo across the',
      'cobblestones. Dagger-throwing goblins',
      'prowl behind twin stone pillars,',
      'hurling blades down the central lane.',
    ],
    queenPlea: '"Watch their thrown daggers, Adrian! Step behind iron blocks for cover!"',
    tacticalHint: 'TIP: Blue-Iron Blocks stop Goblin daggers & fireballs!',
    reunionQuote: '"Well dodged, my Arrow Master! The inner timber gate lies just ahead!"',
  },
  3: {
    stageNumber: 3,
    actTitle: 'ACT I • THE OUTER BAILEY',
    chapterTitle: 'CH.3 — TIMBER BARRICADE',
    briefingLines: [
      'The horde has lashed heavy oak palisades',
      'across every corridor of the gatehouse',
      'to trap Adrian in Torch Goblin crossfire.',
    ],
    queenPlea: '"Shatter a wooden palisade to carve a footpath straight up to my alcove!"',
    tacticalHint: 'TIP: Press [3] Great Arrow to obliterate Wood Palisades!',
    reunionQuote: '"No wall of wood can hold back the Royal Bow of Eldoria!"',
  },
  4: {
    stageNumber: 4,
    actTitle: 'ACT I • THE OUTER BAILEY',
    chapterTitle: 'CH.4 — BLUE-IRON CRAGS',
    briefingLines: [
      'Dwarven-forged Blue-Iron mechanisms',
      'slide across the garden terrace.',
      'A careless arrow against blue iron',
      'ricochets with deadly force!',
    ],
    queenPlea: '"Walk around the sliding Blue-Iron pillars for a clean flanking shot!"',
    tacticalHint: 'HAZARD: Hitting Blue-Iron deflects (-1 Heart). Flank in 2D!',
    reunionQuote: '"Brilliant footwork! One more bastion guards the Bailey exit!"',
  },
  5: {
    stageNumber: 5,
    actTitle: 'ACT I • THE OUTER BAILEY',
    chapterTitle: 'CH.5 — CAPTAIN OF THE BAILEY',
    briefingLines: [
      'The Bailey Keep rises ahead—a staggered',
      'fortress yard of iron blocks, crates,',
      'and swooping purple night-bats guarding',
      'the staircase to the Royal Courtyard.',
    ],
    queenPlea: '"Smash the Siege Crates, Adrian! They hold extra Double & Great Arrows!"',
    tacticalHint: 'LOOT: Walk over glowing Quivers & Hearts dropped by Crates!',
    reunionQuote: '"The Outer Bailey is ours! Onward to the Limestone Courtyard!"',
  },
  6: {
    stageNumber: 6,
    actTitle: 'ACT II • LIMESTONE COURTYARD',
    chapterTitle: 'CH.6 — DUAL SIEGE DEPOT',
    briefingLines: [
      'Inside the Sunken Courtyard, Grimgor’s',
      'raiders have stacked stolen royal',
      'munitions behind twin iron barricades.',
    ],
    queenPlea: '"Reclaim our stolen quivers from their crates and clear both alleys!"',
    tacticalHint: 'TIP: Your arrows can shoot Goblin daggers out of mid-air!',
    reunionQuote: '"With the royal quivers reclaimed, the horde begins to tremble!"',
  },
  7: {
    stageNumber: 7,
    actTitle: 'ACT II • LIMESTONE COURTYARD',
    chapterTitle: 'CH.7 — FLANKING HORDE',
    briefingLines: [
      'Ambush! Raiders pour from all four',
      'cloister arches while floor spikes line',
      'the outer courtyard alcoves.',
    ],
    queenPlea: '"Mind the steel floor spikes along the walls! Keep moving, Adrian!"',
    tacticalHint: 'HAZARD: Avoid stepping on metallic Floor Spikes (-1 Heart)!',
    reunionQuote: '"Four-way ambush defeated! You move like the wind itself!"',
  },
  8: {
    stageNumber: 8,
    actTitle: 'ACT II • LIMESTONE COURTYARD',
    chapterTitle: 'CH.8 — TWIN IRON CHANNELS',
    briefingLines: [
      'The Grand Hall features two towering',
      'vertical walls of Blue-Iron blocks,',
      'creating three narrow combat corridors',
      'teeming with bats and armored goblins.',
    ],
    queenPlea: '"Weave between the left, center, and right corridors to outflank them!"',
    tacticalHint: 'CLASSIC MAZE: Use the 3 vertical lanes & side gaps to flank!',
    reunionQuote: '"You mastered the Twin Iron Channels! The Bastion awaits!"',
  },
  9: {
    stageNumber: 9,
    actTitle: 'ACT II • LIMESTONE COURTYARD',
    chapterTitle: 'CH.9 — ROTATING REDOUBT',
    briefingLines: [
      'Clockwork Rotating Shield Wheels spin',
      'before the inner keep. Iron rims bounce',
      'arrows back, while oak rims splinter.',
    ],
    queenPlea: '"Move diagonally to shoot around the shield wheels, or shatter the wood!"',
    tacticalHint: '360° AIM: Move the Mouse to snipe enemies diagonally past shields!',
    reunionQuote: '"Their clockwork shields could not stop a true Arrow Master!"',
  },
  10: {
    stageNumber: 10,
    actTitle: 'ACT II • LIMESTONE COURTYARD',
    chapterTitle: 'CH.10 — SPLINTER CORRIDOR',
    briefingLines: [
      'At the Royal Stairwell, goblin engineers',
      'have sealed every arch with double-thick',
      'palisades and Torch Goblin squads.',
    ],
    queenPlea: '"Break the stairwell seal! Only the High Citadel remains above us!"',
    tacticalHint: 'PACE SHOTS: Do not clip your own slowed or lodged arrows!',
    reunionQuote: '"The Courtyard is liberated! Now we ascend the Twilight Citadel!"',
  },
  11: {
    stageNumber: 11,
    actTitle: 'ACT III • TWILIGHT CITADEL',
    chapterTitle: 'CH.11 — BELFRY BAT BARRAGE',
    briefingLines: [
      'Cold night wind howls through the high',
      'slate belfry. Flocks of giant cavern',
      'bats dive from the rafters above.',
    ],
    queenPlea: '"Press [2] Double Shot! Its twin spread sweeps swooping bats from the air!"',
    tacticalHint: 'WEAPON [2]: Double Shot excels against fast-moving Bats!',
    reunionQuote: '"The skies above the belfry are clear once more!"',
  },
  12: {
    stageNumber: 12,
    actTitle: 'ACT III • TWILIGHT CITADEL',
    chapterTitle: 'CH.12 — GARRISON SIEGE',
    briefingLines: [
      'We have reached the Ironfang Barracks.',
      'Armored helmeted goblins hold a dense',
      'four-quadrant bunker of iron and oak.',
    ],
    queenPlea: '"Use hit-and-run tactics between the bunker pillars, my brave knight!"',
    tacticalHint: 'TACTIC: Duck behind iron blocks right after firing a volley!',
    reunionQuote: '"Their elite garrison has fallen! Grimgor’s throne is close!"',
  },
  13: {
    stageNumber: 13,
    actTitle: 'ACT III • TWILIGHT CITADEL',
    chapterTitle: 'CH.13 — RIVETED MAZE',
    briefingLines: [
      'The Warlord’s Gauntlet combines spinning',
      'shield wheels, sliding iron crushers,',
      'and floor spikes in a tight labyrinth.',
    ],
    queenPlea: '"Patience and precision, Adrian! Every gap in the maze leads to me!"',
    tacticalHint: 'FLAWLESS BONUS: Clearing a stage unharmed grants +1 Heart!',
    reunionQuote: '"Incredible! Only the Throne Approach stands before the Crown Spire!"',
  },
  14: {
    stageNumber: 14,
    actTitle: 'ACT III • TWILIGHT CITADEL',
    chapterTitle: 'CH.14 — THRONE APPROACH',
    briefingLines: [
      'Before the gilded doors of the High',
      'Keep, Grimgor’s personal bodyguards',
      'unleash relentless volleys of fire and steel.',
    ],
    queenPlea: '"One final push! Break their line and we shall reclaim the Crown Spire!"',
    tacticalHint: 'STOCK UP: Collect crate pickups before the Stage 15 Finale!',
    reunionQuote: '"The Throne Doors burst open! Now—end the Ironfang Siege forever!"',
  },
  15: {
    stageNumber: 15,
    actTitle: 'FINALE • THE CROWN SPIRE',
    chapterTitle: 'CH.15 — CITADEL LAST STAND',
    briefingLines: [
      'Atop the Crown Spire, Warlord Grimgor’s',
      'War-Guard surrounds Queen Aurelia’s',
      'sanctum behind twin spinning shields.',
      'Defeat every raider and ascend to save',
      'the Queen and liberate Castle Eldoria!',
    ],
    queenPlea: '"For Eldoria! Strike true, Adrian, and bring peace back to our kingdom!"',
    tacticalHint: 'FINAL BATTLE: Defeat all guards & walk up to rescue Queen Aurelia!',
    reunionQuote: '"Castle Eldoria is saved! Hail Adrian, Royal Arrow Master of the Realm!"',
  },
};

export function getStoryChapter(stageNumber: number): StoryChapter {
  const s = Math.max(1, Math.floor(stageNumber));
  if (STORY_CHAPTERS[s]) {
    const ch = STORY_CHAPTERS[s];
    return { ...ch, briefingLines: [...ch.briefingLines] };
  }
  const wave = s - 15;
  return {
    stageNumber: s,
    actTitle: `EPILOGUE • ENDLESS DEFENSE`,
    chapterTitle: `WAVE ${wave} — RECLAIMED CITADEL`,
    briefingLines: [
      `Remnants of the Ironfang Horde launch`,
      `counter-attack Wave ${wave} against the`,
      `newly liberated halls of Eldoria!`,
    ],
    queenPlea: `"Hold the castle halls, Adrian! Once the wave falls, meet me at the Sanctum!"`,
    tacticalHint: `ENDLESS WAVE ${wave}: Escalating raider speed & high-score glory!`,
    reunionQuote: `"Wave ${wave} repelled! Eldoria stands unbroken thanks to you!"`,
  };
}

const TARGET_DIMENSIONS: Record<
  TargetKind,
  { width: number; height: number; defaultHp: number; points: number }
> = {
  bat: { width: 20, height: 14, defaultHp: 1, points: 60 },
  goblin_torch: { width: 18, height: 20, defaultHp: 2, points: 120 },
  goblin_dagger: { width: 18, height: 20, defaultHp: 2, points: 120 },
  crate: { width: 20, height: 18, defaultHp: 2, points: 85 },
  palisade: { width: 24, height: 18, defaultHp: 2, points: 40 },
};

interface TargetSeed {
  id: string;
  kind: TargetKind;
  columnIndex: number;
  y: number;
  x?: number;
  hp?: number;
  maxHp?: number;
  vx?: number;
  patrolSpan?: number;
  attackInterval?: number;
  dropKind?: PickupKind;
  staggerTimer?: number;
  broken?: boolean;
  lodgedArrows?: LodgedArrow[];
}

function makeTarget(seed: TargetSeed): TargetEntity {
  const meta = TARGET_DIMENSIONS[seed.kind];
  const centerX = seed.x ?? COLUMNS[seed.columnIndex] ?? 30;
  const maxHp = seed.maxHp ?? meta.defaultHp;
  const hp = seed.hp ?? maxHp;
  const broken = seed.broken ?? (seed.kind === 'palisade' && hp <= 0);
  const defaultSpan =
    seed.kind === 'goblin_torch' || seed.kind === 'goblin_dagger'
      ? 12
      : seed.kind === 'bat'
      ? 14
      : seed.kind === 'crate'
      ? 0
      : 0;
  const span = seed.patrolSpan ?? defaultSpan;
  const defaultVx =
    seed.kind === 'goblin_torch' || seed.kind === 'goblin_dagger'
      ? 22
      : seed.kind === 'bat'
      ? 24
      : 0;

  const defaultDrop: PickupKind | undefined =
    seed.kind === 'crate'
      ? seed.dropKind ??
        (seed.columnIndex % 3 === 0
          ? 'double_ammo'
          : seed.columnIndex % 3 === 1
          ? 'heavy_ammo'
          : 'heart')
      : undefined;

  return {
    id: seed.id,
    kind: seed.kind,
    type: seed.kind,
    columnIndex: seed.columnIndex,
    x: centerX,
    y: seed.y,
    baseY: seed.y,
    width: meta.width,
    height: meta.height,
    hp,
    maxHp,
    patrolMinX: Math.max(16, centerX - span),
    patrolMaxX: Math.min(224, centerX + span),
    vx: seed.vx ?? defaultVx,
    attackInterval:
      seed.attackInterval ??
      (seed.kind === 'goblin_dagger' ? 2.5 : seed.kind === 'goblin_torch' ? 2.9 : 0),
    attackCooldown: 1.1 + (seed.columnIndex % 4) * 0.45,
    dropKind: defaultDrop,
    swoopPhase: seed.columnIndex * 1.1,
    staggerTimer: seed.staggerTimer ?? 0,
    flashTimer: 0,
    broken,
    active: seed.kind === 'palisade' ? true : hp > 0,
    lodgedArrows: seed.lodgedArrows ? seed.lodgedArrows.map((la) => ({ ...la })) : [],
    points: meta.points,
    requiredForClear: seed.kind !== 'palisade' && seed.kind !== 'crate',
  };
}

export function createDefaultShieldSegments(): ShieldSegment[] {
  return [
    { type: 'iron', startAngle: 0, endAngle: Math.PI * 0.42, hp: 99, maxHp: 99 },
    { type: 'wood', startAngle: Math.PI * 0.5, endAngle: Math.PI * 0.92, hp: 2, maxHp: 2 },
    { type: 'iron', startAngle: Math.PI, endAngle: Math.PI * 1.42, hp: 99, maxHp: 99 },
    { type: 'wood', startAngle: Math.PI * 1.5, endAngle: Math.PI * 1.92, hp: 2, maxHp: 2 },
  ];
}

function makeIronBlock(
  id: string,
  columnIndex: number,
  y: number,
  oscillateSpeed = 0,
  oscillatePhase = 0,
  oscillateAmplitude = 0,
  customX?: number
): HazardBlock {
  const baseX = customX ?? COLUMNS[columnIndex] ?? 90;
  return {
    id,
    kind: 'iron_block',
    type: 'iron_block',
    columnIndex,
    x: baseX,
    y,
    baseX,
    width: 20,
    height: 18,
    radius: 0,
    angle: 0,
    angularSpeed: 0,
    oscillateAmplitude,
    oscillateSpeed,
    oscillatePhase,
    segments: [],
    lodgedArrows: [],
    sparkTimer: 0,
    flashTimer: 0,
  };
}

function makeRotatingShield(
  id: string,
  columnIndex: number,
  y: number,
  angularSpeed = 1.6,
  initialAngle = 0,
  customX?: number
): HazardBlock {
  const baseX = customX ?? COLUMNS[columnIndex] ?? 150;
  return {
    id,
    kind: 'rotating_shield',
    type: 'rotating_shield',
    columnIndex,
    x: baseX,
    y,
    baseX,
    width: 28,
    height: 28,
    radius: 14,
    angle: initialAngle,
    angularSpeed,
    oscillateAmplitude: 0,
    oscillateSpeed: 0,
    oscillatePhase: 0,
    segments: createDefaultShieldSegments(),
    lodgedArrows: [],
    sparkTimer: 0,
    flashTimer: 0,
  };
}

function makeFloorSpike(
  id: string,
  columnIndex: number,
  x: number,
  y: number,
  width = 24
): HazardBlock {
  return {
    id,
    kind: 'floor_spike',
    type: 'floor_spike',
    columnIndex,
    x,
    y,
    baseX: x,
    width,
    height: 10,
    radius: 0,
    angle: 0,
    angularSpeed: 0,
    oscillateAmplitude: 0,
    oscillateSpeed: 0,
    oscillatePhase: 0,
    segments: [],
    lodgedArrows: [],
    sparkTimer: 0,
    flashTimer: 0,
  };
}

function buildHandcraftedStage(stageNumber: number): StageConfig {
  const info = STAGE_TITLES[stageNumber] ?? STAGE_TITLES[1];
  const story = getStoryChapter(stageNumber);

  switch (stageNumber) {
    // STAGE 1: Outer Meadow Gatehouse — Palisade gates, cover block, scouting Goblins & Bats
    case 1:
      return {
        stageNumber: 1,
        name: info.name,
        subtitle: info.subtitle,
        palette: info.palette,
        columns: [30, 90, 150, 210],
        startingDoubleAmmo: 5,
        startingHeavyAmmo: 2,
        spawnX: 120,
        spawnY: 282,
        story,
        targets: [
          makeTarget({ id: 's1_bat_c0', kind: 'bat', columnIndex: 0, y: 68, vx: 18 }),
          makeTarget({ id: 's1_gob_c0', kind: 'goblin_torch', columnIndex: 0, y: 112, vx: 16 }),
          makeTarget({ id: 's1_pal_c0', kind: 'palisade', columnIndex: 0, y: 212, broken: false }),

          makeTarget({ id: 's1_gob_c1', kind: 'goblin_dagger', columnIndex: 1, y: 102, vx: -18 }),
          makeTarget({ id: 's1_crt_c1', kind: 'crate', columnIndex: 1, y: 158, dropKind: 'double_ammo' }),

          makeTarget({ id: 's1_bat_c2', kind: 'bat', columnIndex: 2, y: 72, vx: -20 }),
          makeTarget({ id: 's1_pal_c2', kind: 'palisade', columnIndex: 2, y: 196, broken: false }),

          makeTarget({ id: 's1_gob_c3', kind: 'goblin_torch', columnIndex: 3, y: 112, vx: -16 }),
        ],
        hazards: [
          // Tactical cover block offset at x=62 so lanes [30,90,150,210] stay open while giving 2D cover!
          makeIronBlock('s1_cover_mid', 1, 196, 0, 0, 0, 62),
          makeIronBlock('s1_cover_right', 2, 150, 0, 0, 0, 180),
        ],
      };

    // STAGE 2: Goblin Patrol — Courtyard Alley with Dagger & Torch Goblins and cover pillars
    case 2:
      return {
        stageNumber: 2,
        name: info.name,
        subtitle: info.subtitle,
        palette: info.palette,
        columns: [30, 90, 150, 210],
        startingDoubleAmmo: 5,
        startingHeavyAmmo: 2,
        spawnX: 120,
        spawnY: 282,
        story,
        targets: [
          makeTarget({ id: 's2_gob1_c0', kind: 'goblin_torch', columnIndex: 0, y: 82, vx: 20 }),
          makeTarget({ id: 's2_gob2_c0', kind: 'goblin_dagger', columnIndex: 0, y: 150, vx: -20 }),

          makeTarget({ id: 's2_bat_c1', kind: 'bat', columnIndex: 1, y: 70, vx: 24 }),
          makeTarget({ id: 's2_gob_c1', kind: 'goblin_dagger', columnIndex: 1, y: 118, vx: 20 }),
          makeTarget({ id: 's2_pal_c1', kind: 'palisade', columnIndex: 1, y: 208, broken: false }),

          makeTarget({ id: 's2_gob_c2', kind: 'goblin_torch', columnIndex: 2, y: 108, vx: -22 }),
          makeTarget({ id: 's2_crt_c2', kind: 'crate', columnIndex: 2, y: 164, dropKind: 'heavy_ammo' }),

          makeTarget({ id: 's2_bat_c3', kind: 'bat', columnIndex: 3, y: 74, vx: -24 }),
          makeTarget({ id: 's2_gob_c3', kind: 'goblin_dagger', columnIndex: 3, y: 132, vx: 18 }),
        ],
        hazards: [
          makeIronBlock('s2_pillar_l', 1, 168, 0, 0, 0, 64),
          makeIronBlock('s2_pillar_r', 2, 208, 0, 0, 0, 178),
        ],
      };

    // STAGE 3: Timber Barricade — Triple Palisade Gate Labyrinth
    case 3:
      return {
        stageNumber: 3,
        name: info.name,
        subtitle: info.subtitle,
        palette: info.palette,
        columns: [30, 90, 150, 210],
        startingDoubleAmmo: 5,
        startingHeavyAmmo: 3,
        spawnX: 120,
        spawnY: 282,
        story,
        targets: [
          makeTarget({ id: 's3_gob_c0', kind: 'goblin_torch', columnIndex: 0, y: 88 }),
          makeTarget({ id: 's3_pal1_c0', kind: 'palisade', columnIndex: 0, y: 156, broken: false }),
          makeTarget({ id: 's3_pal2_c0', kind: 'palisade', columnIndex: 0, y: 214, broken: false }),

          makeTarget({ id: 's3_bat_c1', kind: 'bat', columnIndex: 1, y: 68 }),
          makeTarget({ id: 's3_gob_c1', kind: 'goblin_dagger', columnIndex: 1, y: 112 }),
          makeTarget({ id: 's3_pal_c1', kind: 'palisade', columnIndex: 1, y: 186, broken: false }),

          makeTarget({ id: 's3_gob_c2', kind: 'goblin_torch', columnIndex: 2, y: 98 }),
          makeTarget({ id: 's3_crt_c2', kind: 'crate', columnIndex: 2, y: 152, dropKind: 'heavy_ammo' }),
          makeTarget({ id: 's3_pal_c2', kind: 'palisade', columnIndex: 2, y: 214, broken: false }),

          makeTarget({ id: 's3_bat_c3', kind: 'bat', columnIndex: 3, y: 72 }),
          makeTarget({ id: 's3_gob_c3', kind: 'goblin_dagger', columnIndex: 3, y: 122 }),
          makeTarget({ id: 's3_pal_c3', kind: 'palisade', columnIndex: 3, y: 186, broken: false }),
        ],
        hazards: [
          makeIronBlock('s3_wall_1', 1, 148, 0, 0, 0, 62),
          makeIronBlock('s3_wall_2', 2, 186, 0, 0, 0, 180),
        ],
      };

    // STAGE 4: Blue-Iron Crags — Oscillating Blue-Iron Pillars
    case 4:
      return {
        stageNumber: 4,
        name: info.name,
        subtitle: info.subtitle,
        palette: info.palette,
        columns: [30, 90, 150, 210],
        startingDoubleAmmo: 5,
        startingHeavyAmmo: 3,
        spawnX: 120,
        spawnY: 282,
        story,
        targets: [
          makeTarget({ id: 's4_bat_c0', kind: 'bat', columnIndex: 0, y: 68 }),
          makeTarget({ id: 's4_gob_c0', kind: 'goblin_dagger', columnIndex: 0, y: 110 }),

          makeTarget({ id: 's4_gob_c1', kind: 'goblin_torch', columnIndex: 1, y: 92 }),
          makeTarget({ id: 's4_crt_c1', kind: 'crate', columnIndex: 1, y: 138, dropKind: 'heart' }),

          makeTarget({ id: 's4_bat_c2', kind: 'bat', columnIndex: 2, y: 72 }),
          makeTarget({ id: 's4_gob_c2', kind: 'goblin_dagger', columnIndex: 2, y: 114 }),

          makeTarget({ id: 's4_gob_c3', kind: 'goblin_torch', columnIndex: 3, y: 96 }),
          makeTarget({ id: 's4_pal_c3', kind: 'palisade', columnIndex: 3, y: 214, broken: false }),
        ],
        hazards: [
          makeIronBlock('s4_iron_c0', 0, 174, 1.8, 0.0, 20),
          makeIronBlock('s4_iron_c1', 1, 196, 1.9, 1.2, 20),
          makeIronBlock('s4_iron_c2', 2, 174, 1.8, 2.4, 20),
        ],
      };

    // STAGE 5: Captain of the Bailey — Inspired by Nokia Arrow Master Lv21 (arrow_master.jpeg)
    case 5:
      return {
        stageNumber: 5,
        name: info.name,
        subtitle: info.subtitle,
        palette: info.palette,
        columns: [30, 90, 150, 210],
        startingDoubleAmmo: 6,
        startingHeavyAmmo: 3,
        spawnX: 120,
        spawnY: 282,
        story,
        targets: [
          makeTarget({ id: 's5_crt_c0', kind: 'crate', columnIndex: 0, y: 72, dropKind: 'double_ammo' }),
          makeTarget({ id: 's5_bat_c0', kind: 'bat', columnIndex: 0, y: 114, vx: 26 }),
          makeTarget({ id: 's5_gob_c0', kind: 'goblin_dagger', columnIndex: 0, y: 162 }),

          makeTarget({ id: 's5_bat_c1', kind: 'bat', columnIndex: 1, y: 76, vx: -24 }),
          makeTarget({ id: 's5_gob_c1', kind: 'goblin_torch', columnIndex: 1, y: 124 }),
          makeTarget({ id: 's5_pal_c1', kind: 'palisade', columnIndex: 1, y: 214, broken: false }),

          makeTarget({ id: 's5_bat_c2', kind: 'bat', columnIndex: 2, y: 76, vx: 24 }),
          makeTarget({ id: 's5_gob_c2', kind: 'goblin_dagger', columnIndex: 2, y: 124 }),
          makeTarget({ id: 's5_pal_c2', kind: 'palisade', columnIndex: 2, y: 214, broken: false }),

          makeTarget({ id: 's5_crt_c3', kind: 'crate', columnIndex: 3, y: 72, dropKind: 'heavy_ammo' }),
          makeTarget({ id: 's5_gob_c3', kind: 'goblin_torch', columnIndex: 3, y: 152 }),
        ],
        hazards: [
          // Staggered static & oscillating Blue-Iron Maze Blocks matching Lv21!
          makeIronBlock('s5_maze_1', 0, 206, 1.7, 0.4, 18),
          makeIronBlock('s5_maze_2', 1, 168, 0, 0, 0, 62),
          makeIronBlock('s5_maze_3', 2, 168, 0, 0, 0, 178),
          makeIronBlock('s5_maze_4', 3, 206, 1.7, 1.9, 18),
        ],
      };

    // STAGE 6: Dual Siege Depot — Fortified Supply Crates & Crossfire Goblins
    case 6:
      return {
        stageNumber: 6,
        name: info.name,
        subtitle: info.subtitle,
        palette: info.palette,
        columns: [30, 90, 150, 210],
        startingDoubleAmmo: 6,
        startingHeavyAmmo: 3,
        spawnX: 120,
        spawnY: 282,
        story,
        targets: [
          makeTarget({ id: 's6_gob_c0', kind: 'goblin_torch', columnIndex: 0, y: 84 }),
          makeTarget({ id: 's6_crt_c0', kind: 'crate', columnIndex: 0, y: 136, dropKind: 'double_ammo' }),
          makeTarget({ id: 's6_pal_c0', kind: 'palisade', columnIndex: 0, y: 210, broken: false }),

          makeTarget({ id: 's6_bat_c1', kind: 'bat', columnIndex: 1, y: 70 }),
          makeTarget({ id: 's6_gob_c1', kind: 'goblin_dagger', columnIndex: 1, y: 116 }),

          makeTarget({ id: 's6_bat_c2', kind: 'bat', columnIndex: 2, y: 70 }),
          makeTarget({ id: 's6_gob_c2', kind: 'goblin_torch', columnIndex: 2, y: 116 }),

          makeTarget({ id: 's6_gob_c3', kind: 'goblin_dagger', columnIndex: 3, y: 84 }),
          makeTarget({ id: 's6_crt_c3', kind: 'crate', columnIndex: 3, y: 136, dropKind: 'heavy_ammo' }),
          makeTarget({ id: 's6_pal_c3', kind: 'palisade', columnIndex: 3, y: 210, broken: false }),
        ],
        hazards: [
          makeIronBlock('s6_iron_c1', 1, 176, 1.9, 0.3, 20),
          makeIronBlock('s6_iron_c2', 2, 176, 1.9, 2.1, 20),
        ],
      };

    // STAGE 7: Flanking Horde — Four-Corner Raider Ambush + Perimeter Floor Spikes
    case 7:
      return {
        stageNumber: 7,
        name: info.name,
        subtitle: info.subtitle,
        palette: info.palette,
        columns: [30, 90, 150, 210],
        startingDoubleAmmo: 6,
        startingHeavyAmmo: 3,
        spawnX: 120,
        spawnY: 282,
        story,
        targets: [
          makeTarget({ id: 's7_bat_c0', kind: 'bat', columnIndex: 0, y: 68 }),
          makeTarget({ id: 's7_gob_c0', kind: 'goblin_dagger', columnIndex: 0, y: 120, vx: 26 }),

          makeTarget({ id: 's7_gob_c1', kind: 'goblin_torch', columnIndex: 1, y: 88, vx: -24 }),
          makeTarget({ id: 's7_pal_c1', kind: 'palisade', columnIndex: 1, y: 196, broken: false }),

          makeTarget({ id: 's7_gob_c2', kind: 'goblin_dagger', columnIndex: 2, y: 88, vx: 24 }),
          makeTarget({ id: 's7_crt_c2', kind: 'crate', columnIndex: 2, y: 146, dropKind: 'heart' }),

          makeTarget({ id: 's7_bat_c3', kind: 'bat', columnIndex: 3, y: 68 }),
          makeTarget({ id: 's7_gob_c3', kind: 'goblin_torch', columnIndex: 3, y: 120, vx: -26 }),
        ],
        hazards: [
          makeIronBlock('s7_pillar_l', 1, 150, 0, 0, 0, 62),
          makeIronBlock('s7_pillar_r', 2, 196, 0, 0, 0, 178),
          makeFloorSpike('s7_spike_l', 0, 30, 248, 24),
          makeFloorSpike('s7_spike_r', 3, 210, 248, 24),
        ],
      };

    // STAGE 8: Twin Iron Channels — Directly Modeled on Nokia Arrow Master Lv31 (arrowmaster2.jpeg)!
    case 8:
      return {
        stageNumber: 8,
        name: info.name,
        subtitle: info.subtitle,
        palette: info.palette,
        columns: [30, 90, 150, 210],
        startingDoubleAmmo: 6,
        startingHeavyAmmo: 3,
        spawnX: 120,
        spawnY: 282,
        story,
        targets: [
          makeTarget({ id: 's8_bat_c0', kind: 'bat', columnIndex: 0, y: 74, vx: 18 }),
          makeTarget({ id: 's8_gob_c0', kind: 'goblin_dagger', columnIndex: 0, y: 128, vx: 18 }),
          makeTarget({ id: 's8_pal_c0', kind: 'palisade', columnIndex: 0, y: 206, broken: false }),

          makeTarget({ id: 's8_gob_c1', kind: 'goblin_torch', columnIndex: 1, y: 82, vx: -20 }),
          makeTarget({ id: 's8_bat_c1', kind: 'bat', columnIndex: 1, y: 144, vx: 22 }),

          makeTarget({ id: 's8_bat_c2', kind: 'bat', columnIndex: 2, y: 82, vx: -22 }),
          makeTarget({ id: 's8_gob_c2', kind: 'goblin_dagger', columnIndex: 2, y: 144, vx: 20 }),
          makeTarget({ id: 's8_pal_c2', kind: 'palisade', columnIndex: 2, y: 206, broken: false }),

          makeTarget({ id: 's8_gob_c3', kind: 'goblin_torch', columnIndex: 3, y: 92, vx: -18 }),
          makeTarget({ id: 's8_crt_c3', kind: 'crate', columnIndex: 3, y: 152, dropKind: 'double_ammo' }),
        ],
        hazards: [
          // Twin Vertical Blue-Iron Channels at x = 62 and x = 178 with side-infiltration gaps!
          makeIronBlock('s8_ch_l1', 1, 96, 0, 0, 0, 62),
          makeIronBlock('s8_ch_l2', 1, 136, 0, 0, 0, 62),
          makeIronBlock('s8_ch_l3', 1, 186, 0, 0, 0, 62),
          makeIronBlock('s8_ch_r1', 2, 96, 0, 0, 0, 178),
          makeIronBlock('s8_ch_r2', 2, 136, 0, 0, 0, 178),
          makeIronBlock('s8_ch_r3', 2, 186, 0, 0, 0, 178),
          makeFloorSpike('s8_spike_l', 0, 30, 250, 24),
          makeFloorSpike('s8_spike_r', 3, 210, 250, 24),
        ],
      };

    // STAGE 9: Rotating Redoubt — Spinning Shield Wheels & Flanking Lanes
    case 9:
      return {
        stageNumber: 9,
        name: info.name,
        subtitle: info.subtitle,
        palette: info.palette,
        columns: [30, 90, 150, 210],
        startingDoubleAmmo: 6,
        startingHeavyAmmo: 3,
        spawnX: 120,
        spawnY: 282,
        story,
        targets: [
          makeTarget({ id: 's9_gob_c0', kind: 'goblin_torch', columnIndex: 0, y: 84 }),
          makeTarget({ id: 's9_bat_c1', kind: 'bat', columnIndex: 1, y: 70 }),
          makeTarget({ id: 's9_gob_c1', kind: 'goblin_dagger', columnIndex: 1, y: 112 }),
          makeTarget({ id: 's9_gob_c2', kind: 'goblin_torch', columnIndex: 2, y: 92 }),
          makeTarget({ id: 's9_crt_c2', kind: 'crate', columnIndex: 2, y: 146, dropKind: 'heavy_ammo' }),
          makeTarget({ id: 's9_bat_c3', kind: 'bat', columnIndex: 3, y: 72 }),
          makeTarget({ id: 's9_gob_c3', kind: 'goblin_dagger', columnIndex: 3, y: 116 }),
        ],
        hazards: [
          makeRotatingShield('s9_shield_c0', 0, 156, 1.7, 0.0),
          makeIronBlock('s9_cover_mid', 1, 198, 0, 0, 0, 120),
          makeRotatingShield('s9_shield_c3', 3, 168, -1.7, 1.2),
        ],
      };

    // STAGE 10: Splinter Corridor — Sealed Royal Stairwell
    case 10:
      return {
        stageNumber: 10,
        name: info.name,
        subtitle: info.subtitle,
        palette: info.palette,
        columns: [30, 90, 150, 210],
        startingDoubleAmmo: 6,
        startingHeavyAmmo: 4,
        spawnX: 120,
        spawnY: 282,
        story,
        targets: [
          makeTarget({ id: 's10_bat_c0', kind: 'bat', columnIndex: 0, y: 68 }),
          makeTarget({ id: 's10_gob_c0', kind: 'goblin_torch', columnIndex: 0, y: 112 }),
          makeTarget({ id: 's10_pal_c0', kind: 'palisade', columnIndex: 0, y: 204, broken: false }),

          makeTarget({ id: 's10_gob_c1', kind: 'goblin_dagger', columnIndex: 1, y: 88 }),
          makeTarget({ id: 's10_crt_c1', kind: 'crate', columnIndex: 1, y: 142, dropKind: 'heavy_ammo' }),
          makeTarget({ id: 's10_pal_c1', kind: 'palisade', columnIndex: 1, y: 204, broken: false }),

          makeTarget({ id: 's10_gob_c2', kind: 'goblin_torch', columnIndex: 2, y: 88 }),
          makeTarget({ id: 's10_pal_c2', kind: 'palisade', columnIndex: 2, y: 204, broken: false }),

          makeTarget({ id: 's10_bat_c3', kind: 'bat', columnIndex: 3, y: 68 }),
          makeTarget({ id: 's10_gob_c3', kind: 'goblin_dagger', columnIndex: 3, y: 112 }),
          makeTarget({ id: 's10_pal_c3', kind: 'palisade', columnIndex: 3, y: 204, broken: false }),
        ],
        hazards: [
          makeIronBlock('s10_iron_c1', 1, 172, 2.0, 0.4, 20),
          makeIronBlock('s10_iron_c2', 2, 156, 2.0, 2.0, 20),
        ],
      };

    // STAGE 11: Belfry Bat Barrage — Swooping Nightwings & Fortress Cover
    case 11:
      return {
        stageNumber: 11,
        name: info.name,
        subtitle: info.subtitle,
        palette: info.palette,
        columns: [30, 90, 150, 210],
        startingDoubleAmmo: 7,
        startingHeavyAmmo: 3,
        spawnX: 120,
        spawnY: 282,
        story,
        targets: [
          makeTarget({ id: 's11_bat1_c0', kind: 'bat', columnIndex: 0, y: 68, vx: 30 }),
          makeTarget({ id: 's11_bat2_c0', kind: 'bat', columnIndex: 0, y: 118, vx: -28 }),

          makeTarget({ id: 's11_bat_c1', kind: 'bat', columnIndex: 1, y: 74, vx: -30 }),
          makeTarget({ id: 's11_gob_c1', kind: 'goblin_dagger', columnIndex: 1, y: 126, vx: 24 }),

          makeTarget({ id: 's11_bat_c2', kind: 'bat', columnIndex: 2, y: 74, vx: 30 }),
          makeTarget({ id: 's11_gob_c2', kind: 'goblin_torch', columnIndex: 2, y: 126, vx: -24 }),
          makeTarget({ id: 's11_crt_c2', kind: 'crate', columnIndex: 2, y: 176, dropKind: 'double_ammo' }),

          makeTarget({ id: 's11_bat1_c3', kind: 'bat', columnIndex: 3, y: 68, vx: -30 }),
          makeTarget({ id: 's11_bat2_c3', kind: 'bat', columnIndex: 3, y: 118, vx: 28 }),
        ],
        hazards: [
          makeIronBlock('s11_iron_l', 0, 174, 2.1, 0.2, 20),
          makeIronBlock('s11_iron_m', 1, 206, 0, 0, 0, 120),
          makeIronBlock('s11_iron_r', 3, 174, 2.1, 1.8, 20),
        ],
      };

    // STAGE 12: Garrison Siege — 4-Quadrant Bunker Stronghold
    case 12:
      return {
        stageNumber: 12,
        name: info.name,
        subtitle: info.subtitle,
        palette: info.palette,
        columns: [30, 90, 150, 210],
        startingDoubleAmmo: 6,
        startingHeavyAmmo: 4,
        spawnX: 120,
        spawnY: 282,
        story,
        targets: [
          makeTarget({ id: 's12_gob1_c0', kind: 'goblin_torch', columnIndex: 0, y: 80 }),
          makeTarget({ id: 's12_gob2_c0', kind: 'goblin_dagger', columnIndex: 0, y: 134 }),
          makeTarget({ id: 's12_pal_c0', kind: 'palisade', columnIndex: 0, y: 208, broken: false }),

          makeTarget({ id: 's12_bat_c1', kind: 'bat', columnIndex: 1, y: 68 }),
          makeTarget({ id: 's12_gob_c1', kind: 'goblin_dagger', columnIndex: 1, y: 114 }),
          makeTarget({ id: 's12_crt_c1', kind: 'crate', columnIndex: 1, y: 164, dropKind: 'heart' }),

          makeTarget({ id: 's12_bat_c2', kind: 'bat', columnIndex: 2, y: 68 }),
          makeTarget({ id: 's12_gob_c2', kind: 'goblin_torch', columnIndex: 2, y: 114 }),

          makeTarget({ id: 's12_gob1_c3', kind: 'goblin_dagger', columnIndex: 3, y: 80 }),
          makeTarget({ id: 's12_gob2_c3', kind: 'goblin_torch', columnIndex: 3, y: 134 }),
          makeTarget({ id: 's12_pal_c3', kind: 'palisade', columnIndex: 3, y: 208, broken: false }),
        ],
        hazards: [
          makeIronBlock('s12_bunker_l', 1, 146, 0, 0, 0, 62),
          makeRotatingShield('s12_shield_c2', 2, 172, 1.9, 0.5),
          makeIronBlock('s12_bunker_r', 2, 146, 0, 0, 0, 178),
          makeFloorSpike('s12_spike_l', 0, 30, 250, 24),
          makeFloorSpike('s12_spike_r', 3, 210, 250, 24),
        ],
      };

    // STAGE 13: Riveted Maze — Labyrinth of Shields, Iron & Spikes
    case 13:
      return {
        stageNumber: 13,
        name: info.name,
        subtitle: info.subtitle,
        palette: info.palette,
        columns: [30, 90, 150, 210],
        startingDoubleAmmo: 6,
        startingHeavyAmmo: 4,
        spawnX: 120,
        spawnY: 282,
        story,
        targets: [
          makeTarget({ id: 's13_bat_c0', kind: 'bat', columnIndex: 0, y: 68 }),
          makeTarget({ id: 's13_gob_c0', kind: 'goblin_dagger', columnIndex: 0, y: 112 }),

          makeTarget({ id: 's13_gob_c1', kind: 'goblin_torch', columnIndex: 1, y: 80 }),
          makeTarget({ id: 's13_crt_c1', kind: 'crate', columnIndex: 1, y: 126, dropKind: 'double_ammo' }),

          makeTarget({ id: 's13_gob_c2', kind: 'goblin_dagger', columnIndex: 2, y: 80 }),
          makeTarget({ id: 's13_crt_c2', kind: 'crate', columnIndex: 2, y: 126, dropKind: 'heavy_ammo' }),

          makeTarget({ id: 's13_bat_c3', kind: 'bat', columnIndex: 3, y: 68 }),
          makeTarget({ id: 's13_gob_c3', kind: 'goblin_torch', columnIndex: 3, y: 112 }),
          makeTarget({ id: 's13_pal_c3', kind: 'palisade', columnIndex: 3, y: 212, broken: false }),
        ],
        hazards: [
          makeRotatingShield('s13_shield_c0', 0, 166, 2.0, 0.0),
          makeIronBlock('s13_iron_c1', 1, 178, 2.1, 0.7, 22),
          makeRotatingShield('s13_shield_c2', 2, 166, -2.0, 1.4),
          makeIronBlock('s13_iron_c3', 3, 166, 2.1, 2.1, 22),
          makeFloorSpike('s13_spike_mid', 1, 62, 248, 18),
        ],
      };

    // STAGE 14: Throne Approach — Elite Royal Courtyard Counterattack
    case 14:
      return {
        stageNumber: 14,
        name: info.name,
        subtitle: info.subtitle,
        palette: info.palette,
        columns: [30, 90, 150, 210],
        startingDoubleAmmo: 7,
        startingHeavyAmmo: 4,
        spawnX: 120,
        spawnY: 282,
        story,
        targets: [
          makeTarget({ id: 's14_bat_c0', kind: 'bat', columnIndex: 0, y: 68 }),
          makeTarget({ id: 's14_gob_c0', kind: 'goblin_torch', columnIndex: 0, y: 108 }),
          makeTarget({ id: 's14_crt_c0', kind: 'crate', columnIndex: 0, y: 152, dropKind: 'heart' }),
          makeTarget({ id: 's14_pal_c0', kind: 'palisade', columnIndex: 0, y: 210, broken: false }),

          makeTarget({ id: 's14_gob1_c1', kind: 'goblin_dagger', columnIndex: 1, y: 76, hp: 3, maxHp: 3 }),
          makeTarget({ id: 's14_gob2_c1', kind: 'goblin_torch', columnIndex: 1, y: 122 }),
          makeTarget({ id: 's14_pal_c1', kind: 'palisade', columnIndex: 1, y: 210, broken: false }),

          makeTarget({ id: 's14_bat_c2', kind: 'bat', columnIndex: 2, y: 68 }),
          makeTarget({ id: 's14_gob_c2', kind: 'goblin_dagger', columnIndex: 2, y: 112, hp: 3, maxHp: 3 }),

          makeTarget({ id: 's14_gob_c3', kind: 'goblin_torch', columnIndex: 3, y: 80 }),
          makeTarget({ id: 's14_crt_c3', kind: 'crate', columnIndex: 3, y: 132, dropKind: 'heavy_ammo' }),
          makeTarget({ id: 's14_pal_c3', kind: 'palisade', columnIndex: 3, y: 210, broken: false }),
        ],
        hazards: [
          makeIronBlock('s14_iron_c1', 1, 168, 2.15, 0.5, 22),
          makeRotatingShield('s14_shield_c2', 2, 168, 2.1, 1.1),
          makeIronBlock('s14_iron_c3', 3, 174, 2.15, 2.2, 22),
          makeFloorSpike('s14_spike_l', 0, 30, 250, 24),
          makeFloorSpike('s14_spike_r', 3, 210, 250, 24),
        ],
      };

    // STAGE 15: Citadel Last Stand (FINALE) — Warlord Grimgor's Crown Spire Guard
    case 15:
    default:
      return {
        stageNumber: 15,
        name: STAGE_TITLES[15].name,
        subtitle: STAGE_TITLES[15].subtitle,
        palette: STAGE_TITLES[15].palette,
        columns: [30, 90, 150, 210],
        startingDoubleAmmo: 8,
        startingHeavyAmmo: 5,
        spawnX: 120,
        spawnY: 282,
        story,
        targets: [
          makeTarget({ id: 's15_bat_c0', kind: 'bat', columnIndex: 0, y: 68, vx: 28 }),
          makeTarget({ id: 's15_gob_c0', kind: 'goblin_torch', columnIndex: 0, y: 110, hp: 3, maxHp: 3 }),
          makeTarget({ id: 's15_crt_c0', kind: 'crate', columnIndex: 0, y: 154, dropKind: 'double_ammo' }),
          makeTarget({ id: 's15_pal_c0', kind: 'palisade', columnIndex: 0, y: 212, broken: false }),

          makeTarget({ id: 's15_bat_c1', kind: 'bat', columnIndex: 1, y: 68, vx: -28 }),
          makeTarget({ id: 's15_gob_c1', kind: 'goblin_dagger', columnIndex: 1, y: 108, hp: 3, maxHp: 3 }),
          makeTarget({ id: 's15_pal_c1', kind: 'palisade', columnIndex: 1, y: 212, broken: false }),

          makeTarget({ id: 's15_gob1_c2', kind: 'goblin_torch', columnIndex: 2, y: 74, hp: 3, maxHp: 3 }),
          makeTarget({ id: 's15_gob2_c2', kind: 'goblin_dagger', columnIndex: 2, y: 118, hp: 2, maxHp: 2 }),
          makeTarget({ id: 's15_pal_c2', kind: 'palisade', columnIndex: 2, y: 212, broken: false }),

          makeTarget({ id: 's15_bat_c3', kind: 'bat', columnIndex: 3, y: 68, vx: 28 }),
          makeTarget({ id: 's15_gob_c3', kind: 'goblin_torch', columnIndex: 3, y: 110, hp: 3, maxHp: 3 }),
          makeTarget({ id: 's15_crt_c3', kind: 'crate', columnIndex: 3, y: 154, dropKind: 'heavy_ammo' }),
          makeTarget({ id: 's15_pal_c3', kind: 'palisade', columnIndex: 3, y: 212, broken: false }),
        ],
        hazards: [
          makeIronBlock('s15_iron_c0', 0, 184, 2.2, 0.0, 22),
          makeRotatingShield('s15_shield_c1', 1, 162, 2.15, 0.6),
          makeRotatingShield('s15_shield_c2', 2, 162, -2.15, 1.8),
          makeIronBlock('s15_iron_c3', 3, 184, 2.2, 1.5, 22),
          makeFloorSpike('s15_spike_l', 0, 30, 250, 24),
          makeFloorSpike('s15_spike_r', 3, 210, 250, 24),
        ],
      };
  }
}

export function generateEndlessStage(stageNumber: number): StageConfig {
  const s = Math.max(16, Math.floor(stageNumber));
  const wave = s - 15;
  const palettes: readonly TerrainPalette[] = ['meadow', 'courtyard', 'fortress'];
  const palette: TerrainPalette = s === 16 ? 'fortress' : palettes[(s - 1) % 3];
  const story = getStoryChapter(s);

  const targets: TargetEntity[] = [];
  const hazards: HazardBlock[] = [];

  for (let col = 0; col < 4; col++) {
    const batVx = Math.min(36, 18 + wave * 2) * (col % 2 === 0 ? 1 : -1);
    targets.push(
      makeTarget({
        id: `s${s}_bat_c${col}`,
        kind: 'bat',
        columnIndex: col,
        y: 68,
        vx: batVx,
      })
    );

    const goblinKind: TargetKind = (col + wave) % 2 === 0 ? 'goblin_torch' : 'goblin_dagger';
    const gobVx = Math.min(44, 22 + wave * 2) * (col % 2 === 0 ? -1 : 1);
    targets.push(
      makeTarget({
        id: `s${s}_gob_c${col}`,
        kind: goblinKind,
        columnIndex: col,
        y: 112,
        hp: wave >= 4 ? 3 : 2,
        maxHp: wave >= 4 ? 3 : 2,
        vx: gobVx,
        attackInterval: Math.max(1.8, 2.8 - wave * 0.08),
      })
    );

    if ((col + wave) % 2 === 0) {
      hazards.push(
        makeIronBlock(
          `s${s}_iron_c${col}`,
          col,
          162,
          Math.min(2.8, 1.9 + wave * 0.08),
          col * 0.9,
          22
        )
      );
      targets.push(
        makeTarget({
          id: `s${s}_pal_c${col}`,
          kind: 'palisade',
          columnIndex: col,
          y: 212,
          broken: false,
        })
      );
    } else {
      targets.push(
        makeTarget({
          id: `s${s}_crt_c${col}`,
          kind: 'crate',
          columnIndex: col,
          y: 148,
          hp: 2,
          maxHp: 2,
          dropKind: col % 2 === 0 ? 'double_ammo' : 'heavy_ammo',
        })
      );
      hazards.push(
        makeRotatingShield(
          `s${s}_shield_c${col}`,
          col,
          184,
          Math.min(2.6, 1.8 + wave * 0.07) * (col % 2 === 0 ? 1 : -1),
          col * 0.6
        )
      );
    }
  }

  return {
    stageNumber: s,
    name: 'ENDLESS INVASION',
    subtitle: `ENDLESS WAVE ${wave} • HOLD THE SANCTUARY`,
    palette,
    columns: [30, 90, 150, 210],
    startingDoubleAmmo: 6 + Math.floor(wave / 2),
    startingHeavyAmmo: 4 + Math.floor(wave / 3),
    spawnX: 120,
    spawnY: 282,
    story,
    targets,
    hazards,
  };
}

export function getStageConfig(stageNumber: number): StageConfig {
  const clamped = Math.max(1, Math.floor(stageNumber));
  if (clamped <= TOTAL_HANDCRAFTED_STAGES) {
    return buildHandcraftedStage(clamped);
  }
  return generateEndlessStage(clamped);
}

export function getAllHandcraftedStages(): StageConfig[] {
  const list: StageConfig[] = [];
  for (let i = 1; i <= TOTAL_HANDCRAFTED_STAGES; i++) {
    list.push(buildHandcraftedStage(i));
  }
  return list;
}

export const STAGE_CONFIGS: StageConfig[] = getAllHandcraftedStages();

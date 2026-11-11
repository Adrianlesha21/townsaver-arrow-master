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
      'Under a blood-red moon, Warlord Grimgor',
      'and the Ironfang Horde shattered the',
      'great bronze gates of Castle Eldoria.',
      'Torchlight and war-drums now echo through',
      'every stone hall, courtyard, and spire.',
    ],
    accentColor: '#ef4444',
    sceneType: 'invasion',
  },
  {
    slideNumber: 2,
    totalSlides: 3,
    heading: 'PROLOGUE II • CAPTIVE IN THE KEEP',
    caption: 'QUEEN AURELIA HELD BEHIND IRON SEALS',
    lines: [
      'Queen Aurelia was dragged into the high',
      'Royal Sanctums and sealed behind ancient',
      'portcullis grates bound by blood-runes.',
      'Only when the last raider in a hall falls',
      'does the iron seal shatter and rise!',
    ],
    accentColor: '#a855f7',
    sceneType: 'captive_queen',
  },
  {
    slideNumber: 3,
    totalSlides: 3,
    heading: 'PROLOGUE III • OATH OF THE BOW',
    caption: 'ADRIAN — THE ROYAL ARROW MASTER',
    lines: [
      'Cloaked in midnight blue, Adrian steps',
      'through the burning gatehouse alone,',
      'the gilded Royal Bow drawn in his hands.',
      'Every hall hides deadly iron traps—and at',
      'every sanctum arch, his Queen awaits.',
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
    actTitle: 'ACT I • THE TORCHLIT BAILEY',
    chapterTitle: 'CH.1 — MEADOW GATEWAY',
    briefingLines: [
      'Smoke curls beneath the Outer Gatehouse',
      'archway as Adrian steps onto the moonlit',
      'flagstones. Across the hall, Queen Aurelia',
      'clutches the cold iron bars of the Sanctum.',
    ],
    queenPlea:
      '"Adrian—you live! Thank the stars! Grimgor’s scouts hold the gatehouse seal; strike them down before the watch-horn sounds!"',
    queenCastleCallout: '"Adrian! Over here—beware the goblin torches in the shadows!"',
    tacticalHint: 'AIM 360° (MOUSE CLICK) or 8-WAY DIAGONAL (WASD/ARROWS + SPACE)!',
    reunionQuote:
      '"I knew no flame could bar your path! Wait—iron chains rattle above! Grimgor’s captains drag me toward the Inner Alley!"',
  },
  2: {
    stageNumber: 2,
    actTitle: 'ACT I • THE TORCHLIT BAILEY',
    chapterTitle: 'CH.2 — GOBLIN PATROL',
    briefingLines: [
      'War-horns groan across the wet cobbles.',
      'Cruel blade-throwers prowl behind twin',
      'blue-iron pillars, waiting to ambush',
      'anyone who dares cross the central hall.',
    ],
    queenPlea:
      '"Stay in the shadow of the pillars, my champion! Their poisoned daggers glimmer in the torchlight!"',
    queenCastleCallout: '"Careful, Adrian! Their daggers fly down the open lane!"',
    tacticalHint: 'COVER: Blue-Iron Pillars block enemy daggers & fireballs!',
    reunionQuote:
      '"Not a single blade touched your cloak! Come—their retreat leads straight to the Timber Gatehouse!"',
  },
  3: {
    stageNumber: 3,
    actTitle: 'ACT I • THE TORCHLIT BAILEY',
    chapterTitle: 'CH.3 — TIMBER BARRICADE',
    briefingLines: [
      'Desperate to slow the Royal Bow, goblin',
      'sappers have lashed heavy oak palisades',
      'across the corridor while fire-brands',
      'rain sparks from the upper alcoves.',
    ],
    queenPlea:
      '"They think rough timber can cage the finest archer in Eldoria! Cleave through their barricades, Adrian!"',
    queenCastleCallout: '"Splinter their oak gates and carve a path to my chamber!"',
    tacticalHint: 'WEAPON [3]: Great Arrow shatters oak palisades in one shot!',
    reunionQuote:
      '"Oak and iron alike give way before your resolve! Yet listen—dwarven machinery grinds in the terrace ahead..."',
  },
  4: {
    stageNumber: 4,
    actTitle: 'ACT I • THE TORCHLIT BAILEY',
    chapterTitle: 'CH.4 — BLUE-IRON CRAGS',
    briefingLines: [
      'Ancient dwarven Blue-Iron monoliths',
      'grind back and forth across the hall.',
      'Any shaft that strikes their enchanted',
      'steel rebounds with lethal fury.',
    ],
    queenPlea:
      '"Steady your breath, Adrian! Never loose an arrow into the enchanted Blue-Iron—wait until the corridor opens!"',
    queenCastleCallout: '"Time your shots between the sliding dwarven monoliths!"',
    tacticalHint: 'HAZARD: Hitting Blue-Iron deflects (-1 Heart). Flank with WASD!',
    reunionQuote:
      '"Such calm under fire! Even the ancient dwarven wards bend to your patience!"',
  },
  5: {
    stageNumber: 5,
    actTitle: 'ACT I • THE TORCHLIT BAILEY',
    chapterTitle: 'CH.5 — CAPTAIN OF THE BAILEY',
    briefingLines: [
      'At the foot of the Grand Staircase,',
      'the Bailey Captain has fortified a',
      'labyrinth of iron bastions, stolen',
      'royal supply chests, and night-bats.',
    ],
    queenPlea:
      '"Those iron-banded crates bear the royal crest—our stolen quivers lie inside! Reclaim them and break the Bailey guard!"',
    queenCastleCallout: '"Reclaim the royal chests—then ascend the staircase to me!"',
    tacticalHint: 'LOOT: Smash Crates & walk over glowing Quivers and Hearts!',
    reunionQuote:
      '"The Outer Bailey breathes free once more! Look upward—the torches of the Amber Keep burn ahead!"',
  },
  6: {
    stageNumber: 6,
    actTitle: 'ACT II • THE AMBER KEEP',
    chapterTitle: 'CH.6 — DUAL SIEGE DEPOT',
    briefingLines: [
      'Within the torchlit Amber Keep, twin',
      'barricades divide the armory floor.',
      'Raiders hurl steel and flame down both',
      'corridors to guard their plunder.',
    ],
    queenPlea:
      '"They turned my father’s armory into a slaughterhouse... Drive every last raider from these sacred stones!"',
    queenCastleCallout: '"Your arrows can sever their thrown blades mid-flight!"',
    tacticalHint: 'PARRY: Shoot incoming Goblin daggers right out of the air!',
    reunionQuote:
      '"My father’s banner hangs proud again! Hurry—footsteps echo from the cloister arches!"',
  },
  7: {
    stageNumber: 7,
    actTitle: 'ACT II • THE AMBER KEEP',
    chapterTitle: 'CH.7 — FLANKING HORDE',
    briefingLines: [
      'It is a trap! Ironfang ambushers surge',
      'from all four corners of the cloister',
      'while jagged steel spikes jut from the',
      'shadows along the outer walls.',
    ],
    queenPlea:
      '"Tread softly on the dark flagstones, Adrian! They rigged the outer tiles with cruel iron spikes!"',
    queenCastleCallout: '"Mind the spiked flagstones along the walls, my knight!"',
    tacticalHint: 'TRAP: Watch the glinting Floor Spikes (-1 Heart on contact)!',
    reunionQuote:
      '"Four squads fell before they could even close the ring! No ambush can snare a shadow!"',
  },
  8: {
    stageNumber: 8,
    actTitle: 'ACT II • THE AMBER KEEP',
    chapterTitle: 'CH.8 — TWIN IRON CHANNELS',
    briefingLines: [
      'Two towering colonnades of Blue-Iron',
      'split the Great Hall into three narrow',
      'corridors prowled by armored goblins',
      'and swooping crimson-eyed nightwings.',
    ],
    queenPlea:
      '"They expect a frontal charge down the center aisle—slip through the side colonnades and strike their flank!"',
    queenCastleCallout: '"Weave through the side colonnades and strike from the flank!"',
    tacticalHint: 'FLANKING: Walk left/right through corridor gaps to fire sideways!',
    reunionQuote:
      '"Every hall you cleanse restores hope to Eldoria! Yet hear those gears turning ahead..."',
  },
  9: {
    stageNumber: 9,
    actTitle: 'ACT II • THE AMBER KEEP',
    chapterTitle: 'CH.9 — ROTATING REDOUBT',
    briefingLines: [
      'Massive clockwork shield-wheels spin',
      'before the inner sanctum, alternating',
      'cursed blue-iron plates with brittle',
      'timber planks forged for siege war.',
    ],
    queenPlea:
      '"Grimgor’s siege-wrights built spinning iron wards before my grate! Step past their arc or splinter the timber!"',
    queenCastleCallout: '"Step clear of the spinning iron rims before you loose!"',
    tacticalHint: 'SHIELDS: Flank past spinning wheels or shatter the wood arcs!',
    reunionQuote:
      '"Even Grimgor’s finest war-engines lie in splinters at your feet!"',
  },
  10: {
    stageNumber: 10,
    actTitle: 'ACT II • THE AMBER KEEP',
    chapterTitle: 'CH.10 — SPLINTER CORRIDOR',
    briefingLines: [
      'At the threshold of the High Spire,',
      'goblin engineers have sealed every',
      'passageway behind double palisades',
      'lit by roaring braziers.',
    ],
    queenPlea:
      '"This stairwell is the last lock upon the Amber Keep! Break their line and the High Citadel opens before us!"',
    queenCastleCallout: '"Pace your bowshots—do not strike your own slowed shafts!"',
    tacticalHint: 'SHOT DISCIPLINE: Avoid clipping your own slowed/lodged arrows!',
    reunionQuote:
      '"The Amber Keep is ours! Cold starlight pours down from the Obsidian Spire above—we are nearly free!"',
  },
  11: {
    stageNumber: 11,
    actTitle: 'ACT III • THE OBSIDIAN SPIRE',
    chapterTitle: 'CH.11 — BELFRY BAT BARRAGE',
    briefingLines: [
      'Icy night gusts sweep the high belfry',
      'where bell-ropes sway in torchlight.',
      'Swarms of cavern night-bats dive from',
      'the vaulted rafters in tight waves.',
    ],
    queenPlea:
      '"The belfry rafters are alive with wings! Nock two shafts at once and sweep the darkness clean!"',
    queenCastleCallout: '"Loose twin arrows together to sweep the diving nightwings!"',
    tacticalHint: 'WEAPON [2]: Double Shot fires twin arrows side-by-side!',
    reunionQuote:
      '"The midnight bells ring out in triumph! Down below, the townsfolk will know their Arrow Master lives!"',
  },
  12: {
    stageNumber: 12,
    actTitle: 'ACT III • THE OBSIDIAN SPIRE',
    chapterTitle: 'CH.12 — GARRISON SIEGE',
    briefingLines: [
      'Inside the Obsidian Guardroom, Grimgor’s',
      'iron-helmed veterans hold a four-corner',
      'fortress of interlocking stone, steel,',
      'and crossfire lanes.',
    ],
    queenPlea:
      '"These are Grimgor’s sworn blood-guard, Adrian... Strike swiftly from cover and do not trade blows in the open!"',
    queenCastleCallout: '"Dart behind the iron blocks the instant you loose a shot!"',
    tacticalHint: 'HIT & RUN: Step out, fire [SPACE], and duck back behind iron!',
    reunionQuote:
      '"Even his sworn veterans scatter at the sight of your blue cloak! Only the Royal Gauntlet remains!"',
  },
  13: {
    stageNumber: 13,
    actTitle: 'ACT III • THE OBSIDIAN SPIRE',
    chapterTitle: 'CH.13 — RIVETED MAZE',
    briefingLines: [
      'The Royal Gauntlet weaves spinning',
      'shield-wheels, sliding dwarven blocks,',
      'and spiked flagstones into a deadly',
      'trial before the Throne Antechamber.',
    ],
    queenPlea:
      '"Every trap in this hall was laid to break your spirit, yet your hand has never trembled. Come to me, Adrian!"',
    queenCastleCallout: '"Steady your footing—thread the corridor one step at a time!"',
    tacticalHint: 'MASTERY: Clearing a hall unharmed restores +1 Royal Heart!',
    reunionQuote:
      '"Through steel and flame alike, you walk unscathed! Look—the gilded doors of the Throne Approach!"',
  },
  14: {
    stageNumber: 14,
    actTitle: 'ACT III • THE OBSIDIAN SPIRE',
    chapterTitle: 'CH.14 — THRONE APPROACH',
    briefingLines: [
      'Before the towering golden doors of the',
      'Crown Spire, elite war-captains hurl',
      'relentless volleys across the crimson',
      'royal carpet.',
    ],
    queenPlea:
      '"Hear how their voices falter, Adrian! One final charge breaks the siege at the very doors of the throne!"',
    queenCastleCallout: '"Gather every quiver you find before the Crown Spire finale!"',
    tacticalHint: 'PREPARE: Stock up on Double & Great Arrows from Crates!',
    reunionQuote:
      '"The gilded doors burst wide! Above us rises the Crown Spire—let us end this nightmare together!"',
  },
  15: {
    stageNumber: 15,
    actTitle: 'FINALE • THE CROWN SPIRE',
    chapterTitle: 'CH.15 — CITADEL LAST STAND',
    briefingLines: [
      'High atop the torchlit Crown Spire,',
      'Warlord Grimgor’s last War-Guard rings',
      'Queen Aurelia’s throne behind twin',
      'spinning shields. Break the siege forever',
      'and reclaim the Kingdom of Eldoria!',
    ],
    queenPlea:
      '"For every hearth in the valley below, for the crown of Eldoria—loose one last volley, my Arrow Master, and set our kingdom free!"',
    queenCastleCallout: '"For Eldoria! Strike true, Adrian—our dawn has come!"',
    tacticalHint: 'GRAND FINALE: Vanquish the War-Guard & ascend to the Queen!',
    reunionQuote:
      '"At last—my hands are free, and dawn breaks gold over Castle Eldoria! Hail Adrian, Savior of the Realm!"',
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
      `Scattering warbands of the Ironfang`,
      `Horde mount desperate Assault Wave ${wave}`,
      `against the torchlit halls of Eldoria!`,
    ],
    queenPlea: `"Stand fast, my Arrow Master! Drive Wave ${wave} back from our newly reclaimed gates!"`,
    queenCastleCallout: `"Hold the hall, Adrian! Wave ${wave} presses at the gate!"`,
    tacticalHint: `ENDLESS WAVE ${wave}: Escalating raider speed & high-score glory!`,
    reunionQuote: `"Wave ${wave} broken! So long as your bow guards these halls, Eldoria shall never fall!"`,
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

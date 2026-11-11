/**
 * Townsaver — Procedural 16-Bit Pixel-Art Sprite Generator & Playfield Renderer (Milestone 2)
 * Faithfully implements all characters, enemies, obstacles, hazards, weapon variations,
 * impact bursts, hearts, terrain palettes, and HUD/Sanctuary elements from the reference sheets.
 */

export type WeaponType = 'single' | 'double' | 'heavy';
export type QueenMood = 'watching' | 'cheering' | 'praying' | 'distressed';
export type AdrianFrameName = 'idle1' | 'idle2' | 'nock' | 'draw';
export type AdrianFrame = AdrianFrameName | 0 | 1 | 2 | 3;
export type MuzzleFlashType = boolean | number | 'none' | 'single' | 'double' | 'heavy';
export type GoblinVariant = 'goblin_torch' | 'goblin_dagger' | 'torch' | 'dagger';
export type BatFrameName = 'spread' | 'mid' | 'down' | 'up' | 'mid_up';
export type BatFrame = BatFrameName | 0 | 1 | 2 | 3 | 4;
export type TerrainPalette = 'meadow' | 'courtyard' | 'fortress';
export type TargetKind = 'bat' | 'goblin_torch' | 'goblin_dagger' | 'crate' | 'palisade';
export type HazardKind = 'iron_block' | 'rotating_shield' | 'floor_spike';

export interface AdrianRenderOptions {
  aimAngle?: number;
  facingLeft?: boolean;
  isMoving?: boolean;
  walkTick?: number;
  invulnerable?: boolean;
  showAimReticle?: boolean;
  cursorX?: number | null;
  cursorY?: number | null;
}

export const SPRITE_CATALOG = [
  'adrian',
  'queen',
  'goblin_torch',
  'goblin_dagger',
  'goblin_stagger',
  'bat',
  'palisade_intact',
  'palisade_broken',
  'crate',
  'iron_block',
  'rotating_shield',
  'arrow_single',
  'arrow_double',
  'arrow_heavy',
  'heart_active',
  'heart_lost',
] as const;

export interface LodgedArrowView {
  offsetX?: number;
  offsetY?: number;
  angle?: number;
  angleOffset?: number;
  weaponType?: WeaponType;
}

export interface ShieldSegment {
  type: 'iron' | 'wood';
  startAngle: number;
  endAngle: number;
  hp: number;
  maxHp: number;
}

export interface SpriteTarget {
  id?: string | number;
  type: TargetKind;
  x: number;
  y: number;
  width?: number;
  height?: number;
  hp: number;
  maxHp: number;
  animFrame?: number;
  flameFrame?: number;
  staggerTimer?: number;
  state?: string;
  flashTimer?: number;
  broken?: boolean;
  lodgedArrows?: number | LodgedArrowView[];
}

export interface SpriteHazard {
  id?: string | number;
  type: HazardKind;
  x: number;
  y: number;
  width?: number;
  height?: number;
  angle?: number;
  radius?: number;
  sparkTimer?: number;
  flashTimer?: number;
  frame?: number;
  segments?: ShieldSegment[];
  lodgedArrows?: (number | LodgedArrowView)[];
}

export interface SpriteArrow {
  id?: string | number;
  x: number;
  y: number;
  weaponType: WeaponType;
  vy?: number;
  angle?: number;
  spread?: number;
  slowed?: boolean;
  piercing?: boolean;
  deflected?: boolean;
  deflectVx?: number;
  deflectVy?: number;
  animFrame?: number;
  frame?: number;
}

export interface SpriteParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  outlineColor?: string;
  size: number;
  alpha?: number;
  life?: number;
  maxLife?: number;
  kind?:
    | 'spark'
    | 'splinter'
    | 'wood_chip'
    | 'clang'
    | 'iron_spark'
    | 'blast'
    | 'shockwave'
    | 'arrow_splinter'
    | 'exclaim';
}

export interface SpriteHUDState {
  score: number;
  highScore?: number;
  stage: number;
  hearts: number;
  maxHearts: number;
  activeWeapon: WeaponType;
  doubleAmmo?: number;
  heavyAmmo?: number;
  queenMood?: QueenMood;
  heartFlashTimer?: number;
  statusBanner?: string | null;
}

export interface GoblinRenderOptions {
  variant?: GoblinVariant;
  hp?: number;
  maxHp?: number;
  walkFrame?: number;
  flameFrame?: number;
  stagger?: boolean;
  lodgedArrows?: number | LodgedArrowView[];
}

// ============================================================================
// 1. SHARED PIXEL-GRID RENDERER & OFFSCREEN CACHE
// ============================================================================

const spriteCache = new Map<string, HTMLCanvasElement>();

/**
 * Renders a 1-character-per-pixel ASCII sprite matrix directly onto a 2D canvas context.
 * '.' or ' ' is treated as transparent.
 */
export function renderPixelGrid(
  ctx: CanvasRenderingContext2D,
  leftX: number,
  topY: number,
  grid: readonly string[],
  palette: Record<string, string>,
  scale = 1,
  flash = false
): void {
  const x0 = Math.round(leftX);
  const y0 = Math.round(topY);
  for (let r = 0; r < grid.length; r++) {
    const row = grid[r];
    for (let c = 0; c < row.length; c++) {
      const ch = row[c];
      if (ch === '.' || ch === ' ') continue;
      const color = palette[ch];
      if (!color || color === 'transparent') continue;
      if (flash) {
        ctx.fillStyle =
          ch === 'O' || ch === 'I' || ch === 'g' || ch === 'x' || ch === 'K'
            ? '#f59e0b'
            : '#ffffff';
      } else {
        ctx.fillStyle = color;
      }
      ctx.fillRect(x0 + c * scale, y0 + r * scale, scale, scale);
    }
  }
}

/**
 * Renders a 2D ASCII character matrix into a cached offscreen HTMLCanvasElement
 * when running in a browser DOM environment.
 */
export function getCachedMatrixSprite(
  key: string,
  matrix: readonly string[],
  palette: Record<string, string>,
  flash = false
): HTMLCanvasElement | null {
  if (typeof document === 'undefined' || typeof document.createElement !== 'function') {
    return null;
  }
  const cacheKey = flash ? `${key}__flash` : key;
  const existing = spriteCache.get(cacheKey);
  if (existing) return existing;

  const height = matrix.length;
  const width = matrix[0]?.length ?? 0;
  const offscreen = document.createElement('canvas');
  offscreen.width = width;
  offscreen.height = height;
  const octx = offscreen.getContext('2d');
  if (!octx) return null;
  octx.imageSmoothingEnabled = false;

  renderPixelGrid(octx, 0, 0, matrix, palette, 1, flash);
  spriteCache.set(cacheKey, offscreen);
  return offscreen;
}

function blitMatrixSprite(
  ctx: CanvasRenderingContext2D,
  key: string,
  leftX: number,
  topY: number,
  matrix: readonly string[],
  palette: Record<string, string>,
  flash = false
): void {
  const cached = getCachedMatrixSprite(key, matrix, palette, flash);
  if (cached && typeof ctx.drawImage === 'function') {
    ctx.drawImage(cached, Math.round(leftX), Math.round(topY));
  } else {
    renderPixelGrid(ctx, leftX, topY, matrix, palette, 1, flash);
  }
}

// ============================================================================
// 2. ADRIAN (TOWNSAVER — THE ARROW MASTER) (20x24 Logical Pixels)
// ============================================================================

export const ADRIAN_PALETTE: Record<string, string> = {
  K: '#121318', // Crisp 1px dark arcade outline
  B: '#1d4ed8', // Deep cobalt blue hood & tunic shadow
  U: '#2563eb', // Royal blue hood & tunic midtone
  C: '#3b82f6', // Bright blue tunic/shoulder highlight
  L: '#60a5fa', // Sky-blue hood crest specular highlight
  S: '#f5cba7', // Warm peach face & hand skin
  D: '#e59866', // Skin shadow / chin contour
  E: '#1e1b2e', // Dark pixel eyes
  G: '#fbbf24', // Bright gold belt buckle & tunic hem trim
  A: '#d97706', // Amber-gold shoulder strap & belt shadow
  W: '#854d0e', // Recurve bow dark timber & back quiver leather
  M: '#a16207', // Recurve bow warm wood highlight & arrow shaft
  N: '#5c2d0c', // Dark brown leather bracers & boots
  P: '#1e293b', // Dark slate trousers
  F: '#ffffff', // White quiver arrow fletchings & string highlight
  T: '#cbd5e1', // Taut silver-gray bowstring & steel arrowhead
};

export const ADRIAN_FRAMES: Record<AdrianFrameName, readonly string[]> = {
  // Frame 0: idle1 (Alert ready stance, quiver on back-left, bow held at right side)
  idle1: [
    '......KKKKKK........', // 00
    '.....KLLLLCCK.......', // 01
    '....KLUUUUUUCK......', // 02
    '..FFKUUUUUUUUK......', // 03
    '.FFWKUUSSSSUUK......', // 04
    '.KWKKUSSESESUK......', // 05
    '..KWKBUSSSSSUK......', // 06
    '..KWWKDDDDDDUK..KK..', // 07
    '...KWKUUUUUUK..KWMK.', // 08
    '...KKKKUACCUKK.KW.TK', // 09
    '..KCUUUUUACUUCKW..TK', // 10
    '..KBUUUUUUAUUBKW..TK', // 11
    '..KNNKUUUUUUKNKW..TK', // 12
    '..KSSKBUUUUUKSSW..TK', // 13
    '..KKKKAGGGAGKKKK..TK', // 14
    '....KBUUUUUUUBK..KWM', // 15
    '....KBBBBBBBBBK.KWMK', // 16
    '....KGGGGGGGGGK.KK..', // 17
    '....KPPPPPPPPPK.....', // 18
    '....KPPP...PPPK.....', // 19
    '....KNNN...NNNK.....', // 20
    '....KMMN...NMMK.....', // 21
    '...KNNNN...NNNNK....', // 22
    '...KKKKK...KKKKK....', // 23
  ],

  // Frame 1: idle2 (1px breathing bounce, bow slightly raised, quiver feathers twitch)
  idle2: [
    '....................', // 00
    '......KKKKKK........', // 01
    '.....KLLLLCCK.......', // 02
    '.FF.KLUUUUUUCK..KK..', // 03
    '.FFWKUUUUUUUUK.KWMK.', // 04
    '.KWKKUUSSSSUUK.KW.TK', // 05
    '..KWKUSSESESUK.KW.TK', // 06
    '..KWWKBUSSSSUK.KW.TK', // 07
    '...KWKDDDDDDUK.KW.TK', // 08
    '...KKKKUUUUUKK.KW.TK', // 09
    '..KCUUUUUACUUCKW..TK', // 10
    '..KBUUUUUUAUUBKW..TK', // 11
    '..KNNKUUUUUUKNKW..TK', // 12
    '..KSSKBUUUUUKSSW.KWM', // 13
    '..KKKKAGGGAGKKKKKWMK', // 14
    '....KBUUUUUUUBK..KK.', // 15
    '....KBBBBBBBBBK.....', // 16
    '....KGGGGGGGGGK.....', // 17
    '....KPPPPPPPPPK.....', // 18
    '....KPPP...PPPK.....', // 19
    '....KNNN...NNNK.....', // 20
    '....KMMN...NMMK.....', // 21
    '...KNNNN...NNNNK....', // 22
    '...KKKKK...KKKKK....', // 23
  ],

  // Frame 2: nock (Bow raised forward, arrow nocked across bow, string partially drawn)
  nock: [
    '.............KK.....', // 00
    '......KKKKKK.KWMK...', // 01
    '.....KLLLLCCK.TWMK..', // 02
    '..FFKLUUUUUUCK.KWMK.', // 03
    '.FFWKUUUUUUUUK..KWMK', // 04
    '.KWKKUUSSSSUUK..KW.K', // 05
    '..KWKUSSESESUK..KW..', // 06
    '..KWWKBUSSSSUK.TKW..', // 07
    '...KWKDDDDDDUKT.KW..', // 08
    '..KNNKKUUUUUKSSMMMMT', // 09
    '..KSSUUUUACUUCNNKWMK', // 10
    '..KKKKUUUUUUBK.TKW..', // 11
    '....KBUUUUUUUK..KW..', // 12
    '....KBUUUUUUUK..KW.K', // 13
    '....KAAGGGAGAK..KWMK', // 14
    '....KBUUUUUUUBK.KWMK', // 15
    '....KBBBBBBBBBK.TWMK', // 16
    '....KGGGGGGGGGK.KWM.', // 17
    '....KPPPPPPPPPK..KK.', // 18
    '....KPPP...PPPK.....', // 19
    '....KNNN...NNNK.....', // 20
    '....KMMN...NMMK.....', // 21
    '...KNNNN...NNNNK....', // 22
    '...KKKKK...KKKKK....', // 23
  ],

  // Frame 3: draw (Full draw / release stance, bow deeply flexed, string pulled to cheek, heroic wide stance)
  draw: [
    '............KK......', // 00
    '.....KKKKKK.KWMK....', // 01
    '....KLLLLCCK.KWMK...', // 02
    '.FFKLUUUUUUCK.KWMK..', // 03
    'FFWKUUUUUUUUK..KWMK.', // 04
    'KWKKUUSSSSUUK...KWMK', // 05
    '.KWKUSSESESUK..T.KWM', // 06
    '.KWWKBUSSSSUK.T..KWM', // 07
    '..KWKDDDDDDUKT...KWM', // 08
    '.KNNKSSUUUUFFMMMMTTF', // 09
    '.KSSUUUUACUUCCNNKWMK', // 10
    '.KKKKUUUUUUBK.T..KWM', // 11
    '...KBUUUUUUUK..T.KWM', // 12
    '...KBUUUUUUUK....KWM', // 13
    '...KAAGGGAGAK...KWMK', // 14
    '...KBUUUUUUUBK.KWMK.', // 15
    '...KBBBBBBBBBK.KWMK.', // 16
    '...KGGGGGGGGGK.KK...', // 17
    '...KPPPPPPPPPK......', // 18
    '...KPPP....PPPK.....', // 19
    '..KNNN......NNNK....', // 20
    '..KMMN......NMMK....', // 21
    '.KNNNN......NNNNK...', // 22
    '.KKKKK......KKKKK...', // 23
  ],
};

function resolveAdrianFrame(frame: AdrianFrame): AdrianFrameName {
  if (frame === 0 || frame === 'idle1') return 'idle1';
  if (frame === 1 || frame === 'idle2') return 'idle2';
  if (frame === 2 || frame === 'nock') return 'nock';
  return 'draw';
}

const flippedMatrixCache = new Map<string, readonly string[]>();

function getHorizontallyFlippedMatrix(key: string, matrix: readonly string[]): readonly string[] {
  const existing = flippedMatrixCache.get(key);
  if (existing) return existing;
  const flipped = matrix.map((row) => row.split('').reverse().join(''));
  flippedMatrixCache.set(key, flipped);
  return flipped;
}

function isHDCanvas(ctx: CanvasRenderingContext2D): boolean {
  return (
    typeof ctx.createRadialGradient === 'function' &&
    typeof ctx.createLinearGradient === 'function' &&
    typeof ctx.roundRect === 'function' &&
    typeof ctx.ellipse === 'function'
  );
}

function drawHDAdrian(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  resolved: AdrianFrameName,
  flash: MuzzleFlashType,
  options?: AdrianRenderOptions
): void {
  const aimAngle = options?.aimAngle ?? -Math.PI / 2;
  const cosA = Math.cos(aimAngle);
  const sinA = Math.sin(aimAngle);
  const isMoving = Boolean(options?.isMoving);
  const walkPhase = isMoving && options?.walkTick !== undefined ? options.walkTick * 12 : 0;
  const bob = isMoving ? Math.sin(walkPhase) * 1.0 : 0;
  const stride = isMoving ? Math.sin(walkPhase) * 2.3 : 0;
  const invulnFlash = Boolean(
    options?.invulnerable && Math.floor((options.walkTick ?? 0) * 20) % 2 === 1
  );

  // Body facing posture adapts smoothly to 360° / 8-way diagonal aim!
  const facingBack = sinA < -0.58;
  const facingFront = sinA > 0.58;
  const flipSide = cosA < -0.08 ? -1 : 1;

  const pivotX = x;
  const pivotY = y - 2 + bob;

  ctx.save();
  ctx.translate(x, y + bob);

  // 1. Heroic Royal-Cyan & Gold Ground Aura + Contact Shadow
  const halo = ctx.createRadialGradient(0, 2, 1, 0, 2, 15);
  halo.addColorStop(0, 'rgba(56, 189, 248, 0.30)');
  halo.addColorStop(0.6, 'rgba(250, 204, 21, 0.12)');
  halo.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(0, 2, 15, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(5, 8, 15, 0.58)';
  ctx.beginPath();
  ctx.ellipse(0, 10.6 - bob * 0.5, 7.6, 2.8, 0, 0, Math.PI * 2);
  ctx.fill();

  if (invulnFlash) {
    ctx.globalAlpha = 0.58;
  }

  // Draw Bow UNDER body when aiming upward/back so Adrian holds it naturally in front of his chest!
  const drawOrbitalBow = () => {
    const pull = resolved === 'draw' ? -2.2 : -0.6;
    ctx.save();
    ctx.translate(0, -2.0);
    ctx.rotate(aimAngle);

    // Bowstring (taut silver-gold cord)
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 0.85;
    ctx.beginPath();
    ctx.moveTo(8.8, -7.8);
    ctx.lineTo(4.6 + pull, 0);
    ctx.lineTo(8.8, 7.8);
    ctx.stroke();

    // Sculpted Gilded Recurve Bow Limbs (double-curved limbs + crimson grip)
    const bowGrad = ctx.createLinearGradient(6, -8, 13, 8);
    bowGrad.addColorStop(0, '#fde047');
    bowGrad.addColorStop(0.5, '#f59e0b');
    bowGrad.addColorStop(1, '#fde047');
    ctx.strokeStyle = '#090d16';
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.moveTo(8.5, -8.2);
    ctx.quadraticCurveTo(13.2, -4.0, 11.4, 0);
    ctx.quadraticCurveTo(13.2, 4.0, 8.5, 8.2);
    ctx.stroke();

    ctx.strokeStyle = bowGrad;
    ctx.lineWidth = 1.9;
    ctx.beginPath();
    ctx.moveTo(8.5, -8.2);
    ctx.quadraticCurveTo(13.2, -4.0, 11.4, 0);
    ctx.quadraticCurveTo(13.2, 4.0, 8.5, 8.2);
    ctx.stroke();

    // Bow Riser Grip + Archer Lead Gauntlet
    ctx.fillStyle = '#991b1b';
    ctx.fillRect(10.2, -1.6, 2.2, 3.2);
    ctx.fillStyle = '#fed7aa';
    ctx.strokeStyle = '#090d16';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(11.0, 0.2, 1.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Nocked Sleek HD Arrow along aim axis (cleanly out in front of the bow!)
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(4.8 + pull, 0);
    ctx.lineTo(3.2 + pull, -1.8);
    ctx.lineTo(6.2 + pull, -0.5);
    ctx.moveTo(4.8 + pull, 0);
    ctx.lineTo(3.2 + pull, 1.8);
    ctx.lineTo(6.2 + pull, 0.5);
    ctx.fill();

    // Polished Oak & Gold Shaft
    ctx.strokeStyle = '#090d16';
    ctx.lineWidth = 2.1;
    ctx.beginPath();
    ctx.moveTo(5.0 + pull, 0);
    ctx.lineTo(15.2, 0);
    ctx.stroke();
    ctx.strokeStyle = '#fde68a';
    ctx.lineWidth = 1.15;
    ctx.beginPath();
    ctx.moveTo(5.0 + pull, 0);
    ctx.lineTo(15.2, 0);
    ctx.stroke();

    // Razor-Sharp Diamond Bodkin Steel Arrowhead (tip at +18.8px)
    ctx.fillStyle = '#e0f2fe';
    ctx.strokeStyle = '#090d16';
    ctx.lineWidth = 0.85;
    ctx.beginPath();
    ctx.moveTo(18.8, 0);
    ctx.lineTo(14.2, -2.3);
    ctx.lineTo(15.2, 0);
    ctx.lineTo(14.2, 2.3);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Draw Hand on String
    ctx.fillStyle = '#78350f';
    ctx.beginPath();
    ctx.arc(4.8 + pull, 1.1, 1.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  };

  if (sinA < -0.15) {
    drawOrbitalBow();
  }

  // Animated Ranger Boots & Greaves
  ctx.fillStyle = '#451a03';
  ctx.strokeStyle = '#090d16';
  ctx.lineWidth = 1.05;
  ctx.beginPath();
  ctx.roundRect(-4.8, 7.2 + stride * 0.55, 3.8, 3.6, 1.1);
  ctx.roundRect(1.0, 7.2 - stride * 0.55, 3.8, 3.6, 1.1);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#1e293b';
  ctx.fillRect(-4.0, 3.8, 2.8, 4.0);
  ctx.fillRect(1.2, 3.8, 2.8, 4.0);

  if (facingBack) {
    // --- BACK / UPWARD RANGER SILHOUETTE (Sculpted Hood + Pauldrons + Quiver + Split Royal Cloak) ---
    // Leather Quiver + Crimson-Fletched Arrows
    ctx.fillStyle = '#78350f';
    ctx.beginPath();
    ctx.roundRect(2.6, -8.2, 3.4, 8.6, 1.0);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(3.2, -10.4, 1.1, 2.4);
    ctx.fillStyle = '#f43f5e';
    ctx.fillRect(4.7, -10.0, 1.1, 2.2);

    // Shoulder Pauldrons
    ctx.fillStyle = '#92400e';
    ctx.beginPath();
    ctx.ellipse(-5.2, -4.0, 2.6, 2.0, -0.3, 0, Math.PI * 2);
    ctx.ellipse(5.2, -4.0, 2.6, 2.0, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Sculpted Split Royal Cloak
    const cloakGrad = ctx.createLinearGradient(0, -6.5, 0, 6.8);
    cloakGrad.addColorStop(0, '#38bdf8');
    cloakGrad.addColorStop(0.45, '#2563eb');
    cloakGrad.addColorStop(1, '#1e3a8a');
    ctx.fillStyle = cloakGrad;
    ctx.beginPath();
    ctx.moveTo(-5.4, -5.0);
    ctx.lineTo(5.4, -5.0);
    ctx.lineTo(6.8 + stride * 0.2, 6.2);
    ctx.lineTo(0.8, 5.2);
    ctx.lineTo(0, 3.0);
    ctx.lineTo(-0.8, 5.2);
    ctx.lineTo(-6.8 + stride * 0.2, 6.2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Gold Trim & Royal Sun Crest
    ctx.fillStyle = '#facc15';
    ctx.fillRect(-6.0 + stride * 0.15, 4.8, 5.0, 1.2);
    ctx.fillRect(1.0 + stride * 0.15, 4.8, 5.0, 1.2);
    ctx.beginPath();
    ctx.arc(0, -0.6, 1.7, 0, Math.PI * 2);
    ctx.fill();

    // Sculpted Peaked Ranger Hood (Not a round lollipop!)
    const hoodGrad = ctx.createLinearGradient(0, -13.5, 0, -4.0);
    hoodGrad.addColorStop(0, '#60a5fa');
    hoodGrad.addColorStop(0.55, '#2563eb');
    hoodGrad.addColorStop(1, '#1e3a8a');
    ctx.fillStyle = hoodGrad;
    ctx.beginPath();
    ctx.moveTo(0, -13.2);
    ctx.quadraticCurveTo(5.6, -11.2, 4.8, -5.0);
    ctx.quadraticCurveTo(0, -3.8, -4.8, -5.0);
    ctx.quadraticCurveTo(-5.6, -11.2, 0, -13.2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Crimson Ranger Plume
    ctx.fillStyle = '#f43f5e';
    ctx.beginPath();
    ctx.moveTo(-0.8, -12.8);
    ctx.quadraticCurveTo(-5.4, -15.6, -3.6, -9.4);
    ctx.closePath();
    ctx.fill();
  } else if (facingFront) {
    // --- FRONT / DOWNWARD RANGER SILHOUETTE ---
    ctx.fillStyle = '#1e3a8a';
    ctx.beginPath();
    ctx.moveTo(-6.0, -4.8);
    ctx.lineTo(6.0, -4.8);
    ctx.lineTo(7.2, 5.8);
    ctx.lineTo(-7.2, 5.8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Tunic + Leather Baldric & Gold Buckle
    const tunicGrad = ctx.createLinearGradient(0, -5, 0, 5.5);
    tunicGrad.addColorStop(0, '#38bdf8');
    tunicGrad.addColorStop(1, '#1d4ed8');
    ctx.fillStyle = tunicGrad;
    ctx.beginPath();
    ctx.roundRect(-5.0, -4.8, 10.0, 10.0, 2);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-4.2, -4.4);
    ctx.lineTo(4.2, 2.2);
    ctx.stroke();
    ctx.lineWidth = 1.05;
    ctx.strokeStyle = '#090d16';

    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(-4.8, 1.2, 9.6, 1.6);
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(-1.4, 1.0, 2.8, 2.0);

    // Sculpted Peaked Cowl + Determined Ranger Face
    ctx.fillStyle = '#2563eb';
    ctx.beginPath();
    ctx.moveTo(0, -13.4);
    ctx.quadraticCurveTo(5.6, -11.2, 4.8, -5.2);
    ctx.lineTo(-4.8, -5.2);
    ctx.quadraticCurveTo(-5.6, -11.2, 0, -13.4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#fed7aa';
    ctx.beginPath();
    ctx.arc(0, -7.6, 3.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-2.1, -8.3, 1.2, 1.4);
    ctx.fillRect(0.9, -8.3, 1.2, 1.4);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-1.9, -8.3, 0.55, 0.55);
    ctx.fillRect(1.1, -8.3, 0.55, 0.55);

    // Peaked Hood Brow Rim + Plume
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.moveTo(-4.2, -9.4);
    ctx.lineTo(0, -8.2);
    ctx.lineTo(4.2, -9.4);
    ctx.stroke();

    ctx.fillStyle = '#f43f5e';
    ctx.beginPath();
    ctx.moveTo(1.2, -13.0);
    ctx.quadraticCurveTo(5.6, -15.8, 3.8, -9.8);
    ctx.closePath();
    ctx.fill();
  } else {
    // --- 3/4 ANGLED ARCHER STANCE (Ideal for Left, Right, and All 4 Diagonals!) ---
    ctx.save();
    ctx.scale(flipSide, 1);

    // Streaming Royal Cloak behind shoulders
    ctx.fillStyle = '#1e3a8a';
    ctx.strokeStyle = '#090d16';
    ctx.lineWidth = 1.05;
    ctx.beginPath();
    ctx.moveTo(-1.8, -4.8);
    ctx.lineTo(-7.6 - Math.abs(stride) * 0.35, 5.6);
    ctx.lineTo(-2.0, 5.8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Quiver on Back
    ctx.fillStyle = '#78350f';
    ctx.beginPath();
    ctx.roundRect(-6.4, -8.2, 3.2, 7.8, 1);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(-7.0, -10.4, 1.1, 2.4);
    ctx.fillStyle = '#f43f5e';
    ctx.fillRect(-5.5, -10.0, 1.1, 2.1);

    // Armored Ranger Tunic + Pauldron + Belt
    const sideGrad = ctx.createLinearGradient(-4, -5, 4.5, 5.5);
    sideGrad.addColorStop(0, '#38bdf8');
    sideGrad.addColorStop(1, '#1d4ed8');
    ctx.fillStyle = sideGrad;
    ctx.beginPath();
    ctx.roundRect(-4.4, -4.8, 8.8, 10.0, 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#92400e';
    ctx.beginPath();
    ctx.ellipse(-2.6, -3.8, 2.4, 1.8, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#facc15';
    ctx.fillRect(-4.3, 1.2, 8.6, 1.5);
    ctx.fillRect(-0.5, 0.9, 2.4, 2.0);

    // Peaked Ranger Hood + Focused Profile Face
    ctx.fillStyle = '#2563eb';
    ctx.beginPath();
    ctx.moveTo(-0.5, -13.2);
    ctx.quadraticCurveTo(-5.6, -11.0, -4.6, -5.0);
    ctx.lineTo(3.8, -5.0);
    ctx.quadraticCurveTo(4.8, -10.6, -0.5, -13.2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#f43f5e';
    ctx.beginPath();
    ctx.moveTo(-2.0, -12.8);
    ctx.quadraticCurveTo(-7.8, -15.4, -5.2, -9.2);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#fed7aa';
    ctx.beginPath();
    ctx.arc(1.4, -7.6, 3.1, -Math.PI * 0.48, Math.PI * 0.48);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(2.0, -8.4, 1.2, 1.4);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(2.3, -8.4, 0.55, 0.55);

    ctx.restore();
  }

  if (sinA >= -0.15) {
    drawOrbitalBow();
  }

  ctx.restore();

  // 2. Comfortable 360° / Diagonal Trajectory Sightline & Precision Target Reticle!
  if (options?.showAimReticle) {
    const hasCursor =
      typeof options.cursorX === 'number' &&
      typeof options.cursorY === 'number' &&
      Number.isFinite(options.cursorX) &&
      Number.isFinite(options.cursorY);

    if (hasCursor) {
      const cx = options.cursorX as number;
      const cy = options.cursorY as number;
      const totalDist = Math.hypot(cx - pivotX, cy - pivotY);

      // Subtle dashed trajectory guide from bow tip (dist = 21) toward cursor
      ctx.save();
      ctx.strokeStyle = 'rgba(125, 211, 252, 0.34)';
      ctx.lineWidth = 0.9;
      ctx.setLineDash([2.5, 3.5]);
      if (totalDist > 24) {
        ctx.beginPath();
        ctx.moveTo(pivotX + cosA * 20, pivotY + sinA * 20);
        ctx.lineTo(
          pivotX + cosA * Math.min(totalDist - 6, 130),
          pivotY + sinA * Math.min(totalDist - 6, 130)
        );
        ctx.stroke();
      }
      ctx.setLineDash([]);

      // Sleek Royal Gold & Cyan Crosshair Ring at Mouse Cursor
      ctx.translate(cx, cy);
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.arc(0, 0, 5.2, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.0;
      for (const [x0, y0, x1, y1] of [
        [-7.8, 0, -3.4, 0],
        [3.4, 0, 7.8, 0],
        [0, -7.8, 0, -3.4],
        [0, 3.4, 0, 7.8],
      ]) {
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.stroke();
      }
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, 1.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else {
      // Crisp 8-Way (Cardinal + Diagonal!) Sightline Dots & Golden Chevron cleanly ahead of arrow tip
      for (const dist of [23, 30]) {
        const gx = pivotX + cosA * dist;
        const gy = pivotY + sinA * dist;
        ctx.fillStyle = 'rgba(125, 211, 252, 0.85)';
        ctx.beginPath();
        ctx.arc(gx, gy, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.save();
      ctx.translate(pivotX + cosA * 38, pivotY + sinA * 38);
      ctx.rotate(aimAngle);
      ctx.fillStyle = '#facc15';
      ctx.strokeStyle = '#090d16';
      ctx.lineWidth = 0.85;
      ctx.beginPath();
      ctx.moveTo(3.8, 0);
      ctx.lineTo(-2.2, -3.2);
      ctx.lineTo(-0.8, 0);
      ctx.lineTo(-2.2, 3.2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  }

  // 3. Directional Muzzle Flash cleanly at Bow Tip (dist = 18)
  if (flash && flash !== 'none') {
    const flashKind: WeaponType =
      flash === 'single' ? 'single' : flash === 'double' ? 'double' : 'heavy';
    const fx = Math.round(pivotX + cosA * 18);
    const fy = Math.round(pivotY + sinA * 18);
    drawMuzzleFlash(ctx, fx, fy, flashKind, 0.4);
  }
}

export function drawAdrian(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  frame: AdrianFrame = 'idle1',
  flash: MuzzleFlashType = false,
  options?: AdrianRenderOptions
): void {
  const resolved = resolveAdrianFrame(frame);
  if (isHDCanvas(ctx)) {
    drawHDAdrian(ctx, x, y, resolved, flash, options);
    return;
  }

  const aimAngle = options?.aimAngle ?? -Math.PI / 2;
  const cosA = Math.cos(aimAngle);
  const sinA = Math.sin(aimAngle);
  const facingLeft = options?.facingLeft ?? cosA < -0.25;
  const walkBob =
    options?.isMoving && options.walkTick !== undefined
      ? Math.floor(options.walkTick * 10) % 2 === 0
        ? -1
        : 0
      : 0;

  const left = Math.round(x - 10);
  const top = Math.round(y - 12 + walkBob);

  ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
  ctx.fillRect(left + 3, Math.round(y + 11), 14, 2);

  const invulnFlash = Boolean(
    options?.invulnerable && Math.floor((options.walkTick ?? 0) * 20) % 2 === 1
  );

  const baseMatrix = ADRIAN_FRAMES[resolved];
  const matrix = facingLeft
    ? getHorizontallyFlippedMatrix(`adrian_${resolved}_flip`, baseMatrix)
    : baseMatrix;
  const cacheKey = facingLeft ? `adrian_${resolved}_flip` : `adrian_${resolved}`;
  blitMatrixSprite(ctx, cacheKey, left, top, matrix, ADRIAN_PALETTE, invulnFlash);

  if (options?.showAimReticle) {
    for (const dist of [15, 23, 31]) {
      const gx = Math.round(x + cosA * dist);
      const gy = Math.round(y + sinA * dist);
      ctx.fillStyle = dist === 31 ? '#facc15' : 'rgba(112, 196, 255, 0.78)';
      ctx.fillRect(gx - 1, gy - 1, 2, 2);
    }
  }

  const tipX = Math.round(x + cosA * 12);
  const tipY = Math.round(y + sinA * 12);
  if (resolved === 'nock' || resolved === 'draw' || options?.showAimReticle) {
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(tipX - 1, tipY - 1, 3, 3);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(tipX, tipY, 1, 1);
  }

  if (flash && flash !== 'none') {
    const flashKind: WeaponType =
      flash === 'single' ? 'single' : flash === 'double' ? 'double' : 'heavy';
    const fx = options ? Math.round(x + cosA * 13) : x;
    const fy = options ? Math.round(y + sinA * 13) : top - 4;
    drawMuzzleFlash(ctx, fx, fy, flashKind, 0.4);
  }
}

// ============================================================================
// 3. THE QUEEN (HD Royal Sanctuary Figure & 144x192 Portrait + Fallback Matrix)
// ============================================================================

export const QUEEN_PALETTE: Record<string, string> = {
  K: '#121318',
  G: '#fbbf24',
  Y: '#fef08a',
  A: '#d97706',
  R: '#e11d48',
  J: '#38bdf8',
  H: '#78350f',
  N: '#451a03',
  M: '#92400e',
  S: '#fbd38d',
  D: '#f5cba7',
  C: '#f472b6',
  E: '#1e1b2e',
  V: '#581c87',
  P: '#9333ea',
  L: '#c084fc',
  W: '#ffffff',
};

export const QUEEN_MOOD_FRAMES: Record<QueenMood, readonly string[]> = {
  watching: [
    '....K..K..K..K....',
    '....KY.KYYK.YK....',
    '....KGGKGGKGGK....',
    '....KGRGGGGJGK....',
    '...KKAAAAAAAAKK...',
    '..KMHHSSSSSSHHMK..',
    '..KHHSSSSSSSSHHK..',
    '..KNHSSESSSESNHK..',
    '..KNHGCSSSSCGNHK..',
    '..KNNHSSSSSSHNNK..',
    '...KKNDDDDDDNKK...',
    '..KLLPGGGGGGPLLK..',
    '..KLLPPPPPPPPLLK..',
    '..KVPKGGGGGGKPVK..',
    '..KSSKVPGGPVKSSK..',
    '..KKKKLPGGPLKKKK..',
    '....KLLPGGPLLK....',
    '...KLPPAWWAPPLK...',
    '...KPPPVGGVPPPK...',
    '..KLPPPVGGVPPPLK..',
    '..KPPPPVGGVPPPPK..',
    '..KVVVVAGGAVVVVK..',
    '..KGGGGGGGGGGGGK..',
    '..KKKKKKKKKKKKKK..',
  ],
  cheering: [
    '....K..KWWK..K....',
    '....KY.KYYK.YK....',
    '....KGGKGGKGGK....',
    '....KGRGGGGJGK....',
    '...KKAAAAAAAAKK...',
    '..KMHHSSSSSSHHMK..',
    '..KHHSSSSSSSSHHKSS',
    '..KNHSSESSSESNHKSS',
    '..KNHGCSSSSCGNHKK.',
    '..KNNHSSRRSSHNNLK.',
    '...KKNDDDDDDNKKLK.',
    '..KLLPGGGGGGPLLPK.',
    '..KLLPPPPPPPPLVK..',
    '..KVPKGGGGGGKKKK..',
    '..KSSKVPGGPVK.....',
    '..KKKKLPGGPLK.....',
    '....KLLPGGPLLK....',
    '...KLPPAWWAPPLK...',
    '...KPPPVGGVPPPK...',
    '..KLPPPVGGVPPPLK..',
    '..KPPPPVGGVPPPPK..',
    '..KVVVVAGGAVVVVK..',
    '..KGGGGGGGGGGGGK..',
    '..KKKKKKKKKKKKKK..',
  ],
  praying: [
    '....K..K..K..K....',
    '....KY.KYYK.YK....',
    '....KGGKGGKGGK....',
    '....KGRGGGGJGK....',
    '...KKAAAAAAAAKK...',
    '..KMHHSSSSSSHHMK..',
    '..KHHSSSSSSSSHHK..',
    '..KNHSSESSSESNHK..',
    '..KNHGCSSSSCGNHK..',
    '..KNNHSSSSSSHNNK..',
    '...KKNDDDDDDNKK...',
    '..KLLPGGGGGGPLLK..',
    '..KLPPKSSSSKPPLK..',
    '..KVVPKSSSSKPVVK..',
    '...KKKKGGGGKKKK...',
    '....KLLPGGPLLK....',
    '....KLLPGGPLLK....',
    '...KLPPAWWAPPLK...',
    '...KPPPVGGVPPPK...',
    '..KLPPPVGGVPPPLK..',
    '..KPPPPVGGVPPPPK..',
    '..KVVVVAGGAVVVVK..',
    '..KGGGGGGGGGGGGK..',
    '..KKKKKKKKKKKKKK..',
  ],
  distressed: [
    '..................',
    '....K..K..K..K....',
    '....KY.KYYK.YK....',
    '....KGGKGGKGGK....',
    '....KGRGGGGJGK....',
    '...KKAAAAAAAAKK...',
    '..KMHHSSSSSSHHMK..',
    '..KHHSSSSSSSSHHK..',
    '..KNHJSEJSSESJHK..',
    '..KNHJCSSRRSCJHK..',
    '..KNNHSSSSSSHNNK..',
    '...KKNDDDDDDNKK...',
    '..KLLPGGGGGGPLLK..',
    '..KLPPKSSSSKPPLK..',
    '..KVVPKDDDDKPVVK..',
    '...KKKKGGGGKKKK...',
    '....KLLPGGPLLK....',
    '...KLPPAWWAPPLK...',
    '...KPPPVGGVPPPK...',
    '...KLPPVGGVPPPLK..',
    '...KPPPVGGVPPPPK..',
    '...KVVVAGGAVVVVK..',
    '...KGGGGGGGGGGGK..',
    '...KKKKKKKKKKKKK..',
  ],
};

function drawHDQueenFigure(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  mood: QueenMood,
  animTick: number,
  scale = 1
): void {
  const breathe = Math.sin(animTick * 0.08) * 0.6;
  ctx.save();
  ctx.translate(x, y + breathe * 0.4);
  if (scale !== 1) {
    ctx.scale(scale, scale);
  }

  // Warm Royal Golden Aura behind Queen Aurelia
  const aura = ctx.createRadialGradient(0, -1, 1, 0, -1, 16);
  aura.addColorStop(0, mood === 'distressed' ? 'rgba(244, 63, 94, 0.36)' : 'rgba(250, 204, 21, 0.36)');
  aura.addColorStop(0.65, 'rgba(192, 132, 252, 0.16)');
  aura.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = aura;
  ctx.beginPath();
  ctx.arc(0, -1, 16, 0, Math.PI * 2);
  ctx.fill();

  // Cascading Chestnut Hair Back Layer
  ctx.fillStyle = '#5c2d0c';
  ctx.strokeStyle = '#090d16';
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.arc(0, -6.2, 6.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Flowing Velvet Royal Gown (Orchid-Amethyst + Gold Brocade Sash)
  const gownGrad = ctx.createLinearGradient(0, -3, 0, 12.5);
  gownGrad.addColorStop(0, '#c084fc');
  gownGrad.addColorStop(0.45, '#9333ea');
  gownGrad.addColorStop(1, '#581c87');
  ctx.fillStyle = gownGrad;
  ctx.beginPath();
  ctx.moveTo(-4.8, -2.5);
  ctx.lineTo(4.8, -2.5);
  ctx.lineTo(8.5, 12.2);
  ctx.lineTo(-8.5, 12.2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Gold Center Sash & Royal Hem Embroidery
  ctx.fillStyle = '#facc15';
  ctx.fillRect(-1.8, -2.2, 3.6, 14.0);
  ctx.fillRect(-8.2, 10.6, 16.4, 1.6);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(0, 1.5, 1.1, 0, Math.PI * 2);
  ctx.fill();

  // Sleeves & Mood-Reactive Hands
  ctx.fillStyle = '#d8b4fe';
  if (mood === 'cheering') {
    const wave = Math.sin(animTick * 0.25) * 1.2;
    ctx.beginPath();
    ctx.roundRect(-7.2, -2.2, 3.0, 5.2, 1.2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.roundRect(4.2, -7.8 + wave, 3.0, 5.8, 1.2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#fde68a';
    ctx.beginPath();
    ctx.arc(5.7, -8.5 + wave, 1.6, 0, Math.PI * 2);
    ctx.fill();
  } else if (mood === 'praying' || mood === 'distressed') {
    // Hands clasped at heart
    ctx.beginPath();
    ctx.roundRect(-6.4, -2.0, 3.2, 4.8, 1.2);
    ctx.roundRect(3.2, -2.0, 3.2, 4.8, 1.2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#fed7aa';
    ctx.beginPath();
    ctx.arc(0, 0.2, 2.2, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.roundRect(-6.8, -2.0, 2.8, 5.5, 1.2);
    ctx.roundRect(4.0, -2.0, 2.8, 5.5, 1.2);
    ctx.fill();
    ctx.stroke();
  }

  // Lifelike Royal Face & Rosy Cheeks
  ctx.fillStyle = '#fde68a';
  ctx.beginPath();
  ctx.arc(0, -6.8, 4.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Framing Hair Locks
  ctx.fillStyle = '#92400e';
  ctx.beginPath();
  ctx.arc(-3.8, -6.8, 1.7, 0, Math.PI * 2);
  ctx.arc(3.8, -6.8, 1.7, 0, Math.PI * 2);
  ctx.fill();

  // Rosy Blush
  ctx.fillStyle = 'rgba(244, 114, 182, 0.65)';
  ctx.beginPath();
  ctx.arc(-2.4, -5.8, 0.9, 0, Math.PI * 2);
  ctx.arc(2.4, -5.8, 0.9, 0, Math.PI * 2);
  ctx.fill();

  // Expressive Eyes & Mouth
  ctx.fillStyle = '#1e1b4b';
  if (mood === 'praying') {
    ctx.fillRect(-2.4, -7.2, 1.6, 0.7);
    ctx.fillRect(0.8, -7.2, 1.6, 0.7);
  } else {
    ctx.beginPath();
    ctx.arc(-1.6, -7.3, 0.85, 0, Math.PI * 2);
    ctx.arc(1.6, -7.3, 0.85, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-1.9, -7.8, 0.55, 0.55);
    ctx.fillRect(1.3, -7.8, 0.55, 0.55);
  }

  if (mood === 'distressed') {
    // Sparkling Sapphire Tears
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(-2.1, -6.2, 0.8, 1.6);
    ctx.fillRect(1.4, -6.2, 0.8, 1.6);
    ctx.fillStyle = '#be123c';
    ctx.beginPath();
    ctx.arc(0, -4.5, 1.0, 0, Math.PI * 2);
    ctx.fill();
  } else if (mood === 'cheering') {
    ctx.fillStyle = '#e11d48';
    ctx.beginPath();
    ctx.arc(0, -5.1, 1.35, 0, Math.PI);
    ctx.fill();
  } else {
    ctx.strokeStyle = '#be123c';
    ctx.lineWidth = 0.65;
    ctx.beginPath();
    ctx.arc(0, -5.2, 1.0, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
  }

  // Gleaming 3-Spire Royal Gold Crown with Ruby & Sapphire Jewels
  const crownGrad = ctx.createLinearGradient(-4.5, -14, 4.5, -10);
  crownGrad.addColorStop(0, '#fef08a');
  crownGrad.addColorStop(0.5, '#facc15');
  crownGrad.addColorStop(1, '#d97706');
  ctx.fillStyle = crownGrad;
  ctx.strokeStyle = '#090d16';
  ctx.lineWidth = 0.85;
  ctx.beginPath();
  ctx.moveTo(-4.4, -10.2);
  ctx.lineTo(-4.8, -13.8);
  ctx.lineTo(-2.0, -11.6);
  ctx.lineTo(0, -14.8);
  ctx.lineTo(2.0, -11.6);
  ctx.lineTo(4.8, -13.8);
  ctx.lineTo(4.4, -10.2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Crown Jewels
  ctx.fillStyle = '#f43f5e';
  ctx.beginPath();
  ctx.arc(0, -11.4, 0.9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#38bdf8';
  ctx.fillRect(-3.2, -11.6, 1.0, 1.0);
  ctx.fillRect(2.2, -11.6, 1.0, 1.0);

  ctx.restore();
}

export function drawQueen(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  mood: QueenMood = 'watching',
  animTick = 0
): void {
  if (isHDCanvas(ctx)) {
    drawHDQueenFigure(ctx, x, y, mood, animTick, 1.08);
    return;
  }

  const left = Math.round(x - 9);
  const top = Math.round(y - 12);

  blitMatrixSprite(ctx, `queen_${mood}`, left, top, QUEEN_MOOD_FRAMES[mood], QUEEN_PALETTE, false);

  const bob = Math.floor(animTick / 15) % 2;
  if (mood === 'cheering') {
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(left + 2, top - 2 - bob, 2, 2);
    ctx.fillRect(left + 14, top - 3 + bob, 2, 2);
  } else if (mood === 'praying') {
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(left + 8, top - 2, 2, 1);
  } else if (mood === 'distressed') {
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(left + 8, top - 4, 2, 2);
    ctx.fillRect(left + 8, top - 1, 2, 1);
  }
}

export function drawQueenPortrait(
  qCtx: CanvasRenderingContext2D,
  mood: QueenMood = 'watching',
  animTick = 0
): void {
  if (isHDCanvas(qCtx)) {
    const cw = qCtx.canvas?.width || 144;
    const ch = qCtx.canvas?.height || 192;
    const sx = cw / 36;
    const sy = ch / 48;

    qCtx.save();
    qCtx.scale(sx, sy);

    const bgMap: Record<QueenMood, { top: string; bot: string; glow: string; border: string }> = {
      watching: { top: '#1e1b4b', bot: '#311042', glow: 'rgba(250, 204, 21, 0.35)', border: '#facc15' },
      cheering: { top: '#064e3b', bot: '#1e3a2f', glow: 'rgba(253, 224, 71, 0.45)', border: '#fde047' },
      praying: { top: '#451a03', bot: '#27130a', glow: 'rgba(251, 146, 60, 0.38)', border: '#fb923c' },
      distressed: { top: '#4c0519', bot: '#1f0914', glow: 'rgba(244, 63, 94, 0.42)', border: '#f43f5e' },
    };
    const theme = bgMap[mood];

    const grad = qCtx.createLinearGradient(0, 0, 0, 48);
    grad.addColorStop(0, theme.top);
    grad.addColorStop(1, theme.bot);
    qCtx.fillStyle = grad;
    qCtx.fillRect(0, 0, 36, 48);

    // Warm Torchlight Alcove Halo
    const halo = qCtx.createRadialGradient(18, 22, 2, 18, 22, 20);
    halo.addColorStop(0, theme.glow);
    halo.addColorStop(1, 'rgba(0,0,0,0)');
    qCtx.fillStyle = halo;
    qCtx.fillRect(0, 0, 36, 48);

    // Ornate Gold Gothic Arch Trim
    qCtx.strokeStyle = theme.border;
    qCtx.lineWidth = 1.2;
    qCtx.strokeRect(1.5, 1.5, 33, 45);

    drawHDQueenFigure(qCtx, 18, 26, mood, animTick, 1.55);
    qCtx.restore();
    return;
  }

  qCtx.imageSmoothingEnabled = false;
  const bgMap: Record<QueenMood, { bg: string; arch: string; accent: string }> = {
    watching: { bg: '#161426', arch: '#2e2546', accent: '#60a5fa' },
    cheering: { bg: '#132a1e', arch: '#1e4631', accent: '#facc15' },
    praying: { bg: '#2a1e12', arch: '#46321d', accent: '#fb923c' },
    distressed: { bg: '#2d1218', arch: '#4c1d26', accent: '#ef4444' },
  };
  const theme = bgMap[mood];

  qCtx.fillStyle = theme.bg;
  qCtx.fillRect(0, 0, 36, 48);
  qCtx.fillStyle = theme.arch;
  qCtx.fillRect(0, 0, 36, 2);
  qCtx.fillRect(0, 0, 2, 48);
  qCtx.fillRect(34, 0, 2, 48);
  qCtx.fillStyle = theme.accent;
  qCtx.fillRect(4, 1, 28, 1);

  renderPixelGrid(qCtx, 0, 0, QUEEN_MOOD_FRAMES[mood], QUEEN_PALETTE, 2, false);

  const pulse = Math.floor(animTick / 12) % 2;
  if (mood === 'cheering') {
    qCtx.fillStyle = '#fef08a';
    qCtx.fillRect(4, 6 + pulse, 2, 2);
    qCtx.fillRect(30, 4 - pulse, 2, 2);
  } else if (mood === 'distressed') {
    qCtx.fillStyle = '#ef4444';
    qCtx.fillRect(4, 4, 2, 4);
    qCtx.fillRect(30, 4, 2, 4);
  }
}

// ============================================================================
// 4. GOBLIN RAIDERS (18x20 Logical Pixels)
// ============================================================================

export const GOBLIN_PALETTE: Record<string, string> = {
  K: '#121318', // Crisp 1px dark outline
  I: '#57534e', // Dark iron helmet shadow
  H: '#78716c', // Riveted iron helmet midtone
  M: '#a8a29e', // Iron helmet highlight & steel dagger midtone
  R: '#e7e5e4', // Bright helmet rivet dots & dagger razor edge
  B: '#b45309', // Bronze helmet ridge & belt buckle
  A: '#f59e0b', // Bright bronze crest highlight
  D: '#15803d', // Dark forest-green goblin skin shadow
  G: '#16a34a', // Goblin green skin base
  L: '#22c55e', // Vibrant goblin green midtone
  C: '#4ade80', // Goblin brow, ear tip & muscle highlight
  Y: '#facc15', // Glowing yellow goblin eyes & inner torch flame
  E: '#ef4444', // Red eye pupil glint
  W: '#ffffff', // White fangs, clenched stagger teeth & '!!' shock markers
  T: '#78350f', // Brown leather loincloth, bracers, torch handle & dagger hilt
  N: '#451a03', // Dark leather shadow
  O: '#ea580c', // Outer orange-red torch flame
  F: '#f97316', // Mid orange torch flame
  Q: '#fef08a', // White-yellow torch flame core
  S: '#64748b', // Steel dagger blade shadow
};

export const GOBLIN_FRAMES = {
  // 1. Torch Goblin Patrol Walk Frame 0 (2-HP Helmeted base)
  torch_walk1: [
    '..............OO..', // 00
    '....KKKKKK...OFFO.', // 01
    '...KIHMMHIK..OFQO.', // 02
    '..KIHRBBRHIK.OYYO.', // 03
    '..KIHBBBBHIK..KK..', // 04
    'KKKCCCCCCCCKKKTT..', // 05
    'KCLGGGGGGGGGLCKT..', // 06
    '.KDGYEGGGEYGDKT...', // 07
    '..KGGGGGGGGGGKT...', // 08
    '..KDGWKKKKWGDKT...', // 09
    '...KKKKKKKKKKTT...', // 10
    '..KCLGGGGGGGLCTK..', // 11
    '..KTTGGGGGGGGTTK..', // 12
    '..KGGKNNBNNKGGK...', // 13
    '...KKKTTTTTKKK....', // 14
    '....KTTTTTTTK.....', // 15
    '...KGGK...KGGK....', // 16
    '...KDDK...KDDK....', // 17
    '..KTTTK...KTTTK...', // 18
    '..KKKKK...KKKKK...', // 19
  ],

  // 2. Torch Goblin Patrol Walk Frame 1 (2-HP Helmeted base, alternate stride & flickering flame)
  torch_walk2: [
    '...............O..', // 00
    '....KKKKKK....OFO.', // 01
    '...KIHMMHIK..OFFQO', // 02
    '..KIHRBBRHIK.OYYFO', // 03
    '..KIHBBBBHIK..KK..', // 04
    'KKKCCCCCCCCKKKTT..', // 05
    'KCLGGGGGGGGGLCKT..', // 06
    '.KDGYEGGGEYGDKT...', // 07
    '..KGGGGGGGGGGKT...', // 08
    '..KDGWKKKKWGDKT...', // 09
    '...KKKKKKKKKKTT...', // 10
    '..KCLGGGGGGGLCTK..', // 11
    '..KTTGGGGGGGGTTK..', // 12
    '..KGGKNNBNNKGGK...', // 13
    '...KKKTTTTTKKK....', // 14
    '....KTTTTTTTK.....', // 15
    '....KGGK.KGGK.....', // 16
    '....KDDK.KDDK.....', // 17
    '...KTTTK.KTTTK....', // 18
    '...KKKKK.KKKKK....', // 19
  ],

  // 3. Dagger Goblin Patrol Walk Frame 0 (2-HP Helmeted base, metallic iron dagger raised)
  dagger_walk1: [
    '..................', // 00
    '....KKKKKK........', // 01
    '...KIHMMHIK.......', // 02
    '..KIHRBBRHIK......', // 03
    '..KIHBBBBHIK....KK', // 04
    'KKKCCCCCCCCKKK.KRM', // 05
    'KCLGGGGGGGGGLCKRSM', // 06
    '.KDGYEGGGEYGDKRSMK', // 07
    '..KGGGGGGGGGGKSMK.', // 08
    '..KDGWKKKKWGDKTBK.', // 09
    '...KKKKKKKKKKTTK..', // 10
    '..KCLGGGGGGGLCTK..', // 11
    '..KTTGGGGGGGGKK...', // 12
    '..KGGKNNBNNKGGK...', // 13
    '...KKKTTTTTKKK....', // 14
    '....KTTTTTTTK.....', // 15
    '...KGGK...KGGK....', // 16
    '...KDDK...KDDK....', // 17
    '..KTTTK...KTTTK...', // 18
    '..KKKKK...KKKKK...', // 19
  ],

  // 4. Dagger Goblin Patrol Walk Frame 1 (2-HP Helmeted base, dagger poised low/forward)
  dagger_walk2: [
    '..................', // 00
    '....KKKKKK........', // 01
    '...KIHMMHIK.......', // 02
    '..KIHRBBRHIK......', // 03
    '..KIHBBBBHIK......', // 04
    'KKKCCCCCCCCKKK....', // 05
    'KCLGGGGGGGGGLCK...', // 06
    '.KDGYEGGGEYGDK..KK', // 07
    '..KGGGGGGGGGGK.KRM', // 08
    '..KDGWKKKKWGDKKRSM', // 09
    '...KKKKKKKKKKTBRSM', // 10
    '..KCLGGGGGGGLCTSMK', // 11
    '..KTTGGGGGGGGTTKK.', // 12
    '..KGGKNNBNNKGGK...', // 13
    '...KKKTTTTTKKK....', // 14
    '....KTTTTTTTK.....', // 15
    '....KGGK.KGGK.....', // 16
    '....KDDK.KDDK.....', // 17
    '...KTTTK.KTTTK....', // 18
    '...KKKKK.KKKKK....', // 19
  ],

  // 5. Hit-Stagger ('!!' reaction frame — recoiled arms, open toothy grimace, '!!' shock markers)
  stagger: [
    '.WW.KKKKKK....WW..', // 00
    '.WWKIHMMHIK...WW..', // 01
    '...KIHRBBRHIK.....', // 02
    '..KIHBBBBHIK......', // 03
    '.WW.CCCCCCCC..WW..', // 04
    'KKKCLGGGGGLCKKK...', // 05
    'KCLGYWGGGWYGLCK...', // 06
    '.KDGWWWWWWWWGDK...', // 07
    '..KGWKKKKKKWGK....', // 08
    '..KDGWWWWWWGDK....', // 09
    '.KTTKKKKKKKKTTK...', // 10
    '.KGGCLGGGGGLGGK...', // 11
    '.KKKKGGGGGGKKKK...', // 12
    '....KNNBNNK.......', // 13
    '...KKTTTTTKK......', // 14
    '...KTTTTTTTK......', // 15
    '..KGGK...KGGK.....', // 16
    '..KDDK...KDDK.....', // 17
    '.KTTTK...KTTTK....', // 18
    '.KKKKK...KKKKK....', // 19
  ],
};

// 1-HP Helmet-Stripped Head Overlay (replaces cols 0..12 of rows 0..4 when hp === 1)
export const GOBLIN_BARE_HEAD_ROWS: readonly string[] = [
  '......KK..........', // 00 (scruffy hair tuft)
  '....KKCCKK........', // 01 (bare green scalp top)
  '...KCCLLLLCK......', // 02 (exposed green dome)
  '..KCLGGGGGLCK.....', // 03 (forehead with bruise)
  '..KDGGGGGGGDK.....', // 04 (brow ridge)
];

function drawHDGoblin(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  options: GoblinRenderOptions
): void {
  const isDagger = options.variant === 'goblin_dagger' || options.variant === 'dagger';
  const hp = options.hp ?? 2;
  const maxHp = options.maxHp ?? 2;
  const step = Math.abs(Math.floor(options.walkFrame ?? 0)) % 2;
  const stagger = Boolean(options.stagger);
  const stride = stagger ? 0 : step === 0 ? -1.8 : 1.8;
  const f = Math.abs(Math.floor(options.flameFrame ?? 0)) % 4;

  ctx.save();
  ctx.translate(x, y);

  // 1. Warm Radial Torchlight Floor Pool for Torch Goblins (makes castle & character pop!)
  if (!isDagger) {
    const glowR = 25 + (f % 2) * 2;
    const torchPool = ctx.createRadialGradient(7, -4, 1, 4, 0, glowR);
    torchPool.addColorStop(0, 'rgba(251, 146, 60, 0.36)');
    torchPool.addColorStop(0.55, 'rgba(234, 88, 12, 0.14)');
    torchPool.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = torchPool;
    ctx.beginPath();
    ctx.arc(4, 0, glowR, 0, Math.PI * 2);
    ctx.fill();
  } else {
    const emeraldAura = ctx.createRadialGradient(0, 1, 1, 0, 1, 15);
    emeraldAura.addColorStop(0, 'rgba(74, 222, 128, 0.22)');
    emeraldAura.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = emeraldAura;
    ctx.beginPath();
    ctx.arc(0, 1, 15, 0, Math.PI * 2);
    ctx.fill();
  }

  // Contact shadow
  ctx.fillStyle = 'rgba(5, 8, 15, 0.56)';
  ctx.beginPath();
  ctx.ellipse(0, 11.2, 8.2, 3.0, 0, 0, Math.PI * 2);
  ctx.fill();

  // Boots & Stride Legs
  ctx.fillStyle = '#451a03';
  ctx.strokeStyle = '#090d16';
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.roundRect(-5.6, 7.2 + stride * 0.45, 4.4, 4.0, 1.2);
  ctx.roundRect(1.2, 7.2 - stride * 0.45, 4.4, 4.0, 1.2);
  ctx.fill();
  ctx.stroke();

  // Muscular Emerald-Lime Torso & Leather War Harness
  const skinGrad = ctx.createLinearGradient(0, -6, 0, 8);
  skinGrad.addColorStop(0, '#4ade80');
  skinGrad.addColorStop(0.5, '#22c55e');
  skinGrad.addColorStop(1, '#15803d');
  ctx.fillStyle = skinGrad;
  ctx.beginPath();
  ctx.roundRect(-6.2, -2.6, 12.4, 10.4, 2.8);
  ctx.fill();
  ctx.stroke();

  // Cross-chest leather baldric + bronze ring
  ctx.strokeStyle = '#78350f';
  ctx.lineWidth = 2.0;
  ctx.beginPath();
  ctx.moveTo(-5.2, -2.0);
  ctx.lineTo(4.8, 4.2);
  ctx.stroke();

  // Iron Shoulder Pauldron (left shoulder)
  ctx.fillStyle = '#64748b';
  ctx.strokeStyle = '#090d16';
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.ellipse(-6.2, -1.2, 3.0, 2.2, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Studded Leather Belt & Bronze Skull Buckle
  ctx.fillStyle = '#78350f';
  ctx.fillRect(-5.8, 3.4, 11.6, 3.4);
  ctx.fillStyle = '#f59e0b';
  ctx.beginPath();
  ctx.roundRect(-2.0, 3.1, 4.0, 3.2, 0.8);
  ctx.fill();

  // Off-hand Round Oak & Iron Raider Buckler (gives crisp warrior diameter & silhouette)
  const bucklerY = 1.6 - stride * 0.25;
  const bucklerGrad = ctx.createRadialGradient(-7.2, bucklerY - 1, 0.6, -6.8, bucklerY, 4.8);
  bucklerGrad.addColorStop(0, '#d97706');
  bucklerGrad.addColorStop(0.7, '#92400e');
  bucklerGrad.addColorStop(1, '#451a03');
  ctx.fillStyle = bucklerGrad;
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 1.25;
  ctx.beginPath();
  ctx.arc(-6.8, bucklerY, 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#cbd5e1';
  ctx.beginPath();
  ctx.arc(-6.8, bucklerY, 1.5, 0, Math.PI * 2);
  ctx.fill();

  // Pointed Goblin Ears (wide & unmistakable silhouette)
  ctx.fillStyle = '#22c55e';
  ctx.strokeStyle = '#090d16';
  ctx.lineWidth = 1.05;
  ctx.beginPath();
  ctx.moveTo(-5.2, -7.2);
  ctx.lineTo(-11.4, -9.4);
  ctx.lineTo(-5.6, -3.8);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(5.2, -7.2);
  ctx.lineTo(11.4, -9.4);
  ctx.lineTo(5.6, -3.8);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Sculpted Goblin Head (jawed warrior contour rather than plain circle)
  ctx.fillStyle = skinGrad;
  ctx.beginPath();
  ctx.moveTo(-5.8, -7.2);
  ctx.quadraticCurveTo(0, -12.4, 5.8, -7.2);
  ctx.quadraticCurveTo(5.6, -1.6, 0, -0.6);
  ctx.quadraticCurveTo(-5.6, -1.6, -5.8, -7.2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Fierce V-Shaped Brow Ridge + Glowing Amber Eyes + Red Slit Pupils
  ctx.fillStyle = stagger ? '#ffffff' : '#facc15';
  ctx.beginPath();
  ctx.ellipse(-2.3, -6.2, 1.6, 1.25, 0.2, 0, Math.PI * 2);
  ctx.ellipse(2.3, -6.2, 1.6, 1.25, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#dc2626';
  ctx.fillRect(-2.6, -6.8, 0.85, 1.2);
  ctx.fillRect(1.9, -6.8, 0.85, 1.2);

  ctx.strokeStyle = '#090d16';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-4.4, -7.6);
  ctx.lineTo(-0.8, -6.5);
  ctx.moveTo(4.4, -7.6);
  ctx.lineTo(0.8, -6.5);
  ctx.stroke();

  // Snarling Mouth & Twin White Fangs
  ctx.fillStyle = '#090d16';
  ctx.beginPath();
  ctx.roundRect(-3.4, -3.9, 6.8, stagger ? 2.4 : 1.6, 0.7);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(-2.7, -2.3);
  ctx.lineTo(-1.8, -4.5);
  ctx.lineTo(-1.0, -2.3);
  ctx.moveTo(1.0, -2.3);
  ctx.lineTo(1.8, -4.5);
  ctx.lineTo(2.7, -2.3);
  ctx.fill();

  // 2-HP Riveted Horned Iron-Bronze Helmet (stripped off when hp === 1!)
  if (hp >= 2) {
    // Curved Side War-Horns
    ctx.fillStyle = '#f5f5f4';
    ctx.strokeStyle = '#090d16';
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.moveTo(-4.8, -9.5);
    ctx.quadraticCurveTo(-8.8, -10.5, -9.4, -13.8);
    ctx.quadraticCurveTo(-6.2, -12.6, -3.0, -11.2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(4.8, -9.5);
    ctx.quadraticCurveTo(8.8, -10.5, 9.4, -13.8);
    ctx.quadraticCurveTo(6.2, -12.6, 3.0, -11.2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    const helmGrad = ctx.createLinearGradient(-5, -13, 5, -8);
    helmGrad.addColorStop(0, '#e2e8f0');
    helmGrad.addColorStop(0.5, '#64748b');
    helmGrad.addColorStop(1, '#334155');
    ctx.fillStyle = helmGrad;
    ctx.beginPath();
    ctx.arc(0, -8.5, 6.0, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Bronze Crest & Nose-Guard Rim
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(-6.1, -9.2, 12.2, 1.5);
    ctx.fillRect(-1.1, -14.4, 2.2, 5.4);
  } else {
    // Bare green scalp with scruffy dark tuft & battle bruise
    ctx.strokeStyle = '#14532d';
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.moveTo(-2.2, -10.6);
    ctx.lineTo(1.6, -9.2);
    ctx.stroke();
  }

  // Weapon Arm: Blazing Siege Torch vs. Gleaming Steel Dagger
  if (!isDagger) {
    // Iron-banded Torch Shaft
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(5.4, 1.8);
    ctx.lineTo(9.4, -8.0);
    ctx.stroke();

    ctx.fillStyle = '#475569';
    ctx.fillRect(7.9, -8.6, 3.2, 1.6);

    // Sculpted Teardrop Vector Torch Flame
    const flickerY = (f % 2) * 1.4;
    const swayX = f === 1 ? 0.7 : f === 3 ? -0.7 : 0;
    ctx.fillStyle = '#ea580c';
    ctx.beginPath();
    ctx.moveTo(9.5 + swayX, -15.6 - flickerY);
    ctx.quadraticCurveTo(13.8, -11.4, 12.2, -8.2);
    ctx.quadraticCurveTo(9.5, -6.6, 6.8, -8.2);
    ctx.quadraticCurveTo(5.4, -11.4, 9.5 + swayX, -15.6 - flickerY);
    ctx.fill();

    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.moveTo(9.5 + swayX * 0.6, -13.6 - flickerY * 0.7);
    ctx.quadraticCurveTo(12.2, -10.8, 11.2, -8.5);
    ctx.quadraticCurveTo(9.5, -7.4, 7.8, -8.5);
    ctx.quadraticCurveTo(6.8, -10.8, 9.5 + swayX * 0.6, -13.6 - flickerY * 0.7);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(9.5, -9.5, 1.35, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Raised Wicked Double-Edged Steel Assassin Dagger
    const bladeRaise = step === 0 ? -1.5 : 1.0;
    ctx.save();
    ctx.translate(7.8, -2.5 + bladeRaise);
    ctx.rotate(-0.32);
    ctx.fillStyle = '#78350f';
    ctx.fillRect(-1.1, 1.8, 2.2, 2.8);
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.roundRect(-3.0, 1.2, 6.0, 1.6, 0.6);
    ctx.fill();
    const bladeGrad = ctx.createLinearGradient(-2.4, 0, 2.4, 0);
    bladeGrad.addColorStop(0, '#f8fafc');
    bladeGrad.addColorStop(0.5, '#cbd5e1');
    bladeGrad.addColorStop(1, '#64748b');
    ctx.fillStyle = bladeGrad;
    ctx.strokeStyle = '#090d16';
    ctx.lineWidth = 0.95;
    ctx.beginPath();
    ctx.moveTo(0, -9.2);
    ctx.lineTo(2.5, 1.2);
    ctx.lineTo(-2.5, 1.2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  // Stagger '!!' Shockburst
  if (stagger) {
    ctx.font = 'bold 7px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fef08a';
    ctx.fillText('!!', 0, -15.5);
    ctx.textAlign = 'left';
  } else if (maxHp >= 2) {
    // Crisp 2-Pip Overhead Armor/HP Bar
    const barW = 12;
    const barX = -6;
    const barY = -16.8;
    ctx.fillStyle = 'rgba(9, 13, 22, 0.85)';
    ctx.fillRect(barX - 0.8, barY - 0.8, barW + 1.6, 3.2);
    for (let i = 0; i < maxHp; i++) {
      const pipW = (barW - 1) / maxHp;
      ctx.fillStyle = i < hp ? (hp === 2 ? '#4ade80' : '#fb923c') : '#1e293b';
      ctx.fillRect(barX + i * (pipW + 1), barY, pipW, 1.6);
    }
  }

  ctx.restore();

  // Lodged arrows
  const lodged = options.lodgedArrows;
  if (typeof lodged === 'number' && lodged > 0) {
    for (let i = 0; i < lodged; i++) {
      const ox = i === 0 ? 0 : i % 2 === 1 ? -4 : 4;
      drawLodgedArrow(ctx, Math.round(x + ox), Math.round(y + 6), 0);
    }
  } else if (Array.isArray(lodged)) {
    for (const item of lodged) {
      drawLodgedArrow(
        ctx,
        Math.round(x + (item.offsetX ?? 0)),
        Math.round(y + (item.offsetY ?? 6)),
        item.angle ?? 0
      );
    }
  }
}

export function drawGoblin(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  options: GoblinRenderOptions = {}
): void {
  if (isHDCanvas(ctx)) {
    drawHDGoblin(ctx, x, y, options);
    return;
  }

  const left = Math.round(x - 9);
  const top = Math.round(y - 10);
  const isDagger = options.variant === 'goblin_dagger' || options.variant === 'dagger';
  const step = Math.abs(Math.floor(options.walkFrame ?? 0)) % 2;

  let baseGrid: readonly string[];
  if (options.stagger) {
    baseGrid = GOBLIN_FRAMES.stagger;
  } else if (isDagger) {
    baseGrid = step === 0 ? GOBLIN_FRAMES.dagger_walk1 : GOBLIN_FRAMES.dagger_walk2;
  } else {
    baseGrid = step === 0 ? GOBLIN_FRAMES.torch_walk1 : GOBLIN_FRAMES.torch_walk2;
  }

  // If 1 HP (helmet stripped), merge bare green scalp over cols 0..12 of rows 0..4
  const hp = options.hp ?? 2;
  let finalGrid = baseGrid;
  if (hp === 1 && !options.stagger) {
    finalGrid = baseGrid.map((row, r) => {
      if (r < 5) {
        return GOBLIN_BARE_HEAD_ROWS[r].slice(0, 13) + row.slice(13);
      }
      return row;
    });
  }

  renderPixelGrid(ctx, left, top, finalGrid, GOBLIN_PALETTE, 1, false);

  // Dynamic torch flame flicker on torch goblins
  if (!isDagger && !options.stagger) {
    const f = Math.abs(Math.floor(options.flameFrame ?? 0)) % 4;
    ctx.fillStyle = f % 2 === 0 ? '#dc2626' : '#f97316';
    ctx.fillRect(left + 14 + (f % 2), top - 1, 2, 1);
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(left + 15, top + 1 + (f % 2), 1, 2);
  }

  // Render lodged arrows sticking out of the goblin
  const lodged = options.lodgedArrows;
  if (typeof lodged === 'number' && lodged > 0) {
    for (let i = 0; i < lodged; i++) {
      const ox = i === 0 ? 0 : i % 2 === 1 ? -4 : 4;
      drawLodgedArrow(ctx, Math.round(x + ox), top + 16, 0);
    }
  } else if (Array.isArray(lodged)) {
    for (const item of lodged) {
      drawLodgedArrow(
        ctx,
        Math.round(x + (item.offsetX ?? 0)),
        Math.round(y + (item.offsetY ?? 6)),
        item.angle ?? 0
      );
    }
  }
}

// ============================================================================
// 5. WINGED BATS (20x14 Logical Pixels across 5 Wing-Flap Frames)
// ============================================================================

export const BAT_PALETTE: Record<string, string> = {
  K: '#0f0a19', // Deep midnight-black 1px outline
  B: '#1e1b2e', // Dark cavern bat body core
  D: '#3b0764', // Deep indigo-purple wing/body shadow
  V: '#581c87', // Dark violet membrane shadow
  P: '#7e22ce', // Rich purple wing membrane midtone
  M: '#9333ea', // Vibrant magenta-purple wing interior
  L: '#a855f7', // Bright orchid-violet upper wing ridge
  C: '#c084fc', // Light lavender wing strut highlight & flap motion lines
  Y: '#facc15', // Glowing yellow bat eyes
  W: '#fef08a', // Bright eye catchlight / tiny fang
};

export const BAT_FRAMES: Record<BatFrameName, readonly string[]> = {
  // Frame 0: 'spread' (Horizontal arched bat wings)
  spread: [
    '....................', // 00
    '....................', // 01
    '..KKKK........KKKK..', // 02
    '.KCLLPK.K..K.KPLLCK.', // 03
    'KCLMMMPKKBBKKPMMMLCK', // 04
    'KLMMMMPBBBBBBPMMMMLK', // 05
    'KPMMMPBBYBBYBBPMMMPK', // 06
    'KPVVPBBBBWWBBBBPVVPK', // 07
    '.KPK.KPKBBBBKPK.KPK.', // 08
    '.....K.KBBBBK.K.....', // 09
    '........KBBK........', // 10
    '........K..K........', // 11
    '....................', // 12
    '....................', // 13
  ],

  // Frame 1: 'mid' (Cupped mid-stroke wings)
  mid: [
    '....................', // 00
    '....................', // 01
    '....................', // 02
    '.KKKKK..K..K..KKKKK.', // 03
    'KCLLLPKKKBBKKKPLLLCK', // 04
    'KLMMMMPBBBBBBPMMMMLK', // 05
    'KPMMMMPBYBBYBPMMMMPK', // 06
    'KPVVVPBBBBWWBBBBVVPK', // 07
    '.KPK.KPKBBBBKPK.KPK.', // 08
    '.....K.KBBBBK.K.....', // 09
    '........KBBK........', // 10
    '........K..K........', // 11
    '....................', // 12
    '....................', // 13
  ],

  // Frame 2: 'down' (Full downward sweep with lavender motion lines)
  down: [
    '....................', // 00
    '....................', // 01
    '....KKK.K..K.KKK....', // 02
    '...KCLLKKBBKKLLCK...', // 03
    '..KCLMMPBBBBPMMLCK..', // 04
    '.KCLMMMPBYBBYPMMLCK.', // 05
    '.KLMMMMPBBBBWWMMMLK.', // 06
    'KPMMMVPBBBBBBPVMMMPK', // 07
    'KPVVP.KPKBBBBKPKPVPK', // 08
    'KPK...K.KBBBBK.K.KPK', // 09
    '.K..C....KBBK....C.K', // 10
    '....CC...K..K...CC..', // 11
    '.....C..........C...', // 12
    '....................', // 13
  ],

  // Frame 3: 'up' (High V-raised wings with motion ticks)
  up: [
    'KK................KK', // 00
    'KCK..............KCK', // 01
    'KCLLK..........KLLCK', // 02
    '.KCLMPK.K..K.KPMCLK.', // 03
    '.KLMMMPKKBBKKPMMMLK.', // 04
    '..KPMMMPBBBBPMMMPK..', // 05
    '..KPVVBBYBBYBBVVPK..', // 06
    '...KPKBBBBWWBBBBKPK.', // 07
    '..C..K.KBBBBK.K..C..', // 08
    '...C...KBBBBK...C...', // 09
    '........KBBK........', // 10
    '........K..K........', // 11
    '....................', // 12
    '....................', // 13
  ],

  // Frame 4: 'mid_up' (Recovery transition from high V to glide)
  mid_up: [
    '....................', // 00
    'KKK..............KKK', // 01
    'KCLLK..........KLLCK', // 02
    '.KCLMPK.K..K.KPMCLK.', // 03
    '.KLMMMPKKBBKKPMMMLK.', // 04
    '.KPMMMMPBBBBPMMMMPK.', // 05
    '..KPVVPBYBBYBPVVPK..', // 06
    '...KPKBBBBWWBBBBKPK.', // 07
    '.......KBBBBK.......', // 08
    '.......KBBBBK.......', // 09
    '........KBBK........', // 10
    '........K..K........', // 11
    '....................', // 12
    '....................', // 13
  ],
};

const BAT_FRAME_ORDER: readonly BatFrameName[] = ['spread', 'mid', 'down', 'up', 'mid_up'];

function resolveBatFrame(frame: BatFrame): BatFrameName {
  if (typeof frame === 'number') {
    return BAT_FRAME_ORDER[Math.abs(Math.floor(frame)) % BAT_FRAME_ORDER.length];
  }
  return frame;
}

function drawHDBat(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  resolved: BatFrameName
): void {
  const tipYMap: Record<BatFrameName, number> = {
    up: -8.5,
    mid_up: -5.5,
    spread: -1.5,
    mid: 1.5,
    down: 6.2,
  };
  const tipY = tipYMap[resolved];

  ctx.save();
  ctx.translate(x, y);

  // Soft Neon-Amethyst Visibility Halo
  const aura = ctx.createRadialGradient(0, 0, 1, 0, 0, 15);
  aura.addColorStop(0, 'rgba(216, 180, 254, 0.30)');
  aura.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = aura;
  ctx.beginPath();
  ctx.arc(0, 0, 15, 0, Math.PI * 2);
  ctx.fill();

  // Scalloped Orchid-Amethyst Wings (Left & Right)
  const wingGrad = ctx.createLinearGradient(0, -8, 0, 7);
  wingGrad.addColorStop(0, '#e879f9');
  wingGrad.addColorStop(0.5, '#a855f7');
  wingGrad.addColorStop(1, '#581c87');
  ctx.fillStyle = wingGrad;
  ctx.strokeStyle = '#090d16';
  ctx.lineWidth = 1.1;

  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(side * 2.5, -2.0);
    ctx.quadraticCurveTo(side * 8.5, tipY - 3.8, side * 13.0, tipY);
    ctx.quadraticCurveTo(side * 10.2, tipY + 3.2, side * 8.0, 3.8);
    ctx.quadraticCurveTo(side * 5.2, 1.5, side * 3.0, 3.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Bright Lavender Wing Ridge Highlight
    ctx.strokeStyle = '#f5d0fe';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(side * 2.8, -1.8);
    ctx.quadraticCurveTo(side * 8.2, tipY - 3.2, side * 12.2, tipY);
    ctx.stroke();
    ctx.strokeStyle = '#090d16';
    ctx.lineWidth = 1.1;
  }

  // Velvet Cavern Body & Pointed Ears
  ctx.fillStyle = '#2e1065';
  ctx.beginPath();
  ctx.ellipse(0, 0.5, 4.4, 4.8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(-3.2, -3.2);
  ctx.lineTo(-4.2, -7.2);
  ctx.lineTo(-1.0, -4.0);
  ctx.moveTo(3.2, -3.2);
  ctx.lineTo(4.2, -7.2);
  ctx.lineTo(1.0, -4.0);
  ctx.fill();
  ctx.stroke();

  // Glowing Golden Eyes & Tiny White Fangs
  ctx.fillStyle = '#fde047';
  ctx.beginPath();
  ctx.arc(-1.6, -0.8, 1.15, 0, Math.PI * 2);
  ctx.arc(1.6, -0.8, 1.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-1.5, 1.5, 0.9, 1.4);
  ctx.fillRect(0.6, 1.5, 0.9, 1.4);

  ctx.restore();
}

export function drawBat(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  frame: BatFrame = 0
): void {
  const resolved = resolveBatFrame(frame);
  if (isHDCanvas(ctx)) {
    drawHDBat(ctx, x, y, resolved);
    return;
  }
  const left = Math.round(x - 10);
  const top = Math.round(y - 7);
  blitMatrixSprite(ctx, `bat_${resolved}`, left, top, BAT_FRAMES[resolved], BAT_PALETTE, false);
}

// ============================================================================
// 6. OBSTACLES, HAZARDS, PROJECTILES, PARTICLES & HEARTS PALETTE
// ============================================================================

export const OBSTACLE_PROJECTILE_PALETTE: Record<string, string> = {
  '.': 'transparent',

  // --- Wood Palisade & Siege Crate Timber Palette ---
  O: '#231409', // 1px dark timber/charcoal outline
  K: '#140a04', // Deep crack / fissure black-brown
  D: '#47250d', // Deepest 3D side-panel & under-band shadow
  S: '#5c3112', // Dark umber timber shadow
  M: '#7c441d', // Recessed interior crate plank brown
  W: '#9c5a2b', // Main warm timber body brown
  B: '#b56c35', // Cross-brace & stake mid-light brown
  L: '#c9834b', // Left-edge & upper-bevel warm ochre highlight
  H: '#e09f67', // Splinter tip & bright wood highlight
  R: '#3b200e', // Horizontal palisade binding band / rope dark
  T: '#b87b48', // Palisade binding knot / lashing highlight

  // --- Blue-Iron Block & Steel Arrowhead Palette ---
  I: '#141e30', // 1px dark navy-iron outer border
  N: '#1c2f4c', // Outer bottom/right deep iron bevel
  U: '#2c4870', // Inner bottom/right slate-blue bevel & rivet shadow
  F: '#4f7bb0', // Steel-blue main face darker tone
  A: '#5b88bd', // Steel-blue main face fill
  P: '#76a5d9', // Steel-blue upper-left transition
  C: '#8ec0f0', // Inner top/left cyan bevel & secondary diagonal sheen
  E: '#c7e2ff', // Outer top/left icy-cyan bevel & rivet highlight
  V: '#ffffff', // Pure white specular diagonal streak, star glint & heart shine

  // --- Steel Broadhead & Fletching Greys (Projectiles) ---
  g: '#0f172a', // Broadhead / arrow dark steel outline
  d: '#334155', // Broadhead dark slate shadow
  m: '#475569', // Broadhead mid-dark steel & collar
  s: '#64748b', // Broadhead main steel body
  l: '#94a3b8', // Broadhead fuller ridge & feather shade
  e: '#cbd5e1', // Broadhead bevel & silver feather mid
  w: '#f8fafc', // Crisp white feather fletching & tip glint
  r: '#dc2626', // Arrow fletching red binding thread

  // --- Heart & Lost Heart Palette ---
  x: '#1c080c', // Active Heart 1px dark maroon outline
  q: '#990f1c', // Active Heart lower-right deep crimson shadow
  h: '#e6192e', // Active Heart vivid crimson fill
  p: '#ff99a8', // Active Heart pink-white specular transition
  z: '#14111a', // Lost Heart 1px dark charcoal outline
  u: '#1f1926', // Lost Heart lower-right dark shadow
  v: '#352b42', // Lost Heart dark charcoal-purple body
  n: '#4a3e59', // Lost Heart upper-left muted rim highlight
};

export const PALISADE_INTACT_24x18: readonly string[] = [
  '.OO..OO..OO..OO..OO..OO.', // 00: Pointed stake tips
  'OLWOOLWOOLWOOLWOOLWOOLWO', // 01: Upper bevels
  'OLBWOLBWOLBWOLBWOLBWOLBW', // 02: Stake shoulders
  'OLWSOLWSOLWSOLWSOLWSOLWS', // 03: Upper timber shafts
  'OLWSOLWSOLWSOLWSOLWSOLWS', // 04
  'OLWSOLWSOLWSOLWSOLWSOLWS', // 05
  'ORTDORTDORTDORTDORTDORTD', // 06: Upper horizontal binding band + knots
  'ORROORROORROORROORROORRO', // 07: Upper binding band shadow
  'OLWSOLWSOLWSOLWSOLWSOLWS', // 08: Mid timber shafts
  'OLWSOLWSOLWSOLWSOLWSOLWS', // 09
  'OLWSOLWSOLWSOLWSOLWSOLWS', // 10
  'OLWSOLWSOLWSOLWSOLWSOLWS', // 11
  'OLWSOLWSOLWSOLWSOLWSOLWS', // 12
  'ORTDORTDORTDORTDORTDORTD', // 13: Lower horizontal binding band + knots
  'ORROORROORROORROORROORRO', // 14: Lower binding band shadow
  'OLWSOLWSOLWSOLWSOLWSOLWS', // 15: Base stakes
  'OLSDOLSDOLSDOLSDOLSDOLSD', // 16: Ground shadow transition
  'OOOOOOOOOOOOOOOOOOOOOOOO', // 17: Bottom outline
];

export const PALISADE_BROKEN_24x18: readonly string[] = [
  '.OO..OO..........OO..OO.', // 00: Outer 4 stakes intact, center 2 breached
  'OLWOOLWO........OLWOOLWO', // 01
  'OLBWOLBW........OLBWOLBW', // 02
  'OLWSOLWS........OLWSOLWS', // 03
  'OLWSOLWS........OLWSOLWS', // 04
  'OLWSOLWS........OLWSOLWS', // 05
  'ORTDORTDO......OORTDORTD', // 06: Snapped upper binding band ends
  'ORROORRO........ORROORRO', // 07
  'OLWSOLWS........OLWSOLWS', // 08
  'OLWSOLWSO......OOLWSOLWS', // 09
  'OLWSOLWSOH....HOOLWSOLWS', // 10: Jagged bright wood splinter points
  'OLWSOLWSOLO..OHSOLWSOLWS', // 11: Asymmetric broken stake stubs
  'OLWSOLWSOLWOOSSSOLWSOLWS', // 12: Cracked inner stake bodies
  'ORTDORTDORTDDRTDORTDORTD', // 13: Lower binding band cracked in center
  'ORROORROORROORROORROORRO', // 14
  'OLWSOLWSOLKSOLKSOLWSOLWS', // 15: Vertical fissure cracks in stubs
  'OLSDOLSDOLKDOLKDOLSDOLSD', // 16
  'OOOOOOOOOOOOOOOOOOOOOOOO', // 17
];

export const CRATE_INTACT_20x18: readonly string[] = [
  '.OOOOOOOOOOOOOOOOOO.', // 00: Top outline (3/4 perspective bevel)
  'OLLLLLLLLLLLLLLLOSSO', // 01: Top frame rail highlight + 3D side top
  'OLBBBBBBBBBBBBBSOSSO', // 02: Top frame rail body
  'OLOOOOOOOOOOOOOSOSSO', // 03: Inner frame top shadow line
  'OLOMWMOMWMOMLBHSOSSO', // 04: Planks + Diagonal brace top-right
  'OLOMWMOMWMOLBWHSOSSO', // 05
  'OLOMWMOMWOLBWOMSOSSO', // 06
  'OLOMWMOMOLBWOMWSOSSO', // 07
  'OLOMWMOOLBWOMWMSOSSO', // 08: Planks + Diagonal brace center
  'OLOMWMOLBWOMWMWSOSSO', // 09
  'OLOMWOLBWOMWMOMSOSSO', // 10
  'OLOMOLBWOMWMOMWSOSSO', // 11
  'OLOOLBWOMWMOMWMSOSSO', // 12
  'OLOLBWOMWMOMWMWSODDO', // 13: Planks + Diagonal brace bottom-left
  'OLOOOOOOOOOOOOOSODDO', // 14: Inner frame bottom shadow line
  'OLWWWWWWWWWWWWWSODDO', // 15: Bottom frame rail
  'OSSSSSSSSSSSSSSSODDO', // 16: Bottom frame shadow
  'OOOOOOOOOOOOOOOOOOO.', // 17: Bottom outline with 3D corner tuck
];

export const CRATE_CRACKED_20x18: readonly string[] = [
  '.OOOOOOOOOOOOOOOOOO.', // 00
  'OLLLLLLKLLLLLLLLOSSO', // 01: Top rail crack notch
  'OLBBBBBKBBBBBBBSOSSO', // 02
  'OLOOOOOKOOOOOOOSOSSO', // 03
  'OLOMWMOKWMOMLBHSOSSO', // 04
  'OLOMWMOKHMOLBWHSOSSO', // 05: Splintered plank fissure
  'OLOMWMOOKOLBWOMSOSSO', // 06
  'OLOMWMOMOKKWOMWSOSSO', // 07: Crack across diagonal brace
  'OLOMWMOOLKHOMWMSOSSO', // 08
  'OLOMWMOLBWOKWMWSOSSO', // 09
  'OLOMWOLBWOMKMOMSOSSO', // 10
  'OLOMOLBWOMWKOMWSOSSO', // 11
  'OLOOLBWOMWMOKHMSOSSO', // 12
  'OLOLBWOMWMOMWKWSODDO', // 13
  'OLOOOOOOOOOOOOOSODDO', // 14
  'OLWWWWWWWWWWWWWSODDO', // 15
  'OSSSSSSSSSSSSSSSODDO', // 16
  'OOOOOOOOOOOOOOOOOOO.', // 17
];

export const BLUE_IRON_BLOCK_20x18: readonly string[] = [
  'IIIIIIIIIIIIIIIIIIII', // 00: 1px dark navy-iron outer border
  'IEEEEEEEEEEEEEEEEEUI', // 01: Outer top bevel (icy cyan-white)
  'IECCCCCCCCCCCCCCCUUI', // 02: Inner top bevel (sky cyan)
  'IECVUPAAAAAAAAECVUUI', // 03: Top-Left Rivet (3..4) & Top-Right Rivet (15..16)
  'IECUUFAAAAAAACEUUUUI', // 04: Rivet lower shadows + diagonal streak start
  'IECAAAAAAAAACEVAAAAI', // 05: Diagonal specular streak (cols 11..14)
  'IECAAAAAAAACEVCAAAAI', // 06: Diagonal specular streak (cols 10..14)
  'IECAAAAAAACEVCAFFAAI', // 07: Parallel secondary streak begins
  'IECAAAAAACEVCACVFAAI', // 08: Twin diagonal white/cyan streaks
  'IECAAAAACEVCACVFFAAI', // 09
  'IECAAAACEVCACVFFFAAI', // 10
  'IECAAACEVCACVFFFFUUI', // 11
  'IECAACEVCACVFFFFFUUI', // 12
  'IECVUCEVAAFFFFECVUUI', // 13: Bottom-Left Rivet (3..4) & Bottom-Right Rivet (15..16)
  'IECUUUFFFFFFFFEUUUUI', // 14: Rivet lower shadows
  'IEUUUUUUUUUUUUUUUUNI', // 15: Inner bottom bevel (deep slate blue)
  'INNNNNNNNNNNNNNNNNNI', // 16: Outer bottom bevel (dark navy iron)
  'IIIIIIIIIIIIIIIIIIII', // 17: Bottom outline
];

export function drawWoodPalisade(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  broken = false,
  flash = false,
  lodgedArrows: number | LodgedArrowView[] = 0
): void {
  const drawX = Math.round(x - 12);
  const drawY = Math.round(y - 9);

  if (isHDCanvas(ctx)) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = 'rgba(5, 8, 15, 0.5)';
    ctx.fillRect(-12, 7, 24, 3);

    const stakeOffsets = [-10, -6, -2, 2, 6, 10];
    for (let idx = 0; idx < stakeOffsets.length; idx++) {
      const sx = stakeOffsets[idx];
      const isCenterGap = broken && (idx === 2 || idx === 3);
      const topY = isCenterGap ? 2 : -8.5;

      const woodGrad = ctx.createLinearGradient(sx - 1.8, 0, sx + 1.8, 0);
      woodGrad.addColorStop(0, flash ? '#ffffff' : '#f59e0b');
      woodGrad.addColorStop(0.5, flash ? '#fef08a' : '#b45309');
      woodGrad.addColorStop(1, '#451a03');

      ctx.fillStyle = woodGrad;
      ctx.strokeStyle = '#1c0d04';
      ctx.lineWidth = 0.85;
      ctx.beginPath();
      if (isCenterGap) {
        ctx.moveTo(sx - 1.8, 8.5);
        ctx.lineTo(sx - 1.8, topY + 1.5);
        ctx.lineTo(sx, topY - 1.0);
        ctx.lineTo(sx + 1.8, topY + 1.8);
        ctx.lineTo(sx + 1.8, 8.5);
      } else {
        ctx.moveTo(sx - 1.8, 8.5);
        ctx.lineTo(sx - 1.8, -5.5);
        ctx.lineTo(sx, topY);
        ctx.lineTo(sx + 1.8, -5.5);
        ctx.lineTo(sx + 1.8, 8.5);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    // Horizontal Rope/Iron Binding Bands
    ctx.fillStyle = '#3b200e';
    if (!broken) {
      ctx.fillRect(-11.8, -2.8, 23.6, 2.2);
      ctx.fillStyle = '#d97706';
      for (const kx of [-9, -5, -1, 3, 7]) ctx.fillRect(kx, -2.5, 2.0, 1.4);
    } else {
      ctx.fillRect(-11.8, -2.8, 7.5, 2.2);
      ctx.fillRect(4.3, -2.8, 7.5, 2.2);
    }
    ctx.fillStyle = '#3b200e';
    ctx.fillRect(-11.8, 4.0, 23.6, 2.2);
    ctx.restore();
  } else {
    blitMatrixSprite(
      ctx,
      broken ? 'palisade_broken' : 'palisade_intact',
      drawX,
      drawY,
      broken ? PALISADE_BROKEN_24x18 : PALISADE_INTACT_24x18,
      OBSTACLE_PROJECTILE_PALETTE,
      flash
    );
  }

  if (typeof lodgedArrows === 'number') {
    for (let i = 0; i < lodgedArrows; i++) {
      const offsetX = (i % 2 === 0 ? -4 : 4) * Math.ceil((i + 1) / 2);
      drawLodgedArrow(ctx, Math.round(x + offsetX), drawY + 17, 0);
    }
  } else if (Array.isArray(lodgedArrows)) {
    for (const item of lodgedArrows) {
      drawLodgedArrow(
        ctx,
        Math.round(x + (item.offsetX ?? 0)),
        Math.round(y + (item.offsetY ?? 8)),
        item.angle ?? 0
      );
    }
  }
}

export function drawSiegeCrate(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  hp = 2,
  maxHp = 2,
  flash = false,
  lodgedArrows: number | LodgedArrowView[] = 0
): void {
  const isCracked = hp < maxHp;
  const drawX = Math.round(x - 10);
  const drawY = Math.round(y - 9);

  if (isHDCanvas(ctx)) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = 'rgba(5, 8, 15, 0.52)';
    ctx.fillRect(-10, 7.5, 20.5, 3);

    const plankGrad = ctx.createLinearGradient(-10, -9, 10, 9);
    plankGrad.addColorStop(0, flash ? '#ffffff' : '#d97706');
    plankGrad.addColorStop(0.55, flash ? '#fef08a' : '#9a3412');
    plankGrad.addColorStop(1, '#431407');
    ctx.fillStyle = plankGrad;
    ctx.strokeStyle = '#1c0a04';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.roundRect(-10, -9, 20, 18, 2);
    ctx.fill();
    ctx.stroke();

    // Inner Recessed Plank Box + Diagonal Oak Brace
    ctx.fillStyle = '#7c2d12';
    ctx.fillRect(-7.2, -6.2, 14.4, 12.4);
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(-7.2, -2.0);
    ctx.lineTo(7.2, -2.0);
    ctx.moveTo(-7.2, 2.2);
    ctx.lineTo(7.2, 2.2);
    ctx.stroke();

    ctx.strokeStyle = flash ? '#ffffff' : '#f59e0b';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(-6.8, 5.8);
    ctx.lineTo(6.8, -5.8);
    ctx.stroke();

    // Gold-Brass Corner Studs (signals valuable loot inside!)
    ctx.fillStyle = '#facc15';
    for (const [cx, cy] of [
      [-8.5, -7.5],
      [6.9, -7.5],
      [-8.5, 5.9],
      [6.9, 5.9],
    ]) {
      ctx.fillRect(cx, cy, 1.8, 1.8);
    }

    if (isCracked) {
      ctx.strokeStyle = '#090d16';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-2, -8.5);
      ctx.lineTo(0.8, -1.5);
      ctx.lineTo(-1.5, 3.2);
      ctx.lineTo(2.0, 8.2);
      ctx.stroke();
    }
    ctx.restore();
  } else {
    blitMatrixSprite(
      ctx,
      isCracked ? 'crate_cracked' : 'crate_intact',
      drawX,
      drawY,
      isCracked ? CRATE_CRACKED_20x18 : CRATE_INTACT_20x18,
      OBSTACLE_PROJECTILE_PALETTE,
      flash
    );
  }

  if (typeof lodgedArrows === 'number') {
    for (let i = 0; i < lodgedArrows; i++) {
      const offsetX = i === 0 ? 0 : i % 2 === 1 ? -4 : 4;
      drawLodgedArrow(ctx, Math.round(x + offsetX), drawY + 17, 0);
    }
  } else if (Array.isArray(lodgedArrows)) {
    for (const item of lodgedArrows) {
      drawLodgedArrow(
        ctx,
        Math.round(x + (item.offsetX ?? 0)),
        Math.round(y + (item.offsetY ?? 8)),
        item.angle ?? 0
      );
    }
  }
}

export function drawBlueIronBlock(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  frame = 0,
  flash = false
): void {
  const drawX = Math.round(x - 10);
  const drawY = Math.round(y - 9);

  if (isHDCanvas(ctx)) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = 'rgba(5, 8, 18, 0.58)';
    ctx.fillRect(-10.2, 7.5, 20.8, 3.2);

    const ironGrad = ctx.createLinearGradient(-10, -9, 10, 9);
    ironGrad.addColorStop(0, flash ? '#ffffff' : '#bae6fd');
    ironGrad.addColorStop(0.28, flash ? '#e0f2fe' : '#60a5fa');
    ironGrad.addColorStop(0.68, '#2563eb');
    ironGrad.addColorStop(1, '#1e3a8a');

    ctx.fillStyle = ironGrad;
    ctx.strokeStyle = '#091122';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.roundRect(-10, -9, 20, 18, 2.2);
    ctx.fill();
    ctx.stroke();

    // Inner Beveled Steel Plate
    const faceGrad = ctx.createLinearGradient(-7.5, -6.5, 7.5, 6.5);
    faceGrad.addColorStop(0, '#3b82f6');
    faceGrad.addColorStop(0.5, '#1d4ed8');
    faceGrad.addColorStop(1, '#172554');
    ctx.fillStyle = faceGrad;
    ctx.fillRect(-7.5, -6.5, 15, 13);

    // Diagonal Specular Sheen
    ctx.strokeStyle = 'rgba(224, 242, 254, 0.65)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-5.0, 5.2);
    ctx.lineTo(5.2, -5.0);
    ctx.stroke();

    // 4 Gleaming Silver Corner Rivets
    for (const [rx, ry] of [
      [-6.0, -5.0],
      [6.0, -5.0],
      [-6.0, 5.0],
      [6.0, 5.0],
    ]) {
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(rx + 0.4, ry + 0.5, 1.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.arc(rx, ry, 1.1, 0, Math.PI * 2);
      ctx.fill();
    }

    const glintPhase = frame % 90;
    if (glintPhase < 18 || flash) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(4.0, -6.2);
      ctx.lineTo(8.0, -6.2);
      ctx.moveTo(6.0, -8.2);
      ctx.lineTo(6.0, -4.2);
      ctx.stroke();
    }
    ctx.restore();
    return;
  }

  blitMatrixSprite(
    ctx,
    'blue_iron_block',
    drawX,
    drawY,
    BLUE_IRON_BLOCK_20x18,
    OBSTACLE_PROJECTILE_PALETTE,
    flash
  );

  // Periodic specular star glint on top-right bevel
  const glintPhase = frame % 90;
  if (glintPhase < 18 || flash) {
    const gx = drawX + 16;
    const gy = drawY + 3;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(gx - 2, gy, 5, 1);
    ctx.fillRect(gx, gy - 2, 1, 5);
    ctx.fillStyle = '#9be4ff';
    ctx.fillRect(gx - 1, gy - 1, 1, 1);
    ctx.fillRect(gx + 1, gy - 1, 1, 1);
    ctx.fillRect(gx - 1, gy + 1, 1, 1);
    ctx.fillRect(gx + 1, gy + 1, 1, 1);
  }
}

export function drawRotatingShield(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  segments: readonly ShieldSegment[],
  lodgedArrows: readonly (number | LodgedArrowView)[] = [],
  flash = false
): void {
  if (isHDCanvas(ctx)) {
    const outerR = 14.5;
    const innerR = 9.0;
    const rMid = (outerR + innerR) / 2;

    ctx.save();
    ctx.translate(x, y);

    // Subtle ground shadow beneath rotating shield bastion
    ctx.fillStyle = 'rgba(4, 7, 14, 0.48)';
    ctx.beginPath();
    ctx.arc(0, 2.2, outerR + 1.2, 0, Math.PI * 2);
    ctx.fill();

    // 1. 4 Iron-Bound Oak Spokes
    for (let i = 0; i < 4; i++) {
      const spokeAngle = angle + (i * Math.PI) / 2;
      ctx.save();
      ctx.rotate(spokeAngle);
      ctx.fillStyle = flash ? '#ffffff' : '#78350f';
      ctx.strokeStyle = '#1c1917';
      ctx.lineWidth = 0.85;
      ctx.beginPath();
      ctx.roundRect(0, -1.6, innerR + 1.5, 3.2, 1.0);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = flash ? '#fef08a' : '#d97706';
      ctx.fillRect(2, -0.6, innerR - 1, 1.2);
      ctx.restore();
    }

    // 2. Outer Rim Segments (Gleaming Blue-Iron vs. Warm Targetable Oak)
    for (const seg of segments) {
      if (seg.type === 'wood' && seg.hp <= 0) continue;
      const a0 = angle + seg.startAngle + 0.03;
      const a1 = angle + seg.endAngle - 0.03;

      // Dark outer rim casing
      ctx.strokeStyle = seg.type === 'iron' ? '#0f172a' : '#291507';
      ctx.lineWidth = 6.2;
      ctx.lineCap = 'butt';
      ctx.beginPath();
      ctx.arc(0, 0, rMid, a0 - 0.02, a1 + 0.02);
      ctx.stroke();

      // Main beveled arc body
      if (flash) {
        ctx.strokeStyle = '#ffffff';
      } else if (seg.type === 'iron') {
        const ironGrad = ctx.createLinearGradient(-outerR, -outerR, outerR, outerR);
        ironGrad.addColorStop(0, '#bae6fd');
        ironGrad.addColorStop(0.45, '#3b82f6');
        ironGrad.addColorStop(1, '#1e3a8a');
        ctx.strokeStyle = ironGrad;
      } else {
        const damaged = seg.hp < seg.maxHp;
        const woodGrad = ctx.createLinearGradient(-outerR, -outerR, outerR, outerR);
        woodGrad.addColorStop(0, damaged ? '#b45309' : '#f59e0b');
        woodGrad.addColorStop(0.5, damaged ? '#78350f' : '#b45309');
        woodGrad.addColorStop(1, '#451a03');
        ctx.strokeStyle = woodGrad;
      }
      ctx.lineWidth = 4.4;
      ctx.beginPath();
      ctx.arc(0, 0, rMid, a0, a1);
      ctx.stroke();

      // Outer specular rim highlight
      ctx.strokeStyle = flash
        ? '#ffffff'
        : seg.type === 'iron'
          ? 'rgba(224, 242, 254, 0.85)'
          : 'rgba(253, 230, 138, 0.65)';
      ctx.lineWidth = 0.95;
      ctx.beginPath();
      ctx.arc(0, 0, outerR - 0.8, a0 + 0.04, a1 - 0.04);
      ctx.stroke();

      // Rivets along arc
      const midA = (a0 + a1) / 2;
      for (const rivetA of [a0 + 0.16, midA, a1 - 0.16]) {
        const rx = Math.cos(rivetA) * rMid;
        const ry = Math.sin(rivetA) * rMid;
        ctx.fillStyle = seg.type === 'iron' ? '#f8fafc' : '#fcd34d';
        ctx.beginPath();
        ctx.arc(rx, ry, 0.95, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 3. Domed Steel & Brass Central Boss Hub
    const hubGrad = ctx.createRadialGradient(-1.5, -1.5, 0.5, 0, 0, 5.4);
    hubGrad.addColorStop(0, '#f8fafc');
    hubGrad.addColorStop(0.45, '#60a5fa');
    hubGrad.addColorStop(0.85, '#1e3a8a');
    hubGrad.addColorStop(1, '#0f172a');
    ctx.fillStyle = hubGrad;
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(0, 0, 4.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.restore();

    // 4. Lodged arrows rotating with the shield wheel
    for (const item of lodgedArrows) {
      const offset =
        typeof item === 'number' ? item : (item.angleOffset ?? item.angle ?? 0);
      const worldAngle = angle + offset;
      const rimX = x + Math.cos(worldAngle) * outerR;
      const rimY = y + Math.sin(worldAngle) * outerR;
      drawLodgedArrow(ctx, rimX, rimY, worldAngle - Math.PI / 2);
    }
    return;
  }

  const cx = Math.round(x);
  const cy = Math.round(y);
  const outerR = 14;
  const innerR = 9;

  ctx.save();

  // 1. 4 rotating wooden spokes connecting hub to rim
  for (let i = 0; i < 4; i++) {
    const spokeAngle = angle + (i * Math.PI) / 2;
    const sx = Math.round(cx + Math.cos(spokeAngle) * (innerR + 1));
    const sy = Math.round(cy + Math.sin(spokeAngle) * (innerR + 1));
    ctx.strokeStyle = flash ? '#ffffff' : '#5c3112';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(sx, sy);
    ctx.stroke();

    ctx.strokeStyle = flash ? '#fef08a' : '#b56c35';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(sx, sy);
    ctx.stroke();
  }

  // 2. Outer rim segments (Riveted Blue-Iron arcs vs. Targetable Wooden segments)
  for (const seg of segments) {
    if (seg.type === 'wood' && seg.hp <= 0) continue;

    const a0 = angle + seg.startAngle;
    const a1 = angle + seg.endAngle;

    ctx.strokeStyle = seg.type === 'iron' ? '#141e30' : '#231409';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(cx, cy, (outerR + innerR) / 2, a0, a1);
    ctx.stroke();

    if (flash) {
      ctx.strokeStyle = '#ffffff';
    } else if (seg.type === 'iron') {
      ctx.strokeStyle = '#5b88bd';
    } else {
      ctx.strokeStyle = seg.hp < seg.maxHp ? '#7c441d' : '#9c5a2b';
    }
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(cx, cy, (outerR + innerR) / 2, a0 + 0.04, a1 - 0.04);
    ctx.stroke();

    ctx.strokeStyle = flash ? '#ffffff' : seg.type === 'iron' ? '#c7e2ff' : '#c9834b';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, outerR - 1, a0 + 0.06, a1 - 0.06);
    ctx.stroke();

    const midA = (a0 + a1) / 2;
    const rMid = (outerR + innerR) / 2;
    for (const rivetA of [a0 + 0.18, midA, a1 - 0.18]) {
      const rx = Math.round(cx + Math.cos(rivetA) * rMid);
      const ry = Math.round(cy + Math.sin(rivetA) * rMid);
      if (seg.type === 'iron') {
        ctx.fillStyle = '#e6f2ff';
        ctx.fillRect(rx, ry, 1, 1);
        ctx.fillStyle = '#1c2f4c';
        ctx.fillRect(rx + 1, ry + 1, 1, 1);
      } else {
        ctx.fillStyle = '#3b200e';
        ctx.fillRect(rx, ry, 2, 2);
      }
    }
  }

  // 3. Central iron/wood pivot hub
  ctx.fillStyle = '#141e30';
  ctx.fillRect(cx - 5, cy - 4, 10, 8);
  ctx.fillRect(cx - 4, cy - 5, 8, 10);
  ctx.fillStyle = '#8f5124';
  ctx.fillRect(cx - 4, cy - 3, 8, 6);
  ctx.fillRect(cx - 3, cy - 4, 6, 8);
  ctx.fillStyle = '#5b88bd';
  ctx.fillRect(cx - 2, cy - 2, 4, 4);
  ctx.fillStyle = '#c7e2ff';
  ctx.fillRect(cx - 2, cy - 2, 2, 1);
  ctx.fillRect(cx - 2, cy - 1, 1, 1);
  ctx.fillStyle = '#1c2f4c';
  ctx.fillRect(cx + 1, cy + 1, 1, 1);

  // 4. Lodged arrows rotating with the shield wheel
  for (const item of lodgedArrows) {
    const offset =
      typeof item === 'number' ? item : (item.angleOffset ?? item.angle ?? 0);
    const worldAngle = angle + offset;
    const rimX = cx + Math.cos(worldAngle) * outerR;
    const rimY = cy + Math.sin(worldAngle) * outerR;
    drawLodgedArrow(ctx, rimX, rimY, worldAngle - Math.PI / 2);
  }

  ctx.restore();
}

// ============================================================================
// 7. PROJECTILES & TRAILS (Single Arrow 5x16, Double Shot, Great Arrow 9x24)
// ============================================================================

export const SINGLE_ARROW_5x16: readonly string[] = [
  '..g..', // 00: Pointed tip
  '.gwg.', // 01: Steel glint
  'gwelg', // 02: Steel head mid
  'gmsdg', // 03: Barbed steel base
  '.OMO.', // 04: Wooden shaft
  '.LBW.', // 05
  '.LBW.', // 06
  '.LBW.', // 07
  '.LBW.', // 08
  '.LBW.', // 09
  '.LBW.', // 10
  '.grg.', // 11: Red/gold fletching binding thread
  'gwOeg', // 12: White & silver feather vanes top
  'gwOeg', // 13: Feather vanes mid
  'glOlg', // 14: Feather vanes lower shade
  'g.g.g', // 15: V-notched arrow nock & feather tips
];

export const GREAT_ARROW_9x24: readonly string[] = [
  '....g....', // 00: Broadhead apex point
  '...gwg...', // 01: White-steel tip bevel
  '..gwelg..', // 02: Upper broadhead bevel
  '.gweesdg.', // 03: Mid-upper broadhead
  '.gwelsdg.', // 04: Broadhead fuller ridge
  'gwelssmdg', // 05: Full 9px wide broadhead wings
  'gwelssmdg', // 06: Broadhead lower wings
  'gmsdgdsmg', // 07: Barbed broadhead shoulders
  'gg.ggg.gg', // 08: Wing barb tips + collar neck
  '..gmemg..', // 09: Riveted steel collar top
  '..gsmsg..', // 10: Steel collar mid
  '..gmdmg..', // 11: Steel collar bottom
  '..OLBWO..', // 12: Heavy 5px oak timber shaft
  '..OLBWO..', // 13
  '..OLBSO..', // 14
  '..OLBWO..', // 15
  '..OLBSO..', // 16
  '..OLBWO..', // 17
  '..OLBSO..', // 18
  '.gwOLBleg', // 19: Heavy layered fletching top
  '.gwOLBleg', // 20: Fletching mid-upper
  '.glOLSldg', // 21: Fletching mid-lower
  '.gwO.Oleg', // 22: Fletching tail
  '.gg...gg.', // 23: Fletching bottom tips
];

export function drawSingleArrow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle = 0,
  slowed = false,
  frame = 0
): void {
  if (isHDCanvas(ctx)) {
    ctx.save();
    ctx.translate(x, y);
    if (angle !== 0) {
      ctx.rotate(angle);
    }

    // 1. Smooth Tapered Aerodynamic Slipstream Wake (pointing UP along -Y)
    const trailLen = slowed ? 11 : 20 + (frame % 3) * 2.5;
    const wakeGrad = ctx.createLinearGradient(0, 6.5, 0, 6.5 + trailLen);
    wakeGrad.addColorStop(0, slowed ? 'rgba(251, 191, 36, 0.78)' : 'rgba(254, 249, 195, 0.88)');
    wakeGrad.addColorStop(0.45, slowed ? 'rgba(217, 119, 6, 0.35)' : 'rgba(56, 189, 248, 0.38)');
    wakeGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = wakeGrad;
    ctx.beginPath();
    ctx.moveTo(-2.1, 6.5);
    ctx.lineTo(2.1, 6.5);
    ctx.lineTo(0.4, 6.5 + trailLen);
    ctx.lineTo(-0.4, 6.5 + trailLen);
    ctx.closePath();
    ctx.fill();

    // 2. Crisp Angled Royal Feather Vanes (crimson & pearl white)
    ctx.fillStyle = '#f8fafc';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(-0.7, 3.8);
    ctx.lineTo(-3.1, 6.4);
    ctx.lineTo(-2.4, 8.2);
    ctx.lineTo(-0.5, 6.8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(0.7, 3.8);
    ctx.lineTo(3.1, 6.4);
    ctx.lineTo(2.4, 8.2);
    ctx.lineTo(0.5, 6.8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 3. Polished Yew-Wood Shaft + Gold Binding Thread
    ctx.fillStyle = '#d97706';
    ctx.strokeStyle = '#1c1917';
    ctx.lineWidth = 0.65;
    ctx.beginPath();
    ctx.roundRect(-0.95, -4.5, 1.9, 11.4, 0.6);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#fde047';
    ctx.fillRect(-1.0, 3.4, 2.0, 1.1);

    // 4. Razor-Sharp Diamond Bodkin Steel Broadhead (tip at y = -9.2)
    const tipGrad = ctx.createLinearGradient(-2.8, -6, 2.8, -6);
    tipGrad.addColorStop(0, '#ffffff');
    tipGrad.addColorStop(0.5, '#cbd5e1');
    tipGrad.addColorStop(1, '#475569');
    ctx.fillStyle = tipGrad;
    ctx.strokeStyle = '#090d16';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(0, -9.2);
    ctx.lineTo(2.8, -3.6);
    ctx.lineTo(1.0, -4.6);
    ctx.lineTo(-1.0, -4.6);
    ctx.lineTo(-2.8, -3.6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.restore();
    return;
  }

  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  if (angle !== 0) {
    ctx.rotate(angle);
  }

  // 1. Golden-White Slipstream Trail behind fletching
  const trailLen = slowed ? 9 : 18 + (frame % 3) * 2;
  ctx.fillStyle = slowed ? 'rgba(217, 119, 6, 0.45)' : 'rgba(250, 204, 21, 0.45)';
  ctx.fillRect(-2, 7, 5, Math.floor(trailLen * 0.45));
  ctx.fillRect(-1, 7 + Math.floor(trailLen * 0.45), 3, Math.floor(trailLen * 0.35));
  ctx.fillStyle = slowed ? '#fbbf24' : '#fef08a';
  ctx.fillRect(-1, 7, 3, Math.floor(trailLen * 0.65));
  ctx.fillStyle = slowed ? '#fef08a' : '#fffbeb';
  ctx.fillRect(0, 7, 1, trailLen);

  // 2. Crisp 5x16 Arrow Sprite centered at (0, 0) -> top-left (-2, -8)
  blitMatrixSprite(ctx, 'arrow_single', -2, -8, SINGLE_ARROW_5x16, OBSTACLE_PROJECTILE_PALETTE, false);
  ctx.restore();
}

export function drawLodgedArrow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle = 0
): void {
  if (isHDCanvas(ctx)) {
    ctx.save();
    ctx.translate(x, y);
    if (angle !== 0) {
      ctx.rotate(angle);
    }
    ctx.fillStyle = '#b45309';
    ctx.strokeStyle = '#1c1917';
    ctx.lineWidth = 0.65;
    ctx.beginPath();
    ctx.roundRect(-0.85, 0, 1.7, 8.2, 0.5);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.moveTo(-0.7, 5.2);
    ctx.lineTo(-2.6, 7.6);
    ctx.lineTo(-2.0, 9.0);
    ctx.lineTo(-0.5, 7.8);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(0.7, 5.2);
    ctx.lineTo(2.6, 7.6);
    ctx.lineTo(2.0, 9.0);
    ctx.lineTo(0.5, 7.8);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    return;
  }

  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  if (angle !== 0) {
    ctx.rotate(angle);
  }
  const tailRows = SINGLE_ARROW_5x16.slice(5);
  renderPixelGrid(ctx, -2, 0, tailRows, OBSTACLE_PROJECTILE_PALETTE, 1, false);
  ctx.restore();
}

export function drawDoubleArrow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  spread = 12,
  angle = 0,
  slowed = false,
  frame = 0
): void {
  const halfSpread = isHDCanvas(ctx) ? spread / 2 : Math.round(spread / 2);
  ctx.save();
  ctx.translate(isHDCanvas(ctx) ? x : Math.round(x), isHDCanvas(ctx) ? y : Math.round(y));
  if (angle !== 0) {
    ctx.rotate(angle);
  }
  drawSingleArrow(ctx, -halfSpread, 0, 0, slowed, frame);
  drawSingleArrow(ctx, halfSpread, 0, 0, slowed, frame + 1);
  ctx.restore();
}

export function drawGreatArrow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle = 0,
  frame = 0
): void {
  if (isHDCanvas(ctx)) {
    ctx.save();
    ctx.translate(x, y);
    if (angle !== 0) {
      ctx.rotate(angle);
    }

    // 1. Radial Blazing Siege Aura
    const aura = ctx.createRadialGradient(0, -2, 1, 0, 0, 13);
    aura.addColorStop(0, 'rgba(254, 240, 138, 0.55)');
    aura.addColorStop(0.55, 'rgba(249, 115, 22, 0.26)');
    aura.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(0, 0, 13, 0, Math.PI * 2);
    ctx.fill();

    // 2. Fiery Tapered Jet Wake
    const wakeLen = 20 + (frame % 4) * 2.5;
    const wakeGrad = ctx.createLinearGradient(0, 9, 0, 9 + wakeLen);
    wakeGrad.addColorStop(0, 'rgba(255, 251, 235, 0.95)');
    wakeGrad.addColorStop(0.35, 'rgba(250, 204, 21, 0.80)');
    wakeGrad.addColorStop(0.7, 'rgba(234, 88, 12, 0.42)');
    wakeGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = wakeGrad;
    ctx.beginPath();
    ctx.moveTo(-3.6, 9);
    ctx.lineTo(3.6, 9);
    ctx.lineTo(0.8, 9 + wakeLen);
    ctx.lineTo(-0.8, 9 + wakeLen);
    ctx.closePath();
    ctx.fill();

    // 3. Swept Supersonic Wind Shockwave Curves
    ctx.strokeStyle = 'rgba(254, 249, 195, 0.82)';
    ctx.lineWidth = 1.1;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-3.2, -3.5);
    ctx.quadraticCurveTo(-6.8, 1.5, -7.6, 8.0);
    ctx.moveTo(3.2, -3.5);
    ctx.quadraticCurveTo(6.8, 1.5, 7.6, 8.0);
    ctx.stroke();

    // 4. Layered Golden-Crimson Siege Fletching
    ctx.fillStyle = '#facc15';
    ctx.strokeStyle = '#090d16';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(-1.4, 4.8);
    ctx.lineTo(-4.8, 8.2);
    ctx.lineTo(-3.8, 11.2);
    ctx.lineTo(-1.2, 9.4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#f97316';
    ctx.beginPath();
    ctx.moveTo(1.4, 4.8);
    ctx.lineTo(4.8, 8.2);
    ctx.lineTo(3.8, 11.2);
    ctx.lineTo(1.2, 9.4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 5. Heavy Iron-Banded Oak Lance Shaft
    ctx.fillStyle = '#b45309';
    ctx.strokeStyle = '#1c1917';
    ctx.lineWidth = 0.85;
    ctx.beginPath();
    ctx.roundRect(-1.7, -4.5, 3.4, 14.2, 0.9);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#fde047';
    ctx.fillRect(-1.9, -3.6, 3.8, 1.8);
    ctx.fillRect(-1.8, 4.4, 3.6, 1.4);

    // 6. Massive Barbed Siege Broadhead (9px wingspan, tip at y = -12.5)
    const headGrad = ctx.createLinearGradient(-4.6, -8, 4.6, -8);
    headGrad.addColorStop(0, '#ffffff');
    headGrad.addColorStop(0.45, '#e2e8f0');
    headGrad.addColorStop(1, '#64748b');
    ctx.fillStyle = headGrad;
    ctx.strokeStyle = '#090d16';
    ctx.lineWidth = 0.95;
    ctx.beginPath();
    ctx.moveTo(0, -12.6);
    ctx.lineTo(4.6, -4.2);
    ctx.lineTo(2.9, -2.6);
    ctx.lineTo(1.6, -4.6);
    ctx.lineTo(-1.6, -4.6);
    ctx.lineTo(-2.9, -2.6);
    ctx.lineTo(-4.6, -4.2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Central golden fuller rune
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.moveTo(0, -10.2);
    ctx.lineTo(0, -4.8);
    ctx.stroke();

    ctx.restore();
    return;
  }

  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  if (angle !== 0) {
    ctx.rotate(angle);
  }

  // 1. Heavy golden-orange tail slipstream wake
  const wakeLen = 16 + (frame % 4) * 2;
  ctx.fillStyle = 'rgba(249, 115, 22, 0.5)';
  ctx.fillRect(-3, 10, 7, Math.floor(wakeLen * 0.6));
  ctx.fillStyle = '#facc15';
  ctx.fillRect(-2, 10, 5, Math.floor(wakeLen * 0.8));
  ctx.fillStyle = '#fffbeb';
  ctx.fillRect(-1, 10, 3, wakeLen);

  // 2. White/Cream Shockwave Wind Arcs sweeping backward from mid-shaft
  ctx.fillStyle = '#fef9c3';
  ctx.fillRect(-5, 2, 2, 2);
  ctx.fillRect(-6, 4, 2, 3);
  ctx.fillRect(-7, 7, 2, 2);
  ctx.fillRect(4, 2, 2, 2);
  ctx.fillRect(5, 4, 2, 3);
  ctx.fillRect(6, 7, 2, 2);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-5, 1, 2, 1);
  ctx.fillRect(-6, 3, 1, 2);
  ctx.fillRect(4, 1, 2, 1);
  ctx.fillRect(6, 3, 1, 2);

  // 3. Golden-Yellow Collar Sparks spraying from base of broadhead
  const sparkJitter = frame % 2;
  ctx.fillStyle = '#f97316';
  ctx.fillRect(-6 - sparkJitter, -1, 3, 1);
  ctx.fillRect(4 + sparkJitter, -1, 3, 1);
  ctx.fillRect(-5, 1 + sparkJitter, 2, 1);
  ctx.fillRect(4, 1 + sparkJitter, 2, 1);
  ctx.fillStyle = '#facc15';
  ctx.fillRect(-5, -2, 2, 1);
  ctx.fillRect(4, -2, 2, 1);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-3, -3, 1, 1);
  ctx.fillRect(3, -3, 1, 1);

  // 4. Draw 9x24 Great Arrow Sprite centered at (0, 0) -> top-left (-4, -12)
  blitMatrixSprite(ctx, 'arrow_heavy', -4, -12, GREAT_ARROW_9x24, OBSTACLE_PROJECTILE_PALETTE, false);
  ctx.restore();
}

// ============================================================================
// 8. MUZZLE FLASHES & IMPACT PARTICLE EFFECTS
// ============================================================================

export function drawMuzzleFlash(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  weaponType: WeaponType,
  progress = 0.5
): void {
  if (progress < 0 || progress > 1) return;

  if (isHDCanvas(ctx)) {
    const alpha = Math.max(0.15, 1 - progress * 0.85);
    const drawBurst = (bx: number, by: number, radius: number, coreCol: string, outerCol: string) => {
      ctx.save();
      ctx.globalAlpha = alpha;
      const g = ctx.createRadialGradient(bx, by, 0.5, bx, by, radius);
      g.addColorStop(0, '#ffffff');
      g.addColorStop(0.35, coreCol);
      g.addColorStop(0.75, outerCol);
      g.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(bx, by, radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(bx - radius * 0.8, by);
      ctx.lineTo(bx + radius * 0.8, by);
      ctx.moveTo(bx, by - radius * 0.8);
      ctx.lineTo(bx, by + radius * 0.8);
      ctx.stroke();
      ctx.restore();
    };

    if (weaponType === 'single') {
      drawBurst(x, y, 6.5, '#fef08a', 'rgba(249, 115, 22, 0.45)');
    } else if (weaponType === 'double') {
      drawBurst(x - 4.5, y, 5.8, '#bae6fd', 'rgba(56, 189, 248, 0.45)');
      drawBurst(x + 4.5, y, 5.8, '#fef08a', 'rgba(249, 115, 22, 0.45)');
    } else {
      drawBurst(x, y, 11.5, '#fde047', 'rgba(234, 88, 12, 0.65)');
    }
    return;
  }

  const cx = Math.round(x);
  const cy = Math.round(y);

  if (weaponType === 'single') {
    // Quick Firing: 8x8 crisp golden-white star
    ctx.fillStyle = '#f97316';
    ctx.fillRect(cx - 4, cy, 9, 1);
    ctx.fillRect(cx, cy - 4, 1, 9);
    ctx.fillStyle = '#facc15';
    ctx.fillRect(cx - 2, cy - 2, 5, 5);
    ctx.fillRect(cx - 3, cy - 3, 1, 1);
    ctx.fillRect(cx + 3, cy - 3, 1, 1);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cx - 1, cy - 1, 3, 3);
    return;
  }

  if (weaponType === 'double') {
    // Spread Firing: Twin flashes at cx - 6 and cx + 6
    for (const dx of [-6, 6]) {
      const bx = cx + dx;
      ctx.fillStyle = '#ea580c';
      ctx.fillRect(bx - 3, cy - 4, 7, 2);
      ctx.fillRect(bx - 4, cy - 1, 9, 2);
      ctx.fillStyle = '#facc15';
      ctx.fillRect(bx - 2, cy - 3, 5, 5);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(bx - 1, cy - 2, 3, 3);
    }
    return;
  }

  // Heavy Blast ('heavy'): Massive 22x20 fiery orange/yellow/white fireball
  const scale = progress < 0.3 ? 0.85 : 1.0;
  const rx = Math.round(10 * scale);
  const ry = Math.round(10 * scale);

  ctx.fillStyle = '#dc2626';
  ctx.fillRect(cx - rx - 1, cy - ry + 2, rx * 2 + 2, ry * 2 - 4);
  ctx.fillRect(cx - rx + 2, cy - ry - 2, rx * 2 - 4, ry * 2 + 2);
  ctx.fillRect(cx - rx - 2, cy - 4, 2, 3);
  ctx.fillRect(cx + rx, cy - 4, 2, 3);
  ctx.fillRect(cx - 5, cy - ry - 4, 3, 3);
  ctx.fillRect(cx + 2, cy - ry - 4, 3, 3);
  ctx.fillRect(cx - 1, cy - ry - 5, 2, 4);

  ctx.fillStyle = '#f97316';
  ctx.fillRect(cx - rx + 1, cy - ry + 1, rx * 2 - 2, ry * 2 - 2);
  ctx.fillRect(cx - 4, cy - ry - 2, 8, 3);

  ctx.fillStyle = '#facc15';
  ctx.fillRect(cx - rx + 3, cy - ry + 3, rx * 2 - 6, ry * 2 - 6);
  ctx.fillRect(cx - 2, cy - ry, 4, 3);

  ctx.fillStyle = '#fef08a';
  ctx.fillRect(cx - 5, cy - 5, 10, 10);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(cx - 3, cy - 3, 6, 6);
}

export function drawParticle(ctx: CanvasRenderingContext2D, p: SpriteParticle): void {
  const px = Math.round(p.x);
  const py = Math.round(p.y);
  const s = Math.max(1, Math.round(p.size));

  if (p.kind === 'wood_chip' || p.kind === 'splinter') {
    ctx.fillStyle = p.outlineColor || '#231409';
    ctx.fillRect(px - 1, py - 1, s + 2, Math.max(2, s));
    ctx.fillStyle = p.color || '#9c5a2b';
    ctx.fillRect(px, py, s, Math.max(1, s - 1));
    ctx.fillStyle = '#e09f67';
    ctx.fillRect(px, py, 1, 1);
    return;
  }

  if (p.kind === 'iron_spark' || p.kind === 'clang') {
    ctx.fillStyle = p.color || '#9be4ff';
    ctx.fillRect(px - 1, py, 3, 1);
    ctx.fillRect(px, py - 1, 1, 3);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(px, py, 1, 1);
    return;
  }

  if (p.kind === 'arrow_splinter') {
    ctx.fillStyle = '#231409';
    ctx.fillRect(px - 1, py - 1, s + 2, 3);
    ctx.fillStyle = p.color || '#b56c35';
    ctx.fillRect(px, py, s, 1);
    return;
  }

  if (p.kind === 'shockwave' || p.kind === 'blast') {
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(px - s, py, s * 2 + 1, 2);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(px - s + 1, py - 1, s * 2 - 1, 1);
    return;
  }

  ctx.fillStyle = p.color || '#facc15';
  ctx.fillRect(px, py, s, s);
}

export function drawImpactBurst(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  type: 'normal' | 'wide_multi_hit' | 'piercing_shatter' | 'iron_deflect' | 'arrow_clip',
  progress = 0.3
): void {
  if (isHDCanvas(ctx)) {
    const rad = Math.max(4, (1 - progress * 0.45) * (type === 'piercing_shatter' ? 14 : 9));
    const drawHDStar = (bx: number, by: number, outer: string, inner: string) => {
      ctx.save();
      const g = ctx.createRadialGradient(bx, by, 0.5, bx, by, rad);
      g.addColorStop(0, '#ffffff');
      g.addColorStop(0.4, inner);
      g.addColorStop(0.8, outer);
      g.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(bx, by, rad, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = inner;
      ctx.lineWidth = 1.25;
      for (let i = 0; i < 4; i++) {
        const a = (i * Math.PI) / 4;
        ctx.beginPath();
        ctx.moveTo(bx - Math.cos(a) * rad * 0.9, by - Math.sin(a) * rad * 0.9);
        ctx.lineTo(bx + Math.cos(a) * rad * 0.9, by + Math.sin(a) * rad * 0.9);
        ctx.stroke();
      }
      ctx.restore();
    };

    if (type === 'normal') {
      drawHDStar(x, y, 'rgba(249, 115, 22, 0.45)', '#fde047');
    } else if (type === 'wide_multi_hit') {
      drawHDStar(x - 5, y, 'rgba(249, 115, 22, 0.45)', '#fde047');
      drawHDStar(x + 5, y, 'rgba(249, 115, 22, 0.45)', '#fde047');
    } else if (type === 'piercing_shatter') {
      drawHDStar(x, y, 'rgba(234, 88, 12, 0.65)', '#fef08a');
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.78)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(x, y, 5 + progress * 11, 0, Math.PI * 2);
      ctx.stroke();
    } else if (type === 'iron_deflect') {
      drawHDStar(x, y, 'rgba(56, 189, 248, 0.55)', '#e0f2fe');
    } else {
      drawHDStar(x, y, 'rgba(220, 38, 38, 0.55)', '#fdba74');
    }
    return;
  }

  const cx = Math.round(x);
  const cy = Math.round(y);
  const r = Math.max(2, Math.round((1 - progress * 0.5) * 6));

  const drawStarburst = (bx: number, by: number, outerColor: string, midColor: string) => {
    ctx.fillStyle = outerColor;
    ctx.fillRect(bx - r - 2, by, r * 2 + 5, 1);
    ctx.fillRect(bx, by - r - 2, 1, r * 2 + 5);
    for (let d = -r; d <= r; d++) {
      ctx.fillRect(bx + d, by + d, 1, 1);
      ctx.fillRect(bx + d, by - d, 1, 1);
    }
    ctx.fillStyle = midColor;
    ctx.fillRect(bx - 3, by - 3, 7, 7);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(bx - 1, by - 1, 3, 3);
  };

  if (type === 'normal') {
    drawStarburst(cx, cy, '#f97316', '#facc15');
  } else if (type === 'wide_multi_hit') {
    drawStarburst(cx - 6, cy, '#f97316', '#facc15');
    drawStarburst(cx + 6, cy, '#f97316', '#facc15');
  } else if (type === 'piercing_shatter') {
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(cx - 12, cy - 3, 4, 8);
    ctx.fillRect(cx + 9, cy - 3, 4, 8);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cx - 10, cy - 5, 3, 10);
    ctx.fillRect(cx + 8, cy - 5, 3, 10);
    drawStarburst(cx, cy, '#facc15', '#fef08a');
    const chipOffsets = [
      [-9, -7],
      [8, -8],
      [-11, -2],
      [10, -1],
      [-7, 5],
      [7, 6],
      [-3, -9],
      [4, -10],
    ];
    for (let i = 0; i < chipOffsets.length; i++) {
      const [ox, oy] = chipOffsets[i];
      const spread = 1 + progress * 1.4;
      drawParticle(ctx, {
        x: cx + ox * spread,
        y: cy + oy * spread,
        vx: 0,
        vy: 0,
        color: i % 2 === 0 ? '#9c5a2b' : '#c9834b',
        outlineColor: '#231409',
        size: i % 3 === 0 ? 3 : 2,
        kind: 'wood_chip',
      });
    }
  } else if (type === 'iron_deflect') {
    drawStarburst(cx, cy, '#38bdf8', '#9be4ff');
  } else if (type === 'arrow_clip') {
    drawStarburst(cx, cy, '#dc2626', '#fb923c');
  }
}

// ============================================================================
// 9. HEARTS (10x9 Active Heart & Lost Heart), TERRAIN PALETTES & SANCTUARY HUD
// ============================================================================

export const HEART_ACTIVE_10x9: readonly string[] = [
  '.xx....xx.', // 00: Top twin lobes outline
  'xhhx..xhhx', // 01: Upper lobes
  'xhVpxxhhqx', // 02: White/pink specular shine on left lobe, shadow on right
  'xhpphhhhqx', // 03: Full width upper body
  'xhhhhhhqqx', // 04: Mid body
  '.xhhhhqqx.', // 05: Lower taper 1
  '..xhhqqx..', // 06: Lower taper 2
  '...xhqx...', // 07: Lower taper 3
  '....xx....', // 08: Bottom point
];

export const HEART_LOST_10x9: readonly string[] = [
  '.zz....zz.', // 00
  'znvz..zvvz', // 01
  'znnvzzvvuz', // 02
  'znvvvvvvuz', // 03
  'zvvvvvvuuz', // 04
  '.zvvvvuuz.', // 05
  '..zvvuuz..', // 06
  '...zvuz...', // 07
  '....zz....', // 08
];

export function drawHeart(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  active = true,
  flash = false
): void {
  if (isHDCanvas(ctx)) {
    const cx = x + 5;
    const cy = y + 4.5;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.beginPath();
    ctx.moveTo(0, 4.4);
    ctx.bezierCurveTo(-5.4, 1.0, -5.6, -3.8, -2.5, -4.1);
    ctx.bezierCurveTo(-0.8, -4.2, -0.1, -2.6, 0, -2.0);
    ctx.bezierCurveTo(0.1, -2.6, 0.8, -4.2, 2.5, -4.1);
    ctx.bezierCurveTo(5.6, -3.8, 5.4, 1.0, 0, 4.4);
    ctx.closePath();

    if (flash) {
      ctx.fillStyle = '#ffffff';
    } else if (active) {
      const hg = ctx.createRadialGradient(-1.5, -2.0, 0.5, 0, 0, 5.5);
      hg.addColorStop(0, '#fda4af');
      hg.addColorStop(0.45, '#ef4444');
      hg.addColorStop(1, '#991b1b');
      ctx.fillStyle = hg;
    } else {
      ctx.fillStyle = '#272030';
    }
    ctx.strokeStyle = active ? '#450a0a' : '#0f172a';
    ctx.lineWidth = 0.9;
    ctx.fill();
    ctx.stroke();

    if (active && !flash) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.78)';
      ctx.beginPath();
      ctx.ellipse(-2.1, -2.1, 1.1, 0.65, -0.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    return;
  }

  blitMatrixSprite(
    ctx,
    active ? 'heart_active' : 'heart_lost',
    Math.round(x),
    Math.round(y),
    active ? HEART_ACTIVE_10x9 : HEART_LOST_10x9,
    OBSTACLE_PROJECTILE_PALETTE,
    flash
  );
}

export interface TerrainPaletteConfig {
  id: TerrainPalette;
  name: 'Meadow' | 'Courtyard' | 'Fortress Slate';
  bgPrimary: string;
  bgSecondary: string;
  detailPrimary: string;
  detailSecondary: string;
  laneLineColor: string;
  headerBg: string;
  headerBorder: string;
  sanctuaryFloor: string;
  wallStoneDark: string;
  wallStoneMid: string;
  wallStoneLight: string;
}

export const TERRAIN_PALETTES: readonly TerrainPaletteConfig[] = [
  {
    id: 'meadow',
    name: 'Meadow',
    bgPrimary: '#243b24',
    bgSecondary: '#1f341f',
    detailPrimary: '#325232',
    detailSecondary: '#446b3c',
    laneLineColor: '#365936',
    headerBg: '#121820',
    headerBorder: '#e2b43b',
    sanctuaryFloor: '#1a241c',
    wallStoneDark: '#262933',
    wallStoneMid: '#3d4252',
    wallStoneLight: '#5c647a',
  },
  {
    id: 'courtyard',
    name: 'Courtyard',
    bgPrimary: '#362e23',
    bgSecondary: '#2f271d',
    detailPrimary: '#4a3f31',
    detailSecondary: '#615341',
    laneLineColor: '#544736',
    headerBg: '#16141c',
    headerBorder: '#e2b43b',
    sanctuaryFloor: '#211c16',
    wallStoneDark: '#2b241d',
    wallStoneMid: '#473c30',
    wallStoneLight: '#695948',
  },
  {
    id: 'fortress',
    name: 'Fortress Slate',
    bgPrimary: '#23262e',
    bgSecondary: '#1e2028',
    detailPrimary: '#2f3440',
    detailSecondary: '#3d4454',
    laneLineColor: '#383e4e',
    headerBg: '#101218',
    headerBorder: '#3a8ee6',
    sanctuaryFloor: '#161820',
    wallStoneDark: '#191c24',
    wallStoneMid: '#2e3342',
    wallStoneLight: '#4c546b',
  },
];

const STAGE_PALETTE_MAP: Record<number, TerrainPalette> = {
  1: 'meadow',
  2: 'courtyard',
  3: 'fortress',
  4: 'meadow',
  5: 'meadow',
  6: 'courtyard',
  7: 'courtyard',
  8: 'fortress',
  9: 'courtyard',
  10: 'courtyard',
  11: 'fortress',
  12: 'fortress',
  13: 'fortress',
  14: 'courtyard',
  15: 'fortress',
  16: 'fortress',
};

export function resolveTerrainPalette(stageOrPalette: number | TerrainPalette): TerrainPaletteConfig {
  if (typeof stageOrPalette === 'string') {
    return TERRAIN_PALETTES.find((p) => p.id === stageOrPalette) ?? TERRAIN_PALETTES[0];
  }
  const clamped = Math.max(1, Math.min(16, Math.floor(stageOrPalette)));
  const id = STAGE_PALETTE_MAP[clamped] ?? TERRAIN_PALETTES[(clamped - 1) % TERRAIN_PALETTES.length].id;
  return TERRAIN_PALETTES.find((p) => p.id === id) ?? TERRAIN_PALETTES[0];
}

export function getTerrainPaletteName(stageNumber: number): TerrainPalette {
  return resolveTerrainPalette(stageNumber).id;
}

/**
 * Renders the Top Royal Sanctum Alcove (y = 22..56) where Queen Aurelia awaits rescue,
 * guarded by an Iron Portcullis Gate until all stage Raiders are defeated.
 */
export function drawTopSanctum(
  ctx: CanvasRenderingContext2D,
  sanctumUnlocked = false,
  animTick = 0,
  paletteOrStage: TerrainPalette | number = 'meadow',
  portcullisProgress?: number
): void {
  const pal = resolveTerrainPalette(paletteOrStage);
  const progress =
    portcullisProgress !== undefined
      ? Math.max(0, Math.min(1, portcullisProgress))
      : sanctumUnlocked
      ? 1
      : 0;

  // Flanking stone castle bastions on Top Row (left: 2..82, right: 158..238, y: 22..44)
  ctx.fillStyle = pal.wallStoneDark;
  ctx.fillRect(2, 22, 76, 14);
  ctx.fillRect(162, 22, 76, 14);
  ctx.fillStyle = pal.wallStoneMid;
  ctx.fillRect(4, 24, 72, 9);
  ctx.fillRect(164, 24, 72, 9);

  // Royal Sanctum Alcove Chamber (x = 80..160, y = 22..54)
  ctx.fillStyle = '#1e1533';
  ctx.fillRect(80, 22, 80, 32);

  if (isHDCanvas(ctx)) {
    // Warm Golden Throne-Room Glow inside Queen Aurelia's Sanctum
    const chamberGlow = ctx.createRadialGradient(120, 36, 3, 120, 42, 46);
    chamberGlow.addColorStop(0, sanctumUnlocked ? 'rgba(253, 224, 71, 0.50)' : 'rgba(251, 191, 36, 0.30)');
    chamberGlow.addColorStop(0.6, 'rgba(168, 85, 247, 0.18)');
    chamberGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = chamberGlow;
    ctx.fillRect(74, 22, 92, 48);
  }

  // Royal Crimson & Gold Runner Carpet leading up to Queen Aurelia (x = 104..136, y = 24..58)
  ctx.fillStyle = '#7f1d1d';
  ctx.fillRect(104, 24, 32, 34);
  ctx.fillStyle = '#dc2626';
  ctx.fillRect(108, 24, 24, 34);
  ctx.fillStyle = '#facc15';
  ctx.fillRect(105, 24, 2, 34);
  ctx.fillRect(133, 24, 2, 34);

  // Golden Sanctuary Light Rays streaming out as Portcullis opens!
  if (isHDCanvas(ctx) && progress > 0.05) {
    ctx.save();
    const rayGrad = ctx.createLinearGradient(120, 46, 120, 88);
    rayGrad.addColorStop(0, `rgba(253, 224, 71, ${(0.42 * progress).toFixed(2)})`);
    rayGrad.addColorStop(1, 'rgba(253, 224, 71, 0)');
    ctx.fillStyle = rayGrad;
    ctx.beginPath();
    ctx.moveTo(92, 52);
    ctx.lineTo(148, 52);
    ctx.lineTo(166, 88);
    ctx.lineTo(74, 88);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // Stone Sanctum Pillars & Royal Banners at x = 80..88 and x = 152..160
  for (const px of [80, 152]) {
    ctx.fillStyle = '#14161d';
    ctx.fillRect(px, 22, 8, 34);
    ctx.fillStyle = pal.wallStoneMid;
    ctx.fillRect(px + 1, 23, 6, 32);
    ctx.fillStyle = pal.wallStoneLight;
    ctx.fillRect(px + 2, 23, 2, 32);
    // Royal Gold-Trimmed Crimson Banner on each Bastion
    ctx.fillStyle = '#be123c';
    ctx.fillRect(px === 80 ? 64 : 168, 25, 8, 13);
    ctx.fillStyle = '#facc15';
    ctx.fillRect(px === 80 ? 66 : 170, 28, 4, 4);
  }

  // Flickering Royal Alcove Braziers (x = 92, 146)
  const flicker = Math.floor(animTick / 6) % 2;
  for (const tx of [92, 146]) {
    ctx.fillStyle = '#47250d';
    ctx.fillRect(tx, 31, 2, 5);
    ctx.fillStyle = '#ea580c';
    ctx.fillRect(tx - 1, 28 - flicker, 4, 3);
    ctx.fillStyle = '#facc15';
    ctx.fillRect(tx, 28, 2, 2);
  }

  // Animated Rising Iron Portcullis Gate at y = 52..56 (slides smoothly upward as progress -> 1)
  if (progress < 0.98) {
    const lift = progress * 13;
    const canClip =
      isHDCanvas(ctx) && typeof ctx.rect === 'function' && typeof ctx.clip === 'function';
    if (canClip) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(86, 22, 68, 36);
      ctx.clip();
    }

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(88, 52 - lift, 64, 5);
    ctx.fillStyle = '#64748b';
    ctx.fillRect(88, 53 - lift, 64, 2);
    for (let bx = 92; bx <= 148; bx += 7) {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(bx - 1, 45 - lift, 3, 12);
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(bx, 45 - lift, 1, 11);
    }
    if (!sanctumUnlocked) {
      // Golden Royal Seal Padlock Emblem in center
      ctx.fillStyle = '#b45309';
      ctx.fillRect(116, 49, 8, 7);
      ctx.fillStyle = '#facc15';
      ctx.fillRect(117, 50, 6, 5);
    }
    if (canClip) {
      ctx.restore();
    }
  }

  if (sanctumUnlocked) {
    // UNLOCKED! Glowing golden threshold + pulsing upward chevrons inviting Adrian in
    const pulse = Math.floor(animTick / 8) % 2;
    ctx.fillStyle = pulse === 0 ? '#facc15' : '#fde047';
    ctx.fillRect(88, 53, 64, 2);
    for (const cy of [69, 61]) {
      const yShift = cy - pulse * 2;
      ctx.fillStyle = '#fde047';
      ctx.fillRect(119, yShift, 2, 2);
      ctx.fillRect(117, yShift + 2, 6, 1.5);
      ctx.fillRect(115, yShift + 3.5, 10, 1.5);
    }
  }
}

/**
 * Renders the 240x320 Playfield Terrain Backdrop, Rich Torchlit HD Castle Masonry, Top Queen Sanctum & Entrance Gate
 */
export function drawBackdrop(
  ctx: CanvasRenderingContext2D,
  paletteOrStage: TerrainPalette | number = 'meadow',
  animTick = 0,
  activeColumnIndex = 0,
  sanctumUnlocked = false,
  portcullisProgress?: number
): void {
  const pal = resolveTerrainPalette(paletteOrStage);

  if (isHDCanvas(ctx)) {
    // Rich Torchlit HD Sculpted Castle Stone Floor
    const hdTheme =
      pal.id === 'meadow'
        ? { baseA: '#1d3124', baseB: '#18291e', mortar: '#101d15', bevel: 'rgba(134, 239, 172, 0.07)' }
        : pal.id === 'courtyard'
        ? { baseA: '#35291e', baseB: '#2d2219', mortar: '#1c150f', bevel: 'rgba(253, 186, 116, 0.08)' }
        : { baseA: '#1e2436', baseB: '#191e2e', mortar: '#0f1320', bevel: 'rgba(147, 197, 253, 0.08)' };

    ctx.fillStyle = hdTheme.baseA;
    ctx.fillRect(0, 22, 240, 244);

    // Sculpted Flagstone Masonry Course Grid
    const tileH = 16;
    const tileW = 24;
    for (let r = 0; r < 16; r++) {
      const ry = 22 + r * tileH;
      const staggerX = (r % 2) * (tileW / 2);
      for (let c = -1; c < 11; c++) {
        const rx = c * tileW + staggerX;
        if ((r + c) % 2 === 0) {
          ctx.fillStyle = hdTheme.baseB;
          ctx.fillRect(rx + 0.5, ry + 0.5, tileW - 1, tileH - 1);
        }
        ctx.fillStyle = hdTheme.bevel;
        ctx.fillRect(rx + 1, ry + 1, tileW - 2, 1);
      }
      ctx.fillStyle = hdTheme.mortar;
      ctx.fillRect(2, ry, 236, 0.8);
    }

    // Castle Side Curtain Walls & Flickering Torch Sconces casting Golden Light Pools!
    ctx.fillStyle = '#151924';
    ctx.fillRect(2, 36, 5, 228);
    ctx.fillRect(233, 36, 5, 228);
    ctx.fillStyle = '#2d3548';
    ctx.fillRect(5, 36, 1.5, 228);
    ctx.fillRect(233, 36, 1.5, 228);

    const torchFlicker = Math.sin(animTick * 0.22) * 3;
    const wallTorches: Array<[number, number]> = [
      [8, 108],
      [232, 108],
      [8, 196],
      [232, 196],
      [94, 34],
      [146, 34],
      [98, 296],
      [142, 296],
    ];
    for (const [tx, ty] of wallTorches) {
      const poolR = 44 + torchFlicker;
      const pool = ctx.createRadialGradient(tx, ty, 2, tx, ty, poolR);
      pool.addColorStop(0, 'rgba(251, 191, 36, 0.24)');
      pool.addColorStop(0.5, 'rgba(234, 88, 12, 0.09)');
      pool.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = pool;
      ctx.beginPath();
      ctx.arc(tx, ty, poolR, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw Visible Side-Wall Iron Torch Sconces & Flames
    const fShift = Math.floor(animTick / 5) % 2;
    for (const sy of [108, 196]) {
      for (const sx of [6, 234]) {
        ctx.fillStyle = '#475569';
        ctx.fillRect(sx - 1.5, sy, 3, 4);
        ctx.fillStyle = '#ea580c';
        ctx.beginPath();
        ctx.arc(sx, sy - 2 - fShift * 0.6, 2.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(sx, sy - 1.8, 1.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Top Royal Sanctum & Bottom Castle Gate
    drawTopSanctum(ctx, sanctumUnlocked, animTick, paletteOrStage, portcullisProgress);
    drawSanctuary(ctx, 'watching', animTick, activeColumnIndex, paletteOrStage);

    // Crisp Royal Gold Outer Frame
    ctx.fillStyle = '#e2b43b';
    ctx.fillRect(0, 0, 2, 320);
    ctx.fillRect(238, 0, 2, 320);
    ctx.fillRect(0, 0, 240, 2);
    ctx.fillRect(0, 318, 240, 2);
    return;
  }

  // 1. Playfield Base & 4 Subtle Tactical Sector Bands (y = 22..264)
  for (let col = 0; col < 4; col++) {
    const colX = col * 60;
    ctx.fillStyle = col % 2 === 0 ? pal.bgPrimary : pal.bgSecondary;
    ctx.fillRect(colX, 22, 60, 242);

    if (col === activeColumnIndex) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.025)';
      ctx.fillRect(colX, 22, 60, 242);
    }
  }

  // 2. Deterministic Terrain Tile Details (Grass tufts, Courtyard cobbles, or Slate joints)
  for (let row = 0; row < 7; row++) {
    const ty = 42 + row * 32;
    for (let col = 0; col < 4; col++) {
      const tx = col * 60 + (row % 2 === 0 ? 14 : 38);
      if (pal.id === 'meadow') {
        ctx.fillStyle = pal.detailPrimary;
        ctx.fillRect(tx, ty, 1, 3);
        ctx.fillRect(tx + 2, ty - 1, 1, 4);
        ctx.fillRect(tx + 4, ty, 1, 3);
        ctx.fillStyle = pal.detailSecondary;
        ctx.fillRect(tx + 2, ty - 1, 1, 1);
      } else if (pal.id === 'courtyard') {
        ctx.fillStyle = pal.detailPrimary;
        ctx.fillRect(tx - 4, ty, 10, 1);
        ctx.fillRect(tx, ty, 1, 4);
        ctx.fillStyle = pal.detailSecondary;
        ctx.fillRect(tx - 3, ty + 1, 4, 1);
      } else {
        ctx.fillStyle = pal.detailPrimary;
        ctx.fillRect(tx - 5, ty, 12, 1);
        ctx.fillRect(tx + 6, ty, 1, 4);
        ctx.fillStyle = pal.detailSecondary;
        ctx.fillRect(tx - 4, ty + 2, 1, 1);
      }
    }
  }

  // 3. Subtle Castle Floor Grid Dots at x = 60, 120, 180
  ctx.fillStyle = pal.laneLineColor;
  for (let i = 1; i < 4; i++) {
    const lx = i * 60;
    for (let y = 60; y < 262; y += 8) {
      ctx.fillRect(lx, y, 1, 2);
    }
  }

  // 4. Top Royal Sanctum Alcove & Portcullis Gate (y = 22..56)
  drawTopSanctum(ctx, sanctumUnlocked, animTick, paletteOrStage, portcullisProgress);

  // 5. Bottom Castle Entrance Courtyard Zone (y = 264..320)
  drawSanctuary(ctx, 'watching', animTick, activeColumnIndex, paletteOrStage);

  // 6. Crisp 2px Gold Outer Frame at x = 0..1 and x = 238..239
  ctx.fillStyle = '#e2b43b';
  ctx.fillRect(0, 0, 2, 320);
  ctx.fillRect(238, 0, 2, 320);
  ctx.fillRect(0, 0, 240, 2);
  ctx.fillRect(0, 318, 240, 2);
}

export const drawPlayfieldBackdrop = drawBackdrop;

/**
 * Renders the bottom Castle Courtyard Entrance fortification wall, battlements, gate arch & torches
 */
export function drawSanctuary(
  ctx: CanvasRenderingContext2D,
  _queenMood: QueenMood = 'watching',
  animTick = 0,
  activeColumnIndex = 0,
  paletteOrStage: TerrainPalette | number = 'meadow'
): void {
  const pal = resolveTerrainPalette(paletteOrStage);

  // Castle Entrance Courtyard Floor (y = 264..298)
  ctx.fillStyle = pal.sanctuaryFloor;
  ctx.fillRect(2, 264, 236, 54);

  if (isHDCanvas(ctx)) {
    const entGlow = ctx.createRadialGradient(120, 286, 4, 120, 286, 54);
    entGlow.addColorStop(0, 'rgba(251, 191, 36, 0.16)');
    entGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = entGlow;
    ctx.fillRect(40, 264, 160, 36);
  }

  // Subtle threshold cobble line (y = 264)
  ctx.fillStyle = '#47250d';
  ctx.fillRect(2, 264, 236, 1.2);
  for (let col = 0; col < 4; col++) {
    const cx = col * 60 + 30;
    ctx.fillStyle = col === activeColumnIndex ? '#facc15' : '#475569';
    ctx.fillRect(cx - 3, 266, 7, 1);
  }

  // Bottom Castle Gate Battlement Wall (y = 298..318)
  ctx.fillStyle = pal.wallStoneDark;
  ctx.fillRect(2, 298, 236, 20);
  ctx.fillStyle = pal.wallStoneMid;
  ctx.fillRect(2, 300, 236, 18);

  // Stone crenellations (merlons & embrasures along y = 294..300)
  for (let mx = 4; mx < 236; mx += 16) {
    ctx.fillStyle = '#14161d';
    ctx.fillRect(mx - 1, 293, 10, 7);
    ctx.fillStyle = pal.wallStoneMid;
    ctx.fillRect(mx, 294, 8, 6);
    ctx.fillStyle = pal.wallStoneLight;
    ctx.fillRect(mx, 294, 8, 1);
  }

  // Mortar brick lines across sanctuary wall
  ctx.fillStyle = pal.wallStoneDark;
  ctx.fillRect(2, 306, 236, 1);
  ctx.fillRect(2, 313, 236, 1);
  for (let bx = 12; bx < 238; bx += 24) {
    ctx.fillRect(bx, 300, 1, 6);
    ctx.fillRect(bx + 12, 307, 1, 6);
    ctx.fillRect(bx, 314, 1, 4);
  }

  // Central Iron-Bound Wooden Entrance Gate Archway (x = 104..136, y = 299..318)
  ctx.fillStyle = '#14161d';
  ctx.fillRect(104, 299, 32, 19);
  ctx.fillStyle = '#5c3112';
  ctx.fillRect(106, 301, 28, 17);
  ctx.fillStyle = '#8f5124';
  ctx.fillRect(108, 302, 11, 16);
  ctx.fillRect(121, 302, 11, 16);
  ctx.fillStyle = '#334155';
  ctx.fillRect(106, 305, 28, 2);
  ctx.fillRect(106, 313, 28, 2);
  ctx.fillStyle = '#cbd5e1';
  for (const rx of [109, 116, 123, 130]) {
    ctx.fillRect(rx, 305, 1, 1);
    ctx.fillRect(rx, 313, 1, 1);
  }

  // Flickering Wall Torches flanking the Gate
  const flameFlicker = Math.floor(animTick / 6) % 2;
  for (const tx of [98, 141]) {
    ctx.fillStyle = '#47250d';
    ctx.fillRect(tx, 303, 2, 5);
    ctx.fillStyle = '#ea580c';
    ctx.fillRect(tx - 1, 300 - flameFlicker, 4, 3);
    ctx.fillStyle = '#facc15';
    ctx.fillRect(tx, 300, 2, 2);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(tx, 301, 1, 1);
  }
}

/**
 * Renders metallic Castle Floor Spikes matching Nokia Arrow Master Lv31 (arrowmaster2.jpeg)
 */
export function drawFloorSpike(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width = 24,
  frame = 0
): void {
  if (isHDCanvas(ctx)) {
    const halfW = width / 2;
    const left = x - halfW;
    const top = y - 5;
    const glint = Math.floor(frame / 18) % 3 === 0;

    ctx.save();
    // Recessed iron grate plate
    ctx.fillStyle = '#090d16';
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.roundRect(left, top + 6.5, width, 4.4, 1.4);
    ctx.fill();
    ctx.stroke();

    // Conical 3D steel spike blades
    const count = Math.max(2, Math.floor(width / 6));
    const stepW = width / count;
    for (let i = 0; i < count; i++) {
      const sx = left + i * stepW + stepW * 0.5;
      const bladeGrad = ctx.createLinearGradient(sx - 2.4, top, sx + 2.4, top + 8);
      bladeGrad.addColorStop(0, glint && i % 2 === 0 ? '#ffffff' : '#f1f5f9');
      bladeGrad.addColorStop(0.5, '#94a3b8');
      bladeGrad.addColorStop(1, '#334155');
      ctx.fillStyle = bladeGrad;
      ctx.strokeStyle = '#090d16';
      ctx.lineWidth = 0.75;
      ctx.beginPath();
      ctx.moveTo(sx, top - 0.8);
      ctx.lineTo(sx + 2.3, top + 8.0);
      ctx.lineTo(sx - 2.3, top + 8.0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
    return;
  }

  const halfW = Math.round(width / 2);
  const left = Math.round(x - halfW);
  const top = Math.round(y - 5);
  const glint = Math.floor(frame / 18) % 3 === 0;

  // Dark iron base plate
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(left, top + 7, width, 4);
  ctx.fillStyle = '#334155';
  ctx.fillRect(left + 1, top + 8, width - 2, 2);

  // Repeating 6px-wide steel spike teeth
  const count = Math.max(2, Math.floor(width / 6));
  for (let i = 0; i < count; i++) {
    const sx = left + i * 6 + 3;
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(sx - 2, top + 3, 5, 4);
    ctx.fillRect(sx - 1, top, 3, 3);
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(sx - 1, top + 3, 3, 4);
    ctx.fillStyle = glint && i % 2 === 0 ? '#ffffff' : '#e2e8f0';
    ctx.fillRect(sx, top + 1, 1, 4);
  }
}

/**
 * Renders active Enemy Projectiles: spinning Iron Dagger or blazing Goblin Fireball
 */
export function drawEnemyProjectile(
  ctx: CanvasRenderingContext2D,
  proj: { kind: 'dagger' | 'fireball'; x: number; y: number; angle?: number; frame?: number },
  animTick = 0
): void {
  const frame = proj.frame ?? animTick;

  if (isHDCanvas(ctx)) {
    ctx.save();
    ctx.translate(proj.x, proj.y);

    if (proj.kind === 'dagger') {
      const spinAngle = proj.angle ?? frame * 0.35;
      // Crisp silver-emerald spin blur ring showing exact collision diameter (r = 5.6)
      ctx.strokeStyle = 'rgba(186, 230, 253, 0.45)';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.arc(0, 0, 5.6, spinAngle, spinAngle + Math.PI * 1.35);
      ctx.stroke();

      ctx.rotate(spinAngle);
      // Leather grip + brass crossguard
      ctx.fillStyle = '#78350f';
      ctx.fillRect(-1.0, 2.5, 2.0, 3.0);
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.roundRect(-2.8, 1.4, 5.6, 1.4, 0.5);
      ctx.fill();

      // Double-edged gleaming steel dagger blade
      const dg = ctx.createLinearGradient(-2.2, 0, 2.2, 0);
      dg.addColorStop(0, '#ffffff');
      dg.addColorStop(0.5, '#cbd5e1');
      dg.addColorStop(1, '#475569');
      ctx.fillStyle = dg;
      ctx.strokeStyle = '#090d16';
      ctx.lineWidth = 0.85;
      ctx.beginPath();
      ctx.moveTo(0, -6.4);
      ctx.lineTo(2.2, 1.4);
      ctx.lineTo(-2.2, 1.4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else {
      // Smooth Round Molten Goblin Fireball Orb + Flickering Flame Corona (replaces square fillRects!)
      const pulse = Math.sin(frame * 0.45) * 0.6;
      const glow = ctx.createRadialGradient(0, 0, 1, 0, 0, 11.5 + pulse);
      glow.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
      glow.addColorStop(0.3, 'rgba(250, 204, 21, 0.85)');
      glow.addColorStop(0.62, 'rgba(234, 88, 12, 0.55)');
      glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, 0, 11.5 + pulse, 0, Math.PI * 2);
      ctx.fill();

      // Outer crimson-orange molten shell (exact visible threat diameter r = 4.6)
      const orbGrad = ctx.createRadialGradient(-1.2, -1.2, 0.5, 0, 0, 4.8);
      orbGrad.addColorStop(0, '#ffffff');
      orbGrad.addColorStop(0.38, '#fef08a');
      orbGrad.addColorStop(0.72, '#f97316');
      orbGrad.addColorStop(1, '#b91c1c');
      ctx.fillStyle = orbGrad;
      ctx.strokeStyle = '#7f1d1d';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.arc(0, 0, 4.6 + pulse * 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
    return;
  }

  const cx = Math.round(proj.x);
  const cy = Math.round(proj.y);

  if (proj.kind === 'dagger') {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(proj.angle ?? frame * 0.35);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-2, -6, 5, 12);
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(-1, -5, 3, 7);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, -5, 1, 6);
    ctx.fillStyle = '#b45309';
    ctx.fillRect(-2, 2, 5, 2);
    ctx.fillStyle = '#78350f';
    ctx.fillRect(-1, 4, 3, 2);
    ctx.restore();
  } else {
    const pulse = frame % 2;
    ctx.fillStyle = '#991b1b';
    ctx.fillRect(cx - 4, cy - 4, 9, 9);
    ctx.fillStyle = '#ea580c';
    ctx.fillRect(cx - 3, cy - 3 - pulse, 7, 7);
    ctx.fillStyle = '#facc15';
    ctx.fillRect(cx - 2, cy - 2, 5, 5);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cx - 1, cy - 1, 2, 2);
  }
}

/**
 * Renders collectible Crate Loot Pickups: Double Quiver, Great Arrow Quiver, or Heart Potion
 */
export function drawPickupItem(
  ctx: CanvasRenderingContext2D,
  pickup: { kind: 'double_ammo' | 'heavy_ammo' | 'heart'; x: number; y: number; bobPhase?: number },
  animTick = 0
): void {
  if (isHDCanvas(ctx)) {
    const bob = Math.sin(animTick * 0.14 + (pickup.bobPhase ?? 0)) * 1.6;
    const cx = pickup.x;
    const cy = pickup.y + bob;

    ctx.save();
    ctx.translate(cx, cy);

    // Golden royal halo + gilded circular medallion (r = 6.8)
    const halo = ctx.createRadialGradient(0, 0, 2, 0, 0, 11.5);
    halo.addColorStop(0, 'rgba(250, 204, 21, 0.45)');
    halo.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(0, 0, 11.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = pickup.kind === 'double_ammo' ? '#0f294a' : pickup.kind === 'heavy_ammo' ? '#431407' : '#2e1022';
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.arc(0, 0, 6.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    if (pickup.kind === 'heart') {
      ctx.restore();
      drawHeart(ctx, cx - 5, cy - 4.5, true, false);
      return;
    }

    if (pickup.kind === 'double_ammo') {
      // Crisp twin cyan-gold miniature arrows
      for (const ox of [-2.1, 2.1]) {
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.moveTo(ox, 3.8);
        ctx.lineTo(ox, -2.6);
        ctx.stroke();
        ctx.fillStyle = '#fde047';
        ctx.beginPath();
        ctx.moveTo(ox, -4.4);
        ctx.lineTo(ox + 1.8, -1.6);
        ctx.lineTo(ox - 1.8, -1.6);
        ctx.closePath();
        ctx.fill();
      }
    } else {
      // Blazing heavy great-arrow emblem
      ctx.strokeStyle = '#fb923c';
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.moveTo(0, 4.2);
      ctx.lineTo(0, -2.2);
      ctx.stroke();
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.moveTo(0, -4.8);
      ctx.lineTo(3.2, -1.0);
      ctx.lineTo(-3.2, -1.0);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    return;
  }

  const bob = Math.round(Math.sin(animTick * 0.14 + (pickup.bobPhase ?? 0)) * 1.5);
  const cx = Math.round(pickup.x);
  const cy = Math.round(pickup.y + bob);

  ctx.fillStyle = 'rgba(250, 204, 21, 0.30)';
  ctx.fillRect(cx - 6, cy - 6, 13, 13);
  ctx.fillStyle = '#121318';
  ctx.fillRect(cx - 5, cy - 5, 11, 11);

  if (pickup.kind === 'heart') {
    drawHeart(ctx, cx - 5, cy - 4, true, false);
    return;
  }

  if (pickup.kind === 'double_ammo') {
    ctx.fillStyle = '#1e3a8a';
    ctx.fillRect(cx - 4, cy - 4, 9, 9);
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(cx - 2, cy - 3, 1, 7);
    ctx.fillRect(cx + 2, cy - 3, 1, 7);
    ctx.fillStyle = '#facc15';
    ctx.fillRect(cx - 3, cy - 4, 3, 2);
    ctx.fillRect(cx + 1, cy - 4, 3, 2);
  } else {
    ctx.fillStyle = '#7c2d12';
    ctx.fillRect(cx - 4, cy - 4, 9, 9);
    ctx.fillStyle = '#fb923c';
    ctx.fillRect(cx - 1, cy - 3, 3, 7);
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(cx - 2, cy - 4, 5, 2);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cx, cy - 4, 1, 5);
  }
}

function wrapDialogueWords(text: string, maxLen: number): string[] {
  const words = text.trim().split(/\s+/);
  const out: string[] = [];
  let cur = '';
  for (const w of words) {
    if (!cur) {
      cur = w;
    } else if (cur.length + 1 + w.length <= maxLen) {
      cur += ` ${w}`;
    } else {
      out.push(cur);
      cur = w;
    }
  }
  if (cur) out.push(cur);
  return out;
}

/**
 * Renders Queen Aurelia's Live In-Castle Royal Parchment Speech Ribbon below the Top Sanctum!
 */
export function drawQueenSpeechBubble(
  ctx: CanvasRenderingContext2D,
  text: string,
  mood: QueenMood = 'watching',
  _animTick = 0
): void {
  if (!text) return;
  const lines = wrapDialogueWords(text, 48).slice(0, 3);
  const boxH = lines.length === 1 ? 15 : lines.length === 2 ? 22 : 29;
  const boxX = 12;
  const boxY = 58;
  const boxW = 216;

  if (!isHDCanvas(ctx)) {
    ctx.fillStyle = '#fef3c7';
    ctx.fillRect(boxX, boxY, boxW, boxH);
    ctx.strokeStyle = '#b45309';
    ctx.strokeRect(boxX, boxY, boxW, boxH);
    ctx.font = 'bold 6px serif';
    ctx.fillStyle = '#450a0a';
    ctx.textAlign = 'center';
    lines.forEach((ln, i) => ctx.fillText(ln, 120, boxY + 9 + i * 8));
    ctx.textAlign = 'left';
    return;
  }

  ctx.save();
  // Drop shadow over castle stones
  ctx.fillStyle = 'rgba(5, 8, 16, 0.55)';
  ctx.beginPath();
  ctx.roundRect(boxX + 1.5, boxY + 2, boxW, boxH, 4);
  ctx.fill();

  // Warm Ivory-Vellum Parchment Gradient + Upward Speech Pointer toward Queen Aurelia (120, 52)
  const vellum = ctx.createLinearGradient(boxX, boxY, boxX, boxY + boxH);
  vellum.addColorStop(0, '#fffbeb');
  vellum.addColorStop(0.6, '#fef3c7');
  vellum.addColorStop(1, '#fde68a');
  ctx.fillStyle = vellum;
  ctx.strokeStyle = mood === 'distressed' ? '#e11d48' : mood === 'cheering' ? '#16a34a' : '#b45309';
  ctx.lineWidth = 1.25;

  ctx.beginPath();
  ctx.roundRect(boxX, boxY, boxW, boxH, 3.5);
  ctx.fill();
  ctx.stroke();

  // Speech pointer triangle pointing straight up at Queen Aurelia
  ctx.fillStyle = '#fffbeb';
  ctx.beginPath();
  ctx.moveTo(115, boxY + 0.6);
  ctx.lineTo(120, boxY - 4.8);
  ctx.lineTo(125, boxY + 0.6);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(115, boxY);
  ctx.lineTo(120, boxY - 4.8);
  ctx.lineTo(125, boxY);
  ctx.stroke();

  // Royal Wax Seal / Crown Accent on Left
  ctx.fillStyle = mood === 'distressed' ? '#be123c' : '#9333ea';
  ctx.beginPath();
  ctx.arc(boxX + 9, boxY + boxH / 2, 4.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#facc15';
  ctx.font = 'bold 6px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('♛', boxX + 9, boxY + boxH / 2 + 2.1);

  // Crisp Dark-Burgundy Royal Serif Dialogue Text
  ctx.font = 'italic bold 5.9px Georgia, "Times New Roman", serif';
  ctx.fillStyle = '#3b0712';
  if (lines.length === 1) {
    ctx.fillText(lines[0], 125, boxY + 9.8);
  } else if (lines.length === 2) {
    ctx.fillText(lines[0], 125, boxY + 8.6);
    ctx.fillText(lines[1], 125, boxY + 16.6);
  } else {
    ctx.fillText(lines[0], 125, boxY + 8.2);
    ctx.fillText(lines[1], 125, boxY + 15.6);
    ctx.fillText(lines[2], 125, boxY + 23.0);
  }
  ctx.textAlign = 'left';
  ctx.restore();
}

export interface StoryOverlayPayload {
  mode: 'prologue' | 'briefing' | 'stage_clear' | 'victory_campaign';
  slideNumber?: number;
  totalSlides?: number;
  eyebrow: string;
  title: string;
  lines: string[];
  queenQuote?: string;
  hint?: string;
  promptText: string;
  queenMood?: QueenMood;
}

/**
 * Renders an Illuminated Royal Vellum & Midnight-Velvet Story Chronicle / Mission Briefing modal.
 */
export function drawStoryOverlay(
  ctx: CanvasRenderingContext2D,
  payload: StoryOverlayPayload,
  animTick = 0
): void {
  if (isHDCanvas(ctx)) {
    ctx.save();
    // 1. Rich Translucent Castle Backdrop Dimmer
    ctx.fillStyle = 'rgba(7, 10, 18, 0.78)';
    ctx.fillRect(2, 22, 236, 296);

    // 2. Midnight Royal Velvet Outer Card with Double Gold Filigree Border
    const cardGrad = ctx.createLinearGradient(10, 32, 10, 294);
    cardGrad.addColorStop(0, '#1a1630');
    cardGrad.addColorStop(0.5, '#131829');
    cardGrad.addColorStop(1, '#0d111d');
    ctx.fillStyle = cardGrad;
    ctx.strokeStyle = payload.mode === 'victory_campaign' ? '#fde047' : '#eab308';
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.roundRect(10, 32, 220, 262, 5);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = 'rgba(250, 204, 21, 0.42)';
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.roundRect(13, 35, 214, 256, 3.5);
    ctx.stroke();

    // Ornate Gold Corner Diamonds
    ctx.fillStyle = '#facc15';
    for (const [cx, cy] of [
      [15, 37],
      [225, 37],
      [15, 289],
      [225, 289],
    ]) {
      ctx.fillRect(cx - 1.5, cy - 1.5, 3, 3);
    }

    // 3. Illuminated Royal Crimson & Gold Header Ribbon (y = 36..64)
    const bannerGrad = ctx.createLinearGradient(14, 36, 226, 64);
    bannerGrad.addColorStop(0, '#311042');
    bannerGrad.addColorStop(0.5, '#4c0519');
    bannerGrad.addColorStop(1, '#311042');
    ctx.fillStyle = bannerGrad;
    ctx.fillRect(14, 36, 212, 27);
    ctx.fillStyle = '#eab308';
    ctx.fillRect(14, 63, 212, 1.2);

    ctx.textAlign = 'center';
    ctx.font = 'bold 6.2px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#93c5fd';
    ctx.fillText(payload.eyebrow, 120, 46.5);

    ctx.font = 'bold 9.2px Georgia, "Times New Roman", serif';
    ctx.fillStyle = '#fde047';
    ctx.fillText(payload.title, 120, 58.5);

    // 4. Torchlit HD Character Diorama Stage (y = 68..112)
    const stageGrad = ctx.createLinearGradient(20, 68, 20, 112);
    stageGrad.addColorStop(0, '#0f172a');
    stageGrad.addColorStop(1, '#1e1b38');
    ctx.fillStyle = stageGrad;
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.roundRect(20, 68, 200, 43, 3);
    ctx.fill();
    ctx.stroke();

    const dioramaGlow = ctx.createRadialGradient(120, 90, 4, 120, 90, 65);
    dioramaGlow.addColorStop(0, 'rgba(251, 191, 36, 0.24)');
    dioramaGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = dioramaGlow;
    ctx.fillRect(20, 68, 200, 43);

    if (payload.mode === 'prologue' && payload.slideNumber === 1) {
      drawGoblin(ctx, 72, 92, { variant: 'goblin_torch', hp: 2, maxHp: 2, walkFrame: Math.floor(animTick / 8) });
      drawBat(ctx, 120, 84, (Math.floor(animTick / 6) % 5) as BatFrame);
      drawGoblin(ctx, 168, 92, { variant: 'goblin_dagger', hp: 2, maxHp: 2, walkFrame: Math.floor(animTick / 8) + 1 });
    } else if (payload.mode === 'prologue' && payload.slideNumber === 2) {
      drawBlueIronBlock(ctx, 76, 91, animTick, false);
      drawQueen(ctx, 120, 91, 'praying', animTick);
      drawBlueIronBlock(ctx, 164, 91, animTick, false);
    } else if (payload.mode === 'stage_clear' || payload.mode === 'victory_campaign') {
      drawAdrian(ctx, 100, 92, 'idle1', false, { aimAngle: 0 });
      drawQueen(ctx, 140, 92, 'cheering', animTick);
      drawHeart(ctx, 115, 75, true, false);
    } else {
      drawAdrian(ctx, 72, 92, 'draw', 'single', { aimAngle: 0 });
      drawSingleArrow(ctx, 118, 90, Math.PI / 2, false, animTick);
      drawQueen(ctx, 166, 92, payload.queenMood ?? 'watching', animTick);
    }

    // 5. Crisp Royal Chronicle Narrative Lines (y = 123..176)
    ctx.textAlign = 'center';
    ctx.font = '6.8px Georgia, "Times New Roman", serif';
    ctx.fillStyle = '#f1f5f9';
    let lineY = 123;
    for (const line of payload.lines) {
      ctx.fillText(line, 120, lineY);
      lineY += 10.8;
    }

    // 6. Queen Aurelia's Illuminated Vellum Royal Decree Card + Portrait Medallion!
    if (payload.queenQuote) {
      const qLines = wrapDialogueWords(payload.queenQuote, 41).slice(0, 5);
      const qBoxY = 178;
      const qBoxH = 54;
      const vellumGrad = ctx.createLinearGradient(18, qBoxY, 18, qBoxY + qBoxH);
      vellumGrad.addColorStop(0, '#fffbeb');
      vellumGrad.addColorStop(0.65, '#fef3c7');
      vellumGrad.addColorStop(1, '#fde68a');
      ctx.fillStyle = vellumGrad;
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.roundRect(18, qBoxY, 204, qBoxH, 4);
      ctx.fill();
      ctx.stroke();

      // Embedded Circular Royal Portrait Medallion on the Left (cx = 36, cy = qBoxY + 27)
      const medX = 36;
      const medY = qBoxY + 27;
      ctx.save();
      ctx.beginPath();
      ctx.arc(medX, medY, 13.5, 0, Math.PI * 2);
      ctx.fillStyle = '#2e1065';
      ctx.fill();
      ctx.clip();
      drawHDQueenFigure(
        ctx,
        medX,
        medY + 4,
        payload.mode === 'stage_clear' || payload.mode === 'victory_campaign'
          ? 'cheering'
          : payload.queenMood ?? 'watching',
        animTick,
        1.05
      );
      ctx.restore();

      ctx.strokeStyle = '#b45309';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(medX, medY, 13.5, 0, Math.PI * 2);
      ctx.stroke();

      // Queen Title & Realistic Spoken Dialogue on Vellum
      ctx.textAlign = 'left';
      ctx.font = 'bold 5.7px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#9f1239';
      ctx.fillText('♛ QUEEN AURELIA OF ELDORIA', 54, qBoxY + 9.8);

      ctx.font = 'italic bold 5.8px Georgia, "Times New Roman", serif';
      ctx.fillStyle = '#3b0712';
      const stepY = qLines.length >= 5 ? 7.6 : 8.2;
      qLines.forEach((ql, idx) => {
        ctx.fillText(ql, 54, qBoxY + 19.2 + idx * stepY);
      });
    }

    // 7. Tactical Ranger Controls & Intel Banner
    if (payload.hint) {
      const hLines = wrapDialogueWords(payload.hint, 40).slice(0, 2);
      ctx.fillStyle = '#0f2438';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.roundRect(18, 236, 204, 25, 3);
      ctx.fill();
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.font = 'bold 6.0px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#bae6fd';
      if (hLines.length === 1) {
        ctx.fillText(hLines[0], 120, 250.5);
      } else {
        ctx.fillText(hLines[0], 120, 246);
        ctx.fillText(hLines[1], 120, 255.5);
      }
    }

    // 8. Pulsing Golden Action Prompt
    const blink = Math.floor(animTick / 18) % 2 === 0;
    ctx.textAlign = 'center';
    ctx.font = 'bold 7.4px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = blink ? '#fde047' : '#ffffff';
    ctx.fillText(payload.promptText, 120, 279);
    ctx.textAlign = 'left';
    ctx.restore();
    return;
  }

  // Fallback software-canvas Story Overlay for Node unit tests
  ctx.fillStyle = 'rgba(8, 10, 16, 0.84)';
  ctx.fillRect(2, 22, 236, 296);

  ctx.fillStyle = '#141824';
  ctx.fillRect(12, 40, 216, 244);
  ctx.strokeStyle = payload.mode === 'victory_campaign' ? '#fde047' : '#e2b43b';
  ctx.lineWidth = 2;
  ctx.strokeRect(12, 40, 216, 244);

  ctx.strokeStyle = '#3a8ee6';
  ctx.lineWidth = 1;
  ctx.strokeRect(15, 43, 210, 238);

  ctx.fillStyle = '#1e2638';
  ctx.fillRect(16, 44, 208, 22);
  ctx.fillStyle = '#e2b43b';
  ctx.fillRect(16, 66, 208, 1);

  ctx.textAlign = 'center';
  ctx.font = 'bold 7px monospace';
  ctx.fillStyle = '#70c4ff';
  ctx.fillText(payload.eyebrow, 120, 53);

  ctx.font = 'bold 9px monospace';
  ctx.fillStyle = '#facc15';
  ctx.fillText(payload.title, 120, 63);

  ctx.fillStyle = '#10141f';
  ctx.fillRect(22, 72, 196, 38);
  ctx.strokeStyle = '#2d3548';
  ctx.strokeRect(22, 72, 196, 38);

  if (payload.mode === 'prologue' && payload.slideNumber === 1) {
    drawGoblin(ctx, 74, 92, { variant: 'goblin_torch', hp: 2, maxHp: 2, walkFrame: Math.floor(animTick / 8) });
    drawBat(ctx, 120, 86, (Math.floor(animTick / 6) % 5) as BatFrame);
    drawGoblin(ctx, 166, 92, { variant: 'goblin_dagger', hp: 2, maxHp: 2, walkFrame: Math.floor(animTick / 8) + 1 });
  } else if (payload.mode === 'prologue' && payload.slideNumber === 2) {
    drawBlueIronBlock(ctx, 78, 91, animTick, false);
    drawQueen(ctx, 120, 91, 'praying', animTick);
    drawBlueIronBlock(ctx, 162, 91, animTick, false);
  } else if (payload.mode === 'stage_clear' || payload.mode === 'victory_campaign') {
    drawAdrian(ctx, 102, 92, 'idle1', false);
    drawQueen(ctx, 138, 92, 'cheering', animTick);
    drawHeart(ctx, 115, 76, true, false);
  } else {
    drawAdrian(ctx, 76, 92, 'draw', 'single');
    drawSingleArrow(ctx, 118, 90, Math.PI / 2, false, animTick);
    drawQueen(ctx, 164, 92, payload.queenMood ?? 'watching', animTick);
  }

  ctx.font = '7px monospace';
  ctx.fillStyle = '#e2e8f0';
  let lineY = 123;
  for (const line of payload.lines) {
    ctx.fillText(line, 120, lineY);
    lineY += 11;
  }

  if (payload.queenQuote) {
    const qLines = wrapDialogueWords(payload.queenQuote, 40).slice(0, 3);
    ctx.fillStyle = '#1f1630';
    ctx.fillRect(19, 186, 202, 37);
    ctx.strokeStyle = '#a855f7';
    ctx.strokeRect(19, 186, 202, 37);
    ctx.font = 'bold 6.5px monospace';
    ctx.fillStyle = '#f472b6';
    ctx.fillText('QUEEN AURELIA (TOP SANCTUM):', 120, 195);
    ctx.font = '6px monospace';
    ctx.fillStyle = '#fef08a';
    qLines.forEach((ql, idx) => {
      ctx.fillText(ql, 120, 204 + idx * 8);
    });
  }

  if (payload.hint) {
    const hLines = wrapDialogueWords(payload.hint, 40).slice(0, 2);
    ctx.fillStyle = '#132436';
    ctx.fillRect(19, 227, 202, 26);
    ctx.strokeStyle = '#38bdf8';
    ctx.strokeRect(19, 227, 202, 26);
    ctx.font = 'bold 6px monospace';
    ctx.fillStyle = '#7dd3fc';
    if (hLines.length === 1) {
      ctx.fillText(hLines[0], 120, 242);
    } else {
      ctx.fillText(hLines[0], 120, 238);
      ctx.fillText(hLines[1], 120, 247);
    }
  }

  const blink = Math.floor(animTick / 18) % 2 === 0;
  ctx.font = 'bold 7.5px monospace';
  ctx.fillStyle = blink ? '#facc15' : '#ffffff';
  ctx.fillText(payload.promptText, 120, 272);
  ctx.textAlign = 'left';
}

// ============================================================================
// 10. UNIFIED CONTRACT DISPATCHERS (drawTarget, drawHazard, drawArrow, drawHUD)
// ============================================================================

export function drawTarget(
  ctx: CanvasRenderingContext2D,
  target: SpriteTarget,
  animTick = 0
): void {
  const frame = target.animFrame ?? Math.floor(animTick / 8);
  const flash = (target.flashTimer ?? 0) > 0;

  if (target.type === 'bat') {
    drawBat(ctx, target.x, target.y, (frame % 5) as BatFrame);
    return;
  }

  if (target.type === 'goblin_torch' || target.type === 'goblin_dagger') {
    drawGoblin(ctx, target.x, target.y, {
      variant: target.type,
      hp: target.hp,
      maxHp: target.maxHp,
      walkFrame: frame,
      flameFrame: target.flameFrame ?? Math.floor(animTick / 5),
      stagger: Boolean(target.staggerTimer && target.staggerTimer > 0) || target.state === 'stagger',
      lodgedArrows: target.lodgedArrows,
    });
    return;
  }

  if (target.type === 'palisade') {
    const isBroken = Boolean(target.broken) || target.hp <= 0;
    drawWoodPalisade(ctx, target.x, target.y, isBroken, flash, target.lodgedArrows ?? 0);
    return;
  }

  if (target.type === 'crate') {
    drawSiegeCrate(
      ctx,
      target.x,
      target.y,
      target.hp,
      target.maxHp,
      flash,
      target.lodgedArrows ?? 0
    );
  }
}

export function drawHazard(
  ctx: CanvasRenderingContext2D,
  hazard: SpriteHazard,
  animTick = 0
): void {
  const flash = (hazard.flashTimer ?? 0) > 0 || (hazard.sparkTimer ?? 0) > 0;
  const frame = hazard.frame ?? animTick;

  if (hazard.type === 'iron_block') {
    drawBlueIronBlock(ctx, hazard.x, hazard.y, frame, flash);
  } else if (hazard.type === 'floor_spike') {
    drawFloorSpike(ctx, hazard.x, hazard.y, hazard.width ?? 24, frame);
  } else if (hazard.type === 'rotating_shield') {
    const defaultSegments: ShieldSegment[] = [
      { type: 'iron', startAngle: 0, endAngle: Math.PI * 0.45, hp: 99, maxHp: 99 },
      { type: 'wood', startAngle: Math.PI * 0.5, endAngle: Math.PI * 0.95, hp: 2, maxHp: 2 },
      { type: 'iron', startAngle: Math.PI, endAngle: Math.PI * 1.45, hp: 99, maxHp: 99 },
      { type: 'wood', startAngle: Math.PI * 1.5, endAngle: Math.PI * 1.95, hp: 2, maxHp: 2 },
    ];
    drawRotatingShield(
      ctx,
      hazard.x,
      hazard.y,
      hazard.angle ?? 0,
      hazard.segments ?? defaultSegments,
      hazard.lodgedArrows ?? [],
      flash
    );
  }
}

export function drawArrow(
  ctx: CanvasRenderingContext2D,
  arrow: SpriteArrow,
  animTick = 0
): void {
  const angle = arrow.angle ?? (arrow.deflected ? 0.65 : 0);
  const frame = arrow.frame ?? arrow.animFrame ?? animTick;
  if (arrow.weaponType === 'single') {
    drawSingleArrow(ctx, arrow.x, arrow.y, angle, Boolean(arrow.slowed), frame);
  } else if (arrow.weaponType === 'double') {
    drawDoubleArrow(
      ctx,
      arrow.x,
      arrow.y,
      arrow.spread ?? 12,
      angle,
      Boolean(arrow.slowed),
      frame
    );
  } else {
    drawGreatArrow(ctx, arrow.x, arrow.y, angle, frame);
  }
}

export function drawHUD(ctx: CanvasRenderingContext2D, state: SpriteHUDState & { remainingRaiders?: number; sanctumUnlocked?: boolean }): void {
  const pal = resolveTerrainPalette(state.stage);
  const hd = isHDCanvas(ctx);

  // 1. Top Header Bar Backdrop (x = 2..238, y = 2..22)
  ctx.fillStyle = hd ? '#0d1322' : pal.headerBg;
  ctx.fillRect(2, 2, 236, 20);
  ctx.fillStyle = pal.headerBorder;
  ctx.fillRect(2, 21, 236, 1.2);

  // 2. Score & Stage Text
  ctx.font = hd ? 'bold 7.6px system-ui, -apple-system, sans-serif' : 'bold 8px monospace';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#f8fafc';
  const scoreStr = String(Math.max(0, state.score)).padStart(5, '0');
  ctx.fillText(`SCR:${scoreStr}`, 6, 10.2);

  ctx.fillStyle = '#facc15';
  const stageStr = String(Math.max(1, state.stage)).padStart(2, '0');
  ctx.fillText(`LV${stageStr}`, 64, 10.2);

  // 3. Weapon Variation & Mission Objective Indicator on sub-row (y = 19)
  ctx.font = hd ? 'bold 6.8px system-ui, -apple-system, sans-serif' : '7px monospace';
  const wLabel =
    state.activeWeapon === 'single'
      ? '1:SINGLE(∞)'
      : state.activeWeapon === 'double'
      ? `2:DOUBLE(${state.doubleAmmo ?? 5})`
      : `3:GREAT(${state.heavyAmmo ?? 2})`;
  ctx.fillStyle =
    state.activeWeapon === 'heavy'
      ? '#fb923c'
      : state.activeWeapon === 'double'
      ? '#fde047'
      : '#7dd3fc';
  ctx.fillText(wLabel, 6, 19);

  if (state.sanctumUnlocked) {
    ctx.fillStyle = '#4ade80';
    ctx.fillText('▲ ENTER SANCTUM!', 92, 19);
  } else if (typeof state.remainingRaiders === 'number') {
    ctx.fillStyle = '#e2e8f0';
    ctx.fillText(`GUARDS:${state.remainingRaiders}`, 98, 19);
  }

  // 4. Sanctuary Hearts Row (Top-Right: x = 176..234, y = 6)
  const totalSlots = Math.max(4, Math.min(5, state.maxHearts || 5));
  const startX = 238 - totalSlots * 12;
  const flashHeart = (state.heartFlashTimer ?? 0) > 0;

  for (let i = 0; i < totalSlots; i++) {
    const isActive = i < state.hearts;
    drawHeart(ctx, startX + i * 12, 6, isActive, flashHeart && i === state.hearts);
  }
}

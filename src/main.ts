/**
 * Townsaver: The Arrow Master — v2.0 2D Tactical Castle Assault & Story Campaign Controller
 * Connects the 60 FPS GameEngine (8-way 2D movement, 360°/8-way aiming, Goblin AI, Crate Pickups,
 * Top Royal Sanctum Queen Rescue, and 15-Chapter Story Mode) to the Desktop Chrome CRT Cabinet.
 */

import {
  AdrianFrameName,
  drawAdrian,
  drawArrow,
  drawBackdrop,
  drawEnemyProjectile,
  drawHazard,
  drawHUD,
  drawImpactBurst,
  drawParticle,
  drawPickupItem,
  drawQueen,
  drawQueenPortrait,
  drawStoryOverlay,
  drawTarget,
  getTerrainPaletteName,
  HazardKind,
  QueenMood,
  SPRITE_CATALOG,
  TargetKind,
  TerrainPalette,
  WeaponType,
} from './sprites';
import { SoundSystem, SoundTriggerEffect } from './audio';
import { GameEngine, LOGICAL_HEIGHT, LOGICAL_WIDTH } from './engine';
import { PROLOGUE_SLIDES, STAGE_NAMES } from './stages';
import { FailReason, GameState, GameStatus } from './types';

export interface TownsaverDevHook {
  version: string;
  milestone: number;
  canvasReady: boolean;
  contextAcquired: boolean;
  width: number;
  height: number;
  fps: number;
  frameCount: number;
  activeWeapon: WeaponType;
  lastKeyPressed: string | null;
  soundMuted: boolean;
  selectedStage: number;
  isPaused: boolean;
  queenMood: QueenMood;
  hearts: number;
  maxHearts: number;
  adrianFrame: AdrianFrameName;
  adrianCol: number;
  adrianX: number;
  adrianY: number;
  adrianFacingDir: string;
  sanctumUnlocked: boolean;
  remainingRaiders: number;
  terrainPalette: TerrainPalette;
  spritesRendered: string[];
  activeArrowsCount: number;
  lastSoundPlayed: string | null;
  soundPlayCount: number;
  soundHistory: string[];
  audioContextState: string;

  setQueenMood: (mood: QueenMood) => void;
  setHearts: (hearts: number) => void;
  triggerSound: (effect: SoundTriggerEffect) => void;
  fireShowcaseArrow: (weapon?: WeaponType) => void;

  engine: GameEngine;
  status: GameStatus;
  score: number;
  highScore: number;
  unlockedStage: number;
  doubleAmmo: number;
  heavyAmmo: number;
  lastFailReason: FailReason;
  statusBanner: string | null;

  getState: () => GameState;
  stepFrames: (count?: number, dtSeconds?: number) => GameState;
  loadStage: (stageNumber: number, showBriefing?: boolean) => GameState;
  fireWeapon: (weapon?: WeaponType, columnIndex?: number, angle?: number) => GameState;
  moveAdrian: (dx: number, dy: number, frames?: number) => GameState;
  setPosition: (x: number, y: number) => GameState;
  advanceStory: () => GameState;
  openPrologue: () => GameState;
  openBriefing: () => GameState;
  unlockSanctumOnly: () => GameState;
  triggerIronDeflectionTest: (weapon?: WeaponType) => GameState;
  triggerArrowClipTest: (mode?: 'palisade_slowed' | 'lodged') => GameState;
  clearCurrentColumn: () => GameState;
  clearCurrentStage: (advanceImmediately?: boolean) => GameState;
  resetSave: () => GameState;
}

declare global {
  interface Window {
    __TOWNSAVER__?: TownsaverDevHook;
  }
}

let canvas: HTMLCanvasElement;
let ctx: CanvasRenderingContext2D;
let qCanvas: HTMLCanvasElement | null = null;
let qCtx: CanvasRenderingContext2D | null = null;

// Initialize Audio & 2D Story Campaign GameEngine
const sound = new SoundSystem();
const engine = new GameEngine({ sound, initialStage: 1, storyMode: true });

// Live Keyboard Movement Tracking
const pressedKeys = new Set<string>();

// Application & Bezel State
let frameCount = 0;
let lastFpsUpdate = performance.now();
let currentFps = 60;
let framesThisSecond = 0;
let lastKeyPressed: string | null = null;
let activeWeapon: WeaponType = 'single';
let soundMuted = false;
let selectedStage = 1;
let isPaused = false;

let queenMood: QueenMood = 'watching';
let hearts = 4;
const maxHearts = 5;
let adrianFrame: AdrianFrameName = 'idle1';
let adrianCol = 2;
let terrainPalette: TerrainPalette = 'meadow';

const QUEEN_MOOD_DESCRIPTIONS: Record<QueenMood, string> = {
  watching: 'Calls out to Adrian from the locked Top Sanctum.',
  cheering: 'Waves from the Top Sanctum — ascend to rescue her!',
  praying: 'Clasps hands in urgent prayer — only 1 Heart left!',
  distressed: 'Cries out in alarm as Adrian takes a hit!',
};

function initCanvas(): boolean {
  const el = document.getElementById('game-canvas');
  if (!el || !(el instanceof HTMLCanvasElement)) {
    console.error('[Townsaver] Failed to find #game-canvas element');
    return false;
  }
  canvas = el;
  canvas.width = LOGICAL_WIDTH;
  canvas.height = LOGICAL_HEIGHT;

  const context = canvas.getContext('2d', { alpha: false });
  if (!context) {
    console.error('[Townsaver] Failed to acquire 2D rendering context');
    return false;
  }
  ctx = context;

  ctx.imageSmoothingEnabled = false;
  const ctxAny = ctx as unknown as Record<string, boolean>;
  if ('webkitImageSmoothingEnabled' in ctxAny) ctxAny.webkitImageSmoothingEnabled = false;
  if ('mozImageSmoothingEnabled' in ctxAny) ctxAny.mozImageSmoothingEnabled = false;

  return true;
}

function initQueenPortrait(): void {
  qCanvas = document.getElementById('queen-portrait-canvas') as HTMLCanvasElement | null;
  if (!qCanvas) return;
  qCtx = qCanvas.getContext('2d');
  if (!qCtx) return;
  qCtx.imageSmoothingEnabled = false;
  drawQueenPortrait(qCtx, queenMood, frameCount);
}

function syncFromEngine(): void {
  const st = engine.getState();
  activeWeapon = st.activeWeapon;
  selectedStage = st.stage;
  terrainPalette = st.terrainPalette || getTerrainPaletteName(st.stage);
  hearts = st.hearts;
  queenMood = st.queenMood;
  adrianCol = st.adrianCol;
  adrianFrame = st.adrianFrame;
  isPaused = st.status === 'paused';
}

function syncBezelDOM(): void {
  const st = engine.getState();

  // 1. Weapon cards & live quiver ammo badges
  (['single', 'double', 'heavy'] as const).forEach((w) => {
    const btn = document.getElementById(
      `btn-weapon-${w === 'single' ? '1' : w === 'double' ? '2' : '3'}`
    );
    if (btn) {
      if (w === activeWeapon) btn.classList.add('active');
      else btn.classList.remove('active');
    }
  });

  const dblVal = document.querySelector('#ammo-double .ammo-val');
  if (dblVal) dblVal.textContent = String(st.doubleAmmo);
  const hvyVal = document.querySelector('#ammo-heavy .ammo-val');
  if (hvyVal) hvyVal.textContent = String(st.heavyAmmo);

  // 2. Queen mood panel & portrait
  const titleEl = document.getElementById('queen-mood-title');
  const descEl = document.getElementById('queen-mood-desc');
  if (titleEl) {
    titleEl.textContent = queenMood.toUpperCase();
    titleEl.className = `queen-mood-title ${queenMood}`;
  }
  if (descEl) {
    descEl.textContent = st.sanctum.unlocked
      ? 'Portcullis OPEN! Walk up to the Top Sanctum to rescue her!'
      : QUEEN_MOOD_DESCRIPTIONS[queenMood];
  }
  if (qCtx) {
    drawQueenPortrait(qCtx, queenMood, frameCount);
  }

  // 3. Hearts
  const countEl = document.getElementById('hearts-count-text');
  if (countEl) {
    countEl.textContent = `${hearts} / ${maxHearts}`;
  }
  const heartIcons = document.querySelectorAll('#hearts-row .heart-icon');
  heartIcons.forEach((el, idx) => {
    if (idx < hearts) {
      el.classList.add('active');
      el.classList.remove('empty', 'lost');
      el.textContent = '♥';
    } else {
      el.classList.remove('active');
      el.classList.add('empty', 'lost');
      el.textContent = '♡';
    }
  });

  // 4. Story Mission Chronicle Panel
  const actEl = document.getElementById('story-act-badge');
  const chapEl = document.getElementById('story-chapter-title');
  const objEl = document.getElementById('story-objective-pill');
  const loreEl = document.getElementById('story-lore-text');

  if (actEl) actEl.textContent = st.story.actTitle;
  if (chapEl) chapEl.textContent = st.story.chapterTitle;
  if (objEl) {
    if (st.sanctum.unlocked) {
      objEl.textContent = '🔓 GATE OPEN! WALK UP TO THE QUEEN!';
      objEl.classList.add('unlocked');
    } else {
      objEl.textContent = `⚔ DEFEAT ${st.remainingRaiders} RAIDER${st.remainingRaiders === 1 ? '' : 'S'} TO UNLOCK GATE`;
      objEl.classList.remove('unlocked');
    }
  }
  if (loreEl) {
    loreEl.textContent = `${st.story.briefingLines.join(' ')} ${st.story.queenPlea}`;
  }

  // 5. Score & High Score
  const scoreEl = document.getElementById('current-score');
  if (scoreEl) {
    scoreEl.textContent = String(st.score).padStart(6, '0');
  }
  const highEl = document.getElementById('high-score');
  if (highEl) {
    highEl.textContent = String(st.highScore).padStart(6, '0');
  }

  // 6. Stage selector & display
  const stageSelect = document.getElementById('stage-select') as HTMLSelectElement | null;
  if (stageSelect) {
    stageSelect.value = String(Math.min(16, selectedStage));
  }
  const numEl = document.getElementById('stage-display-num');
  const nameEl = document.getElementById('stage-display-name');
  if (numEl) {
    numEl.textContent =
      selectedStage >= 16
        ? 'STAGE 16+'
        : `STAGE ${selectedStage.toString().padStart(2, '0')}`;
  }
  if (nameEl) {
    nameEl.textContent =
      st.stageName || STAGE_NAMES[Math.min(16, selectedStage)] || 'ENDLESS INVASION';
  }

  // 7. Footer status banner
  const footerMsg = document.getElementById('footer-status-msg');
  if (footerMsg) {
    if (st.statusBanner) {
      footerMsg.textContent = st.statusBanner.toUpperCase();
    } else if (st.sanctum.unlocked) {
      footerMsg.textContent = 'TOP SANCTUM GATE UNLOCKED! WALK UP TO RESCUE QUEEN AURELIA!';
    } else {
      footerMsg.textContent =
        'MOVE: [WASD/ARROWS] • AIM & SHOOT: [MOUSE CLICK / SPACE] • RESCUE QUEEN AT TOP!';
    }
  }
}

function updateMovementVectorFromKeys(): void {
  let dx = 0;
  let dy = 0;
  if (pressedKeys.has('KeyA') || pressedKeys.has('ArrowLeft') || pressedKeys.has('Numpad4')) {
    dx -= 1;
  }
  if (pressedKeys.has('KeyD') || pressedKeys.has('ArrowRight') || pressedKeys.has('Numpad6')) {
    dx += 1;
  }
  if (pressedKeys.has('KeyW') || pressedKeys.has('ArrowUp') || pressedKeys.has('Numpad8')) {
    dy -= 1;
  }
  if (pressedKeys.has('KeyS') || pressedKeys.has('ArrowDown') || pressedKeys.has('Numpad2')) {
    dy += 1;
  }
  engine.setMoveInput(dx, dy);
}

function isMovementKey(code: string): boolean {
  return (
    code === 'KeyW' ||
    code === 'KeyA' ||
    code === 'KeyS' ||
    code === 'KeyD' ||
    code === 'ArrowUp' ||
    code === 'ArrowDown' ||
    code === 'ArrowLeft' ||
    code === 'ArrowRight' ||
    code === 'Numpad8' ||
    code === 'Numpad2' ||
    code === 'Numpad4' ||
    code === 'Numpad6'
  );
}

function handleFireOrAdvance(): void {
  const st = engine.getState();
  if (
    st.status === 'prologue' ||
    st.status === 'briefing' ||
    st.status === 'title' ||
    st.status === 'stage_clear' ||
    st.status === 'victory_campaign'
  ) {
    engine.advanceStory();
    syncFromEngine();
    syncBezelDOM();
    if (ctx) renderPlayfield();
    updateDevHook();
    return;
  }

  engine.fireWeapon(activeWeapon);
  syncFromEngine();
  syncBezelDOM();
  updateDevHook();
}

function setupInputListeners(): void {
  window.addEventListener('keydown', (e: KeyboardEvent) => {
    // Allow stage dropdown navigation if focused, unless game key
    if (isMovementKey(e.code)) {
      e.preventDefault();
      pressedKeys.add(e.code);
      lastKeyPressed = `MOVE(${e.code})`;
      const st = engine.getState();
      if (st.status === 'briefing') {
        // Pressing a movement key on the briefing starts the mission right away!
        engine.advanceStory();
      }
      updateMovementVectorFromKeys();
      updateDevHook();
      return;
    }

    lastKeyPressed = e.code;

    if (e.code === 'Digit1') {
      selectWeapon('single');
    } else if (e.code === 'Digit2') {
      selectWeapon('double');
    } else if (e.code === 'Digit3') {
      selectWeapon('heavy');
    } else if (e.code === 'Tab' || e.code === 'KeyQ') {
      e.preventDefault();
      cycleWeapon();
    } else if (e.code === 'KeyM') {
      toggleMute();
    } else if (e.code === 'KeyB') {
      toggleBriefingModal();
    } else if (e.code === 'KeyP' || e.code === 'Escape') {
      const st = engine.getState();
      if (st.status === 'prologue' || st.status === 'briefing') {
        engine.startGame();
        syncFromEngine();
        syncBezelDOM();
      } else {
        togglePause();
      }
    } else if (e.code === 'KeyR') {
      restart();
    } else if (
      e.code === 'Space' ||
      e.code === 'Enter' ||
      e.code === 'Digit5' ||
      e.code === 'Numpad5' ||
      e.code === 'KeyE'
    ) {
      e.preventDefault();
      lastKeyPressed = `FIRE(${e.code})`;
      handleFireOrAdvance();
    }

    updateDevHook();
  });

  window.addEventListener('keyup', (e: KeyboardEvent) => {
    if (pressedKeys.has(e.code)) {
      pressedKeys.delete(e.code);
      updateMovementVectorFromKeys();
    }
  });

  window.addEventListener('blur', () => {
    pressedKeys.clear();
    engine.setMoveInput(0, 0);
  });

  // Smooth 360° Mouse Aiming across the 240x320 Playfield
  canvas.addEventListener('pointermove', (e: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const cx = (e.clientX - rect.left) * scaleX;
    const cy = (e.clientY - rect.top) * scaleY;
    engine.setAimCursor(cx, cy);
  });

  // Left-Click to Advance Story Overlay OR Aim 360° & Fire Immediately!
  canvas.addEventListener('pointerdown', (e: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;
    lastKeyPressed = `CLICK(${Math.round(clickX)},${Math.round(clickY)})`;

    const st = engine.getState();
    if (
      st.status === 'prologue' ||
      st.status === 'briefing' ||
      st.status === 'title' ||
      st.status === 'stage_clear' ||
      st.status === 'victory_campaign'
    ) {
      engine.advanceStory();
      syncFromEngine();
      syncBezelDOM();
      if (ctx) renderPlayfield();
      updateDevHook();
      return;
    }

    engine.setAimCursor(clickX, clickY);
    engine.fireWeapon(activeWeapon);
    syncFromEngine();
    syncBezelDOM();
    updateDevHook();
  });
}

function setupBezelBindings(): void {
  document.getElementById('btn-weapon-1')?.addEventListener('click', () => selectWeapon('single'));
  document.getElementById('btn-weapon-2')?.addEventListener('click', () => selectWeapon('double'));
  document.getElementById('btn-weapon-3')?.addEventListener('click', () => selectWeapon('heavy'));

  document.getElementById('btn-fire')?.addEventListener('click', () => {
    lastKeyPressed = 'FIRE_BTN';
    handleFireOrAdvance();
  });
  document.getElementById('btn-mute')?.addEventListener('click', toggleMute);
  document.getElementById('btn-pause')?.addEventListener('click', togglePause);
  document.getElementById('btn-restart')?.addEventListener('click', restart);

  document.getElementById('btn-prologue')?.addEventListener('click', () => {
    engine.openPrologue();
    syncFromEngine();
    syncBezelDOM();
    if (ctx) renderPlayfield();
    updateDevHook();
  });

  document.getElementById('btn-briefing')?.addEventListener('click', () => {
    toggleBriefingModal();
  });

  const stageSelect = document.getElementById('stage-select') as HTMLSelectElement | null;
  stageSelect?.addEventListener('change', (e) => {
    const val = parseInt((e.target as HTMLSelectElement).value, 10) || 1;
    setStage(val, true);
    stageSelect.blur();
  });

  document.getElementById('btn-prev-stage')?.addEventListener('click', () => {
    const prev = selectedStage > 1 ? selectedStage - 1 : 16;
    setStage(prev, true);
  });
  document.getElementById('btn-next-stage')?.addEventListener('click', () => {
    const next = selectedStage < 16 ? selectedStage + 1 : 1;
    setStage(next, true);
  });

  document.getElementById('btn-download-html')?.addEventListener('click', () => {
    downloadStandaloneHtml();
  });
}

function downloadStandaloneHtml(): void {
  const win = window as unknown as { __TOWNSAVER_CLEAN_HTML__?: string };
  const htmlSource =
    win.__TOWNSAVER_CLEAN_HTML__ || `<!DOCTYPE html>\n${document.documentElement.outerHTML}`;
  const blob = new Blob([htmlSource], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'townsaver_v2_arrow_master.html';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 4000);

  const footerMsg = document.getElementById('footer-status-msg');
  if (footerMsg) {
    footerMsg.textContent =
      'DOWNLOADED townsaver_v2_arrow_master.html TO CHROME DOWNLOADS!';
  }
}

function toggleBriefingModal(): void {
  const st = engine.getState();
  if (st.status === 'briefing' || st.status === 'prologue') {
    engine.startGame();
  } else {
    engine.openBriefing();
  }
  syncFromEngine();
  syncBezelDOM();
  if (ctx) renderPlayfield();
  updateDevHook();
}

function setStage(stageNum: number, showBriefing = false): void {
  selectedStage = Math.max(1, Math.min(16, stageNum));
  engine.loadStage(selectedStage, {
    status: isPaused ? 'paused' : showBriefing ? 'briefing' : 'playing',
  });
  syncFromEngine();
  syncBezelDOM();
  if (ctx) {
    renderPlayfield();
  }
  updateDevHook();
}

function selectWeapon(weapon: WeaponType): void {
  activeWeapon = weapon;
  const st = engine.getState();
  if (weapon === 'double' && st.doubleAmmo <= 0) {
    st.doubleAmmo = 5;
  } else if (weapon === 'heavy' && st.heavyAmmo <= 0) {
    st.heavyAmmo = 2;
  }
  engine.selectWeapon(weapon);
  syncBezelDOM();
  updateDevHook();
}

function cycleWeapon(): void {
  const next = engine.cycleWeapon();
  selectWeapon(next);
}

function toggleMute(): void {
  soundMuted = sound.toggleMute();
  const label = document.getElementById('mute-label');
  const icon = document.getElementById('mute-icon');
  if (label) label.textContent = soundMuted ? 'UNMUTE (M)' : 'MUTE (M)';
  if (icon) icon.textContent = soundMuted ? '🔇' : '🔊';
  updateDevHook();
}

function togglePause(): void {
  isPaused = engine.togglePause();
  const btn = document.getElementById('btn-pause');
  if (btn) {
    btn.innerHTML = isPaused
      ? '<span class="btn-icon">▶</span> RESUME (P)'
      : '<span class="btn-icon">⏸</span> PAUSE (P)';
  }
  if (ctx) {
    renderPlayfield();
  }
  updateDevHook();
}

function restart(): void {
  lastKeyPressed = 'RESTART';
  engine.restartStage();
  isPaused = false;
  syncFromEngine();
  syncBezelDOM();
  if (ctx) {
    renderPlayfield();
  }
  updateDevHook();
}

function setQueenMood(mood: QueenMood): void {
  queenMood = mood;
  engine.setQueenMood(mood);
  syncBezelDOM();
  if (ctx) renderPlayfield();
  updateDevHook();
}

function setHearts(newHearts: number): void {
  hearts = Math.max(0, Math.min(maxHearts, Math.floor(newHearts)));
  engine.setHearts(hearts);
  syncFromEngine();
  syncBezelDOM();
  if (ctx) renderPlayfield();
  updateDevHook();
}

function triggerSound(effect: SoundTriggerEffect): void {
  sound.triggerEffect(effect);
  updateDevHook();
}

function fireShowcaseArrow(weaponOverride?: WeaponType): void {
  const weapon = weaponOverride ?? activeWeapon;
  if (engine.getState().status !== 'playing') {
    engine.startGame();
  }
  engine.fireWeapon(weapon);
  syncFromEngine();
  syncBezelDOM();
  updateDevHook();
}

// ============================================================================
// 240x320 PLAYFIELD RENDER PIPELINE
// ============================================================================

function renderPlayfield(): void {
  const st = engine.getState();
  const shaking = st.screenShakeTimer > 0 && !isPaused;

  if (shaking) {
    ctx.save();
    ctx.translate(st.screenShakeOffsetX, st.screenShakeOffsetY);
  }

  // 1. Castle Backdrop, Top Royal Sanctum Alcove & Portcullis Gate, and Entrance Gate
  drawBackdrop(ctx, terrainPalette, frameCount, adrianCol, st.sanctum.unlocked);

  // 2. Queen Aurelia waiting inside the Top Royal Sanctum Alcove (x = 120, y = 38)
  drawQueen(ctx, st.sanctum.queenX, st.sanctum.queenY, queenMood, frameCount);
  if (qCtx && frameCount % 12 === 0) {
    drawQueenPortrait(qCtx, queenMood, frameCount);
  }

  // 3. Render Stage Hazards (Floor Spikes first so characters walk above them, then Iron Blocks & Shields)
  for (const h of st.hazards) {
    if ((h.type ?? h.kind) !== 'floor_spike') continue;
    drawHazard(
      ctx,
      {
        id: h.id,
        type: 'floor_spike',
        x: Math.round(h.x),
        y: Math.round(h.y),
        width: h.width,
        height: h.height,
        frame: frameCount,
      },
      frameCount
    );
  }

  // 4. Collectible Crate Pickups (Double Quiver, Great Arrow Quiver, Heart Potion)
  for (const item of st.pickups) {
    if (!item.active) continue;
    drawPickupItem(ctx, item, frameCount);
  }

  // 5. Render Stage Targets (Palisades, Siege Crates, Goblin Raiders, Winged Bats)
  for (const t of st.targets) {
    const kind = (t.type ?? t.kind) as TargetKind;
    if (!t.active && kind !== 'palisade') continue;
    if (t.hp <= 0 && kind !== 'palisade') continue;
    drawTarget(
      ctx,
      {
        id: t.id,
        type: kind,
        x: Math.round(t.x),
        y: Math.round(t.y),
        hp: t.hp,
        maxHp: t.maxHp,
        animFrame: t.animFrame,
        flameFrame: t.flameFrame,
        staggerTimer: t.staggerTimer,
        flashTimer: t.flashTimer,
        broken: t.broken ?? t.hp <= 0,
        lodgedArrows: t.lodgedArrows,
      },
      frameCount
    );
  }

  // 6. Solid Blue-Iron Blocks & Rotating Shield Wheels
  for (const h of st.hazards) {
    const kind = (h.type ?? h.kind) as HazardKind;
    if (kind === 'floor_spike') continue;
    drawHazard(
      ctx,
      {
        id: h.id,
        type: kind,
        x: Math.round(h.x),
        y: Math.round(h.y),
        angle: h.angle,
        radius: h.radius,
        sparkTimer: h.sparkTimer,
        flashTimer: h.flashTimer,
        frame: frameCount,
        segments: h.segments,
        lodgedArrows: h.lodgedArrows,
      },
      frameCount
    );
  }

  // 7. Enemy Projectiles (Spinning Iron Daggers & Goblin Torch Fireballs)
  for (const eproj of st.enemyProjectiles) {
    if (!eproj.active) continue;
    drawEnemyProjectile(ctx, eproj, frameCount);
  }

  // 8. In-Flight Player Arrows (8-way & 360° rotated)
  for (const arr of st.arrows) {
    drawArrow(
      ctx,
      {
        id: arr.id,
        x: Math.round(arr.x),
        y: Math.round(arr.y),
        weaponType: arr.weaponType,
        vy: arr.vy,
        angle: arr.angle,
        spread: arr.spread ?? 0,
        slowed: Boolean(arr.slowed ?? arr.slowedByPalisade),
        piercing: Boolean(arr.piercing),
        deflected: Boolean(arr.deflected),
        frame: frameCount,
      },
      frameCount
    );
  }

  // 9. Impact Starbursts & Splinter/Spark Particles
  for (const b of st.bursts) {
    drawImpactBurst(ctx, Math.round(b.x), Math.round(b.y), b.type, b.timer / b.maxTimer);
  }
  for (const p of st.particles) {
    drawParticle(ctx, p);
  }

  // 10. Adrian (The Arrow Master) with 2D Free-Roam Walk, Directional Flip & Aim Reticle!
  const flashActive = st.muzzleFlashTimer > 0;
  const flashWeapon = st.muzzleFlashWeapon !== 'none' ? st.muzzleFlashWeapon : activeWeapon;
  drawAdrian(
    ctx,
    Math.round(st.adrianX),
    Math.round(st.adrianY),
    adrianFrame,
    flashActive ? flashWeapon : false,
    {
      aimAngle: st.adrianFacingAngle,
      isMoving: st.adrianVx !== 0 || st.adrianVy !== 0,
      walkTick: st.adrianWalkTick,
      invulnerable: st.adrianInvulnTimer > 0,
      showAimReticle: st.status === 'playing',
      cursorX: st.useMouseAim ? st.aimCursorX : null,
      cursorY: st.useMouseAim ? st.aimCursorY : null,
    }
  );

  // 11. Top Header Bar HUD (Score, Stage, Weapon, Remaining Foes / Unlock Status, Hearts)
  drawHUD(ctx, {
    score: st.score,
    highScore: st.highScore,
    stage: selectedStage,
    hearts,
    maxHearts,
    activeWeapon,
    doubleAmmo: st.doubleAmmo,
    heavyAmmo: st.heavyAmmo,
    queenMood,
    heartFlashTimer: st.heartFlashTimer,
    statusBanner: st.statusBanner,
    remainingRaiders: st.remainingRaiders,
    sanctumUnlocked: st.sanctum.unlocked,
  });

  // Live On-Screen Floating Callout Banner during active play
  if (st.status === 'playing' && st.statusBanner) {
    ctx.fillStyle = 'rgba(12, 18, 28, 0.86)';
    ctx.fillRect(14, 24, 212, 13);
    ctx.fillStyle = st.sanctum.unlocked ? '#4ade80' : '#fde047';
    ctx.font = 'bold 6.5px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(st.statusBanner.slice(0, 34), 120, 33);
    ctx.textAlign = 'left';
  }

  if (shaking) {
    ctx.restore();
  }

  // 12. Interactive Story Overlays & Status Modals
  if (st.status === 'prologue') {
    const slide = PROLOGUE_SLIDES[st.prologueIndex] ?? PROLOGUE_SLIDES[0];
    drawStoryOverlay(
      ctx,
      {
        mode: 'prologue',
        slideNumber: slide.slideNumber,
        totalSlides: slide.totalSlides,
        eyebrow: `${slide.heading} (${slide.slideNumber}/${slide.totalSlides})`,
        title: slide.caption,
        lines: slide.lines,
        queenQuote:
          slide.slideNumber === 2
            ? '"Adrian! Only you can break the Ironfang siege and free Eldoria!"'
            : undefined,
        hint:
          slide.slideNumber === 3
            ? 'WASD/ARROWS: Move 8-Way • MOUSE/SPACE: Aim & Shoot!'
            : 'STORY CAMPAIGN • CASTLE ELDORIA',
        promptText:
          slide.slideNumber < slide.totalSlides
            ? '▶ PRESS [SPACE] OR CLICK FOR NEXT'
            : '▶ PRESS [SPACE] OR CLICK TO BEGIN',
      },
      frameCount
    );
  } else if (st.status === 'briefing') {
    drawStoryOverlay(
      ctx,
      {
        mode: 'briefing',
        eyebrow: st.story.actTitle,
        title: st.story.chapterTitle,
        lines: st.story.briefingLines,
        queenQuote: st.story.queenPlea,
        hint: st.story.tacticalHint,
        queenMood: st.queenMood,
        promptText: '▶ [SPACE] / [WASD] / CLICK TO DEPLOY',
      },
      frameCount
    );
  } else if (st.status === 'stage_clear') {
    drawStoryOverlay(
      ctx,
      {
        mode: 'stage_clear',
        eyebrow: `SANCTUM RECLAIMED • STAGE ${st.stage} CLEAR!`,
        title: 'QUEEN AURELIA RESCUED!',
        lines: [
          'Adrian ascends the Royal Sanctum steps',
          'and breaks the iron seal! Before they',
          'can rest, fleeing captains pull Aurelia',
          'toward the next higher castle floor!',
        ],
        queenQuote: st.story.reunionQuote,
        hint: st.flawlessStage
          ? 'FLAWLESS CLEAR BONUS: +1 HEART & +2 DOUBLE ARROWS!'
          : 'REWARD: +2 DOUBLE ARROWS & +1 GREAT ARROW!',
        promptText: '▶ [SPACE] OR CLICK FOR NEXT CHAPTER',
      },
      frameCount
    );
  } else if (st.status === 'victory_campaign') {
    drawStoryOverlay(
      ctx,
      {
        mode: 'victory_campaign',
        eyebrow: 'GRAND FINALE VICTORY • STAGE 15 CLEAR!',
        title: 'CASTLE ELDORIA LIBERATED!',
        lines: [
          'Warlord Grimgor’s elite guard shatters!',
          'Adrian reaches the Crown Spire Sanctum',
          'and frees Queen Aurelia at last.',
          'Peace returns to the realm of Eldoria!',
        ],
        queenQuote: st.story.reunionQuote,
        hint: 'UNLOCKED: STAGE 16+ ENDLESS INVASION MODE!',
        promptText: '▶ [SPACE] OR CLICK FOR ENDLESS MODE',
      },
      frameCount
    );
  } else if (st.status === 'town_breached') {
    ctx.fillStyle = 'rgba(28, 10, 16, 0.94)';
    ctx.fillRect(12, 112, 216, 48);
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.strokeRect(12, 112, 216, 48);
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#f87171';
    ctx.fillText('ARROW MASTER FALLEN!', 120, 130);
    ctx.font = 'bold 7.5px monospace';
    ctx.fillStyle = '#fde047';
    ctx.fillText('REGROUPING AT SECTOR GATE...', 120, 148);
    ctx.textAlign = 'left';
  } else if (st.status === 'paused') {
    ctx.fillStyle = 'rgba(10, 14, 22, 0.88)';
    ctx.fillRect(28, 118, 184, 44);
    ctx.strokeStyle = '#3a8ee6';
    ctx.lineWidth = 2;
    ctx.strokeRect(28, 118, 184, 44);
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#facc15';
    ctx.fillText('GAME PAUSED', 120, 137);
    ctx.font = '7.5px monospace';
    ctx.fillStyle = '#e2e8f0';
    ctx.fillText('PRESS [P] TO RESUME', 120, 152);
    ctx.textAlign = 'left';
  }

  // 13. Crisp 2px Gold Outer Frame
  ctx.fillStyle = '#e2b43b';
  ctx.fillRect(0, 0, 2, LOGICAL_HEIGHT);
  ctx.fillRect(LOGICAL_WIDTH - 2, 0, 2, LOGICAL_HEIGHT);
  ctx.fillRect(0, 0, LOGICAL_WIDTH, 2);
  ctx.fillRect(0, LOGICAL_HEIGHT - 2, LOGICAL_WIDTH, 2);
}

// ============================================================================
// DETERMINISTIC DEVHOOK METHODS FOR window.__TOWNSAVER__
// ============================================================================

function getStateHook(): GameState {
  return engine.getState();
}

function stepFramesHook(count = 1, dtSeconds = 1 / 60): GameState {
  const steps = Math.max(0, Math.floor(count));
  for (let i = 0; i < steps; i++) {
    frameCount++;
    engine.step(dtSeconds);
  }
  syncFromEngine();
  syncBezelDOM();
  if (ctx) renderPlayfield();
  updateDevHook();
  return engine.getState();
}

function loadStageHook(stageNumber: number, showBriefing = false): GameState {
  const st = engine.loadStage(stageNumber, {
    status: showBriefing ? 'briefing' : 'playing',
  });
  isPaused = false;
  syncFromEngine();
  syncBezelDOM();
  if (ctx) renderPlayfield();
  updateDevHook();
  return st;
}

function fireWeaponHook(
  weapon?: WeaponType,
  columnIndex?: number,
  angle?: number
): GameState {
  if (engine.getState().status !== 'playing') {
    engine.startGame();
  }
  if (weapon !== undefined) {
    const st = engine.getState();
    if (weapon === 'double' && st.doubleAmmo <= 0) st.doubleAmmo = 5;
    if (weapon === 'heavy' && st.heavyAmmo <= 0) st.heavyAmmo = 2;
    selectWeapon(weapon);
  }
  engine.fireWeapon(weapon ?? activeWeapon, columnIndex, angle);
  syncFromEngine();
  syncBezelDOM();
  if (ctx) renderPlayfield();
  updateDevHook();
  return engine.getState();
}

function moveAdrianHook(dx: number, dy: number, frames = 1): GameState {
  if (engine.getState().status !== 'playing') {
    engine.startGame();
  }
  engine.setMoveInput(dx, dy);
  const steps = Math.max(1, Math.floor(frames));
  for (let i = 0; i < steps; i++) {
    frameCount++;
    engine.step(1 / 60);
  }
  engine.setMoveInput(0, 0);
  syncFromEngine();
  syncBezelDOM();
  if (ctx) renderPlayfield();
  updateDevHook();
  return engine.getState();
}

function setPositionHook(x: number, y: number): GameState {
  const st = engine.setPosition(x, y);
  syncFromEngine();
  syncBezelDOM();
  if (ctx) renderPlayfield();
  updateDevHook();
  return st;
}

function advanceStoryHook(): GameState {
  const st = engine.advanceStory();
  syncFromEngine();
  syncBezelDOM();
  if (ctx) renderPlayfield();
  updateDevHook();
  return st;
}

function openPrologueHook(): GameState {
  const st = engine.openPrologue();
  syncFromEngine();
  syncBezelDOM();
  if (ctx) renderPlayfield();
  updateDevHook();
  return st;
}

function openBriefingHook(): GameState {
  const st = engine.openBriefing();
  syncFromEngine();
  syncBezelDOM();
  if (ctx) renderPlayfield();
  updateDevHook();
  return st;
}

function unlockSanctumOnlyHook(): GameState {
  const st = engine.unlockSanctumOnly();
  syncFromEngine();
  syncBezelDOM();
  if (ctx) renderPlayfield();
  updateDevHook();
  return st;
}

function triggerIronDeflectionTestHook(weapon: WeaponType = 'single'): GameState {
  const st = engine.triggerIronDeflectionTest(weapon);
  syncFromEngine();
  syncBezelDOM();
  if (ctx) renderPlayfield();
  updateDevHook();
  return st;
}

function triggerArrowClipTestHook(
  mode: 'palisade_slowed' | 'lodged' = 'palisade_slowed'
): GameState {
  const st = engine.triggerArrowClipTest(mode);
  syncFromEngine();
  syncBezelDOM();
  if (ctx) renderPlayfield();
  updateDevHook();
  return st;
}

function clearCurrentColumnHook(): GameState {
  const st = engine.clearCurrentColumn();
  syncFromEngine();
  syncBezelDOM();
  if (ctx) renderPlayfield();
  updateDevHook();
  return st;
}

function clearCurrentStageHook(advanceImmediately = false): GameState {
  const st = engine.clearCurrentStage(advanceImmediately);
  syncFromEngine();
  syncBezelDOM();
  if (ctx) renderPlayfield();
  updateDevHook();
  return st;
}

function resetSaveHook(): GameState {
  const st = engine.resetSave();
  syncFromEngine();
  syncBezelDOM();
  if (ctx) renderPlayfield();
  updateDevHook();
  return st;
}

function updateDevHook(): void {
  const st = engine.getState();

  const nextState: TownsaverDevHook = {
    version: '2.0.0-arrow-master',
    milestone: 4,
    canvasReady: true,
    contextAcquired: true,
    width: LOGICAL_WIDTH,
    height: LOGICAL_HEIGHT,
    fps: currentFps,
    frameCount,
    activeWeapon,
    lastKeyPressed,
    soundMuted,
    selectedStage,
    isPaused,
    queenMood,
    hearts,
    maxHearts,
    adrianFrame,
    adrianCol,
    adrianX: st.adrianX,
    adrianY: st.adrianY,
    adrianFacingDir: st.adrianFacingDir,
    sanctumUnlocked: st.sanctum.unlocked,
    remainingRaiders: st.remainingRaiders,
    terrainPalette,
    spritesRendered: [...SPRITE_CATALOG],
    activeArrowsCount: st.arrows.length,
    lastSoundPlayed: sound.lastSoundPlayed,
    soundPlayCount: sound.soundPlayCount,
    soundHistory: [...sound.soundHistory],
    audioContextState: sound.getAudioContextState(),
    setQueenMood,
    setHearts,
    triggerSound,
    fireShowcaseArrow,
    engine,
    status: st.status,
    score: st.score,
    highScore: st.highScore,
    unlockedStage: st.unlockedStage,
    doubleAmmo: st.doubleAmmo,
    heavyAmmo: st.heavyAmmo,
    lastFailReason: st.lastFailReason,
    statusBanner: st.statusBanner,
    getState: getStateHook,
    stepFrames: stepFramesHook,
    loadStage: loadStageHook,
    fireWeapon: fireWeaponHook,
    moveAdrian: moveAdrianHook,
    setPosition: setPositionHook,
    advanceStory: advanceStoryHook,
    openPrologue: openPrologueHook,
    openBriefing: openBriefingHook,
    unlockSanctumOnly: unlockSanctumOnlyHook,
    triggerIronDeflectionTest: triggerIronDeflectionTestHook,
    triggerArrowClipTest: triggerArrowClipTestHook,
    clearCurrentColumn: clearCurrentColumnHook,
    clearCurrentStage: clearCurrentStageHook,
    resetSave: resetSaveHook,
  };
  if (window.__TOWNSAVER__) {
    Object.assign(window.__TOWNSAVER__, nextState);
  } else {
    window.__TOWNSAVER__ = nextState;
  }
}

function tick(timestamp: number): void {
  frameCount++;
  framesThisSecond++;

  if (timestamp - lastFpsUpdate >= 1000) {
    currentFps = framesThisSecond;
    framesThisSecond = 0;
    lastFpsUpdate = timestamp;
  }

  if (!isPaused) {
    updateMovementVectorFromKeys();
    engine.step(1 / 60);
    syncFromEngine();
  }

  renderPlayfield();
  if (frameCount % 6 === 0) {
    syncBezelDOM();
  }

  if (window.__TOWNSAVER__) {
    const st = engine.getState();
    window.__TOWNSAVER__.frameCount = frameCount;
    window.__TOWNSAVER__.fps = currentFps;
    window.__TOWNSAVER__.adrianFrame = adrianFrame;
    window.__TOWNSAVER__.adrianCol = adrianCol;
    window.__TOWNSAVER__.adrianX = st.adrianX;
    window.__TOWNSAVER__.adrianY = st.adrianY;
    window.__TOWNSAVER__.adrianFacingDir = st.adrianFacingDir;
    window.__TOWNSAVER__.sanctumUnlocked = st.sanctum.unlocked;
    window.__TOWNSAVER__.remainingRaiders = st.remainingRaiders;
    window.__TOWNSAVER__.activeWeapon = activeWeapon;
    window.__TOWNSAVER__.selectedStage = selectedStage;
    window.__TOWNSAVER__.terrainPalette = terrainPalette;
    window.__TOWNSAVER__.hearts = hearts;
    window.__TOWNSAVER__.queenMood = queenMood;
    window.__TOWNSAVER__.status = st.status;
    window.__TOWNSAVER__.score = st.score;
    window.__TOWNSAVER__.highScore = st.highScore;
    window.__TOWNSAVER__.unlockedStage = st.unlockedStage;
    window.__TOWNSAVER__.doubleAmmo = st.doubleAmmo;
    window.__TOWNSAVER__.heavyAmmo = st.heavyAmmo;
    window.__TOWNSAVER__.lastFailReason = st.lastFailReason;
    window.__TOWNSAVER__.statusBanner = st.statusBanner;
    window.__TOWNSAVER__.activeArrowsCount = st.arrows.length;
    window.__TOWNSAVER__.lastSoundPlayed = sound.lastSoundPlayed;
    window.__TOWNSAVER__.soundPlayCount = sound.soundPlayCount;
    window.__TOWNSAVER__.soundHistory = [...sound.soundHistory];
    window.__TOWNSAVER__.audioContextState = sound.getAudioContextState();
  }

  requestAnimationFrame(tick);
}

function bootstrap(): void {
  if (!initCanvas()) {
    return;
  }
  initQueenPortrait();
  setupInputListeners();
  setupBezelBindings();
  syncFromEngine();
  syncBezelDOM();
  renderPlayfield();
  updateDevHook();
  requestAnimationFrame(tick);
  console.log('[Townsaver] v2.0 Arrow Master Story & 2D Castle Assault initialized on 240x320 canvas.');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}

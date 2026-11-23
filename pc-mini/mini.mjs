import { startFlick, startQuietTravel, startWander, stepWander, wanderDelay } from './wander.mjs';
import { createMiniMotion } from './mini-motion.mjs';

const room = window;
const host = document.getElementById('pc-tools');
const stage = document.getElementById('stage');
const artwork = (name) => new URL('./art/' + name, import.meta.url).href;
const initialPosition = { x: .72, y: .68 };
const viewport = window.visualViewport;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const unit = (value, fallback) => Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : fallback;
const defaultData = () => ({ version: 1, enabled: true, ...initialPosition, inventory: [], best: {}, round: null, result: null });
export const gameData = () => {
  const stored = room.MaroPC.miniData();
  return stored?.version === 1 ? stored : defaultData();
};
export function saveGame(next, meal) {
  room.MaroPC.saveMini(next, meal);
}

export const snackKeys = ['cookie', 'marshmallow', 'cupcake', 'donut', 'tart', 'millefeuille', 'ribbon', 'pudding', 'men', 'parfait'];

function rewardBox() {
  const items = new Map();
  for (const prize of gameData().inventory) {
    const row = items.get(prize.snack);
    if (row) row.count++;
    else items.set(prize.snack, { ...prize, count: 1 });
  }
  return JSON.stringify({ items: [...items.values()] });
}

function eatReward(input) {
  const unavailable = '{"status":"unavailable"}';
  const data = gameData();
  let request;
  try { request = JSON.parse(input); } catch { return unavailable; }
  const index = data.inventory.findIndex((row) => row.id === request?.rewardId && row.snack === request.snack);
  if (index < 0 || request.id !== 'crystal-meal:' + request.rewardId || !snackKeys.includes(request.snack)) return unavailable;
  const now = Date.now();
  if (!Number.isFinite(request.at) || Math.abs(request.at - now) > 5000) return unavailable;
  // Use the same room implementation to decide food eligibility and update
  // fullness. Work on an isolated state until the prize and meal can commit together.
  // The original game allows a validated prize even when ordinary food is refused.
  const staged = room.MaroPCRoom.planCrystalMeal(request, now);
  if (!staged) return unavailable;
  data.inventory.splice(index, 1);
  saveGame(data, staged);
  return JSON.stringify({ status: 'accepted', snapshot: JSON.parse(staged) });
}

function renderSleep() {
  if (mini.hidden || document.hidden) return;
  const asleep = room.MaroPCRoom.sleeping();
  if (asleep === (mini.dataset.sleeping === 'true')) return;
  mini.dataset.sleeping = String(asleep);
  picture.src = artwork(asleep ? 'maro_sleep_normal_light.webp' : 'maro_idle_01.webp');
}

function bindButton(parent, label, action) {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = label;
  button.addEventListener('click', action);
  parent.append(button);
  return button;
}

const mini = document.createElement('div');
mini.id = 'pc-mini';
const petButton = document.createElement('button');
petButton.type = 'button';
petButton.className = 'pc-mini-pet';
petButton.setAttribute('aria-label', 'みにまろちゃん。クリックで操作、ドラッグで移動');
petButton.setAttribute('aria-controls', 'pc-mini-menu');
petButton.setAttribute('aria-expanded', 'false');
const picture = new Image();
picture.width = 92;
picture.height = 100;
picture.alt = '';
picture.draggable = false;
picture.src = artwork('maro_idle_01.webp');
petButton.append(picture);
mini.append(petButton);
const motion = createMiniMotion(petButton, picture, artwork, room.MaroPCRoom);
const menu = document.createElement('div');
menu.id = 'pc-mini-menu';
menu.hidden = true;
mini.append(menu);

function showMenu(open) {
  if (open) {
    stopWandering();
    sleepButton.textContent = room.MaroPCRoom.miniSleepLabel();
  }
  menu.hidden = !open;
  if (open) placeMenu();
  petButton.setAttribute('aria-expanded', String(open));
}
async function openGame() {
  stopWandering();
  showMenu(false);
  try {
    const { open } = await import('./game.mjs');
    open();
  } catch (error) {
    console.error('Mini Maro game could not open', error);
    document.getElementById('pc-save-status').textContent = 'ゲームを開けませんでした。画面を再読み込みしてください。';
  }
}
let bounds;
let position;
let travel;
let nextWanderAt;
let nextRestAt;
let movementFrame;
let motionInfo;

function squeeze(point, area = bounds) {
  return {
    x: Math.max(area.left, Math.min(area.right, point.x)),
    y: Math.max(area.top, Math.min(area.bottom, point.y)),
  };
}
function fractions(point, area = bounds) {
  return {
    x: (point.x - area.left) / Math.max(1, area.right - area.left),
    y: (point.y - area.top) / Math.max(1, area.bottom - area.top),
  };
}
function project(point, area = bounds) {
  return { x: area.left + point.x * (area.right - area.left), y: area.top + point.y * (area.bottom - area.top) };
}
function savedPosition(state) {
  const value = { x: unit(state.x, initialPosition.x), y: unit(state.y, initialPosition.y) };
  if (state.positionSpace === 'viewport') return project(value);
  // Earlier PC saves were relative to the room. Start at the same visible spot.
  const rect = stage.getBoundingClientRect();
  const left = rect.left + stage.clientLeft;
  const top = rect.top + stage.clientTop;
  return project(value, {
    left, top,
    right: left + Math.max(0, stage.clientWidth - petButton.offsetWidth),
    bottom: top + Math.max(0, stage.clientHeight - petButton.offsetHeight),
  });
}
function applyPosition(point) {
  position = squeeze(point);
  mini.style.transform = `translate3d(${position.x}px, ${position.y}px, 0)`;
  if (!menu.hidden) placeMenu();
}
function placeMenu() {
  const relative = fractions(position);
  mini.classList.toggle('pc-mini-near-left', relative.x < .5);
  mini.classList.toggle('pc-mini-near-top', relative.y < .5);
}
function resizeMini() {
  if (mini.hidden) return;
  const previous = bounds && position && fractions(position);
  const left = (viewport?.offsetLeft ?? 0) + 4;
  const top = (viewport?.offsetTop ?? 0) + 4;
  bounds = {
    left, top,
    right: left + Math.max(0, (viewport?.width ?? document.documentElement.clientWidth) - petButton.offsetWidth - 8),
    bottom: top + Math.max(0, (viewport?.height ?? document.documentElement.clientHeight) - petButton.offsetHeight - 8),
  };
  applyPosition(previous ? project(previous) : savedPosition(gameData()));
  if (travel) Object.assign(travel, position);
}
function positionFields() {
  return { ...fractions(position), positionSpace: 'viewport' };
}
function savePosition() {
  if (!position || room.MaroPCError) return;
  const state = gameData();
  const next = positionFields();
  if (state.positionSpace === next.positionSpace && state.x === next.x && state.y === next.y) return;
  try { saveGame({ ...state, ...next }); }
  catch (error) { console.error('Mini Maro position could not be saved', error); }
}
function stopWandering(persist = true) {
  nextWanderAt = null;
  if (!travel) return;
  cancelAnimationFrame(movementFrame);
  travel = null;
  delete mini.dataset.wandering;
  delete mini.dataset.flicking;
  motion.stop();
  if (persist) savePosition();
}
function canMove() {
  return !mini.hidden && !document.hidden && bounds && !pointer && menu.hidden &&
    !reducedMotion.matches && !room.MaroPCError &&
    !document.documentElement.classList.contains('maro-room-opening') &&
    !document.querySelector('dialog[open], [aria-modal="true"]:not([hidden])');
}
function canWander() {
  return canMove() && !petButton.matches(':focus-visible') && room.MaroPCRoom.canMiniWander?.();
}
function canQuietTravel() { return canMove() && room.MaroPCRoom.canMiniTravel?.(); }
function drawTravelPose(now) {
  const left = Math.abs(travel.vx) > .01 ? travel.vx < 0 : !!travel.left;
  if (left !== travel.left || now === travel.started) {
    travel.left = left;
    if (travel.quietMode === 3) motion.orientRoll(left);
    else if (!travel.quietMode) motion.run(left);
  }
}
function interruptForFall() {
  if (!motion.takeFall() || !room.MaroPCRoom.startMiniRunFall?.()) return false;
  if (pointer) {
    const id = pointer.id;
    pointer = null;
    suppressClick = true;
    delete mini.dataset.dragging;
    if (petButton.hasPointerCapture(id)) petButton.releasePointerCapture(id);
  }
  if (travel) stopWandering();
  else { motion.stop(); savePosition(); }
  return true;
}
function moveAutomatically(now) {
  const allowed = travel.flick ? canMove() && !motionInfo?.rescue && !motionInfo?.steal :
    travel.quietMode ? motionInfo?.mode === travel.quietMode && canQuietTravel() : canWander();
  if (!allowed) {
    stopWandering();
    return;
  }
  const finished = stepWander(travel, now, bounds);
  applyPosition(travel);
  drawTravelPose(now);
  if (interruptForFall()) return;
  if (finished) { stopWandering(); return; }
  movementFrame = requestAnimationFrame(moveAutomatically);
}
function updateMini() {
  renderSleep();
  if (room.MaroPCRoom.miniActivity) {
    const info = room.MaroPCRoom.miniActivity();
    if (info.mode !== motionInfo?.mode) nextRestAt = null;
    motionInfo = info;
    motion.update(motionInfo, !mini.hidden && !document.hidden && !document.querySelector('dialog[open]'),
      canWander() && !travel);
  }
  if (pointer?.dragged && interruptForFall()) return;
  if (travel) {
    if (mini.hidden || document.hidden || reducedMotion.matches) stopWandering();
    return;
  }
  const now = performance.now();
  if (motionInfo?.mode && canQuietTravel()) {
    const mode = motionInfo.mode;
    if (mode === 3) {
      const duration = motion.rollDuration();
      if (duration) travel = startQuietTravel(now, position, bounds, mode, duration);
    } else {
      nextRestAt ??= now + 30000 + 30000 * Math.random();
      if (now >= nextRestAt) {
        travel = startQuietTravel(now, position, bounds, mode);
        nextRestAt = null;
      }
    }
  } else if (canWander()) {
    nextWanderAt ??= now + wanderDelay();
    if (now < nextWanderAt || !motion.canRun()) return;
    travel = startWander(now, position, bounds);
    nextWanderAt = null;
  } else if (mini.hidden || document.hidden || reducedMotion.matches) {
    nextWanderAt = nextRestAt = null;
  }
  if (!travel) return;
  mini.dataset.wandering = 'true';
  drawTravelPose(now);
  if (!travel.quietMode) motion.armFall(false);
  movementFrame = requestAnimationFrame(moveAutomatically);
}
function syncMini() {
  const state = gameData();
  mini.hidden = !state.enabled;
  if (!mini.hidden) resizeMini();
  toggle.textContent = state.enabled ? 'みにまろちゃんをかくす' : 'みにまろちゃんを出す';
  toggle.setAttribute('aria-pressed', String(state.enabled));
  renderSleep();
}
function petMaro() {
  if (room.MaroPCRoom.tapMiniSteal?.()) { showMenu(false); return; }
  room.MaroPCRoom.pet();
  motion.pet();
  showMenu(false);
}
export function celebrateMini() { motion.reward(); }

let pointer = null;
let suppressClick = false;
function currentPointer(event) {
  return pointer?.id === event.pointerId;
}
petButton.addEventListener('pointerdown', (event) => {
  if (pointer || event.button !== 0) return;
  stopWandering();
  suppressClick = false;
  pointer = { id: event.pointerId, clientX: event.clientX, clientY: event.clientY, ...position, dragged: false, samples: [] };
  addPointerSample(event);
  motion.grab(event.clientX, event.clientY);
  petButton.setPointerCapture(event.pointerId);
});
function addPointerSample(event) {
  const sample = { x: event.clientX, y: event.clientY, time: event.timeStamp };
  const samples = pointer.samples;
  samples.push(sample);
  while (samples.length > 2 && samples[0].time < sample.time - 125) samples.shift();
}
function dragPointer(event) {
  addPointerSample(event);
  const dx = event.clientX - pointer.clientX;
  const dy = event.clientY - pointer.clientY;
  if (!pointer.dragged && Math.hypot(dx, dy) < 7) return;
  const first = !pointer.dragged;
  pointer.dragged = true;
  mini.dataset.dragging = 'true';
  showMenu(false);
  applyPosition({ x: pointer.x + dx, y: pointer.y + dy });
  motion.drag(event.clientX, event.clientY);
  if (first) motion.armFall(true);
}
petButton.addEventListener('pointermove', (event) => {
  if (!currentPointer(event)) return;
  dragPointer(event);
});
petButton.addEventListener('pointerup', (event) => {
  if (!currentPointer(event)) return;
  dragPointer(event);
  const finished = pointer;
  pointer = null;
  if (!finished.dragged) return;
  delete mini.dataset.dragging;
  suppressClick = true;
  savePosition();
  const now = performance.now();
  if (canMove() && !motionInfo?.steal && !motionInfo?.rescue) travel = startFlick(now, position, bounds, finished.samples);
  if (!travel) { motion.stop(); return; }
  mini.dataset.flicking = 'true';
  drawTravelPose(now);
  movementFrame = requestAnimationFrame(moveAutomatically);
});
function cancelPointer() {
  if (!pointer) return;
  pointer = null;
  delete mini.dataset.dragging;
  motion.stop();
  applyPosition(savedPosition(gameData()));
}
petButton.addEventListener('pointercancel', cancelPointer);
petButton.addEventListener('lostpointercapture', cancelPointer);
petButton.addEventListener('click', () => {
  if (suppressClick) { suppressClick = false; return; }
  if (!room.MaroPCRoom.tapMiniSteal?.()) showMenu(menu.hidden);
});
document.addEventListener('pointerdown', (event) => {
  if (!mini.contains(event.target)) showMenu(false);
});
mini.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') { showMenu(false); petButton.focus(); }
});

bindButton(menu, 'なでなで', petMaro);
bindButton(menu, 'おやつ', () => { showMenu(false); document.getElementById('cSnack')?.click(); });
bindButton(menu, 'ゲーム', openGame);
const sleepButton = bindButton(menu, 'おひるね', () => {
  showMenu(false);
  room.MaroPCRoom.miniSleepToggle();
  updateMini();
});
bindButton(menu, 'せってい', () => { showMenu(false); document.getElementById('tSound')?.click(); });
bindButton(menu, 'しまう', () => toggle.click());
bindButton(menu, 'とじる', () => { showMenu(false); petButton.focus(); });
document.body.append(mini);
const gameButton = bindButton(host, 'トランポリンSTG', openGame);
gameButton.id = 'pc-mini-game';
const toggle = bindButton(host, 'みにまろちゃん', () => {
  const state = gameData();
  const location = travel ? positionFields() : null;
  stopWandering(false);
  saveGame({ ...state, ...location, enabled: !state.enabled });
  showMenu(false);
  syncMini();
});
toggle.id = 'pc-mini-toggle';

room.MaroPCPrizes = Object.freeze({
  crystalReward: () => JSON.stringify(gameData().inventory[0] || null),
  crystalSnackBox: rewardBox,
  crystalMealRequest: eatReward,
});
room.MaroPCRoom.refreshSnackBox();
syncMini();
new ResizeObserver(resizeMini).observe(petButton);
window.addEventListener('resize', resizeMini);
viewport?.addEventListener('resize', resizeMini);
viewport?.addEventListener('scroll', resizeMini);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) cancelPointer();
  updateMini();
});
reducedMotion.addEventListener('change', updateMini);
setInterval(updateMini, 400);
updateMini();

// Timing and edge reflection follow Android's PetWander and PetEdgeTravel.
const drag = .12;
const clamp = (value, min, max) => Math.max(min, Math.min(value, max));

function reflect(value, velocity, min, max) {
  const width = max - min;
  if (width <= 0) return [min, 0];
  const period = width * 2;
  const phase = ((value - min) % period + period) % period;
  if (phase === 0) return [min, Math.abs(velocity)];
  if (phase === width) return [max, -Math.abs(velocity)];
  return phase < width ? [min + phase, velocity] : [min + period - phase, -velocity];
}

export function wanderDelay(random = Math.random) {
  return 15000 + Math.floor(random() * 15001);
}

export function startQuietTravel(now, point, bounds, mode, rollDuration = 0) {
  const angle = Math.random() * 2 * Math.PI;
  const speed = Math.min(176, (180 + Math.floor(Math.random() * 101)) * .8) * (mode === 3 ? .61 : 1);
  const started = mode === 3 ? now + 320 : now;
  return {
    ...point, vx: bounds.right > bounds.left ? Math.cos(angle) * speed : 0,
    vy: bounds.bottom > bounds.top ? Math.sin(angle) * speed : 0, started, last: started,
    until: mode === 3 ? now + rollDuration : now + 10000 + Math.floor(Math.random() * 4001),
    movementEnd: mode === 3 ? now + rollDuration - 420 : Infinity,
    drag: .24, quietMode: mode,
  };
}

export function startWander(now, point, bounds, random = Math.random) {
  const rangeX = bounds.right - bounds.left;
  const rangeY = bounds.bottom - bounds.top;
  if (!rangeX && !rangeY) return null;
  let angle = random() * 2 * Math.PI;
  const speed = Math.min(176, (180 + Math.floor(random() * 101)) * .8);
  const direction = Math.floor(random() * 5);
  if ((!rangeX || direction === 1) && rangeY) angle = random() < .5 ? Math.PI / 2 : -Math.PI / 2;
  else if (!rangeY || direction === 0) angle = random() < .5 ? 0 : Math.PI;
  return {
    ...point,
    vx: rangeX ? Math.cos(angle) * speed : 0,
    vy: rangeY ? Math.sin(angle) * speed : 0,
    started: now,
    last: now,
    until: now + 12000 + Math.floor(random() * 8001),
  };
}

export function startFlick(now, point, bounds, samples) {
  const last = samples.at(-1);
  const first = samples.find((sample) => sample.time >= last.time - 110);
  const seconds = (last.time - first.time) / 1000;
  if (seconds <= 0) return null;
  let x = (last.x - first.x) / seconds;
  let y = (last.y - first.y) / seconds;
  const speed = Math.hypot(x, y);
  if (speed < 80) return null;
  if (bounds.left === bounds.right || Math.abs(x) <= Math.abs(y) * .2) x = 0;
  if (bounds.top === bounds.bottom || Math.abs(y) <= Math.abs(x) * .2) y = 0;
  const directionLength = Math.hypot(x, y);
  if (!directionLength) return null;
  const launch = Math.min(400, Math.max(140, speed) * .8);
  return {
    ...point, vx: x * launch / directionLength, vy: y * launch / directionLength, started: now, last: now,
    until: now + 8000, drag: .24, pace: .5, flick: true,
  };
}

export function stepWander(travel, now, bounds) {
  if (now < travel.started) return false;
  const time = Math.min(now, travel.until, travel.movementEnd ?? Infinity);
  const seconds = Math.max(0, time - travel.last) / 1000 * (travel.pace ?? 1);
  const friction = travel.drag ?? drag;
  const decay = Math.exp(-friction * seconds);
  const distance = -Math.expm1(-friction * seconds) / friction;
  const x = clamp(travel.x, bounds.left, bounds.right) + travel.vx * distance;
  const y = clamp(travel.y, bounds.top, bounds.bottom) + travel.vy * distance;
  [travel.x, travel.vx] = reflect(x, travel.vx * decay, bounds.left, bounds.right);
  [travel.y, travel.vy] = reflect(y, travel.vy * decay, bounds.top, bounds.bottom);
  travel.last = time;
  return now >= travel.until;
}

const registration = [62 / 1024, 94 / 1120, 900 / 1024, 984 / 1120];
const heartName = 'maro-heart-hug-v3.webp';

export function createMiniMotion(pet, fallback, art, room) {
  const canvas = document.createElement('canvas');
  canvas.width = 184;
  canvas.height = 200;
  canvas.hidden = true;
  canvas.setAttribute('aria-hidden', 'true');
  pet.append(canvas);
  const ctx = canvas.getContext('2d');
  const images = new Map();
  let engine;
  let activity;
  let eligible = false;
  let visible = false;
  let timer;
  let previousFrame;
  let heartLayers;
  let preparingHearts = false;
  let bubblesAt = -Infinity;
  let nextBubble = Infinity;
  let pendingReward = false;
  let stealPhase = 0;
  let stealAt = 0;

  function image(name, sheet = false) {
    if (!images.has(name)) {
      const bitmap = new Image();
      bitmap.src = sheet ? new URL('../media/' + name, import.meta.url).href : art(name);
      images.set(name, bitmap);
    }
    return images.get(name);
  }
  function loadHearts(bitmap) {
    if (preparingHearts) return;
    preparingHearts = true;
    const prepare = () => {
      try { heartLayers = room.prepareMiniHeart(bitmap); }
      catch (error) { console.error('Could not separate Mini Maro’s hearts', error); }
    };
    if (window.requestIdleCallback) window.requestIdleCallback(prepare, { timeout: 1200 });
    else setTimeout(prepare, 0);
  }
  function drawHearts(cel, age) {
    ctx.drawImage(heartLayers.bodies[cel], 0, 0, 1, 1);
    for (const [index, heart] of heartLayers.hearts.entries()) {
      const phase = age * Math.PI * 2 / (index ? 7200 : 3600);
      const side = index ? 1 : -1;
      ctx.drawImage(heart, side * 1.2 * (1 - Math.cos(phase)) / 512, side * 5 * Math.sin(phase) / 560, 1, 1);
    }
  }
  function paint(now) {
    const frame = engine.miniFrame(now);
    if (!frame) return;
    const [name, index] = frame.split('#');
    const sheet = index !== undefined;
    const bitmap = image(name, sheet);
    const rescue = activity.rescue?.style.display !== 'none' ? activity.rescue : null;
    if (!rescue && (!bitmap.complete || !bitmap.naturalWidth)) return;
    const mirror = engine.miniMirror(now);
    const alpha = engine.miniFrameAlpha(now);
    const isSleeping = name.startsWith('maro_sleep_');
    if (isSleeping && now >= nextBubble) {
      bubblesAt = now;
      nextBubble = now + 7000 + 5000 * Math.random();
    }
    const bubbleAge = now - bubblesAt;
    const holdHeart = name === heartName && Number(index) >= 5;
    if (holdHeart) loadHearts(bitmap);
    const jump = engine.miniJumpY(now);
    const key = [frame, mirror, alpha, jump].join('/');
    if (key === previousFrame && !holdHeart && !isSleeping && !rescue) return;
    previousFrame = rescue ? null : key;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.scale(canvas.width, canvas.height);
    if (rescue) {
      const width = Math.min(1, rescue.width / rescue.height * (canvas.height / canvas.width));
      ctx.drawImage(rescue, (1 - width) / 2, 0, width, 1);
    } else {
      ctx.translate(0, jump);
      if (mirror) { ctx.translate(1, 0); ctx.scale(-1, 1); }
      if (isSleeping) {
        const breath = 1 + .0035 * Math.sin(now / 820);
        ctx.translate(.5, .92); ctx.scale(breath, breath); ctx.translate(-.5, -.92);
      }
      ctx.globalAlpha = alpha / 255;
      if (sheet) {
        const [x, y, w, h] = registration;
        ctx.translate(x, y); ctx.scale(w, h);
        if (holdHeart && heartLayers) drawHearts(Number(index), engine.miniHeartAge(now));
        else {
          const grid = engine.miniSheetGrid(frame);
          const cols = Math.floor(grid / 100);
          const width = Math.floor(bitmap.naturalWidth / cols);
          const height = Math.floor(bitmap.naturalHeight / (grid % 100));
          ctx.drawImage(bitmap, (index % cols) * width, Math.floor(index / cols) * height, width, height, 0, 0, 1, 1);
        }
      } else ctx.drawImage(bitmap, 0, 0, 1, 1);
    }
    ctx.restore();
    if (isSleeping && bubbleAge >= 0 && bubbleAge < 2800) {
      const bubble = image('maro_bubble.webp');
      if (bubble.complete && bubble.naturalWidth) {
        ctx.save();
        ctx.scale(canvas.width, canvas.height);
        for (let i = 0; i < 3; i++) {
          if (bubbleAge < i * 430) continue;
          const age = Math.min(1, (bubbleAge - i * 430) / 2100);
          const size = i === 0 ? .115 : .075 + i * .008;
          const x = .46 + i * .055 + .03 * Math.sin(age * 4.7 + i * 1.8);
          const y = .39 - age * (.20 + i * .018);
          ctx.globalAlpha = 190 / 255 * Math.min(1, age * 6) * Math.min(1, (1 - age) * 3);
          ctx.drawImage(bubble, x, y, size, size * canvas.width / canvas.height);
        }
        ctx.restore();
      }
    }
    canvas.dataset.frame = rescue ? 'balance-rescue' : frame;
    canvas.hidden = false;
    fallback.hidden = true;
  }
  function draw() {
    clearTimeout(timer);
    if (!engine || !activity || !visible) return;
    const now = performance.now();
    const { mode, hungry, memory, rescue } = activity;
    engine.tickMiniMotion(now, eligible, !matchMedia('(prefers-reduced-motion: reduce)').matches, hungry, memory);
    paint(now);
    timer = setTimeout(draw, rescue ? 33 : Math.max(16, engine.miniFrameDelay(now)));
  }
  function call(method, ...args) {
    engine?.[method](performance.now(), ...args);
    draw();
  }
  function update(info, shown, automatic) {
    if (info.mode !== activity?.mode) nextBubble = info.mode === 3 ? performance.now() + 4500 : Infinity;
    activity = info;
    visible = shown;
    eligible = automatic;
    if (engine) {
      const now = performance.now();
      engine.setMiniLife(now, info.mode, info.blanket, info.deep, info.sleepAt, info.jumpChance);
      if (stealPhase !== info.steal) { stealPhase = info.steal; stealAt = now; }
      engine.setMiniSteal(now, info.steal, Math.round(now - stealAt), info.caught, info.sparkle);
      if (pendingReward && visible) { pendingReward = false; engine.rewardMini(now); }
    }
    draw();
  }
  import('./motion-engine.mjs').then((module) => {
    engine = module;
    engine.resetMiniMotion(performance.now(), crypto.getRandomValues(new Int32Array(1))[0]);
    const warmup = () => {
      for (const side of ['left', 'right']) {
        for (let i = 1; i <= 8; i++) image(`maro_run_${side}_0${i}.webp`);
      }
      for (const pose of ['front', 'front_left', 'left', 'back_left', 'back']) image(`maro_roll_${pose}.webp`);
    };
    if (window.requestIdleCallback) window.requestIdleCallback(warmup, { timeout: 1600 });
    else setTimeout(warmup, 250);
    if (activity) update(activity, visible, eligible);
  }).catch((error) => console.error('Could not load Mini Maro motion', error));

  return {
    update,
    canRun: () => !engine || engine.canMiniRun(performance.now()),
    rollDuration: () => engine?.automaticMiniRollMs() ?? 0,
    orientRoll: (left) => call('orientMiniRoll', left),
    armFall: (finger) => engine?.armMiniFall(performance.now(), finger),
    takeFall: () => engine?.takeMiniFall(performance.now()) ?? false,
    grab: (x, y) => call('beginMiniDrag', x, y),
    drag: (x, y) => call('dragMini', x, y),
    run: (left) => call('runMini', left),
    stop: () => call('settleMini'),
    pet() {
      if (activity?.mode === 3) { if (performance.now() - bubblesAt >= 6000) bubblesAt = performance.now(); draw(); }
      else call('petMini');
    },
    reward() { pendingReward = true; },
  };
}

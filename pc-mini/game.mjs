import { celebrateMini, gameData, saveGame, snackKeys } from './mini.mjs';
import { decodeArtwork } from './android-canvas.mjs';
import { createGameMusic } from './stg-music.mjs';

const W = 390;
const H = 688;
const difficulties = ['かんたん', 'ちょいかんたん', 'ふつう', 'むずかしい', 'めちゃむずかしい'];
const speeds = ['ゆっくり', 'ふつう', 'はやい'];
const snackNames = ['クッキー', 'マシュマロ', 'カップケーキ', 'ドーナツ', 'タルト', 'ミルフィーユ', 'リボン', 'プリン', 'めん', 'パフェ'];
const stockKeys = [3, 5, 6, 7, 8, 9];
const art = (name) => new URL('./art/' + name, import.meta.url).href;

const dialog = document.createElement('dialog');
dialog.id = 'pc-crystal-game';
dialog.setAttribute('aria-labelledby', 'pc-crystal-title');
dialog.innerHTML = `
  <header><h2 id="pc-crystal-title">トランポリンSTG</h2><button type="button" data-close>お部屋へ</button></header>
  <p class="pc-crystal-notice" aria-live="polite" hidden></p>
  <form class="pc-crystal-options">
    <img src="${art('maro_idle_01.webp')}" width="96" height="105" alt="みにまろちゃん">
    <p>まろちゃんを飛ばして、結晶の中のおかしをゲットしよう！</p>
    <label>あそびかた <select name="mode"><option value="single">ひとつのおかし</option><option value="buffet">おかし食べ放題</option></select></label>
    <label>むずかしさ <select name="difficulty">${difficulties.map((name, i) => `<option value="${i}">${name}</option>`).join('')}</select></label>
    <label>スピード <select name="speed">${speeds.map((name, i) => `<option value="${i}">${name}</option>`).join('')}</select></label>
    <label class="pc-crystal-check"><input type="checkbox" name="auto"> オートであそぶ</label>
    <button type="submit" class="pc-crystal-primary">ゲームをはじめる</button>
    <button type="button" data-continue hidden>つづきから</button>
  </form>
  <section class="pc-crystal-board" hidden>
    <div class="pc-crystal-hud"><span data-time>3:00</span><span data-combo>0 コンボ</span><span data-crystals>0 こ</span></div>
    <canvas width="780" height="1376" aria-label="トランポリンの盤面。まろちゃんを下に引いて発射。タップまたはドラッグでトランポリンを張る。"></canvas>
    <div class="pc-crystal-controls">
      <button type="button" data-launch>発射</button><button type="button" data-auto>オート OFF</button>
      <button type="button" data-pause>一時停止</button><button type="button" data-magic>まほう</button>
      <button type="button" data-abandon>あきらめる</button>
    </div>
    <div class="pc-crystal-stock" hidden aria-label="まほうのストック"></div>
    <p class="pc-crystal-guide">引いて発射、タップで水平、ドラッグで斜めのトランポリン。</p>
  </section>
  <section class="pc-crystal-result" hidden>
    <img src="${art('maro_banzai_09.webp')}" width="112" height="122" alt="ばんざいするみにまろちゃん">
    <h3 data-result></h3><p data-result-detail></p>
    <button type="button" class="pc-crystal-primary" data-again>もう一回あそぶ</button>
    <button type="button" data-box>おかしBOXへ</button>
  </section>`;
document.body.append(dialog);

const find = (selector) => dialog.querySelector(selector);
const options = find('form');
const board = find('.pc-crystal-board');
const resultPanel = find('.pc-crystal-result');
const notice = find('.pc-crystal-notice');
const stockPanel = find('.pc-crystal-stock');
const canvas = find('canvas');
const ctx = canvas.getContext('2d');
const timeLabel = find('[data-time]');
const comboLabel = find('[data-combo]');
const crystalsLabel = find('[data-crystals]');
const launchButton = find('[data-launch]');
const autoButton = find('[data-auto]');
const pauseButton = find('[data-pause]');
const magicButton = find('[data-magic]');
let engine;
let current;
let view;
let frame = 0;
let lastTime = 0;
let lastSaved = 0;
let activePointer = null;
let waitingForEngine = false;
let openBoxOnClose = false;
let resumeAfterStock = false;
const audio = createGameMusic();
const musicLevel = () => window.MaroPCRoom.gameMusicLevel?.() ?? 0;

function message(text = '') { notice.hidden = !text; notice.textContent = text; }
function changePanel(panel) {
  for (const element of [options, board, resultPanel]) element.hidden = element !== panel;
}
function formatTime(ms) {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  return Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2, '0');
}
function render(finaleAge = -1) {
  ctx.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0);
  engine.draw(ctx, finaleAge);
  if (view.paused && stockPanel.hidden) {
    ctx.fillStyle = '#6a3c5d56';
    ctx.fillRect(0, 0, W, H);
    ctx.font = '700 25px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fffaf6';
    ctx.fillText('一時停止', W / 2, H / 2);
  }
  timeLabel.textContent = formatTime(view.remaining);
  comboLabel.textContent = view.chain + ' コンボ';
  crystalsLabel.textContent = view.buffet ? view.broken + ' こ' : `HP ${view.hp} / ${view.maximum}`;
  launchButton.disabled = !view.playing || !view.ready || view.paused || view.cutin >= 0;
  magicButton.disabled = !view.playing || view.cutin >= 0;
  pauseButton.disabled = !view.playing;
  pauseButton.textContent = view.paused ? '再開' : '一時停止';
}

function roundSnapshot(state) {
  const keys = ['snack', 'hp', 'maximum', 'remaining', 'item', 'itemX', 'itemY', 'itemUntil', 'nextItem'];
  return { ...current, ...Object.fromEntries(keys.map((key) => [key, state[key]])), engineState: engine.snapshot() };
}
function commitRound(state) {
  const data = gameData();
  if (!current || data.round?.id !== current.id) throw Error('Current round no longer owns game storage');
  const earned = [];
  for (const [serial, snack] of state.awards) {
    if (serial > current.claimed) {
      earned.push({ id: current.id + '-' + serial, snack: snackKeys[snack], acquiredAt: Date.now() });
      current.claimed = serial;
    }
  }
  if (!state.playing && !state.buffet && state.won) {
    earned.push({ id: current.id, snack: snackKeys[state.snack], acquiredAt: Date.now() });
  }
  data.inventory.push(...earned);
  if (state.playing) {
    data.round = roundSnapshot(state);
  } else {
    data.round = null;
    const detail = { won: state.won, buffet: state.buffet, snack: state.snack, broken: state.broken,
      bestChain: state.bestChain, elapsed: state.elapsed };
    const bestKey = [current.buffet, current.difficulty, current.speed].join('-');
    const previous = data.best[bestKey];
    detail.best = (state.won || state.broken > 0) && (!previous ||
      (state.buffet ? state.broken > previous.broken : state.elapsed < previous.elapsed));
    if (detail.best) data.best[bestKey] = detail;
    data.result = detail;
  }
  saveGame(data);
  engine.acceptBreaks();
  for (const prize of earned) {
    try {
      window.MaroPCRoom.recordGameWin(prize);
    } catch (error) { console.warn('おかしの記録を思い出へ追加できませんでした', error); }
  }
  if (earned.length) {
    celebrateMini();
    audio.reward(Math.max(...earned.map((prize) => snackKeys.indexOf(prize.snack))), musicLevel());
    window.MaroPCRoom.refreshSnackBox();
  }
  return data.result;
}
function summarize(result) {
  changePanel(resultPanel);
  find('[data-result]').textContent = result.buffet ? `おかしを ${result.broken} こ ゲット！` :
    result.won ? snackNames[result.snack] + 'をゲット！' : 'また挑戦してみよう♪';
  find('[data-result-detail]').textContent =
    `${formatTime(result.elapsed)} · 最大 ${result.bestChain} コンボ${result.best ? ' · ベスト更新！' : ''}`;
  find('[data-again]').focus();
}
function fail(error) {
  audio.stop();
  audio.stopCues();
  console.error('Maro crystal game', error);
  engine?.setPaused(true);
  cancelAnimationFrame(frame);
  frame = 0;
  current = null;
  message('ゲームを保存できませんでした。お部屋へ戻ってから読み込み直してください。');
}
function tick(time) {
  frame = 0;
  try {
    if (!dialog.open || document.hidden || !current) return;
    const delta = lastTime ? Math.min(100, Math.round(time - lastTime)) : 0;
    lastTime = time;
    engine.step(delta);
    view = JSON.parse(engine.view());
    const level = musicLevel();
    audio.track(engine.musicTrack(), level);
    const sound = engine.takeSoundEvents();
    if (view.paused || level <= 0) audio.stopCues();
    else audio.effects(sound, level);
    if (!view.playing || view.awards.length || (!view.paused && time - lastSaved > 2800)) {
      const savedResult = commitRound(view);
      lastSaved = time;
      if (!view.playing) {
        current = null;
        if (engine.hasFinale()) showFinale(savedResult, time);
        else summarize(savedResult);
        return;
      }
    }
    render();
    if (!view.paused) frame = requestAnimationFrame(tick);
  } catch (error) { fail(error); }
}
function showFinale(result, start) {
  function animate(now) {
    if (!dialog.open) return;
    if (now - start >= 1100) {
      summarize(result);
      return;
    }
    render(Math.max(0, Math.round(now - start)));
    frame = requestAnimationFrame(animate);
  }
  animate(start);
}
function redraw() {
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(tick);
}
function gameControls() {
  autoButton.textContent = current.auto ? 'オート ON' : 'オート OFF';
  autoButton.setAttribute('aria-pressed', String(current.auto));
}
async function prepareEngine() {
  if (waitingForEngine) return false;
  waitingForEngine = true;
  try {
    engine ||= await import('./engine.mjs');
    engine.prepareArt();
    await decodeArtwork();
    return dialog.open;
  } finally { waitingForEngine = false; }
}
function showOptions() {
  message();
  stockPanel.hidden = true;
  changePanel(options);
  find('[data-continue]').hidden = !gameData().round;
}
find('[data-abandon]').addEventListener('click', () => {
  if (!current) return;
  engine.setPaused(true);
  const button = find('[data-abandon]');
  if (button.dataset.confirm !== 'true') {
    button.dataset.confirm = 'true';
    button.textContent = 'このゲームを終える';
    message('ここで終わっても、すでにゲットしたおかしはおかしBOXに残ります。');
    redraw();
    return;
  }
  try {
    const data = gameData();
    if (data.round?.id !== current.id) throw Error('Current round no longer owns game storage');
    data.round = null;
    saveGame(data);
    current = null;
    button.dataset.confirm = 'false';
    button.textContent = 'あきらめる';
    showOptions();
  } catch (error) { fail(error); }
});
options.addEventListener('submit', async (event) => {
  event.preventDefault();
  audio.unlock(musicLevel());
  try {
    const values = new FormData(options);
    if (gameData().round) {
      message('つづきがあります。先に「つづきから」を開いてください。');
      return;
    }
    if (!await prepareEngine()) return;
    current = { id: crypto.randomUUID(), seed: crypto.getRandomValues(new Int32Array(1))[0],
      difficulty: Number(values.get('difficulty')), speed: Number(values.get('speed')),
      buffet: values.get('mode') === 'buffet', auto: values.has('auto'), claimed: 0 };
    if (!engine.start(current.id, current.seed, current.difficulty, current.speed, current.buffet)) throw Error('Invalid game options');
    engine.setAuto(current.auto);
    const data = gameData();
    data.round = roundSnapshot(JSON.parse(engine.view()));
    saveGame(data);
    message();
    changePanel(board);
    gameControls();
    lastTime = 0;
    lastSaved = performance.now();
    redraw();
    launchButton.focus();
  } catch (error) { fail(error); }
});
find('[data-continue]').addEventListener('click', async () => {
  audio.unlock(musicLevel());
  try {
    if (!await prepareEngine()) return;
    const round = gameData().round;
    if (!round) return showOptions();
    const { id, seed, difficulty, speed, buffet, auto, claimed, snack, hp, maximum, remaining,
      item, itemX, itemY, itemUntil, nextItem, engineState } = round;
    if (!engine.restore(id, seed, snack, hp, maximum, remaining, item, itemX, itemY, itemUntil, nextItem, engineState)) {
      message('ゲームのつづきが読み込めませんでした。前の保存は残っています。');
      return;
    }
    current = { id, seed, difficulty, speed, buffet, auto, claimed };
    engine.setAuto(auto);
    message();
    changePanel(board);
    gameControls();
    lastTime = 0;
    lastSaved = performance.now();
    redraw();
    pauseButton.focus();
  } catch (error) { fail(error); }
});
function closeGame() {
  if (current) {
    try {
      engine.setPaused(true);
      commitRound(JSON.parse(engine.view()));
    } catch (error) { fail(error); return; }
  }
  dialog.close();
}
function togglePause() {
  if (!current) return;
  const paused = JSON.parse(engine.view()).paused;
  if (paused) audio.unlock(musicLevel());
  else { audio.stop(true); audio.stopCues(); }
  lastTime = 0;
  if (paused) {
    const abandon = find('[data-abandon]');
    abandon.dataset.confirm = 'false';
    abandon.textContent = 'あきらめる';
    message();
  }
  stockPanel.hidden = true;
  engine.setPaused(!paused);
  redraw();
}
pauseButton.addEventListener('click', togglePause);
autoButton.addEventListener('click', () => {
  if (!current) return;
  current.auto = !current.auto;
  engine.setAuto(current.auto);
  gameControls();
  redraw();
});
launchButton.addEventListener('click', () => { engine.launch(); redraw(); });
magicButton.addEventListener('click', () => {
  if (!view || !current) return;
  if (!stockPanel.hidden) {
    stockPanel.hidden = true;
    if (resumeAfterStock) engine.setPaused(false);
    lastTime = 0;
    redraw();
    return;
  }
  resumeAfterStock = !JSON.parse(engine.view()).paused;
  engine.setPaused(true);
  if (!stockPanel.childElementCount) {
    for (const kind of stockKeys) {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.stock = String(kind);
      const icon = document.createElement('img');
      icon.src = art(engine.itemIcon(kind).slice(4));
      icon.alt = '';
      const label = document.createElement('span');
      label.textContent = engine.itemLabel(kind);
      const status = document.createElement('small');
      button.append(icon, label, status);
      button.title = engine.itemHint(kind);
      button.addEventListener('click', () => {
        stockPanel.hidden = true;
        engine.setPaused(false);
        engine.cast(kind);
        lastTime = 0;
        redraw();
      });
      stockPanel.append(button);
    }
  }
  for (const [kind, amount, active] of view.stock) {
    const button = stockPanel.querySelector(`[data-stock="${kind}"]`);
    button.querySelector('small').textContent = engine.stockLabel(kind);
    button.dataset.status = active ? 'active' : amount ? 'ready' : 'empty';
    button.disabled = !amount || active;
  }
  stockPanel.hidden = false;
  redraw();
});
find('[data-close]').addEventListener('click', closeGame);
dialog.addEventListener('cancel', (event) => { event.preventDefault(); closeGame(); });
dialog.addEventListener('close', () => {
  audio.stop();
  audio.stopCues();
  cancelAnimationFrame(frame);
  frame = 0;
  activePointer = current = view = null;
  window.maroAndroidApp?.setActive(!document.hidden);
  if (openBoxOnClose) {
    openBoxOnClose = false;
    window.MaroPCRoom.openSnackBox();
  } else {
    document.getElementById('pc-mini-game')?.focus();
  }
});
find('[data-box]').addEventListener('click', () => { openBoxOnClose = true; closeGame(); });
find('[data-again]').addEventListener('click', showOptions);

function point(event) {
  const rect = canvas.getBoundingClientRect();
  return [(event.clientX - rect.left) * W / rect.width, (event.clientY - rect.top) * H / rect.height];
}
canvas.addEventListener('pointerdown', (event) => {
  if (!current || activePointer !== null || event.button !== 0) return;
  activePointer = event.pointerId;
  canvas.setPointerCapture(activePointer);
  engine.pointerDown(...point(event));
  redraw();
});
canvas.addEventListener('pointermove', (event) => {
  if (event.pointerId === activePointer) engine.pointerMove(...point(event));
});
canvas.addEventListener('pointerup', (event) => {
  if (event.pointerId !== activePointer) return;
  activePointer = null;
  engine.pointerUp(...point(event));
  redraw();
});
canvas.addEventListener('lostpointercapture', () => {
  activePointer = null;
  engine?.cancelGesture();
});
document.addEventListener('visibilitychange', () => {
  if (!dialog.open) return;
  if (document.hidden) { audio.stop(true); audio.stopCues(); }
  window.maroAndroidApp?.setActive(false);
  if (!current) return;
  if (!document.hidden) { lastTime = 0; redraw(); return; }
  try {
    engine.setPaused(true);
    commitRound(JSON.parse(engine.view()));
  } catch (error) { fail(error); }
});

export function open() {
  if (dialog.open) return;
  showOptions();
  dialog.showModal();
  window.maroAndroidApp?.setActive(false);
}

const files = ['normal', 'rare', 'boss', 'finish'];
const fadeIn = .18;
const fadeOut = 1.2;
const impact = 'stg-impact-sfx-v1/';
const standard = 'stg-rework-v2/';
const cueFiles = [standard + 'launch', standard + 'bounce', impact + 'hit', standard + 'pickup',
  standard + 'snap', standard + 'wave', standard + 'rescue',
  ...['nova', 'meteor', 'aurora', 'comet', 'lunar', 'rainbow'].map((name) => impact + name)];

export function createGameMusic() {
  const buffers = new Map();
  const cueBuffers = new Map();
  const playingCues = new Set();
  const fading = new Set();
  const recentlyPlayed = new Map();
  let context;
  let destination;
  let active;
  let saved;
  let wanted = -1;
  let ticket = 0;
  let level = 0;
  let cueEpoch = 0;
  let fanfare;

  function unlock(volume) {
    if (volume <= 0 || !window.AudioContext) return;
    if (!context) {
      context = new AudioContext();
      destination = context.createGain();
      const limiter = context.createDynamicsCompressor();
      limiter.threshold.value = -1;
      limiter.knee.value = 0;
      limiter.ratio.value = 20;
      limiter.attack.value = .001;
      limiter.release.value = .12;
      destination.connect(limiter).connect(context.destination);
    }
    if (context.state === 'suspended') context.resume().catch(() => {});
  }

  function bufferFor(track) {
    if (!buffers.has(track)) {
      const url = new URL(`./art/stg-bgm/${files[track]}.wav`, import.meta.url);
      const loading = fetch(url).then((response) => {
        if (!response.ok) throw Error('Could not load STG music');
        return response.arrayBuffer();
      }).then((bytes) => context.decodeAudioData(bytes)).catch((error) => {
        buffers.delete(track);
        throw error;
      });
      buffers.set(track, loading);
    }
    return buffers.get(track);
  }

  function stop(remember = false) {
    if (wanted !== -1 || active) { wanted = -1; ticket++; }
    if (!remember) saved = null;
    for (const node of fading) node.stop();
    fading.clear();
    if (!active) return;
    if (remember) {
      saved = { track: active.track, offset: active.offset + Math.max(0, context.currentTime - active.when) };
    }
    active.node.stop();
    active = null;
  }

  function track(index, volume) {
    if (index < 0 || volume <= 0 || !context) { stop(index < 0 && volume > 0); return; }
    if (volume !== level) {
      level = volume;
      destination.gain.value = Math.max(0, Math.min(1, volume)) * 1.9 * .9;
    }
    if (index === wanted) return;
    wanted = index;
    const request = ++ticket;
    bufferFor(index).then((buffer) => {
      if (ticket !== request) return;
      const now = context.currentTime;
      let when = now;
      if (active) {
        const previous = active;
        previous.gain.gain.cancelScheduledValues(now);
        previous.gain.gain.setValueAtTime(previous.gain.gain.value, now);
        previous.gain.gain.linearRampToValueAtTime(0, now + fadeOut);
        previous.node.stop(now + fadeOut);
        fading.add(previous.node);
        previous.node.onended = () => fading.delete(previous.node);
        when += fadeOut;
      }
      const offset = saved?.track === index ? saved.offset % buffer.duration : 0;
      saved = null;
      const node = context.createBufferSource();
      const gain = context.createGain();
      node.buffer = buffer;
      node.loop = true;
      node.connect(gain).connect(destination);
      gain.gain.setValueAtTime(0, when);
      gain.gain.linearRampToValueAtTime(1, when + fadeIn);
      node.start(when, offset);
      active = { track: index, node, gain, when, offset };
    }).catch((error) => {
      console.error('STG music could not play', error);
    });
  }

  function playCue(path, volume, pitch, victory = false) {
    if (!context || volume <= 0) return;
    const key = path + '.wav';
    if (!cueBuffers.has(key)) {
      cueBuffers.set(key, fetch(new URL('./art/' + key, import.meta.url)).then((response) => {
        if (!response.ok) throw Error('Could not load STG cue');
        return response.arrayBuffer();
      }).then((bytes) => context.decodeAudioData(bytes)));
    }
    const queued = cueEpoch;
    cueBuffers.get(key).then((buffer) => {
      if (queued !== cueEpoch || playingCues.size >= 6) return;
      if (victory && fanfare) fanfare.stop();
      const node = context.createBufferSource();
      const gain = context.createGain();
      gain.gain.value = volume;
      node.buffer = buffer;
      node.playbackRate.value = pitch;
      node.connect(gain).connect(context.destination);
      playingCues.add(node);
      if (victory) fanfare = node;
      node.onended = () => {
        playingCues.delete(node);
        if (fanfare === node) fanfare = null;
      };
      node.start();
    }).catch((error) => console.error('STG cue could not play', error));
  }
  function effects(mask, volume) {
    if (!mask || volume <= 0 || !context) return;
    for (let bit = 0; bit <= 13; bit++) {
      if (!(mask & (1 << bit))) continue;
      const kind = bit === 13 ? 1 : bit;
      const now = context.currentTime;
      const spacing = kind === 2 ? .15 : kind >= 7 ? .18 : 0;
      if (now - (recentlyPlayed.get(kind) ?? -Infinity) < spacing) continue;
      recentlyPlayed.set(kind, now);
      const gain = kind === 1 ? .7 : kind === 2 ? .72 : kind >= 7 ? .82 : 1;
      playCue(cueFiles[kind], volume * gain, bit === 13 ? 1.22 : 1);
    }
  }
  function reward(snack, volume) {
    playCue('stg-sfx/' + (snack < 4 ? 'normal' : snack < 7 ? 'rare' : 'ultra'), volume, 1, true);
  }
  function stopCues() {
    cueEpoch++;
    for (const node of playingCues) node.stop();
    playingCues.clear();
    recentlyPlayed.clear();
    fanfare = null;
  }

  return { unlock, track, stop, effects, reward, stopCues };
}

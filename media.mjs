const segmentDurationMs = 60000;
const sampleRate = 24000;
const maxDuration = 30 * segmentDurationMs;

function frame(image, limit) {
  const width = image.displayWidth || image.videoWidth;
  const height = image.displayHeight || image.videoHeight;
  const scale = Math.min(1, limit / Math.max(width, height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  return { width: canvas.width, height: canvas.height, image: canvas.toDataURL('image/jpeg', 0.82) };
}

function event(target, name, signal) {
  return new Promise((resolve, reject) => {
    const controller = new AbortController();
    const done = (callback, value) => { controller.abort(); callback(value); };
    const options = { once: true, signal: controller.signal };
    target.addEventListener(name, () => done(resolve), options);
    target.addEventListener('error', () => done(reject, Error('decode_failed')), options);
    signal?.addEventListener('abort', () => done(reject, signal.reason), options);
  });
}

function silenceInfo(video) {
  if (typeof video.mozHasAudio === 'boolean') return !video.mozHasAudio;
  if (video.audioTracks) return video.audioTracks.length === 0;
  if (video.captureStream) {
    const stream = video.captureStream();
    const tracks = stream.getTracks();
    const hasVideo = tracks.some(track => track.kind === 'video');
    const hasAudio = tracks.some(track => track.kind === 'audio');
    tracks.forEach(track => track.stop());
    if (hasVideo) return !hasAudio;
  }
  return false;
}

function decodeAudio(file) {
  return file.arrayBuffer().then(bytes =>
    new OfflineAudioContext(1, 1, sampleRate).decodeAudioData(bytes),
  ).catch(() => null);
}

function wave(samples, startMs, endMs) {
  const sampleCount = (endMs - startMs) * 24;
  const header = new DataView(new ArrayBuffer(44 + sampleCount * 2));
  const label = (offset, text) => [...text].forEach((value, index) => header.setUint8(offset + index, value.charCodeAt(0)));
  label(0, 'RIFF'); label(8, 'WAVE'); label(12, 'fmt '); label(36, 'data');
  header.setUint32(4, header.byteLength - 8, true);
  header.setUint32(16, 16, true);
  header.setUint16(20, 1, true);
  header.setUint16(22, 1, true);
  header.setUint32(24, sampleRate, true);
  header.setUint32(28, sampleRate * 2, true);
  header.setUint16(32, 2, true);
  header.setUint16(34, 16, true);
  header.setUint32(40, sampleCount * 2, true);
  for (let offset = 0; offset < sampleCount; offset++) {
    const value = Math.max(-1, Math.min(1, samples[startMs * 24 + offset] || 0));
    header.setInt16(44 + offset * 2, Math.round(value * (value < 0 ? 32768 : 32767)), true);
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({
      format: 'wav', sampleRate, channels: 1, durationMs: endMs - startMs, data: reader.result.split(',', 2)[1],
    });
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(new Blob([header.buffer], { type: 'audio/wav' }));
  });
}

async function videoSource(file, durationMs) {
  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.preload = 'auto';
  const url = URL.createObjectURL(file);
  const close = () => { video.removeAttribute('src'); video.load(); URL.revokeObjectURL(url); };
  try {
    const loaded = event(video, 'loadeddata');
    video.src = url;
    await loaded;
    let audio;
    return {
      durationMs, close,
      silence: silenceInfo(video),
      audio: () => (audio ||= decodeAudio(file)),
      async sample(at, low, high, signal) {
        const seconds = Math.min(at / 1000, Math.max(0, video.duration - 0.01));
        if (Math.abs(video.currentTime - seconds) > 0.0001) {
          const sought = event(video, 'seeked', signal);
          video.currentTime = seconds;
          await sought;
        }
        return [low && frame(video, 160), high && frame(video, 512)];
      },
    };
  } catch (error) {
    close();
    throw error;
  }
}

async function gifSource(file) {
  if (typeof ImageDecoder === 'undefined' || !await ImageDecoder.isTypeSupported('image/gif')) {
    throw Error('unsupported_animation');
  }
  const decoder = new ImageDecoder({ data: await file.arrayBuffer(), type: 'image/gif' });
  try {
    await decoder.tracks.ready;
    const ends = [];
    let durationMs = 0;
    for (let index = 0; index < decoder.tracks.selectedTrack.frameCount; index++) {
      const { image } = await decoder.decode({ frameIndex: index });
      durationMs += Math.max(10, Math.round((image.duration ?? 100000) / 1000));
      image.close();
      if (durationMs > maxDuration) throw Error('duration_limit');
      ends.push(durationMs);
    }
    let index = 0;
    let samples;
    let sampledIndex = -1;
    return {
      durationMs, close: () => decoder.close(), silence: true,
      async sample(at, low, high) {
        if (index && at < ends[index - 1]) index = 0;
        while (index < ends.length - 1 && at >= ends[index]) index++;
        if (sampledIndex !== index) {
          const { image } = await decoder.decode({ frameIndex: index });
          try { samples = [frame(image, 160), frame(image, 512)]; }
          finally { image.close(); }
          sampledIndex = index;
        }
        return [low && samples[0], high && samples[1]];
      },
    };
  } catch (error) {
    decoder.close();
    throw error;
  }
}

export function createMediaBridge() {
  const files = new Map();
  return {
    async upload(file, kind, duration) {
      if (kind !== 'video' && kind !== 'animation') throw Error('decode_failed');
      const source = await (kind === 'video' ? videoSource(file, duration) : gifSource(file));
      try {
        const { durationMs } = source;
        if (!Number.isInteger(durationMs) || durationMs < 1 || durationMs > maxDuration) throw Error('duration_limit');
        const mediaId = crypto.randomUUID();
        const [, preview] = await source.sample(0, false, true);
        const meta = { protocolVersion: 2, mediaId, kind, durationMs, segmentDurationMs,
          segmentCount: Math.ceil(durationMs / segmentDurationMs), image: preview.image };
        files.set(mediaId, { source, meta });
        return meta;
      } catch (error) {
        source.close();
        throw error;
      }
    },
    release(mediaId) {
      files.get(mediaId)?.source.close();
      files.delete(mediaId);
    },
    async segment(mediaId, index, signal) {
      const entry = files.get(mediaId);
      if (!entry || !Number.isInteger(index) || index < 0 || index >= entry.meta.segmentCount) throw Error('decode_failed');
      const { source, meta: { kind, durationMs } } = entry;
      const startMs = index * segmentDurationMs;
      const endMs = Math.min(startMs + segmentDurationMs, durationMs);
      const times = new Map();
      for (let n = 0; startMs + Math.round(n * 1000 / 12) < endMs; n++) {
        times.set(startMs + Math.round(n * 1000 / 12), { low: true, high: n % 12 === 0 });
      }
      const last = endMs - 1;
      times.set(last, { ...times.get(last), high: true });
      const frames = [];
      for (const [atMs, { low, high }] of times) {
        signal?.throwIfAborted();
        const [small, large] = await source.sample(atMs, low, high, signal);
        if (large) frames.push({ atMs, detail: 'high', ...large });
        if (small) frames.push({ atMs, detail: 'low', ...small });
      }
      const result = { kind, index, startMs, endMs, durationMs, frames, audioStatus: 'none' };
      if (!source.silence) {
        const decoded = await source.audio();
        result.audioStatus = decoded ? 'present' : 'unavailable';
        if (decoded) {
          let samples = decoded.getChannelData(0);
          if (decoded.numberOfChannels > 1) {
            samples = samples.slice();
            for (let index = 1; index < decoded.numberOfChannels; index++) {
              const other = decoded.getChannelData(index);
              for (let n = 0; n < samples.length; n++) samples[n] += other[n];
            }
            for (let n = 0; n < samples.length; n++) samples[n] /= decoded.numberOfChannels;
          }
          result.audio = await wave(samples, startMs, endMs);
        }
      }
      return result;
    },
  };
}

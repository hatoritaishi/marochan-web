import { createMediaBridge } from './media.mjs';

const storagePrefix = 'storage:';
const imagePrefix = 'image:';
const feelingsKey = 'maroFeelingsV1';
const miniField = 'pcMiniGameV1';
const chatURL = 'https://maro-chat.hatyuri0421.workers.dev/';
const encoder = new TextEncoder();
const backupSchema = 'marochan-pc-backup-v1';
const forbiddenKeys = new Set(['__proto__', 'constructor', 'prototype']);

function validateStorage(key, value) {
  if (!key.length || key.length > 160 || forbiddenKeys.has(key)
      || typeof value !== 'string' || value.length > 40 * 1024 * 1024) {
    throw Error('保存データの形式が違います。');
  }
}

function validateImage(row) {
  if (!row || typeof row.id !== 'string' || !row.id.length || row.id.length > 240
      || typeof row.image !== 'string' || row.image.length > 1400000
      || !/^data:image\/jpeg;base64,\/9j[A-Za-z0-9+/]*={0,2}$/.test(row.image)) {
    throw Error('写真の形式が違います。');
  }
  return { id: row.id, image: row.image, kind: row.kind || 'photo' };
}

async function hash(value) {
  const bytes = await crypto.subtle.digest('SHA-256', encoder.encode(JSON.stringify(value)));
  return Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function readBackup(payload) {
  if (payload?.schema !== backupSchema) throw Error('まろちゃんのバックアップを選んでください。');
  const { sha256, ...unsigned } = payload;
  if (await hash(unsigned) !== sha256) throw Error('バックアップの内容が壊れています。');
  const { storage, images = [] } = unsigned;
  if (!storage || typeof storage !== 'object' || Array.isArray(storage) || !Array.isArray(images)) {
    throw Error('バックアップの形式が違います。');
  }
  const entries = new Map();
  for (const [key, value] of Object.entries(storage)) {
    validateStorage(key, value);
    entries.set(storagePrefix + key, value);
  }
  for (const image of images) {
    const row = validateImage(image);
    const key = imagePrefix + row.id;
    if (!entries.has(key)) entries.set(key, row);
  }
  return entries;
}

export async function importBackup(vault, entries) {
  const additions = [...entries].filter(([key]) => !vault.records.has(key));
  if (additions.length) vault.save(additions);
  await vault.flush();
}

function feelings(value) {
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export function installBridge(vault, lock) {
  const media = createMediaBridge();
  const recordsWithPrefix = prefix => [...vault.records]
    .filter(([id]) => id.startsWith(prefix))
    .map(([id, value]) => [id.slice(prefix.length), value]);
  const getItem = key => vault.records.get(storagePrefix + String(key)) ?? null;
  function setItem(key, value) {
    validateStorage(key, value);
    if (getItem(key) !== value) vault.save([[storagePrefix + key, value]]);
  }
  const storage = {
    getItem,
    setItem(key, value) {
      key = String(key);
      value = String(value);
      const game = key === feelingsKey && feelings(getItem(key))[miniField];
      if (game) value = JSON.stringify({ ...feelings(value), [miniField]: game });
      setItem(key, value);
    },
    removeItem(key) {
      const id = storagePrefix + String(key);
      if (vault.records.has(id)) vault.save([[id, undefined]]);
    },
    clear() { throw Error('一括削除は無効です。'); },
    key(index) { return recordsWithPrefix(storagePrefix)[index]?.[0] ?? null; },
    get length() { return recordsWithPrefix(storagePrefix).length; },
  };

  const snapshot = () => Object.fromEntries(recordsWithPrefix(storagePrefix));
  window.MaroPC = {
    pages: true,
    ready: () => true,
    snapshot,
    miniData: () => feelings(getItem(feelingsKey))[miniField] || null,
    saveMini(next, meal) {
      const value = feelings(meal || getItem(feelingsKey));
      value[miniField] = next;
      setItem(feelingsKey, JSON.stringify(value));
    },
    lock,
    upload: media.upload,
    releaseMedia: media.release,
    async api(path, payload, options = {}) {
      if (path === '/api/backup') {
        await vault.flush();
        return { saved: true };
      }
      if (path === '/api/export') {
        await vault.flush();
        const backup = {
          schema: backupSchema,
          exportedAt: new Date().toISOString(),
          storage: snapshot(),
          images: recordsWithPrefix(imagePrefix).map(([, image]) => image),
        };
        return { ...backup, sha256: await hash(backup) };
      }
      if (path === '/api/import') return importBackup(vault, await readBackup(payload));
      if (path === '/api/image') {
        const row = validateImage(payload);
        vault.save([[imagePrefix + row.id, row]]);
        await vault.flush();
        return row;
      }
      if (path === '/api/media-segment') return media.segment(payload.mediaId, payload.index, options.signal);
      if (path === '/api/chat') {
        const response = await fetch(chatURL, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          credentials: 'omit', body: JSON.stringify(payload),
        });
        const reply = await response.json();
        if (!response.ok) throw Error(reply.error || 'おしゃべりに接続できませんでした。');
        return reply;
      }
      throw Error('この操作を実行できませんでした。');
    },
  };
  Object.defineProperty(window, 'localStorage', { value: storage, configurable: false });
  if (!storage.getItem('maroSoundSettingsV1')) {
    storage.setItem('maroSoundSettingsV1', '{"bgm":0,"voice":0,"bgmOn":false,"voiceOn":false}');
  }
}

const name = 'marochan-pages-device-v1';
const utf8 = new TextEncoder();
const decoder = new TextDecoder();
const proof = 'marochan-device-v1';
const iterations = 600000;

export function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore('info');
      request.result.createObjectStore('records');
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(Error('別のタブを閉じてから、もう一度開いてください。'));
  });
}

function transaction(database, names, mode, operation) {
  return new Promise((resolve, reject) => {
    const tx = database.transaction(names, mode);
    const result = operation(tx);
    tx.oncomplete = () => resolve(result?.result);
    tx.onabort = tx.onerror = () => reject(tx.error || Error('保存処理を完了できませんでした。'));
  });
}

function read(database, name, key) {
  return transaction(database, [name], 'readonly', tx => tx.objectStore(name).get(key));
}

export async function vaultAccess(database) {
  const settings = await read(database, 'info', 'settings');
  const remembered = await read(database, 'info', 'remember');
  if (!settings || !remembered) return { settings, key: null };
  try {
    if (await decrypt(remembered, 'proof', settings.proof) === proof) return { settings, key: remembered };
  } catch (error) {
    if (error.name !== 'OperationError') throw error;
  }
  await forget(database);
  return { settings, key: null };
}

async function derive(password, salt) {
  const input = await crypto.subtle.importKey('raw', utf8.encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, input,
    { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'],
  );
}

async function encrypt(key, id, value) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: utf8.encode(id) }, key, utf8.encode(JSON.stringify(value)),
  );
  return { iv, data };
}

async function decrypt(key, id, entry) {
  const value = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: entry.iv, additionalData: utf8.encode(id) }, key, entry.data,
  );
  return JSON.parse(decoder.decode(value));
}

export async function enter(database, settings, password) {
  if (!settings && (password.length < 12 || password.length > 128)) {
    throw Error('12〜128文字のパスワードを設定してください。');
  }
  const salt = settings?.salt ?? crypto.getRandomValues(new Uint8Array(16));
  const key = await derive(password, salt);
  if (settings) {
    let plain;
    try { plain = await decrypt(key, 'proof', settings.proof); }
    catch (error) {
      if (error.name !== 'OperationError') throw error;
    }
    if (plain !== proof) throw Error('パスワードが違います。');
  } else {
    const verifier = await encrypt(key, 'proof', proof);
    await transaction(database, ['info'], 'readwrite', tx => {
      const info = tx.objectStore('info');
      info.add({ salt, proof: verifier }, 'settings');
      info.add(0, 'revision');
    });
  }
  await transaction(database, ['info'], 'readwrite', tx => tx.objectStore('info').put(key, 'remember'));
  return key;
}

export function forget(database) {
  return transaction(database, ['info'], 'readwrite', tx => tx.objectStore('info').delete('remember'));
}

export async function openVault(database, key) {
  const state = await new Promise((resolve, reject) => {
    const tx = database.transaction(['info', 'records']);
    const records = tx.objectStore('records');
    const keys = records.getAllKeys();
    const values = records.getAll();
    const revision = tx.objectStore('info').get('revision');
    tx.oncomplete = () => resolve({ keys: keys.result, values: values.result, revision: revision.result });
    tx.onerror = () => reject(tx.error);
  });
  const entries = await Promise.all(state.keys.map(async (id, index) => [id, await decrypt(key, id, state.values[index])]));
  const records = new Map(entries);
  const pending = new Map();
  let revision = state.revision;
  let saved;
  let failure;

  async function commit(batch) {
    const rows = await Promise.all(batch.map(async ([id, value]) => [id, value === undefined ? undefined : await encrypt(key, id, value)]));
    await new Promise((resolve, reject) => {
      const tx = database.transaction(['info', 'records'], 'readwrite');
      const info = tx.objectStore('info');
      const live = info.get('revision');
      let conflict = false;
      live.onsuccess = () => {
        if (live.result !== revision) { conflict = true; tx.abort(); return; }
        const table = tx.objectStore('records');
        for (const [id, encrypted] of rows) {
          if (encrypted === undefined) table.delete(id);
          else table.put(encrypted, id);
        }
        info.put(revision + 1, 'revision');
      };
      tx.oncomplete = resolve;
      tx.onabort = tx.onerror = () => reject(conflict
        ? Error('別のタブで更新されています。保存前の変更を確認してから再読み込みしてください。')
        : (tx.error || Error('端末に保存できませんでした。')));
    });
    revision++;
  }

  function save(changes) {
    if (failure) throw failure;
    for (const [id, value] of changes) {
      if (value === undefined) records.delete(id);
      else records.set(id, value);
      pending.set(id, value);
    }
    if (saved) return;
    saved = Promise.resolve().then(async () => {
      while (pending.size) {
        const batch = [...pending];
        pending.clear();
        await commit(batch);
      }
    }).catch(error => {
      failure = error;
      dispatchEvent(new CustomEvent('maro-vault-error', { detail: error.message }));
    }).finally(() => {
      saved = null;
      if (!failure) dispatchEvent(new CustomEvent('maro-pc-saved'));
    });
    dispatchEvent(new CustomEvent('maro-pc-saving'));
  }

  return {
    records,
    save,
    async flush() { await saved; if (failure) throw failure; },
    dirty: () => !!saved || !!failure,
  };
}

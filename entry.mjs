import { derive, enter, forget, openDatabase, openVault, rememberRoom, roomKey, vaultAccess } from './vault.mjs?v=2';
import { importBackup, installBridge, readBackup } from './bridge.mjs';
import { installSpeech } from './speech.mjs';
import { installNotifications } from './notifications.mjs';

const description = document.querySelector('#description');
const form = document.querySelector('#access');
const password = document.querySelector('#password');
const legacyPassword = document.querySelector('#legacy-password');
const errorBox = document.querySelector('#error');
const submit = document.querySelector('#enter');

function showError(error) {
  errorBox.textContent = error.message || 'この端末の保存先を開けませんでした。';
  errorBox.hidden = false;
}

async function fetchRoom() {
  const response = await fetch(new URL('./room.enc?v=3', import.meta.url));
  if (!response.ok) throw Error('お部屋を読み込めませんでした。再読み込みしてください。');
  const room = new Uint8Array(await response.arrayBuffer());
  if (room.length <= 44) throw Error('お部屋のデータを読み込めませんでした。');
  return room;
}

async function decryptRoom(room, key) {
  const plain = await crypto.subtle.decrypt({
    name: 'AES-GCM', iv: room.slice(16, 28), additionalData: new TextEncoder().encode('marochan-room-v2'),
  }, key, room.slice(28));
  return new TextDecoder().decode(plain);
}

async function acquireRoom() {
  if (!navigator.locks) return () => {};
  return new Promise((resolve, reject) => {
    navigator.locks.request('marochan-pages-device-v1', { ifAvailable: true }, lock => {
      if (!lock) throw Error('別のタブでまろちゃんを開いています。そのタブを閉じてから再読み込みしてください。');
      return new Promise(release => resolve(release));
    }).catch(reject);
  });
}

async function mount(database, key, html, backup) {
  const release = await acquireRoom();
  try {
    const vault = await openVault(database, key);
    if (backup) await importBackup(vault, backup);
    installBridge(vault, async () => {
      await vault.flush();
      await forget(database);
      location.reload();
    });
    installSpeech();
    installNotifications();

    document.open();
    function checkUnsaved(event) {
      event.preventDefault();
      event.returnValue = '';
    }
    window.addEventListener('maro-vault-error', event => {
      let alert = document.querySelector('#pc-save-error');
      if (!alert) {
        alert = document.createElement('div');
        alert.id = 'pc-save-error';
        alert.setAttribute('role', 'alert');
        document.body.appendChild(alert);
      }
      alert.textContent = event.detail;
    });
    window.addEventListener('pagehide', release, { once: true });
    window.addEventListener('pageshow', event => {
      if (event.persisted) location.reload();
    });
    window.addEventListener('maro-pc-saving', () => window.addEventListener('beforeunload', checkUnsaved));
    window.addEventListener('maro-pc-saved', () => {
      if (!vault.dirty()) window.removeEventListener('beforeunload', checkUnsaved);
    });
    if (vault.dirty()) window.addEventListener('beforeunload', checkUnsaved);
    document.write(html);
    document.close();
  } catch (error) {
    release();
    throw error;
  }
}

async function start() {
  if (!window.isSecureContext || !window.indexedDB) throw Error('HTTPSのまろちゃんのページを開いてください。');
  const database = await openDatabase();
  const access = await vaultAccess(database);
  let encryptedRoom;
  const rememberedRoom = await roomKey(database);
  if (access.key && rememberedRoom) {
    description.textContent = 'まろちゃんのお部屋を開いています。';
    encryptedRoom = await fetchRoom();
    let html;
    try { html = await decryptRoom(encryptedRoom, rememberedRoom); }
    catch (error) { if (error.name !== 'OperationError') throw error; }
    if (html) {
      await mount(database, access.key, html);
      return;
    }
  }

  const firstTime = !access.settings;
  const legacy = !firstTime && !access.key && access.settings.mode !== 'shared';
  description.textContent = 'パスワードを入れてね。次からは同じブラウザーでそのまま会えます。';
  document.querySelector('#backup-row').hidden = !firstTime;
  if (legacy) {
    document.querySelector('#legacy-row').hidden = false;
    legacyPassword.required = true;
  }
  form.hidden = false;
  form.addEventListener('submit', async event => {
    event.preventDefault();
    submit.disabled = true;
    errorBox.hidden = true;
    try {
      encryptedRoom ||= await fetchRoom();
      const newRoomKey = await derive(password.value, encryptedRoom.slice(0, 16));
      let html;
      try { html = await decryptRoom(encryptedRoom, newRoomKey); }
      catch (error) {
        if (error.name === 'OperationError') throw Error('パスワードが違います。');
        throw error;
      }
      const file = document.querySelector('#backup').files[0];
      const backup = file && await readBackup(JSON.parse(await file.text()));
      access.key ||= await enter(database, access.settings, legacy ? legacyPassword.value : password.value);
      await rememberRoom(database, newRoomKey);
      password.value = '';
      legacyPassword.value = '';
      await mount(database, access.key, html, backup);
    } catch (error) {
      showError(error);
      submit.disabled = false;
    }
  });
}

start().catch(showError);

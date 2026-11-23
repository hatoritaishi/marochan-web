import { enter, forget, openDatabase, openVault, vaultAccess } from './vault.mjs';
import { importBackup, installBridge, readBackup } from './bridge.mjs';
import { installSpeech } from './speech.mjs';

const description = document.querySelector('#description');
const form = document.querySelector('#access');
const password = document.querySelector('#password');
const confirmation = document.querySelector('#confirmation');
const errorBox = document.querySelector('#error');
const submit = document.querySelector('#enter');

function showError(error) {
  errorBox.textContent = error.message || 'この端末の保存先を開けませんでした。';
  errorBox.hidden = false;
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

async function mount(database, key, backup) {
  const release = await acquireRoom();
  try {
    const roomURL = new URL('./room.template', import.meta.url);
    const response = await fetch(roomURL);
    if (!response.ok) throw Error('お部屋を読み込めませんでした。再読み込みしてください。');
    const html = await response.text();
    const vault = await openVault(database, key);
    if (backup) await importBackup(vault, backup);
    installBridge(vault, async () => {
      await vault.flush();
      await forget(database);
      location.reload();
    });
    installSpeech();

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
  if (access.key) {
    description.textContent = 'まろちゃんのお部屋を開いています。';
    await mount(database, access.key);
    return;
  }

  const firstTime = !access.settings;
  description.textContent = firstTime
    ? 'このブラウザー用のパスワードを12文字以上で設定してください。次からはそのまま会えます。'
    : 'このブラウザーで設定したパスワードを入力してください。';
  password.autocomplete = firstTime ? 'new-password' : 'current-password';
  if (firstTime) {
    document.querySelector('#confirmation-row').hidden = false;
    document.querySelector('#backup-row').hidden = false;
    password.minLength = 12;
    confirmation.required = true;
  }
  form.hidden = false;
  form.addEventListener('submit', async event => {
    event.preventDefault();
    submit.disabled = true;
    errorBox.hidden = true;
    try {
      if (firstTime && password.value !== confirmation.value) throw Error('入力したパスワードが一致していません。');
      const file = document.querySelector('#backup').files[0];
      const backup = file && await readBackup(JSON.parse(await file.text()));
      const key = await enter(database, access.settings, password.value);
      password.value = '';
      confirmation.value = '';
      // A failed mount can be retried without creating or replacing the vault.
      access.settings = (await vaultAccess(database)).settings;
      await mount(database, key, backup);
    } catch (error) {
      showError(error);
      submit.disabled = false;
    }
  });
}

start().catch(showError);

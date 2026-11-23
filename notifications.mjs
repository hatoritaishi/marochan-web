const preferenceKey = 'maroWebNotificationsV1';
const historyKey = 'maroWebNotifiedEventsV1';
const scope = new URL('./', import.meta.url);
const messages = {
  letter: 'まろちゃんから おてがみが届いたよ。',
  steal: 'まろちゃんが つまみぐいを始めたよ。',
  rescue: 'まろちゃんが「たすけて」って待っているよ。',
  test: 'まろちゃんのテスト通知だよ。',
};

export function installNotifications() {
  const supported = 'Notification' in window && 'serviceWorker' in navigator
    && 'showNotification' in (window.ServiceWorkerRegistration?.prototype || {});
  const storage = window.localStorage;
  let past = [];
  try {
    const stored = JSON.parse(storage.getItem(historyKey));
    if (Array.isArray(stored)) past = stored.filter(key => typeof key === 'string').slice(-90);
  } catch {}
  const notified = new Set(past);
  let registration;
  let toggling = false;

  function register() {
    registration ||= navigator.serviceWorker.register(new URL('notifications-sw.js', scope))
      .then(() => navigator.serviceWorker.ready)
      .catch(error => { registration = null; throw error; });
    return registration;
  }

  const enabled = () => supported && Notification.permission === 'granted'
    && storage.getItem(preferenceKey) === 'on';

  async function post(kind, id) {
    const worker = await register();
    if (!enabled()) return false;
    await worker.showNotification('まろちゃん', {
      body: messages[kind], icon: new URL('maro-home-192.png', scope).href,
      tag: 'marochan:' + kind + ':' + id, data: { kind }, silent: true,
    });
    return true;
  }

  function event(kind, id) {
    if (!enabled() || !Object.hasOwn(messages, kind) || kind === 'test' || !id) return;
    const key = kind + ':' + id;
    if (notified.has(key)) return;
    notified.add(key);
    void post(kind, id).then(sent => {
      if (!sent) { notified.delete(key); return; }
      // Limit the persisted history while keeping separate simultaneous deliveries.
      storage.setItem(historyKey, JSON.stringify([...notified].slice(-90)));
    }).catch(error => {
      notified.delete(key);
      console.warn('MaroChan notification was unavailable', error);
    });
  }

  function follow(kind) {
    if (kind === 'letter') {
      document.getElementById('cSnackDex')?.click();
      document.querySelector('#maroMemories:not([hidden]) .memory-letters')?.click();
    } else if (kind === 'rescue') {
      document.querySelector('#cHelpMaro:not([hidden])')?.focus();
    }
  }

  function installSettings() {
    const menu = document.getElementById('settingsWebPage');
    if (!menu) return;
    const box = document.createElement('section');
    box.className = 'maro-web-notifications';
    box.innerHTML = '<h3>通知</h3><div class="maro-web-notifications-controls">'
      + '<p>おてがみ・つまみぐい・「たすけて」を、まろちゃんを開いている間にお知らせします。</p>'
      + '<button type="button" data-toggle></button><button type="button" data-test>テスト通知</button>'
      + '<p role="status" data-status></p></div>';
    menu.append(box);
    const toggle = box.querySelector('[data-toggle]');
    const test = box.querySelector('[data-test]');
    const status = box.querySelector('[data-status]');
    function refresh(text) {
      const allowed = enabled();
      toggle.textContent = allowed ? '通知をオフ' : '通知をオン';
      toggle.disabled = toggling || !supported;
      test.hidden = !allowed;
      test.disabled = toggling;
      status.textContent = text || (!supported
        ? typeof navigator.standalone === 'boolean' && !navigator.standalone
          ? 'iPhoneではSafariの共有からホーム画面に追加し、そのアイコンから開いてください。'
          : 'このブラウザーでは端末通知を利用できません。'
        : Notification.permission === 'denied'
          ? '端末またはブラウザーの設定で通知を許可してください。'
          : allowed ? '通知はオンです。' : '通知はオフです。');
    }

    toggle.addEventListener('click', async () => {
      if (toggling) return;
      toggling = true;
      refresh();
      let feedback;
      try {
        if (enabled()) {
          storage.setItem(preferenceKey, 'off');
          const worker = await register();
          for (const item of await worker.getNotifications()) {
            if (item.tag.startsWith('marochan:')) item.close();
          }
        } else if (await Notification.requestPermission() === 'granted') {
          await register();
          storage.setItem(preferenceKey, 'on');
        }
      } catch {
        feedback = '通知を設定できませんでした。接続を確認してから試してください。';
      } finally {
        toggling = false;
        refresh(feedback);
      }
    });
    test.addEventListener('click', async () => {
      try {
        refresh(await post('test', 'test') ? 'テスト通知を送りました。' : '通知の許可を確認してください。');
      } catch {
        refresh('テスト通知を送れませんでした。端末の通知設定を確認してください。');
      }
    });
    refresh();
    if (enabled()) void register().catch(() => {});
    if (supported) {
      window.addEventListener('focus', () => refresh());
      navigator.serviceWorker.addEventListener('message', event => {
        if (event.source?.scriptURL === new URL('notifications-sw.js', scope).href
            && event.data?.type === 'maro-notification-open') follow(event.data.kind);
      });
    }
    const url = new URL(location.href);
    if (url.searchParams.has('notice')) {
      const kind = url.searchParams.get('notice');
      url.searchParams.delete('notice');
      history.replaceState(history.state, '', url);
      window.addEventListener('load', () => follow(kind), { once: true });
    }
  }

  window.MaroWebNotifications = { event, installSettings };
}

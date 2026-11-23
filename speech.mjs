export function installSpeech() {
  let recognition = null;
  const bridge = { onmessage: null, postMessage(raw) {
    const request = JSON.parse(raw);
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const send = message => setTimeout(() => bridge.onmessage?.({ data: JSON.stringify(message) }), 0);
    if (request.action === 'availability') {
      send({ status: Recognition ? 'available' : 'unavailable' });
    } else if (request.action === 'cancel') {
      recognition?.abort();
    } else if (request.action === 'start') {
      if (!Recognition) {
        send({ id: request.id, status: 'unavailable' });
        return;
      }
      const active = new Recognition();
      recognition = active;
      active.lang = 'ja-JP';
      active.interimResults = false;
      const finish = message => {
        if (recognition !== active) return;
        recognition = null;
        send({ id: request.id, ...message });
      };
      active.onresult = event => finish({ status: 'result', text: event.results[0][0].transcript });
      active.onerror = active.onend = () => finish({ status: 'cancelled' });
      try { active.start(); }
      catch { finish({ status: 'unavailable' }); }
    }
  } };
  window.MaroLetterSpeech = bridge;
}

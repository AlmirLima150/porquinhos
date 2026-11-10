// ============================================================================
// EFEITOS SONOROS SINTETIZADOS (Web Audio API — "Wheek!" dos Porquinhos)
// ============================================================================
window.Porquinhos = window.Porquinhos || {};

(function (ns) {
  let audioCtx = null;
  let somAtivo = true;
  try {
    somAtivo = localStorage.getItem(ns.SOUND_KEY) !== 'off';
  } catch (e) {}

  function getCtx() {
    if (!somAtivo) return null;
    if (!audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) audioCtx = new AudioContext();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  }

  function isSomAtivo() {
    return somAtivo;
  }

  function toggleSom() {
    somAtivo = !somAtivo;
    try {
      localStorage.setItem(ns.SOUND_KEY, somAtivo ? 'on' : 'off');
    } catch (e) {}
    if (somAtivo) tocarPopcorn(0);
    return somAtivo;
  }

  function tocarPopcorn(indice = 0) {
    const ctx = getCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      const baseFreq = 680 + indice * 75;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.65, now + 0.14);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.35, now + 0.22);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.11, now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.25);
    } catch (e) {}
  }

  function tocarCenoura() {
    const ctx = getCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      [0, 0.09].forEach((offset, k) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(420 + k * 140, now + offset);
        osc.frequency.exponentialRampToValueAtTime(620 + k * 160, now + offset + 0.07);

        gain.gain.setValueAtTime(0.001, now + offset);
        gain.gain.linearRampToValueAtTime(0.09, now + offset + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.08);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + offset);
        osc.stop(now + offset + 0.085);
      });
    } catch (e) {}
  }

  Object.assign(ns, { isSomAtivo, toggleSom, tocarPopcorn, tocarCenoura });
})(window.Porquinhos);

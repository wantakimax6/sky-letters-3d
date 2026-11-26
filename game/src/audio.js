// Sky Letters (3D) — all sound is synthesized with WebAudio: no audio
// files, nothing to load. An engine hum that follows the throttle, wind
// that follows speed, a chime for rings and a small melody on delivery.
export function createAudio() {
  let ctx = null;
  let engineOsc = null;
  let engineGain = null;
  let windSrc = null;
  let windGain = null;
  let muted = false;
  let started = false;

  function ensure() {
    if (started) return;
    started = true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 52;
      const engineFilter = ctx.createBiquadFilter();
      engineFilter.type = 'lowpass';
      engineFilter.frequency.value = 320;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0;
      engineOsc.connect(engineFilter).connect(engineGain).connect(ctx.destination);
      engineOsc.start();
      // Wind: looped filtered noise from a generated buffer.
      const len = ctx.sampleRate * 2;
      const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < len; i += 1) data[i] = Math.random() * 2 - 1;
      windSrc = ctx.createBufferSource();
      windSrc.buffer = buffer;
      windSrc.loop = true;
      const windFilter = ctx.createBiquadFilter();
      windFilter.type = 'bandpass';
      windFilter.frequency.value = 500;
      windFilter.Q.value = 0.6;
      windGain = ctx.createGain();
      windGain.gain.value = 0;
      windSrc.connect(windFilter).connect(windGain).connect(ctx.destination);
      windSrc.start();
    } catch {
      ctx = null;
    }
  }
  function tone(freq, dur, type, vol, when) {
    if (!ctx || muted) return;
    const t0 = ctx.currentTime + (when || 0);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(vol || 0.12, t0 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }
  return {
    ensure,
    setMuted(value) { muted = value; if (engineGain) engineGain.gain.value = 0; if (windGain) windGain.gain.value = 0; },
    isMuted() { return muted; },
    engine(throttle, speed) {
      if (!ctx || muted) return;
      if (ctx.state === 'suspended') ctx.resume();
      engineOsc.frequency.value = 46 + throttle * 42 + speed * 0.12;
      engineGain.gain.value = 0.028 + throttle * 0.05;
      windGain.gain.value = Math.min(0.06, (speed / 132) * 0.06);
    },
    ring() { tone(880, 0.5, 'sine', 0.14); tone(1318, 0.6, 'sine', 0.1, 0.08); },
    fuel() { tone(660, 0.3, 'triangle', 0.12); tone(990, 0.4, 'triangle', 0.1, 0.07); },
    deliver() {
      [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.55, 'sine', 0.12, i * 0.12));
    },
    crash() { tone(160, 0.7, 'sawtooth', 0.12); tone(90, 0.9, 'sawtooth', 0.1, 0.1); },
    click() { tone(700, 0.08, 'square', 0.05); },
  };
}

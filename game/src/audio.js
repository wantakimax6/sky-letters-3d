// Sky Letters (3D) — rich layered sound, all synthesized with WebAudio:
// no audio files, nothing to load, nothing over the network.
// Layers: engine hum (pitch/volume follow throttle), wind (rises with
// speed), rain patter (dusk mission), ambient waves and birds at low
// altitude, plus one-shots: ring arpeggio, fuel chime, delivery fanfare,
// dialogue blips, stall alarm, splash, crash thud, and a sound per skill.
// Everything starts only after a user gesture (ensure() is called from
// Start / Enter); M mutes the master gain, and every call is guarded so
// a missing AudioContext can never throw into the game loop.
export function createAudio() {
  let ctx = null;
  let master = null;
  let engineOsc = null;
  let engineOsc2 = null;
  let engineGain = null;
  let engineFilter = null;
  let windGain = null;
  let windFilter = null;
  let rainGain = null;
  let wavesGain = null;
  let muted = false;
  let started = false;
  let lastAlarm = 0;
  let lastChirp = 0;

  function noiseBuffer(seconds) {
    const len = Math.floor(ctx.sampleRate * seconds);
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = Math.random() * 2 - 1;
    return buffer;
  }
  function loopedNoise(type, freq, q, gainValue) {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(2);
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = freq;
    filter.Q.value = q;
    const gain = ctx.createGain();
    gain.gain.value = gainValue;
    src.connect(filter).connect(gain).connect(master);
    src.start();
    return { src, filter, gain };
  }

  function ensure() {
    if (started) return;
    started = true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.9;
      master.connect(ctx.destination);
      // Engine: two detuned sawtooths through a lowpass, so the hum has
      // body instead of a thin buzz.
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 52;
      engineOsc2 = ctx.createOscillator();
      engineOsc2.type = 'sawtooth';
      engineOsc2.frequency.value = 55;
      engineFilter = ctx.createBiquadFilter();
      engineFilter.type = 'lowpass';
      engineFilter.frequency.value = 320;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0;
      engineOsc.connect(engineFilter);
      engineOsc2.connect(engineFilter);
      engineFilter.connect(engineGain).connect(master);
      engineOsc.start();
      engineOsc2.start();
      // Wind, rain and waves are looped filtered noise at different bands.
      const wind = loopedNoise('bandpass', 500, 0.6, 0);
      windGain = wind.gain;
      windFilter = wind.filter;
      const rain = loopedNoise('highpass', 1800, 0.4, 0);
      rainGain = rain.gain;
      const waves = loopedNoise('lowpass', 320, 0.5, 0);
      wavesGain = waves.gain;
    } catch {
      ctx = null;
    }
  }
  function tone(freq, dur, type, vol, when, slideTo) {
    if (!ctx || muted) return;
    try {
      const t0 = ctx.currentTime + (when || 0);
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(freq, t0);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(vol || 0.12, t0 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(gain).connect(master);
      osc.start(t0);
      osc.stop(t0 + dur + 0.05);
    } catch { /* sound must never break the game */ }
  }
  function noiseBurst(dur, type, freq, vol, when) {
    if (!ctx || muted) return;
    try {
      const t0 = ctx.currentTime + (when || 0);
      const src = ctx.createBufferSource();
      src.buffer = noiseBuffer(Math.max(0.1, dur));
      const filter = ctx.createBiquadFilter();
      filter.type = type || 'lowpass';
      filter.frequency.value = freq || 800;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(vol || 0.15, t0);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      src.connect(filter).connect(gain).connect(master);
      src.start(t0);
      src.stop(t0 + dur + 0.05);
    } catch { /* sound must never break the game */ }
  }
  function chirp() {
    // A tiny two-note bird chirp, quiet and high.
    tone(2400 + Math.random() * 600, 0.09, 'sine', 0.03, 0, 3200);
    tone(2600 + Math.random() * 500, 0.07, 'sine', 0.025, 0.11, 3400);
  }
  return {
    ensure,
    setMuted(value) {
      muted = value;
      if (master && ctx) master.gain.setTargetAtTime(muted ? 0 : 0.9, ctx.currentTime, 0.05);
    },
    isMuted() { return muted; },
    // Per-frame layer mix. Called from the game loop; silent until ensure().
    update(opts) {
      if (!ctx || muted) return;
      try {
        if (ctx.state === 'suspended') ctx.resume();
        const throttle = opts.throttle || 0;
        const speed = opts.speed || 0;
        const alt = opts.alt || 0;
        const t = ctx.currentTime;
        engineOsc.frequency.setTargetAtTime(46 + throttle * 42 + speed * 0.12, t, 0.08);
        engineOsc2.frequency.setTargetAtTime(49 + throttle * 44 + speed * 0.12, t, 0.08);
        engineFilter.frequency.setTargetAtTime(280 + throttle * 420, t, 0.1);
        engineGain.gain.setTargetAtTime(0.028 + throttle * 0.05, t, 0.08);
        windGain.gain.setTargetAtTime(Math.min(0.07, (speed / 132) * 0.07), t, 0.15);
        windFilter.frequency.setTargetAtTime(400 + speed * 5, t, 0.15);
        rainGain.gain.setTargetAtTime(opts.rain ? 0.05 : 0, t, 0.3);
        // Waves swell at low altitude over the sea; birds only down low.
        const low = Math.max(0, 1 - alt / 120);
        wavesGain.gain.setTargetAtTime(low * 0.035 * (0.7 + 0.3 * Math.sin(t * 0.5)), t, 0.4);
        if (low > 0.5 && t - lastChirp > 2.5 + Math.random() * 2) { lastChirp = t; chirp(); }
      } catch { /* sound must never break the game */ }
    },
    engine(throttle, speed) { this.update({ throttle, speed, alt: 200, rain: false }); },
    // Ring chime: a rising four-note arpeggio.
    ring() {
      [880, 1108, 1318, 1760].forEach((f, i) => tone(f, 0.5, 'sine', 0.13, i * 0.07));
    },
    fuel() { tone(660, 0.3, 'triangle', 0.12); tone(990, 0.4, 'triangle', 0.1, 0.07); },
    // Delivery fanfare: a warm eight-note melody.
    deliver() {
      const notes = [523, 659, 784, 1046, 784, 880, 1046, 1318];
      notes.forEach((f, i) => tone(f, 0.55, 'sine', 0.12, i * 0.11));
      tone(262, 1.1, 'triangle', 0.06, 0);
    },
    crash() { tone(160, 0.7, 'sawtooth', 0.12); tone(90, 0.9, 'sawtooth', 0.1, 0.1); },
    thud() { tone(70, 0.35, 'sine', 0.22, 0, 40); noiseBurst(0.3, 'lowpass', 300, 0.18); },
    splash() { noiseBurst(0.7, 'lowpass', 900, 0.16); tone(300, 0.4, 'sine', 0.07, 0, 120); },
    click() { tone(700, 0.08, 'square', 0.05); },
    blip() { tone(520 + Math.random() * 120, 0.09, 'sine', 0.06); tone(660, 0.08, 'sine', 0.05, 0.09); },
    alarm() {
      if (!ctx || muted) return;
      const now = ctx.currentTime;
      if (now - lastAlarm < 0.7) return;
      lastAlarm = now;
      tone(1180, 0.14, 'square', 0.05);
      tone(880, 0.14, 'square', 0.05, 0.18);
    },
    skillBoost() { noiseBurst(0.5, 'bandpass', 1200, 0.14); tone(220, 0.5, 'sawtooth', 0.08, 0, 660); },
    skillRoll() { noiseBurst(0.35, 'bandpass', 900, 0.1); tone(500, 0.3, 'sine', 0.07, 0, 900); },
    skillFlare() { tone(1568, 0.5, 'sine', 0.12); tone(2093, 0.6, 'sine', 0.1, 0.08); noiseBurst(0.25, 'highpass', 2500, 0.08); },
    skillGlide() { tone(440, 0.7, 'sine', 0.07, 0, 660); tone(660, 0.7, 'sine', 0.05, 0.12, 880); },
  };
}

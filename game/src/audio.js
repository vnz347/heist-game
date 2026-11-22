// audio.js — every sound is synthesized with WebAudio; the game loads
// no audio files at all. A tiny helper builds short tones and noise
// bursts: footsteps that pan with the guard, a coin chime, the alarm's
// two-tone siren, a smoke puff, the caught sting and the getaway fanfare.
export function makeAudio() {
  let context = null;
  let muted = false;
  let sirenNodes = null;

  function ensure() {
    if (!context) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return null;
      context = new AudioContext();
    }
    if (context.state === 'suspended') context.resume();
    return context;
  }

  function tone(freq, seconds, type, volume, when = 0, slideTo = null) {
    const ctx = ensure();
    if (!ctx || muted) return;
    const t0 = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + seconds);
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(volume, t0 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + seconds);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + seconds + 0.05);
  }

  function noise(seconds, volume, filterFreq) {
    const ctx = ensure();
    if (!ctx || muted) return;
    const length = Math.floor(ctx.sampleRate * seconds);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;
    const gain = ctx.createGain();
    gain.gain.value = volume;
    source.connect(filter).connect(gain).connect(ctx.destination);
    source.start();
  }

  return {
    unlock() { ensure(); },
    toggleMute() {
      muted = !muted;
      if (muted) this.stopSiren();
      return muted;
    },
    get muted() { return muted; },

    step() { noise(0.07, 0.05, 500); },
    coin() { tone(1320, 0.12, 'sine', 0.12); tone(1760, 0.18, 'sine', 0.1, 0.07); },
    star() {
      tone(660, 0.15, 'triangle', 0.14);
      tone(880, 0.15, 'triangle', 0.14, 0.1);
      tone(1320, 0.3, 'triangle', 0.14, 0.2);
    },
    smoke() { noise(0.5, 0.16, 900); },
    toss() { tone(2400, 0.08, 'sine', 0.06, 0, 1200); },
    spotted() { tone(220, 0.25, 'square', 0.07, 0, 330); },
    caught() {
      tone(196, 0.5, 'sawtooth', 0.12, 0, 98);
      tone(147, 0.7, 'sawtooth', 0.12, 0.35, 73);
    },
    levelClear() {
      tone(523, 0.14, 'triangle', 0.13);
      tone(659, 0.14, 'triangle', 0.13, 0.12);
      tone(784, 0.14, 'triangle', 0.13, 0.24);
      tone(1047, 0.3, 'triangle', 0.13, 0.36);
    },
    win() {
      [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.35, 'triangle', 0.13, i * 0.14));
    },
    startSiren() {
      const ctx = ensure();
      if (!ctx || muted || sirenNodes) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.value = 620;
      gain.gain.value = 0.045;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 1.4;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 220;
      lfo.connect(lfoGain).connect(osc.frequency);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      lfo.start();
      sirenNodes = { osc, lfo, gain };
    },
    stopSiren() {
      if (!sirenNodes) return;
      try {
        sirenNodes.osc.stop();
        sirenNodes.lfo.stop();
      } catch { /* already stopped */ }
      sirenNodes = null;
    },
  };
}
